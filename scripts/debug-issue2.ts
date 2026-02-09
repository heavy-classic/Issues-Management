import db from "../src/db";

async function run() {
  const id = "3ed7204d-0817-47fb-87e9-dd1ac6daf9b3";

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
    console.log("Issue:", issue ? "FOUND" : "NOT FOUND");
  } catch (e: any) {
    console.error("Issue error:", e.message);
  }

  try {
    const comments = await db("comments")
      .select("comments.*", "users.email as author_email", "users.name as author_name")
      .leftJoin("users", "comments.author_id", "users.id")
      .where("comments.issue_id", id)
      .orderBy("comments.created_at", "asc");
    console.log("Comments:", comments.length);
  } catch (e: any) {
    console.error("Comments error:", e.message);
  }

  try {
    const sa = await db("issue_stage_assignments")
      .select(
        "issue_stage_assignments.*",
        "workflow_stages.name as stage_name",
        "workflow_stages.color as stage_color",
        "workflow_stages.position as stage_position",
        "workflow_stages.requires_signature",
        "users.email as assignee_email",
        "users.name as assignee_name"
      )
      .leftJoin("workflow_stages", "issue_stage_assignments.stage_id", "workflow_stages.id")
      .leftJoin("users", "issue_stage_assignments.user_id", "users.id")
      .where("issue_stage_assignments.issue_id", id)
      .orderBy("workflow_stages.position", "asc");
    console.log("StageAssignments:", sa.length);
  } catch (e: any) {
    console.error("SA error:", e.message);
  }

  try {
    const sigs = await db("electronic_signatures")
      .where("issue_id", id)
      .orderBy("signature_timestamp", "asc");
    console.log("Sigs:", sigs.length);
  } catch (e: any) {
    console.error("Sigs error:", e.message);
  }

  try {
    const actions = await db("actions")
      .select(
        "actions.*",
        "assignee.email as assignee_email",
        "assignee.name as assignee_name",
        "creator.email as creator_email",
        "creator.name as creator_name",
        db.raw(
          "(SELECT COUNT(*) FROM attachments WHERE parent_type = 'action' AND parent_id = actions.id AND is_deleted = false)::int as attachment_count"
        )
      )
      .leftJoin("users as assignee", "actions.assigned_to", "assignee.id")
      .leftJoin("users as creator", "actions.created_by", "creator.id")
      .where("actions.issue_id", id)
      .orderBy("actions.created_at", "asc");
    console.log("Actions:", actions.length);
  } catch (e: any) {
    console.error("Actions error:", e.message);
  }

  try {
    const attachments = await db("attachments")
      .select("attachments.*", "users.name as uploader_name", "users.email as uploader_email")
      .leftJoin("users", "attachments.uploaded_by", "users.id")
      .where({
        "attachments.parent_type": "issue",
        "attachments.parent_id": id,
        "attachments.is_deleted": false,
      })
      .orderBy("attachments.uploaded_at", "asc");
    console.log("Attachments:", attachments.length);
  } catch (e: any) {
    console.error("Attachments error:", e.message);
  }

  await db.destroy();
}
run();
