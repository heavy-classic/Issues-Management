import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // ── 1. Add issue_number column ────────────────────────────────────────────
  await knex.schema.alterTable("issues", (table) => {
    table.string("issue_number", 50).nullable();
  });

  // ── 2. Back-fill existing issues with ISSUE-YYYY-NNNNN ───────────────────
  await knex.raw(`
    UPDATE issues
    SET issue_number = sub.num
    FROM (
      SELECT
        id,
        'ISSUE-' || EXTRACT(YEAR FROM created_at)::int || '-' ||
          LPAD(ROW_NUMBER() OVER (
            PARTITION BY EXTRACT(YEAR FROM created_at)
            ORDER BY created_at ASC, id ASC
          )::text, 5, '0') AS num
      FROM issues
    ) sub
    WHERE issues.id = sub.id
  `);

  // ── 3. Add unique index ───────────────────────────────────────────────────
  await knex.schema.raw(
    "CREATE UNIQUE INDEX idx_issues_issue_number ON issues (issue_number) WHERE issue_number IS NOT NULL"
  );

  // ── 4. Re-initialize workflow for existing issues that have no stage assignments
  //    (issues created before workflow stages were set up)
  const stageIds: string[] = await knex("workflow_stages")
    .orderBy("position", "asc")
    .pluck("id");

  if (stageIds.length === 0) return;

  // Find first stage id
  const firstStageId = stageIds[0];

  // Find issues with no stage assignments at all
  const issuesWithoutWorkflow = await knex("issues")
    .whereNotIn(
      "id",
      knex("issue_stage_assignments").distinct("issue_id")
    )
    .pluck("id");

  if (issuesWithoutWorkflow.length === 0) return;

  // Insert a stage assignment row for every stage for each issue
  const rows: any[] = [];
  for (const issueId of issuesWithoutWorkflow) {
    for (const stageId of stageIds) {
      rows.push({
        issue_id: issueId,
        stage_id: stageId,
        user_id: null,
        assigned_at: new Date(),
      });
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    await knex("issue_stage_assignments").insert(rows.slice(i, i + 500));
  }

  // Set current_stage_id to first stage for issues that don't have one
  await knex("issues")
    .whereIn("id", issuesWithoutWorkflow)
    .whereNull("current_stage_id")
    .update({ current_stage_id: firstStageId });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw("DROP INDEX IF EXISTS idx_issues_issue_number");
  await knex.schema.alterTable("issues", (table) => {
    table.dropColumn("issue_number");
  });
}
