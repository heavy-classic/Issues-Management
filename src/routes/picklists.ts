import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as picklistService from "../services/picklistService";

const router = Router();

router.use(authenticate);

// Get all picklist types (public)
router.get("/types", async (_req, res) => {
  const types = await picklistService.getPicklistTypes();
  res.json({ types });
});

// Get values for a picklist type (public)
router.get("/:type", async (req, res) => {
  const activeOnly = req.query.active === "true";
  const values = await picklistService.getPicklistValues(
    req.params.type as string,
    activeOnly
  );
  res.json({ values });
});

const createSchema = z.object({
  picklist_type: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  color: z.string().max(7).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

const updateSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  color: z.string().max(7).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

// Admin: Create a new picklist value
router.post("/", authorize("admin"), validate(createSchema), async (req, res) => {
  const value = await picklistService.createPicklistValue(req.body);
  res.status(201).json({ value });
});

// Admin: Update a picklist value
router.put("/:id", authorize("admin"), validate(updateSchema), async (req, res) => {
  const value = await picklistService.updatePicklistValue(
    req.params.id as string,
    req.body
  );
  res.json({ value });
});

// Admin: Delete a picklist value
router.delete("/:id", authorize("admin"), async (req, res) => {
  await picklistService.deletePicklistValue(req.params.id as string);
  res.json({ success: true });
});

export default router;
