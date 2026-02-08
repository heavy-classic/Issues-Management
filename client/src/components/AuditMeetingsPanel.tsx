import { useState, FormEvent } from "react";
import api from "../api/client";

interface Props {
  auditId: string;
  meetings: any[];
  users: any[];
  onUpdate: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  opening: "Opening Meeting",
  fieldwork: "Fieldwork",
  closing: "Closing Meeting",
  other: "Other",
};

export default function AuditMeetingsPanel({ auditId, meetings, users, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState("other");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setMeetingType("other");
    setTitle("");
    setScheduledDate("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(m: any) {
    setEditingId(m.id);
    setMeetingType(m.meeting_type);
    setTitle(m.title);
    setScheduledDate(m.scheduled_date?.split("T")[0] || "");
    setNotes(m.notes || "");
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/audits/meetings/${editingId}`, {
          meeting_type: meetingType,
          title,
          scheduled_date: scheduledDate,
          notes,
        });
      } else {
        await api.post(`/audits/${auditId}/meetings`, {
          meeting_type: meetingType,
          title,
          scheduled_date: scheduledDate,
          notes,
        });
      }
      resetForm();
      onUpdate();
    } catch {
      alert("Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(meetingId: string) {
    if (!confirm("Delete this meeting?")) return;
    await api.delete(`/audits/meetings/${meetingId}`);
    onUpdate();
  }

  return (
    <div className="detail-section">
      <div className="section-header-row">
        <h3>Meetings <span className="section-count-badge">{meetings.length}</span></h3>
        <button className="btn btn-secondary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancel" : "+ Add Meeting"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update" : "Add Meeting"}
            </button>
          </div>
        </form>
      )}

      {meetings.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Date</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id}>
                  <td><span className="badge">{TYPE_LABELS[m.meeting_type] || m.meeting_type}</span></td>
                  <td>{m.title}</td>
                  <td>{new Date(m.scheduled_date).toLocaleDateString()}</td>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.notes || "—"}
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(m)} title="Edit">&#9998;</button>
                    <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(m.id)} title="Delete">&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">No meetings scheduled.</p>
      )}
    </div>
  );
}
