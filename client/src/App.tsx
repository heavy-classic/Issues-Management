import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issues/:id"
              element={
                <ProtectedRoute>
                  <IssueDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/board"
              element={
                <ProtectedRoute>
                  <KanbanBoardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/teams"
              element={
                <AdminRoute>
                  <AdminTeamsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/workflow"
              element={
                <AdminRoute>
                  <AdminWorkflowPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <AdminRoute>
                  <AdminAuditPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
