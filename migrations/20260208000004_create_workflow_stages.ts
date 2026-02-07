import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("workflow_stages", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name", 255).notNullable();
    table.text("description").notNullable().defaultTo("");
    table.string("color", 7).notNullable().defaultTo("#6b7280");
    table.integer("position").notNullable().unique();
    table.boolean("requires_signature").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_workflow_stages_position ON workflow_stages (position)"
  );

  // Insert default workflow stages
  await knex("workflow_stages").insert([
    {
      name: "Initiate",
      description: "Issue has been created and is awaiting initial review",
      color: "#3B82F6",
      position: 0,
      requires_signature: false,
    },
    {
      name: "Screening",
      description: "Issue is being screened for validity and categorization",
      color: "#8B5CF6",
      position: 1,
      requires_signature: false,
    },
    {
      name: "Action Plan",
      description:
        "Action plan is being developed to address the issue",
      color: "#F59E0B",
      position: 2,
      requires_signature: true,
    },
    {
      name: "Completing",
      description: "Action plan is being executed",
      color: "#10B981",
      position: 3,
      requires_signature: true,
    },
    {
      name: "Closeout",
      description: "Issue is being reviewed for closure",
      color: "#6366F1",
      position: 4,
      requires_signature: true,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("workflow_stages");
}
