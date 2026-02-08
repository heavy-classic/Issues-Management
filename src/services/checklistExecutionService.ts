import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export async function getInstance(instanceId: string) {
  const instance = await db("checklist_instances")
    .select(
      "checklist_instances.*",
      "checklists.name as checklist_name",
      "checklists.description as checklist_description",
      "checklists.instructions as checklist_instructions",
      "users.full_name as assigned_to_name",
      "users.email as assigned_to_email",
      "audits.title as audit_title",
      "audits.audit_number"
    )
    .leftJoin("checklists", "checklist_instances.checklist_id", "checklists.id")
    .leftJoin("users", "checklist_instances.assigned_to", "users.id")
    .leftJoin("audits", "checklist_instances.audit_id", "audits.id")
    .where("checklist_instances.id", instanceId)
    .first();

  if (!instance) throw new AppError(404, "Checklist instance not found");

  // Get groups and criteria from the source checklist
  const groups = await db("checklist_groups")
    .where("checklist_id", instance.checklist_id)
    .orderBy("position", "asc");

  const criteria = await db("checklist_criteria")
    .whereIn("group_id", groups.map((g: any) => g.id))
    .orderBy("position", "asc");

  // Get existing responses
  const responses = await db("criterion_responses")
    .select(
      "criterion_responses.*",
      "users.full_name as responded_by_name",
      "users.email as responded_by_email"
    )
    .leftJoin("users", "criterion_responses.responded_by", "users.id")
    .where("criterion_responses.instance_id", instanceId);

  const responseMap = new Map(responses.map((r: any) => [r.criterion_id, r]));

  // Nest criteria into groups with responses
  const groupsWithCriteria = groups.map((g: any) => ({
    ...g,
    criteria: criteria
      .filter((c: any) => c.group_id === g.id)
      .map((c: any) => ({
        ...c,
        response: responseMap.get(c.id) || null,
      })),
  }));

  const totalCriteria = criteria.length;
  const respondedCount = responses.length;

  return {
    ...instance,
    groups: groupsWithCriteria,
    totalCriteria,
    respondedCount,
    progress: totalCriteria > 0 ? Math.round((respondedCount / totalCriteria) * 100) : 0,
  };
}

export async function updateInstanceStatus(
  instanceId: string,
  status: "not_started" | "in_progress" | "complete" | "under_review",
  auditCtx: AuditContext
) {
  const existing = await db("checklist_instances").where({ id: instanceId }).first();
  if (!existing) throw new AppError(404, "Checklist instance not found");

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date(),
  };

  if (status === "in_progress" && !existing.started_at) {
    updateData.started_at = new Date();
  }
  if (status === "complete") {
    updateData.completed_at = new Date();
  }

  const [updated] = await db("checklist_instances")
    .where({ id: instanceId })
    .update(updateData)
    .returning("*");

  await auditService.logFieldChanges("checklist_instances", instanceId, existing, updated, auditCtx);
  return updated;
}

export async function saveResponse(
  instanceId: string,
  criterionId: string,
  responseValue: string,
  notes: string,
  userId: string,
  auditCtx: AuditContext
) {
  const instance = await db("checklist_instances").where({ id: instanceId }).first();
  if (!instance) throw new AppError(404, "Checklist instance not found");

  // Verify criterion belongs to the checklist
  const criterion = await db("checklist_criteria")
    .join("checklist_groups", "checklist_criteria.group_id", "checklist_groups.id")
    .where("checklist_criteria.id", criterionId)
    .where("checklist_groups.checklist_id", instance.checklist_id)
    .first();

  if (!criterion) throw new AppError(400, "Criterion does not belong to this checklist");

  // Upsert response
  const existing = await db("criterion_responses")
    .where({ instance_id: instanceId, criterion_id: criterionId })
    .first();

  if (existing) {
    const [updated] = await db("criterion_responses")
      .where({ id: existing.id })
      .update({
        response_value: responseValue,
        notes,
        responded_by: userId,
        responded_at: new Date(),
      })
      .returning("*");

    await auditService.logFieldChanges("criterion_responses", existing.id, existing, updated, auditCtx);
    return updated;
  } else {
    const [response] = await db("criterion_responses")
      .insert({
        instance_id: instanceId,
        criterion_id: criterionId,
        response_value: responseValue,
        notes: notes || "",
        responded_by: userId,
      })
      .returning("*");

    // Auto-start instance if not started
    if (instance.status === "not_started") {
      await updateInstanceStatus(instanceId, "in_progress", auditCtx);
    }

    await auditService.logInsert("criterion_responses", response.id, response, auditCtx);
    return response;
  }
}

export async function createFindingFromCriterion(
  instanceId: string,
  criterionId: string,
  userId: string,
  params: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "critical";
    assignee_id?: string | null;
    finding_severity: "observation" | "minor" | "major" | "critical";
  },
  auditCtx: AuditContext
) {
  const instance = await db("checklist_instances").where({ id: instanceId }).first();
  if (!instance) throw new AppError(404, "Checklist instance not found");

  // Create issue as finding
  const [issue] = await db("issues")
    .insert({
      title: params.title,
      description: params.description || "",
      priority: params.priority || "medium",
      reporter_id: userId,
      assignee_id: params.assignee_id || null,
      audit_id: instance.audit_id,
      finding_severity: params.finding_severity,
      finding_criterion_id: criterionId,
    })
    .returning("*");

  // Link the response to the finding
  await db("criterion_responses")
    .where({ instance_id: instanceId, criterion_id: criterionId })
    .update({ finding_issue_id: issue.id });

  await auditService.logInsert("issues", issue.id, { ...issue, source: "checklist_finding" }, auditCtx);
  return issue;
}
