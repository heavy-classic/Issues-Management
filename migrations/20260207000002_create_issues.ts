import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("issues", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("title", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table
      .enum("status", ["open", "in_progress", "closed"], {
        useNative: true,
        enumName: "issue_status",
      })
      .notNullable()
      .defaultTo("open");
    table
      .enum("priority", ["low", "medium", "high", "critical"], {
        useNative: true,
        enumName: "issue_priority",
      })
      .notNullable()
      .defaultTo("medium");
    table
      .uuid("reporter_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("assignee_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_issues_reporter_id ON issues (reporter_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_issues_assignee_id ON issues (assignee_id)"
  );
  await knex.schema.raw("CREATE INDEX idx_issues_status ON issues (status)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("issues");
  await knex.schema.raw("DROP TYPE IF EXISTS issue_status");
  await knex.schema.raw("DROP TYPE IF EXISTS issue_priority");
}
