import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as auditDashboardService from "../services/auditDashboardService";
import type { AuditDashboardFilters } from "../services/auditDashboardService";

const router = Router();

router.use(authenticate);

function getFilters(query: any): AuditDashboardFilters {
  return {
    date_from: query.date_from as string | undefined,
    date_to: query.date_to as string | undefined,
    audit_type_id: query.audit_type_id as string | undefined,
    risk_level: query.risk_level as string | undefined,
  };
}

router.get("/kpis", async (req, res) => {
  const kpis = await auditDashboardService.getKPIs(getFilters(req.query));
  res.json(kpis);
});

router.get("/by-status", async (req, res) => {
  const data = await auditDashboardService.getByStatus(getFilters(req.query));
  res.json({ data });
});

router.get("/by-type", async (req, res) => {
  const data = await auditDashboardService.getByType(getFilters(req.query));
  res.json({ data });
});

router.get("/completion-trend", async (req, res) => {
  const data = await auditDashboardService.getCompletionTrend(getFilters(req.query));
  res.json({ data });
});

router.get("/findings-by-severity", async (req, res) => {
  const data = await auditDashboardService.getFindingsBySeverity(getFilters(req.query));
  res.json({ data });
});

router.get("/risk-distribution", async (req, res) => {
  const data = await auditDashboardService.getRiskDistribution(getFilters(req.query));
  res.json({ data });
});

export default router;
