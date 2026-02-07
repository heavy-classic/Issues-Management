import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("teams", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable().unique();
    table.text("description").notNullable().defaultTo("");
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("teams");
}
