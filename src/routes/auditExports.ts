import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as auditExportsService from "../services/auditExportsService";

const router = Router();

router.use(authenticate);

// Full export data for PDF generation (client-side)
router.get("/:id", async (req, res) => {
  const data = await auditExportsService.getAuditExportData(
    req.params.id as string
  );
  res.json(data);
});

// CSV export
router.get("/:id/csv", async (req, res) => {
  const csv = await auditExportsService.getAuditCsvData(
    req.params.id as string
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="audit-report.csv"`
  );
  res.send(csv);
});

export default router;
