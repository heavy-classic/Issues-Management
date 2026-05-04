import { useState, type FormEvent } from "react";
import api from "../api/client";

interface Props { auditId: string; meetings: any[]; users: any[]; onUpdate: () => void; }

const TYPE_LABELS: Record<string, string> = {
  opening: "Opening", fieldwork: "Fieldwork", closing: "Closing", other: "Other",
};
const TYPE_BG: Record<string, string> = {
  opening: "#dbeafe", fieldwork: "#fef3c7", closing: "#d1fae5", other: "#f3f4f6",
};
const TYPE_COLOR: Record<string, string> = {
  opening: "#1d4ed8", fieldwork: "#d97706", closing: "#065f46", other: "#6b7280",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AuditMeetingsPanel({ auditId, meetings, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState("other");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setMeetingType("other"); setTitle(""); setScheduledDate(""); setNotes("");
    setEditingId(null); setShowForm(false);
  }

  function handleEdit(m: any) {
    setEditingId(m.id); setMeetingType(m.meeting_type); setTitle(m.title);
    setScheduledDate(m.scheduled_date?.split("T")[0] || "");
    setNotes(m.notes || ""); setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/audits/meetings/${editingId}`, { meeting_type: meetingType, title, scheduled_date: scheduledDate, notes });
      } else {
        await api.post(`/audits/${auditId}/meetings`, { meeting_type: meetingType, title, scheduled_date: scheduledDate, notes });
      }
      resetForm(); onUpdate();
    } catch { alert("Failed to save meeting"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(meetingId: string) {
    if (!confirm("Delete this meeting?")) return;
    await api.delete(`/audits/meetings/${meetingId}`);
    onUpdate();
  }

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Meetings{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {meetings.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => { resetForm(); setShowForm((v) => !v); }}>+ Add</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}
          style={{ background: "#f8f7ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)}
              style={{ flex: "1 1 100px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="text" placeholder="Title *" value={title} required
              onChange={(e) => setTitle(e.target.value)}
              style={{ flex: "2 1 160px", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }} />
            <input type="date" value={scheduledDate} required
              onChange={(e) => setScheduledDate(e.target.value)}
              style={{ flex: "1 1 120px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }} />
          </div>
          <input type="text" placeholder="Notes (optional)" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button type="button" className="ap-btn" style={{ background: "#e0e7ff", color: "#4f46e5" }} onClick={resetForm}>Cancel</button>
            <button type="submit" className="ap-btn ap-btn-edit" disabled={submitting}>
              {submitting ? "Saving…" : editingId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      )}

      <table className="ap-table">
        <thead>
          <tr>
            <th className="ap-th" scope="col">Type</th>
            <th className="ap-th" scope="col">Title</th>
            <th className="ap-th" scope="col">Date</th>
            <th className="ap-th" scope="col">Notes</th>
            <th className="ap-th" />
          </tr>
        </thead>
        <tbody>
          {meetings.length === 0 ? (
            <tr><td colSpan={5} className="ap-empty">No meetings scheduled.</td></tr>
          ) : (
            meetings.map((m) => (
              <tr key={m.id} className="ap-row">
                <td className="ap-td">
                  <span className="ap-status" style={{ background: TYPE_BG[m.meeting_type] || "#f3f4f6", color: TYPE_COLOR[m.meeting_type] || "#6b7280" }}>
                    {TYPE_LABELS[m.meeting_type] || m.meeting_type}
                  </span>
                </td>
                <td className="ap-td ap-name">{m.title}</td>
                <td className="ap-td" style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(m.scheduled_date)}</td>
                <td className="ap-td" style={{ fontSize: 12, color: "#6b7280", maxWidth: 200 }}>
                  {m.notes || <span style={{ color: "#c7d2fe" }}>—</span>}
                </td>
                <td className="ap-td ap-actions-cell">
                  <button className="ap-btn ap-btn-edit" onClick={() => handleEdit(m)}>Edit</button>
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
