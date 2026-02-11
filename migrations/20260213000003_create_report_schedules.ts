import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("report_schedules", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("report_id")
      .notNullable()
      .references("id")
      .inTable("saved_reports")
      .onDelete("CASCADE");
    table.string("frequency", 20).notNullable(); // daily, weekly, bi_weekly, monthly, quarterly
    table.integer("day_of_week").nullable(); // 0=Sunday..6=Saturday for weekly/bi_weekly
    table.integer("day_of_month").nullable(); // 1-28 for monthly/quarterly
    table.string("time_of_day", 5).notNullable().defaultTo("08:00"); // HH:MM
    table.string("timezone", 100).notNullable().defaultTo("America/New_York");
    table.string("format", 10).notNullable().defaultTo("pdf"); // pdf, csv, excel
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("last_run_at", { useTz: true }).nullable();
    table.timestamp("next_run_at", { useTz: true }).nullable();
    table
      .uuid("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
  });

  await knex.schema.raw(
    "CREATE INDEX idx_report_schedules_report ON report_schedules (report_id)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_report_schedules_active_next ON report_schedules (is_active, next_run_at)"
  );

  await knex.schema.createTable("report_schedule_recipients", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table
      .uuid("schedule_id")
      .notNullable()
      .references("id")
      .inTable("report_schedules")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("external_email", 255).nullable();
    table.string("delivery_method", 20).notNullable().defaultTo("email");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "ALTER TABLE report_schedule_recipients ADD CONSTRAINT chk_recipient CHECK (user_id IS NOT NULL OR external_email IS NOT NULL)"
  );
  await knex.schema.raw(
    "CREATE INDEX idx_report_schedule_recipients_schedule ON report_schedule_recipients (schedule_id)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("report_schedule_recipients");
  await knex.schema.dropTableIfExists("report_schedules");
}
