import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // ── risk_workflow_stages ──────────────────────────────────────────────────
  await knex.schema.createTable("risk_workflow_stages", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("color", 7).notNullable().defaultTo("#6b7280");
    table.integer("position").notNullable().unique();
    table.boolean("requires_signature").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_risk_workflow_stages_position ON risk_workflow_stages (position)"
  );

  await knex("risk_workflow_stages").insert([
    { name: "Identified",       description: "Risk has been identified",                          color: "#6366f1", position: 0, requires_signature: false },
    { name: "Under Assessment", description: "Risk is being assessed for likelihood and impact",  color: "#f59e0b", position: 1, requires_signature: false },
    { name: "Assessed",         description: "Risk assessment is complete",                       color: "#8b5cf6", position: 2, requires_signature: false },
    { name: "In Treatment",     description: "Risk treatment plan is being executed",             color: "#ef4444", position: 3, requires_signature: false },
    { name: "Monitoring",       description: "Risk is being monitored",                           color: "#10b981", position: 4, requires_signature: false },
    { name: "Under Review",     description: "Risk is under management review",                   color: "#3b82f6", position: 5, requires_signature: false },
    { name: "Accepted",         description: "Risk has been formally accepted",                   color: "#6b7280", position: 6, requires_signature: false },
    { name: "Closed",           description: "Risk has been closed",                              color: "#374151", position: 7, requires_signature: false },
  ]);

  // ── audit_workflow_stages ─────────────────────────────────────────────────
  await knex.schema.createTable("audit_workflow_stages", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("color", 7).notNullable().defaultTo("#6b7280");
    table.integer("position").notNullable().unique();
    table.boolean("requires_signature").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_audit_workflow_stages_position ON audit_workflow_stages (position)"
  );

  await knex("audit_workflow_stages").insert([
    { name: "Draft",         description: "Audit is being drafted",                           color: "#6b7280", position: 0, requires_signature: false },
    { name: "Scheduled",     description: "Audit has been scheduled",                         color: "#3b82f6", position: 1, requires_signature: false },
    { name: "Planning",      description: "Audit planning is in progress",                    color: "#8b5cf6", position: 2, requires_signature: false },
    { name: "In Progress",   description: "Audit is actively being conducted",                color: "#f59e0b", position: 3, requires_signature: false },
    { name: "Under Review",  description: "Audit findings are under review",                  color: "#10b981", position: 4, requires_signature: false },
    { name: "Closed",        description: "Audit has been closed",                            color: "#374151", position: 5, requires_signature: false },
  ]);

  // ── procedure_workflow_stages ─────────────────────────────────────────────
  await knex.schema.createTable("procedure_workflow_stages", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("color", 7).notNullable().defaultTo("#6b7280");
    table.integer("position").notNullable().unique();
    table.boolean("requires_signature").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_procedure_workflow_stages_position ON procedure_workflow_stages (position)"
  );

  await knex("procedure_workflow_stages").insert([
    { name: "Draft",           description: "Procedure is being drafted",                     color: "#6b7280", position: 0, requires_signature: false },
    { name: "Review",          description: "Procedure is under review",                      color: "#8b5cf6", position: 1, requires_signature: false },
    { name: "Approval",        description: "Procedure is awaiting approval",                 color: "#f59e0b", position: 2, requires_signature: true  },
    { name: "Published",       description: "Procedure is published and active",              color: "#10b981", position: 3, requires_signature: false },
    { name: "Under Revision",  description: "Procedure is being revised",                     color: "#3b82f6", position: 4, requires_signature: false },
    { name: "Retired",         description: "Procedure has been retired",                     color: "#374151", position: 5, requires_signature: false },
  ]);

  // ── Add current_stage_id to risks, audits, procedures ────────────────────
  await knex.schema.alterTable("risks", (table) => {
    table.uuid("current_stage_id").nullable();
  });
  await knex.schema.alterTable("audits", (table) => {
    table.uuid("current_stage_id").nullable();
  });
  await knex.schema.alterTable("procedures", (table) => {
    table.uuid("current_stage_id").nullable();
  });

  // ── Back-populate current_stage_id for risks based on status ─────────────
  // status values: identified, under_assessment, assessed, in_treatment,
  //                monitoring, under_review, accepted, closed
  for (const [status, stageName] of [
    ["identified",      "Identified"],
    ["under_assessment","Under Assessment"],
    ["assessed",        "Assessed"],
    ["in_treatment",    "In Treatment"],
    ["monitoring",      "Monitoring"],
    ["under_review",    "Under Review"],
    ["accepted",        "Accepted"],
    ["closed",          "Closed"],
  ] as [string, string][]) {
    await knex.raw(
      `UPDATE risks
         SET current_stage_id = rws.id
        FROM risk_workflow_stages rws
       WHERE risks.status = ?
         AND rws.name = ?`,
      [status, stageName]
    );
  }

  // ── Back-populate current_stage_id for audits based on status ────────────
  // status values: draft, scheduled, planning, in_progress, under_review, closed
  for (const [status, stageName] of [
    ["draft",        "Draft"],
    ["scheduled",    "Scheduled"],
    ["planning",     "Planning"],
    ["in_progress",  "In Progress"],
    ["under_review", "Under Review"],
    ["closed",       "Closed"],
  ] as [string, string][]) {
    await knex.raw(
      `UPDATE audits
         SET current_stage_id = aws.id
        FROM audit_workflow_stages aws
       WHERE audits.status = ?
         AND aws.name = ?`,
      [status, stageName]
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("procedures", (table) => {
    table.dropColumn("current_stage_id");
  });
  await knex.schema.alterTable("audits", (table) => {
    table.dropColumn("current_stage_id");
  });
  await knex.schema.alterTable("risks", (table) => {
    table.dropColumn("current_stage_id");
  });

  await knex.schema.dropTableIfExists("procedure_workflow_stages");
  await knex.schema.dropTableIfExists("audit_workflow_stages");
  await knex.schema.dropTableIfExists("risk_workflow_stages");
}
