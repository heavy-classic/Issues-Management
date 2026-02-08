import db from "../src/db";

async function reset() {
  console.log("Truncating all data tables...");

  // Disable FK checks and truncate in dependency order
  await db.raw("TRUNCATE TABLE attachments CASCADE");
  await db.raw("TRUNCATE TABLE audit_log CASCADE");
  await db.raw("TRUNCATE TABLE electronic_signatures CASCADE");
  await db.raw("TRUNCATE TABLE comments CASCADE");
  await db.raw("TRUNCATE TABLE issue_stage_assignments CASCADE");
  await db.raw("TRUNCATE TABLE actions CASCADE");
  await db.raw("TRUNCATE TABLE issues CASCADE");
  await db.raw("TRUNCATE TABLE saved_reports CASCADE");
  await db.raw("TRUNCATE TABLE refresh_tokens CASCADE");
  await db.raw("TRUNCATE TABLE team_members CASCADE");
  await db.raw("TRUNCATE TABLE teams CASCADE");
  await db.raw("TRUNCATE TABLE workflow_stages CASCADE");
  await db.raw("TRUNCATE TABLE users CASCADE");

  // Re-insert workflow stages (created by migration, not seeds)
  await db("workflow_stages").insert([
    { name: "Initiate", description: "Issue has been created and is awaiting initial review", color: "#3B82F6", position: 0, requires_signature: false },
    { name: "Screening", description: "Issue is being screened for validity and categorization", color: "#8B5CF6", position: 1, requires_signature: false },
    { name: "Action Plan", description: "Action plan is being developed to address the issue", color: "#F59E0B", position: 2, requires_signature: true },
    { name: "Completing", description: "Action plan is being executed", color: "#10B981", position: 3, requires_signature: true },
    { name: "Closeout", description: "Issue is being reviewed for closure", color: "#6366F1", position: 4, requires_signature: true },
  ]);

  console.log("All data cleared. Running seeds...");

  await db.seed.run();

  console.log("Done!");
  await db.destroy();
}

reset().catch(async (e) => {
  console.error("Reset failed:", e.message);
  await db.destroy();
  process.exit(1);
});
