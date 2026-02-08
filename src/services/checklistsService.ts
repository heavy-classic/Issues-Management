import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface CreateChecklistParams {
  name: string;
  description?: string;
  instructions?: string;
  status?: "draft" | "active" | "archived";
}

interface UpdateChecklistParams {
  name?: string;
  description?: string;
  instructions?: string;
  status?: "draft" | "active" | "archived";
}

interface CreateGroupParams {
  name: string;
  position?: number;
}

interface CreateCriterionParams {
  criterion_id_display?: string;
  text: string;
  reference_citation?: string;
  answer_type?: "yes_no" | "yes_no_na" | "compliant" | "rating_scale" | "expectations";
  risk_rating?: "low" | "medium" | "high" | "critical" | null;
  weight?: number;
  required_evidence?: Record<string, unknown> | null;
  comments_enabled?: boolean;
  attachments_allowed?: boolean;
  finding_creation_enabled?: boolean;
  help_text?: string;
  position?: number;
}

export async function listChecklists(filters: { status?: string } = {}) {
  const query = db("checklists")
    .select(
      "checklists.*",
      "users.full_name as creator_name",
      "users.email as creator_email",
      db.raw("(SELECT COUNT(*) FROM checklist_groups WHERE checklist_id = checklists.id)::int as group_count"),
      db.raw("(SELECT COUNT(*) FROM checklist_criteria cc JOIN checklist_groups cg ON cc.group_id = cg.id WHERE cg.checklist_id = checklists.id)::int as criteria_count")
    )
    .leftJoin("users", "checklists.created_by", "users.id")
    .orderBy("checklists.created_at", "desc");

  if (filters.status) query.where("checklists.status", filters.status);

  return query;
}

export async function getChecklist(id: string) {
  const checklist = await db("checklists")
    .select("checklists.*", "users.full_name as creator_name", "users.email as creator_email")
    .leftJoin("users", "checklists.created_by", "users.id")
    .where("checklists.id", id)
    .first();

  if (!checklist) {
    throw new AppError(404, "Checklist not found");
  }

  const groups = await db("checklist_groups")
    .where("checklist_id", id)
    .orderBy("position", "asc");

  const criteria = await db("checklist_criteria")
    .whereIn("group_id", groups.map((g: any) => g.id))
    .orderBy("position", "asc");

  // Nest criteria into groups
  const groupsWithCriteria = groups.map((g: any) => ({
    ...g,
    criteria: criteria.filter((c: any) => c.group_id === g.id),
  }));

  return { ...checklist, groups: groupsWithCriteria };
}

export async function createChecklist(
  userId: string,
  params: CreateChecklistParams,
  auditCtx: AuditContext
) {
  const [checklist] = await db("checklists")
    .insert({
      name: params.name,
      description: params.description || "",
      instructions: params.instructions || "",
      status: params.status || "draft",
      created_by: userId,
    })
    .returning("*");

  await auditService.logInsert("checklists", checklist.id, checklist, auditCtx);
  return checklist;
}

export async function updateChecklist(
  id: string,
  params: UpdateChecklistParams,
  auditCtx: AuditContext
) {
  const existing = await db("checklists").where({ id }).first();
  if (!existing) throw new AppError(404, "Checklist not found");

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.instructions !== undefined) updateData.instructions = params.instructions;
  if (params.status !== undefined) updateData.status = params.status;

  if (Object.keys(updateData).length === 0) throw new AppError(400, "No fields to update");
  updateData.updated_at = new Date();

  const [updated] = await db("checklists").where({ id }).update(updateData).returning("*");
  await auditService.logFieldChanges("checklists", id, existing, updated, auditCtx);
  return updated;
}

export async function deleteChecklist(id: string, auditCtx: AuditContext) {
  const existing = await db("checklists").where({ id }).first();
  if (!existing) throw new AppError(404, "Checklist not found");

  // Check if in use by any checklist instance
  const [usage] = await db("checklist_instances").where("checklist_id", id).count("* as count");
  if (Number(usage?.count) > 0) {
    throw new AppError(400, "Cannot delete checklist that is assigned to audits");
  }

  await auditService.logDelete("checklists", id, existing, auditCtx);
  await db("checklists").where({ id }).del();
}

export async function cloneChecklist(id: string, userId: string, auditCtx: AuditContext) {
  const source = await getChecklist(id);

  const [newChecklist] = await db("checklists")
    .insert({
      name: `${source.name} (Copy)`,
      description: source.description,
      instructions: source.instructions,
      status: "draft",
      version: 1,
      created_by: userId,
    })
    .returning("*");

  // Clone groups and criteria
  for (const group of source.groups) {
    const [newGroup] = await db("checklist_groups")
      .insert({
        checklist_id: newChecklist.id,
        name: group.name,
        position: group.position,
      })
      .returning("*");

    for (const criterion of group.criteria) {
      await db("checklist_criteria").insert({
        group_id: newGroup.id,
        criterion_id_display: criterion.criterion_id_display,
        text: criterion.text,
        reference_citation: criterion.reference_citation,
        answer_type: criterion.answer_type,
        risk_rating: criterion.risk_rating,
        weight: criterion.weight,
        required_evidence: criterion.required_evidence ? JSON.stringify(criterion.required_evidence) : null,
        comments_enabled: criterion.comments_enabled,
        attachments_allowed: criterion.attachments_allowed,
        finding_creation_enabled: criterion.finding_creation_enabled,
        help_text: criterion.help_text,
        position: criterion.position,
      });
    }
  }

  await auditService.logInsert("checklists", newChecklist.id, newChecklist, auditCtx);
  return getChecklist(newChecklist.id);
}

// ── Group CRUD ─────────────────────────────────────────────

