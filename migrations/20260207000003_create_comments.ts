import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("comments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("issue_id")
      .notNullable()
      .references("id")
      .inTable("issues")
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
    "CREATE INDEX idx_comments_issue_id ON comments (issue_id)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("comments");
}
