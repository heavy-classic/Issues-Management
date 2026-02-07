import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("actions", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("issue_id")
      .notNullable()
      .references("id")
      .inTable("issues")
      .onDelete("CASCADE");
    table.string("title", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table
      .enum("status", ["initiate", "assigned", "completed"], {
        useNative: true,
        enumName: "action_status",
      })
      .notNullable()
      .defaultTo("initiate");
    table
      .enum("priority", ["low", "medium", "high", "critical"], {
        useNative: true,
        enumName: "action_priority",
      })
      .notNullable()
      .defaultTo("medium");
    table
      .uuid("assigned_to")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.date("due_date").nullable();
    table.timestamp("completed_at").nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_actions_issue_id ON actions (issue_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_actions_assigned_to ON actions (assigned_to)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_actions_status ON actions (status)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_actions_created_at ON actions (created_at)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("actions");
  await knex.schema.raw("DROP TYPE IF EXISTS action_status");
  await knex.schema.raw("DROP TYPE IF EXISTS action_priority");
}
