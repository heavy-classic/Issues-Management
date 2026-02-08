import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Audit team role enum
  await knex.schema.raw(`
    CREATE TYPE audit_team_role AS ENUM ('lead', 'auditor', 'observer')
  `);

  // Checklist instance status enum
  await knex.schema.raw(`
    CREATE TYPE checklist_instance_status AS ENUM ('not_started', 'in_progress', 'complete', 'under_review')
  `);

  // Meeting type enum
  await knex.schema.raw(`
    CREATE TYPE meeting_type AS ENUM ('opening', 'fieldwork', 'closing', 'other')
  `);

  // Audit team members
  await knex.schema.createTable("audit_team_members", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("audit_id")
      .notNullable()
      .references("id")
      .inTable("audits")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.specificType("role", "audit_team_role").notNullable().defaultTo("auditor");
    table
      .timestamp("assigned_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(["audit_id", "user_id"]);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_audit_team_audit ON audit_team_members (audit_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_audit_team_user ON audit_team_members (user_id)"
  );

  // Checklist instances — frozen copies assigned to an audit
  await knex.schema.createTable("checklist_instances", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("audit_id")
      .notNullable()
      .references("id")
      .inTable("audits")
      .onDelete("CASCADE");
    table
      .uuid("checklist_id")
      .notNullable()
      .references("id")
      .inTable("checklists")
      .onDelete("RESTRICT");
    table
      .uuid("assigned_to")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.specificType("status", "checklist_instance_status").notNullable().defaultTo("not_started");
    table.date("due_date").nullable();
    table.timestamp("started_at", { useTz: true }).nullable();
    table.timestamp("completed_at", { useTz: true }).nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_checklist_instances_audit ON checklist_instances (audit_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_checklist_instances_assigned ON checklist_instances (assigned_to)"
  );

  // Criterion responses — auditor answers
  await knex.schema.createTable("criterion_responses", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("instance_id")
      .notNullable()
      .references("id")
      .inTable("checklist_instances")
      .onDelete("CASCADE");
    table
      .uuid("criterion_id")
      .notNullable()
      .references("id")
      .inTable("checklist_criteria")
      .onDelete("CASCADE");
    table.text("response_value").notNullable().defaultTo("");
    table.text("notes").notNullable().defaultTo("");
    table
      .uuid("responded_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .timestamp("responded_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .uuid("finding_issue_id")
      .nullable()
      .references("id")
      .inTable("issues")
      .onDelete("SET NULL");
    table.unique(["instance_id", "criterion_id"]);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_criterion_responses_instance ON criterion_responses (instance_id)"
  );

  // Audit meetings
  await knex.schema.createTable("audit_meetings", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("audit_id")
      .notNullable()
      .references("id")
      .inTable("audits")
      .onDelete("CASCADE");
    table.specificType("meeting_type", "meeting_type").notNullable().defaultTo("other");
    table.string("title", 255).notNullable();
    table.timestamp("scheduled_date", { useTz: true }).notNullable();
    table.jsonb("attendees").notNullable().defaultTo("[]");
    table.text("notes").notNullable().defaultTo("");
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_audit_meetings_audit ON audit_meetings (audit_id)"
  );

  // Extend attachment_parent_type enum to include audit types
  await knex.schema.raw(`
    ALTER TYPE attachment_parent_type ADD VALUE IF NOT EXISTS 'audit'
  `);
  await knex.schema.raw(`
    ALTER TYPE attachment_parent_type ADD VALUE IF NOT EXISTS 'checklist_response'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("audit_meetings");
  await knex.schema.dropTableIfExists("criterion_responses");
  await knex.schema.dropTableIfExists("checklist_instances");
  await knex.schema.dropTableIfExists("audit_team_members");
  await knex.schema.raw("DROP TYPE IF EXISTS meeting_type");
  await knex.schema.raw("DROP TYPE IF EXISTS checklist_instance_status");
  await knex.schema.raw("DROP TYPE IF EXISTS audit_team_role");
  // Note: cannot remove values from an enum in PostgreSQL
}
