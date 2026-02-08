import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    CREATE TYPE risk_status AS ENUM (
      'draft', 'identified', 'under_assessment', 'assessed',
      'in_treatment', 'monitoring', 'under_review', 'accepted', 'closed'
    )
  `);

  await knex.schema.raw(`
    CREATE TYPE risk_treatment_strategy AS ENUM ('avoid', 'mitigate', 'transfer', 'accept')
  `);

  await knex.schema.raw(`
    CREATE TYPE risk_velocity AS ENUM ('slow', 'moderate', 'fast', 'very_fast')
  `);

  await knex.schema.raw(`
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'extreme')
  `);

  await knex.schema.raw("CREATE SEQUENCE IF NOT EXISTS risk_number_seq START 1");

  await knex.schema.createTable("risks", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("risk_number", 20).unique().notNullable();
    table.string("title", 255).notNullable();
    table.text("description").nullable();
    table
      .uuid("category_id")
      .nullable()
      .references("id")
      .inTable("risk_categories")
      .onDelete("SET NULL");
    table.string("source", 255).nullable();
    table.specificType("status", "risk_status").notNullable().defaultTo("draft");

    // Inherent risk (before controls)
    table.integer("inherent_likelihood").nullable();
    table.integer("inherent_impact").nullable();
    table.integer("inherent_score").nullable();
    table.specificType("inherent_level", "risk_level").nullable();

    // Residual risk (after controls)
    table.integer("residual_likelihood").nullable();
    table.integer("residual_impact").nullable();
    table.integer("residual_score").nullable();
    table.specificType("residual_level", "risk_level").nullable();

    // Target risk (desired state)
    table.integer("target_likelihood").nullable();
    table.integer("target_impact").nullable();
    table.integer("target_score").nullable();
    table.specificType("target_level", "risk_level").nullable();

    table.specificType("velocity", "risk_velocity").nullable();
    table.specificType("treatment_strategy", "risk_treatment_strategy").nullable();
    table.text("treatment_plan").nullable();
    table.string("risk_appetite", 50).nullable();

    table
      .uuid("owner_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .uuid("reviewer_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.date("identified_date").nullable();
    table.date("next_review_date").nullable();
    table.date("closed_date").nullable();

    table.specificType("tags", "text[]").nullable();
    table.jsonb("metadata").defaultTo("{}");

    table
      .uuid("created_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Check constraints for likelihood/impact 1-5
  await knex.schema.raw("ALTER TABLE risks ADD CONSTRAINT chk_inherent_likelihood CHECK (inherent_likelihood BETWEEN 1 AND 5)");
  await knex.schema.raw("ALTER TABLE risks ADD CONSTRAINT chk_inherent_impact CHECK (inherent_impact BETWEEN 1 AND 5)");
  await knex.schema.raw("ALTER TABLE risks ADD CONSTRAINT chk_residual_likelihood CHECK (residual_likelihood BETWEEN 1 AND 5)");
  await knex.schema.raw("ALTER TABLE risks ADD CONSTRAINT chk_residual_impact CHECK (residual_impact BETWEEN 1 AND 5)");
  await knex.schema.raw("ALTER TABLE risks ADD CONSTRAINT chk_target_likelihood CHECK (target_likelihood BETWEEN 1 AND 5)");
  await knex.schema.raw("ALTER TABLE risks ADD CONSTRAINT chk_target_impact CHECK (target_impact BETWEEN 1 AND 5)");

  // Indexes
  await knex.schema.raw("CREATE INDEX idx_risks_status ON risks (status)");
  await knex.schema.raw("CREATE INDEX idx_risks_category ON risks (category_id)");
  await knex.schema.raw("CREATE INDEX idx_risks_owner ON risks (owner_id)");
  await knex.schema.raw("CREATE INDEX idx_risks_inherent_level ON risks (inherent_level)");
  await knex.schema.raw("CREATE INDEX idx_risks_residual_level ON risks (residual_level)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("risks");
  await knex.schema.raw("DROP SEQUENCE IF EXISTS risk_number_seq");
  await knex.schema.raw("DROP TYPE IF EXISTS risk_level");
  await knex.schema.raw("DROP TYPE IF EXISTS risk_velocity");
  await knex.schema.raw("DROP TYPE IF EXISTS risk_treatment_strategy");
  await knex.schema.raw("DROP TYPE IF EXISTS risk_status");
}
