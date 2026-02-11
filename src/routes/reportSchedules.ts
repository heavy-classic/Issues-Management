import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as reportSchedulesService from "../services/reportSchedulesService";

const router = Router();

router.use(authenticate);

const recipientSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  external_email: z.string().email().nullable().optional(),
  delivery_method: z.enum(["email", "in_app"]).optional(),
});

const createScheduleSchema = z.object({
  report_id: z.string().uuid(),
  frequency: z.enum(["daily", "weekly", "bi_weekly", "monthly", "quarterly"]),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(28).nullable().optional(),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().max(100).optional(),
  format: z.enum(["pdf", "csv", "excel"]).optional(),
  recipients: z.array(recipientSchema).min(1, "At least one recipient is required"),
});

const updateScheduleSchema = createScheduleSchema.partial().omit({ report_id: true });

// List schedules for a report
router.get("/report/:reportId", async (req: any, res, next) => {
  try {
    const schedules = await reportSchedulesService.listSchedules(req.params.reportId as string);
    res.json({ schedules });
  } catch (err) {
    next(err);
  }
});

// Get schedule details
router.get("/:id", async (req: any, res, next) => {
  try {
    const schedule = await reportSchedulesService.getSchedule(req.params.id as string);
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});

// Create schedule
router.post("/", validate(createScheduleSchema), async (req: any, res, next) => {
  try {
    const schedule = await reportSchedulesService.createSchedule(req.body, req.user!.userId);
    res.status(201).json({ schedule });
  } catch (err) {
    next(err);
  }
});

// Update schedule
router.put("/:id", validate(updateScheduleSchema), async (req: any, res, next) => {
  try {
    const schedule = await reportSchedulesService.updateSchedule(
      req.params.id as string,
      req.body,
      req.user!.userId
    );
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});

// Toggle active/inactive
router.patch("/:id/toggle", async (req: any, res, next) => {
  try {
    const schedule = await reportSchedulesService.toggleSchedule(
      req.params.id as string,
      req.body.is_active
    );
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});

// Delete schedule
router.delete("/:id", async (req: any, res, next) => {
  try {
    await reportSchedulesService.deleteSchedule(req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
