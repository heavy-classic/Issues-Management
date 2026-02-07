import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as actionsService from "../services/actionsService";
import type { AuditContext } from "../services/auditService";

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

const createActionSchema = z.object({
  issue_id: z.string().uuid("Invalid issue ID"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.string().uuid("Invalid user ID").nullable().optional(),
  due_date: z.string().optional().nullable(),
});

const updateActionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["initiate", "assigned", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.string().uuid("Invalid user ID").nullable().optional(),
  due_date: z.string().optional().nullable(),
});

const addAttachmentSchema = z.object({
  file_name: z.string().min(1, "File name is required").max(255),
  file_type: z.string().min(1, "File type is required").max(100),
  file_size: z.number().int().min(0, "File size must be non-negative"),
});

// List actions with filters
router.get("/", async (req, res) => {
  const filters = {
    issue_id: req.query.issue_id as string | undefined,
    status: req.query.status as string | undefined,
    priority: req.query.priority as string | undefined,
    assigned_to: req.query.assigned_to as string | undefined,
    search: req.query.search as string | undefined,
  };
  const actions = await actionsService.listActions(filters);
  res.json({ actions });
});

// Get a single action
router.get("/:id", async (req, res) => {
  const action = await actionsService.getAction(req.params.id as string);
  res.json({ action });
});

// Create action
router.post("/", validate(createActionSchema), async (req, res) => {
  const action = await actionsService.createAction(
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ action });
});

// Update action
router.patch("/:id", validate(updateActionSchema), async (req, res) => {
  const action = await actionsService.updateAction(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ action });
});

// Delete action
router.delete("/:id", async (req, res) => {
  await actionsService.deleteAction(
    req.params.id as string,
    req.user!.userId,
    getAuditCtx(req)
  );
  res.json({ message: "Action deleted" });
});

// Add attachment metadata
router.post(
  "/:id/attachments",
  validate(addAttachmentSchema),
  async (req, res) => {
    const attachment = await actionsService.addAttachment(
      req.params.id as string,
      req.user!.userId,
      req.body,
      getAuditCtx(req)
    );
    res.status(201).json({ attachment });
  }
);

// Delete attachment
router.delete("/:id/attachments/:attachmentId", async (req, res) => {
  await actionsService.deleteAttachment(
    req.params.attachmentId as string,
    getAuditCtx(req)
  );
  res.json({ message: "Attachment deleted" });
});

export default router;
