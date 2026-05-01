import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListProceduresFilters {
  status?: string;
  procedure_type?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

interface CreateProcedureParams {
  procedure_number: string;
  title: string;
  procedure_type?: string;
  status?: string;
  revision_number?: number;
  revision_date?: string | null;
  revision_description?: string | null;
  approval_date?: string | null;
  approved_by?: string | null;
  building_unit?: string | null;
  safety_classification?: string | null;
  purpose?: string | null;
  scope?: string | null;
  applicability?: string | null;
  precautions?: string | null;
  prereq_planning?: string | null;
  prereq_documents?: string | null;
  prereq_tools?: string | null;
  prereq_field_prep?: string | null;
  prereq_approvals?: string | null;
  post_testing?: string | null;
  post_restoration?: string | null;
  post_results?: string | null;
  records_section?: string | null;
  source_requirements?: string | null;
}

type UpdateProcedureParams = Partial<CreateProcedureParams>;

interface CreateSectionParams {
  title: string;
  sequence_number: number;
}

interface CreateStepParams {
  step_text: string;
  sequence_number: number;
  step_type?: string;
  step_level?: number;
  parent_step_id?: string | null;
  condition_text?: string | null;
  is_nonsequential?: boolean;
}

type UpdateStepParams = Partial<CreateStepParams>;

interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning" | "suggestion";
}

// ---------------------------------------------------------------------------
// Sort column allowlist
// ---------------------------------------------------------------------------

const SORT_COLUMNS: Record<string, string> = {
  procedure_number: "procedures.procedure_number",
  title: "procedures.title",
  status: "procedures.status",
  procedure_type: "procedures.procedure_type",
  revision_date: "procedures.revision_date",
  created_at: "procedures.created_at",
  updated_at: "procedures.updated_at",
  author: "author.name",
};

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listProcedures(filters: ListProceduresFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const sortCol = SORT_COLUMNS[filters.sort_by || ""] || "procedures.procedure_number";
  const sortDir = filters.sort_dir === "desc" ? "desc" : "asc";

  const baseQuery = db("procedures").leftJoin(
    "users as author",
    "procedures.author_id",
    "author.id"
  );

  if (filters.status) baseQuery.where("procedures.status", filters.status);
  if (filters.procedure_type)
    baseQuery.where("procedures.procedure_type", filters.procedure_type);
  if (filters.search) {
    baseQuery.where(function () {
      this.whereILike("procedures.title", `%${filters.search}%`).orWhereILike(
        "procedures.procedure_number",
        `%${filters.search}%`
      );
    });
  }

  const countResult = await baseQuery
    .clone()
    .count("procedures.id as count")
    .first();
  const total = Number(countResult?.count || 0);

  const procedures = await baseQuery
    .clone()
    .select(
      "procedures.*",
      "author.name as author_name",
      "author.email as author_email"
    )
    .orderBy(sortCol, sortDir)
    .limit(limit)
    .offset((page - 1) * limit);

  return { procedures, total, page, limit };
}

// ---------------------------------------------------------------------------
// Get single
// ---------------------------------------------------------------------------

