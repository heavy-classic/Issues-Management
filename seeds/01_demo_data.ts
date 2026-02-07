import type { Knex } from "knex";
import bcrypt from "bcrypt";

export async function seed(knex: Knex): Promise<void> {
  // Check if admin user already exists
  const existing = await knex("users").where({ email: "admin@example.com" }).first();
  if (existing) {
    console.log("Seed data already exists, skipping...");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);

  // Create admin user
  const [adminUser] = await knex("users")
    .insert({
      email: "admin@example.com",
      password_hash: passwordHash,
      name: "Admin",
      full_name: "System Administrator",
      role: "admin",
      status: "active",
    })
    .returning("*");

  // Create regular users
  const userPasswordHash = await bcrypt.hash("password123", 12);

  const [user1] = await knex("users")
    .insert({
      email: "john.smith@example.com",
      password_hash: userPasswordHash,
      name: "John",
      full_name: "John Smith",
      role: "user",
      status: "active",
    })
    .returning("*");

  const [user2] = await knex("users")
    .insert({
      email: "jane.doe@example.com",
      password_hash: userPasswordHash,
      name: "Jane",
      full_name: "Jane Doe",
      role: "manager",
      status: "active",
    })
    .returning("*");

  const [user3] = await knex("users")
    .insert({
      email: "bob.wilson@example.com",
      password_hash: userPasswordHash,
      name: "Bob",
      full_name: "Robert Wilson",
      role: "user",
      status: "active",
    })
    .returning("*");

  // Create teams
  const [qaTeam] = await knex("teams")
    .insert({ name: "Quality Assurance", description: "QA and testing team" })
    .returning("*");

  const [devTeam] = await knex("teams")
    .insert({ name: "Development", description: "Software development team" })
    .returning("*");

  // Add members to teams
  await knex("team_members").insert([
    { team_id: qaTeam.id, user_id: user1.id, role: "member" },
    { team_id: qaTeam.id, user_id: user2.id, role: "lead" },
    { team_id: devTeam.id, user_id: user3.id, role: "member" },
    { team_id: devTeam.id, user_id: adminUser.id, role: "lead" },
  ]);

  // Get workflow stages
  const stages = await knex("workflow_stages").orderBy("position", "asc");
  const stageMap = new Map(stages.map((s: any) => [s.position, s]));

  // Create sample issues at different stages
  const issueData = [
    {
      title: "Equipment calibration out of tolerance",
      description: "Temperature sensor in Lab B reading 2.3 degrees above reference standard. Requires immediate investigation per SOP-QC-042.",
      priority: "critical",
      reporter_id: user1.id,
      assignee_id: user2.id,
      stagePosition: 2, // Action Plan
    },
    {
      title: "Documentation gap in batch record #4521",
      description: "Missing operator signature on page 3 of batch record. Discovered during routine review.",
      priority: "high",
      reporter_id: user2.id,
      assignee_id: user1.id,
      stagePosition: 1, // Screening
    },
    {
      title: "Raw material supplier qualification expired",
      description: "Vendor ABC Corp qualification expired on 2026-01-15. Need to schedule re-qualification audit.",
      priority: "high",
      reporter_id: adminUser.id,
      assignee_id: user3.id,
      stagePosition: 0, // Initiate
    },
    {
      title: "Cleanroom particle count trend increase",
      description: "Weekly monitoring data shows upward trend in 0.5 micron particles in Room 201. Still within limits but trending toward action level.",
      priority: "medium",
      reporter_id: user3.id,
      assignee_id: null,
      stagePosition: 0, // Initiate
    },
    {
      title: "Training record update for new SOP revision",
      description: "SOP-MFG-015 Rev C requires all manufacturing operators to complete updated training within 30 days.",
      priority: "medium",
      reporter_id: user2.id,
      assignee_id: user1.id,
      stagePosition: 3, // Completing
    },
    {
      title: "Annual product review for Product X",
      description: "Schedule and initiate annual product review per regulatory commitment. Due date: 2026-03-31.",
      priority: "low",
      reporter_id: adminUser.id,
      assignee_id: user2.id,
      stagePosition: 0, // Initiate
    },
  ];

  for (const data of issueData) {
    const targetStage = stageMap.get(data.stagePosition);
    if (!targetStage) continue;

    const [issue] = await knex("issues")
      .insert({
        title: data.title,
        description: data.description,
        priority: data.priority,
        reporter_id: data.reporter_id,
        assignee_id: data.assignee_id,
        current_stage_id: targetStage.id,
      })
      .returning("*");

    // Create stage assignments
    for (const stage of stages) {
      const completed = stage.position < data.stagePosition;
      await knex("issue_stage_assignments").insert({
        issue_id: issue.id,
        stage_id: stage.id,
        user_id: data.assignee_id,
        assigned_at: new Date(),
        completed_at: completed ? new Date() : null,
      });
    }

    // Add a comment to some issues
    if (data.stagePosition > 0) {
      await knex("comments").insert({
        issue_id: issue.id,
        author_id: data.reporter_id,
        body: "Initial assessment completed. Moving to next stage for further action.",
      });
    }
  }

  console.log("Seed data created successfully!");
  console.log("Admin login: admin@example.com / admin123");
  console.log("User logins: john.smith@example.com, jane.doe@example.com, bob.wilson@example.com / password123");
}
