import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import * as auditService from "../services/auditService";

const router = Router();

router.use(authenticate);

// Get audit history for a specific issue - any authenticated user
router.get("/issues/:issueId", async (req, res) => {
  const entries = await auditService.getIssueAuditHistory(req.params.issueId as string);
  res.json({ entries });
});

// Get audit history for any table/record — any authenticated user
router.get("/entity/:tableName/:recordId", async (req, res) => {
  const result = await auditService.getAuditHistory({
    tableName: req.params.tableName,
    recordId: req.params.recordId,
    limit: 200,
  });
  res.json(result);
});

// Full audit log - admin only
router.get("/", authorize("admin"), async (req, res) => {
  const filters = {
    tableName: req.query.table_name as string | undefined,
    recordId: req.query.record_id as string | undefined,
    changedBy: req.query.changed_by as string | undefined,
    changeType: req.query.change_type as string | undefined,
    fromDate: req.query.from_date as string | undefined,
    toDate: req.query.to_date as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  };
  const result = await auditService.getAuditHistory(filters);
  res.json(result);
});

// CSV export - admin only
router.get("/export", authorize("admin"), async (req, res) => {
  const filters = {
    tableName: req.query.table_name as string | undefined,
    recordId: req.query.record_id as string | undefined,
    changedBy: req.query.changed_by as string | undefined,
    changeType: req.query.change_type as string | undefined,
    fromDate: req.query.from_date as string | undefined,
    toDate: req.query.to_date as string | undefined,
    limit: 10000,
  };
  const result = await auditService.getAuditHistory(filters);

  const header =
    "ID,Table,Record ID,Field,Old Value,New Value,Change Type,Changed By,Changed At,IP Address,Reason\n";
  const rows = result.entries
    .map((e: any) =>
      [
        e.id,
        e.table_name,
        e.record_id,
        e.field_name || "",
        JSON.stringify(e.old_value || ""),
        JSON.stringify(e.new_value || ""),
        e.change_type,
        e.changed_by_user_name || "",
        e.changed_at,
        e.ip_address || "",
        e.change_reason || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=audit_log_${new Date().toISOString().slice(0, 10)}.csv`
  );
  res.send(header + rows);
});

export default router;
