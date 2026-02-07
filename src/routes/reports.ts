import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as reportsService from "../services/reportsService";

const router = Router();

router.use(authenticate);

const createReportSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  report_type: z.string().min(1, "Report type is required"),
  config: z.object({
    reportType: z.string(),
    fields: z.array(z.string()),
    dimensions: z.array(z.string()),
    measures: z.array(z.string()),
    chartType: z.string(),
    filters: z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      assignee_id: z.string().optional(),
    }),
  }),
  is_public: z.boolean().optional(),
});

const updateReportSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  report_type: z.string().optional(),
  config: z
    .object({
      reportType: z.string(),
      fields: z.array(z.string()),
      dimensions: z.array(z.string()),
      measures: z.array(z.string()),
      chartType: z.string(),
      filters: z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignee_id: z.string().optional(),
      }),
    })
    .optional(),
  is_public: z.boolean().optional(),
});

const runReportSchema = z.object({
  reportType: z.string(),
  fields: z.array(z.string()),
  dimensions: z.array(z.string()),
  measures: z.array(z.string()),
  chartType: z.string(),
  filters: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignee_id: z.string().optional(),
  }),
});

// List saved reports
router.get("/", async (req, res) => {
  const reports = await reportsService.listSavedReports(req.user!.userId);
  res.json({ reports });
});

// Run a report (execute without saving)
router.post("/run", validate(runReportSchema), async (req, res) => {
  const result = await reportsService.runReport(req.body);
  res.json(result);
});

// Get a saved report
router.get("/:id", async (req, res) => {
  const report = await reportsService.getSavedReport(req.params.id as string);
  res.json({ report });
});

// Create a saved report
router.post("/", validate(createReportSchema), async (req, res) => {
  const report = await reportsService.createReport(
    req.user!.userId,
    req.body
  );
  res.status(201).json({ report });
});

// Update a saved report
router.patch(
  "/:id",
  validate(updateReportSchema),
  async (req, res) => {
    const report = await reportsService.updateReport(
      req.params.id as string,
      req.user!.userId,
      req.body
    );
    res.json({ report });
  }
);

// Delete a saved report
router.delete("/:id", async (req, res) => {
  await reportsService.deleteReport(
    req.params.id as string,
    req.user!.userId
  );
  res.json({ message: "Report deleted" });
});

export default router;
