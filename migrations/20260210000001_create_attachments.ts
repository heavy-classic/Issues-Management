import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create unified attachments table
  await knex.schema.createTable("attachments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("parent_id").notNullable();
    table
      .enum("parent_type", ["issue", "action"], {
        useNative: true,
        enumName: "attachment_parent_type",
      })
      .notNullable();
    table.string("file_name", 255).notNullable(); // UUID-based name on disk
    table.string("original_name", 255).notNullable(); // User-facing name
    table.string("file_path", 500).notNullable(); // Relative path from project root
    table.bigInteger("file_size").notNullable();
    table.string("mime_type", 100).notNullable();
    table.string("file_extension", 20).notNullable();
    table.string("thumbnail_path", 500).nullable();
    table
      .uuid("uploaded_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .timestamp("uploaded_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.integer("download_count").notNullable().defaultTo(0);
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamp("deleted_at", { useTz: true }).nullable();
    table
      .uuid("deleted_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // Indexes
  await knex.schema.raw(
    'CREATE INDEX idx_attachments_parent ON attachments (parent_type, parent_id)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_attachments_uploaded_by ON attachments (uploaded_by)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_attachments_not_deleted ON attachments (is_deleted) WHERE is_deleted = false'
  );

  // Migrate existing action_attachments data
  const existing = await knex("action_attachments").select("*");
  if (existing.length > 0) {
    const mapped = existing.map((row: any) => ({
      id: row.id,
      parent_id: row.action_id,
      parent_type: "action",
      file_name: row.file_name,
      original_name: row.file_name,
      file_path: "legacy/" + row.file_name,
      file_size: row.file_size || 0,
      mime_type: row.file_type || "application/octet-stream",
      file_extension: "",
      uploaded_by: row.uploaded_by,
      uploaded_at: row.created_at,
      download_count: 0,
      is_deleted: false,
    }));
    await knex("attachments").insert(mapped);
  }

  // Drop old table
  await knex.schema.dropTableIfExists("action_attachments");
}

export async function down(knex: Knex): Promise<void> {
  // Recreate old table
  await knex.schema.createTable("action_attachments", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("action_id")
      .notNullable()
      .references("id")
      .inTable("actions")
      .onDelete("CASCADE");
    table.string("file_name", 255).notNullable();
    table.string("file_type", 100).notNullable();
    table.integer("file_size").notNullable();
    table
      .uuid("uploaded_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index("action_id", "idx_action_attachments_action_id");
  });

  await knex.schema.dropTableIfExists("attachments");
  await knex.schema.raw("DROP TYPE IF EXISTS attachment_parent_type");
}
