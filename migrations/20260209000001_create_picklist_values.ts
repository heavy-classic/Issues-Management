import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("picklist_values", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.string("picklist_type", 100).notNullable().index();
    t.string("value", 100).notNullable();
    t.string("label", 255).notNullable();
    t.string("color", 7).nullable();
    t.integer("sort_order").notNullable().defaultTo(0);
    t.boolean("is_active").notNullable().defaultTo(true);
    t.text("description").nullable();
    t.timestamps(true, true);
    t.unique(["picklist_type", "value"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("picklist_values");
}
