import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import * as auditsService from "../services/auditsService";
import * as attachmentService from "../services/attachmentService";
import type { AuditContext } from "../services/auditService";
import { AppError } from "../errors/AppError";

const router = Router();

router.use(authenticate);

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  audit_type_id: z.string().uuid("Invalid audit type ID"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  risk_level: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  lead_auditor_id: z.string().uuid().nullable().optional(),
  auditee_department: z.string().max(255).optional(),
  auditee_contact_id: z.string().uuid().nullable().optional(),
  objective: z.string().optional(),
  scope: z.string().optional(),
  methodology: z.string().optional(),
  criteria_standards: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  scheduled_start: z.string().optional().nullable(),
  scheduled_end: z.string().optional().nullable(),
  report_due: z.string().optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  audit_type_id: z.string().uuid().optional(),
  status: z.enum(["draft", "scheduled", "planning", "in_progress", "under_review", "closed", "cancelled"]).optional(),
  current_phase: z.string().max(100).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  risk_level: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  lead_auditor_id: z.string().uuid().nullable().optional(),
  auditee_department: z.string().max(255).optional(),
  auditee_contact_id: z.string().uuid().nullable().optional(),
  objective: z.string().optional(),
  scope: z.string().optional(),
  methodology: z.string().optional(),
  criteria_standards: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  scheduled_start: z.string().optional().nullable(),
  scheduled_end: z.string().optional().nullable(),
  actual_start: z.string().optional().nullable(),
  actual_end: z.string().optional().nullable(),
  report_due: z.string().optional().nullable(),
  overall_rating: z.string().max(100).nullable().optional(),
  compliance_score: z.number().min(0).max(100).nullable().optional(),
});

const teamMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  role: z.enum(["lead", "auditor", "observer"]).optional(),
});

const assignChecklistSchema = z.object({
  checklist_id: z.string().uuid("Invalid checklist ID"),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

const findingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  finding_severity: z.enum(["observation", "minor", "major", "critical"]),
  finding_criterion_id: z.string().uuid().nullable().optional(),
});

const meetingSchema = z.object({
  meeting_type: z.enum(["opening", "fieldwork", "closing", "other"]),
  title: z.string().min(1, "Title is required").max(255),
  scheduled_date: z.string().min(1, "Date is required"),
  attendees: z.array(z.object({ name: z.string(), role: z.string() })).optional(),
  notes: z.string().optional(),
});

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName: req.userRecord?.full_name || req.userRecord?.name || req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

// Kanban board
router.get("/kanban", async (req, res) => {
  const columns = await auditsService.getAuditKanbanData({
    search: req.query.search as string | undefined,
  });
  res.json({ columns });
});

router.post("/kanban/:id/transition", async (req, res) => {
  const audit = await auditsService.updateAudit(
    req.params.id as string,
    { status: req.body.status },
    getAuditCtx(req)
  );
  res.json({ audit });
});

// List audits
router.get("/", async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    audit_type_id: req.query.audit_type_id as string | undefined,
    lead_auditor_id: req.query.lead_auditor_id as string | undefined,
    risk_level: req.query.risk_level as string | undefined,
    search: req.query.search as string | undefined,
    date_from: req.query.date_from as string | undefined,
    date_to: req.query.date_to as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort_by: req.query.sort_by as string | undefined,
    sort_dir: req.query.sort_dir as "asc" | "desc" | undefined,
  };
  const result = await auditsService.listAudits(filters);
  res.json(result);
});

// Get audit detail
router.get("/:id", async (req, res) => {
  const audit = await auditsService.getAudit(req.params.id as string);
  res.json({ audit });
});

// Create audit
router.post("/", validate(createSchema), async (req, res) => {
  const audit = await auditsService.createAudit(
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ audit });
});

// Update audit
router.patch("/:id", validate(updateSchema), async (req, res) => {
  const audit = await auditsService.updateAudit(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ audit });
});

// Delete audit
router.delete("/:id", async (req, res) => {
  await auditsService.deleteAudit(req.params.id as string, getAuditCtx(req));
  res.json({ message: "Audit deleted" });
});

// Advance workflow phase
router.post("/:id/advance-phase", async (req, res) => {
  const audit = await auditsService.advancePhase(
    req.params.id as string,
    getAuditCtx(req)
  );
  res.json({ audit });
});

// ── Team Members ───────────────────────────────────────────

router.post("/:id/team", validate(teamMemberSchema), async (req, res) => {
  const member = await auditsService.addTeamMember(
    req.params.id as string,
    req.body.user_id,
    req.body.role || "auditor",
    getAuditCtx(req)
  );
  res.status(201).json({ member });
});

router.delete("/:id/team/:memberId", async (req, res) => {
  await auditsService.removeTeamMember(
    req.params.memberId as string,
    getAuditCtx(req)
  );
  res.json({ message: "Team member removed" });
});

// ── Checklists ─────────────────────────────────────────────

router.post("/:id/checklists", validate(assignChecklistSchema), async (req, res) => {
  const instance = await auditsService.assignChecklist(
    req.params.id as string,
    req.body.checklist_id,
    req.body.assigned_to || null,
    req.body.due_date || null,
    getAuditCtx(req)
  );
  res.status(201).json({ instance });
});

router.delete("/checklist-instances/:instanceId", async (req, res) => {
  await auditsService.removeChecklistInstance(
    req.params.instanceId as string,
    getAuditCtx(req)
  );
  res.json({ message: "Checklist instance removed" });
});

// ── Findings ───────────────────────────────────────────────

router.get("/:id/findings", async (req, res) => {
  const audit = await auditsService.getAudit(req.params.id as string);
  res.json({ findings: audit.findings });
});

router.post("/:id/findings", validate(findingSchema), async (req, res) => {
  const finding = await auditsService.createFinding(
    req.params.id as string,
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ finding });
});

// ── Attachments ────────────────────────────────────────────

router.post(
  "/:id/attachments",
  upload.array("files", 20),
  async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError(400, "No files provided");
    }
    const attachments = await attachmentService.uploadAttachments(
      req.params.id as string,
      "audit",
      req.files as Express.Multer.File[],
      req.user!.userId,
      getAuditCtx(req)
    );
    res.status(201).json({ attachments });
  }
);

router.get("/:id/attachments", async (req, res) => {
  const attachments = await attachmentService.listAttachments(
    req.params.id as string,
    "audit"
  );
  res.json({ attachments });
});

// ── Meetings ───────────────────────────────────────────────

router.post("/:id/meetings", validate(meetingSchema), async (req, res) => {
  const meeting = await auditsService.addMeeting(
    req.params.id as string,
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ meeting });
});

router.patch("/meetings/:meetingId", validate(meetingSchema.partial()), async (req, res) => {
  const meeting = await auditsService.updateMeeting(
    req.params.meetingId as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ meeting });
});

router.delete("/meetings/:meetingId", async (req, res) => {
  await auditsService.deleteMeeting(
    req.params.meetingId as string,
    getAuditCtx(req)
  );
  res.json({ message: "Meeting deleted" });
});

export default router;
