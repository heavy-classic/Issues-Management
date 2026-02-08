import db from "../db";
import { AppError } from "../errors/AppError";
import * as auditService from "./auditService";
import type { AuditContext } from "./auditService";

interface CreateAuditParams {
  title: string;
  description?: string;
  audit_type_id: string;
  priority?: "low" | "medium" | "high" | "critical";
  risk_level?: "low" | "medium" | "high" | "critical" | null;
  lead_auditor_id?: string | null;
  auditee_department?: string;
  auditee_contact_id?: string | null;
  objective?: string;
  scope?: string;
  methodology?: string;
  criteria_standards?: string;
  location?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  report_due?: string | null;
}

interface UpdateAuditParams {
  title?: string;
  description?: string;
  audit_type_id?: string;
  status?: "draft" | "scheduled" | "planning" | "in_progress" | "under_review" | "closed" | "cancelled";
  current_phase?: string | null;
  priority?: "low" | "medium" | "high" | "critical";
  risk_level?: "low" | "medium" | "high" | "critical" | null;
  lead_auditor_id?: string | null;
  auditee_department?: string;
  auditee_contact_id?: string | null;
  objective?: string;
  scope?: string;
  methodology?: string;
  criteria_standards?: string;
  location?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  report_due?: string | null;
  overall_rating?: string | null;
  compliance_score?: number | null;
}

interface ListAuditsFilters {
  status?: string;
  audit_type_id?: string;
  lead_auditor_id?: string;
  risk_level?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

async function generateAuditNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const [result] = await db.raw("SELECT nextval('audit_number_seq') as seq");
  const seq = String(result.seq).padStart(4, "0");
  return `AUD-${year}-${seq}`;
}

export async function listAudits(filters: ListAuditsFilters) {
  const query = db("audits")
    .select(
      "audits.*",
      "audit_types.name as type_name",
      "audit_types.color as type_color",
      "audit_types.icon as type_icon",
      "lead.full_name as lead_name",
      "lead.email as lead_email",
      db.raw("(SELECT COUNT(*) FROM audit_team_members WHERE audit_id = audits.id)::int as team_size"),
      db.raw("(SELECT COUNT(*) FROM issues WHERE audit_id = audits.id)::int as findings_count"),
      db.raw("(SELECT COUNT(*) FROM checklist_instances WHERE audit_id = audits.id)::int as checklist_count")
    )
    .leftJoin("audit_types", "audits.audit_type_id", "audit_types.id")
    .leftJoin("users as lead", "audits.lead_auditor_id", "lead.id")
    .orderBy("audits.created_at", "desc");

  if (filters.status) query.where("audits.status", filters.status);
  if (filters.audit_type_id) query.where("audits.audit_type_id", filters.audit_type_id);
  if (filters.lead_auditor_id) query.where("audits.lead_auditor_id", filters.lead_auditor_id);
  if (filters.risk_level) query.where("audits.risk_level", filters.risk_level);
  if (filters.date_from) query.where("audits.scheduled_start", ">=", filters.date_from);
  if (filters.date_to) query.where("audits.scheduled_end", "<=", filters.date_to);
  if (filters.search) {
    query.where(function () {
      this.whereILike("audits.title", `%${filters.search}%`)
        .orWhereILike("audits.audit_number", `%${filters.search}%`)
        .orWhereILike("audits.description", `%${filters.search}%`);
    });
  }

  return query;
}

