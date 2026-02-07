import db from "../db";
import { AppError } from "../errors/AppError";

interface ReportConfig {
  reportType: string;
  fields: string[];
  dimensions: string[];
  measures: string[];
  chartType: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
  };
}

interface CreateReportParams {
  name: string;
  description?: string;
  report_type: string;
  config: ReportConfig;
  is_public?: boolean;
}

// Whitelisted dimension columns to prevent SQL injection
const ALLOWED_DIMENSIONS: Record<string, string> = {
  status: "issues.status",
  priority: "issues.priority",
  stage: "workflow_stages.name",
  assignee: "assignee.name",
  reporter: "reporter.name",
  created_date: "DATE(issues.created_at)",
  created_month:
    "TO_CHAR(issues.created_at, 'YYYY-MM')",
  action_status: "actions.status",
  action_priority: "actions.priority",
  action_assignee: "action_assignee.name",
};

// Whitelisted measure aggregations
const ALLOWED_MEASURES: Record<string, string> = {
  count: "COUNT(*)",
  issue_count: "COUNT(DISTINCT issues.id)",
  action_count: "COUNT(DISTINCT actions.id)",
  avg_resolution_days:
    "AVG(EXTRACT(EPOCH FROM (issues.updated_at - issues.created_at)) / 86400)",
  completed_actions:
    "COUNT(DISTINCT CASE WHEN actions.status = 'completed' THEN actions.id END)",
  overdue_actions:
    "COUNT(DISTINCT CASE WHEN actions.due_date < CURRENT_DATE AND actions.status != 'completed' THEN actions.id END)",
};

export async function listSavedReports(userId: string) {
  return db("saved_reports")
    .select(
      "saved_reports.*",
      "users.name as creator_name",
      "users.email as creator_email"
    )
    .leftJoin("users", "saved_reports.created_by", "users.id")
    .where(function () {
      this.where("saved_reports.created_by", userId).orWhere(
        "saved_reports.is_public",
        true
      );
    })
    .orderBy("saved_reports.updated_at", "desc");
}

export async function getSavedReport(reportId: string) {
  const report = await db("saved_reports")
    .where({ id: reportId })
    .first();
  if (!report) {
    throw new AppError(404, "Report not found");
  }
  return report;
}

export async function createReport(
  userId: string,
  params: CreateReportParams
) {
  const [report] = await db("saved_reports")
    .insert({
      name: params.name,
      description: params.description || "",
      report_type: params.report_type,
      config: JSON.stringify(params.config),
      created_by: userId,
      is_public: params.is_public || false,
    })
    .returning("*");

  return report;
}

export async function updateReport(
  reportId: string,
  userId: string,
  params: Partial<CreateReportParams>
) {
  const existing = await db("saved_reports")
    .where({ id: reportId })
    .first();
  if (!existing) {
    throw new AppError(404, "Report not found");
  }
  if (existing.created_by !== userId) {
    throw new AppError(403, "Only the creator can edit this report");
  }

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.report_type !== undefined)
    updateData.report_type = params.report_type;
  if (params.config !== undefined)
    updateData.config = JSON.stringify(params.config);
  if (params.is_public !== undefined) updateData.is_public = params.is_public;
  updateData.updated_at = new Date();

  const [updated] = await db("saved_reports")
    .where({ id: reportId })
    .update(updateData)
    .returning("*");

  return updated;
}

export async function deleteReport(reportId: string, userId: string) {
  const existing = await db("saved_reports")
    .where({ id: reportId })
    .first();
  if (!existing) {
    throw new AppError(404, "Report not found");
  }
  if (existing.created_by !== userId) {
    throw new AppError(403, "Only the creator can delete this report");
  }

  await db("saved_reports").where({ id: reportId }).del();
}

export async function runReport(config: ReportConfig) {
  const reportType = config.reportType;

  // Build base query based on report type
  let query;
  if (reportType === "actions" || reportType === "teams") {
    query = db("issues")
      .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
      .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
      .leftJoin(
        "workflow_stages",
        "issues.current_stage_id",
        "workflow_stages.id"
      )
      .leftJoin("actions", "actions.issue_id", "issues.id")
      .leftJoin(
        "users as action_assignee",
        "actions.assigned_to",
        "action_assignee.id"
      );
  } else {
    query = db("issues")
      .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
      .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
      .leftJoin(
        "workflow_stages",
        "issues.current_stage_id",
        "workflow_stages.id"
      )
      .leftJoin("actions", "actions.issue_id", "issues.id")
      .leftJoin(
        "users as action_assignee",
        "actions.assigned_to",
        "action_assignee.id"
      );
  }

  // Apply filters
  if (config.filters.dateFrom)
    query.where("issues.created_at", ">=", config.filters.dateFrom);
  if (config.filters.dateTo)
    query.where("issues.created_at", "<=", config.filters.dateTo);
  if (config.filters.status)
    query.where("issues.status", config.filters.status);
  if (config.filters.priority)
    query.where("issues.priority", config.filters.priority);
  if (config.filters.assignee_id)
    query.where("issues.assignee_id", config.filters.assignee_id);

  // Build SELECT and GROUP BY from whitelisted dimensions and measures
  const selectParts: string[] = [];
  const groupByParts: string[] = [];

  for (const dim of config.dimensions) {
    const col = ALLOWED_DIMENSIONS[dim];
    if (!col) continue;
    selectParts.push(`${col} as "${dim}"`);
    groupByParts.push(col);
  }

  for (const measure of config.measures) {
    const agg = ALLOWED_MEASURES[measure];
    if (!agg) continue;
    selectParts.push(`${agg} as "${measure}"`);
  }

  if (selectParts.length === 0) {
    throw new AppError(400, "At least one dimension or measure is required");
  }

  query.select(db.raw(selectParts.join(", ")));
  if (groupByParts.length > 0) {
    query.groupByRaw(groupByParts.join(", "));
  }

  // Order by first measure descending if available
  if (config.measures.length > 0) {
    query.orderBy(config.measures[0], "desc");
  }

  query.limit(1000);

  const rows = await query;
  return { data: rows, dimensions: config.dimensions, measures: config.measures };
}
