import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("action_attachments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("action_id")
      .notNullable()
      .references("id")
      .inTable("actions")
      .onDelete("CASCADE");
    table.string("file_name", 255).notNullable();
    table.string("file_type", 100).notNullable();
    table.integer("file_size").notNullable();
    table
      .uuid("uploaded_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_action_attachments_action_id ON action_attachments (action_id)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("action_attachments");
}
