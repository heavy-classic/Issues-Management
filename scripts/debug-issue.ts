import db from "../src/db";

async function run() {
  // Test fetching a specific issue
  const issues = await db("issues").select("id", "title").limit(3);
  console.log("Sample issues:", issues.map(i => `${i.id} - ${i.title}`));

  if (issues.length === 0) {
    console.log("No issues found!");
    await db.destroy();
    return;
  }

  const id = issues[0].id;
  console.log("\nTesting getIssue for:", id);

  try {
    const issue = await db("issues")
      .select(
        "issues.*",
        "reporter.email as reporter_email",
        "reporter.name as reporter_name",
        "assignee.email as assignee_email",
        "assignee.name as assignee_name",
        "ws.name as stage_name",
        "ws.color as stage_color"
      )
      .leftJoin("users as reporter", "issues.reporter_id", "reporter.id")
      .leftJoin("users as assignee", "issues.assignee_id", "assignee.id")
      .leftJoin("workflow_stages as ws", "issues.current_stage_id", "ws.id")
      .where("issues.id", id)
      .first();

    console.log("Issue found:", issue ? issue.title : "NOT FOUND");

    if (issue) {
      // Test actions query with new attachments subquery
      const actions = await db("actions")
        .select(
          "actions.*",
          db.raw(
            "(SELECT COUNT(*) FROM attachments WHERE parent_type = 'action' AND parent_id = actions.id AND is_deleted = false)::int as attachment_count"
          )
        )
        .where("actions.issue_id", id);
      console.log("Actions count:", actions.length);

      // Test issue-level attachments
      const attachments = await db("attachments")
        .where({
          parent_type: "issue",
          parent_id: id,
          is_deleted: false,
        });
      console.log("Issue attachments:", attachments.length);
    }
  } catch (e: any) {
    console.error("ERROR:", e.message);
    console.error(e.stack);
  }

  // Check for orphaned data
  console.log("\n--- Checking data integrity ---");
  const orphanedActions = await db("actions")
    .leftJoin("issues", "actions.issue_id", "issues.id")
    .whereNull("issues.id")
    .count("* as c")
    .first();
  console.log("Orphaned actions (no parent issue):", orphanedActions?.c);

  const orphanedComments = await db("comments")
    .leftJoin("issues", "comments.issue_id", "issues.id")
    .whereNull("issues.id")
    .count("* as c")
    .first();
  console.log("Orphaned comments:", orphanedComments?.c);

  const orphanedAttachments = await db("attachments")
    .where("parent_type", "action")
    .leftJoin("actions", "attachments.parent_id", "actions.id")
    .whereNull("actions.id")
    .count("* as c")
    .first();
  console.log("Orphaned action attachments:", orphanedAttachments?.c);

  // Check users referenced by issues exist
  const badReporters = await db("issues")
    .leftJoin("users", "issues.reporter_id", "users.id")
    .whereNull("users.id")
    .count("* as c")
    .first();
  console.log("Issues with missing reporter:", badReporters?.c);

  const badStages = await db("issues")
    .whereNotNull("current_stage_id")
    .leftJoin("workflow_stages", "issues.current_stage_id", "workflow_stages.id")
    .whereNull("workflow_stages.id")
    .count("* as c")
    .first();
  console.log("Issues with missing stage:", badStages?.c);

  await db.destroy();
}

run();