export async function getAudit(id: string) {
  const audit = await db("audits")
    .select(
      "audits.*",
      "audit_types.name as type_name",
      "audit_types.color as type_color",
      "audit_types.icon as type_icon",
      "audit_types.workflow_phases",
      "lead.full_name as lead_name",
      "lead.email as lead_email",
      "contact.full_name as contact_name",
      "contact.email as contact_email",
      "creator.full_name as creator_name",
      "creator.email as creator_email"
    )
    .leftJoin("audit_types", "audits.audit_type_id", "audit_types.id")
    .leftJoin("users as lead", "audits.lead_auditor_id", "lead.id")
    .leftJoin("users as contact", "audits.auditee_contact_id", "contact.id")
    .leftJoin("users as creator", "audits.created_by", "creator.id")
    .where("audits.id", id)
    .first();

  if (!audit) throw new AppError(404, "Audit not found");

  // Team members
  const team = await db("audit_team_members")
    .select("audit_team_members.*", "users.full_name as user_name", "users.email as user_email")
    .leftJoin("users", "audit_team_members.user_id", "users.id")
    .where("audit_team_members.audit_id", id)
    .orderBy("audit_team_members.role", "asc");

  // Checklist instances
  const instances = await db("checklist_instances")
    .select(
      "checklist_instances.*",
      "checklists.name as checklist_name",
      "users.full_name as assigned_to_name",
      "users.email as assigned_to_email",
      db.raw(`(SELECT COUNT(*) FROM checklist_criteria cc
        JOIN checklist_groups cg ON cc.group_id = cg.id
        WHERE cg.checklist_id = checklist_instances.checklist_id)::int as total_criteria`),
      db.raw(`(SELECT COUNT(*) FROM criterion_responses
        WHERE instance_id = checklist_instances.id)::int as responded_count`)
    )
    .leftJoin("checklists", "checklist_instances.checklist_id", "checklists.id")
    .leftJoin("users", "checklist_instances.assigned_to", "users.id")
    .where("checklist_instances.audit_id", id);

  // Findings (issues linked to this audit)
  const findings = await db("issues")
    .select(
      "issues.id",
      "issues.title",
      "issues.status",
      "issues.priority",
      "issues.finding_severity",
      "issues.created_at",
      "assignee.full_name as assignee_name",
      "assignee.email as assignee_email"
    )
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
    .where("issues.audit_id", id)
    .orderBy("issues.created_at", "desc");

  // Attachments
  const attachments = await db("attachments")
    .select("attachments.*", "users.full_name as uploader_name", "users.email as uploader_email")
    .leftJoin("users", "attachments.uploaded_by", "users.id")
    .where({ "attachments.parent_type": "audit", "attachments.parent_id": id, "attachments.is_deleted": false })
    .orderBy("attachments.uploaded_at", "asc");

  // Meetings
  const meetings = await db("audit_meetings")
    .where("audit_id", id)
    .orderBy("scheduled_date", "asc");

  return { ...audit, team, instances, findings, attachments, meetings };
}

export async function createAudit(
  userId: string,
  params: CreateAuditParams,
  auditCtx: AuditContext
) {
  // Verify audit type exists
  const auditType = await db("audit_types").where({ id: params.audit_type_id }).first();
  if (!auditType) throw new AppError(400, "Invalid audit type");

  const auditNumber = await generateAuditNumber();
  const phases = typeof auditType.workflow_phases === "string"
    ? JSON.parse(auditType.workflow_phases)
    : auditType.workflow_phases;

  const [audit] = await db("audits")
    .insert({
      audit_number: auditNumber,
      title: params.title,
      description: params.description || "",
      audit_type_id: params.audit_type_id,
      status: "draft",
      current_phase: phases?.[0] || null,
      priority: params.priority || "medium",
      risk_level: params.risk_level || null,
      lead_auditor_id: params.lead_auditor_id || null,
      auditee_department: params.auditee_department || "",
      auditee_contact_id: params.auditee_contact_id || null,
      objective: params.objective || "",
      scope: params.scope || "",
      methodology: params.methodology || "",
      criteria_standards: params.criteria_standards || "",
      location: params.location || "",
      scheduled_start: params.scheduled_start || null,
      scheduled_end: params.scheduled_end || null,
      report_due: params.report_due || null,
      created_by: userId,
    })
    .returning("*");

  // Auto-add lead auditor as team member if specified
  if (params.lead_auditor_id) {
    await db("audit_team_members").insert({
      audit_id: audit.id,
      user_id: params.lead_auditor_id,
      role: "lead",
    });
  }

  await auditService.logInsert("audits", audit.id, audit, auditCtx);
  return audit;
}

