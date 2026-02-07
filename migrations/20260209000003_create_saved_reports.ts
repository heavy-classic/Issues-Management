import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("saved_reports", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("report_type", 50).notNullable();
    table.jsonb("config").notNullable().defaultTo("{}");
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.boolean("is_public").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_saved_reports_created_by ON saved_reports (created_by)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_saved_reports_report_type ON saved_reports (report_type)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("saved_reports");
}
