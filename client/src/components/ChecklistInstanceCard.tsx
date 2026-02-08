import { useState } from "react";
import api from "../api/client";
import ChecklistExecutionModal from "./ChecklistExecutionModal";

interface Props {
  instance: any;
  onUpdate: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
  under_review: "Under Review",
};

export default function ChecklistInstanceCard({ instance, onUpdate }: Props) {
  const [showExecution, setShowExecution] = useState(false);

  const total = instance.total_criteria || 0;
  const responded = instance.responded_count || 0;
  const progress = total > 0 ? Math.round((responded / total) * 100) : 0;

  async function handleRemove() {
    if (!confirm("Remove this checklist from the audit?")) return;
    await api.delete(`/audits/checklist-instances/${instance.id}`);
    onUpdate();
  }

  return (
    <>
      <div className="action-card" style={{ cursor: "pointer" }} onClick={() => setShowExecution(true)}>
        <div className="action-card-header">
          <h4 className="action-card-title">{instance.checklist_name}</h4>
          <button className="btn-icon btn-danger-icon" onClick={(e) => { e.stopPropagation(); handleRemove(); }} title="Remove">&times;</button>
        </div>
        <div className="action-card-badges">
          <span className={`badge badge-action-${instance.status === "complete" ? "completed" : instance.status === "in_progress" ? "assigned" : "initiate"}`}>
            {STATUS_LABELS[instance.status] || instance.status}
          </span>
          {instance.assigned_to_name && (
            <span className="badge">{instance.assigned_to_name}</span>
          )}
        </div>
        <div style={{ margin: "0.75rem 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            <span>{responded}/{total} criteria</span>
            <span>{progress}%</span>
          </div>
          <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: progress === 100 ? "#10b981" : "#667eea",
              borderRadius: "4px",
              transition: "width 0.3s",
            }} />
          </div>
        </div>
        {instance.due_date && (
          <div className="action-card-meta">
            <span>Due: {new Date(instance.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {showExecution && (
        <ChecklistExecutionModal
          instanceId={instance.id}
          onClose={() => { setShowExecution(false); onUpdate(); }}
        />
      )}
    </>
  );
}
