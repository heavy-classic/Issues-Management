import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import * as lessonsService from "../services/lessonsService";
import * as lessonCommentsService from "../services/lessonCommentsService";
import * as attachmentService from "../services/attachmentService";
import type { AuditContext } from "../services/auditService";
import { AppError } from "../errors/AppError";

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
  lesson_type: z.enum(["positive", "negative", "improvement"]),
  category: z.string().max(100).nullable().optional(),
  impact_level: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  what_happened: z.string().optional(),
  root_cause: z.string().optional(),
  root_cause_category: z.string().max(100).nullable().optional(),
  recommendation: z.string().optional(),
  preventive_action: z.string().optional(),
  corrective_action: z.string().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  reviewer_id: z.string().uuid().nullable().optional(),
  identified_date: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  from_issue_id: z.string().uuid().optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.string().max(50).optional(),
  outcome: z.string().optional(),
  effectiveness_rating: z.enum([
    "not_rated", "ineffective", "partially_effective", "effective", "highly_effective",
  ]).optional(),
  review_date: z.string().optional().nullable(),
  implementation_date: z.string().optional().nullable(),
  closure_date: z.string().optional().nullable(),
});

const addCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required"),
});

// --- CRUD ---

router.get("/", async (req: any, res, next) => {
  try {
    const result = await lessonsService.listLessons({
      status: req.query.status as string,
      lesson_type: req.query.lesson_type as string,
      category: req.query.category as string,
      impact_level: req.query.impact_level as string,
      owner_id: req.query.owner_id as string,
      effectiveness_rating: req.query.effectiveness_rating as string,
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
    const data = await lessonsService.getLessonKanbanData({
      search: req.query.search as string,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: any, res, next) => {
  try {
    const lesson = await lessonsService.getLesson(req.params.id as string);
    res.json({ lesson });
  } catch (err) {
    next(err);
  }
});

router.post("/", validate(createSchema), async (req: any, res, next) => {
  try {
    const lesson = await lessonsService.createLesson(req.body, getAuditCtx(req));
    res.status(201).json({ lesson });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validate(updateSchema), async (req: any, res, next) => {
  try {
    const lesson = await lessonsService.updateLesson(req.params.id as string, req.body, getAuditCtx(req));
    res.json({ lesson });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: any, res, next) => {
  try {
    await lessonsService.deleteLesson(req.params.id as string, getAuditCtx(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Comments ---

router.get("/:id/comments", async (req: any, res, next) => {
  try {
    const comments = await lessonCommentsService.listComments(req.params.id as string);
    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/comments", validate(addCommentSchema), async (req: any, res, next) => {
  try {
    const comment = await lessonCommentsService.addComment(
      req.params.id as string,
      req.user!.userId,
      req.body.body,
      getAuditCtx(req)
    );
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/comments/:commentId", async (req: any, res, next) => {
  try {
    await lessonCommentsService.deleteComment(
      req.params.id as string,
      req.params.commentId as string,
      req.user!.userId,
      getAuditCtx(req)
    );
    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
});

// --- Attachments ---

router.post("/:id/attachments", upload.array("files", 20), async (req: any, res, next) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError(400, "No files provided");
    }
    const attachments = await attachmentService.uploadAttachments(
      req.params.id as string,
      "lesson",
      req.files as Express.Multer.File[],
      req.user!.userId,
      getAuditCtx(req)
    );
    res.status(201).json({ attachments });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/attachments", async (req: any, res, next) => {
  try {
    const attachments = await attachmentService.listAttachments(
      req.params.id as string,
      "lesson"
    );
    res.json({ attachments });
  } catch (err) {
    next(err);
  }
});

// --- Linked Issues ---

router.get("/:id/issues", async (req: any, res, next) => {
  try {
    const issues = await lessonsService.getLinkedIssues(req.params.id as string);
    res.json({ issues });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/issues/:issueId", async (req: any, res, next) => {
  try {
    const relationship = req.body?.relationship || "related";
    await lessonsService.linkIssue(req.params.id as string, req.params.issueId as string, relationship);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/issues/:issueId", async (req: any, res, next) => {
  try {
    await lessonsService.unlinkIssue(req.params.id as string, req.params.issueId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
