import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export async function initializeLessonWorkflow(
  lessonId: string,
  auditCtx?: AuditContext
) {
  const firstStage = await db("lesson_workflow_stages")
    .orderBy("position", "asc")
    .first();

  if (!firstStage) return;

  await db("lessons")
    .where({ id: lessonId })
    .update({ current_stage_id: firstStage.id });

  const stages = await db("lesson_workflow_stages").orderBy("position", "asc");

  for (const stage of stages) {
    const [assignment] = await db("lesson_stage_assignments")
      .insert({
        lesson_id: lessonId,
        stage_id: stage.id,
        user_id: null,
        assigned_at: new Date(),
      })
      .returning("*");

    if (auditCtx) {
      await auditService.logInsert(
        "lesson_stage_assignments",
        assignment.id,
        assignment,
        auditCtx
      );
    }
  }
}

export async function getLessonWorkflow(lessonId: string) {
  const lesson = await db("lessons").where({ id: lessonId }).first();
  if (!lesson) throw new AppError(404, "Lesson not found");

  const assignments = await db("lesson_stage_assignments")
    .select(
      "lesson_stage_assignments.*",
      "lesson_workflow_stages.name as stage_name",
      "lesson_workflow_stages.color as stage_color",
      "lesson_workflow_stages.position as stage_position",
      "lesson_workflow_stages.requires_signature",
      "users.email as assignee_email",
      "users.full_name as assignee_name"
    )
    .leftJoin(
      "lesson_workflow_stages",
      "lesson_stage_assignments.stage_id",
      "lesson_workflow_stages.id"
    )
    .leftJoin("users", "lesson_stage_assignments.user_id", "users.id")
    .where("lesson_stage_assignments.lesson_id", lessonId)
    .orderBy("lesson_workflow_stages.position", "asc");

  const signatures = await db("electronic_signatures")
    .where({ lesson_id: lessonId })
    .orderBy("signature_timestamp", "asc");

  return {
    currentStageId: lesson.current_stage_id,
    assignments,
    signatures,
  };
}

export async function transitionLesson(
  lessonId: string,
  targetStageId: string,
  auditCtx: AuditContext
) {
  const lesson = await db("lessons").where({ id: lessonId }).first();
  if (!lesson) throw new AppError(404, "Lesson not found");

  const currentStage = lesson.current_stage_id
    ? await db("lesson_workflow_stages").where({ id: lesson.current_stage_id }).first()
    : null;

  const targetStage = await db("lesson_workflow_stages")
    .where({ id: targetStageId })
    .first();
  if (!targetStage) throw new AppError(404, "Target stage not found");

  // If the current stage requires a signature, verify one exists before moving forward
  if (currentStage && currentStage.requires_signature) {
    if (targetStage.position > currentStage.position) {
      const signature = await db("electronic_signatures")
        .where({
          lesson_id: lessonId,
          workflow_stage_id: currentStage.id,
        })
        .first();

      if (!signature) {
        throw new AppError(
          400,
          `Stage "${currentStage.name}" requires an electronic signature before transitioning.`
        );
      }
    }
  }

  // Mark current stage assignment as completed
  if (lesson.current_stage_id) {
    await db("lesson_stage_assignments")
      .where({ lesson_id: lessonId, stage_id: lesson.current_stage_id })
      .update({ completed_at: new Date() });
  }

  // Update lesson's current stage
  const oldStageId = lesson.current_stage_id;
  await db("lessons")
    .where({ id: lessonId })
    .update({ current_stage_id: targetStageId, updated_at: new Date() });

  await auditService.logChange(
    {
      tableName: "lessons",
      recordId: lessonId,
      fieldName: "current_stage_id",
      oldValue: oldStageId,
      newValue: targetStageId,
      changeType: "UPDATE",
    },
    auditCtx
  );

  return { lessonId, previousStageId: oldStageId, currentStageId: targetStageId };
}

export async function assignStageUser(
  lessonId: string,
  stageId: string,
  userId: string | null,
  auditCtx: AuditContext
) {
  const assignment = await db("lesson_stage_assignments")
    .where({ lesson_id: lessonId, stage_id: stageId })
    .first();

  if (!assignment) {
    throw new AppError(404, "Stage assignment not found for this lesson");
  }

  const oldUserId = assignment.user_id;

  await db("lesson_stage_assignments")
    .where({ id: assignment.id })
    .update({ user_id: userId });

  await auditService.logChange(
    {
      tableName: "lesson_stage_assignments",
      recordId: assignment.id,
      fieldName: "user_id",
      oldValue: oldUserId,
      newValue: userId,
      changeType: "UPDATE",
    },
    auditCtx
  );

  return { assignmentId: assignment.id, userId };
}

export async function completeStageAssignment(
  lessonId: string,
  stageId: string,
  auditCtx: AuditContext
) {
  const assignment = await db("lesson_stage_assignments")
    .where({ lesson_id: lessonId, stage_id: stageId })
    .first();

  if (!assignment) {
    throw new AppError(404, "Stage assignment not found");
  }

  if (assignment.completed_at) {
    throw new AppError(400, "This stage assignment is already completed");
  }

  const stage = await db("lesson_workflow_stages").where({ id: stageId }).first();
  if (stage && stage.requires_signature) {
    const signature = await db("electronic_signatures")
      .where({ lesson_id: lessonId, workflow_stage_id: stageId })
      .first();

    if (!signature) {
      throw new AppError(
        400,
        `Stage "${stage.name}" requires an electronic signature before it can be completed.`
      );
    }
  }

  await db("lesson_stage_assignments")
    .where({ id: assignment.id })
    .update({ completed_at: new Date() });

  await auditService.logChange(
    {
      tableName: "lesson_stage_assignments",
      recordId: assignment.id,
      fieldName: "completed_at",
      oldValue: null,
      newValue: new Date().toISOString(),
      changeType: "UPDATE",
    },
    auditCtx
  );

  return { assignmentId: assignment.id, completedAt: new Date() };
}
