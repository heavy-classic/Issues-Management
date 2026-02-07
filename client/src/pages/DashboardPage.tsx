import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import IssueFilters from "../components/IssueFilters";
import IssueForm from "../components/IssueForm";
import { exportToCSV, exportToExcel } from "../utils/exportUtils";

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  reporter_email: string;
  reporter_name: string | null;
  assignee_email: string | null;
  assignee_name: string | null;
  stage_name: string | null;
  stage_color: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    assignee_id: searchParams.get("assignee_id") || "",
    stage_id: searchParams.get("stage_id") || "",
  });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.assignee_id) params.set("assignee_id", filters.assignee_id);
    if (filters.stage_id) params.set("stage_id", filters.stage_id);
    const res = await api.get(`/issues?${params}`);
    setIssues(res.data.issues);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  useEffect(() => {
    api.get("/users").then((res) => setUsers(res.data.users));
  }, []);

  async function handleCreate(data: {
    title: string;
    description: string;
    priority: string;
    assignee_id: string | null;
  }) {
    await api.post("/issues", data);
    setShowCreate(false);
    fetchIssues();
  }

  function statusLabel(status: string) {
    return status.replace("_", " ");
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Issues</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => {
              const data = issues.map((i) => ({
                Title: i.title,
                Status: i.status,
                Priority: i.priority,
                Stage: i.stage_name || "",
                Reporter: i.reporter_name || i.reporter_email,
                Assignee: i.assignee_name || i.assignee_email || "Unassigned",
                Created: new Date(i.created_at).toLocaleDateString(),
              }));
              exportToCSV(data, "issues.csv");
            }}
            className="btn btn-secondary btn-sm"
          >
            CSV
          </button>
          <button
            onClick={() => {
              const data = issues.map((i) => ({
                Title: i.title,
                Status: i.status,
                Priority: i.priority,
                Stage: i.stage_name || "",
                Reporter: i.reporter_name || i.reporter_email,
                Assignee: i.assignee_name || i.assignee_email || "Unassigned",
                Created: new Date(i.created_at).toLocaleDateString(),
              }));
              exportToExcel(data, "Issues", "issues.xlsx");
            }}
            className="btn btn-secondary btn-sm"
          >
            Excel
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary"
          >
            {showCreate ? "Cancel" : "New Issue"}
          </button>
        </div>
      </div>

      {showCreate && (
        <IssueForm
          users={users}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <IssueFilters
        filters={filters}
        users={users}
        onFilterChange={setFilters}
      />

      {loading ? (
        <p>Loading issues...</p>
      ) : issues.length === 0 ? (
        <p className="text-muted">No issues found.</p>
      ) : (
        <table className="issues-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Reporter</th>
              <th>Assignee</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>
                  <Link to={`/issues/${issue.id}`}>{issue.title}</Link>
                </td>
                <td>
                  {issue.stage_name ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: (issue.stage_color || "#6b7280") + "20",
                        color: issue.stage_color || "#6b7280",
                      }}
                    >
                      {issue.stage_name}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <span className={`badge badge-status-${issue.status}`}>
                    {statusLabel(issue.status)}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-priority-${issue.priority}`}>
                    {issue.priority}
                  </span>
                </td>
                <td>{issue.reporter_name || issue.reporter_email}</td>
                <td>
                  {issue.assignee_name ||
                    issue.assignee_email ||
                    "Unassigned"}
                </td>
                <td>{new Date(issue.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
