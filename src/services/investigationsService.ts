import crypto from "crypto";
import db from "../db";
import { AppError } from "../errors/AppError";

type InvestigationType = "barrier_analysis" | "five_why" | "fishbone";
type InvestigationStatus = "draft" | "complete";

interface CreateInvestigationParams {
  type: InvestigationType;
  title: string;
  body?: Record<string, unknown>;
}

interface UpdateInvestigationParams {
  title?: string;
  status?: InvestigationStatus;
  body?: Record<string, unknown>;
}

function defaultBody(type: InvestigationType): Record<string, unknown> {
  switch (type) {
    case "barrier_analysis":
      return {
        incident_description: "",
        hazard: "",
        target: "",
        barriers: [],
        recommendations: "",
      };
    case "five_why":
      return {
        problem_statement: "",
        whys: [
          { question: "", answer: "" },
          { question: "", answer: "" },
          { question: "", answer: "" },
          { question: "", answer: "" },
          { question: "", answer: "" },
        ],
        root_cause: "",
        corrective_action: "",
      };
    case "fishbone":
      return {
        problem_statement: "",
        categories: [
          { id: crypto.randomUUID(), name: "Machine", causes: [] },
          { id: crypto.randomUUID(), name: "Method", causes: [] },
          { id: crypto.randomUUID(), name: "Material", causes: [] },
          { id: crypto.randomUUID(), name: "Man", causes: [] },
          { id: crypto.randomUUID(), name: "Measurement", causes: [] },
          { id: crypto.randomUUID(), name: "Environment", causes: [] },
        ],
        root_cause: "",
      };
  }
}

export async function listInvestigations(issueId: string) {
  const investigations = await db("investigations")
    .select(
      "investigations.id",
      "investigations.issue_id",
      "investigations.type",
      "investigations.title",
      "investigations.status",
      "investigations.created_by",
      "investigations.created_at",
      "investigations.updated_at",
      db.raw("COALESCE(users.full_name, users.name) as creator_name")
    )
    .leftJoin("users", "investigations.created_by", "users.id")
    .where("investigations.issue_id", issueId)
    .orderBy("investigations.created_at", "asc");

  return investigations;
}

export async function getInvestigation(investigationId: string) {
  const investigation = await db("investigations")
    .select(
      "investigations.*",
      db.raw("COALESCE(users.full_name, users.name) as creator_name")
    )
    .leftJoin("users", "investigations.created_by", "users.id")
    .where("investigations.id", investigationId)
    .first();

  if (!investigation) {
    throw new AppError(404, "Investigation not found");
  }

  return investigation;
}

export async function createInvestigation(
  issueId: string,
  createdBy: string,
  params: CreateInvestigationParams
) {
  const body = params.body ?? defaultBody(params.type);

  const [investigation] = await db("investigations")
    .insert({
      issue_id: issueId,
      created_by: createdBy,
      type: params.type,
      title: params.title,
      body: JSON.stringify(body),
    })
    .returning("*");

  return investigation;
}

export async function updateInvestigation(
  investigationId: string,
  params: UpdateInvestigationParams
) {
  const existing = await db("investigations")
    .where({ id: investigationId })
    .first();

  if (!existing) {
    throw new AppError(404, "Investigation not found");
  }

  const updateData: Record<string, unknown> = {};

  if (params.title !== undefined) updateData.title = params.title;
  if (params.status !== undefined) updateData.status = params.status;

  if (params.body !== undefined) {
    // Merge the incoming body fields into the existing JSONB body
    await db("investigations")
      .where({ id: investigationId })
      .update({
        ...updateData,
        body: db.raw("body || ?::jsonb", [JSON.stringify(params.body)]),
        updated_at: new Date(),
      });

    return getInvestigation(investigationId);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  await db("investigations").where({ id: investigationId }).update(updateData);

  return getInvestigation(investigationId);
}

export async function deleteInvestigation(investigationId: string) {
  const existing = await db("investigations")
    .where({ id: investigationId })
    .first();

  if (!existing) {
    throw new AppError(404, "Investigation not found");
  }

  await db("investigations").where({ id: investigationId }).del();
}
