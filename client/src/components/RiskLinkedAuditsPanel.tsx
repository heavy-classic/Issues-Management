import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

interface LinkedAudit {
  id: string; title: string; status: string; audit_number: string; relationship: string;
}
interface Props { riskId: string; audits: LinkedAudit[]; onRefresh: () => void; }

const STATUS_BG: Record<string, string> = {
  draft: "#f3f4f6", scheduled: "#dbeafe", planning: "#ede9fe",
  in_progress: "#fef3c7", under_review: "#ffedd5", closed: "#d1fae5", cancelled: "#fee2e2",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#6b7280", scheduled: "#1d4ed8", planning: "#5b21b6",
  in_progress: "#d97706", under_review: "#ea580c", closed: "#065f46", cancelled: "#dc2626",
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
      setShowLink(false); setSearch(""); setSearchResults([]);
      onRefresh();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to link audit"); }
  }

  async function handleUnlink(auditId: string) {
    try {
      await api.delete(`/risks/${riskId}/audits/${auditId}`);
      onRefresh();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to unlink audit"); }
  }

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Linked Audits{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {audits.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => setShowLink((v) => !v)}>+ Link</button>
      </div>

      {showLink && (
        <div style={{ background: "#f8f7ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
          <input type="text" placeholder="Search audits by title or number…"
            value={search} onChange={(e) => handleSearch(e.target.value)} autoFocus
            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12, boxSizing: "border-box" }} />
          {searchResults.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 180, overflow: "auto", border: "1px solid #e0e7ff", borderRadius: 6 }}>
              {searchResults.map((audit: any) => (
                <div key={audit.id} onClick={() => handleLink(audit.id)}
                  style={{ padding: "7px 10px", cursor: "pointer", borderBottom: "1px solid #e0e7ff", display: "flex", justifyContent: "space-between", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#ede9fe")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <span><strong style={{ color: "#4f46e5" }}>{audit.audit_number}</strong> {audit.title}</span>
                  <span className="ap-status" style={{ background: STATUS_BG[audit.status] || "#f3f4f6", color: STATUS_COLOR[audit.status] || "#6b7280" }}>
                    {audit.status}
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
            <th className="ap-th">Audit #</th>
            <th className="ap-th">Title</th>
            <th className="ap-th">Status</th>
            <th className="ap-th" />
          </tr>
        </thead>
        <tbody>
          {audits.length === 0 ? (
            <tr><td colSpan={4} className="ap-empty">No linked audits.</td></tr>
          ) : (
            audits.map((audit) => (
              <tr key={audit.id} className="ap-row">
                <td className="ap-td">
                  <button onClick={() => navigate(`/audits/${audit.id}`)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#4f46e5", fontWeight: 600, fontSize: 12, padding: 0, fontFamily: "monospace" }}>
                    {audit.audit_number}
                  </button>
                </td>
                <td className="ap-td ap-name" style={{ cursor: "pointer" }} onClick={() => navigate(`/audits/${audit.id}`)}>
                  {audit.title}
                </td>
                <td className="ap-td">
                  <span className="ap-status" style={{ background: STATUS_BG[audit.status] || "#f3f4f6", color: STATUS_COLOR[audit.status] || "#6b7280" }}>
                    {audit.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="ap-td ap-actions-cell">
                  <button className="ap-btn ap-btn-del" onClick={() => handleUnlink(audit.id)}>Unlink</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
