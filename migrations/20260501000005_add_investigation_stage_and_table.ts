import type { Knex } from "knex";

function uuidv4() {
  return crypto.randomUUID();
}

export async function up(knex: Knex): Promise<void> {
  // ── 1. Shift existing workflow stages at position >= 2 to make room ───────
  // Use +100 offset to avoid unique constraint violations during the shift
  await knex.raw(
    `UPDATE workflow_stages SET position = position + 100 WHERE position >= 2`
  );
  await knex.raw(
    `UPDATE workflow_stages SET position = position - 99 WHERE position >= 102`
  );
  // Positions are now: 0=Initiate, 1=Screening, 3=Action Plan, 4=Completing, 5=Closeout

  // ── 2. Insert "Investigation" at position 2 ───────────────────────────────
  const [investigationStage] = await knex("workflow_stages")
    .insert({
      name: "Investigation",
      description:
        "Root cause investigation — conduct barrier analysis, 5-why, or fishbone analysis",
      color: "#dc2626",
      position: 2,
      requires_signature: false,
    })
    .returning("*");

  // ── 3. Add stage assignments for existing issues ──────────────────────────
  // Any issue that already has stage assignments needs one for Investigation
  const issueIds = await knex("issue_stage_assignments")
    .distinct("issue_id")
    .pluck("issue_id");

  if (issueIds.length > 0 && investigationStage) {
    await knex("issue_stage_assignments").insert(
      issueIds.map((issueId: string) => ({
        id: uuidv4(),
        issue_id: issueId,
        stage_id: investigationStage.id,
        user_id: null,
        assigned_at: new Date(),
      }))
    );
  }

  // ── 4. Create investigations table ───────────────────────────────────────
  await knex.schema.createTable("investigations", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("issue_id").notNullable().references("id").inTable("issues").onDelete("CASCADE");
    table
      .enum("type", ["barrier_analysis", "five_why", "fishbone"])
      .notNullable();
    table.string("title", 255).notNullable();
    table
      .enum("status", ["draft", "complete"])
      .notNullable()
      .defaultTo("draft");
    table.jsonb("body").notNullable().defaultTo("{}");
    table.uuid("created_by").nullable().references("id").inTable("users");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_investigations_issue_id ON investigations (issue_id)"
  );

  // ── 5. Seed instruction for the Investigation stage ───────────────────────
  if (investigationStage) {
    const instrKey = `instructions:issues:stage:${investigationStage.id}`;
    const existing = await knex("app_settings").where({ key: instrKey }).first();
    if (!existing) {
      await knex("app_settings").insert({
        key: instrKey,
        value: `An investigation is required before an action plan can be developed.

Choose the most appropriate investigation method for this issue and complete the analysis before advancing to the Action Plan stage:

🔲  Barrier Analysis — best for incidents involving failed safeguards or safety events. Identify the hazard, what was being protected, and which barriers were present, failed, or absent.

🔢  5 Why Analysis — best for process failures and recurring problems. Ask "Why?" five times to drill from symptom to root cause. Keep each answer factual and specific.

🐟  Fishbone (Ishikawa) Diagram — best for complex issues with multiple potential causes. Explore causes across Machine, Method, Material, Man, Measurement, and Environment.

Instructions:
• You may run multiple investigation types if the situation warrants
• Each investigation can be exported as a standalone PDF report
• Mark the investigation "Complete" before advancing to Action Plan
• Attach supporting evidence (photos, data, reports) to the issue`,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop investigations table
  await knex.schema.dropTableIfExists("investigations");

  // Remove Investigation stage assignments
  const invStage = await knex("workflow_stages")
    .where({ name: "Investigation", position: 2 })
    .first();

  if (invStage) {
    await knex("issue_stage_assignments")
      .where({ stage_id: invStage.id })
      .delete();
    await knex("workflow_stages").where({ id: invStage.id }).delete();
  }

  // Shift positions back: 3→2, 4→3, 5→4
  await knex.raw(
    `UPDATE workflow_stages SET position = position + 100 WHERE position >= 3`
  );
  await knex.raw(
    `UPDATE workflow_stages SET position = position - 101 WHERE position >= 103`
  );
}
