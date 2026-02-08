import db from "../db";

export interface AuditContext {
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}

interface LogChangeParams {
  tableName: string;
  recordId: string;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  changeType: "INSERT" | "UPDATE" | "DELETE" | "SIGNATURE";
  changeReason?: string;
}

export async function logChange(
  params: LogChangeParams,
  ctx: AuditContext
) {
  await db("audit_log").insert({
    table_name: params.tableName,
    record_id: params.recordId,
    field_name: params.fieldName || null,
    old_value: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
    new_value: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
    change_type: params.changeType,
    changed_by_user_id: ctx.userId,
    changed_by_user_name: ctx.userName,
    changed_at: new Date(),
    ip_address: ctx.ipAddress || null,
    user_agent: ctx.userAgent || null,
    change_reason: params.changeReason || null,
  });
}

export async function logFieldChanges(
  tableName: string,
  recordId: string,
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  ctx: AuditContext,
  excludeFields: string[] = ["updated_at", "password_hash"]
) {
  for (const key of Object.keys(newRecord)) {
    if (excludeFields.includes(key)) continue;
    const oldVal = oldRecord[key];
    const newVal = newRecord[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      await logChange(
        {
          tableName,
          recordId,
          fieldName: key,
          oldValue: oldVal,
          newValue: newVal,
          changeType: "UPDATE",
        },
        ctx
      );
    }
  }
}

export async function logInsert(
  tableName: string,
  recordId: string,
  record: Record<string, unknown>,
  ctx: AuditContext
) {
  await logChange(
    {
      tableName,
      recordId,
      newValue: record,
      changeType: "INSERT",
    },
    ctx
  );
}

export async function logDelete(
  tableName: string,
  recordId: string,
  record: Record<string, unknown>,
  ctx: AuditContext
) {
  await logChange(
    {
      tableName,
      recordId,
      oldValue: record,
      changeType: "DELETE",
    },
    ctx
  );
}

interface AuditFilters {
  tableName?: string;
  recordId?: string;
  changedBy?: string;
  changeType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export async function getAuditHistory(filters: AuditFilters) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 200);
  const offset = (page - 1) * limit;

  const query = db("audit_log");

  if (filters.tableName) query.where("table_name", filters.tableName);
  if (filters.recordId) query.where("record_id", filters.recordId);
  if (filters.changedBy)
    query.where("changed_by_user_id", filters.changedBy);
  if (filters.changeType) query.where("change_type", filters.changeType);
  if (filters.fromDate) query.where("changed_at", ">=", filters.fromDate);
  if (filters.toDate) query.where("changed_at", "<=", filters.toDate);

  const countQuery = query.clone().count("* as total").first();
  const total = Number((await countQuery)?.total || 0);

  const entries = await query.clone().orderBy("changed_at", "desc").offset(offset).limit(limit);

  return { entries, total, page, limit };
}

export async function getIssueAuditHistory(issueId: string) {
  // Get all audit entries related to this issue across multiple tables
  const entries = await db("audit_log")
    .where(function () {
      this.where({ table_name: "issues", record_id: issueId })
        .orWhere(function () {
          this.where("table_name", "comments").whereIn(
            "record_id",
            db("comments").select("id").where("issue_id", issueId)
          );
        })
        .orWhere(function () {
          this.where("table_name", "issue_stage_assignments").whereIn(
            "record_id",
            db("issue_stage_assignments")
              .select("id")
              .where("issue_id", issueId)
          );
        })
        .orWhere(function () {
          this.where("table_name", "electronic_signatures").whereIn(
            "record_id",
            db("electronic_signatures")
              .select("id")
              .where("issue_id", issueId)
          );
        })
        .orWhere(function () {
          this.where("table_name", "attachments").whereIn(
            "record_id",
            db("attachments")
              .select("id")
              .where({ parent_type: "issue", parent_id: issueId })
          );
        });
    })
    .orderBy("changed_at", "desc");

  return entries;
}
