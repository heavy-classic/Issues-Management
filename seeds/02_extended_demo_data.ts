import type { Knex } from "knex";
import bcrypt from "bcrypt";

export async function seed(knex: Knex): Promise<void> {
  // Idempotency check - look for a known extended-seed user
  const marker = await knex("users")
    .where({ email: "sarah.chen@example.com" })
    .first();
  if (marker) {
    console.log("Extended seed data already exists, skipping...");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  // Get existing users
  const existingUsers = await knex("users").select("*");
  const adminUser = existingUsers.find((u) => u.email === "admin@example.com");
  const john = existingUsers.find((u) => u.email === "john.smith@example.com");
  const jane = existingUsers.find((u) => u.email === "jane.doe@example.com");
  const bob = existingUsers.find((u) => u.email === "bob.wilson@example.com");

  if (!adminUser || !john || !jane || !bob) {
    console.log("Base seed data not found. Run seed 01 first.");
    return;
  }

  // Create 6 additional users (10 total)
  const newUsersData = [
    { email: "sarah.chen@example.com", name: "Sarah", full_name: "Sarah Chen", role: "manager" },
    { email: "mike.johnson@example.com", name: "Mike", full_name: "Michael Johnson", role: "user" },
    { email: "emily.davis@example.com", name: "Emily", full_name: "Emily Davis", role: "user" },
    { email: "alex.kumar@example.com", name: "Alex", full_name: "Alex Kumar", role: "user" },
    { email: "lisa.park@example.com", name: "Lisa", full_name: "Lisa Park", role: "manager" },
    { email: "david.brown@example.com", name: "David", full_name: "David Brown", role: "user" },
  ];

  const newUsers: any[] = [];
  for (const u of newUsersData) {
    const [user] = await knex("users")
      .insert({ ...u, password_hash: passwordHash, status: "active" })
      .returning("*");
    newUsers.push(user);
  }
  const [sarah, mike, emily, alex, lisa, david] = newUsers;

  // All users pool
  const allUsers = [adminUser, john, jane, bob, sarah, mike, emily, alex, lisa, david];

  // Create 2 additional teams
  const [opsTeam] = await knex("teams")
    .insert({ name: "Operations", description: "Operations and manufacturing team" })
    .returning("*");
  const [regTeam] = await knex("teams")
    .insert({ name: "Regulatory Affairs", description: "Regulatory compliance team" })
    .returning("*");

  // Add members to new teams
  await knex("team_members").insert([
    { team_id: opsTeam.id, user_id: mike.id, role: "member" },
    { team_id: opsTeam.id, user_id: emily.id, role: "member" },
    { team_id: opsTeam.id, user_id: sarah.id, role: "lead" },
    { team_id: regTeam.id, user_id: alex.id, role: "member" },
    { team_id: regTeam.id, user_id: lisa.id, role: "lead" },
    { team_id: regTeam.id, user_id: david.id, role: "member" },
  ]);

  // Get workflow stages
  const stages = await knex("workflow_stages").orderBy("position", "asc");

  // Generate 44 additional issues (50 total with existing 6)
  const priorities = ["low", "medium", "high", "critical"] as const;
  const issueTitles = [
    "Process deviation in mixing vessel B",
    "Environmental monitoring excursion in Zone C",
    "Supplier delivery delay for critical component",
    "Equipment maintenance overdue - Reactor 3",
    "Data integrity issue in LIMS system",
    "Customer complaint - product appearance",
    "Stability study result out of trend",
    "Cleaning validation protocol update needed",
    "Change control for new raw material",
    "CAPA effectiveness review overdue",
    "Water system conductivity alert",
    "Warehouse temperature excursion",
    "Packaging component specification change",
    "Operator training gap identified",
    "Batch yield below specification",
    "Microbial limit test failure",
    "Label review for new market submission",
    "Process validation protocol update",
    "Quality agreement update - Vendor XYZ",
    "Risk assessment for new product line",
    "Audit finding - documentation practices",
    "Complaints trend analysis Q4",
    "Preventive maintenance schedule review",
    "API testing method transfer",
    "Facility upgrade project planning",
    "GMP compliance gap assessment",
    "Product recall assessment - Lot 2024-1192",
    "Sterility assurance process review",
    "Environmental impact assessment",
    "Supply chain risk evaluation",
    "Technology transfer documentation",
    "Validation master plan revision",
    "Deviation trending analysis - monthly",
    "Calibration schedule optimization",
    "Raw material testing SOP update",
    "Batch record template revision",
    "Cross-contamination risk assessment",
    "Out-of-specification investigation",
    "Corrective action for CQA failure",
    "Periodic product review initiation",
    "Employee health screening program update",
    "Cold chain integrity assessment",
    "Packaging line efficiency improvement",
    "Document management system upgrade",
  ];

  const commentTexts = [
    "Investigating root cause. Will update by end of week.",
    "Contacted supplier for additional information.",
    "Risk assessment completed - medium risk identified.",
    "Assigned to QA team for further evaluation.",
    "Discussed in management review meeting.",
    "Documentation review completed - revisions needed.",
    "Regulatory impact assessment is in progress.",
    "Training materials updated and distributed.",
    "Follow-up samples collected for testing.",
    "Meeting scheduled to discuss corrective actions.",
    "Interim containment measures implemented.",
    "Review of historical data complete.",
    "Vendor audit scheduled for next month.",
    "CAPA plan drafted and pending approval.",
    "Effectiveness check planned for 30 days.",
  ];

  const actionTitles = [
    "Perform root cause analysis",
    "Update affected procedures",
    "Train impacted personnel",
    "Implement corrective action",
    "Verify effectiveness of changes",
    "Review batch records",
    "Conduct supplier audit",
    "Update risk assessment",
    "Schedule preventive maintenance",
    "Complete investigation report",
    "Notify regulatory authority",
    "Update quality agreement",
    "Revise testing methods",
    "Install monitoring equipment",
    "Validate new process",
    "Review trending data",
    "Assess impact on product quality",
    "Coordinate with cross-functional team",
    "Draft standard operating procedure",
    "Perform equipment qualification",
  ];

  const now = new Date();
  const createdIssues: any[] = [];

  for (let i = 0; i < 44; i++) {
    // Spread creation dates over 90 days
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const stageIndex = Math.floor(Math.random() * stages.length);
    const targetStage = stages[stageIndex];
    const reporter = allUsers[Math.floor(Math.random() * allUsers.length)];
    const assignee =
      Math.random() > 0.15
        ? allUsers[Math.floor(Math.random() * allUsers.length)]
        : null;
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const status =
      stageIndex >= stages.length - 1
        ? "closed"
        : stageIndex > 0
          ? "in_progress"
          : "open";

    const [issue] = await knex("issues")
      .insert({
        title: issueTitles[i % issueTitles.length],
        description: `Auto-generated issue for demonstration. Priority: ${priority}. Requires prompt attention and resolution according to established procedures.`,
        priority,
        status,
        reporter_id: reporter.id,
        assignee_id: assignee?.id || null,
        current_stage_id: targetStage.id,
        created_at: createdAt,
        updated_at: createdAt,
      })
      .returning("*");

    createdIssues.push(issue);

    // Create stage assignments
    for (const stage of stages) {
      const completed = stage.position < stageIndex;
      await knex("issue_stage_assignments").insert({
        issue_id: issue.id,
        stage_id: stage.id,
        user_id: assignee?.id || null,
        assigned_at: createdAt,
        completed_at: completed ? new Date(createdAt.getTime() + (stage.position + 1) * 86400000) : null,
      });
    }
  }

  // Create ~150 actions across all issues (existing + new)
  const allIssueIds = await knex("issues").select("id");
  const actionStatuses = ["initiate", "assigned", "completed"] as const;
  let actionCount = 0;

  for (const issueRow of allIssueIds) {
    const numActions = Math.floor(Math.random() * 5) + 1; // 1-5 actions per issue
    for (let j = 0; j < numActions && actionCount < 150; j++) {
      const actStatus = actionStatuses[Math.floor(Math.random() * actionStatuses.length)];
      const actPriority = priorities[Math.floor(Math.random() * priorities.length)];
      const creator = allUsers[Math.floor(Math.random() * allUsers.length)];
      const assignee =
        actStatus !== "initiate"
          ? allUsers[Math.floor(Math.random() * allUsers.length)]
          : Math.random() > 0.5
            ? allUsers[Math.floor(Math.random() * allUsers.length)]
            : null;

      const dueOffset = Math.floor(Math.random() * 60) - 20; // some overdue
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + dueOffset);

      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 60));

      const [action] = await knex("actions")
        .insert({
          issue_id: issueRow.id,
          title: actionTitles[actionCount % actionTitles.length],
          description: `Action item: ${actionTitles[actionCount % actionTitles.length]}. Follow established procedures and document all findings.`,
          status: actStatus,
          priority: actPriority,
          assigned_to: assignee?.id || null,
          created_by: creator.id,
          due_date: dueDate.toISOString().slice(0, 10),
          completed_at: actStatus === "completed" ? new Date() : null,
          created_at: createdAt,
          updated_at: createdAt,
        })
        .returning("*");

      // Add attachment metadata to ~1/3 of actions
      if (Math.random() < 0.33 && actionCount < 150) {
        const fileNames = [
          "investigation_report.pdf",
          "test_results.xlsx",
          "photos.zip",
          "sop_revision.docx",
          "training_record.pdf",
          "audit_checklist.xlsx",
        ];
        const fileTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/zip",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        const fileIdx = Math.floor(Math.random() * fileNames.length);
        const originalName = fileNames[fileIdx];
        const ext = originalName.substring(originalName.lastIndexOf("."));
        await knex("attachments").insert({
          parent_id: action.id,
          parent_type: "action",
          file_name: knex.raw("gen_random_uuid() || ?", [ext]),
          original_name: originalName,
          file_path: `legacy/${originalName}`,
          file_size: Math.floor(Math.random() * 5000000) + 10000,
          mime_type: fileTypes[fileIdx],
          file_extension: ext,
          uploaded_by: creator.id,
        });
      }

      actionCount++;
    }
  }

  // Create ~80 comments across issues
  let commentCount = 0;
  for (const issueRow of allIssueIds) {
    const numComments = Math.floor(Math.random() * 3);
    for (let j = 0; j < numComments && commentCount < 80; j++) {
      const author = allUsers[Math.floor(Math.random() * allUsers.length)];
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));

      await knex("comments").insert({
        issue_id: issueRow.id,
        author_id: author.id,
        body: commentTexts[commentCount % commentTexts.length],
        created_at: createdAt,
      });
      commentCount++;
    }
  }

  // Create 3 pre-built saved report configs
  await knex("saved_reports").insert([
    {
      name: "Overdue Issues Report",
      description: "Issues with actions that have passed their due date",
      report_type: "actions",
      config: JSON.stringify({
        reportType: "actions",
        fields: ["title", "status", "priority", "due_date"],
        dimensions: ["status", "priority"],
        measures: ["count", "overdue_actions"],
        chartType: "bar",
        filters: {},
      }),
      created_by: adminUser.id,
      is_public: true,
    },
    {
      name: "Team Productivity",
      description: "Issue and action counts by assignee",
      report_type: "teams",
      config: JSON.stringify({
        reportType: "teams",
        fields: ["assignee", "status"],
        dimensions: ["assignee"],
        measures: ["issue_count", "action_count", "completed_actions"],
        chartType: "bar",
        filters: {},
      }),
      created_by: adminUser.id,
      is_public: true,
    },
    {
      name: "Priority Breakdown",
      description: "Distribution of issues by priority level",
      report_type: "issues",
      config: JSON.stringify({
        reportType: "issues",
        fields: ["priority", "status"],
        dimensions: ["priority"],
        measures: ["count"],
        chartType: "pie",
        filters: {},
      }),
      created_by: adminUser.id,
      is_public: true,
    },
  ]);

  console.log("Extended seed data created successfully!");
  console.log(`Created: 6 users, 2 teams, 44 issues, ${actionCount} actions, ${commentCount} comments`);
  console.log("All new user passwords: password123");
}
