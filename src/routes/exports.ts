import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as exportService from "../services/exportService";

const router = Router();

router.use(authenticate);

// Export issues as CSV
router.get("/issues", async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    priority: req.query.priority as string | undefined,
    assignee_id: req.query.assignee_id as string | undefined,
    stage_id: req.query.stage_id as string | undefined,
  };

  const issues = await exportService.getIssuesExportData(filters);

  const header =
    "ID,Title,Status,Priority,Stage,Reporter,Assignee,Actions,Comments,Created At,Updated At\n";
  const rows = issues
    .map((row: any) =>
      [
        row.id,
        row.title,
        row.status,
        row.priority,
        row.stage_name || "",
        row.reporter_name || row.reporter_email,
        row.assignee_name || row.assignee_email || "",
        row.action_count,
        row.comment_count,
        row.created_at,
        row.updated_at,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=issues_${new Date().toISOString().slice(0, 10)}.csv`
  );
  res.send(header + rows);
});

// Export full issue data for PDF generation (JSON)
router.get("/issues/:id", async (req, res) => {
  const data = await exportService.getIssueExportData(
    req.params.id as string
  );
  res.json(data);
});

// Export actions as CSV
router.get("/actions", async (req, res) => {
  const filters = {
    issue_id: req.query.issue_id as string | undefined,
    status: req.query.status as string | undefined,
    priority: req.query.priority as string | undefined,
    assigned_to: req.query.assigned_to as string | undefined,
  };

  const actions = await exportService.getActionsExportData(filters);

  const header =
    "ID,Title,Issue,Status,Priority,Assignee,Creator,Due Date,Completed At,Attachments,Created At\n";
  const rows = actions
    .map((row: any) =>
      [
        row.id,
        row.title,
        row.issue_title,
        row.status,
        row.priority,
        row.assignee_name || "",
        row.creator_name || "",
        row.due_date || "",
        row.completed_at || "",
        row.attachment_count,
        row.created_at,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=actions_${new Date().toISOString().slice(0, 10)}.csv`
  );
  res.send(header + rows);
});

export default router;
