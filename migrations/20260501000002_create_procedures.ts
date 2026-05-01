import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("procedures", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("procedure_number", 50).unique().notNullable();
    table.string("title", 500).notNullable();
    table.string("procedure_type", 100).nullable();
    table.string("status", 50).notNullable().defaultTo("draft");
    table.integer("revision_number").notNullable().defaultTo(0);
    table.date("revision_date").nullable();
    table.text("revision_description").nullable();
    table.date("approval_date").nullable();
    table
      .uuid("approved_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("building_unit", 200).nullable();
    table.string("safety_classification", 100).nullable();
    // Introduction subsections
    table.text("purpose").nullable();
    table.text("scope").nullable();
    table.text("applicability").nullable();
    // Precautions
    table.text("precautions").nullable();
    // Prerequisites subsections
    table.text("prereq_planning").nullable();
    table.text("prereq_documents").nullable();
    table.text("prereq_tools").nullable();
    table.text("prereq_field_prep").nullable();
    table.text("prereq_approvals").nullable();
    // Post-performance subsections
    table.text("post_testing").nullable();
    table.text("post_restoration").nullable();
    table.text("post_results").nullable();
    // Records
    table.text("records_section").nullable();
    // Source requirements
    table.text("source_requirements").nullable();
    // Authorship
    table
      .uuid("author_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw("CREATE INDEX idx_procedures_status ON procedures (status)");
  await knex.schema.raw("CREATE INDEX idx_procedures_type ON procedures (procedure_type)");
  await knex.schema.raw("CREATE INDEX idx_procedures_author ON procedures (author_id)");

  await knex.schema.createTable("procedure_sections", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("procedure_id")
      .notNullable()
      .references("id")
      .inTable("procedures")
      .onDelete("CASCADE");
    table.string("title", 255).notNullable();
    table.integer("sequence_number").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_procedure_sections_procedure_id ON procedure_sections (procedure_id)"
  );

  await knex.schema.createTable("procedure_steps", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("section_id")
      .notNullable()
      .references("id")
      .inTable("procedure_sections")
      .onDelete("CASCADE");
    table
      .uuid("parent_step_id")
      .nullable()
      .references("id")
      .inTable("procedure_steps")
      .onDelete("CASCADE");
    table.integer("step_level").notNullable().defaultTo(1);
    table.integer("sequence_number").notNullable();
    table.string("step_type", 50).notNullable().defaultTo("BASIC");
    table.text("step_text").notNullable();
    table.text("condition_text").nullable();
    table.boolean("is_nonsequential").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_procedure_steps_section_id ON procedure_steps (section_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_procedure_steps_parent_step_id ON procedure_steps (parent_step_id)"
  );

  await knex.schema.createTable("procedure_revisions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("procedure_id")
      .notNullable()
      .references("id")
      .inTable("procedures")
      .onDelete("CASCADE");
    table.integer("revision_number").notNullable();
    table.date("revision_date").nullable();
    table.text("description").notNullable();
    table
      .uuid("author_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_procedure_revisions_procedure_id ON procedure_revisions (procedure_id)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("procedure_revisions");
  await knex.schema.dropTableIfExists("procedure_steps");
  await knex.schema.dropTableIfExists("procedure_sections");
  await knex.schema.dropTableIfExists("procedures");
}
