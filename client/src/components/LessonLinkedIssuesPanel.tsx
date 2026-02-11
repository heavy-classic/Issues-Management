import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

interface LinkedIssue {
  id: string;
  title: string;
  status: string;
  priority: string;
  issue_number: string;
  relationship: string;
}

interface Props {
  lessonId: string;
  issues: LinkedIssue[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  resolved: "#10b981",
  closed: "#6b7280",
};

export default function LessonLinkedIssuesPanel({ lessonId, issues, onRefresh }: Props) {
  const navigate = useNavigate();
  const [showLink, setShowLink] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  async function handleSearch(q: string) {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get("/issues", { params: { search: q } });
      const existing = new Set(issues.map((i) => i.id));
      setSearchResults((res.data.issues || []).filter((i: any) => !existing.has(i.id)).slice(0, 10));
    } catch { setSearchResults([]); }
  }

  async function handleLink(issueId: string) {
    try {
      await api.post(`/lessons/${lessonId}/issues/${issueId}`);
      setShowLink(false);
      setSearch("");
      setSearchResults([]);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to link issue");
    }
  }

  async function handleUnlink(issueId: string) {
    try {
      await api.delete(`/lessons/${lessonId}/issues/${issueId}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to unlink issue");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Linked Issues ({issues.length})</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowLink(!showLink)}>
          + Link Issue
        </button>
      </div>

      {showLink && (
        <div style={{ padding: "0.75rem", background: "var(--color-bg-subtle)", borderRadius: 8, marginBottom: "0.75rem" }}>
          <input
            type="text"
            placeholder="Search issues by title or number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div style={{ marginTop: "0.5rem", maxHeight: 200, overflow: "auto" }}>
              {searchResults.map((issue: any) => (
                <div
                  key={issue.id}
                  onClick={() => handleLink(issue.id)}
                  style={{
                    padding: "0.5rem",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span><strong>{issue.issue_number}</strong> {issue.title}</span>
                  <span className="badge" style={{ background: STATUS_COLORS[issue.status] || "#9ca3af", color: "#fff" }}>
                    {issue.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {issues.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>No linked issues.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Issue #</th>
                <th>Title</th>
                <th>Relationship</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                    >
                      {issue.issue_number}
                    </button>
                  </td>
                  <td>{issue.title}</td>
                  <td style={{ textTransform: "capitalize" }}>{issue.relationship.replace(/_/g, " ")}</td>
                  <td>
                    <span className="badge" style={{ background: STATUS_COLORS[issue.status] || "#9ca3af", color: "#fff" }}>
                      {issue.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon btn-danger-icon" onClick={() => handleUnlink(issue.id)} title="Unlink">&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
