import db from "../db";
import { AppError } from "../errors/AppError";

export async function getIssueExportData(issueId: string) {
  const issue = await db("issues")
    .select(
      "issues.*",
      "reporter.email as reporter_email",
      db.raw("COALESCE(reporter.full_name, reporter.name) as reporter_name"),
      "assignee.email as assignee_email",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
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

  const actions = await db("actions")
    .select(
      "actions.*",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
      db.raw("COALESCE(creator.full_name, creator.name) as creator_name")
    )
    .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
    .leftJoin("users as creator", "actions.created_by", "creator.id")
    .where("actions.issue_id", issueId)
    .orderBy("actions.created_at", "asc");

  const comments = await db("comments")
    .select("comments.*", db.raw("COALESCE(users.full_name, users.name) as author_name"))
    .leftJoin("users", "comments.author_id", "users.id")
    .where("comments.issue_id", issueId)
    .orderBy("comments.created_at", "asc");

  const signatures = await db("electronic_signatures")
    .where("issue_id", issueId)
    .orderBy("signature_timestamp", "asc");

  const stageAssignments = await db("issue_stage_assignments")
    .select(
      "issue_stage_assignments.*",
      "workflow_stages.name as stage_name",
      db.raw("COALESCE(users.full_name, users.name) as assignee_name")
    )
    .leftJoin(
      "workflow_stages",
      "issue_stage_assignments.stage_id",
      "workflow_stages.id"
    )
    .leftJoin("users", "issue_stage_assignments.user_id", "users.id")
    .where("issue_stage_assignments.issue_id", issueId)
    .orderBy("workflow_stages.position", "asc");

  const auditEntries = await db("audit_log")
    .where(function () {
      this.where({ table_name: "issues", record_id: issueId })
        .orWhere(function () {
          this.where("table_name", "actions").whereIn(
            "record_id",
            db("actions").select("id").where("issue_id", issueId)
          );
        })
        .orWhere(function () {
          this.where("table_name", "comments").whereIn(
            "record_id",
            db("comments").select("id").where("issue_id", issueId)
          );
        });
    })
    .orderBy("changed_at", "desc")
    .limit(100);

  return {
    issue,
    actions,
    comments,
    signatures,
    stageAssignments,
    auditEntries,
  };
}

interface IssuesExportFilters {
  status?: string;
  priority?: string;
  assignee_id?: string;
  stage_id?: string;
}

export async function getIssuesExportData(filters: IssuesExportFilters) {
  const query = db("issues")
    .select(
      "issues.id",
      "issues.title",
      "issues.description",
      "issues.status",
      "issues.priority",
      "issues.created_at",
      "issues.updated_at",
      db.raw("COALESCE(reporter.full_name, reporter.name) as reporter_name"),
      "reporter.email as reporter_email",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
      "assignee.email as assignee_email",
      "workflow_stages.name as stage_name",
      db.raw(
        "(SELECT COUNT(*) FROM actions WHERE issue_id = issues.id)::int as action_count"
      ),
      db.raw(
        "(SELECT COUNT(*) FROM comments WHERE issue_id = issues.id)::int as comment_count"
      )
    )
    .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
    .leftJoin(
      "workflow_stages",
      "issues.current_stage_id",
      "workflow_stages.id"
    )
    .orderBy("issues.created_at", "desc");

  if (filters.status) query.where("issues.status", filters.status);
  if (filters.priority) query.where("issues.priority", filters.priority);
  if (filters.assignee_id)
    query.where("issues.assignee_id", filters.assignee_id);
  if (filters.stage_id)
    query.where("issues.current_stage_id", filters.stage_id);

  return query;
}

interface ActionsExportFilters {
  issue_id?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
}

export async function getActionsExportData(filters: ActionsExportFilters) {
  const query = db("actions")
    .select(
      "actions.id",
      "actions.title",
      "actions.description",
      "actions.status",
      "actions.priority",
      "actions.due_date",
      "actions.completed_at",
      "actions.created_at",
      "issues.title as issue_title",
      db.raw("COALESCE(assignee.full_name, assignee.name) as assignee_name"),
      db.raw("COALESCE(creator.full_name, creator.name) as creator_name"),
      db.raw(
        "(SELECT COUNT(*) FROM action_attachments WHERE action_id = actions.id)::int as attachment_count"
      )
    )
    .leftJoin("issues", "actions.issue_id", "issues.id")
    .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
    .leftJoin("users as creator", "actions.created_by", "creator.id")
    .orderBy("actions.created_at", "desc");

  if (filters.issue_id) query.where("actions.issue_id", filters.issue_id);
  if (filters.status) query.where("actions.status", filters.status);
  if (filters.priority) query.where("actions.priority", filters.priority);
  if (filters.assigned_to)
    query.where("actions.assigned_to", filters.assigned_to);

  return query;
}
