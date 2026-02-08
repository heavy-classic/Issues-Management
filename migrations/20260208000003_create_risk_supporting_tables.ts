import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Risk assessments - history log of scoring evaluations
  await knex.schema.createTable("risk_assessments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("risk_id")
      .notNullable()
      .references("id")
      .inTable("risks")
      .onDelete("CASCADE");
    table.date("assessment_date").notNullable();
    table
      .uuid("assessor_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.integer("likelihood").notNullable();
    table.integer("impact").notNullable();
    table.integer("score").notNullable();
    table.specificType("level", "risk_level").notNullable();
    table.text("rationale").nullable();
    table.string("assessment_type", 50).notNullable().defaultTo("residual");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw("ALTER TABLE risk_assessments ADD CONSTRAINT chk_assessment_likelihood CHECK (likelihood BETWEEN 1 AND 5)");
  await knex.schema.raw("ALTER TABLE risk_assessments ADD CONSTRAINT chk_assessment_impact CHECK (impact BETWEEN 1 AND 5)");
  await knex.schema.raw("CREATE INDEX idx_risk_assessments_risk ON risk_assessments (risk_id)");

  // Risk mitigations - treatment actions / controls
  await knex.schema.createTable("risk_mitigations", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("risk_id")
      .notNullable()
      .references("id")
      .inTable("risks")
      .onDelete("CASCADE");
    table.string("title", 255).notNullable();
    table.text("description").nullable();
    table.string("mitigation_type", 50).nullable();
    table.string("status", 50).notNullable().defaultTo("planned");
    table.string("effectiveness", 50).defaultTo("not_tested");
    table
      .uuid("owner_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.date("due_date").nullable();
    table.date("completed_date").nullable();
    table.decimal("cost_estimate", 12, 2).nullable();
    table.text("notes").nullable();
    table
      .uuid("created_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw("CREATE INDEX idx_risk_mitigations_risk ON risk_mitigations (risk_id)");

  // Risk-Issue links
  await knex.schema.createTable("risk_issues", (table) => {
    table
      .uuid("risk_id")
      .notNullable()
      .references("id")
      .inTable("risks")
      .onDelete("CASCADE");
    table
      .uuid("issue_id")
      .notNullable()
      .references("id")
      .inTable("issues")
      .onDelete("CASCADE");
    table.string("relationship", 50).defaultTo("related");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["risk_id", "issue_id"]);
  });

  // Risk-Audit links
  await knex.schema.createTable("risk_audits", (table) => {
    table
      .uuid("risk_id")
      .notNullable()
      .references("id")
      .inTable("risks")
      .onDelete("CASCADE");
    table
      .uuid("audit_id")
      .notNullable()
      .references("id")
      .inTable("audits")
      .onDelete("CASCADE");
    table.string("relationship", 50).defaultTo("related");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["risk_id", "audit_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("risk_audits");
  await knex.schema.dropTableIfExists("risk_issues");
  await knex.schema.dropTableIfExists("risk_mitigations");
  await knex.schema.dropTableIfExists("risk_assessments");
}
