import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as dashboardService from "../services/dashboardService";
import type { DashboardFilters } from "../services/dashboardService";

const router = Router();

router.use(authenticate);

function getFilters(req: any): DashboardFilters {
  return {
    dateFrom: req.query.date_from as string | undefined,
    dateTo: req.query.date_to as string | undefined,
    priority: req.query.priority as string | undefined,
    assignee_id: req.query.assignee_id as string | undefined,
    stage_id: req.query.stage_id as string | undefined,
  };
}

router.get("/kpis", async (req, res) => {
  const data = await dashboardService.getKPIs(getFilters(req));
  res.json(data);
});

router.get("/issues-by-status", async (req, res) => {
  const data = await dashboardService.getIssuesByStatus(getFilters(req));
  res.json({ data });
});

router.get("/issues-by-priority", async (req, res) => {
  const data = await dashboardService.getIssuesByPriority(getFilters(req));
  res.json({ data });
});

router.get("/issues-by-stage", async (req, res) => {
  const data = await dashboardService.getIssuesByStage(getFilters(req));
  res.json({ data });
});

router.get("/issue-trend", async (req, res) => {
  const data = await dashboardService.getIssueCreationTrend(getFilters(req));
  res.json({ data });
});

router.get("/actions-by-status", async (req, res) => {
  const data = await dashboardService.getActionsByStatus(getFilters(req));
  res.json({ data });
});

router.get("/resolution-funnel", async (req, res) => {
  const data = await dashboardService.getIssueResolutionFunnel(getFilters(req));
  res.json({ data });
});

router.get("/priority-stage-heatmap", async (req, res) => {
  const data = await dashboardService.getPriorityByStageHeatmap(
    getFilters(req)
  );
  res.json({ data });
});

router.get("/team-workload", async (req, res) => {
  const data = await dashboardService.getTeamWorkload(getFilters(req));
  res.json({ data });
});

export default router;
