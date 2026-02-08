import { useState } from "react";
import api from "../api/client";

const STATUS_COLORS: Record<string, string> = {
  planned: "#9ca3af",
  in_progress: "#3b82f6",
  implemented: "#10b981",
  verified: "#059669",
  ineffective: "#ef4444",
};

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface Mitigation {
  id: string;
  title: string;
  description: string | null;
  mitigation_type: string | null;
  status: string;
  effectiveness: string;
  owner_name: string | null;
  owner_email: string | null;
  due_date: string | null;
  completed_date: string | null;
  cost_estimate: string | null;
  notes: string | null;
}

interface Props {
  riskId: string;
  mitigations: Mitigation[];
  users: User[];
  onRefresh: () => void;
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
        title,
        description: description || undefined,
        mitigation_type: mitigationType || undefined,
        owner_id: ownerId || null,
        due_date: dueDate || null,
      });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setMitigationType("");
      setOwnerId("");
      setDueDate("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add mitigation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(mid: string, newStatus: string) {
    try {
      const data: any = { status: newStatus };
      if (newStatus === "implemented" || newStatus === "verified") {
        data.completed_date = new Date().toISOString().split("T")[0];
      }
      await api.put(`/risks/${riskId}/mitigations/${mid}`, data);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update");
    }
  }

  async function handleDelete(mid: string) {
    if (!confirm("Delete this mitigation?")) return;
    try {
      await api.delete(`/risks/${riskId}/mitigations/${mid}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Mitigations / Controls</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}>
          + Add Mitigation
        </button>
      </div>

      {showForm && (
        <div style={{ padding: "0.75rem", background: "var(--color-bg-subtle)", borderRadius: 8, marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={mitigationType} onChange={(e) => setMitigationType(e.target.value)}>
                <option value="">Select...</option>
                {["preventive", "detective", "corrective", "directive"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {mitigations.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>No mitigations defined yet.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Effectiveness</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mitigations.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.title}</strong>
                    {m.description && <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{m.description}</div>}
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{m.mitigation_type || "-"}</td>
                  <td>
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.15rem 0.25rem",
                        border: `1px solid ${STATUS_COLORS[m.status] || "#9ca3af"}`,
                        borderRadius: 4,
                        color: STATUS_COLORS[m.status] || "inherit",
                        background: "var(--color-bg-card)",
                      }}
                    >
                      {["planned", "in_progress", "implemented", "verified", "ineffective"].map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{m.effectiveness?.replace("_", " ") || "-"}</td>
                  <td>{m.owner_name || m.owner_email || "-"}</td>
                  <td>{m.due_date ? new Date(m.due_date).toLocaleDateString() : "-"}</td>
                  <td>
                    <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(m.id)} title="Delete">&times;</button>
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
