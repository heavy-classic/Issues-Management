import db from "../db";
import { AppError } from "../errors/AppError";

export async function getAuditExportData(auditId: string) {
  // Full audit detail for PDF generation
  const audit = await db("audits")
    .select(
      "audits.*",
      "audit_types.name as type_name",
      "audit_types.color as type_color",
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
    .where("audits.id", auditId)
    .first();

  if (!audit) throw new AppError(404, "Audit not found");

  // Team
  const team = await db("audit_team_members")
    .select("audit_team_members.*", "users.full_name as user_name", "users.email as user_email")
    .leftJoin("users", "audit_team_members.user_id", "users.id")
    .where("audit_team_members.audit_id", auditId);

  // Checklist instances with responses
  const instances = await db("checklist_instances")
    .select("checklist_instances.*", "checklists.name as checklist_name")
    .leftJoin("checklists", "checklist_instances.checklist_id", "checklists.id")
    .where("checklist_instances.audit_id", auditId);

  for (const instance of instances) {
    const groups = await db("checklist_groups")
      .where("checklist_id", instance.checklist_id)
      .orderBy("position");

    const criteria = await db("checklist_criteria")
      .whereIn("group_id", groups.map((g: any) => g.id))
      .orderBy("position");

    const responses = await db("criterion_responses")
      .where("instance_id", instance.id);

    const responseMap = new Map(responses.map((r: any) => [r.criterion_id, r]));

    instance.groups = groups.map((g: any) => ({
      ...g,
      criteria: criteria
        .filter((c: any) => c.group_id === g.id)
        .map((c: any) => ({
          ...c,
          response: responseMap.get(c.id) || null,
        })),
    }));
  }

  // Findings
  const findings = await db("issues")
    .select(
      "issues.*",
      "assignee.full_name as assignee_name",
      "reporter.full_name as reporter_name"
    )
    .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
    .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
    .where("issues.audit_id", auditId)
    .orderBy("issues.created_at");

  // Meetings
  const meetings = await db("audit_meetings")
    .where("audit_id", auditId)
    .orderBy("scheduled_date");

  return { audit, team, instances, findings, meetings };
}

export async function getAuditCsvData(auditId: string) {
  const data = await getAuditExportData(auditId);

  const rows: string[][] = [];
  rows.push(["Audit Report Summary"]);
  rows.push(["Audit Number", data.audit.audit_number]);
  rows.push(["Title", data.audit.title]);
  rows.push(["Type", data.audit.type_name]);
  rows.push(["Status", data.audit.status]);
  rows.push(["Risk Level", data.audit.risk_level || "N/A"]);
  rows.push(["Lead Auditor", data.audit.lead_name || "Unassigned"]);
  rows.push(["Department", data.audit.auditee_department]);
  rows.push(["Scheduled Start", data.audit.scheduled_start || "N/A"]);
  rows.push(["Scheduled End", data.audit.scheduled_end || "N/A"]);
  rows.push(["Compliance Score", data.audit.compliance_score?.toString() || "N/A"]);
  rows.push(["Overall Rating", data.audit.overall_rating || "N/A"]);
  rows.push([]);

  // Findings section
  rows.push(["Findings"]);
  rows.push(["Title", "Severity", "Priority", "Status", "Assignee", "Created"]);
  for (const f of data.findings) {
    rows.push([
      f.title,
      f.finding_severity || "N/A",
      f.priority,
      f.status,
      f.assignee_name || "Unassigned",
      new Date(f.created_at).toLocaleDateString(),
    ]);
  }
  rows.push([]);

  // Team section
  rows.push(["Team Members"]);
  rows.push(["Name", "Email", "Role"]);
  for (const m of data.team) {
    rows.push([m.user_name || "", m.user_email || "", m.role]);
  }

  // Convert to CSV string
  const csv = rows
    .map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csv;
}
