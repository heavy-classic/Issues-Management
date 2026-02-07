import crypto from "node:crypto";
import bcrypt from "bcrypt";
import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

export const SIGNATURE_MEANINGS = [
  "Approved",
  "Reviewed",
  "Verified",
  "Authored",
  "Acknowledged",
  "Completed",
] as const;

interface CreateSignatureParams {
  issueId: string;
  workflowStageId: string;
  userId: string;
  password: string;
  signatureMeaning: string;
  signatureReason?: string;
}

function generateSignatureHash(data: {
  issueId: string;
  workflowStageId: string;
  userId: string;
  signerFullName: string;
  signatureMeaning: string;
  signatureTimestamp: string;
}): string {
  const payload = [
    data.issueId,
    data.workflowStageId,
    data.userId,
    data.signerFullName,
    data.signatureMeaning,
    data.signatureTimestamp,
  ].join("|");

  return crypto.createHash("sha512").update(payload).digest("hex");
}

export async function createSignature(
  params: CreateSignatureParams,
  auditCtx: AuditContext
) {
  // Verify user exists and get their info
  const user = await db("users").where({ id: params.userId }).first();
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.full_name) {
    throw new AppError(
      400,
      "A full legal name is required for electronic signatures. Please update your profile."
    );
  }

  // Re-verify password (two-factor authentication for signing)
  const valid = await bcrypt.compare(params.password, user.password_hash);
  if (!valid) {
    throw new AppError(401, "Invalid password. Signature not applied.");
  }

  // Validate signature meaning
  if (!SIGNATURE_MEANINGS.includes(params.signatureMeaning as any)) {
    throw new AppError(400, `Invalid signature meaning. Must be one of: ${SIGNATURE_MEANINGS.join(", ")}`);
  }

  // 60-second cooldown check
  const recentSignature = await db("electronic_signatures")
    .where({ user_id: params.userId })
    .orderBy("signature_timestamp", "desc")
    .first();

  if (recentSignature) {
    const elapsed =
      Date.now() - new Date(recentSignature.signature_timestamp).getTime();
    if (elapsed < 60000) {
      const remaining = Math.ceil((60000 - elapsed) / 1000);
      throw new AppError(
        429,
        `Please wait ${remaining} seconds before signing again.`
      );
    }
  }

  // Check that this stage hasn't already been signed by this user
  const existingSignature = await db("electronic_signatures")
    .where({
      issue_id: params.issueId,
      workflow_stage_id: params.workflowStageId,
      user_id: params.userId,
    })
    .first();

  if (existingSignature) {
    throw new AppError(409, "You have already signed this stage.");
  }

  const signatureTimestamp = new Date().toISOString();
  const signatureHash = generateSignatureHash({
    issueId: params.issueId,
    workflowStageId: params.workflowStageId,
    userId: params.userId,
    signerFullName: user.full_name,
    signatureMeaning: params.signatureMeaning,
    signatureTimestamp,
  });

  const [signature] = await db("electronic_signatures")
    .insert({
      issue_id: params.issueId,
      workflow_stage_id: params.workflowStageId,
      user_id: params.userId,
      signer_full_name: user.full_name,
      signature_timestamp: signatureTimestamp,
      signature_meaning: params.signatureMeaning,
      signature_reason: params.signatureReason || null,
      ip_address: auditCtx.ipAddress || null,
      user_agent: auditCtx.userAgent || null,
      signature_hash: signatureHash,
    })
    .returning("*");

  await auditService.logChange(
    {
      tableName: "electronic_signatures",
      recordId: signature.id,
      newValue: {
        issue_id: params.issueId,
        workflow_stage_id: params.workflowStageId,
        signer_full_name: user.full_name,
        signature_meaning: params.signatureMeaning,
        signature_reason: params.signatureReason,
      },
      changeType: "SIGNATURE",
    },
    auditCtx
  );

  return signature;
}

export async function getSignature(signatureId: string) {
  const signature = await db("electronic_signatures")
    .where({ id: signatureId })
    .first();

  if (!signature) {
    throw new AppError(404, "Signature not found");
  }

  return signature;
}

export async function getSignaturesForIssue(issueId: string) {
  return db("electronic_signatures")
    .select(
      "electronic_signatures.*",
      "workflow_stages.name as stage_name",
      "workflow_stages.position as stage_position"
    )
    .leftJoin(
      "workflow_stages",
      "electronic_signatures.workflow_stage_id",
      "workflow_stages.id"
    )
    .where("electronic_signatures.issue_id", issueId)
    .orderBy("electronic_signatures.signature_timestamp", "asc");
}

export async function getSignaturesForStage(
  issueId: string,
  stageId: string
) {
  return db("electronic_signatures")
    .where({ issue_id: issueId, workflow_stage_id: stageId })
    .orderBy("signature_timestamp", "asc");
}

export async function verifySignatureHash(signatureId: string) {
  const signature = await db("electronic_signatures")
    .where({ id: signatureId })
    .first();

  if (!signature) {
    throw new AppError(404, "Signature not found");
  }

  const expectedHash = generateSignatureHash({
    issueId: signature.issue_id,
    workflowStageId: signature.workflow_stage_id,
    userId: signature.user_id,
    signerFullName: signature.signer_full_name,
    signatureMeaning: signature.signature_meaning,
    signatureTimestamp: new Date(signature.signature_timestamp).toISOString(),
  });

  return {
    signature,
    valid: expectedHash === signature.signature_hash,
    expectedHash,
    storedHash: signature.signature_hash,
  };
}
