import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface CreateIssueParams {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  assignee_id?: string | null;
  source?: string | null;
  on_behalf_of_id?: string | null;
  department?: string | null;
  date_identified?: string | null;
}

interface UpdateIssueParams {
  title?: string;
  description?: string;
  status?: "open" | "in_progress" | "closed";
  priority?: "low" | "medium" | "high" | "critical";
  assignee_id?: string | null;
}

interface ListIssuesFilters {
  status?: string;
  priority?: string;
  assignee_id?: string;
  stage_id?: string;
  search?: string;
  audit_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

const ISSUE_SORT_COLUMNS: Record<string, string> = {
  title: "issues.title",
  status: "issues.status",
  priority: "issues.priority",
  created_at: "issues.created_at",
  updated_at: "issues.updated_at",
  stage: "workflow_stages.name",
  reporter: "reporter.name",
  assignee: "assignee.name",
};

export async function listIssues(filters: ListIssuesFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const sortCol = ISSUE_SORT_COLUMNS[filters.sort_by || ""] || "issues.created_at";
  const sortDir = filters.sort_dir === "asc" ? "asc" : "desc";

  const baseQuery = db("issues")
    .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
    .leftJoin(
      "workflow_stages",
      "issues.current_stage_id",
      "workflow_stages.id"
    );

  if (filters.status) baseQuery.where("issues.status", filters.status);
  if (filters.priority) baseQuery.where("issues.priority", filters.priority);
  if (filters.assignee_id)
    baseQuery.where("issues.assignee_id", filters.assignee_id);
  if (filters.stage_id)
    baseQuery.where("issues.current_stage_id", filters.stage_id);
  if (filters.audit_id)
    baseQuery.where("issues.audit_id", filters.audit_id);
  if (filters.search) {
    baseQuery.where(function () {
      this.whereILike("issues.title", `%${filters.search}%`).orWhereILike(
        "issues.description",
        `%${filters.search}%`
      );
    });
  }

  const countResult = await baseQuery.clone().count("issues.id as count").first();
  const total = Number(countResult?.count || 0);

  const issues = await baseQuery
    .clone()
    .select(
      "issues.*",
      "reporter.email as reporter_email",
      "reporter.name as reporter_name",
      "assignee.email as assignee_email",
      "assignee.name as assignee_name",
      "workflow_stages.name as stage_name",
      "workflow_stages.color as stage_color"
    )
    .orderBy(sortCol, sortDir)
    .limit(limit)
    .offset((page - 1) * limit);

  return { issues, total, page, limit };
}

export async function getIssue(issueId: string) {
  const issue = await db("issues")
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
    .where("issues.id", issueId)
    .first();

  if (!issue) {
    throw new AppError(404, "Issue not found");
  }

  const comments = await db("comments")
    .select(
      "comments.*",
      "users.email as author_email",
      "users.name as author_name"
    )
    .leftJoin("users", "comments.author_id", "users.id")
    .where("comments.issue_id", issueId)
    .orderBy("comments.created_at", "asc");

  // Get workflow stage assignments
  const stageAssignments = await db("issue_stage_assignments")
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

  // Get signatures for this issue
  const signatures = await db("electronic_signatures")
    .where("issue_id", issueId)
    .orderBy("signature_timestamp", "asc");

  // Get actions for this issue
  const actions = await db("actions")
    .select(
      "actions.*",
      "assignee.email as assignee_email",
      "assignee.name as assignee_name",
      "creator.email as creator_email",
      "creator.name as creator_name",
      db.raw(
        "(SELECT COUNT(*) FROM attachments WHERE parent_type = 'action' AND parent_id = actions.id AND is_deleted = false)::int as attachment_count"
      )
    )
    .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
    .leftJoin("users as creator", "actions.created_by", "creator.id")
    .where("actions.issue_id", issueId)
    .orderBy("actions.created_at", "asc");

  // Get issue-level attachments
  const attachments = await db("attachments")
    .select(
      "attachments.*",
      "users.name as uploader_name",
      "users.email as uploader_email"
    )
    .leftJoin("users", "attachments.uploaded_by", "users.id")
    .where({
      "attachments.parent_type": "issue",
      "attachments.parent_id": issueId,
      "attachments.is_deleted": false,
    })
    .orderBy("attachments.uploaded_at", "asc");

  return { ...issue, comments, stageAssignments, signatures, actions, attachments };
}

export async function createIssue(
  reporterId: string,
  params: CreateIssueParams,
  auditCtx?: AuditContext
) {
  const [issue] = await db("issues")
    .insert({
      title: params.title,
      description: params.description || "",
      priority: params.priority || "medium",
      reporter_id: reporterId,
      assignee_id: params.assignee_id || null,
      source: params.source || null,
      on_behalf_of_id: params.on_behalf_of_id || null,
      department: params.department || null,
      date_identified: params.date_identified || new Date().toISOString().slice(0, 10),
    })
    .returning("*");

  if (auditCtx) {
    await auditService.logInsert("issues", issue.id, issue, auditCtx);
  }

  return issue;
}

export async function updateIssue(
  issueId: string,
  params: UpdateIssueParams,
  auditCtx?: AuditContext
) {
  const existing = await db("issues").where({ id: issueId }).first();
  if (!existing) {
    throw new AppError(404, "Issue not found");
  }

  const updateData: Record<string, unknown> = {};
  if (params.title !== undefined) updateData.title = params.title;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.status !== undefined) updateData.status = params.status;
  if (params.priority !== undefined) updateData.priority = params.priority;
  if (params.assignee_id !== undefined)
    updateData.assignee_id = params.assignee_id;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  const [updated] = await db("issues")
    .where({ id: issueId })
    .update(updateData)
    .returning("*");

  if (auditCtx) {
    await auditService.logFieldChanges(
      "issues",
      issueId,
      existing,
      updated,
      auditCtx
    );
  }

  return updated;
}

export async function deleteIssue(
  issueId: string,
  userId: string,
  auditCtx?: AuditContext
) {
  const issue = await db("issues").where({ id: issueId }).first();
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }
  if (issue.reporter_id !== userId) {
    throw new AppError(403, "Only the reporter can delete this issue");
  }

  if (auditCtx) {
    await auditService.logDelete("issues", issueId, issue, auditCtx);
  }

  await db("issues").where({ id: issueId }).del();
}
