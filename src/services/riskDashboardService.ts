import db from "../db";

const CLOSED_STATUSES = ["accepted", "closed"];

export async function getKPIs() {
  const total = await db("risks").count("id as cnt").first();
  const open = await db("risks").whereNotIn("status", CLOSED_STATUSES).count("id as cnt").first();
  const highExtreme = await db("risks")
    .whereNotIn("status", CLOSED_STATUSES)
    .whereIn("residual_level", ["high", "extreme"])
    .count("id as cnt")
    .first();

  const avgScore = await db("risks")
    .whereNotIn("status", CLOSED_STATUSES)
    .whereNotNull("residual_score")
    .avg("residual_score as avg")
    .first();

  const overdueReviews = await db("risks")
    .whereNotIn("status", CLOSED_STATUSES)
    .whereNotNull("next_review_date")
    .where("next_review_date", "<", db.fn.now())
    .count("id as cnt")
    .first();

  return {
    total: Number(total?.cnt || 0),
    open: Number(open?.cnt || 0),
    high_extreme: Number(highExtreme?.cnt || 0),
    avg_residual_score: avgScore?.avg ? Math.round(Number(avgScore.avg) * 10) / 10 : 0,
    overdue_reviews: Number(overdueReviews?.cnt || 0),
  };
}

export async function getHeatMapData() {
  const rows = await db("risks")
    .select("residual_likelihood as likelihood", "residual_impact as impact")
    .count("id as count")
    .whereNotIn("status", CLOSED_STATUSES)
    .whereNotNull("residual_likelihood")
    .whereNotNull("residual_impact")
    .groupBy("residual_likelihood", "residual_impact");

  // Build 5x5 grid
  const grid: Record<string, number> = {};
  for (let l = 1; l <= 5; l++) {
    for (let i = 1; i <= 5; i++) {
      grid[`${l}-${i}`] = 0;
    }
  }
  for (const row of rows) {
    grid[`${row.likelihood}-${row.impact}`] = Number(row.count);
  }

  return grid;
}

export async function getByCategory() {
  return db("risks")
    .select("risk_categories.name as category", "risk_categories.color")
    .count("risks.id as count")
    .leftJoin("risk_categories", "risks.category_id", "risk_categories.id")
    .whereNotIn("risks.status", CLOSED_STATUSES)
    .groupBy("risk_categories.name", "risk_categories.color")
    .orderBy("count", "desc");
}

export async function getByStatus() {
  return db("risks")
    .select("status")
    .count("id as count")
    .groupBy("status")
    .orderBy("count", "desc");
}

export async function getTrend() {
  const created = await db("risks")
    .select(db.raw("to_char(created_at, 'YYYY-MM') as month"))
    .count("id as count")
    .groupBy(db.raw("to_char(created_at, 'YYYY-MM')"))
    .orderBy("month", "asc");

  const closed = await db("risks")
    .select(db.raw("to_char(closed_date, 'YYYY-MM') as month"))
    .count("id as count")
    .whereNotNull("closed_date")
    .groupBy(db.raw("to_char(closed_date, 'YYYY-MM')"))
    .orderBy("month", "asc");

  // Merge into single timeline
  const months = new Set<string>();
  created.forEach((r: any) => months.add(r.month));
  closed.forEach((r: any) => months.add(r.month));

  const createdMap = Object.fromEntries(created.map((r: any) => [r.month, Number(r.count)]));
  const closedMap = Object.fromEntries(closed.map((r: any) => [r.month, Number(r.count)]));

  return Array.from(months)
    .sort()
    .map((month) => ({
      month,
      created: createdMap[month] || 0,
      closed: closedMap[month] || 0,
    }));
}

export async function getByTreatment() {
  return db("risks")
    .select("treatment_strategy")
    .count("id as count")
    .whereNotIn("status", CLOSED_STATUSES)
    .whereNotNull("treatment_strategy")
    .groupBy("treatment_strategy")
    .orderBy("count", "desc");
}
