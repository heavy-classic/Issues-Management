import { useState, useEffect, type FormEvent } from "react";
import api from "../api/client";

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface Recipient {
  user_id?: string | null;
  external_email?: string | null;
  delivery_method: string;
}

interface Props {
  reportId: string;
  onClose: () => void;
  onSaved: () => void;
}

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

export default function ScheduleReportModal({ reportId, onClose, onSaved }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [format, setFormat] = useState("pdf");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipientType, setNewRecipientType] = useState<"user" | "email">("user");
  const [newUserId, setNewUserId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users").then((res) => setUsers(res.data.users));
  }, []);

  function addRecipient() {
    if (newRecipientType === "user" && newUserId) {
      if (recipients.some((r) => r.user_id === newUserId)) return;
      setRecipients([...recipients, { user_id: newUserId, delivery_method: "email" }]);
      setNewUserId("");
    } else if (newRecipientType === "email" && newEmail) {
      if (recipients.some((r) => r.external_email === newEmail)) return;
      setRecipients([...recipients, { external_email: newEmail, delivery_method: "email" }]);
      setNewEmail("");
    }
  }

  function removeRecipient(index: number) {
    setRecipients(recipients.filter((_, i) => i !== index));
  }

  function getRecipientLabel(r: Recipient): string {
    if (r.user_id) {
      const user = users.find((u) => u.id === r.user_id);
      return user ? (user.full_name || user.email) : r.user_id;
    }
    return r.external_email || "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (recipients.length === 0) {
      setError("At least one recipient is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post("/report-schedules", {
        report_id: reportId,
        frequency,
        day_of_week: (frequency === "weekly" || frequency === "bi_weekly") ? dayOfWeek : null,
        day_of_month: (frequency === "monthly" || frequency === "quarterly") ? dayOfMonth : null,
        time_of_day: timeOfDay,
        timezone,
        format,
        recipients,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Schedule Report</h2>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {(frequency === "weekly" || frequency === "bi_weekly") && (
            <div className="form-group">
              <label>Day of Week</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}

          {(frequency === "monthly" || frequency === "quarterly") && (
            <div className="form-group">
              <label>Day of Month</label>
              <select value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          {/* Recipients */}
          <div className="form-group">
            <label>Recipients</label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <select value={newRecipientType} onChange={(e) => setNewRecipientType(e.target.value as "user" | "email")} style={{ width: 100 }}>
                <option value="user">User</option>
                <option value="email">Email</option>
              </select>
              {newRecipientType === "user" ? (
                <select value={newUserId} onChange={(e) => setNewUserId(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Select user...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              ) : (
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={{ flex: 1 }}
                />
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={addRecipient}>Add</button>
            </div>
            {recipients.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {recipients.map((r, i) => (
                  <span key={i} className="badge" style={{ background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    {getRecipientLabel(r)}
                    <button type="button" onClick={() => removeRecipient(i)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
