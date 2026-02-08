import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import * as actionsService from "../services/actionsService";
import * as attachmentService from "../services/attachmentService";
import type { AuditContext } from "../services/auditService";
import { AppError } from "../errors/AppError";

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

// Upload attachments to action
router.post(
  "/:id/attachments",
  upload.array("files", 20),
  async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError(400, "No files provided");
    }
    const attachments = await attachmentService.uploadAttachments(
      req.params.id as string,
      "action",
      req.files as Express.Multer.File[],
      req.user!.userId,
      getAuditCtx(req)
    );
    res.status(201).json({ attachments });
  }
);

// List attachments for action
router.get("/:id/attachments", async (req, res) => {
  const attachments = await attachmentService.listAttachments(
    req.params.id as string,
    "action"
  );
  res.json({ attachments });
});

export default router;
