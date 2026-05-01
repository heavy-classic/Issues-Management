import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface ListActionsFilters {
  issue_id?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  search?: string;
}

interface CreateActionParams {
  issue_id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to?: string | null;
  due_date?: string | null;
}

interface UpdateActionParams {
  title?: string;
  description?: string;
  status?: "initiate" | "assigned" | "completed";
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to?: string | null;
  due_date?: string | null;
}

export async function listActions(filters: ListActionsFilters) {
  const query = db("actions")
    .select(
      "actions.*",
      "assignee.email as assignee_email",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
      "creator.email as creator_email",
      db.raw("COALESCE(creator.full_name, creator.name) as creator_name")
    )
    .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
    .leftJoin("users as creator", "actions.created_by", "creator.id")
    .orderBy("actions.created_at", "desc");

  if (filters.issue_id) query.where("actions.issue_id", filters.issue_id);
  if (filters.status) query.where("actions.status", filters.status);
  if (filters.priority) query.where("actions.priority", filters.priority);
  if (filters.assigned_to)
    query.where("actions.assigned_to", filters.assigned_to);
  if (filters.search) {
    query.where(function () {
      this.whereILike("actions.title", `%${filters.search}%`).orWhereILike(
        "actions.description",
        `%${filters.search}%`
      );
    });
  }

  return query;
}

export async function getAction(actionId: string) {
  const action = await db("actions")
    .select(
      "actions.*",
      "assignee.email as assignee_email",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
      "creator.email as creator_email",
      db.raw("COALESCE(creator.full_name, creator.name) as creator_name")
    )
    .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
    .leftJoin("users as creator", "actions.created_by", "creator.id")
    .where("actions.id", actionId)
    .first();

  if (!action) {
    throw new AppError(404, "Action not found");
  }

  const attachments = await db("attachments")
    .select(
      "attachments.*",
      "users.email as uploader_email",
      db.raw("COALESCE(users.full_name, users.name) as uploader_name")
    )
    .leftJoin("users", "attachments.uploaded_by", "users.id")
    .where({
      "attachments.parent_type": "action",
      "attachments.parent_id": actionId,
      "attachments.is_deleted": false,
    })
    .orderBy("attachments.uploaded_at", "asc");

  return { ...action, attachments };
}

export async function getActionsForIssue(issueId: string) {
  const actions = await db("actions")
    .select(
      "actions.*",
      "assignee.email as assignee_email",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
      "creator.email as creator_email",
      db.raw("COALESCE(creator.full_name, creator.name) as creator_name"),
      db.raw(
        "(SELECT COUNT(*) FROM attachments WHERE parent_type = 'action' AND parent_id = actions.id AND is_deleted = false)::int as attachment_count"
      )
    )
    .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
    .leftJoin("users as creator", "actions.created_by", "creator.id")
    .where("actions.issue_id", issueId)
    .orderBy("actions.created_at", "asc");

  return actions;
}

export async function createAction(
  userId: string,
  params: CreateActionParams,
  auditCtx: AuditContext
) {
  // Verify issue exists
  const issue = await db("issues").where({ id: params.issue_id }).first();
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }

  const [action] = await db("actions")
    .insert({
      issue_id: params.issue_id,
      title: params.title,
      description: params.description || "",
      priority: params.priority || "medium",
      assigned_to: params.assigned_to || null,
      due_date: params.due_date || null,
      created_by: userId,
    })
    .returning("*");

  await auditService.logInsert("actions", action.id, action, auditCtx);

  return action;
}

export async function updateAction(
  actionId: string,
  params: UpdateActionParams,
  auditCtx: AuditContext
) {
  const existing = await db("actions").where({ id: actionId }).first();
  if (!existing) {
    throw new AppError(404, "Action not found");
  }

  const updateData: Record<string, unknown> = {};
  if (params.title !== undefined) updateData.title = params.title;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.status !== undefined) {
    updateData.status = params.status;
    if (params.status === "completed") {
      updateData.completed_at = new Date();
    } else {
      updateData.completed_at = null;
    }
  }
  if (params.priority !== undefined) updateData.priority = params.priority;
  if (params.assigned_to !== undefined)
    updateData.assigned_to = params.assigned_to;
  if (params.due_date !== undefined) updateData.due_date = params.due_date;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  const [updated] = await db("actions")
    .where({ id: actionId })
    .update(updateData)
    .returning("*");

  await auditService.logFieldChanges(
    "actions",
    actionId,
    existing,
    updated,
    auditCtx
  );

  return updated;
}

export async function deleteAction(
  actionId: string,
  userId: string,
  auditCtx: AuditContext
) {
  const action = await db("actions").where({ id: actionId }).first();
  if (!action) {
    throw new AppError(404, "Action not found");
  }

  await auditService.logDelete("actions", actionId, action, auditCtx);
  await db("actions").where({ id: actionId }).del();
}

