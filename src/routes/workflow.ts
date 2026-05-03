import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as workflowService from "../services/workflowService";
import * as auditLogService from "../services/auditService";
import type { AuditContext } from "../services/auditService";
import db from "../db";

const router = Router();

router.use(authenticate);

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName:
      req.userRecord?.full_name ||
      req.userRecord?.name ||
      req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

const transitionSchema = z.object({
  target_stage_id: z.string().uuid("Invalid target stage ID"),
});

const assignSchema = z.object({
  user_id: z.string().uuid("Invalid user ID").nullable(),
});

// ── Status sync maps ─────────────────────────────────────────────────────────

const RISK_STATUS_MAP: Record<string, string> = {
  "Identified":       "identified",
  "Under Assessment": "under_assessment",
  "Assessed":         "assessed",
  "In Treatment":     "in_treatment",
  "Monitoring":       "monitoring",
  "Under Review":     "under_review",
  "Accepted":         "accepted",
  "Closed":           "closed",
};

const AUDIT_STATUS_MAP: Record<string, string> = {
  "Draft":        "draft",
  "Scheduled":    "scheduled",
  "Planning":     "planning",
  "In Progress":  "in_progress",
  "Under Review": "under_review",
  "Closed":       "closed",
};

// ── Kanban ───────────────────────────────────────────────────────────────────

router.get("/kanban", async (req, res) => {
  const filters = {
    assignee_id: req.query.assignee_id as string | undefined,
    priority: req.query.priority as string | undefined,
    search: req.query.search as string | undefined,
  };
  const data = await workflowService.getKanbanData(filters);
  res.json(data);
});

// ── Issue workflow ───────────────────────────────────────────────────────────

router.get("/issues/:id", async (req, res) => {
  const workflow = await workflowService.getIssueWorkflow(req.params.id as string);
  res.json(workflow);
});

router.post("/issues/:id/transition", validate(transitionSchema), async (req, res) => {
  const result = await workflowService.transitionIssue(
    req.params.id as string,
    req.body.target_stage_id,
    getAuditCtx(req)
  );
  res.json(result);
});

router.patch("/issues/:id/stages/:stageId/assign", validate(assignSchema), async (req, res) => {
  const result = await workflowService.assignStageUser(
    req.params.id as string,
    req.params.stageId as string,
    req.body.user_id,
    getAuditCtx(req)
  );
  res.json(result);
});

router.post("/issues/:id/stages/:stageId/complete", async (req, res) => {
  const result = await workflowService.completeStageAssignment(
    req.params.id as string,
    req.params.stageId as string,
    getAuditCtx(req)
  );
  res.json(result);
});

// ── Risk workflow ────────────────────────────────────────────────────────────

router.get("/risk-stages", async (_req, res) => {
  const stages = await db("risk_workflow_stages").orderBy("position", "asc");
  res.json({ stages });
});

router.post("/risks/:id/transition", validate(transitionSchema), async (req: any, res, next) => {
  try {
    const risk = await db("risks").where({ id: req.params.id }).first();
    if (!risk) { res.status(404).json({ error: "Risk not found" }); return; }

    const targetStage = await db("risk_workflow_stages").where({ id: req.body.target_stage_id }).first();
    if (!targetStage) { res.status(404).json({ error: "Target stage not found" }); return; }

    const oldStageId = risk.current_stage_id;
    const newStatus = RISK_STATUS_MAP[targetStage.name] || risk.status;

    await db("risks").where({ id: req.params.id }).update({
      current_stage_id: targetStage.id,
      status: newStatus,
      updated_at: new Date(),
    });

    await auditLogService.logChange(
      { tableName: "risks", recordId: req.params.id, fieldName: "current_stage_id", oldValue: oldStageId, newValue: targetStage.id, changeType: "UPDATE" },
      getAuditCtx(req)
    );

    res.json({ riskId: req.params.id, currentStageId: targetStage.id, status: newStatus });
  } catch (err) { next(err); }
});

// ── Audit workflow ───────────────────────────────────────────────────────────

router.get("/audit-stages", async (_req, res) => {
  const stages = await db("audit_workflow_stages").orderBy("position", "asc");
  res.json({ stages });
});

router.post("/audits/:id/transition", validate(transitionSchema), async (req: any, res, next) => {
  try {
    const audit = await db("audits").where({ id: req.params.id }).first();
    if (!audit) { res.status(404).json({ error: "Audit not found" }); return; }

    const targetStage = await db("audit_workflow_stages").where({ id: req.body.target_stage_id }).first();
    if (!targetStage) { res.status(404).json({ error: "Target stage not found" }); return; }

    const oldStageId = audit.current_stage_id;
    const newStatus = AUDIT_STATUS_MAP[targetStage.name] || audit.status;

    await db("audits").where({ id: req.params.id }).update({
      current_stage_id: targetStage.id,
      status: newStatus,
      updated_at: new Date(),
    });

    await auditLogService.logChange(
      { tableName: "audits", recordId: req.params.id, fieldName: "current_stage_id", oldValue: oldStageId, newValue: targetStage.id, changeType: "UPDATE" },
      getAuditCtx(req)
    );

    res.json({ auditId: req.params.id, currentStageId: targetStage.id, status: newStatus });
  } catch (err) { next(err); }
});

export default router;
