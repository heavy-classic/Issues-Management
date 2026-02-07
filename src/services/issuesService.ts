import db from "../db";
import { AppError } from "../errors/AppError";

interface CreateIssueParams {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  assignee_id?: string | null;
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
}

export async function listIssues(filters: ListIssuesFilters) {
  const query = db("issues")
    .select(
      "issues.*",
      "reporter.email as reporter_email",
      "reporter.name as reporter_name",
      "assignee.email as assignee_email",
      "assignee.name as assignee_name"
    )
    .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
    .orderBy("issues.created_at", "desc");

  if (filters.status) {
    query.where("issues.status", filters.status);
  }
  if (filters.priority) {
    query.where("issues.priority", filters.priority);
  }
  if (filters.assignee_id) {
    query.where("issues.assignee_id", filters.assignee_id);
  }

  return query;
}

export async function getIssue(issueId: string) {
  const issue = await db("issues")
    .select(
      "issues.*",
      "reporter.email as reporter_email",
      "reporter.name as reporter_name",
      "assignee.email as assignee_email",
      "assignee.name as assignee_name"
    )
    .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
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

  return { ...issue, comments };
}

export async function createIssue(
  reporterId: string,
  params: CreateIssueParams
) {
  const [issue] = await db("issues")
    .insert({
      title: params.title,
      description: params.description || "",
      priority: params.priority || "medium",
      reporter_id: reporterId,
      assignee_id: params.assignee_id || null,
    })
    .returning("*");

  return issue;
}

export async function updateIssue(issueId: string, params: UpdateIssueParams) {
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

  return updated;
}

export async function deleteIssue(issueId: string, userId: string) {
  const issue = await db("issues").where({ id: issueId }).first();
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }
  if (issue.reporter_id !== userId) {
    throw new AppError(403, "Only the reporter can delete this issue");
  }

  await db("issues").where({ id: issueId }).del();
}
