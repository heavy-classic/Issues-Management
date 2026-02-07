import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as workflowStagesService from "../services/workflowStagesService";

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
router.get("/", async (_req, res) => {
  const stages = await workflowStagesService.listStages();
  res.json({ stages });
});

router.get("/:id", async (req, res) => {
  const stage = await workflowStagesService.getStage(req.params.id as string);
  res.json({ stage });
});

// Write access for admin only
router.post(
  "/",
  authorize("admin"),
  validate(createStageSchema),
  async (req, res) => {
    const stage = await workflowStagesService.createStage(req.body);
    res.status(201).json({ stage });
  }
);

router.patch(
  "/:id",
  authorize("admin"),
  validate(updateStageSchema),
  async (req, res) => {
    const stage = await workflowStagesService.updateStage(
      req.params.id as string,
      req.body
    );
    res.json({ stage });
  }
);

router.delete("/:id", authorize("admin"), async (req, res) => {
  await workflowStagesService.deleteStage(req.params.id as string);
  res.json({ message: "Workflow stage deleted" });
});

router.put(
  "/reorder",
  authorize("admin"),
  validate(reorderSchema),
  async (req, res) => {
    const stages = await workflowStagesService.reorderStages(
      req.body.stage_ids
    );
    res.json({ stages });
  }
);

export default router;
