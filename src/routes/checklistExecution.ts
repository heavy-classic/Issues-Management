import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import * as checklistExecutionService from "../services/checklistExecutionService";
import * as attachmentService from "../services/attachmentService";
import { AppError } from "../errors/AppError";
import type { AuditContext } from "../services/auditService";

const router = Router();

router.use(authenticate);

const statusSchema = z.object({
  status: z.enum(["not_started", "in_progress", "complete", "under_review"]),
});

const responseSchema = z.object({
  criterion_id: z.string().uuid("Invalid criterion ID"),
  response_value: z.string().min(1, "Response value is required"),
  notes: z.string().optional(),
});

const findingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  finding_severity: z.enum(["observation", "minor", "major", "critical"]),
});

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName: req.userRecord?.full_name || req.userRecord?.name || req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

// Get instance with all criteria and responses
router.get("/:id", async (req, res) => {
  const instance = await checklistExecutionService.getInstance(
    req.params.id as string
  );
  res.json({ instance });
});

// Update instance status
router.patch("/:id", validate(statusSchema), async (req, res) => {
  const instance = await checklistExecutionService.updateInstanceStatus(
    req.params.id as string,
    req.body.status,
    getAuditCtx(req)
  );
  res.json({ instance });
});

// Save criterion response
router.post("/:id/responses", validate(responseSchema), async (req, res) => {
  const response = await checklistExecutionService.saveResponse(
    req.params.id as string,
    req.body.criterion_id,
    req.body.response_value,
    req.body.notes || "",
    req.user!.userId,
    getAuditCtx(req)
  );
  res.status(201).json({ response });
});

// Create finding from criterion
router.post(
  "/:id/responses/:criterionId/finding",
  validate(findingSchema),
  async (req, res) => {
    const finding = await checklistExecutionService.createFindingFromCriterion(
      req.params.id as string,
      req.params.criterionId as string,
      req.user!.userId,
      req.body,
      getAuditCtx(req)
    );
    res.status(201).json({ finding });
  }
);

// Upload attachments to a criterion response
router.post(
  "/:id/responses/:criterionId/attachments",
  upload.array("files", 20),
  async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError(400, "No files provided");
    }
    // Get or verify the criterion response exists
    const responseId = await checklistExecutionService.getResponseId(
      req.params.id as string,
      req.params.criterionId as string
    );
    const attachments = await attachmentService.uploadAttachments(
      responseId,
      "checklist_response",
      req.files as Express.Multer.File[],
      req.user!.userId,
      getAuditCtx(req)
    );
    res.status(201).json({ attachments });
  }
);

// List attachments for a criterion response
router.get(
  "/:id/responses/:criterionId/attachments",
  async (req, res) => {
    const responseId = await checklistExecutionService.getResponseId(
      req.params.id as string,
      req.params.criterionId as string
    );
    const attachments = await attachmentService.listAttachments(
      responseId,
      "checklist_response"
    );
    res.json({ attachments });
  }
);

export default router;
