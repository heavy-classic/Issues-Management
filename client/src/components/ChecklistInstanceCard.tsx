import { useState } from "react";
import api from "../api/client";
import ChecklistExecutionModal from "./ChecklistExecutionModal";

interface Props {
  instance: any;
  onUpdate: () => void;
}

const STATUS_BG: Record<string, string> = {
  not_started: "#f3f4f6", in_progress: "#dbeafe", complete: "#d1fae5", under_review: "#fef3c7",
};
const STATUS_COLOR: Record<string, string> = {
  not_started: "#6b7280", in_progress: "#1d4ed8", complete: "#065f46", under_review: "#d97706",
};
const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started", in_progress: "In Progress", complete: "Complete", under_review: "Under Review",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Rendered as a <tr> inside an ap-table in AuditDetailPage
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
      <tr className="ap-row" style={{ cursor: "pointer" }} onClick={() => setShowExecution(true)}>
        <td className="ap-td ap-name">{instance.checklist_name}</td>
        <td className="ap-td">
          <span className="ap-status" style={{ background: STATUS_BG[instance.status] || "#f3f4f6", color: STATUS_COLOR[instance.status] || "#6b7280" }}>
            {STATUS_LABELS[instance.status] || instance.status}
          </span>
        </td>
        <td className="ap-td ap-assignee">{instance.assigned_to_name || <span style={{ color: "#c7d2fe" }}>—</span>}</td>
        <td className="ap-td">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, background: "#e0e7ff", borderRadius: 4, height: 6, minWidth: 60, overflow: "hidden" }}>
              <div style={{
                width: `${progress}%`, height: "100%", borderRadius: 4,
                background: progress === 100 ? "#10b981" : "#4f46e5",
                transition: "width 0.3s",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{responded}/{total}</span>
          </div>
        </td>
        <td className="ap-td" style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(instance.due_date)}</td>
        <td className="ap-td ap-actions-cell" onClick={(e) => e.stopPropagation()}>
          <button className="ap-btn ap-btn-del" onClick={handleRemove}>Remove</button>
        </td>
      </tr>

      {showExecution && (
        <ChecklistExecutionModal
          instanceId={instance.id}
          onClose={() => { setShowExecution(false); onUpdate(); }}
        />
      )}
    </>
  );
}
