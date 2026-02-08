import { useState, useEffect, useRef } from "react";
import api from "../api/client";

interface Props {
  instanceId: string;
  onClose: () => void;
}

export default function ChecklistExecutionModal({ instanceId, onClose }: Props) {
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentGroupIdx, setCurrentGroupIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  async function fetchInstance() {
    const res = await api.get(`/checklist-instances/${instanceId}`);
    setInstance(res.data.instance);
    setLoading(false);
  }

  useEffect(() => {
    fetchInstance();
  }, [instanceId]);

  async function handleResponse(criterionId: string, responseValue: string, notes: string) {
    setSaving(true);
    try {
      await api.post(`/checklist-instances/${instanceId}/responses`, {
        criterion_id: criterionId,
        response_value: responseValue,
        notes,
      });
      await fetchInstance();
    } catch {
      alert("Failed to save response");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!confirm("Mark this checklist as complete?")) return;
    await api.patch(`/checklist-instances/${instanceId}`, { status: "complete" });
    onClose();
  }

  if (loading) return <div className="modal-overlay"><div className="modal-content modal-lg"><p>Loading...</p></div></div>;
  if (!instance) return null;

  const groups = instance.groups || [];
  const currentGroup = groups[currentGroupIdx];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg checklist-execution-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{instance.checklist_name}</h2>
            <div className="text-muted" style={{ fontSize: "0.85rem" }}>
              {instance.audit_number} — {instance.audit_title}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>

        {instance.checklist_instructions && (
          <div className="checklist-instructions">
            {instance.checklist_instructions}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            <span>{instance.respondedCount}/{instance.totalCriteria} criteria completed</span>
            <span>{instance.progress}%</span>
          </div>
          <div className="checklist-progress-bar">
            <div className="checklist-progress-fill" style={{ width: `${instance.progress}%`, background: instance.progress === 100 ? "#10b981" : "var(--color-primary, #667eea)" }} />
          </div>
        </div>

        {/* Group tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {groups.map((g: any, idx: number) => (
            <button
              key={g.id}
              className={`btn ${idx === currentGroupIdx ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setCurrentGroupIdx(idx)}
              style={{ fontSize: "0.85rem" }}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Criteria */}
        {currentGroup && currentGroup.criteria.map((criterion: any) => (
          <CriterionItem
            key={criterion.id}
            criterion={criterion}
            instanceId={instanceId}
            onRespond={handleResponse}
            onRefresh={fetchInstance}
            saving={saving}
          />
        ))}

        <div className="form-actions" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" disabled={currentGroupIdx === 0} onClick={() => setCurrentGroupIdx((i) => i - 1)}>Previous</button>
            <button className="btn btn-secondary" disabled={currentGroupIdx >= groups.length - 1} onClick={() => setCurrentGroupIdx((i) => i + 1)}>Next</button>
          </div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={instance.progress < 100}>
            {instance.progress < 100 ? `${instance.progress}% Complete` : "Submit Checklist"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CriterionItem({
  criterion, instanceId, onRespond, onRefresh, saving,
}: {
  criterion: any;
  instanceId: string;
  onRespond: (id: string, value: string, notes: string) => void;
  onRefresh: () => void;
  saving: boolean;
}) {
  const [notes, setNotes] = useState(criterion.response?.notes || "");
  const [selectedValue, setSelectedValue] = useState(criterion.response?.response_value || "");
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasResponse = !!criterion.response;
  const hasFinding = !!criterion.response?.finding_issue_id;

  function getAnswerOptions(): string[] {
    switch (criterion.answer_type) {
      case "yes_no": return ["Yes", "No"];
      case "yes_no_na": return ["Yes", "No", "N/A"];
      case "compliant": return ["Compliant", "Partially Compliant", "Non-Compliant"];
      case "rating_scale": return ["1", "2", "3", "4", "5"];
      case "expectations": return ["Exceeds Expectations", "Meets Expectations", "Needs Improvement"];
      default: return ["Yes", "No"];
    }
  }

  function handleSelect(value: string) {
    setSelectedValue(value);
    onRespond(criterion.id, value, notes);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !hasResponse) return;

    setUploadingFiles(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      await api.post(
        `/checklist-instances/${instanceId}/responses/${criterion.id}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      onRefresh();
    } catch {
      alert("Failed to upload files");
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const attachmentCount = criterion.response?.attachment_count || 0;

  return (
    <div className={`criterion-item${hasResponse ? " criterion-answered" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            {criterion.criterion_id_display && (
              <span className="badge" style={{ background: "var(--color-primary, #667eea)", color: "#fff", fontSize: "0.75rem" }}>
                {criterion.criterion_id_display}
              </span>
            )}
            {criterion.risk_rating && (
              <span className={`badge badge-priority-${criterion.risk_rating}`} style={{ fontSize: "0.75rem" }}>
                {criterion.risk_rating}
              </span>
            )}
            {hasFinding && (
              <span className="badge" style={{ background: "#ef4444", color: "#fff", fontSize: "0.7rem" }}>
                Finding Created
              </span>
            )}
          </div>
          <p style={{ margin: "0.25rem 0", fontWeight: 500 }}>{criterion.text}</p>
          {criterion.reference_citation && (
            <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.25rem 0" }}>Ref: {criterion.reference_citation}</p>
          )}
          {criterion.help_text && (
            <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.25rem 0", fontStyle: "italic" }}>{criterion.help_text}</p>
          )}
        </div>
      </div>

      {/* Answer buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        {getAnswerOptions().map((opt) => (
          <button
            key={opt}
            className={`btn ${selectedValue === opt ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.85rem", padding: "0.3rem 0.75rem" }}
            onClick={() => handleSelect(opt)}
            disabled={saving}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Notes */}
      {criterion.comments_enabled !== false && (
        <div style={{ marginTop: "0.5rem" }}>
          <textarea
            rows={1}
            placeholder="Notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (selectedValue) onRespond(criterion.id, selectedValue, notes); }}
            style={{ width: "100%", fontSize: "0.85rem" }}
          />
        </div>
      )}

      {/* Action row: attachments + finding */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Attachment upload */}
        {criterion.attachments_allowed !== false && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: "none" }}
              disabled={!hasResponse || uploadingFiles}
            />
            <button
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={!hasResponse || uploadingFiles}
              title={!hasResponse ? "Answer the criterion first" : "Attach evidence files"}
            >
              {uploadingFiles ? "Uploading..." : `\u{1F4CE} Attach${attachmentCount > 0 ? ` (${attachmentCount})` : ""}`}
            </button>
          </div>
        )}

        {/* Create Finding button */}
        {criterion.finding_creation_enabled !== false && !hasFinding && hasResponse && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", color: "#ef4444" }}
            onClick={() => setShowFindingForm(true)}
          >
            {"\u26A0"} Create Finding
          </button>
        )}
      </div>

      {/* Inline Finding Form */}
      {showFindingForm && (
        <InlineFindingForm
          instanceId={instanceId}
          criterionId={criterion.id}
          defaultTitle={criterion.text}
          onCreated={() => { setShowFindingForm(false); onRefresh(); }}
          onCancel={() => setShowFindingForm(false)}
        />
      )}
    </div>
  );
}

function InlineFindingForm({
  instanceId, criterionId, defaultTitle, onCreated, onCancel,
}: {
  instanceId: string;
  criterionId: string;
  defaultTitle: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("minor");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/checklist-instances/${instanceId}/responses/${criterionId}/finding`, {
        title,
        description,
        finding_severity: severity,
        priority,
      });
      onCreated();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create finding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inline-finding-form">
      <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Create Finding</div>
      <div className="form-group" style={{ marginBottom: "0.5rem" }}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finding title" style={{ fontSize: "0.85rem" }} />
      </div>
      <div className="form-group" style={{ marginBottom: "0.5rem" }}>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." style={{ fontSize: "0.85rem" }} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ fontSize: "0.85rem" }}>
          <option value="observation">Observation</option>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ fontSize: "0.85rem" }}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }} onClick={handleSubmit} disabled={submitting || !title.trim()}>
          {submitting ? "Creating..." : "Create Finding"}
        </button>
        <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
