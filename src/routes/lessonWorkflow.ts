import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as lessonWorkflowService from "../services/lessonWorkflowService";
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

// Get workflow info for a specific lesson
router.get("/lessons/:id", async (req, res, next) => {
  try {
    const workflow = await lessonWorkflowService.getLessonWorkflow(req.params.id as string);
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

const transitionSchema = z.object({
  target_stage_id: z.string().uuid("Invalid target stage ID"),
});

// Transition a lesson to a new stage
router.post(
  "/lessons/:id/transition",
  validate(transitionSchema),
  async (req: any, res, next) => {
    try {
      const result = await lessonWorkflowService.transitionLesson(
        req.params.id as string,
        req.body.target_stage_id,
        getAuditCtx(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

const assignSchema = z.object({
  user_id: z.string().uuid("Invalid user ID").nullable(),
});

// Assign a user to a stage for a lesson
router.patch(
  "/lessons/:id/stages/:stageId/assign",
  validate(assignSchema),
  async (req: any, res, next) => {
    try {
      const result = await lessonWorkflowService.assignStageUser(
        req.params.id as string,
        req.params.stageId as string,
        req.body.user_id,
        getAuditCtx(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Complete a stage assignment
router.post(
  "/lessons/:id/stages/:stageId/complete",
  async (req: any, res, next) => {
    try {
      const result = await lessonWorkflowService.completeStageAssignment(
        req.params.id as string,
        req.params.stageId as string,
        getAuditCtx(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
