import db from "../db";
import { AppError } from "../errors/AppError";

export async function addComment(
  issueId: string,
  authorId: string,
  body: string
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

  return comment;
}

export async function deleteComment(
  issueId: string,
  commentId: string,
  userId: string
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

  await db("comments").where({ id: commentId }).del();
}
