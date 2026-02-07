import db from "../db";

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  assignee_id?: string;
  stage_id?: string;
}

function applyIssueFilters(
  query: any,
  filters: DashboardFilters,
  table = "issues"
) {
  if (filters.dateFrom)
    query.where(`${table}.created_at`, ">=", filters.dateFrom);
  if (filters.dateTo) query.where(`${table}.created_at`, "<=", filters.dateTo);
  if (filters.priority) query.where(`${table}.priority`, filters.priority);
  if (filters.assignee_id)
    query.where(`${table}.assignee_id`, filters.assignee_id);
  if (filters.stage_id)
    query.where(`${table}.current_stage_id`, filters.stage_id);
  return query;
}

export async function getKPIs(filters: DashboardFilters) {
  const baseQuery = () => {
    const q = db("issues");
    return applyIssueFilters(q, filters);
  };

  const [totalResult] = await baseQuery().count("* as count");
  const [openResult] = await baseQuery()
    .whereNot("status", "closed")
    .count("* as count");

  const actionsQuery = db("actions")
    .join("issues", "actions.issue_id", "issues.id");
  applyIssueFilters(actionsQuery, filters);
  const [completedActionsResult] = await actionsQuery
    .clone()
    .where("actions.status", "completed")
    .count("* as count");

  // Avg resolution days: for closed issues, difference between created_at and updated_at
  const avgResolution = await baseQuery()
    .clone()
    .where("status", "closed")
    .avg(
      db.raw(
        "EXTRACT(EPOCH FROM (issues.updated_at - issues.created_at)) / 86400"
      )
    )
    .first();

  return {
    totalIssues: Number(totalResult?.count || 0),
    openIssues: Number(openResult?.count || 0),
    completedActions: Number(completedActionsResult?.count || 0),
    avgResolutionDays: avgResolution?.avg
      ? Math.round(Number(avgResolution.avg) * 10) / 10
      : 0,
  };
}

export async function getIssuesByStatus(filters: DashboardFilters) {
  const query = db("issues")
    .select("status")
    .count("* as count")
    .groupBy("status");
  applyIssueFilters(query, filters);
  const rows = await query;
  return rows.map((r: any) => ({ name: r.status, value: Number(r.count) }));
}

export async function getIssuesByPriority(filters: DashboardFilters) {
  const query = db("issues")
    .select("priority")
    .count("* as count")
    .groupBy("priority");
  applyIssueFilters(query, filters);
  const rows = await query;
  return rows.map((r: any) => ({ name: r.priority, value: Number(r.count) }));
}

export async function getIssuesByStage(filters: DashboardFilters) {
  const query = db("issues")
    .select("workflow_stages.name as stage_name", "workflow_stages.color")
    .count("* as count")
    .leftJoin(
      "workflow_stages",
      "issues.current_stage_id",
      "workflow_stages.id"
    )
    .groupBy("workflow_stages.name", "workflow_stages.color")
    .orderBy("count", "desc");
  applyIssueFilters(query, filters);
  const rows = await query;
  return rows.map((r: any) => ({
    name: r.stage_name || "Unassigned",
    value: Number(r.count),
    color: r.color,
  }));
}

export async function getIssueCreationTrend(filters: DashboardFilters) {
  const query = db("issues")
    .select(db.raw("DATE(issues.created_at) as date"))
    .count("* as count")
    .groupBy(db.raw("DATE(issues.created_at)"))
    .orderBy("date", "asc");
  applyIssueFilters(query, filters);
  const rows = await query;
  return rows.map((r: any) => ({ date: r.date, count: Number(r.count) }));
}

export async function getActionsByStatus(filters: DashboardFilters) {
  const query = db("actions")
    .select("actions.status")
    .count("* as count")
    .join("issues", "actions.issue_id", "issues.id")
    .groupBy("actions.status");
  applyIssueFilters(query, filters);
  const rows = await query;
  return rows.map((r: any) => ({ name: r.status, value: Number(r.count) }));
}

export async function getIssueResolutionFunnel(filters: DashboardFilters) {
  const stages = await db("workflow_stages").orderBy("position", "asc");
  const results = [];

  for (const stage of stages) {
    const query = db("issue_stage_assignments")
      .join("issues", "issue_stage_assignments.issue_id", "issues.id")
      .where("issue_stage_assignments.stage_id", stage.id);
    applyIssueFilters(query, filters);
    const [result] = await query.count("* as count");
    results.push({
      name: stage.name,
      value: Number(result?.count || 0),
      color: stage.color,
    });
  }

  return results;
}

export async function getPriorityByStageHeatmap(filters: DashboardFilters) {
  const query = db("issues")
    .select(
      "issues.priority",
      "workflow_stages.name as stage_name",
      "workflow_stages.position"
    )
    .count("* as count")
    .leftJoin(
      "workflow_stages",
      "issues.current_stage_id",
      "workflow_stages.id"
    )
    .groupBy(
      "issues.priority",
      "workflow_stages.name",
      "workflow_stages.position"
    )
    .orderBy("workflow_stages.position", "asc");
  applyIssueFilters(query, filters);
  const rows = await query;
  return rows.map((r: any) => ({
    priority: r.priority,
    stage: r.stage_name || "Unassigned",
    count: Number(r.count),
  }));
}

export async function getTeamWorkload(filters: DashboardFilters) {
  const query = db("issues")
    .select(
      "users.name as user_name",
      "users.email as user_email",
      "issues.status"
    )
    .count("* as count")
    .leftJoin("users", "issues.assignee_id", "users.id")
    .whereNotNull("issues.assignee_id")
    .groupBy("users.name", "users.email", "issues.status")
    .orderBy("users.name", "asc");
  applyIssueFilters(query, filters);
  const rows = await query;

  // Group by user, with status breakdown
  const userMap: Record<string, any> = {};
  for (const row of rows as any[]) {
    const name = row.user_name || row.user_email;
    if (!userMap[name]) {
      userMap[name] = { name, open: 0, in_progress: 0, closed: 0, total: 0 };
    }
    userMap[name][row.status] = Number(row.count);
    userMap[name].total += Number(row.count);
  }

  return Object.values(userMap);
}
