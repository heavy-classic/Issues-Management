import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("audit_types", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("color", 7).notNullable().defaultTo("#667eea");
    table.string("icon", 50).notNullable().defaultTo("\u{1F50D}");
    table.jsonb("workflow_phases").notNullable().defaultTo(
      JSON.stringify(["Planning", "Fieldwork", "Review", "Closeout"])
    );
    table.jsonb("checklist_settings").notNullable().defaultTo(
      JSON.stringify({ required: false, max_checklists: 10 })
    );
    table.jsonb("team_settings").notNullable().defaultTo(
      JSON.stringify({ min_team_size: 1, require_lead: true })
    );
    table.boolean("is_active").notNullable().defaultTo(true);
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_audit_types_active ON audit_types (is_active)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("audit_types");
}
