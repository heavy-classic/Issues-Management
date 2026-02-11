import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    CREATE TYPE lesson_type AS ENUM ('positive', 'negative', 'improvement')
  `);

  await knex.schema.raw(`
    CREATE TYPE lesson_impact_level AS ENUM ('low', 'medium', 'high', 'critical')
  `);

  await knex.schema.raw(`
    CREATE TYPE lesson_effectiveness_rating AS ENUM (
      'not_rated', 'ineffective', 'partially_effective', 'effective', 'highly_effective'
    )
  `);

  await knex.schema.raw("CREATE SEQUENCE IF NOT EXISTS lesson_number_seq START 1");

  await knex.schema.createTable("lesson_workflow_stages", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("color", 7).notNullable().defaultTo("#6b7280");
    table.integer("position").notNullable().unique();
    table.boolean("requires_signature").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_lesson_workflow_stages_position ON lesson_workflow_stages (position)"
  );

  // Insert default LL workflow stages based on PMI/NASA best practices
  await knex("lesson_workflow_stages").insert([
    {
      name: "Identify",
      description: "Lesson has been identified and captured",
      color: "#3B82F6",
      position: 0,
      requires_signature: false,
    },
    {
      name: "Document",
      description: "Lesson details and root cause are being documented",
      color: "#8B5CF6",
      position: 1,
      requires_signature: false,
    },
    {
      name: "Review",
      description: "Lesson is under peer/team review",
      color: "#F59E0B",
      position: 2,
      requires_signature: true,
    },
    {
      name: "Approve",
      description: "Lesson requires management approval",
      color: "#10B981",
      position: 3,
      requires_signature: true,
    },
    {
      name: "Implement",
      description: "Recommendations and actions are being implemented",
      color: "#6366F1",
      position: 4,
      requires_signature: false,
    },
    {
      name: "Validate",
      description: "Effectiveness of implemented actions is being validated",
      color: "#06B6D4",
      position: 5,
      requires_signature: false,
    },
    {
      name: "Archive",
      description: "Lesson has been validated and archived for reference",
      color: "#6B7280",
      position: 6,
      requires_signature: false,
    },
  ]);

  await knex.schema.createTable("lessons", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("lesson_number", 20).unique().notNullable();
    table.string("title", 255).notNullable();
    table.text("description").nullable();
    table.string("status", 50).notNullable().defaultTo("draft");
    table.specificType("lesson_type", "lesson_type").notNullable();
    table.string("category", 100).nullable();
    table.specificType("impact_level", "lesson_impact_level").nullable();
    table.text("what_happened").nullable();
    table.text("root_cause").nullable();
    table.string("root_cause_category", 100).nullable();
    table.text("recommendation").nullable();
    table.text("preventive_action").nullable();
    table.text("corrective_action").nullable();
    table.text("outcome").nullable();
    table
      .specificType("effectiveness_rating", "lesson_effectiveness_rating")
      .nullable()
      .defaultTo("not_rated");
    table.date("identified_date").nullable();
    table.date("review_date").nullable();
    table.date("implementation_date").nullable();
    table.date("closure_date").nullable();
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
    table
      .uuid("current_stage_id")
      .nullable()
      .references("id")
      .inTable("lesson_workflow_stages")
      .onDelete("SET NULL");
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

  await knex.schema.raw("CREATE INDEX idx_lessons_status ON lessons (status)");
  await knex.schema.raw("CREATE INDEX idx_lessons_type ON lessons (lesson_type)");
  await knex.schema.raw("CREATE INDEX idx_lessons_impact ON lessons (impact_level)");
  await knex.schema.raw("CREATE INDEX idx_lessons_owner ON lessons (owner_id)");
  await knex.schema.raw("CREATE INDEX idx_lessons_current_stage ON lessons (current_stage_id)");
  await knex.schema.raw("CREATE INDEX idx_lessons_created_by ON lessons (created_by)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("lessons");
  await knex.schema.dropTableIfExists("lesson_workflow_stages");
  await knex.schema.raw("DROP SEQUENCE IF EXISTS lesson_number_seq");
  await knex.schema.raw("DROP TYPE IF EXISTS lesson_effectiveness_rating");
  await knex.schema.raw("DROP TYPE IF EXISTS lesson_impact_level");
  await knex.schema.raw("DROP TYPE IF EXISTS lesson_type");
}
