import db from "../db";
import { AppError } from "../errors/AppError";

export async function listStages() {
  return db("audit_workflow_stages").orderBy("position", "asc");
}

export async function getStage(stageId: string) {
  const stage = await db("audit_workflow_stages").where({ id: stageId }).first();
  if (!stage) throw new AppError(404, "Audit workflow stage not found");
  return stage;
}

interface CreateStageParams {
  name: string;
  description?: string;
  color?: string;
  position: number;
  requires_signature?: boolean;
}

export async function createStage(params: CreateStageParams) {
  await db("audit_workflow_stages")
    .where("position", ">=", params.position)
    .increment("position", 1);

  const [stage] = await db("audit_workflow_stages")
    .insert({
      name: params.name,
      description: params.description || "",
      color: params.color || "#6b7280",
      position: params.position,
      requires_signature: params.requires_signature || false,
    })
    .returning("*");

  return stage;
}

interface UpdateStageParams {
  name?: string;
  description?: string;
  color?: string;
  requires_signature?: boolean;
}

export async function updateStage(stageId: string, params: UpdateStageParams) {
  const existing = await db("audit_workflow_stages").where({ id: stageId }).first();
  if (!existing) throw new AppError(404, "Audit workflow stage not found");

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.color !== undefined) updateData.color = params.color;
  if (params.requires_signature !== undefined) updateData.requires_signature = params.requires_signature;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  const [updated] = await db("audit_workflow_stages")
    .where({ id: stageId })
    .update(updateData)
    .returning("*");

  return updated;
}

export async function deleteStage(stageId: string) {
  const existing = await db("audit_workflow_stages").where({ id: stageId }).first();
  if (!existing) throw new AppError(404, "Audit workflow stage not found");

  const auditCount = await db("audits")
    .where({ current_stage_id: stageId })
    .count("* as count")
    .first();

  if (auditCount && Number(auditCount.count) > 0) {
    throw new AppError(
      400,
      "Cannot delete stage: audits are currently in this stage"
    );
  }

  await db("audit_workflow_stages").where({ id: stageId }).del();

  const remaining = await db("audit_workflow_stages").orderBy("position", "asc");
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      await db("audit_workflow_stages")
        .where({ id: remaining[i].id })
        .update({ position: i });
    }
  }
}

export async function reorderStages(stageIds: string[]) {
  const existing = await db("audit_workflow_stages").select("id");
  const existingIds = new Set(existing.map((s: any) => s.id));

  for (const id of stageIds) {
    if (!existingIds.has(id)) {
      throw new AppError(400, `Stage ${id} not found`);
    }
  }

  await db("audit_workflow_stages").update({
    position: db.raw("position * -1 - 1000"),
  });

  for (let i = 0; i < stageIds.length; i++) {
    await db("audit_workflow_stages")
      .where({ id: stageIds[i] })
      .update({ position: i, updated_at: new Date() });
  }

  return listStages();
}
