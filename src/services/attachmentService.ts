import db from "../db";
import path from "path";
import fs from "fs";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface UploadedFileInfo {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

function getRelativePath(absolutePath: string): string {
  const projectRoot = path.resolve(__dirname, "../..");
  return path.relative(projectRoot, absolutePath).replace(/\\/g, "/");
}

function getAbsolutePath(relativePath: string): string {
  const projectRoot = path.resolve(__dirname, "../..");
  return path.join(projectRoot, relativePath);
}

type AttachmentParentType = "issue" | "action" | "audit" | "checklist_response" | "lesson";

const parentTableMap: Record<AttachmentParentType, string> = {
  issue: "issues",
  action: "actions",
  audit: "audits",
  checklist_response: "criterion_responses",
  lesson: "lessons",
};

async function verifyParentExists(
  parentId: string,
  parentType: AttachmentParentType
): Promise<void> {
  const table = parentTableMap[parentType];
  const record = await db(table).where({ id: parentId }).first();
  if (!record) {
    throw new AppError(404, `${parentType} record not found`);
  }
}

export async function uploadAttachments(
  parentId: string,
  parentType: AttachmentParentType,
  files: UploadedFileInfo[],
  userId: string,
  auditCtx: AuditContext
) {
  await verifyParentExists(parentId, parentType);

  const records = files.map((file) => ({
    parent_id: parentId,
    parent_type: parentType,
    file_name: file.filename,
    original_name: file.originalname,
    file_path: getRelativePath(file.path),
    file_size: file.size,
    mime_type: file.mimetype,
    file_extension: path.extname(file.originalname).toLowerCase(),
    uploaded_by: userId,
  }));

  const inserted = await db("attachments").insert(records).returning("*");

  for (const att of inserted) {
    await auditService.logInsert("attachments", att.id, att, auditCtx);
  }

  return inserted;
}

export async function listAttachments(
  parentId: string,
  parentType: AttachmentParentType
) {
  return db("attachments")
    .select(
      "attachments.*",
      "users.name as uploader_name",
      "users.email as uploader_email"
    )
    .leftJoin("users", "attachments.uploaded_by", "users.id")
    .where({
      "attachments.parent_id": parentId,
      "attachments.parent_type": parentType,
      "attachments.is_deleted": false,
    })
    .orderBy("attachments.uploaded_at", "asc");
}

export async function getAttachment(attachmentId: string) {
  const attachment = await db("attachments")
    .select(
      "attachments.*",
      "users.name as uploader_name",
      "users.email as uploader_email"
    )
    .leftJoin("users", "attachments.uploaded_by", "users.id")
    .where({ "attachments.id": attachmentId, "attachments.is_deleted": false })
    .first();

  if (!attachment) {
    throw new AppError(404, "Attachment not found");
  }
  return attachment;
}

export async function getAttachmentFilePath(attachmentId: string) {
  const attachment = await getAttachment(attachmentId);
  const absolutePath = getAbsolutePath(attachment.file_path);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError(404, "File not found on disk");
  }

  return {
    absolutePath,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
  };
}

export async function incrementDownloadCount(
  attachmentId: string
): Promise<void> {
  await db("attachments")
    .where({ id: attachmentId })
    .increment("download_count", 1);
}

export async function softDeleteAttachment(
  attachmentId: string,
  userId: string,
  auditCtx: AuditContext
): Promise<void> {
  const attachment = await db("attachments")
    .where({ id: attachmentId, is_deleted: false })
    .first();

  if (!attachment) {
    throw new AppError(404, "Attachment not found");
  }

  await db("attachments").where({ id: attachmentId }).update({
    is_deleted: true,
    deleted_at: new Date(),
    deleted_by: userId,
  });

  await auditService.logDelete(
    "attachments",
    attachmentId,
    attachment,
    auditCtx
  );
}
