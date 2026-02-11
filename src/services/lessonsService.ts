import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface ListLessonsFilters {
  status?: string;
  lesson_type?: string;
  category?: string;
  impact_level?: string;
  owner_id?: string;
  effectiveness_rating?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

const LESSON_SORT_COLUMNS: Record<string, string> = {
  lesson_number: "lessons.lesson_number",
  title: "lessons.title",
  status: "lessons.status",
  lesson_type: "lessons.lesson_type",
  category: "lessons.category",
  impact_level: "lessons.impact_level",
  effectiveness_rating: "lessons.effectiveness_rating",
  owner: "owner.full_name",
  identified_date: "lessons.identified_date",
  created_at: "lessons.created_at",
};

async function generateLessonNumber(): Promise<string> {
  const [result] = await db.raw("SELECT nextval('lesson_number_seq') as seq");
  const seq = String(result.seq).padStart(4, "0");
  return `LL-${seq}`;
}

export async function listLessons(filters: ListLessonsFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const sortCol = LESSON_SORT_COLUMNS[filters.sort_by || ""] || "lessons.created_at";
  const sortDir = filters.sort_dir === "asc" ? "asc" : "desc";

  const baseQuery = db("lessons")
    .leftJoin("users as owner", "lessons.owner_id", "owner.id")
    .leftJoin("users as creator", "lessons.created_by", "creator.id")
    .leftJoin("lesson_workflow_stages", "lessons.current_stage_id", "lesson_workflow_stages.id");

  if (filters.status) baseQuery.where("lessons.status", filters.status);
  if (filters.lesson_type) baseQuery.where("lessons.lesson_type", filters.lesson_type);
  if (filters.category) baseQuery.where("lessons.category", filters.category);
  if (filters.impact_level) baseQuery.where("lessons.impact_level", filters.impact_level);
  if (filters.owner_id) baseQuery.where("lessons.owner_id", filters.owner_id);
  if (filters.effectiveness_rating) baseQuery.where("lessons.effectiveness_rating", filters.effectiveness_rating);
  if (filters.search) {
    baseQuery.where(function () {
      this.whereILike("lessons.title", `%${filters.search}%`)
        .orWhereILike("lessons.lesson_number", `%${filters.search}%`)
        .orWhereILike("lessons.description", `%${filters.search}%`);
    });
  }

  const countResult = await baseQuery.clone().count("lessons.id as count").first();
  const total = Number(countResult?.count || 0);

  const lessons = await baseQuery
    .clone()
    .select(
      "lessons.*",
      "owner.full_name as owner_name",
      "owner.email as owner_email",
      "creator.full_name as creator_name",
      "lesson_workflow_stages.name as stage_name",
      "lesson_workflow_stages.color as stage_color",
      db.raw("(SELECT COUNT(*) FROM lesson_issues WHERE lesson_id = lessons.id)::int as linked_issues_count"),
      db.raw("(SELECT COUNT(*) FROM lesson_comments WHERE lesson_id = lessons.id)::int as comment_count")
    )
    .orderBy(sortCol, sortDir)
    .limit(limit)
    .offset((page - 1) * limit);

  return { lessons, total, page, limit };
}

export async function getLesson(id: string) {
  const lesson = await db("lessons")
    .select(
      "lessons.*",
      "owner.full_name as owner_name",
      "owner.email as owner_email",
      "reviewer.full_name as reviewer_name",
      "reviewer.email as reviewer_email",
      "creator.full_name as creator_name",
      "creator.email as creator_email",
      "lesson_workflow_stages.name as stage_name",
      "lesson_workflow_stages.color as stage_color",
      "lesson_workflow_stages.position as stage_position"
    )
    .leftJoin("users as owner", "lessons.owner_id", "owner.id")
    .leftJoin("users as reviewer", "lessons.reviewer_id", "reviewer.id")
    .leftJoin("users as creator", "lessons.created_by", "creator.id")
    .leftJoin("lesson_workflow_stages", "lessons.current_stage_id", "lesson_workflow_stages.id")
    .where("lessons.id", id)
    .first();

  if (!lesson) throw new AppError(404, "Lesson not found");
  return lesson;
}

interface CreateLessonParams {
  title: string;
  description?: string;
  lesson_type: string;
  category?: string | null;
  impact_level?: string | null;
  what_happened?: string;
  root_cause?: string;
  root_cause_category?: string | null;
  recommendation?: string;
  preventive_action?: string;
  corrective_action?: string;
  owner_id?: string | null;
  reviewer_id?: string | null;
  identified_date?: string | null;
  tags?: string[];
  from_issue_id?: string;
}

export async function createLesson(data: CreateLessonParams, ctx: AuditContext) {
  const lessonNumber = await generateLessonNumber();

  const [lesson] = await db("lessons")
    .insert({
      lesson_number: lessonNumber,
      title: data.title,
      description: data.description || null,
      status: "draft",
      lesson_type: data.lesson_type,
      category: data.category || null,
      impact_level: data.impact_level || null,
      what_happened: data.what_happened || null,
      root_cause: data.root_cause || null,
      root_cause_category: data.root_cause_category || null,
      recommendation: data.recommendation || null,
      preventive_action: data.preventive_action || null,
      corrective_action: data.corrective_action || null,
      owner_id: data.owner_id || null,
      reviewer_id: data.reviewer_id || null,
      identified_date: data.identified_date || null,
      tags: data.tags || null,
      created_by: ctx.userId,
    })
    .returning("*");

  // If created from an issue, auto-link it
  if (data.from_issue_id) {
    await db("lesson_issues").insert({
      lesson_id: lesson.id,
      issue_id: data.from_issue_id,
      relationship: "originated_from",
    });
  }

  await auditService.logChange(
    { tableName: "lessons", recordId: lesson.id, changeType: "INSERT", newValue: lesson },
    ctx
  );

  return lesson;
}

interface UpdateLessonParams {
  title?: string;
  description?: string;
  status?: string;
  lesson_type?: string;
  category?: string | null;
  impact_level?: string | null;
  what_happened?: string;
  root_cause?: string;
  root_cause_category?: string | null;
  recommendation?: string;
  preventive_action?: string;
  corrective_action?: string;
  outcome?: string;
  effectiveness_rating?: string;
  identified_date?: string | null;
  review_date?: string | null;
  implementation_date?: string | null;
  closure_date?: string | null;
  owner_id?: string | null;
  reviewer_id?: string | null;
  tags?: string[];
}

export async function updateLesson(id: string, data: UpdateLessonParams, ctx: AuditContext) {
  const existing = await db("lessons").where({ id }).first();
  if (!existing) throw new AppError(404, "Lesson not found");

  const [lesson] = await db("lessons")
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning("*");

  await auditService.logChange(
    { tableName: "lessons", recordId: id, changeType: "UPDATE", oldValue: existing, newValue: lesson },
    ctx
  );

  return lesson;
}

export async function deleteLesson(id: string, ctx: AuditContext) {
  const existing = await db("lessons").where({ id }).first();
  if (!existing) throw new AppError(404, "Lesson not found");

  await db("lessons").where({ id }).del();

  await auditService.logChange(
    { tableName: "lessons", recordId: id, changeType: "DELETE", oldValue: existing },
    ctx
  );
}

// --- Linked Issues ---

export async function getLinkedIssues(lessonId: string) {
  return db("lesson_issues")
    .select(
      "lesson_issues.relationship",
      "lesson_issues.created_at as linked_at",
      "issues.id",
      "issues.title",
      "issues.status",
      "issues.priority",
      "issues.issue_number"
    )
    .join("issues", "lesson_issues.issue_id", "issues.id")
    .where("lesson_issues.lesson_id", lessonId);
}

export async function linkIssue(lessonId: string, issueId: string, relationship: string = "related") {
  const exists = await db("lesson_issues").where({ lesson_id: lessonId, issue_id: issueId }).first();
  if (exists) throw new AppError(400, "Issue already linked");

  await db("lesson_issues").insert({ lesson_id: lessonId, issue_id: issueId, relationship });
}

export async function unlinkIssue(lessonId: string, issueId: string) {
  const deleted = await db("lesson_issues").where({ lesson_id: lessonId, issue_id: issueId }).del();
  if (!deleted) throw new AppError(404, "Link not found");
}

// --- Kanban ---

export async function getLessonKanbanData(filters: { search?: string }) {
  const stages = await db("lesson_workflow_stages").orderBy("position", "asc");

  const query = db("lessons")
    .select(
      "lessons.id", "lessons.lesson_number", "lessons.title", "lessons.status",
      "lessons.lesson_type", "lessons.impact_level",
      "lessons.current_stage_id",
      "owner.full_name as owner_name", "owner.email as owner_email"
    )
    .leftJoin("users as owner", "lessons.owner_id", "owner.id")
    .whereNotNull("lessons.current_stage_id");

  if (filters.search) {
    query.where(function () {
      this.whereILike("lessons.title", `%${filters.search}%`)
        .orWhereILike("lessons.lesson_number", `%${filters.search}%`);
    });
  }

  const lessons = await query;

  const columns = stages.map((stage: any) => ({
    stage,
    lessons: lessons.filter((l: any) => l.current_stage_id === stage.id),
  }));

  return { columns };
}
