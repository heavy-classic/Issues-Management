import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestContext } from "./middleware/requestContext";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";
import issuesRoutes from "./routes/issues";
import usersRoutes from "./routes/users";
import adminRoutes from "./routes/admin";
import teamsRoutes from "./routes/teams";
import workflowStagesRoutes from "./routes/workflowStages";
import auditRoutes from "./routes/audit";
import signatureRoutes from "./routes/signatures";
import workflowRoutes from "./routes/workflow";
import actionsRoutes from "./routes/actions";
import dashboardRoutes from "./routes/dashboard";
import reportsRoutes from "./routes/reports";
import exportsRoutes from "./routes/exports";
import attachmentsRoutes from "./routes/attachments";
import auditTypesRoutes from "./routes/auditTypes";
import checklistsRoutes from "./routes/checklists";
import auditsRoutes from "./routes/audits";
import checklistExecutionRoutes from "./routes/checklistExecution";
import auditDashboardRoutes from "./routes/auditDashboard";
import auditExportsRoutes from "./routes/auditExports";
import risksRoutes from "./routes/risks";
import riskCategoriesRoutes from "./routes/riskCategories";
import riskDashboardRoutes from "./routes/riskDashboard";
import picklistsRoutes from "./routes/picklists";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestContext);

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/workflow-stages", workflowStagesRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/actions", actionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/exports", exportsRoutes);
app.use("/api/attachments", attachmentsRoutes);
app.use("/api/audit-types", auditTypesRoutes);
app.use("/api/checklists", checklistsRoutes);
app.use("/api/audits", auditsRoutes);
app.use("/api/checklist-instances", checklistExecutionRoutes);
app.use("/api/audit-dashboard", auditDashboardRoutes);
app.use("/api/audit-exports", auditExportsRoutes);
app.use("/api/risks", risksRoutes);
app.use("/api/risk-categories", riskCategoriesRoutes);
app.use("/api/risk-dashboard", riskDashboardRoutes);
app.use("/api/picklists", picklistsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;
