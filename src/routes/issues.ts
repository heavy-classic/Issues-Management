import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import * as issuesService from "../services/issuesService";
import * as commentsService from "../services/commentsService";
import * as workflowService from "../services/workflowService";
import * as actionsService from "../services/actionsService";
import * as attachmentService from "../services/attachmentService";
import type { AuditContext } from "../services/auditService";
import { AppError } from "../errors/AppError";

const router = Router();

router.use(authenticate);

const SOURCES = ["Internal Audit", "External Audit", "Observation", "Inspection", "Self-Identified"] as const;

const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignee_id: z.string().uuid("Invalid assignee ID").nullable().optional(),
  source: z.enum(SOURCES).nullable().optional(),
  on_behalf_of_id: z.string().uuid("Invalid user ID").nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  date_identified: z.string().nullable().optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignee_id: z.string().uuid("Invalid assignee ID").nullable().optional(),
});

const addCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required"),
});

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

router.get("/", async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    priority: req.query.priority as string | undefined,
    assignee_id: req.query.assignee_id as string | undefined,
    stage_id: req.query.stage_id as string | undefined,
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort_by: req.query.sort_by as string | undefined,
    sort_dir: req.query.sort_dir as "asc" | "desc" | undefined,
  };
  const result = await issuesService.listIssues(filters);
  res.json(result);
});

router.get("/:id", async (req, res) => {
  const issue = await issuesService.getIssue(req.params.id as string);
  res.json({ issue });
});

router.post("/", validate(createIssueSchema), async (req, res) => {
  const auditCtx = getAuditCtx(req);
  const issue = await issuesService.createIssue(
    req.user!.userId,
    req.body,
    auditCtx
  );

  // Initialize workflow for the new issue
  await workflowService.initializeIssueWorkflow(issue.id, auditCtx);

  // Re-fetch to get stage info
  const fullIssue = await issuesService.getIssue(issue.id);
  res.status(201).json({ issue: fullIssue });
});

router.patch("/:id", validate(updateIssueSchema), async (req, res) => {
  const issue = await issuesService.updateIssue(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ issue });
});

router.delete("/:id", async (req, res) => {
  await issuesService.deleteIssue(
    req.params.id as string,
    req.user!.userId,
    getAuditCtx(req)
  );
  res.json({ message: "Issue deleted" });
});

router.post(
  "/:id/comments",
  validate(addCommentSchema),
  async (req, res) => {
    const comment = await commentsService.addComment(
      req.params.id as string,
      req.user!.userId,
      req.body.body,
      getAuditCtx(req)
    );
    res.status(201).json({ comment });
  }
);

router.get("/:id/actions", async (req, res) => {
  const actions = await actionsService.getActionsForIssue(
    req.params.id as string
  );
  res.json({ actions });
});

// Upload attachments to issue
router.post(
  "/:id/attachments",
  upload.array("files", 20),
  async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError(400, "No files provided");
    }
    const attachments = await attachmentService.uploadAttachments(
      req.params.id as string,
      "issue",
      req.files as Express.Multer.File[],
      req.user!.userId,
      getAuditCtx(req)
    );
    res.status(201).json({ attachments });
  }
);

// List attachments for issue
router.get("/:id/attachments", async (req, res) => {
  const attachments = await attachmentService.listAttachments(
    req.params.id as string,
    "issue"
  );
  res.json({ attachments });
});

router.delete("/:id/comments/:commentId", async (req, res) => {
  await commentsService.deleteComment(
    req.params.id as string,
    req.params.commentId as string,
    req.user!.userId,
    getAuditCtx(req)
  );
  res.json({ message: "Comment deleted" });
});

export default router;