export async function updateAudit(
  id: string,
  params: UpdateAuditParams,
  auditCtx: AuditContext
) {
  const existing = await db("audits").where({ id }).first();
  if (!existing) throw new AppError(404, "Audit not found");

  const updateData: Record<string, unknown> = {};
  const fields: (keyof UpdateAuditParams)[] = [
    "title", "description", "audit_type_id", "status", "current_phase",
    "priority", "risk_level", "lead_auditor_id", "auditee_department",
    "auditee_contact_id", "objective", "scope", "methodology",
    "criteria_standards", "location", "scheduled_start", "scheduled_end",
    "actual_start", "actual_end", "report_due", "overall_rating", "compliance_score",
  ];

  for (const field of fields) {
    if (params[field] !== undefined) updateData[field] = params[field];
  }

  // Auto-set completed_at when closing
  if (params.status === "closed" && existing.status !== "closed") {
    updateData.completed_at = new Date();
    if (!params.actual_end) updateData.actual_end = new Date().toISOString().split("T")[0];
  }

  if (Object.keys(updateData).length === 0) throw new AppError(400, "No fields to update");
  updateData.updated_at = new Date();

  const [updated] = await db("audits").where({ id }).update(updateData).returning("*");
  await auditService.logFieldChanges("audits", id, existing, updated, auditCtx);
  return updated;
}

export async function deleteAudit(id: string, auditCtx: AuditContext) {
  const existing = await db("audits").where({ id }).first();
  if (!existing) throw new AppError(404, "Audit not found");
  await auditService.logDelete("audits", id, existing, auditCtx);
  await db("audits").where({ id }).del();
}

export async function advancePhase(id: string, auditCtx: AuditContext) {
  const audit = await db("audits")
    .select("audits.*", "audit_types.workflow_phases")
    .leftJoin("audit_types", "audits.audit_type_id", "audit_types.id")
    .where("audits.id", id)
    .first();

  if (!audit) throw new AppError(404, "Audit not found");

  const phases = typeof audit.workflow_phases === "string"
    ? JSON.parse(audit.workflow_phases)
    : audit.workflow_phases;

  if (!Array.isArray(phases) || phases.length === 0) {
    throw new AppError(400, "No workflow phases defined for this audit type");
  }

  const currentIdx = phases.indexOf(audit.current_phase);
  if (currentIdx === -1 || currentIdx >= phases.length - 1) {
    throw new AppError(400, "Already at the final phase");
  }

  const nextPhase = phases[currentIdx + 1];

  // Update status based on phase progression
  let newStatus = audit.status;
  if (currentIdx === 0 && audit.status === "draft") newStatus = "planning";
  if (nextPhase === phases[phases.length - 1]) newStatus = "under_review";

  const updateData: Record<string, unknown> = {
    current_phase: nextPhase,
    status: newStatus,
    updated_at: new Date(),
  };

  // Set actual_start when first advancing from draft
  if (audit.status === "draft" && !audit.actual_start) {
    updateData.actual_start = new Date().toISOString().split("T")[0];
  }

  const [updated] = await db("audits").where({ id }).update(updateData).returning("*");
  await auditService.logFieldChanges("audits", id, audit, updated, auditCtx);
  return updated;
}

// ── Team Members ───────────────────────────────────────────

export async function addTeamMember(
  auditId: string,
  userId: string,
  role: "lead" | "auditor" | "observer",
  auditCtx: AuditContext
) {
  const audit = await db("audits").where({ id: auditId }).first();
  if (!audit) throw new AppError(404, "Audit not found");

  const existing = await db("audit_team_members")
    .where({ audit_id: auditId, user_id: userId })
    .first();

  if (existing) throw new AppError(400, "User is already a team member");

  const [member] = await db("audit_team_members")
    .insert({ audit_id: auditId, user_id: userId, role })
    .returning("*");

  await auditService.logInsert("audit_team_members", member.id, member, auditCtx);
  return member;
}

export async function removeTeamMember(memberId: string, auditCtx: AuditContext) {
  const existing = await db("audit_team_members").where({ id: memberId }).first();
  if (!existing) throw new AppError(404, "Team member not found");
  await auditService.logDelete("audit_team_members", memberId, existing, auditCtx);
  await db("audit_team_members").where({ id: memberId }).del();
}

// ── Checklist Instances ────────────────────────────────────

