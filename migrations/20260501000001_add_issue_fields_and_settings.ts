import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // New columns on issues
  await knex.schema.alterTable("issues", (table) => {
    table.string("source", 100).nullable();
    table.uuid("on_behalf_of_id").references("id").inTable("users").nullable();
    table.string("department", 100).nullable();
    table.date("date_identified").nullable();
  });

  // App settings key-value store
  await knex.schema.createTable("app_settings", (table) => {
    table.string("key", 255).primary();
    table.text("value");
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Default issue submission instructions
  await knex("app_settings").insert({
    key: "issue_instructions",
    value: `Before submitting, please review the following guidelines:

• Provide a clear, concise title that summarizes the issue
• Select the correct Source — where or how the issue was discovered
• Choose your Department so the issue is routed to the right team
• Set the Priority based on operational impact (Critical = immediate safety or production risk)
• Assign to the person responsible for resolution, if known
• Use the Description to include all relevant details: what happened, where, when, and the impact
• Attach any supporting evidence such as photos, inspection reports, or documents

All submissions are tracked and you will receive updates as the issue progresses through the workflow. For urgent safety concerns, contact your supervisor immediately in addition to filing this report.`,
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("issues", (table) => {
    table.dropColumn("source");
    table.dropColumn("on_behalf_of_id");
    table.dropColumn("department");
    table.dropColumn("date_identified");
  });
  await knex.schema.dropTableIfExists("app_settings");
}
