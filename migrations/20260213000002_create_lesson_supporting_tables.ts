import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Lesson stage assignments (workflow tracking)
  await knex.schema.createTable("lesson_stage_assignments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("lesson_id")
      .notNullable()
      .references("id")
      .inTable("lessons")
      .onDelete("CASCADE");
    table
      .uuid("stage_id")
      .notNullable()
      .references("id")
      .inTable("lesson_workflow_stages")
      .onDelete("RESTRICT");
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("assigned_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("completed_at").nullable();
    table
      .uuid("signature_id")
      .nullable()
      .references("id")
      .inTable("electronic_signatures")
      .onDelete("RESTRICT");
    table.unique(["lesson_id", "stage_id"]);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_lesson_stage_assignments_lesson_id ON lesson_stage_assignments (lesson_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_lesson_stage_assignments_stage_id ON lesson_stage_assignments (stage_id)"
  );

  // Lesson-Issue junction table
  await knex.schema.createTable("lesson_issues", (table) => {
    table
      .uuid("lesson_id")
      .notNullable()
      .references("id")
      .inTable("lessons")
      .onDelete("CASCADE");
    table
      .uuid("issue_id")
      .notNullable()
      .references("id")
      .inTable("issues")
      .onDelete("CASCADE");
    table.string("relationship", 50).defaultTo("related");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["lesson_id", "issue_id"]);
  });

  // Lesson comments
  await knex.schema.createTable("lesson_comments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("lesson_id")
      .notNullable()
      .references("id")
      .inTable("lessons")
      .onDelete("CASCADE");
    table
      .uuid("author_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.text("body").notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_lesson_comments_lesson_id ON lesson_comments (lesson_id)"
  );

  // Add 'lesson' to attachment parent type enum
  await knex.schema.raw("ALTER TYPE attachment_parent_type ADD VALUE IF NOT EXISTS 'lesson'");

  // Add lesson_id to electronic_signatures for LL workflow signatures
  await knex.schema.alterTable("electronic_signatures", (table) => {
    table
      .uuid("lesson_id")
      .nullable()
      .references("id")
      .inTable("lessons")
      .onDelete("RESTRICT");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("electronic_signatures", (table) => {
    table.dropColumn("lesson_id");
  });
  await knex.schema.dropTableIfExists("lesson_comments");
  await knex.schema.dropTableIfExists("lesson_issues");
  await knex.schema.dropTableIfExists("lesson_stage_assignments");
}
