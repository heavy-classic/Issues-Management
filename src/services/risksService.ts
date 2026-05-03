import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export function calculateLevel(score: number): "low" | "medium" | "high" | "extreme" {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 16) return "high";
  return "extreme";
}

function calcScoreAndLevel(likelihood: number | null, impact: number | null) {
  if (likelihood && impact) {
    const score = likelihood * impact;
    return { score, level: calculateLevel(score) };
  }
  return { score: null, level: null };
}

interface ListRisksFilters {
  status?: string;
  category_id?: string;
  level?: string;
  owner_id?: string;
  treatment_strategy?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

const RISK_SORT_COLUMNS: Record<string, string> = {
  risk_number: "risks.risk_number",
  title: "risks.title",
  status: "risks.status",
  category: "risk_categories.name",
  owner: "owner.full_name",
  residual_score: "risks.residual_score",
  residual_level: "risks.residual_level",
  inherent_score: "risks.inherent_score",
  velocity: "risks.velocity",
  treatment_strategy: "risks.treatment_strategy",
  next_review_date: "risks.next_review_date",
  created_at: "risks.created_at",
};

async function generateRiskNumber(): Promise<string> {
  const [result] = await db.raw("SELECT nextval('risk_number_seq') as seq");
  const seq = String(result.seq).padStart(4, "0");
  return `RSK-${seq}`;
}

export async function listRisks(filters: ListRisksFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const sortCol = RISK_SORT_COLUMNS[filters.sort_by || ""] || "risks.created_at";
  const sortDir = filters.sort_dir === "asc" ? "asc" : "desc";

  const baseQuery = db("risks")
    .leftJoin("risk_categories", "risks.category_id", "risk_categories.id")
    .leftJoin("users as owner", "risks.owner_id", "owner.id")
    .leftJoin("users as creator", "risks.created_by", "creator.id");

  if (filters.status) baseQuery.where("risks.status", filters.status);
  if (filters.category_id) baseQuery.where("risks.category_id", filters.category_id);
  if (filters.level) baseQuery.where("risks.residual_level", filters.level);
  if (filters.owner_id) baseQuery.where("risks.owner_id", filters.owner_id);
  if (filters.treatment_strategy) baseQuery.where("risks.treatment_strategy", filters.treatment_strategy);
  if (filters.search) {
    baseQuery.where(function () {
      this.whereILike("risks.title", `%${filters.search}%`)
        .orWhereILike("risks.risk_number", `%${filters.search}%`)
        .orWhereILike("risks.description", `%${filters.search}%`);
    });
  }

  const countResult = await baseQuery.clone().count("risks.id as count").first();
  const total = Number(countResult?.count || 0);

  const risks = await baseQuery
    .clone()
    .select(
      "risks.*",
      "risk_categories.name as category_name",
      "risk_categories.color as category_color",
      "risk_categories.icon as category_icon",
      "owner.full_name as owner_name",
      "owner.email as owner_email",
      "creator.full_name as creator_name",
      db.raw("(SELECT COUNT(*) FROM risk_mitigations WHERE risk_id = risks.id)::int as mitigation_count"),
      db.raw("(SELECT COUNT(*) FROM risk_issues WHERE risk_id = risks.id)::int as linked_issues_count")
    )
    .orderBy(sortCol, sortDir)
    .limit(limit)
    .offset((page - 1) * limit);

  return { risks, total, page, limit };
}

export async function getRisk(id: string) {
  const risk = await db("risks")
    .select(
      "risks.*",
      "risk_categories.name as category_name",
      "risk_categories.color as category_color",
      "risk_categories.icon as category_icon",
      "owner.full_name as owner_name",
      "owner.email as owner_email",
      "reviewer.full_name as reviewer_name",
      "reviewer.email as reviewer_email",
      "creator.full_name as creator_name",
      "creator.email as creator_email"
    )
    .leftJoin("risk_categories", "risks.category_id", "risk_categories.id")
    .leftJoin("users as owner", "risks.owner_id", "owner.id")
    .leftJoin("users as reviewer", "risks.reviewer_id", "reviewer.id")
    .leftJoin("users as creator", "risks.created_by", "creator.id")
    .where("risks.id", id)
    .first();

  if (!risk) throw new AppError(404, "Risk not found");
  return risk;
}

interface CreateRiskParams {
  title: string;
  description?: string;
  category_id?: string | null;
  source?: string;
  inherent_likelihood?: number | null;
  inherent_impact?: number | null;
  residual_likelihood?: number | null;
  residual_impact?: number | null;
  target_likelihood?: number | null;
  target_impact?: number | null;
  velocity?: string | null;
  treatment_strategy?: string | null;
  treatment_plan?: string;
  risk_appetite?: string;
  owner_id?: string | null;
  reviewer_id?: string | null;
  identified_date?: string | null;
  next_review_date?: string | null;
  tags?: string[];
}

export async function createRisk(data: CreateRiskParams, ctx: AuditContext) {
  const riskNumber = await generateRiskNumber();

  const inherent = calcScoreAndLevel(data.inherent_likelihood ?? null, data.inherent_impact ?? null);
  const residual = calcScoreAndLevel(data.residual_likelihood ?? null, data.residual_impact ?? null);
  const target = calcScoreAndLevel(data.target_likelihood ?? null, data.target_impact ?? null);

  // Set initial stage to "Identified" (first stage, position 0)
  const firstStage = await db("risk_workflow_stages").orderBy("position", "asc").first();

  const [risk] = await db("risks")
    .insert({
      risk_number: riskNumber,
      title: data.title,
      description: data.description || null,
      category_id: data.category_id || null,
      source: data.source || null,
      status: "identified",
      current_stage_id: firstStage?.id || null,
      inherent_likelihood: data.inherent_likelihood || null,
      inherent_impact: data.inherent_impact || null,
      inherent_score: inherent.score,
      inherent_level: inherent.level,
      residual_likelihood: data.residual_likelihood || null,
      residual_impact: data.residual_impact || null,
      residual_score: residual.score,
      residual_level: residual.level,
      target_likelihood: data.target_likelihood || null,
      target_impact: data.target_impact || null,
      target_score: target.score,
      target_level: target.level,
      velocity: data.velocity || null,
      treatment_strategy: data.treatment_strategy || null,
      treatment_plan: data.treatment_plan || null,
      risk_appetite: data.risk_appetite || null,
      owner_id: data.owner_id || null,
      reviewer_id: data.reviewer_id || null,
      identified_date: data.identified_date || null,
      next_review_date: data.next_review_date || null,
      tags: data.tags || null,
      created_by: ctx.userId,
    })
    .returning("*");

  await auditService.logChange(
    { tableName: "risks", recordId: risk.id, changeType: "INSERT", newValue: risk },
    ctx
  );

  return risk;
}

interface UpdateRiskParams {
  title?: string;
  description?: string;
  category_id?: string | null;
  source?: string;
  status?: string;
  inherent_likelihood?: number | null;
  inherent_impact?: number | null;
  residual_likelihood?: number | null;
  residual_impact?: number | null;
  target_likelihood?: number | null;
  target_impact?: number | null;
  velocity?: string | null;
  treatment_strategy?: string | null;
  treatment_plan?: string;
  risk_appetite?: string;
  owner_id?: string | null;
  reviewer_id?: string | null;
  identified_date?: string | null;
  next_review_date?: string | null;
  closed_date?: string | null;
  tags?: string[];
}

export async function updateRisk(id: string, data: UpdateRiskParams, ctx: AuditContext) {
  const existing = await db("risks").where({ id }).first();
  if (!existing) throw new AppError(404, "Risk not found");

  const il = data.inherent_likelihood ?? existing.inherent_likelihood;
  const ii = data.inherent_impact ?? existing.inherent_impact;
  const rl = data.residual_likelihood ?? existing.residual_likelihood;
  const ri = data.residual_impact ?? existing.residual_impact;
  const tl = data.target_likelihood ?? existing.target_likelihood;
  const ti = data.target_impact ?? existing.target_impact;

  const inherent = calcScoreAndLevel(il, ii);
  const residual = calcScoreAndLevel(rl, ri);
  const target = calcScoreAndLevel(tl, ti);

  const updateData: Record<string, any> = {
    ...data,
    inherent_score: inherent.score,
    inherent_level: inherent.level,
    residual_score: residual.score,
    residual_level: residual.level,
    target_score: target.score,
    target_level: target.level,
    updated_at: db.fn.now(),
  };

  const [risk] = await db("risks").where({ id }).update(updateData).returning("*");

  await auditService.logChange(
    { tableName: "risks", recordId: id, changeType: "UPDATE", oldValue: existing, newValue: risk },
    ctx
  );

  return risk;
}

export async function deleteRisk(id: string, ctx: AuditContext) {
  const existing = await db("risks").where({ id }).first();
  if (!existing) throw new AppError(404, "Risk not found");

  await db("risks").where({ id }).del();

  await auditService.logChange(
    { tableName: "risks", recordId: id, changeType: "DELETE", oldValue: existing },
    ctx
  );
}

// --- Assessments ---

export async function listAssessments(riskId: string) {
  return db("risk_assessments")
    .select("risk_assessments.*", "users.full_name as assessor_name", "users.email as assessor_email")
    .leftJoin("users", "risk_assessments.assessor_id", "users.id")
    .where({ risk_id: riskId })
    .orderBy("assessment_date", "desc");
}

export async function addAssessment(riskId: string, data: {
  assessment_date: string;
  likelihood: number;
  impact: number;
  rationale?: string;
  assessment_type?: string;
}, ctx: AuditContext) {
  const risk = await db("risks").where({ id: riskId }).first();
  if (!risk) throw new AppError(404, "Risk not found");

  const score = data.likelihood * data.impact;
  const level = calculateLevel(score);

  const [assessment] = await db("risk_assessments")
    .insert({
      risk_id: riskId,
      assessment_date: data.assessment_date,
      assessor_id: ctx.userId,
      likelihood: data.likelihood,
      impact: data.impact,
      score,
      level,
      rationale: data.rationale || null,
      assessment_type: data.assessment_type || "residual",
    })
    .returning("*");

  // Auto-update risk scores based on assessment type
  const type = data.assessment_type || "residual";
  if (type === "inherent") {
    await db("risks").where({ id: riskId }).update({
      inherent_likelihood: data.likelihood,
      inherent_impact: data.impact,
      inherent_score: score,
      inherent_level: level,
      updated_at: db.fn.now(),
    });
  } else if (type === "residual") {
    await db("risks").where({ id: riskId }).update({
      residual_likelihood: data.likelihood,
      residual_impact: data.impact,
      residual_score: score,
      residual_level: level,
      updated_at: db.fn.now(),
    });
  } else if (type === "target") {
    await db("risks").where({ id: riskId }).update({
      target_likelihood: data.likelihood,
      target_impact: data.impact,
      target_score: score,
      target_level: level,
      updated_at: db.fn.now(),
    });
  }

  return assessment;
}

// --- Mitigations ---

export async function listMitigations(riskId: string) {
  return db("risk_mitigations")
    .select("risk_mitigations.*", "users.full_name as owner_name", "users.email as owner_email")
    .leftJoin("users", "risk_mitigations.owner_id", "users.id")
    .where({ risk_id: riskId })
    .orderBy("created_at", "desc");
}

export async function addMitigation(riskId: string, data: {
  title: string;
  description?: string;
  mitigation_type?: string;
  status?: string;
  owner_id?: string | null;
  due_date?: string | null;
  cost_estimate?: number | null;
  notes?: string;
}, ctx: AuditContext) {
  const risk = await db("risks").where({ id: riskId }).first();
  if (!risk) throw new AppError(404, "Risk not found");

  const [mitigation] = await db("risk_mitigations")
    .insert({
      risk_id: riskId,
      title: data.title,
      description: data.description || null,
      mitigation_type: data.mitigation_type || null,
      status: data.status || "planned",
      owner_id: data.owner_id || null,
      due_date: data.due_date || null,
      cost_estimate: data.cost_estimate ?? null,
      notes: data.notes || null,
      created_by: ctx.userId,
    })
    .returning("*");

  return mitigation;
}

export async function updateMitigation(mitigationId: string, data: {
  title?: string;
  description?: string;
  mitigation_type?: string;
  status?: string;
  effectiveness?: string;
  owner_id?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  cost_estimate?: number | null;
  notes?: string;
}) {
  const [mitigation] = await db("risk_mitigations")
    .where({ id: mitigationId })
    .update({ ...data, updated_at: db.fn.now() })
    .returning("*");
  if (!mitigation) throw new AppError(404, "Mitigation not found");
  return mitigation;
}

export async function deleteMitigation(mitigationId: string) {
  const deleted = await db("risk_mitigations").where({ id: mitigationId }).del();
  if (!deleted) throw new AppError(404, "Mitigation not found");
}

// --- Linked Issues ---

export async function getLinkedIssues(riskId: string) {
  return db("risk_issues")
    .select(
      "risk_issues.relationship",
      "risk_issues.created_at as linked_at",
      "issues.id",
      "issues.title",
      "issues.status",
      "issues.priority",
      "issues.issue_number"
    )
    .join("issues", "risk_issues.issue_id", "issues.id")
    .where("risk_issues.risk_id", riskId);
}

export async function linkIssue(riskId: string, issueId: string, relationship: string = "related") {
  const exists = await db("risk_issues").where({ risk_id: riskId, issue_id: issueId }).first();
  if (exists) throw new AppError(400, "Issue already linked");

  await db("risk_issues").insert({ risk_id: riskId, issue_id: issueId, relationship });
}

export async function unlinkIssue(riskId: string, issueId: string) {
  const deleted = await db("risk_issues").where({ risk_id: riskId, issue_id: issueId }).del();
  if (!deleted) throw new AppError(404, "Link not found");
}

// --- Linked Audits ---

export async function getLinkedAudits(riskId: string) {
  return db("risk_audits")
    .select(
      "risk_audits.relationship",
      "risk_audits.created_at as linked_at",
      "audits.id",
      "audits.title",
      "audits.status",
      "audits.audit_number"
    )
    .join("audits", "risk_audits.audit_id", "audits.id")
    .where("risk_audits.risk_id", riskId);
}

export async function linkAudit(riskId: string, auditId: string, relationship: string = "related") {
  const exists = await db("risk_audits").where({ risk_id: riskId, audit_id: auditId }).first();
  if (exists) throw new AppError(400, "Audit already linked");

  await db("risk_audits").insert({ risk_id: riskId, audit_id: auditId, relationship });
}

export async function unlinkAudit(riskId: string, auditId: string) {
  const deleted = await db("risk_audits").where({ risk_id: riskId, audit_id: auditId }).del();
  if (!deleted) throw new AppError(404, "Link not found");
}

// ── Kanban ────────────────────────────────────────────────

const RISK_STATUSES = [
  "draft", "identified", "under_assessment", "assessed",
  "in_treatment", "monitoring", "under_review", "accepted", "closed",
];

const RISK_STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af", identified: "#3b82f6", under_assessment: "#8b5cf6",
  assessed: "#06b6d4", in_treatment: "#f59e0b", monitoring: "#10b981",
  under_review: "#f97316", accepted: "#059669", closed: "#6b7280",
};

export async function getRiskKanbanData(filters: { search?: string }) {
  const query = db("risks")
    .select(
      "risks.id", "risks.risk_number", "risks.title", "risks.status",
      "risks.residual_score", "risks.residual_level",
      "risk_categories.name as category_name", "risk_categories.color as category_color",
      "owner.full_name as owner_name", "owner.email as owner_email"
    )
    .leftJoin("risk_categories", "risks.category_id", "risk_categories.id")
    .leftJoin("users as owner", "risks.owner_id", "owner.id");

  if (filters.search) {
    query.where(function () {
      this.whereILike("risks.title", `%${filters.search}%`)
        .orWhereILike("risks.risk_number", `%${filters.search}%`);
    });
  }

  const risks = await query;

  return RISK_STATUSES.map((status) => ({
    status,
    label: status.replace(/_/g, " "),
    color: RISK_STATUS_COLORS[status] || "#9ca3af",
    risks: risks.filter((r: any) => r.status === status),
  }));
}
