import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as risksService from "../services/risksService";
import type { AuditContext } from "../services/auditService";

const router = Router();

router.use(authenticate);

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName: req.userRecord?.full_name || req.userRecord?.name || req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  source: z.string().max(255).optional(),
  inherent_likelihood: z.number().int().min(1).max(5).nullable().optional(),
  inherent_impact: z.number().int().min(1).max(5).nullable().optional(),
  residual_likelihood: z.number().int().min(1).max(5).nullable().optional(),
  residual_impact: z.number().int().min(1).max(5).nullable().optional(),
  target_likelihood: z.number().int().min(1).max(5).nullable().optional(),
  target_impact: z.number().int().min(1).max(5).nullable().optional(),
  velocity: z.enum(["slow", "moderate", "fast", "very_fast"]).nullable().optional(),
  treatment_strategy: z.enum(["avoid", "mitigate", "transfer", "accept"]).nullable().optional(),
  treatment_plan: z.string().optional(),
  risk_appetite: z.string().max(50).optional(),
  owner_id: z.string().uuid().nullable().optional(),
  reviewer_id: z.string().uuid().nullable().optional(),
  identified_date: z.string().optional().nullable(),
  next_review_date: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum([
    "draft", "identified", "under_assessment", "assessed",
    "in_treatment", "monitoring", "under_review", "accepted", "closed",
  ]).optional(),
  closed_date: z.string().optional().nullable(),
});

// --- CRUD ---

router.get("/", async (req: any, res, next) => {
  try {
    const result = await risksService.listRisks({
      status: req.query.status as string,
      category_id: req.query.category_id as string,
      level: req.query.level as string,
      residual_likelihood: req.query.residual_likelihood ? Number(req.query.residual_likelihood) : undefined,
      residual_impact: req.query.residual_impact ? Number(req.query.residual_impact) : undefined,
      owner_id: req.query.owner_id as string,
      treatment_strategy: req.query.treatment_strategy as string,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort_by: req.query.sort_by as string,
      sort_dir: req.query.sort_dir as "asc" | "desc" | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Kanban board
router.get("/kanban", async (req: any, res, next) => {
  try {
    const columns = await risksService.getRiskKanbanData({
      search: req.query.search as string,
    });
    res.json({ columns });
  } catch (err) {
    next(err);
  }
});

router.post("/kanban/:id/transition", async (req: any, res, next) => {
  try {
    const risk = await risksService.updateRisk(
      req.params.id as string,
      { status: req.body.status },
      getAuditCtx(req)
    );
    res.json({ risk });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: any, res, next) => {
  try {
    const risk = await risksService.getRisk(req.params.id as string);
    res.json({ risk });
  } catch (err) {
    next(err);
  }
});

router.post("/", validate(createSchema), async (req: any, res, next) => {
  try {
    const risk = await risksService.createRisk(req.body, getAuditCtx(req));
    res.status(201).json({ risk });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validate(updateSchema), async (req: any, res, next) => {
  try {
    const risk = await risksService.updateRisk(req.params.id as string, req.body, getAuditCtx(req));
    res.json({ risk });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: any, res, next) => {
  try {
    await risksService.deleteRisk(req.params.id as string, getAuditCtx(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Assessments ---

const assessmentSchema = z.object({
  assessment_date: z.string().min(1),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  rationale: z.string().optional(),
  assessment_type: z.enum(["inherent", "residual", "target"]).optional(),
});

router.get("/:id/assessments", async (req: any, res, next) => {
  try {
    const assessments = await risksService.listAssessments(req.params.id as string);
    res.json({ assessments });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/assessments", validate(assessmentSchema), async (req: any, res, next) => {
  try {
    const assessment = await risksService.addAssessment(req.params.id as string, req.body, getAuditCtx(req));
    res.status(201).json({ assessment });
  } catch (err) {
    next(err);
  }
});

// --- Mitigations ---

const mitigationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  mitigation_type: z.enum(["preventive", "detective", "corrective", "directive"]).optional(),
  status: z.enum(["planned", "in_progress", "implemented", "verified", "ineffective"]).optional(),
  owner_id: z.string().uuid().nullable().optional(),
  due_date: z.string().optional().nullable(),
  cost_estimate: z.number().nullable().optional(),
  notes: z.string().optional(),
});

const mitigationUpdateSchema = mitigationSchema.partial().extend({
  effectiveness: z.enum(["not_tested", "effective", "partially_effective", "ineffective"]).optional(),
  completed_date: z.string().optional().nullable(),
});

router.get("/:id/mitigations", async (req: any, res, next) => {
  try {
    const mitigations = await risksService.listMitigations(req.params.id as string);
    res.json({ mitigations });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/mitigations", validate(mitigationSchema), async (req: any, res, next) => {
  try {
    const mitigation = await risksService.addMitigation(req.params.id as string, req.body, getAuditCtx(req));
    res.status(201).json({ mitigation });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/mitigations/:mid", validate(mitigationUpdateSchema), async (req: any, res, next) => {
  try {
    const mitigation = await risksService.updateMitigation(req.params.mid as string, req.body);
    res.json({ mitigation });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/mitigations/:mid", async (req: any, res, next) => {
  try {
    await risksService.deleteMitigation(req.params.mid as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Linked Issues ---

router.get("/:id/issues", async (req: any, res, next) => {
  try {
    const issues = await risksService.getLinkedIssues(req.params.id as string);
    res.json({ issues });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/issues/:issueId", async (req: any, res, next) => {
  try {
    const relationship = req.body?.relationship || "related";
    await risksService.linkIssue(req.params.id as string, req.params.issueId as string, relationship);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/issues/:issueId", async (req: any, res, next) => {
  try {
    await risksService.unlinkIssue(req.params.id as string, req.params.issueId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Linked Audits ---

router.get("/:id/audits", async (req: any, res, next) => {
  try {
    const audits = await risksService.getLinkedAudits(req.params.id as string);
    res.json({ audits });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/audits/:auditId", async (req: any, res, next) => {
  try {
    const relationship = req.body?.relationship || "related";
    await risksService.linkAudit(req.params.id as string, req.params.auditId as string, relationship);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/audits/:auditId", async (req: any, res, next) => {
  try {
    await risksService.unlinkAudit(req.params.id as string, req.params.auditId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
