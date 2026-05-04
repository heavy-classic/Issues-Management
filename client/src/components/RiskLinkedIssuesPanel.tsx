import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

interface LinkedIssue {
  id: string; title: string; status: string; priority: string;
  issue_number: string; relationship: string;
}
interface Props { riskId: string; issues: LinkedIssue[]; onRefresh: () => void; }

const STATUS_BG: Record<string, string> = {
  open: "#ede9fe", in_progress: "#dbeafe", resolved: "#d1fae5", closed: "#f3f4f6",
};
const STATUS_COLOR: Record<string, string> = {
  open: "#5b21b6", in_progress: "#1d4ed8", resolved: "#065f46", closed: "#6b7280",
};

export default function RiskLinkedIssuesPanel({ riskId, issues, onRefresh }: Props) {
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
      await api.post(`/risks/${riskId}/issues/${issueId}`);
      setShowLink(false); setSearch(""); setSearchResults([]);
      onRefresh();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to link issue"); }
  }

  async function handleUnlink(issueId: string) {
    try {
      await api.delete(`/risks/${riskId}/issues/${issueId}`);
      onRefresh();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to unlink issue"); }
  }

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Linked Issues{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {issues.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => setShowLink((v) => !v)}>+ Link</button>
      </div>

      {showLink && (
        <div style={{ background: "#f8f7ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
          <input type="text" placeholder="Search issues by title or number…"
            value={search} onChange={(e) => handleSearch(e.target.value)} autoFocus
            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12, boxSizing: "border-box" }} />
          {searchResults.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 180, overflow: "auto", border: "1px solid #e0e7ff", borderRadius: 6 }}>
              {searchResults.map((issue: any) => (
                <div key={issue.id} onClick={() => handleLink(issue.id)}
                  style={{ padding: "7px 10px", cursor: "pointer", borderBottom: "1px solid #e0e7ff", display: "flex", justifyContent: "space-between", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#ede9fe")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <span><strong style={{ color: "#4f46e5" }}>{issue.issue_number}</strong> {issue.title}</span>
                  <span className="ap-status" style={{ background: STATUS_BG[issue.status] || "#f3f4f6", color: STATUS_COLOR[issue.status] || "#6b7280" }}>
                    {issue.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <table className="ap-table">
        <thead>
          <tr>
            <th className="ap-th" scope="col">Issue #</th>
            <th className="ap-th" scope="col">Title</th>
            <th className="ap-th" scope="col">Status</th>
            <th className="ap-th" scope="col">Priority</th>
            <th className="ap-th" />
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 ? (
            <tr><td colSpan={5} className="ap-empty">No linked issues.</td></tr>
          ) : (
            issues.map((issue) => (
              <tr key={issue.id} className="ap-row">
                <td className="ap-td">
                  <button onClick={() => navigate(`/issues/${issue.id}`)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#4f46e5", fontWeight: 600, fontSize: 12, padding: 0, fontFamily: "monospace" }}>
                    {issue.issue_number}
                  </button>
                </td>
                <td className="ap-td ap-name" style={{ cursor: "pointer" }} onClick={() => navigate(`/issues/${issue.id}`)}>
                  {issue.title}
                </td>
                <td className="ap-td">
                  <span className="ap-status" style={{ background: STATUS_BG[issue.status] || "#f3f4f6", color: STATUS_COLOR[issue.status] || "#6b7280" }}>
                    {issue.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="ap-td">
                  <span className={`ap-pri ap-pri-${issue.priority}`}>{issue.priority}</span>
                </td>
                <td className="ap-td ap-actions-cell">
                  <button className="ap-btn ap-btn-del" onClick={() => handleUnlink(issue.id)}>Unlink</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
