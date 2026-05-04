import { useState } from "react";
import api from "../api/client";

const STATUS_BG: Record<string, string> = {
  planned: "#f3f4f6", in_progress: "#dbeafe", implemented: "#d1fae5",
  verified: "#d1fae5", ineffective: "#fee2e2",
};
const STATUS_COLOR: Record<string, string> = {
  planned: "#6b7280", in_progress: "#1d4ed8", implemented: "#065f46",
  verified: "#065f46", ineffective: "#dc2626",
};

interface User { id: string; full_name: string | null; email: string; }
interface Mitigation {
  id: string; title: string; description: string | null;
  mitigation_type: string | null; status: string; effectiveness: string;
  owner_name: string | null; owner_email: string | null; due_date: string | null;
}
interface Props { riskId: string; mitigations: Mitigation[]; users: User[]; onRefresh: () => void; }

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function RiskMitigationsPanel({ riskId, mitigations, users, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mitigationType, setMitigationType] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/risks/${riskId}/mitigations`, {
        title, description: description || undefined,
        mitigation_type: mitigationType || undefined,
        owner_id: ownerId || null, due_date: dueDate || null,
      });
      setShowForm(false);
      setTitle(""); setDescription(""); setMitigationType(""); setOwnerId(""); setDueDate("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add mitigation");
    } finally { setSubmitting(false); }
  }

  async function handleStatusChange(mid: string, newStatus: string) {
    try {
      const data: any = { status: newStatus };
      if (newStatus === "implemented" || newStatus === "verified")
        data.completed_date = new Date().toISOString().split("T")[0];
      await api.put(`/risks/${riskId}/mitigations/${mid}`, data);
      onRefresh();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to update"); }
  }

  async function handleDelete(mid: string) {
    if (!confirm("Delete this mitigation?")) return;
    try {
      await api.delete(`/risks/${riskId}/mitigations/${mid}`);
      onRefresh();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to delete"); }
  }

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Mitigations{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {mitigations.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => setShowForm((v) => !v)}>+ Add</button>
      </div>

      {showForm && (
        <div style={{ background: "#f8f7ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input type="text" placeholder="Title *" value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ flex: "2 1 180px", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }} />
            <select value={mitigationType} onChange={(e) => setMitigationType(e.target.value)}
              style={{ flex: "1 1 110px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
              <option value="">Type…</option>
              {["preventive", "detective", "corrective", "directive"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
              style={{ flex: "1 1 130px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
              <option value="">Owner…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              style={{ flex: "1 1 120px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }} />
          </div>
          <input type="text" placeholder="Description (optional)" value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="ap-btn" style={{ background: "#e0e7ff", color: "#4f46e5" }} onClick={() => setShowForm(false)}>Cancel</button>
            <button className="ap-btn ap-btn-edit" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Saving…" : "Add"}
            </button>
          </div>
        </div>
      )}

      <table className="ap-table">
        <thead>
          <tr>
            <th className="ap-th" scope="col">Title</th>
            <th className="ap-th" scope="col">Type</th>
            <th className="ap-th" scope="col">Status</th>
            <th className="ap-th" scope="col">Owner</th>
            <th className="ap-th" scope="col">Due</th>
            <th className="ap-th" />
          </tr>
        </thead>
        <tbody>
          {mitigations.length === 0 ? (
            <tr><td colSpan={6} className="ap-empty">No mitigations defined yet.</td></tr>
          ) : (
            mitigations.map((m) => (
              <tr key={m.id} className="ap-row">
                <td className="ap-td ap-name">
                  {m.title}
                  {m.description && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{m.description}</div>}
                </td>
                <td className="ap-td" style={{ textTransform: "capitalize", fontSize: 12 }}>{m.mitigation_type || "—"}</td>
                <td className="ap-td">
                  <select value={m.status} onChange={(e) => handleStatusChange(m.id, e.target.value)}
                    style={{
                      fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: STATUS_BG[m.status] || "#f3f4f6",
                      color: STATUS_COLOR[m.status] || "#6b7280", fontWeight: 600,
                    }}>
                    {["planned", "in_progress", "implemented", "verified", "ineffective"].map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </td>
                <td className="ap-td ap-assignee">{m.owner_name || m.owner_email || <span style={{ color: "#c7d2fe" }}>—</span>}</td>
                <td className="ap-td" style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(m.due_date)}</td>
                <td className="ap-td ap-actions-cell">
                  <button className="ap-btn ap-btn-del" onClick={() => handleDelete(m.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
