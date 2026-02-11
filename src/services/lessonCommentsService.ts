import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export async function listComments(lessonId: string) {
  return db("lesson_comments")
    .select(
      "lesson_comments.*",
      "users.full_name as author_name",
      "users.email as author_email"
    )
    .leftJoin("users", "lesson_comments.author_id", "users.id")
    .where("lesson_comments.lesson_id", lessonId)
    .orderBy("lesson_comments.created_at", "asc");
}

export async function addComment(
  lessonId: string,
  authorId: string,
  body: string,
  auditCtx?: AuditContext
) {
  const lesson = await db("lessons").where({ id: lessonId }).first();
  if (!lesson) {
    throw new AppError(404, "Lesson not found");
  }

  const [comment] = await db("lesson_comments")
    .insert({
      lesson_id: lessonId,
      author_id: authorId,
      body,
    })
    .returning("*");

  if (auditCtx) {
    await auditService.logInsert("lesson_comments", comment.id, comment, auditCtx);
  }

  return comment;
}

export async function deleteComment(
  lessonId: string,
  commentId: string,
  userId: string,
  auditCtx?: AuditContext
) {
  const comment = await db("lesson_comments")
    .where({ id: commentId, lesson_id: lessonId })
    .first();

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }
  if (comment.author_id !== userId) {
    throw new AppError(403, "Only the comment author can delete this comment");
  }

  if (auditCtx) {
    await auditService.logDelete("lesson_comments", commentId, comment, auditCtx);
  }

  await db("lesson_comments").where({ id: commentId }).del();
}
