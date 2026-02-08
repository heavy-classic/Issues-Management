import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

interface LinkedAudit {
  id: string;
  title: string;
  status: string;
  audit_number: string;
  relationship: string;
}

interface Props {
  riskId: string;
  audits: LinkedAudit[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  scheduled: "#3b82f6",
  planning: "#8b5cf6",
  in_progress: "#f59e0b",
  under_review: "#f97316",
  closed: "#10b981",
  cancelled: "#6b7280",
};

export default function RiskLinkedAuditsPanel({ riskId, audits, onRefresh }: Props) {
  const navigate = useNavigate();
  const [showLink, setShowLink] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  async function handleSearch(q: string) {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get("/audits", { params: { search: q } });
      const existing = new Set(audits.map((a) => a.id));
      setSearchResults((res.data.audits || []).filter((a: any) => !existing.has(a.id)).slice(0, 10));
    } catch { setSearchResults([]); }
  }

  async function handleLink(auditId: string) {
    try {
      await api.post(`/risks/${riskId}/audits/${auditId}`);
      setShowLink(false);
      setSearch("");
      setSearchResults([]);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to link audit");
    }
  }

  async function handleUnlink(auditId: string) {
    try {
      await api.delete(`/risks/${riskId}/audits/${auditId}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to unlink audit");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Linked Audits ({audits.length})</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowLink(!showLink)}>
          + Link Audit
        </button>
      </div>

      {showLink && (
        <div style={{ padding: "0.75rem", background: "var(--color-bg-subtle)", borderRadius: 8, marginBottom: "0.75rem" }}>
          <input
            type="text"
            placeholder="Search audits by title or number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div style={{ marginTop: "0.5rem", maxHeight: 200, overflow: "auto" }}>
              {searchResults.map((audit: any) => (
                <div
                  key={audit.id}
                  onClick={() => handleLink(audit.id)}
                  style={{
                    padding: "0.5rem",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span><strong>{audit.audit_number}</strong> {audit.title}</span>
                  <span className="badge" style={{ background: STATUS_COLORS[audit.status] || "#9ca3af", color: "#fff" }}>
                    {audit.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {audits.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>No linked audits.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Audit #</th>
                <th>Title</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/audits/${audit.id}`)}
                      style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                    >
                      {audit.audit_number}
                    </button>
                  </td>
                  <td>{audit.title}</td>
                  <td>
                    <span className="badge" style={{ background: STATUS_COLORS[audit.status] || "#9ca3af", color: "#fff" }}>
                      {audit.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon btn-danger-icon" onClick={() => handleUnlink(audit.id)} title="Unlink">&times;</button>
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
