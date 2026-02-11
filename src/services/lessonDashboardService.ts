import db from "../db";

const CLOSED_STATUSES = ["archived", "closed"];

export async function getKPIs() {
  const total = await db("lessons").count("id as cnt").first();
  const open = await db("lessons").whereNotIn("status", CLOSED_STATUSES).count("id as cnt").first();
  const highCritical = await db("lessons")
    .whereNotIn("status", CLOSED_STATUSES)
    .whereIn("impact_level", ["high", "critical"])
    .count("id as cnt")
    .first();

  const implemented = await db("lessons")
    .where("status", "implemented")
    .count("id as cnt")
    .first();

  const effective = await db("lessons")
    .whereIn("effectiveness_rating", ["effective", "highly_effective"])
    .count("id as cnt")
    .first();

  return {
    total: Number(total?.cnt || 0),
    open: Number(open?.cnt || 0),
    high_critical: Number(highCritical?.cnt || 0),
    implemented: Number(implemented?.cnt || 0),
    effective: Number(effective?.cnt || 0),
  };
}

export async function getByType() {
  return db("lessons")
    .select("lesson_type as type")
    .count("id as count")
    .groupBy("lesson_type")
    .orderBy("count", "desc");
}

export async function getByCategory() {
  return db("lessons")
    .select("category")
    .count("id as count")
    .whereNotNull("category")
    .groupBy("category")
    .orderBy("count", "desc");
}

export async function getByImpact() {
  return db("lessons")
    .select("impact_level")
    .count("id as count")
    .whereNotNull("impact_level")
    .groupBy("impact_level")
    .orderBy("count", "desc");
}

export async function getByStatus() {
  return db("lessons")
    .select("status")
    .count("id as count")
    .groupBy("status")
    .orderBy("count", "desc");
}

export async function getByEffectiveness() {
  return db("lessons")
    .select("effectiveness_rating")
    .count("id as count")
    .whereNotNull("effectiveness_rating")
    .where("effectiveness_rating", "!=", "not_rated")
    .groupBy("effectiveness_rating")
    .orderBy("count", "desc");
}

export async function getTrend() {
  const created = await db("lessons")
    .select(db.raw("to_char(created_at, 'YYYY-MM') as month"))
    .count("id as count")
    .groupBy(db.raw("to_char(created_at, 'YYYY-MM')"))
    .orderBy("month", "asc");

  const closed = await db("lessons")
    .select(db.raw("to_char(closure_date, 'YYYY-MM') as month"))
    .count("id as count")
    .whereNotNull("closure_date")
    .groupBy(db.raw("to_char(closure_date, 'YYYY-MM')"))
    .orderBy("month", "asc");

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