export async function addGroup(checklistId: string, params: CreateGroupParams, auditCtx: AuditContext) {
  const checklist = await db("checklists").where({ id: checklistId }).first();
  if (!checklist) throw new AppError(404, "Checklist not found");

  // Auto position
  let position = params.position;
  if (position === undefined) {
    const [max] = await db("checklist_groups").where("checklist_id", checklistId).max("position as max");
    position = (max?.max ?? -1) + 1;
  }

  const [group] = await db("checklist_groups")
    .insert({ checklist_id: checklistId, name: params.name, position })
    .returning("*");

  await auditService.logInsert("checklist_groups", group.id, group, auditCtx);
  return group;
}

export async function updateGroup(groupId: string, params: { name?: string; position?: number }, auditCtx: AuditContext) {
  const existing = await db("checklist_groups").where({ id: groupId }).first();
  if (!existing) throw new AppError(404, "Checklist group not found");

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.position !== undefined) updateData.position = params.position;
  if (Object.keys(updateData).length === 0) throw new AppError(400, "No fields to update");
  updateData.updated_at = new Date();

  const [updated] = await db("checklist_groups").where({ id: groupId }).update(updateData).returning("*");
  await auditService.logFieldChanges("checklist_groups", groupId, existing, updated, auditCtx);
  return updated;
}

export async function deleteGroup(groupId: string, auditCtx: AuditContext) {
  const existing = await db("checklist_groups").where({ id: groupId }).first();
  if (!existing) throw new AppError(404, "Checklist group not found");
  await auditService.logDelete("checklist_groups", groupId, existing, auditCtx);
  await db("checklist_groups").where({ id: groupId }).del();
}

export async function reorderGroups(checklistId: string, groupIds: string[], auditCtx: AuditContext) {
  for (let i = 0; i < groupIds.length; i++) {
    await db("checklist_groups")
      .where({ id: groupIds[i], checklist_id: checklistId })
      .update({ position: i, updated_at: new Date() });
  }
}

// ── Criterion CRUD ─────────────────────────────────────────

export async function addCriterion(groupId: string, params: CreateCriterionParams, auditCtx: AuditContext) {
  const group = await db("checklist_groups").where({ id: groupId }).first();
  if (!group) throw new AppError(404, "Checklist group not found");

  let position = params.position;
  if (position === undefined) {
    const [max] = await db("checklist_criteria").where("group_id", groupId).max("position as max");
    position = (max?.max ?? -1) + 1;
  }

  const [criterion] = await db("checklist_criteria")
    .insert({
      group_id: groupId,
      criterion_id_display: params.criterion_id_display || "",
      text: params.text,
      reference_citation: params.reference_citation || "",
      answer_type: params.answer_type || "yes_no",
      risk_rating: params.risk_rating || null,
      weight: params.weight || 1.0,
      required_evidence: params.required_evidence ? JSON.stringify(params.required_evidence) : null,
      comments_enabled: params.comments_enabled !== undefined ? params.comments_enabled : true,
      attachments_allowed: params.attachments_allowed !== undefined ? params.attachments_allowed : true,
      finding_creation_enabled: params.finding_creation_enabled !== undefined ? params.finding_creation_enabled : true,
      help_text: params.help_text || "",
      position,
    })
    .returning("*");

  await auditService.logInsert("checklist_criteria", criterion.id, criterion, auditCtx);
  return criterion;
}

export async function updateCriterion(criterionId: string, params: Partial<CreateCriterionParams>, auditCtx: AuditContext) {
  const existing = await db("checklist_criteria").where({ id: criterionId }).first();
  if (!existing) throw new AppError(404, "Criterion not found");

  const updateData: Record<string, unknown> = {};
  if (params.criterion_id_display !== undefined) updateData.criterion_id_display = params.criterion_id_display;
  if (params.text !== undefined) updateData.text = params.text;
  if (params.reference_citation !== undefined) updateData.reference_citation = params.reference_citation;
  if (params.answer_type !== undefined) updateData.answer_type = params.answer_type;
  if (params.risk_rating !== undefined) updateData.risk_rating = params.risk_rating;
  if (params.weight !== undefined) updateData.weight = params.weight;
  if (params.required_evidence !== undefined) updateData.required_evidence = params.required_evidence ? JSON.stringify(params.required_evidence) : null;
  if (params.comments_enabled !== undefined) updateData.comments_enabled = params.comments_enabled;
  if (params.attachments_allowed !== undefined) updateData.attachments_allowed = params.attachments_allowed;
  if (params.finding_creation_enabled !== undefined) updateData.finding_creation_enabled = params.finding_creation_enabled;
  if (params.help_text !== undefined) updateData.help_text = params.help_text;
  if (params.position !== undefined) updateData.position = params.position;

  if (Object.keys(updateData).length === 0) throw new AppError(400, "No fields to update");
  updateData.updated_at = new Date();

  const [updated] = await db("checklist_criteria").where({ id: criterionId }).update(updateData).returning("*");
  await auditService.logFieldChanges("checklist_criteria", criterionId, existing, updated, auditCtx);
  return updated;
}

export async function deleteCriterion(criterionId: string, auditCtx: AuditContext) {
  const existing = await db("checklist_criteria").where({ id: criterionId }).first();
  if (!existing) throw new AppError(404, "Criterion not found");
  await auditService.logDelete("checklist_criteria", criterionId, existing, auditCtx);
  await db("checklist_criteria").where({ id: criterionId }).del();
}

export async function reorderCriteria(groupId: string, criterionIds: string[], auditCtx: AuditContext) {
  for (let i = 0; i < criterionIds.length; i++) {
    await db("checklist_criteria")
      .where({ id: criterionIds[i], group_id: groupId })
      .update({ position: i, updated_at: new Date() });
  }
}
