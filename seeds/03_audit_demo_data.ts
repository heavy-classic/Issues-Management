import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if audit data already exists
  const existing = await knex("audit_types").first();
  if (existing) {
    console.log("Audit seed data already exists, skipping...");
    return;
  }

  // Get existing users
  const admin = await knex("users").where({ email: "admin@example.com" }).first();
  const john = await knex("users").where({ email: "john.smith@example.com" }).first();
  const jane = await knex("users").where({ email: "jane.doe@example.com" }).first();
  const bob = await knex("users").where({ email: "bob.wilson@example.com" }).first();

  if (!admin || !john || !jane || !bob) {
    console.log("Required users not found. Run 01_demo_data seed first.");
    return;
  }

  // ── Audit Types ──────────────────────────────────────────────
  const [internalType] = await knex("audit_types")
    .insert({
      name: "Internal Audit",
      description: "Standard internal quality audit to assess compliance with internal procedures and standards.",
      color: "#667eea",
      icon: "\u{1F50D}",
      workflow_phases: JSON.stringify(["Planning", "Fieldwork", "Review", "Closeout"]),
      checklist_settings: JSON.stringify({ required: true, max_checklists: 5 }),
      team_settings: JSON.stringify({ min_team_size: 2, require_lead: true }),
      is_active: true,
      created_by: admin.id,
    })
    .returning("*");

  const [supplierType] = await knex("audit_types")
    .insert({
      name: "Supplier Audit",
      description: "Audit of external suppliers and vendors to verify quality management systems and compliance.",
      color: "#f59e0b",
      icon: "\u{1F4E6}",
      workflow_phases: JSON.stringify(["Preparation", "On-Site Audit", "Report Writing", "Follow-Up"]),
      checklist_settings: JSON.stringify({ required: true, max_checklists: 10 }),
      team_settings: JSON.stringify({ min_team_size: 1, require_lead: true }),
      is_active: true,
      created_by: admin.id,
    })
    .returning("*");

  const [regulatoryType] = await knex("audit_types")
    .insert({
      name: "Regulatory Compliance",
      description: "Focused audit to verify compliance with regulatory requirements and industry standards.",
      color: "#ef4444",
      icon: "\u2696\uFE0F",
      workflow_phases: JSON.stringify(["Scoping", "Evidence Collection", "Assessment", "Remediation", "Closeout"]),
      checklist_settings: JSON.stringify({ required: true, max_checklists: 15 }),
      team_settings: JSON.stringify({ min_team_size: 2, require_lead: true }),
      is_active: true,
      created_by: admin.id,
    })
    .returning("*");

  await knex("audit_types").insert({
    name: "Process Audit",
    description: "Evaluation of specific processes for efficiency, effectiveness, and adherence to documented procedures.",
    color: "#10b981",
    icon: "\u2699\uFE0F",
    workflow_phases: JSON.stringify(["Planning", "Observation", "Analysis", "Reporting"]),
    checklist_settings: JSON.stringify({ required: false, max_checklists: 5 }),
    team_settings: JSON.stringify({ min_team_size: 1, require_lead: true }),
    is_active: true,
    created_by: admin.id,
  });

  // ── Checklists ──────────────────────────────────────────────
  const [isoChecklist] = await knex("checklists")
    .insert({
      name: "ISO 9001:2015 QMS Audit Checklist",
      description: "Comprehensive checklist for ISO 9001 quality management system audits.",
      instructions: "For each criterion, assess the organization's compliance. Document evidence and note any nonconformities.",
      status: "active",
      version: 1,
      created_by: admin.id,
    })
    .returning("*");

  const [supplierChecklist] = await knex("checklists")
    .insert({
      name: "Supplier Qualification Checklist",
      description: "Standard checklist for evaluating new and existing supplier quality systems.",
      instructions: "Review supplier documentation and on-site evidence. Rate each criterion based on observed practices.",
      status: "active",
      version: 1,
      created_by: admin.id,
    })
    .returning("*");

  await knex("checklists").insert({
    name: "GMP Compliance Checklist",
    description: "Good Manufacturing Practice compliance assessment checklist.",
    instructions: "Assess each GMP requirement. Use 'N/A' where a criterion does not apply to the operation being audited.",
    status: "draft",
    version: 1,
    created_by: admin.id,
  });

  // ── Checklist Groups & Criteria ──────────────────────────────
  // ISO 9001 checklist groups
  const [isoGroup1] = await knex("checklist_groups")
    .insert({
      checklist_id: isoChecklist.id,
      name: "4. Context of the Organization",
      position: 0,
    })
    .returning("*");

  const [isoGroup2] = await knex("checklist_groups")
    .insert({
      checklist_id: isoChecklist.id,
      name: "5. Leadership",
      position: 1,
    })
    .returning("*");

  const [isoGroup3] = await knex("checklist_groups")
    .insert({
      checklist_id: isoChecklist.id,
      name: "6. Planning",
      position: 2,
    })
    .returning("*");

  const [isoGroup4] = await knex("checklist_groups")
    .insert({
      checklist_id: isoChecklist.id,
      name: "7. Support",
      position: 3,
    })
    .returning("*");

  // ISO criteria
  await knex("checklist_criteria").insert([
    {
      group_id: isoGroup1.id,
      criterion_id_display: "4.1",
      text: "Has the organization determined external and internal issues relevant to its purpose and strategic direction?",
      reference_citation: "ISO 9001:2015 Clause 4.1",
      answer_type: "compliant",
      risk_rating: "medium",
      weight: 1.0,
      help_text: "Look for documented SWOT analysis, environmental scans, or strategic planning records.",
      position: 0,
    },
    {
      group_id: isoGroup1.id,
      criterion_id_display: "4.2",
      text: "Are interested parties and their requirements identified and monitored?",
      reference_citation: "ISO 9001:2015 Clause 4.2",
      answer_type: "compliant",
      risk_rating: "medium",
      weight: 1.0,
      help_text: "Review stakeholder registers and requirement matrices.",
      position: 1,
    },
    {
      group_id: isoGroup1.id,
      criterion_id_display: "4.3",
      text: "Is the scope of the QMS clearly defined and documented?",
      reference_citation: "ISO 9001:2015 Clause 4.3",
      answer_type: "yes_no",
      risk_rating: "high",
      weight: 1.5,
      help_text: "Verify the QMS scope statement covers all relevant products, services, and locations.",
      position: 2,
    },
    {
      group_id: isoGroup2.id,
      criterion_id_display: "5.1",
      text: "Does top management demonstrate leadership and commitment to the QMS?",
      reference_citation: "ISO 9001:2015 Clause 5.1",
      answer_type: "rating_scale",
      risk_rating: "high",
      weight: 2.0,
      help_text: "Interview top management. Review management review records and resource allocation decisions.",
      position: 0,
    },
    {
      group_id: isoGroup2.id,
      criterion_id_display: "5.2",
      text: "Is a quality policy established, communicated, and understood throughout the organization?",
      reference_citation: "ISO 9001:2015 Clause 5.2",
      answer_type: "yes_no",
      risk_rating: "medium",
      weight: 1.0,
      help_text: "Check if the policy is posted, communicated in training, and understood by employees at all levels.",
      position: 1,
    },
    {
      group_id: isoGroup3.id,
      criterion_id_display: "6.1",
      text: "Are risks and opportunities identified and addressed through planned actions?",
      reference_citation: "ISO 9001:2015 Clause 6.1",
      answer_type: "compliant",
      risk_rating: "high",
      weight: 2.0,
      help_text: "Review risk registers, risk assessment methodologies, and evidence of risk-based decision making.",
      position: 0,
    },
    {
      group_id: isoGroup3.id,
      criterion_id_display: "6.2",
      text: "Are quality objectives established, measurable, and consistent with the quality policy?",
      reference_citation: "ISO 9001:2015 Clause 6.2",
      answer_type: "expectations",
      risk_rating: "medium",
      weight: 1.5,
      help_text: "Verify objectives are SMART and have defined plans for achievement.",
      position: 1,
    },
    {
      group_id: isoGroup4.id,
      criterion_id_display: "7.1",
      text: "Are adequate resources provided for the QMS?",
      reference_citation: "ISO 9001:2015 Clause 7.1",
      answer_type: "rating_scale",
      risk_rating: "medium",
      weight: 1.0,
      help_text: "Review resource allocation, staffing levels, equipment availability, and budget assignments.",
      position: 0,
    },
    {
      group_id: isoGroup4.id,
      criterion_id_display: "7.2",
      text: "Are personnel competent based on education, training, skills, and experience?",
      reference_citation: "ISO 9001:2015 Clause 7.2",
      answer_type: "compliant",
      risk_rating: "high",
      weight: 1.5,
      help_text: "Review training records, competency matrices, and qualification records.",
      position: 1,
    },
  ]);

  // Supplier checklist groups
  const [supGroup1] = await knex("checklist_groups")
    .insert({
      checklist_id: supplierChecklist.id,
      name: "Quality System",
      position: 0,
    })
    .returning("*");

  const [supGroup2] = await knex("checklist_groups")
    .insert({
      checklist_id: supplierChecklist.id,
      name: "Production Controls",
      position: 1,
    })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: supGroup1.id,
      criterion_id_display: "SQ-001",
      text: "Does the supplier have a documented quality management system?",
      answer_type: "yes_no",
      risk_rating: "critical",
      weight: 3.0,
      position: 0,
    },
    {
      group_id: supGroup1.id,
      criterion_id_display: "SQ-002",
      text: "Is the supplier certified to an applicable quality standard (ISO 9001, AS9100, etc.)?",
      answer_type: "yes_no_na",
      risk_rating: "high",
      weight: 2.0,
      position: 1,
    },
    {
      group_id: supGroup1.id,
      criterion_id_display: "SQ-003",
      text: "Does the supplier maintain records of management reviews?",
      answer_type: "compliant",
      risk_rating: "medium",
      weight: 1.0,
      position: 2,
    },
    {
      group_id: supGroup2.id,
      criterion_id_display: "PC-001",
      text: "Are production processes documented and controlled?",
      answer_type: "compliant",
      risk_rating: "high",
      weight: 2.0,
      position: 0,
    },
    {
      group_id: supGroup2.id,
      criterion_id_display: "PC-002",
      text: "Is incoming material inspection performed and documented?",
      answer_type: "yes_no",
      risk_rating: "high",
      weight: 2.0,
      position: 1,
    },
  ]);

  // ── Audits ──────────────────────────────────────────────────
  const year = new Date().getFullYear();

  const [audit1] = await knex("audits")
    .insert({
      audit_number: `AUD-${year}-0001`,
      title: "Q1 Internal Quality Audit — Manufacturing",
      description: "Quarterly internal audit of manufacturing operations to assess QMS compliance and identify improvement opportunities.",
      audit_type_id: internalType.id,
      status: "in_progress",
      current_phase: "Fieldwork",
      priority: "high",
      risk_level: "medium",
      lead_auditor_id: jane.id,
      auditee_department: "Manufacturing",
      objective: "Evaluate compliance with ISO 9001:2015 requirements and internal procedures for manufacturing operations.",
      scope: "All manufacturing processes including incoming inspection, production, final inspection, and packaging.",
      methodology: "Document review, process observation, personnel interviews, and records sampling.",
      criteria_standards: "ISO 9001:2015, Internal SOPs",
      location: "Building A — Manufacturing Floor",
      scheduled_start: "2026-02-01",
      scheduled_end: "2026-02-15",
      actual_start: "2026-02-03",
      created_by: admin.id,
    })
    .returning("*");

  const [audit2] = await knex("audits")
    .insert({
      audit_number: `AUD-${year}-0002`,
      title: "Supplier Audit — ABC Corp",
      description: "Annual supplier qualification audit for ABC Corp, a critical raw material supplier.",
      audit_type_id: supplierType.id,
      status: "scheduled",
      current_phase: "Preparation",
      priority: "high",
      risk_level: "high",
      lead_auditor_id: john.id,
      auditee_department: "External — ABC Corp",
      objective: "Verify continued compliance with supplier quality requirements and identify any quality risks.",
      scope: "Quality management system, production controls, change management, and corrective action processes.",
      methodology: "On-site audit with document review, facility tour, and interviews.",
      criteria_standards: "Supplier Quality Manual Rev 4, ISO 9001:2015",
      location: "ABC Corp Facility — 123 Industrial Ave",
      scheduled_start: "2026-03-01",
      scheduled_end: "2026-03-03",
      created_by: admin.id,
    })
    .returning("*");

  const [audit3] = await knex("audits")
    .insert({
      audit_number: `AUD-${year}-0003`,
      title: "Regulatory Compliance Review — FDA 21 CFR Part 820",
      description: "Comprehensive regulatory compliance audit against FDA Quality System Regulation requirements.",
      audit_type_id: regulatoryType.id,
      status: "planning",
      current_phase: "Scoping",
      priority: "critical",
      risk_level: "critical",
      lead_auditor_id: admin.id,
      auditee_department: "Quality Assurance",
      auditee_contact_id: jane.id,
      objective: "Assess organizational readiness for FDA inspection and identify gaps in QSR compliance.",
      scope: "Design controls, production and process controls, CAPA, document controls, and management responsibility.",
      methodology: "Gap analysis, document review, process observation, and mock inspection scenarios.",
      criteria_standards: "21 CFR Part 820, FDA Guidance Documents",
      location: "All facilities",
      scheduled_start: "2026-03-15",
      scheduled_end: "2026-04-15",
      report_due: "2026-04-30",
      created_by: admin.id,
    })
    .returning("*");

  await knex("audits").insert({
    audit_number: `AUD-${year}-0004`,
    title: "Q1 Internal Audit — Document Control",
    description: "Internal audit focused on document control and records management practices.",
    audit_type_id: internalType.id,
    status: "closed",
    current_phase: "Closeout",
    priority: "medium",
    risk_level: "low",
    lead_auditor_id: bob.id,
    auditee_department: "Quality Assurance",
    objective: "Verify document control processes meet ISO 9001 and internal requirements.",
    scope: "Document creation, review, approval, distribution, and archival processes.",
    methodology: "Document review, process walkthroughs, and sample verification.",
    criteria_standards: "ISO 9001:2015 Clause 7.5, SOP-QA-001",
    location: "Building B — QA Office",
    scheduled_start: "2026-01-10",
    scheduled_end: "2026-01-17",
    actual_start: "2026-01-10",
    actual_end: "2026-01-16",
    overall_rating: "Satisfactory",
    compliance_score: 87.5,
    completed_at: new Date("2026-01-20"),
    created_by: admin.id,
  });

  // ── Audit Team Members ──────────────────────────────────────
  await knex("audit_team_members").insert([
    { audit_id: audit1.id, user_id: jane.id, role: "lead" },
    { audit_id: audit1.id, user_id: john.id, role: "auditor" },
    { audit_id: audit1.id, user_id: bob.id, role: "observer" },
    { audit_id: audit2.id, user_id: john.id, role: "lead" },
    { audit_id: audit2.id, user_id: jane.id, role: "auditor" },
    { audit_id: audit3.id, user_id: admin.id, role: "lead" },
    { audit_id: audit3.id, user_id: jane.id, role: "auditor" },
    { audit_id: audit3.id, user_id: john.id, role: "auditor" },
    { audit_id: audit3.id, user_id: bob.id, role: "observer" },
  ]);

  // ── Checklist Instances ─────────────────────────────────────
  const [instance1] = await knex("checklist_instances")
    .insert({
      audit_id: audit1.id,
      checklist_id: isoChecklist.id,
      assigned_to: john.id,
      status: "in_progress",
      due_date: "2026-02-12",
      started_at: new Date("2026-02-03"),
    })
    .returning("*");

  await knex("checklist_instances").insert({
    audit_id: audit2.id,
    checklist_id: supplierChecklist.id,
    assigned_to: jane.id,
    status: "not_started",
    due_date: "2026-03-02",
  });

  // ── Some Criterion Responses ────────────────────────────────
  const isoCriteria = await knex("checklist_criteria")
    .whereIn("group_id", [isoGroup1.id, isoGroup2.id])
    .orderBy("position");

  for (let i = 0; i < Math.min(3, isoCriteria.length); i++) {
    const criterion = isoCriteria[i];
    await knex("criterion_responses").insert({
      instance_id: instance1.id,
      criterion_id: criterion.id,
      response_value: i === 0 ? "compliant" : i === 1 ? "compliant" : "partially_compliant",
      notes: i === 2 ? "Scope documentation needs to be updated to include new product line." : "",
      responded_by: john.id,
    });
  }

  // ── Audit Meetings ──────────────────────────────────────────
  await knex("audit_meetings").insert([
    {
      audit_id: audit1.id,
      meeting_type: "opening",
      title: "Q1 Manufacturing Audit — Opening Meeting",
      scheduled_date: new Date("2026-02-03T09:00:00"),
      attendees: JSON.stringify([
        { name: "Jane Doe", role: "Lead Auditor" },
        { name: "John Smith", role: "Auditor" },
        { name: "Robert Wilson", role: "Observer" },
        { name: "Mike Johnson", role: "Manufacturing Manager" },
      ]),
      notes: "Audit objectives and scope reviewed. Schedule confirmed. Auditee cooperation commitment received.",
      created_by: jane.id,
    },
    {
      audit_id: audit1.id,
      meeting_type: "fieldwork",
      title: "Daily Progress Meeting — Day 2",
      scheduled_date: new Date("2026-02-04T16:00:00"),
      attendees: JSON.stringify([
        { name: "Jane Doe", role: "Lead Auditor" },
        { name: "John Smith", role: "Auditor" },
      ]),
      notes: "Context of the Organization section in progress. Good cooperation from manufacturing team.",
      created_by: jane.id,
    },
    {
      audit_id: audit3.id,
      meeting_type: "opening",
      title: "FDA Compliance Review — Kickoff",
      scheduled_date: new Date("2026-03-15T10:00:00"),
      attendees: JSON.stringify([
        { name: "System Administrator", role: "Lead Auditor" },
        { name: "Jane Doe", role: "QA Director" },
      ]),
      notes: "",
      created_by: admin.id,
    },
  ]);

  // ── Update audit_number_seq ─────────────────────────────────
  await knex.schema.raw("SELECT setval('audit_number_seq', 4)");

  console.log("Audit demo data created successfully!");
  console.log("Created: 4 audit types, 3 checklists, 4 audits with teams, instances, and meetings");
}
