import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Checklist status enum
  await knex.schema.raw(`
    CREATE TYPE checklist_status AS ENUM ('draft', 'active', 'archived')
  `);

  // Checklist answer type enum
  await knex.schema.raw(`
    CREATE TYPE checklist_answer_type AS ENUM ('yes_no', 'yes_no_na', 'compliant', 'rating_scale', 'expectations')
  `);

  // Risk level enum (used by audits and checklist criteria)
  await knex.schema.raw(`
    CREATE TYPE audit_risk_level AS ENUM ('low', 'medium', 'high', 'critical')
  `);

  // Master checklist templates
  await knex.schema.createTable("checklists", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("instructions").notNullable().defaultTo("");
    table.specificType("status", "checklist_status").notNullable().defaultTo("draft");
    table.integer("version").notNullable().defaultTo(1);
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_checklists_status ON checklists (status)"
  );

  // Sections within a checklist
  await knex.schema.createTable("checklist_groups", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("checklist_id")
      .notNullable()
      .references("id")
      .inTable("checklists")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table.integer("position").notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_checklist_groups_checklist ON checklist_groups (checklist_id, position)"
  );

  // Individual criteria within groups
  await knex.schema.createTable("checklist_criteria", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("group_id")
      .notNullable()
      .references("id")
      .inTable("checklist_groups")
      .onDelete("CASCADE");
    table.string("criterion_id_display", 20).notNullable().defaultTo("");
    table.text("text").notNullable();
    table.text("reference_citation").notNullable().defaultTo("");
    table.specificType("answer_type", "checklist_answer_type").notNullable().defaultTo("yes_no");
    table.specificType("risk_rating", "audit_risk_level").nullable();
    table.decimal("weight", 5, 2).notNullable().defaultTo(1.0);
    table.jsonb("required_evidence").nullable();
    table.boolean("comments_enabled").notNullable().defaultTo(true);
    table.boolean("attachments_allowed").notNullable().defaultTo(true);
    table.boolean("finding_creation_enabled").notNullable().defaultTo(true);
    table.text("help_text").notNullable().defaultTo("");
    table.integer("position").notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_checklist_criteria_group ON checklist_criteria (group_id, position)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("checklist_criteria");
  await knex.schema.dropTableIfExists("checklist_groups");
  await knex.schema.dropTableIfExists("checklists");
  await knex.schema.raw("DROP TYPE IF EXISTS audit_risk_level");
  await knex.schema.raw("DROP TYPE IF EXISTS checklist_answer_type");
  await knex.schema.raw("DROP TYPE IF EXISTS checklist_status");
}