export async function getProcedure(id: string) {
  const procedure = await db("procedures")
    .select(
      "procedures.*",
      "author.name as author_name",
      "author.email as author_email",
      "approver.name as approved_by_name",
      "approver.email as approved_by_email"
    )
    .leftJoin("users as author", "procedures.author_id", "author.id")
    .leftJoin("users as approver", "procedures.approved_by", "approver.id")
    .where("procedures.id", id)
    .first();

  if (!procedure) {
    throw new AppError(404, "Procedure not found");
  }

  const sections = await db("procedure_sections")
    .where({ procedure_id: id })
    .orderBy("sequence_number", "asc");

  const sectionIds = sections.map((s: { id: string }) => s.id);

  const steps =
    sectionIds.length > 0
      ? await db("procedure_steps")
          .whereIn("section_id", sectionIds)
          .orderBy("sequence_number", "asc")
      : [];

  // Group steps by section_id
  const stepsBySection: Record<string, unknown[]> = {};
  for (const step of steps) {
    const sid = (step as { section_id: string }).section_id;
    if (!stepsBySection[sid]) stepsBySection[sid] = [];
    stepsBySection[sid].push(step);
  }

  const sectionsWithSteps = sections.map((s: { id: string }) => ({
    ...s,
    steps: stepsBySection[s.id] || [],
  }));

  const revisions = await db("procedure_revisions")
    .select(
      "procedure_revisions.*",
      "users.name as author_name",
      "users.email as author_email"
    )
    .leftJoin("users", "procedure_revisions.author_id", "users.id")
    .where({ procedure_id: id })
    .orderBy("revision_number", "desc");

  return { ...procedure, sections: sectionsWithSteps, revisions };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createProcedure(
  authorId: string,
  params: CreateProcedureParams,
  auditCtx?: AuditContext
) {
  const [procedure] = await db("procedures")
    .insert({
      procedure_number: params.procedure_number,
      title: params.title,
      procedure_type: params.procedure_type || null,
      status: params.status || "draft",
      revision_number: params.revision_number ?? 0,
      revision_date: params.revision_date || null,
      revision_description: params.revision_description || null,
      approval_date: params.approval_date || null,
      approved_by: params.approved_by || null,
      building_unit: params.building_unit || null,
      safety_classification: params.safety_classification || null,
      purpose: params.purpose || null,
      scope: params.scope || null,
      applicability: params.applicability || null,
      precautions: params.precautions || null,
      prereq_planning: params.prereq_planning || null,
      prereq_documents: params.prereq_documents || null,
      prereq_tools: params.prereq_tools || null,
      prereq_field_prep: params.prereq_field_prep || null,
      prereq_approvals: params.prereq_approvals || null,
      post_testing: params.post_testing || null,
      post_restoration: params.post_restoration || null,
      post_results: params.post_results || null,
      records_section: params.records_section || null,
      source_requirements: params.source_requirements || null,
      author_id: authorId,
    })
    .returning("*");

  if (auditCtx) {
    await auditService.logInsert("procedures", procedure.id, procedure, auditCtx);
  }

  return procedure;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateProcedure(
  id: string,
  params: UpdateProcedureParams,
  auditCtx?: AuditContext
) {
  const existing = await db("procedures").where({ id }).first();
  if (!existing) {
    throw new AppError(404, "Procedure not found");
  }

  const updateData: Record<string, unknown> = {};
  const textFields: (keyof UpdateProcedureParams)[] = [
    "procedure_number",
    "title",
    "procedure_type",
    "status",
    "revision_description",
    "building_unit",
    "safety_classification",
    "purpose",
    "scope",
    "applicability",
    "precautions",
    "prereq_planning",
    "prereq_documents",
    "prereq_tools",
    "prereq_field_prep",
    "prereq_approvals",
    "post_testing",
    "post_restoration",
    "post_results",
    "records_section",
    "source_requirements",
    "revision_date",
    "approval_date",
    "approved_by",
  ];

  for (const field of textFields) {
    if (params[field] !== undefined) {
      updateData[field] = params[field];
    }
  }

  if (params.revision_number !== undefined) {
    updateData.revision_number = params.revision_number;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  const [updated] = await db("procedures")
    .where({ id })
    .update(updateData)
    .returning("*");

  if (auditCtx) {
    await auditService.logFieldChanges("procedures", id, existing, updated, auditCtx);
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteProcedure(id: string, auditCtx?: AuditContext) {
  const procedure = await db("procedures").where({ id }).first();
  if (!procedure) {
    throw new AppError(404, "Procedure not found");
  }

  if (auditCtx) {
    await auditService.logDelete("procedures", id, procedure, auditCtx);
  }

  await db("procedures").where({ id }).del();
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function addSection(procedureId: string, params: CreateSectionParams) {
  const procedure = await db("procedures").where({ id: procedureId }).first();
  if (!procedure) {
    throw new AppError(404, "Procedure not found");
  }

  const [section] = await db("procedure_sections")
    .insert({
      procedure_id: procedureId,
      title: params.title,
      sequence_number: params.sequence_number,
    })
    .returning("*");

  return section;
}

export async function updateSection(sectionId: string, params: { title?: string; sequence_number?: number }) {
  const existing = await db("procedure_sections").where({ id: sectionId }).first();
  if (!existing) {
    throw new AppError(404, "Section not found");
  }

  const updateData: Record<string, unknown> = {};
  if (params.title !== undefined) updateData.title = params.title;
  if (params.sequence_number !== undefined) updateData.sequence_number = params.sequence_number;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  const [updated] = await db("procedure_sections")
    .where({ id: sectionId })
    .update(updateData)
    .returning("*");

  return updated;
}

export async function deleteSection(sectionId: string) {
  const section = await db("procedure_sections").where({ id: sectionId }).first();
  if (!section) {
    throw new AppError(404, "Section not found");
  }
  await db("procedure_sections").where({ id: sectionId }).del();
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export async function addStep(sectionId: string, params: CreateStepParams) {
  const section = await db("procedure_sections").where({ id: sectionId }).first();
  if (!section) {
    throw new AppError(404, "Section not found");
  }

  const [step] = await db("procedure_steps")
    .insert({
      section_id: sectionId,
      step_text: params.step_text,
      sequence_number: params.sequence_number,
      step_type: params.step_type || "BASIC",
      step_level: params.step_level || 1,
      parent_step_id: params.parent_step_id || null,
      condition_text: params.condition_text || null,
      is_nonsequential: params.is_nonsequential || false,
    })
    .returning("*");

  return step;
}

export async function updateStep(stepId: string, params: UpdateStepParams) {
  const existing = await db("procedure_steps").where({ id: stepId }).first();
  if (!existing) {
    throw new AppError(404, "Step not found");
  }

  const updateData: Record<string, unknown> = {};
  if (params.step_text !== undefined) updateData.step_text = params.step_text;
  if (params.sequence_number !== undefined) updateData.sequence_number = params.sequence_number;
  if (params.step_type !== undefined) updateData.step_type = params.step_type;
  if (params.step_level !== undefined) updateData.step_level = params.step_level;
  if (params.parent_step_id !== undefined) updateData.parent_step_id = params.parent_step_id;
  if (params.condition_text !== undefined) updateData.condition_text = params.condition_text;
  if (params.is_nonsequential !== undefined) updateData.is_nonsequential = params.is_nonsequential;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  const [updated] = await db("procedure_steps")
    .where({ id: stepId })
    .update(updateData)
    .returning("*");

  return updated;
}

export async function deleteStep(stepId: string) {
  const step = await db("procedure_steps").where({ id: stepId }).first();
  if (!step) {
    throw new AppError(404, "Step not found");
  }
  await db("procedure_steps").where({ id: stepId }).del();
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

export async function addRevision(
  procedureId: string,
  params: { revision_number: number; revision_date?: string; description: string },
  authorId?: string
) {
  const procedure = await db("procedures").where({ id: procedureId }).first();
  if (!procedure) {
    throw new AppError(404, "Procedure not found");
  }

  const [revision] = await db("procedure_revisions")
    .insert({
      procedure_id: procedureId,
      revision_number: params.revision_number,
      revision_date: params.revision_date || null,
      description: params.description,
      author_id: authorId || null,
    })
    .returning("*");

  return revision;
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

export async function validateProcedure(id: string): Promise<ValidationIssue[]> {
  const proc = await getProcedure(id);
  const issues: ValidationIssue[] = [];

  // Required introduction fields
  if (!proc.purpose?.trim()) {
    issues.push({ field: "purpose", message: "Purpose is required (DOE-STD-1029 Section 4.1)", severity: "error" });
  }
  if (!proc.scope?.trim()) {
    issues.push({ field: "scope", message: "Scope is required (DOE-STD-1029 Section 4.1)", severity: "error" });
  }
  if (!proc.applicability?.trim()) {
    issues.push({ field: "applicability", message: "Applicability is required (DOE-STD-1029 Section 4.1)", severity: "error" });
  }

  // Source requirements
  if (!proc.source_requirements?.trim()) {
    issues.push({ field: "source_requirements", message: "Source requirements traceability is required", severity: "error" });
  }

  // Precautions
  if (!proc.precautions?.trim()) {
    issues.push({ field: "precautions", message: "Precautions and Limitations section is required", severity: "warning" });
  }

  // Post-performance
  if (!proc.post_testing?.trim()) {
    issues.push({ field: "post_testing", message: "Post-performance testing/checkout is required", severity: "warning" });
  }
  if (!proc.post_restoration?.trim()) {
    issues.push({ field: "post_restoration", message: "Post-performance restoration is required", severity: "warning" });
  }
  if (!proc.post_results?.trim()) {
    issues.push({ field: "post_results", message: "Post-performance results documentation is required", severity: "warning" });
  }

  // Sections and steps
  if (!proc.sections || proc.sections.length === 0) {
    issues.push({ field: "sections", message: "Procedure must have at least one performance section", severity: "error" });
  } else {
    for (const section of proc.sections as Array<{ title: string; steps: Array<{ step_text: string }> }>) {
      if (!section.steps || section.steps.length === 0) {
        issues.push({
          field: "sections",
          message: `Section "${section.title}" has no steps`,
          severity: "error",
        });
      }

      // Check step text quality
      const prohibitedWords = /\b(shall|will|should|must)\b/i;
      for (const step of section.steps || []) {
        if (prohibitedWords.test(step.step_text)) {
          issues.push({
            field: "steps",
            message: `Step "${step.step_text.slice(0, 60)}..." contains policy language (shall/will/should/must). Use imperative action verbs instead.`,
            severity: "warning",
          });
        }
        // Check for lowercase first character (steps should start with capital)
        const trimmed = step.step_text.trimStart();
        if (trimmed.length > 0 && trimmed[0] === trimmed[0].toLowerCase() && /[a-z]/.test(trimmed[0])) {
          issues.push({
            field: "steps",
            message: `Step "${step.step_text.slice(0, 60)}..." begins with a lowercase letter. Steps should start with an imperative verb.`,
            severity: "suggestion",
          });
        }
      }
    }
  }

  return issues;
}
