import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`CREATE TYPE user_role AS ENUM ('user', 'manager', 'admin')`);
  await knex.schema.raw(`CREATE TYPE user_status AS ENUM ('active', 'disabled')`);

  await knex.schema.alterTable("users", (table) => {
    table.specificType("role", "user_role").notNullable().defaultTo("user");
    table.specificType("status", "user_status").notNullable().defaultTo("active");
    table.timestamp("last_login_at").nullable();
    table.string("full_name", 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("role");
    table.dropColumn("status");
    table.dropColumn("last_login_at");
    table.dropColumn("full_name");
  });
  await knex.schema.raw("DROP TYPE IF EXISTS user_role");
  await knex.schema.raw("DROP TYPE IF EXISTS user_status");
}
