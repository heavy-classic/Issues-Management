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
import KanbanBoardPage from "./pages/KanbanBoardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminTeamsPage from "./pages/AdminTeamsPage";
import AdminWorkflowPage from "./pages/AdminWorkflowPage";
import AdminAuditPage from "./pages/AdminAuditPage";
import BIDashboardPage from "./pages/BIDashboardPage";
import ReportBuilderPage from "./pages/ReportBuilderPage";
import AuditsPage from "./pages/AuditsPage";
import AuditDetailPage from "./pages/AuditDetailPage";
import AuditAnalyticsPage from "./pages/AuditAnalyticsPage";
import AdminAuditTypesPage from "./pages/AdminAuditTypesPage";
import AdminChecklistsPage from "./pages/AdminChecklistsPage";
import ChecklistBuilderPage from "./pages/ChecklistBuilderPage";
import RisksPage from "./pages/RisksPage";
import RiskDetailPage from "./pages/RiskDetailPage";
import RiskAnalyticsPage from "./pages/RiskAnalyticsPage";
import AdminRiskCategoriesPage from "./pages/AdminRiskCategoriesPage";
import { ReactNode } from "react";

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
          <Route path="/board" element={<LayoutRoute><KanbanBoardPage /></LayoutRoute>} />
          <Route path="/analytics" element={<LayoutRoute><BIDashboardPage /></LayoutRoute>} />
          <Route path="/reports" element={<LayoutRoute><ReportBuilderPage /></LayoutRoute>} />
          <Route path="/admin" element={<AdminLayoutRoute><AdminDashboardPage /></AdminLayoutRoute>} />
          <Route path="/admin/users" element={<AdminLayoutRoute><AdminUsersPage /></AdminLayoutRoute>} />
          <Route path="/admin/teams" element={<AdminLayoutRoute><AdminTeamsPage /></AdminLayoutRoute>} />
          <Route path="/admin/workflow" element={<AdminLayoutRoute><AdminWorkflowPage /></AdminLayoutRoute>} />
          <Route path="/admin/audit" element={<AdminLayoutRoute><AdminAuditPage /></AdminLayoutRoute>} />
          <Route path="/audits" element={<LayoutRoute><AuditsPage /></LayoutRoute>} />
          <Route path="/audits/analytics" element={<LayoutRoute><AuditAnalyticsPage /></LayoutRoute>} />
          <Route path="/audits/:id" element={<LayoutRoute><AuditDetailPage /></LayoutRoute>} />
          <Route path="/admin/audit-types" element={<AdminLayoutRoute><AdminAuditTypesPage /></AdminLayoutRoute>} />
          <Route path="/admin/checklists" element={<AdminLayoutRoute><AdminChecklistsPage /></AdminLayoutRoute>} />
          <Route path="/admin/checklists/:id" element={<AdminLayoutRoute><ChecklistBuilderPage /></AdminLayoutRoute>} />
          <Route path="/risks" element={<LayoutRoute><RisksPage /></LayoutRoute>} />
          <Route path="/risks/:id" element={<LayoutRoute><RiskDetailPage /></LayoutRoute>} />
          <Route path="/risk-analytics" element={<LayoutRoute><RiskAnalyticsPage /></LayoutRoute>} />
          <Route path="/admin/risk-categories" element={<AdminLayoutRoute><AdminRiskCategoriesPage /></AdminLayoutRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
