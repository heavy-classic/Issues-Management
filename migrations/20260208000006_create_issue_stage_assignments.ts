import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("issue_stage_assignments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("issue_id")
      .notNullable()
      .references("id")
      .inTable("issues")
      .onDelete("CASCADE");
    table
      .uuid("stage_id")
      .notNullable()
      .references("id")
      .inTable("workflow_stages")
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
    table.unique(["issue_id", "stage_id"]);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_issue_stage_assignments_issue_id ON issue_stage_assignments (issue_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_issue_stage_assignments_stage_id ON issue_stage_assignments (stage_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_issue_stage_assignments_user_id ON issue_stage_assignments (user_id)"
  );

  // Add current_stage_id to issues table
  await knex.schema.alterTable("issues", (table) => {
    table
      .uuid("current_stage_id")
      .nullable()
      .references("id")
      .inTable("workflow_stages")
      .onDelete("SET NULL");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("issues", (table) => {
    table.dropColumn("current_stage_id");
  });
  await knex.schema.dropTableIfExists("issue_stage_assignments");
}
