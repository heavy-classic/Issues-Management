import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface CreateAuditTypeParams {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  workflow_phases?: string[];
  checklist_settings?: Record<string, unknown>;
  team_settings?: Record<string, unknown>;
  is_active?: boolean;
}

interface UpdateAuditTypeParams {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  workflow_phases?: string[];
  checklist_settings?: Record<string, unknown>;
  team_settings?: Record<string, unknown>;
  is_active?: boolean;
}

export async function listAuditTypes(filters: { is_active?: boolean } = {}) {
  const query = db("audit_types")
    .select("audit_types.*", "users.full_name as creator_name", "users.email as creator_email")
    .leftJoin("users", "audit_types.created_by", "users.id")
    .orderBy("audit_types.name", "asc");

  if (filters.is_active !== undefined) {
    query.where("audit_types.is_active", filters.is_active);
  }

  return query;
}

export async function getAuditType(id: string) {
  const auditType = await db("audit_types")
    .select("audit_types.*", "users.full_name as creator_name", "users.email as creator_email")
    .leftJoin("users", "audit_types.created_by", "users.id")
    .where("audit_types.id", id)
    .first();

  if (!auditType) {
    throw new AppError(404, "Audit type not found");
  }

  // Count of audits using this type
  const [countResult] = await db("audits")
    .where("audit_type_id", id)
    .count("* as count");
  auditType.audit_count = Number(countResult?.count || 0);

  return auditType;
}

export async function createAuditType(
  userId: string,
  params: CreateAuditTypeParams,
  auditCtx: AuditContext
) {
  const [auditType] = await db("audit_types")
    .insert({
      name: params.name,
      description: params.description || "",
      color: params.color || "#667eea",
      icon: params.icon || "\u{1F50D}",
      workflow_phases: JSON.stringify(params.workflow_phases || ["Schedule", "Plan", "Execute", "Review", "Closeout"]),
      checklist_settings: JSON.stringify(params.checklist_settings || { required: false, max_checklists: 10 }),
      team_settings: JSON.stringify(params.team_settings || { min_team_size: 1, require_lead: true }),
      is_active: params.is_active !== undefined ? params.is_active : true,
      created_by: userId,
    })
    .returning("*");

  await auditService.logInsert("audit_types", auditType.id, auditType, auditCtx);

  return auditType;
}

export async function updateAuditType(
  id: string,
  params: UpdateAuditTypeParams,
  auditCtx: AuditContext
) {
  const existing = await db("audit_types").where({ id }).first();
  if (!existing) {
    throw new AppError(404, "Audit type not found");
  }

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.color !== undefined) updateData.color = params.color;
  if (params.icon !== undefined) updateData.icon = params.icon;
  if (params.workflow_phases !== undefined) updateData.workflow_phases = JSON.stringify(params.workflow_phases);
  if (params.checklist_settings !== undefined) updateData.checklist_settings = JSON.stringify(params.checklist_settings);
  if (params.team_settings !== undefined) updateData.team_settings = JSON.stringify(params.team_settings);
  if (params.is_active !== undefined) updateData.is_active = params.is_active;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  const [updated] = await db("audit_types")
    .where({ id })
    .update(updateData)
    .returning("*");

  await auditService.logFieldChanges("audit_types", id, existing, updated, auditCtx);

  return updated;
}

export async function deleteAuditType(
  id: string,
  auditCtx: AuditContext
) {
  const existing = await db("audit_types").where({ id }).first();
  if (!existing) {
    throw new AppError(404, "Audit type not found");
  }

  // Check if any audits use this type
  const [countResult] = await db("audits").where("audit_type_id", id).count("* as count");
  if (Number(countResult?.count) > 0) {
    throw new AppError(400, "Cannot delete audit type that is in use");
  }

  await auditService.logDelete("audit_types", id, existing, auditCtx);
  await db("audit_types").where({ id }).del();
}
