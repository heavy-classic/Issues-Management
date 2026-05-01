import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import UnifiedKanbanPage from "./pages/UnifiedKanbanPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminTeamsPage from "./pages/AdminTeamsPage";
import AdminWorkflowPage from "./pages/AdminWorkflowPage";
import AdminAuditPage from "./pages/AdminAuditPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportBuilderPage from "./pages/ReportBuilderPage";
import AuditsPage from "./pages/AuditsPage";
import AuditDetailPage from "./pages/AuditDetailPage";
import AdminAuditTypesPage from "./pages/AdminAuditTypesPage";
import AdminChecklistsPage from "./pages/AdminChecklistsPage";
import ChecklistBuilderPage from "./pages/ChecklistBuilderPage";
import RisksPage from "./pages/RisksPage";
import RiskDetailPage from "./pages/RiskDetailPage";
import AdminRiskCategoriesPage from "./pages/AdminRiskCategoriesPage";
import AdminPicklistsPage from "./pages/AdminPicklistsPage";
import LessonsPage from "./pages/LessonsPage";
import LessonDetailPage from "./pages/LessonDetailPage";
import AdminLessonWorkflowPage from "./pages/AdminLessonWorkflowPage";
import AdminInstructionsPage from "./pages/AdminInstructionsPage";
import WorkQueuePage from "./pages/WorkQueuePage";
import ProceduresPage from "./pages/ProceduresPage";
import ProcedureDetailPage from "./pages/ProcedureDetailPage";
import type { ReactNode } from "react";

function LayoutRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function AdminLayoutRoute({ children }: { children: ReactNode }) {
  return (
    <AdminRoute>
      <Layout>{children}</Layout>
    </AdminRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<LayoutRoute><DashboardPage /></LayoutRoute>} />
          <Route path="/issues/:id" element={<LayoutRoute><IssueDetailPage /></LayoutRoute>} />
          <Route path="/board" element={<LayoutRoute><UnifiedKanbanPage /></LayoutRoute>} />
          <Route path="/analytics" element={<LayoutRoute><AnalyticsPage /></LayoutRoute>} />
          <Route path="/reports" element={<LayoutRoute><ReportBuilderPage /></LayoutRoute>} />
          <Route path="/admin" element={<AdminLayoutRoute><AdminDashboardPage /></AdminLayoutRoute>} />
          <Route path="/admin/users" element={<AdminLayoutRoute><AdminUsersPage /></AdminLayoutRoute>} />
          <Route path="/admin/teams" element={<AdminLayoutRoute><AdminTeamsPage /></AdminLayoutRoute>} />
          <Route path="/admin/workflow" element={<AdminLayoutRoute><AdminWorkflowPage /></AdminLayoutRoute>} />
          <Route path="/admin/audit" element={<AdminLayoutRoute><AdminAuditPage /></AdminLayoutRoute>} />
          <Route path="/audits" element={<LayoutRoute><AuditsPage /></LayoutRoute>} />
          <Route path="/audits/analytics" element={<Navigate to="/analytics?tab=audits" replace />} />
          <Route path="/audits/:id" element={<LayoutRoute><AuditDetailPage /></LayoutRoute>} />
          <Route path="/admin/audit-types" element={<AdminLayoutRoute><AdminAuditTypesPage /></AdminLayoutRoute>} />
          <Route path="/admin/checklists" element={<AdminLayoutRoute><AdminChecklistsPage /></AdminLayoutRoute>} />
          <Route path="/admin/checklists/:id" element={<AdminLayoutRoute><ChecklistBuilderPage /></AdminLayoutRoute>} />
          <Route path="/risks" element={<LayoutRoute><RisksPage /></LayoutRoute>} />
          <Route path="/risks/:id" element={<LayoutRoute><RiskDetailPage /></LayoutRoute>} />
          <Route path="/risk-analytics" element={<Navigate to="/analytics?tab=risks" replace />} />
          <Route path="/admin/risk-categories" element={<AdminLayoutRoute><AdminRiskCategoriesPage /></AdminLayoutRoute>} />
          <Route path="/admin/picklists" element={<AdminLayoutRoute><AdminPicklistsPage /></AdminLayoutRoute>} />
          <Route path="/lessons" element={<LayoutRoute><LessonsPage /></LayoutRoute>} />
          <Route path="/lessons/:id" element={<LayoutRoute><LessonDetailPage /></LayoutRoute>} />
          <Route path="/admin/lesson-workflow" element={<AdminLayoutRoute><AdminLessonWorkflowPage /></AdminLayoutRoute>} />
          <Route path="/admin/instructions" element={<AdminLayoutRoute><AdminInstructionsPage /></AdminLayoutRoute>} />
          <Route path="/queue" element={<LayoutRoute><WorkQueuePage /></LayoutRoute>} />
          <Route path="/procedures" element={<LayoutRoute><ProceduresPage /></LayoutRoute>} />
          <Route path="/procedures/:id" element={<LayoutRoute><ProcedureDetailPage /></LayoutRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
