import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as riskDashboardService from "../services/riskDashboardService";

const router = Router();

router.use(authenticate);

router.get("/kpis", async (_req, res, next) => {
  try {
    const kpis = await riskDashboardService.getKPIs();
    res.json(kpis);
  } catch (err) {
    next(err);
  }
});

router.get("/heat-map", async (_req, res, next) => {
  try {
    const data = await riskDashboardService.getHeatMapData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/by-category", async (_req, res, next) => {
  try {
    const data = await riskDashboardService.getByCategory();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/by-status", async (_req, res, next) => {
  try {
    const data = await riskDashboardService.getByStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/trend", async (_req, res, next) => {
  try {
    const data = await riskDashboardService.getTrend();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
