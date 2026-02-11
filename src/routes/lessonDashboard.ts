import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as lessonDashboardService from "../services/lessonDashboardService";

const router = Router();

router.use(authenticate);

router.get("/kpis", async (_req, res, next) => {
  try {
    const kpis = await lessonDashboardService.getKPIs();
    res.json(kpis);
  } catch (err) {
    next(err);
  }
});

router.get("/by-type", async (_req, res, next) => {
  try {
    const data = await lessonDashboardService.getByType();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/by-category", async (_req, res, next) => {
  try {
    const data = await lessonDashboardService.getByCategory();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/by-impact", async (_req, res, next) => {
  try {
    const data = await lessonDashboardService.getByImpact();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/by-status", async (_req, res, next) => {
  try {
    const data = await lessonDashboardService.getByStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/by-effectiveness", async (_req, res, next) => {
  try {
    const data = await lessonDashboardService.getByEffectiveness();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/trend", async (_req, res, next) => {
  try {
    const data = await lessonDashboardService.getTrend();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
