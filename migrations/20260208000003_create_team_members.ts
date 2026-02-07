import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`CREATE TYPE team_member_role AS ENUM ('member', 'lead')`);

  await knex.schema.createTable("team_members", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("team_id")
      .notNullable()
      .references("id")
      .inTable("teams")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .specificType("role", "team_member_role")
      .notNullable()
      .defaultTo("member");
    table.timestamp("joined_at").notNullable().defaultTo(knex.fn.now());
    table.unique(["team_id", "user_id"]);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_team_members_team_id ON team_members (team_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_team_members_user_id ON team_members (user_id)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("team_members");
  await knex.schema.raw("DROP TYPE IF EXISTS team_member_role");
}
