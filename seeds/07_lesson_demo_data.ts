import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if data already exists
  const existing = await knex("lessons").first();
  if (existing) return;

  // Get admin and other users
  const admin = await knex("users").where({ role: "admin" }).first();
  const adminId = admin?.id || null;
  const users = await knex("users").limit(3);
  const user2Id = users[1]?.id || adminId;
  const user3Id = users[2]?.id || adminId;

  // Get workflow stages
  const stages = await knex("lesson_workflow_stages").orderBy("position", "asc");
  const stageMap: Record<string, string> = {};
  for (const s of stages) {
    stageMap[s.name] = s.id;
  }

  // Get some issues for linking
  const issues = await knex("issues").limit(4);

  // --- Sample Lessons ---
  const lessons = await knex("lessons")
    .insert([
      {
        lesson_number: "LL-0001",
        title: "Inadequate Change Management Led to Production Outage",
        description: "A configuration change deployed without proper review caused a 4-hour production outage affecting all users.",
        status: "implemented",
        lesson_type: "negative",
        category: "Process",
        impact_level: "critical",
        what_happened: "A database configuration change was deployed directly to production during business hours without following the change management process. The change caused cascading failures in dependent services.",
        root_cause: "The team bypassed the change management process due to perceived urgency. No automated safeguards prevented direct production changes.",
        root_cause_category: "Process Gap",
        recommendation: "Enforce mandatory change approval workflow for all production changes. Implement automated deployment gates.",
        preventive_action: "Deploy automated change management gates in CI/CD pipeline that require approval before production deployment.",
        corrective_action: "Rolled back configuration change. Implemented emergency change freeze while deploying pipeline safeguards.",
        outcome: "Reduced unplanned production changes by 95% after implementing automated gates.",
        effectiveness_rating: "highly_effective",
        identified_date: "2026-01-10",
        review_date: "2026-01-15",
        implementation_date: "2026-01-25",
        closure_date: "2026-02-01",
        owner_id: adminId,
        reviewer_id: user2Id,
        current_stage_id: stageMap["Archive"] || null,
        tags: ["change-management", "production", "process"],
        created_by: adminId,
      },
      {
        lesson_number: "LL-0002",
        title: "Cross-functional Team Collaboration Improved Delivery",
        description: "Establishing a cross-functional tiger team for the Q4 initiative reduced delivery time by 40%.",
        status: "validated",
        lesson_type: "positive",
        category: "People",
        impact_level: "high",
        what_happened: "A dedicated cross-functional team was assembled with representatives from engineering, design, QA, and operations. Daily standups and shared OKRs eliminated handoff delays.",
        root_cause: "Previous siloed approach caused information loss during handoffs and misaligned priorities between teams.",
        root_cause_category: "Communication Breakdown",
        recommendation: "Adopt cross-functional team structure for all major initiatives. Define shared success metrics upfront.",
        preventive_action: "Establish standard operating procedure for forming cross-functional teams for projects exceeding 2 weeks.",
        outcome: "40% reduction in delivery time, 25% improvement in first-pass quality.",
        effectiveness_rating: "highly_effective",
        identified_date: "2026-01-20",
        review_date: "2026-01-28",
        owner_id: user2Id,
        reviewer_id: adminId,
        current_stage_id: stageMap["Validate"] || null,
        tags: ["collaboration", "team", "delivery"],
        created_by: user2Id,
      },
      {
        lesson_number: "LL-0003",
        title: "Vendor SLA Non-compliance During Peak Period",
        description: "Cloud infrastructure vendor failed to meet SLA during peak holiday period, causing degraded performance for 48 hours.",
        status: "in_implementation",
        lesson_type: "negative",
        category: "Vendor Management",
        impact_level: "high",
        what_happened: "During the holiday peak period, the cloud vendor experienced capacity issues resulting in 48 hours of degraded service. Their SLA guarantees 99.9% uptime but actual uptime was 97.2%.",
        root_cause: "Insufficient capacity planning by vendor. No multi-vendor redundancy in our architecture.",
        root_cause_category: "External Factor",
        recommendation: "Implement multi-cloud failover for critical services. Negotiate stronger SLA penalties and add capacity planning requirements to vendor contracts.",
        preventive_action: "Deploy critical workloads across two cloud providers with automated failover.",
        corrective_action: "Filed SLA credit claim. Initiated vendor performance review process.",
        identified_date: "2026-01-05",
        review_date: "2026-01-12",
        owner_id: user3Id,
        reviewer_id: adminId,
        current_stage_id: stageMap["Implement"] || null,
        tags: ["vendor", "SLA", "infrastructure"],
        created_by: adminId,
      },
      {
        lesson_number: "LL-0004",
        title: "Automated Testing Caught Critical Regression Early",
        description: "Automated regression test suite identified a critical data corruption bug before it reached production.",
        status: "validated",
        lesson_type: "positive",
        category: "Technology",
        impact_level: "critical",
        what_happened: "The automated test suite caught a data migration bug that would have corrupted 15% of user records. The bug was fixed in the same sprint with zero user impact.",
        root_cause: "Investment in comprehensive test coverage for data migration paths paid off. Previous similar bugs had reached production.",
        root_cause_category: "Design Flaw",
        recommendation: "Maintain minimum 90% test coverage for all data-handling code paths. Add data integrity checks to CI pipeline.",
        effectiveness_rating: "highly_effective",
        identified_date: "2026-01-18",
        owner_id: adminId,
        reviewer_id: user2Id,
        current_stage_id: stageMap["Validate"] || null,
        tags: ["testing", "quality", "automation"],
        created_by: adminId,
      },
      {
        lesson_number: "LL-0005",
        title: "Incomplete Requirements Led to Scope Creep",
        description: "Vague requirements definition for the reporting module caused 3 weeks of scope creep and budget overrun.",
        status: "under_review",
        lesson_type: "negative",
        category: "Project Management",
        impact_level: "medium",
        what_happened: "The reporting module requirements were documented at a high level without specific acceptance criteria. Stakeholders continuously added new requirements during development.",
        root_cause: "Requirements gathering phase was shortened due to schedule pressure. No formal sign-off process for requirements.",
        root_cause_category: "Process Gap",
        recommendation: "Implement mandatory requirements sign-off gate with specific acceptance criteria before development begins.",
        preventive_action: "Create requirements template with mandatory fields including acceptance criteria, edge cases, and stakeholder sign-off.",
        identified_date: "2026-02-01",
        owner_id: user2Id,
        reviewer_id: adminId,
        current_stage_id: stageMap["Review"] || null,
        tags: ["requirements", "scope", "project-management"],
        created_by: user2Id,
      },
      {
        lesson_number: "LL-0006",
        title: "Security Training Reduced Phishing Susceptibility",
        description: "Monthly security awareness training reduced phishing click-through rate from 23% to 4% over 6 months.",
        status: "implemented",
        lesson_type: "improvement",
        category: "Security",
        impact_level: "high",
        what_happened: "After implementing a structured monthly security training program with simulated phishing exercises, employee susceptibility to phishing attacks dropped dramatically.",
        root_cause: "Lack of regular security awareness education left employees vulnerable to social engineering attacks.",
        root_cause_category: "Training Gap",
        recommendation: "Continue monthly training cadence. Add targeted training for departments with higher susceptibility rates.",
        preventive_action: "Automated monthly phishing simulations with immediate training for those who click.",
        corrective_action: "Implemented mandatory security training for all new hires within first week.",
        outcome: "Phishing click-through rate dropped from 23% to 4%. Zero successful phishing compromises in the past quarter.",
        effectiveness_rating: "effective",
        identified_date: "2025-12-15",
        implementation_date: "2026-01-05",
        owner_id: adminId,
        current_stage_id: stageMap["Archive"] || null,
        tags: ["security", "training", "phishing"],
        created_by: adminId,
      },
      {
        lesson_number: "LL-0007",
        title: "Documentation Standards Improved Onboarding",
        description: "Standardized API documentation reduced new developer onboarding time from 3 weeks to 1 week.",
        status: "approved",
        lesson_type: "improvement",
        category: "Communication",
        impact_level: "medium",
        what_happened: "After standardizing API documentation using OpenAPI specifications and adding runnable examples, new developers could become productive significantly faster.",
        root_cause: "Previous documentation was scattered, outdated, and lacked examples. Each team had different documentation practices.",
        root_cause_category: "Communication Breakdown",
        recommendation: "Mandate OpenAPI specifications for all new APIs. Include documentation quality in code review checklists.",
        identified_date: "2026-01-25",
        owner_id: user3Id,
        reviewer_id: user2Id,
        current_stage_id: stageMap["Approve"] || null,
        tags: ["documentation", "onboarding", "developer-experience"],
        created_by: user3Id,
      },
      {
        lesson_number: "LL-0008",
        title: "Compliance Audit Gap in Data Retention",
        description: "Internal audit revealed data retention policies were not properly enforced, creating regulatory risk.",
        status: "identified",
        lesson_type: "negative",
        category: "Compliance",
        impact_level: "critical",
        what_happened: "An internal compliance audit found that data older than the mandated retention period was not being properly purged from 3 of 7 production databases.",
        root_cause: "Data retention automation was implemented inconsistently across databases. No monitoring for retention compliance.",
        root_cause_category: "System Failure",
        recommendation: "Implement centralized data lifecycle management with automated retention enforcement and compliance monitoring.",
        identified_date: "2026-02-05",
        owner_id: adminId,
        current_stage_id: stageMap["Identify"] || null,
        tags: ["compliance", "data-retention", "audit"],
        created_by: adminId,
      },
    ])
    .returning("*");

  // --- Initialize Workflow Assignments ---
  for (const lesson of lessons) {
    if (!lesson.current_stage_id) continue;
    for (const stage of stages) {
      const currentStagePos = stages.find((s: any) => s.id === lesson.current_stage_id)?.position ?? 0;
      await knex("lesson_stage_assignments").insert({
        lesson_id: lesson.id,
        stage_id: stage.id,
        user_id: lesson.owner_id,
        assigned_at: new Date(),
        completed_at: stage.position < currentStagePos ? new Date() : null,
      });
    }
  }

  // --- Link Some Lessons to Issues ---
  if (issues.length > 0) {
    const linkData = [];
    if (issues[0]) linkData.push({ lesson_id: lessons[0].id, issue_id: issues[0].id, relationship: "originated_from" });
    if (issues[1]) linkData.push({ lesson_id: lessons[2].id, issue_id: issues[1].id, relationship: "related" });
    if (issues[2]) linkData.push({ lesson_id: lessons[4].id, issue_id: issues[2].id, relationship: "originated_from" });
    if (issues[3]) linkData.push({ lesson_id: lessons[7].id, issue_id: issues[3].id, relationship: "related" });

    if (linkData.length > 0) {
      await knex("lesson_issues").insert(linkData);
    }
  }

  // --- Sample Comments ---
  await knex("lesson_comments").insert([
    {
      lesson_id: lessons[0].id,
      author_id: adminId,
      body: "This was a significant incident. The automated gates have been very effective in preventing similar issues.",
    },
    {
      lesson_id: lessons[0].id,
      author_id: user2Id || adminId,
      body: "Agreed. We should consider extending these gates to our staging environment as well.",
    },
    {
      lesson_id: lessons[2].id,
      author_id: adminId,
      body: "The multi-cloud failover project is on track for completion by end of Q1.",
    },
    {
      lesson_id: lessons[4].id,
      author_id: user2Id || adminId,
      body: "The requirements template has been drafted. Sharing for review.",
    },
    {
      lesson_id: lessons[5].id,
      author_id: user3Id || adminId,
      body: "Excellent results from the security training program. Other departments are asking to participate.",
    },
  ]);

  // Update lesson_number_seq to avoid conflicts
  await knex.raw("SELECT setval('lesson_number_seq', 8, true)");
}
