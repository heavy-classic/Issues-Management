import { useState, FormEvent } from "react";

interface AuditType {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface AuditData {
  id?: string;
  title?: string;
  description?: string;
  audit_type_id?: string;
  priority?: string;
  risk_level?: string | null;
  lead_auditor_id?: string | null;
  auditee_department?: string;
  objective?: string;
  scope?: string;
  methodology?: string;
  criteria_standards?: string;
  location?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  report_due?: string | null;
}

interface Props {
  auditTypes: AuditType[];
  users: User[];
  initial?: AuditData;
  onSubmit: (data: AuditData) => Promise<void>;
  onClose: () => void;
}

export default function AuditFormModal({ auditTypes, users, initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [auditTypeId, setAuditTypeId] = useState(initial?.audit_type_id || "");
  const [priority, setPriority] = useState(initial?.priority || "medium");
  const [riskLevel, setRiskLevel] = useState(initial?.risk_level || "");
  const [leadAuditorId, setLeadAuditorId] = useState(initial?.lead_auditor_id || "");
  const [auditeeDepartment, setAuditeeDepartment] = useState(initial?.auditee_department || "");
  const [objective, setObjective] = useState(initial?.objective || "");
  const [scope, setScope] = useState(initial?.scope || "");
  const [methodology, setMethodology] = useState(initial?.methodology || "");
  const [criteriaStandards, setCriteriaStandards] = useState(initial?.criteria_standards || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [scheduledStart, setScheduledStart] = useState(initial?.scheduled_start?.split("T")[0] || "");
  const [scheduledEnd, setScheduledEnd] = useState(initial?.scheduled_end?.split("T")[0] || "");
  const [reportDue, setReportDue] = useState(initial?.report_due?.split("T")[0] || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        audit_type_id: auditTypeId,
        priority,
        risk_level: riskLevel || null,
        lead_auditor_id: leadAuditorId || null,
        auditee_department: auditeeDepartment,
        objective,
        scope,
        methodology,
        criteria_standards: criteriaStandards,
        location,
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
        report_due: reportDue || null,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save audit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial?.id ? "Edit Audit" : "Create New Audit"}</h2>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Audit Type *</label>
              <select value={auditTypeId} onChange={(e) => setAuditTypeId(e.target.value)} required>
                <option value="">Select type...</option>
                {auditTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {["low", "medium", "high", "critical"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Risk Level</label>
              <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                <option value="">Not set</option>
                {["low", "medium", "high", "critical"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Lead Auditor</label>
              <select value={leadAuditorId} onChange={(e) => setLeadAuditorId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input type="text" value={auditeeDepartment} onChange={(e) => setAuditeeDepartment(e.target.value)} maxLength={255} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={255} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Scheduled Start</label>
              <input type="date" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Scheduled End</label>
              <input type="date" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Objective</label>
            <textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Scope</label>
            <textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Methodology</label>
            <textarea rows={2} value={methodology} onChange={(e) => setMethodology(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Standards / Criteria</label>
            <input type="text" value={criteriaStandards} onChange={(e) => setCriteriaStandards(e.target.value)} placeholder="e.g., ISO 9001:2015, FDA 21 CFR Part 820" maxLength={500} />
          </div>
          <div className="form-group">
            <label>Report Due Date</label>
            <input type="date" value={reportDue} onChange={(e) => setReportDue(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : initial?.id ? "Update Audit" : "Create Audit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
