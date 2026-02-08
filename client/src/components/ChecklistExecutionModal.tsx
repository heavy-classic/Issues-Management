import { useState, useEffect } from "react";
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
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflow: "auto" }}>
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
          <div style={{ background: "#f0f4ff", padding: "0.75rem 1rem", borderRadius: "8px", margin: "0.5rem 0 1rem", fontSize: "0.9rem" }}>
            {instance.checklist_instructions}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            <span>{instance.respondedCount}/{instance.totalCriteria} criteria completed</span>
            <span>{instance.progress}%</span>
          </div>
          <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "8px" }}>
            <div style={{ width: `${instance.progress}%`, height: "100%", background: instance.progress === 100 ? "#10b981" : "#667eea", borderRadius: "4px" }} />
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
            onRespond={handleResponse}
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
  criterion, onRespond, saving,
}: {
  criterion: any; onRespond: (id: string, value: string, notes: string) => void; saving: boolean;
}) {
  const [notes, setNotes] = useState(criterion.response?.notes || "");
  const [selectedValue, setSelectedValue] = useState(criterion.response?.response_value || "");
  const hasResponse = !!criterion.response;

  function getAnswerOptions(): string[] {
    switch (criterion.answer_type) {
      case "yes_no": return ["Yes", "No"];
      case "yes_no_na": return ["Yes", "No", "N/A"];
      case "compliant": return ["Compliant", "Partially Compliant", "Non-Compliant"];
      case "rating_scale": return ["1", "2", "3", "4", "5"];
      case "expectations": return ["Exceeds", "Meets", "Below", "N/A"];
      default: return ["Yes", "No"];
    }
  }

  function handleSelect(value: string) {
    setSelectedValue(value);
    onRespond(criterion.id, value, notes);
  }

  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "1rem",
      marginBottom: "0.75rem",
      background: hasResponse ? "#f9fafb" : "#fff",
      borderLeft: hasResponse ? "3px solid #10b981" : "3px solid #e5e7eb",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            {criterion.criterion_id_display && (
              <span className="badge" style={{ background: "#667eea", color: "#fff", fontSize: "0.75rem" }}>
                {criterion.criterion_id_display}
              </span>
            )}
            {criterion.risk_rating && (
              <span className={`badge badge-priority-${criterion.risk_rating}`} style={{ fontSize: "0.75rem" }}>
                {criterion.risk_rating}
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

      {criterion.comments_enabled && (
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
    </div>
  );
}
