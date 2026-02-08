import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Audit status enum
  await knex.schema.raw(`
    CREATE TYPE audit_status AS ENUM ('draft', 'scheduled', 'planning', 'in_progress', 'under_review', 'closed', 'cancelled')
  `);

  // Finding severity enum
  await knex.schema.raw(`
    CREATE TYPE finding_severity AS ENUM ('observation', 'minor', 'major', 'critical')
  `);

  // Main audits table
  await knex.schema.createTable("audits", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("audit_number", 20).notNullable().unique();
    table.string("title", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table
      .uuid("audit_type_id")
      .notNullable()
      .references("id")
      .inTable("audit_types")
      .onDelete("RESTRICT");
    table.specificType("status", "audit_status").notNullable().defaultTo("draft");
    table.string("current_phase", 100).nullable();
    table.specificType("priority", "issue_priority").notNullable().defaultTo("medium");
    table.specificType("risk_level", "audit_risk_level").nullable();
    table
      .uuid("lead_auditor_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("auditee_department", 255).notNullable().defaultTo("");
    table
      .uuid("auditee_contact_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.text("objective").notNullable().defaultTo("");
    table.text("scope").notNullable().defaultTo("");
    table.text("methodology").notNullable().defaultTo("");
    table.string("criteria_standards", 500).notNullable().defaultTo("");
    table.string("location", 255).notNullable().defaultTo("");
    table.date("scheduled_start").nullable();
    table.date("scheduled_end").nullable();
    table.date("actual_start").nullable();
    table.date("actual_end").nullable();
    table.date("report_due").nullable();
    table.string("overall_rating", 100).nullable();
    table.decimal("compliance_score", 5, 2).nullable();
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
    table.timestamp("completed_at", { useTz: true }).nullable();
  });

  await knex.schema.raw("CREATE INDEX idx_audits_status ON audits (status)");
  await knex.schema.raw("CREATE INDEX idx_audits_type ON audits (audit_type_id)");
  await knex.schema.raw("CREATE INDEX idx_audits_lead ON audits (lead_auditor_id)");
  await knex.schema.raw("CREATE INDEX idx_audits_number ON audits (audit_number)");
  await knex.schema.raw("CREATE INDEX idx_audits_risk ON audits (risk_level)");
  await knex.schema.raw("CREATE INDEX idx_audits_dates ON audits (scheduled_start, scheduled_end)");

  // Sequence for audit numbers
  await knex.schema.raw("CREATE SEQUENCE audit_number_seq START WITH 1");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw("DROP SEQUENCE IF EXISTS audit_number_seq");
  await knex.schema.dropTableIfExists("audits");
  await knex.schema.raw("DROP TYPE IF EXISTS finding_severity");
  await knex.schema.raw("DROP TYPE IF EXISTS audit_status");
}
