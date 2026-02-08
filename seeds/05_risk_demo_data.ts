import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if data already exists
  const existing = await knex("risk_categories").first();
  if (existing) return;

  // Get admin user for created_by
  const admin = await knex("users").where({ role: "admin" }).first();
  const adminId = admin?.id || null;

  // --- Risk Categories ---
  const categories = await knex("risk_categories")
    .insert([
      { name: "Strategic", description: "Risks affecting the organization's strategic objectives and direction", color: "#8b5cf6", icon: "target", sort_order: 1, created_by: adminId },
      { name: "Operational", description: "Risks arising from day-to-day business operations and processes", color: "#f59e0b", icon: "cog", sort_order: 2, created_by: adminId },
      { name: "Financial", description: "Risks related to financial loss, fraud, or economic factors", color: "#10b981", icon: "dollar", sort_order: 3, created_by: adminId },
      { name: "Compliance / Regulatory", description: "Risks from non-compliance with laws, regulations, and standards", color: "#ef4444", icon: "scale", sort_order: 4, created_by: adminId },
      { name: "Technology / Cybersecurity", description: "Risks related to IT systems, data breaches, and cyber threats", color: "#3b82f6", icon: "shield", sort_order: 5, created_by: adminId },
      { name: "Reputational", description: "Risks that could damage the organization's reputation and public trust", color: "#f97316", icon: "eye", sort_order: 6, created_by: adminId },
    ])
    .returning("*");

  const catMap: Record<string, string> = {};
  for (const c of categories) {
    catMap[c.name] = c.id;
  }

  // --- Sample Risks ---
  const risks = await knex("risks")
    .insert([
      {
        risk_number: "RSK-0001",
        title: "Data Breach / Cybersecurity Incident",
        description: "Unauthorized access to sensitive data through phishing, malware, or system vulnerability exploitation. Could expose personal data of employees and citizens.",
        category_id: catMap["Technology / Cybersecurity"],
        source: "IT Security Assessment 2026",
        status: "in_treatment",
        inherent_likelihood: 4, inherent_impact: 5, inherent_score: 20, inherent_level: "extreme",
        residual_likelihood: 3, residual_impact: 4, residual_score: 12, residual_level: "high",
        target_likelihood: 2, target_impact: 3, target_score: 6, target_level: "medium",
        velocity: "fast",
        treatment_strategy: "mitigate",
        treatment_plan: "Implement multi-factor authentication, endpoint detection and response (EDR), regular penetration testing, and security awareness training program.",
        risk_appetite: "averse",
        owner_id: adminId,
        identified_date: "2026-01-15",
        next_review_date: "2026-04-15",
        created_by: adminId,
      },
      {
        risk_number: "RSK-0002",
        title: "Regulatory Non-Compliance",
        description: "Failure to comply with new federal/state data privacy regulations and reporting requirements. Recent regulatory changes increase compliance burden significantly.",
        category_id: catMap["Compliance / Regulatory"],
        source: "Compliance Department Review",
        status: "assessed",
        inherent_likelihood: 4, inherent_impact: 5, inherent_score: 20, inherent_level: "extreme",
        residual_likelihood: 3, residual_impact: 5, residual_score: 15, residual_level: "high",
        target_likelihood: 2, target_impact: 4, target_score: 8, target_level: "medium",
        velocity: "moderate",
        treatment_strategy: "mitigate",
        treatment_plan: "Retain external compliance counsel, conduct gap analysis against new regulations, implement compliance monitoring dashboard, and quarterly compliance audits.",
        risk_appetite: "averse",
        owner_id: adminId,
        identified_date: "2026-01-20",
        next_review_date: "2026-03-20",
        created_by: adminId,
      },
      {
        risk_number: "RSK-0003",
        title: "Supply Chain Disruption",
        description: "Disruption to critical supply chains for technology hardware and specialized services due to geopolitical tensions or natural disasters.",
        category_id: catMap["Operational"],
        source: "Risk Workshop Q1 2026",
        status: "in_treatment",
        inherent_likelihood: 3, inherent_impact: 4, inherent_score: 12, inherent_level: "high",
        residual_likelihood: 2, residual_impact: 3, residual_score: 6, residual_level: "medium",
        target_likelihood: 2, target_impact: 2, target_score: 4, target_level: "low",
        velocity: "slow",
        treatment_strategy: "mitigate",
        treatment_plan: "Diversify supplier base, maintain 90-day inventory buffer for critical items, and establish contingency contracts with alternative suppliers.",
        risk_appetite: "cautious",
        owner_id: adminId,
        identified_date: "2026-02-01",
        next_review_date: "2026-05-01",
        created_by: adminId,
      },
      {
        risk_number: "RSK-0004",
        title: "Key Personnel Loss",
        description: "Risk of losing critical technical staff and institutional knowledge in specialized areas where recruitment market is highly competitive.",
        category_id: catMap["Strategic"],
        source: "HR Workforce Planning",
        status: "monitoring",
        inherent_likelihood: 3, inherent_impact: 3, inherent_score: 9, inherent_level: "medium",
        residual_likelihood: 2, residual_impact: 3, residual_score: 6, residual_level: "medium",
        target_likelihood: 2, target_impact: 2, target_score: 4, target_level: "low",
        velocity: "moderate",
        treatment_strategy: "mitigate",
        treatment_plan: "Implement knowledge management system, cross-training program, succession planning for key roles, and competitive retention packages.",
        risk_appetite: "open",
        owner_id: adminId,
        identified_date: "2025-11-01",
        next_review_date: "2026-05-01",
        created_by: adminId,
      },
      {
        risk_number: "RSK-0005",
        title: "Financial Reporting Error",
        description: "Risk of material misstatement in financial reports due to complex new accounting standards and system integration issues.",
        category_id: catMap["Financial"],
        source: "External Audit 2025",
        status: "in_treatment",
        inherent_likelihood: 3, inherent_impact: 4, inherent_score: 12, inherent_level: "high",
        residual_likelihood: 1, residual_impact: 3, residual_score: 3, residual_level: "low",
        target_likelihood: 1, target_impact: 2, target_score: 2, target_level: "low",
        velocity: "slow",
        treatment_strategy: "mitigate",
        treatment_plan: "Automated reconciliation controls, dual review process for material transactions, quarterly internal review, and upgraded ERP reporting module.",
        risk_appetite: "averse",
        owner_id: adminId,
        identified_date: "2025-12-01",
        next_review_date: "2026-06-01",
        created_by: adminId,
      },
      {
        risk_number: "RSK-0006",
        title: "Brand / Reputation Damage",
        description: "Potential reputational harm from negative media coverage, social media incidents, or public perception of service delivery failures.",
        category_id: catMap["Reputational"],
        source: "Communications Department",
        status: "identified",
        inherent_likelihood: 3, inherent_impact: 5, inherent_score: 15, inherent_level: "high",
        residual_likelihood: 3, residual_impact: 4, residual_score: 12, residual_level: "high",
        target_likelihood: 2, target_impact: 3, target_score: 6, target_level: "medium",
        velocity: "very_fast",
        treatment_strategy: "mitigate",
        treatment_plan: "Crisis communications plan, social media monitoring, stakeholder engagement strategy, and proactive public reporting on service metrics.",
        risk_appetite: "cautious",
        owner_id: adminId,
        identified_date: "2026-02-05",
        next_review_date: "2026-04-05",
        created_by: adminId,
      },
    ])
    .returning("*");

  // Update the sequence to avoid conflicts
  await knex.raw("SELECT setval('risk_number_seq', 6)");

  // --- Sample Assessments ---
  const assessments = [];
  for (const risk of risks) {
    assessments.push({
      risk_id: risk.id,
      assessment_date: risk.identified_date || "2026-01-15",
      assessor_id: adminId,
      likelihood: risk.inherent_likelihood,
      impact: risk.inherent_impact,
      score: risk.inherent_score,
      level: risk.inherent_level,
      rationale: "Initial inherent risk assessment during identification phase.",
      assessment_type: "inherent",
    });
    if (risk.residual_score) {
      assessments.push({
        risk_id: risk.id,
        assessment_date: "2026-02-01",
        assessor_id: adminId,
        likelihood: risk.residual_likelihood,
        impact: risk.residual_impact,
        score: risk.residual_score,
        level: risk.residual_level,
        rationale: "Residual risk assessment after evaluating existing controls.",
        assessment_type: "residual",
      });
    }
  }
  await knex("risk_assessments").insert(assessments);

  // --- Sample Mitigations ---
  const mitigations = [
    { risk_id: risks[0].id, title: "Deploy Multi-Factor Authentication", mitigation_type: "preventive", status: "implemented", effectiveness: "effective", owner_id: adminId, created_by: adminId },
    { risk_id: risks[0].id, title: "Endpoint Detection & Response (EDR)", mitigation_type: "detective", status: "in_progress", effectiveness: "not_tested", owner_id: adminId, due_date: "2026-03-15", created_by: adminId },
    { risk_id: risks[0].id, title: "Security Awareness Training", mitigation_type: "preventive", status: "implemented", effectiveness: "partially_effective", owner_id: adminId, created_by: adminId },
    { risk_id: risks[1].id, title: "External Compliance Counsel Engagement", mitigation_type: "directive", status: "implemented", effectiveness: "effective", owner_id: adminId, created_by: adminId },
    { risk_id: risks[1].id, title: "Regulatory Gap Analysis", mitigation_type: "detective", status: "in_progress", effectiveness: "not_tested", owner_id: adminId, due_date: "2026-03-01", created_by: adminId },
    { risk_id: risks[2].id, title: "Supplier Diversification Program", mitigation_type: "preventive", status: "in_progress", effectiveness: "not_tested", owner_id: adminId, due_date: "2026-04-01", created_by: adminId },
    { risk_id: risks[2].id, title: "90-Day Inventory Buffer", mitigation_type: "corrective", status: "implemented", effectiveness: "effective", owner_id: adminId, created_by: adminId },
    { risk_id: risks[3].id, title: "Cross-Training Program", mitigation_type: "preventive", status: "in_progress", effectiveness: "not_tested", owner_id: adminId, due_date: "2026-06-01", created_by: adminId },
    { risk_id: risks[3].id, title: "Succession Planning for Key Roles", mitigation_type: "preventive", status: "planned", effectiveness: "not_tested", owner_id: adminId, due_date: "2026-07-01", created_by: adminId },
    { risk_id: risks[4].id, title: "Automated Reconciliation Controls", mitigation_type: "detective", status: "implemented", effectiveness: "effective", owner_id: adminId, created_by: adminId },
    { risk_id: risks[4].id, title: "Dual Review Process", mitigation_type: "preventive", status: "verified", effectiveness: "effective", owner_id: adminId, created_by: adminId },
    { risk_id: risks[5].id, title: "Crisis Communications Plan", mitigation_type: "corrective", status: "planned", effectiveness: "not_tested", owner_id: adminId, due_date: "2026-03-15", created_by: adminId },
  ];
  await knex("risk_mitigations").insert(mitigations);
}
