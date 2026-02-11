import db from "../db";
import { AppError } from "../errors/AppError";

interface CreateScheduleParams {
  report_id: string;
  frequency: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
  time_of_day?: string;
  timezone?: string;
  format?: string;
  recipients: Array<{
    user_id?: string | null;
    external_email?: string | null;
    delivery_method?: string;
  }>;
}

function calculateNextRun(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  timeOfDay: string,
  timezone: string
): Date {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  // Start from tomorrow at the specified time
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case "daily":
      return next;

    case "weekly": {
      const targetDay = dayOfWeek ?? 1; // default Monday
      while (next.getDay() !== targetDay) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case "bi_weekly": {
      const targetDay2 = dayOfWeek ?? 1;
      while (next.getDay() !== targetDay2) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case "monthly": {
      const targetDate = dayOfMonth ?? 1;
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(targetDate, 28));
      return next;
    }

    case "quarterly": {
      const targetDate2 = dayOfMonth ?? 1;
      const currentQuarter = Math.floor(next.getMonth() / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      next.setMonth(nextQuarterMonth);
      next.setDate(Math.min(targetDate2, 28));
      return next;
    }

    default:
      return next;
  }
}

function calculateNextRunAfter(
  lastRun: Date,
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  timeOfDay: string,
  timezone: string
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const next = new Date(lastRun);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "bi_weekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) next.setDate(Math.min(dayOfMonth, 28));
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      if (dayOfMonth) next.setDate(Math.min(dayOfMonth, 28));
      break;
  }

  next.setHours(hours, minutes, 0, 0);
  return next;
}

export async function listSchedules(reportId: string) {
  return db("report_schedules")
    .select(
      "report_schedules.*",
      "users.full_name as creator_name",
      "users.email as creator_email"
    )
    .leftJoin("users", "report_schedules.created_by", "users.id")
    .where("report_schedules.report_id", reportId)
    .orderBy("report_schedules.created_at", "desc");
}

export async function getSchedule(scheduleId: string) {
  const schedule = await db("report_schedules")
    .where({ id: scheduleId })
    .first();
  if (!schedule) throw new AppError(404, "Schedule not found");

  const recipients = await db("report_schedule_recipients")
    .select(
      "report_schedule_recipients.*",
      "users.full_name as user_name",
      "users.email as user_email"
    )
    .leftJoin("users", "report_schedule_recipients.user_id", "users.id")
    .where("report_schedule_recipients.schedule_id", scheduleId);

  return { ...schedule, recipients };
}

export async function createSchedule(data: CreateScheduleParams, userId: string) {
  // Verify report exists
  const report = await db("saved_reports").where({ id: data.report_id }).first();
  if (!report) throw new AppError(404, "Report not found");

  const timeOfDay = data.time_of_day || "08:00";
  const timezone = data.timezone || "America/New_York";
  const nextRun = calculateNextRun(
    data.frequency,
    data.day_of_week ?? null,
    data.day_of_month ?? null,
    timeOfDay,
    timezone
  );

  const [schedule] = await db("report_schedules")
    .insert({
      report_id: data.report_id,
      frequency: data.frequency,
      day_of_week: data.day_of_week ?? null,
      day_of_month: data.day_of_month ?? null,
      time_of_day: timeOfDay,
      timezone,
      format: data.format || "pdf",
      is_active: true,
      next_run_at: nextRun,
      created_by: userId,
    })
    .returning("*");

  // Insert recipients
  if (data.recipients && data.recipients.length > 0) {
    const recipientRows = data.recipients.map((r) => ({
      schedule_id: schedule.id,
      user_id: r.user_id || null,
      external_email: r.external_email || null,
      delivery_method: r.delivery_method || "email",
      is_active: true,
    }));
    await db("report_schedule_recipients").insert(recipientRows);
  }

  return getSchedule(schedule.id);
}

export async function updateSchedule(
  scheduleId: string,
  data: Partial<Omit<CreateScheduleParams, "report_id">>,
  userId: string
) {
  const existing = await db("report_schedules").where({ id: scheduleId }).first();
  if (!existing) throw new AppError(404, "Schedule not found");

  const updateData: Record<string, unknown> = {};
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.day_of_week !== undefined) updateData.day_of_week = data.day_of_week;
  if (data.day_of_month !== undefined) updateData.day_of_month = data.day_of_month;
  if (data.time_of_day !== undefined) updateData.time_of_day = data.time_of_day;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.format !== undefined) updateData.format = data.format;
  updateData.updated_at = new Date();

  // Recalculate next run if scheduling params changed
  if (data.frequency || data.day_of_week !== undefined || data.day_of_month !== undefined || data.time_of_day) {
    const freq = data.frequency || existing.frequency;
    const dow = data.day_of_week !== undefined ? data.day_of_week : existing.day_of_week;
    const dom = data.day_of_month !== undefined ? data.day_of_month : existing.day_of_month;
    const tod = data.time_of_day || existing.time_of_day;
    const tz = data.timezone || existing.timezone;
    updateData.next_run_at = calculateNextRun(freq, dow, dom, tod, tz);
  }

  const [schedule] = await db("report_schedules")
    .where({ id: scheduleId })
    .update(updateData)
    .returning("*");

  // Update recipients if provided
  if (data.recipients) {
    await db("report_schedule_recipients").where({ schedule_id: scheduleId }).del();
    if (data.recipients.length > 0) {
      const recipientRows = data.recipients.map((r) => ({
        schedule_id: scheduleId,
        user_id: r.user_id || null,
        external_email: r.external_email || null,
        delivery_method: r.delivery_method || "email",
        is_active: true,
      }));
      await db("report_schedule_recipients").insert(recipientRows);
    }
  }

  return getSchedule(schedule.id);
}

export async function deleteSchedule(scheduleId: string) {
  const existing = await db("report_schedules").where({ id: scheduleId }).first();
  if (!existing) throw new AppError(404, "Schedule not found");
  await db("report_schedules").where({ id: scheduleId }).del();
}

export async function toggleSchedule(scheduleId: string, isActive: boolean) {
  const existing = await db("report_schedules").where({ id: scheduleId }).first();
  if (!existing) throw new AppError(404, "Schedule not found");

  const [schedule] = await db("report_schedules")
    .where({ id: scheduleId })
    .update({ is_active: isActive, updated_at: new Date() })
    .returning("*");

  return schedule;
}

export async function getDueSchedules() {
  return db("report_schedules")
    .select(
      "report_schedules.*",
      "saved_reports.name as report_name",
      "saved_reports.config as report_config",
      "saved_reports.report_type"
    )
    .join("saved_reports", "report_schedules.report_id", "saved_reports.id")
    .where("report_schedules.is_active", true)
    .where("report_schedules.next_run_at", "<=", db.fn.now());
}

export async function markScheduleRun(scheduleId: string) {
  const schedule = await db("report_schedules").where({ id: scheduleId }).first();
  if (!schedule) return;

  const now = new Date();
  const nextRun = calculateNextRunAfter(
    now,
    schedule.frequency,
    schedule.day_of_week,
    schedule.day_of_month,
    schedule.time_of_day,
    schedule.timezone
  );

  await db("report_schedules")
    .where({ id: scheduleId })
    .update({
      last_run_at: now,
      next_run_at: nextRun,
      updated_at: now,
    });
}
