import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(
    `CREATE TYPE audit_change_type AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'SIGNATURE')`
  );

  await knex.schema.createTable("audit_log", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("table_name", 100).notNullable();
    table.uuid("record_id").notNullable();
    table.string("field_name", 100).nullable();
    table.jsonb("old_value").nullable();
    table.jsonb("new_value").nullable();
    table
      .specificType("change_type", "audit_change_type")
      .notNullable();
    table
      .uuid("changed_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("changed_by_user_name", 255).nullable();
    table
      .timestamp("changed_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.string("ip_address", 45).nullable();
    table.text("user_agent").nullable();
    table.text("change_reason").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_audit_log_changed_by ON audit_log (changed_by_user_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_audit_log_changed_at ON audit_log (changed_at)"
  );

  // Immutability triggers - audit log entries cannot be modified
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION prevent_audit_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.raw(`
    CREATE TRIGGER trg_audit_immutable_update
      BEFORE UPDATE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  `);

  await knex.schema.raw(`
    CREATE TRIGGER trg_audit_immutable_delete
      BEFORE DELETE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(
    "DROP TRIGGER IF EXISTS trg_audit_immutable_delete ON audit_log"
  );
  await knex.schema.raw(
    "DROP TRIGGER IF EXISTS trg_audit_immutable_update ON audit_log"
  );
  await knex.schema.raw(
    "DROP FUNCTION IF EXISTS prevent_audit_modification()"
  );
  await knex.schema.dropTableIfExists("audit_log");
  await knex.schema.raw("DROP TYPE IF EXISTS audit_change_type");
}
