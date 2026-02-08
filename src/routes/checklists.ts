import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as checklistsService from "../services/checklistsService";
import type { AuditContext } from "../services/auditService";

const router = Router();

router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(255),
  position: z.number().int().min(0).optional(),
});

const criterionSchema = z.object({
  criterion_id_display: z.string().max(20).optional(),
  text: z.string().min(1, "Criterion text is required"),
  reference_citation: z.string().optional(),
  answer_type: z.enum(["yes_no", "yes_no_na", "compliant", "rating_scale", "expectations"]).optional(),
  risk_rating: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  weight: z.number().min(0).max(100).optional(),
  required_evidence: z.record(z.string(), z.unknown()).nullable().optional(),
  comments_enabled: z.boolean().optional(),
  attachments_allowed: z.boolean().optional(),
  finding_creation_enabled: z.boolean().optional(),
  help_text: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string().uuid()),
});

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName: req.userRecord?.full_name || req.userRecord?.name || req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

// List checklists
router.get("/", async (req, res) => {
  const checklists = await checklistsService.listChecklists({
    status: req.query.status as string | undefined,
  });
  res.json({ checklists });
});

// Get checklist with groups + criteria
router.get("/:id", async (req, res) => {
  const checklist = await checklistsService.getChecklist(req.params.id as string);
  res.json({ checklist });
});

// Create checklist — admin only
router.post("/", authorize("admin"), validate(createSchema), async (req, res) => {
  const checklist = await checklistsService.createChecklist(
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ checklist });
});

// Update checklist — admin only
router.patch("/:id", authorize("admin"), validate(updateSchema), async (req, res) => {
  const checklist = await checklistsService.updateChecklist(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ checklist });
});

// Delete checklist — admin only
router.delete("/:id", authorize("admin"), async (req, res) => {
  await checklistsService.deleteChecklist(req.params.id as string, getAuditCtx(req));
  res.json({ message: "Checklist deleted" });
});

// Clone checklist — admin only
router.post("/:id/clone", authorize("admin"), async (req, res) => {
  const checklist = await checklistsService.cloneChecklist(
    req.params.id as string,
    req.user!.userId,
    getAuditCtx(req)
  );
  res.status(201).json({ checklist });
});

// ── Groups ─────────────────────────────────────────────────

router.post("/:id/groups", authorize("admin"), validate(groupSchema), async (req, res) => {
  const group = await checklistsService.addGroup(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ group });
});

router.put("/:id/groups/reorder", authorize("admin"), validate(reorderSchema), async (req, res) => {
  await checklistsService.reorderGroups(req.params.id as string, req.body.ids, getAuditCtx(req));
  res.json({ message: "Groups reordered" });
});

// ── Criteria ───────────────────────────────────────────────

router.post("/groups/:groupId/criteria", authorize("admin"), validate(criterionSchema), async (req, res) => {
  const criterion = await checklistsService.addCriterion(
    req.params.groupId as string,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ criterion });
});

router.put("/groups/:groupId/criteria/reorder", authorize("admin"), validate(reorderSchema), async (req, res) => {
  await checklistsService.reorderCriteria(req.params.groupId as string, req.body.ids, getAuditCtx(req));
  res.json({ message: "Criteria reordered" });
});

// Group update/delete (using group ID directly)
router.patch("/groups/:groupId", authorize("admin"), validate(groupSchema.partial()), async (req, res) => {
  const group = await checklistsService.updateGroup(
    req.params.groupId as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ group });
});

router.delete("/groups/:groupId", authorize("admin"), async (req, res) => {
  await checklistsService.deleteGroup(req.params.groupId as string, getAuditCtx(req));
  res.json({ message: "Group deleted" });
});

// Criterion update/delete (using criterion ID directly)
router.patch("/criteria/:criterionId", authorize("admin"), validate(criterionSchema.partial()), async (req, res) => {
  const criterion = await checklistsService.updateCriterion(
    req.params.criterionId as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ criterion });
});

router.delete("/criteria/:criterionId", authorize("admin"), async (req, res) => {
  await checklistsService.deleteCriterion(req.params.criterionId as string, getAuditCtx(req));
  res.json({ message: "Criterion deleted" });
});

export default router;
