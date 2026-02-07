import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as workflowService from "../services/workflowService";
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

// Get Kanban board data
router.get("/kanban", async (req, res) => {
  const filters = {
    assignee_id: req.query.assignee_id as string | undefined,
    priority: req.query.priority as string | undefined,
    search: req.query.search as string | undefined,
  };
  const data = await workflowService.getKanbanData(filters);
  res.json(data);
});

// Get workflow info for a specific issue
router.get("/issues/:id", async (req, res) => {
  const workflow = await workflowService.getIssueWorkflow(req.params.id as string);
  res.json(workflow);
});

const transitionSchema = z.object({
  target_stage_id: z.string().uuid("Invalid target stage ID"),
});

// Transition an issue to a new stage
router.post(
  "/issues/:id/transition",
  validate(transitionSchema),
  async (req, res) => {
    const result = await workflowService.transitionIssue(
      req.params.id as string,
      req.body.target_stage_id,
      getAuditCtx(req)
    );
    res.json(result);
  }
);

const assignSchema = z.object({
  user_id: z.string().uuid("Invalid user ID").nullable(),
});

// Assign a user to a stage for an issue
router.patch(
  "/issues/:id/stages/:stageId/assign",
  validate(assignSchema),
  async (req, res) => {
    const result = await workflowService.assignStageUser(
      req.params.id as string,
      req.params.stageId as string,
      req.body.user_id,
      getAuditCtx(req)
    );
    res.json(result);
  }
);

// Complete a stage assignment
router.post(
  "/issues/:id/stages/:stageId/complete",
  async (req, res) => {
    const result = await workflowService.completeStageAssignment(
      req.params.id as string,
      req.params.stageId as string,
      getAuditCtx(req)
    );
    res.json(result);
  }
);

export default router;
