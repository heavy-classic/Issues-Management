import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export async function initializeIssueWorkflow(
  issueId: string,
  auditCtx?: AuditContext
) {
  // Get the first stage (lowest position)
  const firstStage = await db("workflow_stages")
    .orderBy("position", "asc")
    .first();

  if (!firstStage) return;

  // Set the issue's current stage
  await db("issues")
    .where({ id: issueId })
    .update({ current_stage_id: firstStage.id });

  // Create stage assignments for all stages
  const stages = await db("workflow_stages").orderBy("position", "asc");

  for (const stage of stages) {
    const [assignment] = await db("issue_stage_assignments")
      .insert({
        issue_id: issueId,
        stage_id: stage.id,
        user_id: null,
        assigned_at: new Date(),
      })
      .returning("*");

    if (auditCtx) {
      await auditService.logInsert(
        "issue_stage_assignments",
        assignment.id,
        assignment,
        auditCtx
      );
    }
  }
}

export async function getIssueWorkflow(issueId: string) {
  const issue = await db("issues").where({ id: issueId }).first();
  if (!issue) throw new AppError(404, "Issue not found");

  const assignments = await db("issue_stage_assignments")
    .select(
      "issue_stage_assignments.*",
      "workflow_stages.name as stage_name",
      "workflow_stages.color as stage_color",
      "workflow_stages.position as stage_position",
      "workflow_stages.requires_signature",
      "users.email as assignee_email",
      "users.name as assignee_name"
    )
    .leftJoin(
      "workflow_stages",
      "issue_stage_assignments.stage_id",
      "workflow_stages.id"
    )
    .leftJoin("users", "issue_stage_assignments.user_id", "users.id")
    .where("issue_stage_assignments.issue_id", issueId)
    .orderBy("workflow_stages.position", "asc");

  // Get signatures per stage
  const signatures = await db("electronic_signatures")
    .where({ issue_id: issueId })
    .orderBy("signature_timestamp", "asc");

  return {
    currentStageId: issue.current_stage_id,
    assignments,
    signatures,
  };
}

export async function transitionIssue(
  issueId: string,
  targetStageId: string,
  auditCtx: AuditContext
) {
  const issue = await db("issues").where({ id: issueId }).first();
  if (!issue) throw new AppError(404, "Issue not found");

  const currentStage = issue.current_stage_id
    ? await db("workflow_stages").where({ id: issue.current_stage_id }).first()
    : null;

  const targetStage = await db("workflow_stages")
    .where({ id: targetStageId })
    .first();
  if (!targetStage) throw new AppError(404, "Target stage not found");

  // If the current stage requires a signature, verify one exists before moving forward
  if (currentStage && currentStage.requires_signature) {
    // Only enforce when moving forward
    if (targetStage.position > currentStage.position) {
      const signature = await db("electronic_signatures")
        .where({
          issue_id: issueId,
          workflow_stage_id: currentStage.id,
        })
        .first();

      if (!signature) {
        throw new AppError(
          400,
          `Stage "${currentStage.name}" requires an electronic signature before transitioning.`
        );
      }
    }
  }

  // Mark current stage assignment as completed
  if (issue.current_stage_id) {
    await db("issue_stage_assignments")
      .where({ issue_id: issueId, stage_id: issue.current_stage_id })
      .update({ completed_at: new Date() });
  }

  // Update issue's current stage
  const oldStageId = issue.current_stage_id;
  await db("issues")
    .where({ id: issueId })
    .update({ current_stage_id: targetStageId, updated_at: new Date() });

  await auditService.logChange(
    {
      tableName: "issues",
      recordId: issueId,
      fieldName: "current_stage_id",
      oldValue: oldStageId,
      newValue: targetStageId,
      changeType: "UPDATE",
    },
    auditCtx
  );

  return { issueId, previousStageId: oldStageId, currentStageId: targetStageId };
}

export async function assignStageUser(
  issueId: string,
  stageId: string,
  userId: string | null,
  auditCtx: AuditContext
) {
  const assignment = await db("issue_stage_assignments")
    .where({ issue_id: issueId, stage_id: stageId })
    .first();

  if (!assignment) {
    throw new AppError(404, "Stage assignment not found for this issue");
  }

  const oldUserId = assignment.user_id;

  await db("issue_stage_assignments")
    .where({ id: assignment.id })
    .update({ user_id: userId });

  await auditService.logChange(
    {
      tableName: "issue_stage_assignments",
      recordId: assignment.id,
      fieldName: "user_id",
      oldValue: oldUserId,
      newValue: userId,
      changeType: "UPDATE",
    },
    auditCtx
  );

  return { assignmentId: assignment.id, userId };
}

export async function completeStageAssignment(
  issueId: string,
  stageId: string,
  auditCtx: AuditContext
) {
  const assignment = await db("issue_stage_assignments")
    .where({ issue_id: issueId, stage_id: stageId })
    .first();

  if (!assignment) {
    throw new AppError(404, "Stage assignment not found");
  }

  if (assignment.completed_at) {
    throw new AppError(400, "This stage assignment is already completed");
  }

  // Check signature requirement
  const stage = await db("workflow_stages").where({ id: stageId }).first();
  if (stage && stage.requires_signature) {
    const signature = await db("electronic_signatures")
      .where({ issue_id: issueId, workflow_stage_id: stageId })
      .first();

    if (!signature) {
      throw new AppError(
        400,
        `Stage "${stage.name}" requires an electronic signature before it can be completed.`
      );
    }
  }

  await db("issue_stage_assignments")
    .where({ id: assignment.id })
    .update({ completed_at: new Date() });

  await auditService.logChange(
    {
      tableName: "issue_stage_assignments",
      recordId: assignment.id,
      fieldName: "completed_at",
      oldValue: null,
      newValue: new Date().toISOString(),
      changeType: "UPDATE",
    },
    auditCtx
  );

  return { assignmentId: assignment.id, completedAt: new Date() };
}

export async function getKanbanData(filters?: {
  assignee_id?: string;
  priority?: string;
  search?: string;
}) {
  const stages = await db("workflow_stages").orderBy("position", "asc");

  const issueQuery = db("issues")
    .select(
      "issues.*",
      "reporter.email as reporter_email",
      "reporter.name as reporter_name",
      "assignee.email as assignee_email",
      "assignee.name as assignee_name",
      "workflow_stages.name as stage_name",
      "workflow_stages.color as stage_color"
    )
    .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
    .leftJoin(
      "workflow_stages",
      "issues.current_stage_id",
      "workflow_stages.id"
    )
    .whereNotNull("issues.current_stage_id");

  if (filters?.assignee_id) {
    issueQuery.where("issues.assignee_id", filters.assignee_id);
  }
  if (filters?.priority) {
    issueQuery.where("issues.priority", filters.priority);
  }
  if (filters?.search) {
    issueQuery.where(function () {
      this.whereILike("issues.title", `%${filters.search}%`).orWhereILike(
        "issues.description",
        `%${filters.search}%`
      );
    });
  }

  const issues = await issueQuery;

  // Get signature counts per issue
  const signatureCounts = await db("electronic_signatures")
    .select("issue_id")
    .count("* as count")
    .groupBy("issue_id");

  const sigCountMap = new Map(
    signatureCounts.map((s: any) => [s.issue_id, Number(s.count)])
  );

  // Group issues by stage
  const columns = stages.map((stage: any) => ({
    stage,
    issues: issues
      .filter((i: any) => i.current_stage_id === stage.id)
      .map((i: any) => ({
        ...i,
        signatureCount: sigCountMap.get(i.id) || 0,
      })),
  }));

  return { columns };
}
