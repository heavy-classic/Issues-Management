import db from "../db";

export interface AuditDashboardFilters {
  date_from?: string;
  date_to?: string;
  audit_type_id?: string;
  risk_level?: string;
}

function applyFilters(query: any, filters: AuditDashboardFilters, table = "audits") {
  if (filters.date_from) query.where(`${table}.created_at`, ">=", filters.date_from);
  if (filters.date_to) query.where(`${table}.created_at`, "<=", filters.date_to);
  if (filters.audit_type_id) query.where(`${table}.audit_type_id`, filters.audit_type_id);
  if (filters.risk_level) query.where(`${table}.risk_level`, filters.risk_level);
  return query;
}

export async function getKPIs(filters: AuditDashboardFilters) {
  const base = () => applyFilters(db("audits"), filters);

  const [totalResult] = await base().count("* as count");
  const [inProgressResult] = await base().where("status", "in_progress").count("* as count");
  const [closedResult] = await base().where("status", "closed").count("* as count");

  // Overdue: scheduled_end < today and not closed/cancelled
  const [overdueResult] = await base()
    .where("scheduled_end", "<", new Date().toISOString().split("T")[0])
    .whereNotIn("status", ["closed", "cancelled"])
    .count("* as count");

  // Avg compliance score for closed audits
  const avgScoreResult = await base()
    .where("status", "closed")
    .whereNotNull("compliance_score")
    .avg("compliance_score as avg")
    .first();

  // Total findings
  const findingsQuery = db("issues").whereNotNull("audit_id");
  if (filters.date_from) findingsQuery.where("issues.created_at", ">=", filters.date_from);
  if (filters.date_to) findingsQuery.where("issues.created_at", "<=", filters.date_to);
  const [findingsResult] = await findingsQuery.count("* as count");

  // Open findings
  const [openFindingsResult] = await db("issues")
    .whereNotNull("audit_id")
    .whereNot("status", "closed")
    .count("* as count");

  return {
    totalAudits: Number(totalResult?.count || 0),
    inProgress: Number(inProgressResult?.count || 0),
    closed: Number(closedResult?.count || 0),
    overdue: Number(overdueResult?.count || 0),
    avgComplianceScore: avgScoreResult?.avg ? Number(Number(avgScoreResult.avg).toFixed(1)) : null,
    totalFindings: Number(findingsResult?.count || 0),
    openFindings: Number(openFindingsResult?.count || 0),
  };
}

export async function getByStatus(filters: AuditDashboardFilters) {
  const query = applyFilters(db("audits"), filters)
    .select("status")
    .count("* as count")
    .groupBy("status");

  return query;
}

export async function getByType(filters: AuditDashboardFilters) {
  const query = applyFilters(db("audits"), filters)
    .select("audit_types.name as type_name", "audit_types.color as type_color")
    .count("* as count")
    .leftJoin("audit_types", "audits.audit_type_id", "audit_types.id")
    .groupBy("audit_types.name", "audit_types.color");

  return query;
}

export async function getCompletionTrend(filters: AuditDashboardFilters) {
  const query = applyFilters(db("audits").where("status", "closed"), filters)
    .select(
      db.raw("TO_CHAR(completed_at, 'YYYY-MM') as month"),
      db.raw("COUNT(*)::int as count"),
      db.raw("AVG(compliance_score)::numeric(5,1) as avg_score")
    )
    .whereNotNull("completed_at")
    .groupByRaw("TO_CHAR(completed_at, 'YYYY-MM')")
    .orderByRaw("TO_CHAR(completed_at, 'YYYY-MM') ASC");

  return query;
}

export async function getFindingsBySeverity(filters: AuditDashboardFilters) {
  const query = db("issues")
    .select("finding_severity as severity")
    .count("* as count")
    .whereNotNull("audit_id")
    .whereNotNull("finding_severity")
    .groupBy("finding_severity");

  if (filters.date_from) query.where("issues.created_at", ">=", filters.date_from);
  if (filters.date_to) query.where("issues.created_at", "<=", filters.date_to);

  return query;
}

export async function getRiskDistribution(filters: AuditDashboardFilters) {
  const query = applyFilters(db("audits"), filters)
    .select("risk_level")
    .count("* as count")
    .whereNotNull("risk_level")
    .groupBy("risk_level");

  return query;
}
