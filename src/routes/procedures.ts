import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as proceduresService from "../services/proceduresService";
import type { AuditContext } from "../services/auditService";

const router = Router();

router.use(authenticate);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PROCEDURE_TYPES = [
  "Operating Procedure",
  "Maintenance Procedure",
  "Safety Procedure",
  "Quality Procedure",
  "Administrative Procedure",
  "Calibration Procedure",
] as const;

const PROCEDURE_STATUSES = ["draft", "review", "approved", "superseded", "cancelled"] as const;

const STEP_TYPES = [
  "BASIC",
  "CONDITIONAL",
  "VERIFICATION",
  "HOLD_POINT",
  "NOTIFICATION",
  "DATA_RECORDING",
  "WARNING",
  "CAUTION",
  "NOTE",
] as const;

const createProcedureSchema = z.object({
  procedure_number: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  procedure_type: z.enum(PROCEDURE_TYPES).optional(),
  status: z.enum(PROCEDURE_STATUSES).optional(),
  revision_number: z.number().int().min(0).optional(),
  revision_date: z.string().nullable().optional(),
  revision_description: z.string().nullable().optional(),
  approval_date: z.string().nullable().optional(),
  approved_by: z.string().uuid().nullable().optional(),
  building_unit: z.string().max(200).nullable().optional(),
  safety_classification: z.string().max(100).nullable().optional(),
  purpose: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
  applicability: z.string().nullable().optional(),
  precautions: z.string().nullable().optional(),
  prereq_planning: z.string().nullable().optional(),
  prereq_documents: z.string().nullable().optional(),
  prereq_tools: z.string().nullable().optional(),
  prereq_field_prep: z.string().nullable().optional(),
  prereq_approvals: z.string().nullable().optional(),
  post_testing: z.string().nullable().optional(),
  post_restoration: z.string().nullable().optional(),
  post_results: z.string().nullable().optional(),
  records_section: z.string().nullable().optional(),
  source_requirements: z.string().nullable().optional(),
});

const updateProcedureSchema = createProcedureSchema.partial().extend({
  // Allow any string for procedure_type on updates (enum only enforced on create)
  procedure_type: z.string().max(255).nullable().optional(),
  // Allow any string for status on updates too (e.g. legacy values)
  status: z.string().max(100).nullable().optional(),
});

const createSectionSchema = z.object({
  title: z.string().min(1).max(255),
  sequence_number: z.number().int().min(1),
});

const updateSectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  sequence_number: z.number().int().min(1).optional(),
});

const createStepSchema = z.object({
  step_text: z.string().min(1),
  sequence_number: z.number().int().min(1),
  step_type: z.enum(STEP_TYPES).optional(),
  step_level: z.number().int().min(1).max(2).optional(),
  parent_step_id: z.string().uuid().nullable().optional(),
  condition_text: z.string().nullable().optional(),
  is_nonsequential: z.boolean().optional(),
});

const updateStepSchema = createStepSchema.partial();

const addRevisionSchema = z.object({
  revision_number: z.number().int().min(0),
  revision_date: z.string().optional(),
  description: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Routes — procedures
// ---------------------------------------------------------------------------

router.get("/", async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    procedure_type: req.query.procedure_type as string | undefined,
    search: req.query.search as string | undefined,
    sort_by: req.query.sort_by as string | undefined,
    sort_dir: req.query.sort_dir as "asc" | "desc" | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  };
  const result = await proceduresService.listProcedures(filters);
  res.json(result);
});

router.post("/", validate(createProcedureSchema), async (req, res) => {
  const procedure = await proceduresService.createProcedure(
    req.user!.userId,
    req.body,
    getAuditCtx(req)
  );
  res.status(201).json({ procedure });
});

router.get("/:id", async (req, res) => {
  const procedure = await proceduresService.getProcedure(req.params.id);
  res.json({ procedure });
});

router.patch("/:id", validate(updateProcedureSchema), async (req, res) => {
  const procedure = await proceduresService.updateProcedure(
    req.params.id as string,
    req.body,
    getAuditCtx(req)
  );
  res.json({ procedure });
});

router.delete("/:id", async (req, res) => {
  await proceduresService.deleteProcedure(req.params.id as string, getAuditCtx(req));
  res.json({ message: "Procedure deleted" });
});

router.get("/:id/validate", async (req, res) => {
  const issues = await proceduresService.validateProcedure(req.params.id);
  res.json({ issues });
});

// ---------------------------------------------------------------------------
// Routes — sections
// ---------------------------------------------------------------------------

router.post("/:id/sections", validate(createSectionSchema), async (req, res) => {
  const section = await proceduresService.addSection(req.params.id as string, req.body);
  res.status(201).json({ section });
});

router.patch(
  "/:id/sections/:sectionId",
  validate(updateSectionSchema),
  async (req, res) => {
    const section = await proceduresService.updateSection(
      req.params.sectionId as string,
      req.body
    );
    res.json({ section });
  }
);

router.delete("/:id/sections/:sectionId", async (req, res) => {
  await proceduresService.deleteSection(req.params.sectionId);
  res.json({ message: "Section deleted" });
});

// ---------------------------------------------------------------------------
// Routes — steps
// ---------------------------------------------------------------------------

router.post(
  "/:id/sections/:sectionId/steps",
  validate(createStepSchema),
  async (req, res) => {
    const step = await proceduresService.addStep(req.params.sectionId as string, req.body);
    res.status(201).json({ step });
  }
);

router.patch("/:id/steps/:stepId", validate(updateStepSchema), async (req, res) => {
  const step = await proceduresService.updateStep(req.params.stepId as string, req.body);
  res.json({ step });
});

router.delete("/:id/steps/:stepId", async (req, res) => {
  await proceduresService.deleteStep(req.params.stepId);
  res.json({ message: "Step deleted" });
});

// ---------------------------------------------------------------------------
// Routes — revisions
// ---------------------------------------------------------------------------

router.post("/:id/revisions", validate(addRevisionSchema), async (req, res) => {
  const revision = await proceduresService.addRevision(
    req.params.id as string,
    req.body,
    req.user!.userId
  );
  res.status(201).json({ revision });
});

export default router;
