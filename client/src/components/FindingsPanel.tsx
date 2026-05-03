import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import FindingFormModal from "./FindingFormModal";

interface Props {
  auditId: string;
  findings: any[];
  users: any[];
  onUpdate: () => void;
}

const SEVERITY_BG: Record<string, string> = {
  observation: "#f3f4f6", minor: "#fef3c7", major: "#ffedd5", critical: "#fee2e2",
};
const SEVERITY_COLOR: Record<string, string> = {
  observation: "#6b7280", minor: "#d97706", major: "#ea580c", critical: "#dc2626",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function FindingsPanel({ auditId, findings, users, onUpdate }: Props) {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  async function handleCreate(data: any) {
    await api.post(`/audits/${auditId}/findings`, data);
    setShowCreate(false);
    onUpdate();
  }

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Findings{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {findings.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => setShowCreate(true)}>+ Add</button>
      </div>

      <table className="ap-table">
        <thead>
          <tr>
            <th className="ap-th">Title</th>
            <th className="ap-th">Severity</th>
            <th className="ap-th">Priority</th>
            <th className="ap-th">Status</th>
            <th className="ap-th">Assignee</th>
            <th className="ap-th">Created</th>
            <th className="ap-th" />
          </tr>
        </thead>
        <tbody>
          {findings.length === 0 ? (
            <tr>
              <td colSpan={7} className="ap-empty">No findings recorded.</td>
            </tr>
          ) : (
            findings.map((f) => (
              <tr key={f.id} className="ap-row">
                <td className="ap-td ap-name" style={{ cursor: "pointer" }} onClick={() => navigate(`/issues/${f.id}`)}>
                  {f.title}
                </td>
                <td className="ap-td">
                  <span className="ap-status" style={{ background: SEVERITY_BG[f.finding_severity] || "#f3f4f6", color: SEVERITY_COLOR[f.finding_severity] || "#6b7280" }}>
                    {f.finding_severity}
                  </span>
                </td>
                <td className="ap-td">
                  <span className={`ap-pri ap-pri-${f.priority}`}>{f.priority}</span>
                </td>
                <td className="ap-td">
                  <span className={`ap-status ap-status-${f.status}`}>{f.status?.replace(/_/g, " ")}</span>
                </td>
                <td className="ap-td ap-assignee">{f.assignee_name || f.assignee_email || <span style={{ color: "#c7d2fe" }}>—</span>}</td>
                <td className="ap-td"><span style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(f.created_at)}</span></td>
                <td className="ap-td ap-actions-cell">
                  <button className="ap-btn ap-btn-edit" onClick={() => navigate(`/issues/${f.id}`)}>Open</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showCreate && (
        <FindingFormModal users={users} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}