export async function assignChecklist(
  auditId: string,
  checklistId: string,
  assignedTo: string | null,
  dueDate: string | null,
  auditCtx: AuditContext
) {
  const audit = await db("audits").where({ id: auditId }).first();
  if (!audit) throw new AppError(404, "Audit not found");

  const checklist = await db("checklists").where({ id: checklistId }).first();
  if (!checklist) throw new AppError(400, "Checklist not found");

  const [instance] = await db("checklist_instances")
    .insert({
      audit_id: auditId,
      checklist_id: checklistId,
      assigned_to: assignedTo,
      due_date: dueDate,
    })
    .returning("*");

  await auditService.logInsert("checklist_instances", instance.id, instance, auditCtx);
  return instance;
}

export async function removeChecklistInstance(instanceId: string, auditCtx: AuditContext) {
  const existing = await db("checklist_instances").where({ id: instanceId }).first();
  if (!existing) throw new AppError(404, "Checklist instance not found");
  await auditService.logDelete("checklist_instances", instanceId, existing, auditCtx);
  await db("checklist_instances").where({ id: instanceId }).del();
}

// ── Findings ───────────────────────────────────────────────

export async function createFinding(
  auditId: string,
  userId: string,
  params: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "critical";
    assignee_id?: string | null;
    finding_severity: "observation" | "minor" | "major" | "critical";
    finding_criterion_id?: string | null;
  },
  auditCtx: AuditContext
) {
  const audit = await db("audits").where({ id: auditId }).first();
  if (!audit) throw new AppError(404, "Audit not found");

  const [issue] = await db("issues")
    .insert({
      title: params.title,
      description: params.description || "",
      priority: params.priority || "medium",
      reporter_id: userId,
      assignee_id: params.assignee_id || null,
      audit_id: auditId,
      finding_severity: params.finding_severity,
      finding_criterion_id: params.finding_criterion_id || null,
    })
    .returning("*");

  await auditService.logInsert("issues", issue.id, { ...issue, source: "audit_finding" }, auditCtx);
  return issue;
}

// ── Meetings ───────────────────────────────────────────────

export async function addMeeting(
  auditId: string,
  userId: string,
  params: {
    meeting_type: "opening" | "fieldwork" | "closing" | "other";
    title: string;
    scheduled_date: string;
    attendees?: Array<{ name: string; role: string }>;
    notes?: string;
  },
  auditCtx: AuditContext
) {
  const audit = await db("audits").where({ id: auditId }).first();
  if (!audit) throw new AppError(404, "Audit not found");

  const [meeting] = await db("audit_meetings")
    .insert({
      audit_id: auditId,
      meeting_type: params.meeting_type,
      title: params.title,
      scheduled_date: params.scheduled_date,
      attendees: JSON.stringify(params.attendees || []),
      notes: params.notes || "",
      created_by: userId,
    })
    .returning("*");

  await auditService.logInsert("audit_meetings", meeting.id, meeting, auditCtx);
  return meeting;
}

export async function updateMeeting(
  meetingId: string,
  params: {
    meeting_type?: "opening" | "fieldwork" | "closing" | "other";
    title?: string;
    scheduled_date?: string;
    attendees?: Array<{ name: string; role: string }>;
    notes?: string;
  },
  auditCtx: AuditContext
) {
  const existing = await db("audit_meetings").where({ id: meetingId }).first();
  if (!existing) throw new AppError(404, "Meeting not found");

  const updateData: Record<string, unknown> = {};
  if (params.meeting_type !== undefined) updateData.meeting_type = params.meeting_type;
  if (params.title !== undefined) updateData.title = params.title;
  if (params.scheduled_date !== undefined) updateData.scheduled_date = params.scheduled_date;
  if (params.attendees !== undefined) updateData.attendees = JSON.stringify(params.attendees);
  if (params.notes !== undefined) updateData.notes = params.notes;

  if (Object.keys(updateData).length === 0) throw new AppError(400, "No fields to update");
  updateData.updated_at = new Date();

  const [updated] = await db("audit_meetings").where({ id: meetingId }).update(updateData).returning("*");
  await auditService.logFieldChanges("audit_meetings", meetingId, existing, updated, auditCtx);
  return updated;
}

export async function deleteMeeting(meetingId: string, auditCtx: AuditContext) {
  const existing = await db("audit_meetings").where({ id: meetingId }).first();
  if (!existing) throw new AppError(404, "Meeting not found");
  await auditService.logDelete("audit_meetings", meetingId, existing, auditCtx);
  await db("audit_meetings").where({ id: meetingId }).del();
}
