import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as auditTypesService from "../services/auditTypesService";
import type { AuditContext } from "../services/auditService";

const router = Router();

router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
  icon: z.string().max(50).optional(),
  workflow_phases: z.array(z.string().min(1)).min(1).optional(),
  checklist_settings: z.record(z.string(), z.unknown()).optional(),
  team_settings: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
  icon: z.string().max(50).optional(),
  workflow_phases: z.array(z.string().min(1)).min(1).optional(),
  checklist_settings: z.record(z.string(), z.unknown()).optional(),
  team_settings: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName: req.userRecord?.full_name || req.userRecord?.name || req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

// List — available to all authenticated users
router.get("/", async (req, res) => {
  const is_active = req.query.is_active === "true" ? true : req.query.is_active === "false" ? false : undefined;
  const types = await auditTypesService.listAuditTypes({ is_active });
  res.json({ auditTypes: types });
});

// Detail
router.get("/:id", async (req, res) => {
  const auditType = await auditTypesService.getAuditType(req.params.id as string);
  res.json({ auditType });
});

// Create — admin only
router.post("/", authorize("admin"), validate(createSchema), async (req, res) => {
  const auditType = await auditTypesService.createAuditType(
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ auditType });
});

// Update — admin only
router.patch("/:id", authorize("admin"), validate(updateSchema), async (req, res) => {
  const auditType = await auditTypesService.updateAuditType(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ auditType });
});

// Delete — admin only
router.delete("/:id", authorize("admin"), async (req, res) => {
  await auditTypesService.deleteAuditType(
    req.params.id as string,
    getAuditCtx(req)
  );
  res.json({ message: "Audit type deleted" });
});

export default router;
