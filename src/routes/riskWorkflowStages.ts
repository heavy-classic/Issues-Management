import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as riskWorkflowStagesService from "../services/riskWorkflowStagesService";

const router = Router();

router.use(authenticate);

const createStageSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex color code")
    .optional(),
  position: z.number().int().min(0),
  requires_signature: z.boolean().optional(),
});

const updateStageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex color code")
    .optional(),
  requires_signature: z.boolean().optional(),
});

const reorderSchema = z.object({
  stage_ids: z.array(z.string().uuid()),
});

// Read access for all authenticated users
router.get("/", async (_req, res, next) => {
  try {
    const stages = await riskWorkflowStagesService.listStages();
    res.json({ stages });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const stage = await riskWorkflowStagesService.getStage(req.params.id as string);
    res.json({ stage });
  } catch (err) {
    next(err);
  }
});

// Write access for admin only
router.post(
  "/",
  authorize("admin"),
  validate(createStageSchema),
  async (req, res, next) => {
    try {
      const stage = await riskWorkflowStagesService.createStage(req.body);
      res.status(201).json({ stage });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  authorize("admin"),
  validate(updateStageSchema),
  async (req, res, next) => {
    try {
      const stage = await riskWorkflowStagesService.updateStage(
        req.params.id as string,
        req.body
      );
      res.json({ stage });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", authorize("admin"), async (req, res, next) => {
  try {
    await riskWorkflowStagesService.deleteStage(req.params.id as string);
    res.json({ message: "Risk workflow stage deleted" });
  } catch (err) {
    next(err);
  }
});

router.put(
  "/reorder",
  authorize("admin"),
  validate(reorderSchema),
  async (req, res, next) => {
    try {
      const stages = await riskWorkflowStagesService.reorderStages(
        req.body.stage_ids
      );
      res.json({ stages });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
