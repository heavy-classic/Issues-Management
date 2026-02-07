import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export async function addComment(
  issueId: string,
  authorId: string,
  body: string,
  auditCtx?: AuditContext
) {
  const issue = await db("issues").where({ id: issueId }).first();
  if (!issue) {
    throw new AppError(404, "Issue not found");
  }

  const [comment] = await db("comments")
    .insert({
      issue_id: issueId,
      author_id: authorId,
      body,
    })
    .returning("*");

  if (auditCtx) {
    await auditService.logInsert("comments", comment.id, comment, auditCtx);
  }

  return comment;
}

export async function deleteComment(
  issueId: string,
  commentId: string,
  userId: string,
  auditCtx?: AuditContext
) {
  const comment = await db("comments")
    .where({ id: commentId, issue_id: issueId })
    .first();

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }
  if (comment.author_id !== userId) {
    throw new AppError(403, "Only the comment author can delete this comment");
  }

  if (auditCtx) {
    await auditService.logDelete("comments", commentId, comment, auditCtx);
  }

  await db("comments").where({ id: commentId }).del();
}
