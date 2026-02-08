import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if comprehensive checklists already exist
  const existing = await knex("checklists").where("name", "like", "%Full ISO 9001%").first();
  if (existing) {
    console.log("Comprehensive checklists already exist, skipping...");
    return;
  }

  const admin = await knex("users").where({ email: "admin@example.com" }).first();
  if (!admin) {
    console.log("Admin user not found. Run 01_demo_data seed first.");
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  //  ISO 9001:2015 COMPREHENSIVE AUDIT CHECKLIST
  // ═══════════════════════════════════════════════════════════════

  const [isoChecklist] = await knex("checklists")
    .insert({
      name: "Full ISO 9001:2015 QMS Audit Checklist",
      description:
        "Comprehensive checklist covering all auditable clauses (4–10) of ISO 9001:2015. " +
        "Designed for internal and third-party certification audits of quality management systems.",
      instructions:
        "For each criterion, assess the organization against the referenced clause. " +
        "Record objective evidence in the Notes field. Mark 'Compliant' only when adequate " +
        "documented information and implementation evidence exist. 'Partially Compliant' " +
        "indicates a minor gap; 'Non-Compliant' indicates a significant or systemic failure. " +
        "Create a Finding for any Non-Compliant or notable Partially Compliant observation.",
      status: "active",
      version: 1,
      created_by: admin.id,
    })
    .returning("*");

  // ── Clause 4: Context of the Organization ─────────────────────

  const [iso4] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "4. Context of the Organization", position: 0 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso4.id, criterion_id_display: "4.1-01", position: 0,
      text: "Has the organization determined external issues (e.g., legal, technological, competitive, market, cultural, social, economic) relevant to its purpose and strategic direction?",
      reference_citation: "ISO 9001:2015 §4.1", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Review SWOT analysis, PESTLE analysis, strategic planning records, or management review inputs that identify external context.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.1-02", position: 1,
      text: "Has the organization determined internal issues (e.g., values, culture, knowledge, performance) relevant to its purpose and strategic direction?",
      reference_citation: "ISO 9001:2015 §4.1", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Look for organizational structure charts, competency assessments, internal culture surveys, or performance metrics.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.1-03", position: 2,
      text: "Does the organization monitor and review information about these external and internal issues on a regular basis?",
      reference_citation: "ISO 9001:2015 §4.1", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Verify a defined frequency for review — typically at management review or strategic planning cycles.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.2-01", position: 3,
      text: "Are all relevant interested parties (customers, regulators, suppliers, employees, shareholders, community) identified?",
      reference_citation: "ISO 9001:2015 §4.2a", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review stakeholder register, interested-party matrix, or equivalent documentation.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.2-02", position: 4,
      text: "Are the relevant requirements (needs and expectations) of each interested party determined?",
      reference_citation: "ISO 9001:2015 §4.2b", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Requirements should be specific and linked to QMS processes (e.g., regulatory compliance, contract terms, delivery expectations).",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.2-03", position: 5,
      text: "Is information about interested parties and their requirements monitored and reviewed?",
      reference_citation: "ISO 9001:2015 §4.2", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Evidence of periodic updates — e.g., revised stakeholder matrix, updated regulatory register.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.3-01", position: 6,
      text: "Is the scope of the QMS determined and documented, considering external/internal issues and interested-party requirements?",
      reference_citation: "ISO 9001:2015 §4.3", answer_type: "yes_no", risk_rating: "critical", weight: 2.0,
      help_text: "The scope statement must be available as documented information (Quality Manual or equivalent). It must state products/services covered.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.3-02", position: 7,
      text: "If any requirements of the standard are determined as not applicable, is the justification documented and does the non-applicability not affect conformity of products/services?",
      reference_citation: "ISO 9001:2015 §4.3", answer_type: "yes_no_na", risk_rating: "high", weight: 1.5,
      help_text: "Only Clause 8 requirements may be excluded, and only if they genuinely cannot be applied.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.4-01", position: 8,
      text: "Are QMS processes and their sequence and interaction determined (process map or equivalent)?",
      reference_citation: "ISO 9001:2015 §4.4.1a", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Look for a process interaction map, turtle diagrams, or SIPOC charts.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.4-02", position: 9,
      text: "For each process, are inputs, outputs, criteria, methods, resources, responsibilities, risks, and opportunities determined?",
      reference_citation: "ISO 9001:2015 §4.4.1b–h", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Sample 2–3 key processes and verify each element is addressed.",
    },
    {
      group_id: iso4.id, criterion_id_display: "4.4-03", position: 10,
      text: "Is documented information maintained and retained to support process operation and confidence that processes are carried out as planned?",
      reference_citation: "ISO 9001:2015 §4.4.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify that procedures/work instructions exist and records are generated and retained.",
    },
  ]);

  // ── Clause 5: Leadership ──────────────────────────────────────

  const [iso5] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "5. Leadership", position: 1 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-01", position: 0,
      text: "Does top management demonstrate leadership and commitment by taking accountability for the effectiveness of the QMS?",
      reference_citation: "ISO 9001:2015 §5.1.1a", answer_type: "rating_scale", risk_rating: "high", weight: 2.0,
      help_text: "Interview top management. Review management review participation, resource allocation decisions, and communications.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-02", position: 1,
      text: "Are the quality policy and quality objectives established and compatible with the strategic direction and context of the organization?",
      reference_citation: "ISO 9001:2015 §5.1.1b", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Compare policy/objectives against documented strategic direction and context analysis.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-03", position: 2,
      text: "Are QMS requirements integrated into the organization's business processes (not treated as a bolt-on)?",
      reference_citation: "ISO 9001:2015 §5.1.1c", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Look for evidence that quality is embedded in operational processes, not just quality department procedures.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-04", position: 3,
      text: "Does top management promote the use of the process approach and risk-based thinking?",
      reference_citation: "ISO 9001:2015 §5.1.1d", answer_type: "rating_scale", risk_rating: "medium", weight: 1.0,
      help_text: "Evidence: training on process approach, risk discussions in management reviews, risk-based decision making.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-05", position: 4,
      text: "Are resources needed for the QMS available?",
      reference_citation: "ISO 9001:2015 §5.1.1e", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Review budgets, staffing levels, equipment availability, and any resource-related complaints or gaps.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-06", position: 5,
      text: "Does top management communicate the importance of effective quality management and conforming to QMS requirements?",
      reference_citation: "ISO 9001:2015 §5.1.1f", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Look for town halls, newsletters, posters, training records, or meeting minutes showing quality communication.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.1-07", position: 6,
      text: "Does top management direct and support persons to contribute to the effectiveness of the QMS?",
      reference_citation: "ISO 9001:2015 §5.1.1h", answer_type: "rating_scale", risk_rating: "medium", weight: 1.0,
      help_text: "Evidence of empowerment, recognition programs, suggestion schemes, involvement in improvement projects.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.2-01", position: 7,
      text: "Does top management demonstrate leadership and commitment with respect to customer focus — ensuring customer and applicable statutory/regulatory requirements are determined, understood, and consistently met?",
      reference_citation: "ISO 9001:2015 §5.1.2a", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Verify contract review process, customer requirement identification, and regulatory compliance monitoring.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.2-02", position: 8,
      text: "Are risks and opportunities that can affect conformity of products/services and the ability to enhance customer satisfaction determined and addressed?",
      reference_citation: "ISO 9001:2015 §5.1.2b", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Link to risk register entries that specifically relate to customer satisfaction and product/service conformity.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.1.2-03", position: 9,
      text: "Is the focus on enhancing customer satisfaction maintained?",
      reference_citation: "ISO 9001:2015 §5.1.2c", answer_type: "rating_scale", risk_rating: "high", weight: 1.5,
      help_text: "Review customer satisfaction surveys, complaint trends, NPS scores, or customer feedback analysis.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.2-01", position: 10,
      text: "Is a quality policy established that is appropriate to the purpose and context of the organization, provides a framework for setting quality objectives, and includes a commitment to satisfy applicable requirements and continual improvement?",
      reference_citation: "ISO 9001:2015 §5.2.1", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Examine the quality policy document. Verify all required elements are present.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.2-02", position: 11,
      text: "Is the quality policy available as documented information, communicated and understood within the organization, and available to relevant interested parties as appropriate?",
      reference_citation: "ISO 9001:2015 §5.2.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Interview employees at various levels. Check if the policy is posted, included in training, available on intranet/website.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.3-01", position: 12,
      text: "Are organizational roles, responsibilities, and authorities defined, communicated, and understood within the organization?",
      reference_citation: "ISO 9001:2015 §5.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review org charts, job descriptions, RACI matrices, and interview a sample of personnel about their QMS responsibilities.",
    },
    {
      group_id: iso5.id, criterion_id_display: "5.3-02", position: 13,
      text: "Has top management assigned responsibility and authority for ensuring the QMS conforms to ISO 9001, reporting on QMS performance, ensuring customer focus, and managing change?",
      reference_citation: "ISO 9001:2015 §5.3a–d", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Note: ISO 9001:2015 does not require a single 'Management Representative' — responsibilities may be distributed.",
    },
  ]);

  // ── Clause 6: Planning ────────────────────────────────────────

  const [iso6] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "6. Planning", position: 2 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso6.id, criterion_id_display: "6.1-01", position: 0,
      text: "When planning for the QMS, are the issues from 4.1 and the requirements from 4.2 considered to determine risks and opportunities?",
      reference_citation: "ISO 9001:2015 §6.1.1", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Verify traceability: context/stakeholder analysis → risk register → planned actions.",
    },
    {
      group_id: iso6.id, criterion_id_display: "6.1-02", position: 1,
      text: "Are actions planned to address risks and opportunities, integrated into QMS processes, and evaluated for effectiveness?",
      reference_citation: "ISO 9001:2015 §6.1.2", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Check that risk treatments are not just documented but actually implemented and their effectiveness reviewed.",
    },
    {
      group_id: iso6.id, criterion_id_display: "6.2-01", position: 2,
      text: "Are quality objectives established at relevant functions, levels, and processes, and are they consistent with the quality policy?",
      reference_citation: "ISO 9001:2015 §6.2.1a", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Objectives should cascade from the policy and be set at operational levels, not just top-level.",
    },
    {
      group_id: iso6.id, criterion_id_display: "6.2-02", position: 3,
      text: "Are quality objectives measurable, monitored, communicated, and updated as appropriate?",
      reference_citation: "ISO 9001:2015 §6.2.1b–f", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify SMART criteria: Specific, Measurable, Achievable, Relevant, Time-bound.",
    },
    {
      group_id: iso6.id, criterion_id_display: "6.2-03", position: 4,
      text: "When planning how to achieve quality objectives, is it determined: what will be done, what resources are required, who is responsible, when it will be completed, and how results will be evaluated?",
      reference_citation: "ISO 9001:2015 §6.2.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Look for action plans or objective deployment matrices that address all five elements.",
    },
    {
      group_id: iso6.id, criterion_id_display: "6.3-01", position: 5,
      text: "When changes to the QMS are needed, are they planned and carried out in a systematic manner considering purpose, consequences, integrity, and resource availability?",
      reference_citation: "ISO 9001:2015 §6.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review change management records — document changes, equipment changes, organizational changes.",
    },
  ]);

  // ── Clause 7: Support ─────────────────────────────────────────

  const [iso7] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "7. Support", position: 3 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso7.id, criterion_id_display: "7.1.1-01", position: 0,
      text: "Does the organization determine and provide the resources needed for the establishment, implementation, maintenance, and continual improvement of the QMS?",
      reference_citation: "ISO 9001:2015 §7.1.1", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review resource allocation, budgets, staffing plans, and any resource gap analyses.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.1.2-01", position: 1,
      text: "Are the people necessary for effective QMS operation and process control determined and provided?",
      reference_citation: "ISO 9001:2015 §7.1.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review staffing levels against workload requirements and process needs.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.1.3-01", position: 2,
      text: "Is the infrastructure needed for process operation and product/service conformity determined, provided, and maintained (buildings, equipment, utilities, IT, transportation)?",
      reference_citation: "ISO 9001:2015 §7.1.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Tour the facility. Check maintenance schedules, equipment condition, and IT system availability.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.1.4-01", position: 3,
      text: "Is the environment necessary for process operation determined, provided, and maintained (temperature, humidity, lighting, cleanliness, noise, social/psychological factors)?",
      reference_citation: "ISO 9001:2015 §7.1.4", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Check environmental monitoring records, workplace assessments, and employee feedback.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.1.5-01", position: 4,
      text: "Are monitoring and measuring resources determined and provided that are suitable for the specific type of monitoring/measurement activities?",
      reference_citation: "ISO 9001:2015 §7.1.5.1", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Review the equipment/instrument list and verify suitability for intended measurements.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.1.5-02", position: 5,
      text: "Where measurement traceability is a requirement, are measuring instruments calibrated/verified at specified intervals against traceable standards, identified, and safeguarded?",
      reference_citation: "ISO 9001:2015 §7.1.5.2", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample calibration records. Check for overdue calibrations, calibration labels/status, and traceability certificates.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.1.6-01", position: 6,
      text: "Has the organization determined the knowledge necessary for QMS operation and product/service conformity, and is this knowledge maintained and made available?",
      reference_citation: "ISO 9001:2015 §7.1.6", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Look for knowledge management practices: lessons learned databases, SOPs, mentoring programs, cross-training.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.2-01", position: 7,
      text: "Are persons doing work under the organization's control competent on the basis of appropriate education, training, skills, or experience?",
      reference_citation: "ISO 9001:2015 §7.2a", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample training records, qualification records, and competency assessments for key roles.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.2-02", position: 8,
      text: "Where applicable, are actions taken to acquire necessary competence and evaluate the effectiveness of those actions?",
      reference_citation: "ISO 9001:2015 §7.2c", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Check for post-training evaluations, on-the-job assessments, and competency sign-offs.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.3-01", position: 9,
      text: "Are persons doing work aware of the quality policy, relevant quality objectives, their contribution to QMS effectiveness, and the implications of not conforming?",
      reference_citation: "ISO 9001:2015 §7.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Interview operators and support staff at multiple levels. Check onboarding and ongoing awareness training.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.4-01", position: 10,
      text: "Has the organization determined the internal and external communications relevant to the QMS, including what, when, with whom, how, and who communicates?",
      reference_citation: "ISO 9001:2015 §7.4", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Review communication plan or matrix covering internal (meetings, briefings) and external (customer, regulatory) communications.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.5-01", position: 11,
      text: "Does the QMS include documented information required by ISO 9001 and determined by the organization as necessary for QMS effectiveness?",
      reference_citation: "ISO 9001:2015 §7.5.1", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify mandatory documented information exists (quality policy, objectives, scope, procedures for required processes).",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.5-02", position: 12,
      text: "When creating and updating documented information, is appropriate identification, format, review, and approval ensured?",
      reference_citation: "ISO 9001:2015 §7.5.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Sample documents for proper identification (title, date, revision), approval signatures, and formatting consistency.",
    },
    {
      group_id: iso7.id, criterion_id_display: "7.5-03", position: 13,
      text: "Is documented information controlled for distribution, access, retrieval, use, storage, preservation, retention, and disposition?",
      reference_citation: "ISO 9001:2015 §7.5.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Check document control system: version control, obsolete document handling, access permissions, backup/retention.",
    },
  ]);

  // ── Clause 8: Operation ───────────────────────────────────────

  const [iso8] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "8. Operation", position: 4 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso8.id, criterion_id_display: "8.1-01", position: 0,
      text: "Are operational processes planned, implemented, and controlled to meet requirements for product/service provision, including criteria for processes and acceptance of products/services?",
      reference_citation: "ISO 9001:2015 §8.1", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Review production/service delivery plans, control plans, work instructions, and acceptance criteria.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.2-01", position: 1,
      text: "Are customer communication processes established for providing product/service information, handling enquiries/contracts/orders, obtaining customer feedback/complaints, and managing customer property?",
      reference_citation: "ISO 9001:2015 §8.2.1", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify customer communication channels, enquiry handling process, complaint management, and feedback mechanisms.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.2-02", position: 2,
      text: "Are requirements for products and services (including statutory/regulatory) determined before the organization commits to supply, and are differences between contract/order requirements and those previously expressed resolved?",
      reference_citation: "ISO 9001:2015 §8.2.2–8.2.3", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review contract review process. Sample recent orders/contracts and verify requirement determination and review.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.3-01", position: 3,
      text: "Is there a design and development process that considers the nature, duration, complexity, required stages, verification and validation, and responsibilities?",
      reference_citation: "ISO 9001:2015 §8.3.1–8.3.2", answer_type: "yes_no_na", risk_rating: "critical", weight: 2.0,
      help_text: "N/A only if the organization does not design. If applicable, review design procedure and sample a design project.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.3-02", position: 4,
      text: "Are design inputs (functional/performance requirements, statutory/regulatory, standards, consequences of failure) determined and design outputs verified against inputs?",
      reference_citation: "ISO 9001:2015 §8.3.3–8.3.5", answer_type: "yes_no_na", risk_rating: "critical", weight: 2.0,
      help_text: "Sample a recent design project: check input documentation, output specifications, and verification/validation records.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.3-03", position: 5,
      text: "Are design changes identified, reviewed, controlled, and authorized, and are the effects of changes evaluated?",
      reference_citation: "ISO 9001:2015 §8.3.6", answer_type: "yes_no_na", risk_rating: "high", weight: 1.5,
      help_text: "Review design change records. Verify impact assessment and re-verification/re-validation where necessary.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.4-01", position: 6,
      text: "Are externally provided processes, products, and services controlled, and are criteria for evaluation, selection, monitoring, and re-evaluation of external providers established?",
      reference_citation: "ISO 9001:2015 §8.4.1", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Review approved supplier list, supplier evaluation criteria, and monitoring/performance records.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.4-02", position: 7,
      text: "Are the type and extent of control applied to externally provided processes, products, and services based on their potential impact on conformity?",
      reference_citation: "ISO 9001:2015 §8.4.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify risk-based approach to supplier control — critical suppliers should have more stringent controls.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.4-03", position: 8,
      text: "Is information communicated to external providers regarding requirements for processes/products/services, approval methods, competence, interactions, control/monitoring, and verification/validation?",
      reference_citation: "ISO 9001:2015 §8.4.3", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Review purchase orders, specifications, and supplier quality agreements for completeness.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.5-01", position: 9,
      text: "Is production and service provision controlled under suitable conditions including documented information, monitoring and measurement, infrastructure, competent personnel, and process validation?",
      reference_citation: "ISO 9001:2015 §8.5.1", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Observe production/service delivery. Verify work instructions, process parameters, and in-process checks.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.5-02", position: 10,
      text: "Are outputs uniquely identified, and is traceability maintained where it is a requirement?",
      reference_citation: "ISO 9001:2015 §8.5.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Check identification methods (labels, batch/lot numbers, traveler cards) and traceability records.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.5-03", position: 11,
      text: "Is property belonging to customers or external providers identified, verified, protected, and safeguarded, and is the owner notified if property is lost, damaged, or found unsuitable?",
      reference_citation: "ISO 9001:2015 §8.5.3", answer_type: "yes_no_na", risk_rating: "medium", weight: 1.0,
      help_text: "Check how customer-supplied materials, tooling, or intellectual property are identified and controlled.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.5-04", position: 12,
      text: "Are outputs preserved during production and service provision (identification, handling, contamination control, packaging, storage, transmission, transportation, protection)?",
      reference_citation: "ISO 9001:2015 §8.5.4", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Walk the warehouse/storage areas. Check packaging standards, shelf-life management, FIFO practices.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.5-05", position: 13,
      text: "Are post-delivery activities (warranty, maintenance, supplementary services, recycling, disposal) managed as required?",
      reference_citation: "ISO 9001:2015 §8.5.5", answer_type: "yes_no_na", risk_rating: "medium", weight: 1.0,
      help_text: "Review warranty claims, service contracts, and post-delivery support processes.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.5-06", position: 14,
      text: "Are changes to production/service provision reviewed and controlled, and are results of review, authorization, and necessary actions retained as documented information?",
      reference_citation: "ISO 9001:2015 §8.5.6", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review production change records, temporary deviations, and change authorization documentation.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.6-01", position: 15,
      text: "Are planned arrangements implemented at appropriate stages to verify that product/service requirements have been met, and is release to the customer not proceeded until planned arrangements are satisfactorily completed?",
      reference_citation: "ISO 9001:2015 §8.6", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review inspection/test plans, acceptance records, and release authorization documentation.",
    },
    {
      group_id: iso8.id, criterion_id_display: "8.7-01", position: 16,
      text: "Are outputs that do not conform to requirements identified, controlled, and prevented from unintended use or delivery?",
      reference_citation: "ISO 9001:2015 §8.7", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review nonconforming product/service procedure, NCR records, disposition decisions, and segregation practices.",
    },
  ]);

  // ── Clause 9: Performance Evaluation ──────────────────────────

  const [iso9] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "9. Performance Evaluation", position: 5 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso9.id, criterion_id_display: "9.1.1-01", position: 0,
      text: "Has the organization determined what needs to be monitored and measured, the methods, when monitoring/measuring shall be performed, and when results shall be analysed and evaluated?",
      reference_citation: "ISO 9001:2015 §9.1.1", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review monitoring and measurement plan or equivalent documentation.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.1.2-01", position: 1,
      text: "Does the organization monitor customers' perceptions of the degree to which their needs and expectations have been fulfilled (customer satisfaction)?",
      reference_citation: "ISO 9001:2015 §9.1.2", answer_type: "compliant", risk_rating: "high", weight: 2.0,
      help_text: "Review customer satisfaction surveys, complaint analysis, win/loss analysis, customer scorecards, or feedback reports.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.1.3-01", position: 2,
      text: "Are monitoring and measurement results analysed and evaluated to assess conformity, customer satisfaction, QMS performance and effectiveness, planning effectiveness, risk actions effectiveness, supplier performance, and improvement needs?",
      reference_citation: "ISO 9001:2015 §9.1.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review data analysis outputs, KPI dashboards, trend reports, and statistical analyses.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.2-01", position: 3,
      text: "Are internal audits conducted at planned intervals to provide information on whether the QMS conforms to the organization's own requirements and ISO 9001?",
      reference_citation: "ISO 9001:2015 §9.2.1", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review audit schedule, audit reports, and evidence of full QMS coverage within audit cycle.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.2-02", position: 4,
      text: "Is the audit programme planned considering the importance of processes, changes, and results of previous audits? Are audit criteria, scope, auditors, and methods defined? Are auditors objective and impartial?",
      reference_citation: "ISO 9001:2015 §9.2.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review audit programme, auditor qualifications, and evidence of risk-based audit planning.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.2-03", position: 5,
      text: "Are audit results reported to relevant management and are corrections and corrective actions taken without undue delay?",
      reference_citation: "ISO 9001:2015 §9.2.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review audit finding closure records and timeliness of corrective actions.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.3-01", position: 6,
      text: "Does top management review the QMS at planned intervals, considering status of actions from previous reviews, changes in context, QMS performance (customer satisfaction, objectives, process performance, nonconformities, audit results, supplier performance), resource adequacy, risk actions effectiveness, and improvement opportunities?",
      reference_citation: "ISO 9001:2015 §9.3.1–9.3.2", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review management review minutes/records. Verify all required inputs are addressed.",
    },
    {
      group_id: iso9.id, criterion_id_display: "9.3-02", position: 7,
      text: "Do management review outputs include decisions and actions related to improvement opportunities, QMS changes, and resource needs? Is documented information retained?",
      reference_citation: "ISO 9001:2015 §9.3.3", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify that management review produces clear action items with owners and deadlines.",
    },
  ]);

  // ── Clause 10: Improvement ────────────────────────────────────

  const [iso10] = await knex("checklist_groups")
    .insert({ checklist_id: isoChecklist.id, name: "10. Improvement", position: 6 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: iso10.id, criterion_id_display: "10.1-01", position: 0,
      text: "Does the organization determine and select opportunities for improvement and implement necessary actions to meet customer requirements and enhance customer satisfaction?",
      reference_citation: "ISO 9001:2015 §10.1", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review improvement project logs, Kaizen records, suggestion schemes, or innovation pipeline.",
    },
    {
      group_id: iso10.id, criterion_id_display: "10.2-01", position: 1,
      text: "When a nonconformity occurs (including complaints), does the organization react to control and correct it and deal with the consequences?",
      reference_citation: "ISO 9001:2015 §10.2.1a", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample recent NCRs/CAPAs. Verify immediate containment and correction actions.",
    },
    {
      group_id: iso10.id, criterion_id_display: "10.2-02", position: 2,
      text: "Is root cause analysis conducted for nonconformities, and are corrective actions implemented that are appropriate to the effects of the nonconformity?",
      reference_citation: "ISO 9001:2015 §10.2.1b", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review root cause analysis methodology (5-Why, Fishbone, etc.) and verify corrective actions address root causes.",
    },
    {
      group_id: iso10.id, criterion_id_display: "10.2-03", position: 3,
      text: "Is the effectiveness of corrective actions reviewed?",
      reference_citation: "ISO 9001:2015 §10.2.1d", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Check that effectiveness verification is performed after a defined period and recurrence is monitored.",
    },
    {
      group_id: iso10.id, criterion_id_display: "10.2-04", position: 4,
      text: "Is documented information retained as evidence of the nature of nonconformities, actions taken, and results of corrective actions?",
      reference_citation: "ISO 9001:2015 §10.2.2", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify NCR/CAPA records are complete, traceable, and retrievable.",
    },
    {
      group_id: iso10.id, criterion_id_display: "10.3-01", position: 5,
      text: "Does the organization continually improve the suitability, adequacy, and effectiveness of the QMS, considering analysis/evaluation results and management review outputs?",
      reference_citation: "ISO 9001:2015 §10.3", answer_type: "rating_scale", risk_rating: "high", weight: 1.5,
      help_text: "Look for systemic continual improvement — not just corrective actions but proactive process improvements.",
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  //  DOE WASTE MANAGEMENT AUDIT CHECKLIST
  // ═══════════════════════════════════════════════════════════════

  const [doeChecklist] = await knex("checklists")
    .insert({
      name: "DOE Waste Management Compliance Audit Checklist",
      description:
        "Comprehensive audit checklist for U.S. Department of Energy (DOE) waste management programs. " +
        "Covers DOE Order 435.1 (Radioactive Waste Management), RCRA hazardous waste, mixed waste, " +
        "waste minimization, characterization, storage, transportation, disposal, and environmental monitoring.",
      instructions:
        "Evaluate each criterion against site-specific documentation, permits, and DOE orders. " +
        "Use 'Compliant' when full conformance with evidence exists. 'Partially Compliant' indicates " +
        "gaps that need corrective action but do not pose immediate risk. 'Non-Compliant' indicates " +
        "regulatory violations or significant program deficiencies. Reference applicable CFR sections, " +
        "DOE Orders, and site-specific permit conditions in your notes.",
      status: "active",
      version: 1,
      created_by: admin.id,
    })
    .returning("*");

  // ── 1. Program Management & Organization ──────────────────────

  const [doe1] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "1. Program Management & Organization", position: 0 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe1.id, criterion_id_display: "PM-001", position: 0,
      text: "Is there a documented waste management program plan that addresses all waste types generated at the facility (radioactive, hazardous, mixed, sanitary)?",
      reference_citation: "DOE Order 435.1, Ch. I §1.a", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review the site Waste Management Plan. Verify it covers LLW, TRU, HLW (if applicable), hazardous, and mixed waste.",
    },
    {
      group_id: doe1.id, criterion_id_display: "PM-002", position: 1,
      text: "Are roles, responsibilities, and authorities for waste management clearly defined and assigned, including a designated Waste Management Officer?",
      reference_citation: "DOE Order 435.1, Ch. I §1.b", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review organizational charts, position descriptions, and delegation of authority letters.",
    },
    {
      group_id: doe1.id, criterion_id_display: "PM-003", position: 2,
      text: "Are waste management program performance objectives and metrics established and regularly reviewed?",
      reference_citation: "DOE Order 435.1, Ch. I §1.c", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Review performance metrics, dashboards, and trending data for waste generation, shipments, and incidents.",
    },
    {
      group_id: doe1.id, criterion_id_display: "PM-004", position: 3,
      text: "Is there a documented quality assurance program for waste management activities that complies with DOE Order 414.1D?",
      reference_citation: "DOE Order 414.1D; DOE Order 435.1 Ch. I §1.d", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review QA plan, audit schedules, corrective action tracking, and management assessment records.",
    },
    {
      group_id: doe1.id, criterion_id_display: "PM-005", position: 4,
      text: "Are adequate financial resources allocated for waste management operations, including long-term liabilities (e.g., closure, post-closure)?",
      reference_citation: "DOE Order 435.1, Ch. I §1.e", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review budget allocations, life-cycle cost estimates, and financial assurance documentation.",
    },
    {
      group_id: doe1.id, criterion_id_display: "PM-006", position: 5,
      text: "Are internal audits and assessments of waste management activities conducted at planned intervals?",
      reference_citation: "DOE Order 435.1, Ch. I §2.f", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review internal audit schedule, reports, findings, and corrective action closure.",
    },
  ]);

  // ── 2. Training & Qualifications ──────────────────────────────

  const [doe2] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "2. Training & Qualifications", position: 1 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe2.id, criterion_id_display: "TQ-001", position: 0,
      text: "Do all waste management personnel have current training for their assigned duties, including hazardous waste operations (HAZWOPER 40-hour/8-hour refresher)?",
      reference_citation: "29 CFR 1910.120; DOE Order 435.1 Ch. I §2.a", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample training records for 5+ personnel. Verify HAZWOPER currency and site-specific waste handling training.",
    },
    {
      group_id: doe2.id, criterion_id_display: "TQ-002", position: 1,
      text: "Are waste generator personnel trained on proper waste segregation, container selection, labeling, and accumulation requirements?",
      reference_citation: "40 CFR 262.17; DOE Order 435.1 Ch. IV §G", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Interview waste generators. Check training curriculum covers satellite accumulation, 90/180/270-day rules.",
    },
    {
      group_id: doe2.id, criterion_id_display: "TQ-003", position: 2,
      text: "Is radiation worker training (RadWorker I/II) current for personnel handling radioactive or mixed waste?",
      reference_citation: "10 CFR 835; DOE Order 435.1 Ch. IV §G.2", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Verify RadWorker training records, dosimetry enrollment, and bioassay participation where required.",
    },
    {
      group_id: doe2.id, criterion_id_display: "TQ-004", position: 3,
      text: "Are DOT hazardous materials transportation training requirements met for personnel involved in waste packaging and shipping?",
      reference_citation: "49 CFR 172.704; DOE Order 460.1C", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Check DOT HazMat training records (general awareness, function-specific, safety, security) and 3-year recertification.",
    },
    {
      group_id: doe2.id, criterion_id_display: "TQ-005", position: 4,
      text: "Are training records maintained and readily accessible, with demonstrated competency evaluations for critical tasks?",
      reference_citation: "DOE Order 426.2; 40 CFR 265.16", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review training database. Verify records include date, instructor, topics, and evidence of competency assessment.",
    },
  ]);

  // ── 3. Waste Characterization ─────────────────────────────────

  const [doe3] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "3. Waste Characterization", position: 2 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe3.id, criterion_id_display: "WC-001", position: 0,
      text: "Is there a documented waste characterization plan/procedure that addresses all waste streams generated at the facility?",
      reference_citation: "DOE Order 435.1, Ch. IV §I.2.a; 40 CFR 262.11", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review the Waste Characterization Plan. Verify it covers process knowledge, analytical methods, and waste stream profiling.",
    },
    {
      group_id: doe3.id, criterion_id_display: "WC-002", position: 1,
      text: "Is process knowledge used for waste characterization adequately documented and supported by historical data, material safety data sheets, and process descriptions?",
      reference_citation: "DOE/NV-325 (or site-specific WAC); 40 CFR 262.11(c)", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review process knowledge documentation for sample waste streams. Verify source data is current and traceable.",
    },
    {
      group_id: doe3.id, criterion_id_display: "WC-003", position: 2,
      text: "Are analytical methods used for waste characterization appropriate (e.g., SW-846 for RCRA, approved radiochemistry methods for radionuclides)?",
      reference_citation: "40 CFR 261; DOE Order 435.1 Ch. IV §I.2.b", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review lab analysis reports. Verify method citations, detection limits, QA/QC data, and chain-of-custody.",
    },
    {
      group_id: doe3.id, criterion_id_display: "WC-004", position: 3,
      text: "Are waste characterization data reviewed and approved by qualified personnel before waste is designated for treatment, storage, or disposal?",
      reference_citation: "DOE Order 435.1, Ch. IV §I.2.c", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify review/approval workflow and qualifications of reviewers.",
    },
    {
      group_id: doe3.id, criterion_id_display: "WC-005", position: 4,
      text: "Is radioactive waste properly classified (HLW, TRU, LLW, MLLW) per DOE Order 435.1 definitions?",
      reference_citation: "DOE Order 435.1, Ch. II–IV", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review waste designation records. Verify classification logic against DOE Order 435.1 waste type definitions.",
    },
    {
      group_id: doe3.id, criterion_id_display: "WC-006", position: 5,
      text: "Is RCRA hazardous waste determination performed for all waste streams, and are applicable waste codes (listed/characteristic) assigned correctly?",
      reference_citation: "40 CFR 262.11; 40 CFR 261 Subparts C&D", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample waste profiles and verify listed waste code and characteristic (ignitability, corrosivity, reactivity, toxicity) determination.",
    },
    {
      group_id: doe3.id, criterion_id_display: "WC-007", position: 6,
      text: "Are waste profiles kept current and re-evaluated when processes change or at defined intervals?",
      reference_citation: "DOE Order 435.1 Ch. IV §I.2.d; disposal facility WAC", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Check profile expiration dates and change management triggers.",
    },
  ]);

  // ── 4. Waste Minimization & Pollution Prevention ──────────────

  const [doe4] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "4. Waste Minimization & Pollution Prevention", position: 3 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe4.id, criterion_id_display: "WM-001", position: 0,
      text: "Is there a documented Pollution Prevention / Waste Minimization Plan that addresses source reduction, recycling, and treatment?",
      reference_citation: "DOE Order 436.1; Executive Order 14057; RCRA §3002(b)", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review P2/WMin plan. Verify it includes goals, strategies, and implementation timelines.",
    },
    {
      group_id: doe4.id, criterion_id_display: "WM-002", position: 1,
      text: "Are waste minimization goals established with measurable targets, and is progress tracked and reported annually?",
      reference_citation: "DOE Order 436.1 §4.g; EPA Waste Minimization National Plan", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Review annual waste generation data, reduction trends, and P2 opportunity assessments.",
    },
    {
      group_id: doe4.id, criterion_id_display: "WM-003", position: 2,
      text: "Is a waste certification program in place to prevent prohibited items from entering waste streams (e.g., free liquids in solid waste, incompatible materials)?",
      reference_citation: "DOE Order 435.1 Ch. IV §I.2.e; disposal facility WAC", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review certification procedures, checklists, and records of certifier qualifications.",
    },
    {
      group_id: doe4.id, criterion_id_display: "WM-004", position: 3,
      text: "Are recycling programs in place for applicable waste streams (e.g., solvents, metals, lead, electronics, universal waste)?",
      reference_citation: "DOE Order 436.1 §4.f; 40 CFR 273 (Universal Waste)", answer_type: "compliant", risk_rating: "medium", weight: 1.0,
      help_text: "Check recycling contracts, volumes recycled, and proper management of universal waste.",
    },
  ]);

  // ── 5. Waste Storage & Accumulation ───────────────────────────

  const [doe5] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "5. Waste Storage & Accumulation", position: 4 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe5.id, criterion_id_display: "SA-001", position: 0,
      text: "Are satellite accumulation areas (SAAs) compliant with 40 CFR 262.15 (containers at or near point of generation, ≤55 gallons of hazardous waste or 1 quart of acute hazardous waste)?",
      reference_citation: "40 CFR 262.15", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Inspect SAAs. Check container volume, labeling ('Hazardous Waste'), condition, and proximity to point of generation.",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-002", position: 1,
      text: "Are containers in less-than-90-day (or 180/270-day) accumulation areas properly marked with 'Hazardous Waste', accumulation start date, and waste contents?",
      reference_citation: "40 CFR 262.17(a)(5); 40 CFR 262.16(b)(6)", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Inspect accumulation areas. Check every container for required markings and verify start dates are within limits.",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-003", position: 2,
      text: "Are weekly inspections of hazardous waste accumulation/storage areas performed and documented?",
      reference_citation: "40 CFR 262.17(a)(1); 40 CFR 265.174", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review inspection logs for the past 6 months. Verify inspection frequency and corrective action follow-up.",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-004", position: 3,
      text: "Are containers in good condition, compatible with their contents, and kept closed except when adding or removing waste?",
      reference_citation: "40 CFR 265.171–173", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Physical inspection of containers. Look for leaks, corrosion, bulging, and open containers.",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-005", position: 4,
      text: "Are incompatible wastes properly segregated in storage and accumulation areas?",
      reference_citation: "40 CFR 265.177; DOE Order 435.1 Ch. IV §I.4.c", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Verify chemical compatibility determinations and physical separation (berms, distance, separate containment).",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-006", position: 5,
      text: "Is adequate secondary containment provided for liquid waste containers and tanks?",
      reference_citation: "40 CFR 264.175; 40 CFR 265.193", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Inspect containment systems for capacity (10% or largest container), integrity, and drainage management.",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-007", position: 6,
      text: "Are radioactive waste storage areas properly posted with radiation warning signs, access controls, and dose rate surveys current?",
      reference_citation: "10 CFR 835; DOE Order 435.1 Ch. IV §I.4.a", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Verify radiation postings, area classifications, survey records, and access control logs.",
    },
    {
      group_id: doe5.id, criterion_id_display: "SA-008", position: 7,
      text: "Is the radioactive waste storage time-limited, and are waste inventories tracked and reported?",
      reference_citation: "DOE Order 435.1, Ch. IV §I.4.b", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review waste inventory database, storage duration tracking, and disposition pathway planning.",
    },
  ]);

  // ── 6. Waste Treatment & Disposal ─────────────────────────────

  const [doe6] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "6. Waste Treatment & Disposal", position: 5 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe6.id, criterion_id_display: "TD-001", position: 0,
      text: "Are waste treatment methods (stabilization, incineration, compaction, etc.) approved and performed in accordance with permits and DOE authorization?",
      reference_citation: "DOE Order 435.1, Ch. IV §I.3; RCRA permit conditions", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review treatment permits, operating procedures, and treatment records.",
    },
    {
      group_id: doe6.id, criterion_id_display: "TD-002", position: 1,
      text: "Is a Performance Assessment (PA) completed and maintained for on-site LLW disposal facilities?",
      reference_citation: "DOE Order 435.1, Ch. IV §P", answer_type: "yes_no_na", risk_rating: "critical", weight: 2.0,
      help_text: "N/A if no on-site disposal. If applicable, verify PA is current and monitoring supports PA assumptions.",
    },
    {
      group_id: doe6.id, criterion_id_display: "TD-003", position: 2,
      text: "Are Waste Acceptance Criteria (WAC) for the receiving disposal facility met for all waste shipments?",
      reference_citation: "DOE Order 435.1, Ch. IV §I.2.e; receiving facility WAC", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample recent waste profiles and shipment records. Verify WAC compliance documentation.",
    },
    {
      group_id: doe6.id, criterion_id_display: "TD-004", position: 3,
      text: "Is land disposal restriction (LDR) compliance demonstrated for hazardous and mixed waste prior to land disposal?",
      reference_citation: "40 CFR 268; DOE Order 435.1 Ch. IV §I.3.b", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review LDR notifications, treatment standards, and one-time notification records.",
    },
    {
      group_id: doe6.id, criterion_id_display: "TD-005", position: 4,
      text: "Are disposal records maintained that demonstrate traceability from waste generation through final disposal?",
      reference_citation: "DOE Order 435.1, Ch. IV §I.5; 40 CFR 262.40", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify cradle-to-grave documentation: characterization → packaging → shipping → receipt → disposal confirmation.",
    },
  ]);

  // ── 7. Transportation ─────────────────────────────────────────

  const [doe7] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "7. Transportation", position: 6 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe7.id, criterion_id_display: "TR-001", position: 0,
      text: "Are hazardous and radioactive waste shipments prepared in accordance with DOT (49 CFR) and NRC (10 CFR 71) regulations, including proper packaging, marking, labeling, and placarding?",
      reference_citation: "49 CFR 171–180; 10 CFR 71; DOE Order 460.1C", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Sample recent shipping papers. Inspect a staged shipment if possible.",
    },
    {
      group_id: doe7.id, criterion_id_display: "TR-002", position: 1,
      text: "Are hazardous waste manifests (EPA Form 8700-22) completed correctly, signed, and copies distributed and retained?",
      reference_citation: "40 CFR 262.20–23", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review manifest files. Verify generator, transporter, and TSD signatures, EPA ID numbers, and exception reporting.",
    },
    {
      group_id: doe7.id, criterion_id_display: "TR-003", position: 2,
      text: "Are Type A/B radioactive material shipping containers inspected, tested, and maintained per regulatory requirements?",
      reference_citation: "49 CFR 173.461–475; 10 CFR 71", answer_type: "yes_no_na", risk_rating: "critical", weight: 2.0,
      help_text: "Review container certification records, inspection logs, and maintenance history.",
    },
    {
      group_id: doe7.id, criterion_id_display: "TR-004", position: 3,
      text: "Are transportation emergency response procedures in place, including access to emergency response information (ERG, SDS) and spill response equipment?",
      reference_citation: "49 CFR 172.600; DOE Order 151.1D", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review emergency response plan, spill kit inventory, and driver emergency response training records.",
    },
    {
      group_id: doe7.id, criterion_id_display: "TR-005", position: 4,
      text: "Is the e-Manifest system used for hazardous waste tracking, and are discrepancies resolved within regulatory timeframes?",
      reference_citation: "40 CFR 262.24; EPA e-Manifest regulations", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify e-Manifest submissions, discrepancy reports, and exception report filing (35/45-day rule).",
    },
  ]);

  // ── 8. Environmental Monitoring & Emergency Preparedness ──────

  const [doe8] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "8. Environmental Monitoring & Emergency Preparedness", position: 7 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe8.id, criterion_id_display: "EM-001", position: 0,
      text: "Is an environmental monitoring program in place for waste management areas, including groundwater, air, and surface water monitoring as required?",
      reference_citation: "DOE Order 458.1; DOE Order 435.1 Ch. IV §Q; RCRA permit conditions", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review monitoring plan, sampling schedules, analytical results, and trending reports.",
    },
    {
      group_id: doe8.id, criterion_id_display: "EM-002", position: 1,
      text: "Are groundwater monitoring wells around waste storage/disposal areas sampled at required frequencies and are results compared to background/action levels?",
      reference_citation: "40 CFR 265 Subpart F; DOE Order 435.1 Ch. IV §Q.2", answer_type: "yes_no_na", risk_rating: "critical", weight: 2.0,
      help_text: "Review well network map, sampling records, and statistical comparisons to background.",
    },
    {
      group_id: doe8.id, criterion_id_display: "EM-003", position: 2,
      text: "Is a contingency plan in place for waste management areas that addresses fire, explosion, and releases, and is it coordinated with the facility Emergency Response Plan?",
      reference_citation: "40 CFR 265 Subpart D; DOE Order 151.1D", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review contingency plan, emergency coordinator list, evacuation routes, and coordination with local authorities.",
    },
    {
      group_id: doe8.id, criterion_id_display: "EM-004", position: 3,
      text: "Are emergency response drills/exercises conducted at required frequencies, and are lessons learned documented and incorporated?",
      reference_citation: "DOE Order 151.1D; 40 CFR 265.56", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review drill schedule, after-action reports, and corrective action tracking.",
    },
    {
      group_id: doe8.id, criterion_id_display: "EM-005", position: 4,
      text: "Are spill/release reporting requirements understood and followed (immediate notification for significant releases)?",
      reference_citation: "40 CFR 302 (CERCLA); DOE Order 231.1B; DOE Order 232.2A", answer_type: "compliant", risk_rating: "critical", weight: 2.0,
      help_text: "Review spill/occurrence reports for the past year. Verify reporting timeliness and regulatory notifications.",
    },
  ]);

  // ── 9. Records Management & Regulatory Reporting ──────────────

  const [doe9] = await knex("checklist_groups")
    .insert({ checklist_id: doeChecklist.id, name: "9. Records Management & Regulatory Reporting", position: 8 })
    .returning("*");

  await knex("checklist_criteria").insert([
    {
      group_id: doe9.id, criterion_id_display: "RM-001", position: 0,
      text: "Are waste management records maintained for the required retention periods (e.g., manifests for 3 years, operating records for facility life, disposal records permanently)?",
      reference_citation: "40 CFR 262.40; 40 CFR 265.73; DOE Order 435.1 Ch. IV §I.5", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review records retention schedule and verify records are retrievable and properly stored.",
    },
    {
      group_id: doe9.id, criterion_id_display: "RM-002", position: 1,
      text: "Is the RCRA Biennial Report submitted accurately and on time (odd-numbered years, due March 1)?",
      reference_citation: "40 CFR 262.41", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Review most recent Biennial Report submittal and verify data accuracy against waste tracking records.",
    },
    {
      group_id: doe9.id, criterion_id_display: "RM-003", position: 2,
      text: "Are DOE waste management reporting requirements met (Annual Waste Report, Waste Information Management System data submissions)?",
      reference_citation: "DOE Order 435.1 Ch. I §2.d; WIMS/CWIS reporting", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Verify timely submission to DOE databases and accuracy of reported volumes, classifications, and dispositions.",
    },
    {
      group_id: doe9.id, criterion_id_display: "RM-004", position: 3,
      text: "Are RCRA permit conditions tracked and compliance demonstrated for all applicable requirements (e.g., permit modifications, closure/post-closure)?",
      reference_citation: "40 CFR 264/265; site RCRA permit", answer_type: "yes_no_na", risk_rating: "critical", weight: 2.0,
      help_text: "Review permit condition compliance matrix and verify all reporting and operational requirements are met.",
    },
    {
      group_id: doe9.id, criterion_id_display: "RM-005", position: 4,
      text: "Are waste tracking systems (electronic databases) maintained with accurate, real-time inventory of all waste containers from generation through disposal?",
      reference_citation: "DOE Order 435.1 Ch. IV §I.5.b", answer_type: "compliant", risk_rating: "high", weight: 1.5,
      help_text: "Spot-check database entries against physical inventory. Verify container ID, location, contents, and status accuracy.",
    },
  ]);

  // Count totals
  const isoGroups = await knex("checklist_groups").where("checklist_id", isoChecklist.id).count("* as count").first();
  const isoCriteria = await knex("checklist_criteria")
    .join("checklist_groups", "checklist_criteria.group_id", "checklist_groups.id")
    .where("checklist_groups.checklist_id", isoChecklist.id)
    .count("* as count")
    .first();
  const doeGroups = await knex("checklist_groups").where("checklist_id", doeChecklist.id).count("* as count").first();
  const doeCriteria = await knex("checklist_criteria")
    .join("checklist_groups", "checklist_criteria.group_id", "checklist_groups.id")
    .where("checklist_groups.checklist_id", doeChecklist.id)
    .count("* as count")
    .first();

  console.log("Comprehensive audit checklists created successfully!");
  console.log(`  ISO 9001:2015 Checklist: ${isoGroups?.count} groups, ${isoCriteria?.count} criteria`);
  console.log(`  DOE Waste Management Checklist: ${doeGroups?.count} groups, ${doeCriteria?.count} criteria`);
}
