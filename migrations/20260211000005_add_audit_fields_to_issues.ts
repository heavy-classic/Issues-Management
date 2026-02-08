import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("issues", (table) => {
    table
      .uuid("audit_id")
      .nullable()
      .references("id")
      .inTable("audits")
      .onDelete("SET NULL");
    table.specificType("finding_severity", "finding_severity").nullable();
    table
      .uuid("finding_criterion_id")
      .nullable()
      .references("id")
      .inTable("checklist_criteria")
      .onDelete("SET NULL");
  });

  await knex.schema.raw(
    "CREATE INDEX idx_issues_audit_id ON issues (audit_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_issues_finding_severity ON issues (finding_severity) WHERE finding_severity IS NOT NULL"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("issues", (table) => {
    table.dropColumn("finding_criterion_id");
    table.dropColumn("finding_severity");
    table.dropColumn("audit_id");
  });
}
