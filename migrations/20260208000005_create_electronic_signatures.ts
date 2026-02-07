import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("electronic_signatures", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("issue_id")
      .notNullable()
      .references("id")
      .inTable("issues")
      .onDelete("RESTRICT");
    table
      .uuid("workflow_stage_id")
      .notNullable()
      .references("id")
      .inTable("workflow_stages")
      .onDelete("RESTRICT");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("signer_full_name", 255).notNullable();
    table.timestamp("signature_timestamp", { useTz: true }).notNullable();
    table.string("signature_meaning", 255).notNullable();
    table.text("signature_reason").nullable();
    table.string("ip_address", 45).notNullable();
    table.text("user_agent").notNullable();
    table.string("signature_hash", 128).notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_electronic_signatures_issue_id ON electronic_signatures (issue_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_electronic_signatures_user_id ON electronic_signatures (user_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_electronic_signatures_stage_id ON electronic_signatures (workflow_stage_id)"
  );

  // Immutability triggers - FDA 21 CFR Part 11 compliance
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION prevent_signature_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Electronic signatures cannot be modified or deleted (21 CFR Part 11)';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.raw(`
    CREATE TRIGGER trg_signatures_immutable_update
      BEFORE UPDATE ON electronic_signatures
      FOR EACH ROW EXECUTE FUNCTION prevent_signature_modification();
  `);

  await knex.schema.raw(`
    CREATE TRIGGER trg_signatures_immutable_delete
      BEFORE DELETE ON electronic_signatures
      FOR EACH ROW EXECUTE FUNCTION prevent_signature_modification();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(
    "DROP TRIGGER IF EXISTS trg_signatures_immutable_delete ON electronic_signatures"
  );
  await knex.schema.raw(
    "DROP TRIGGER IF EXISTS trg_signatures_immutable_update ON electronic_signatures"
  );
  await knex.schema.raw(
    "DROP FUNCTION IF EXISTS prevent_signature_modification()"
  );
  await knex.schema.dropTableIfExists("electronic_signatures");
}
