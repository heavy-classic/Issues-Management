import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import FindingFormModal from "./FindingFormModal";

interface Props {
  auditId: string;
  findings: any[];
  users: any[];
  onUpdate: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  observation: "#6b7280",
  minor: "#f59e0b",
  major: "#f97316",
  critical: "#ef4444",
};

export default function FindingsPanel({ auditId, findings, users, onUpdate }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const severityCounts: Record<string, number> = {};
  for (const f of findings) {
    const sev = f.finding_severity || "observation";
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  }

  async function handleCreate(data: any) {
    await api.post(`/audits/${auditId}/findings`, data);
    setShowCreate(false);
    onUpdate();
  }

  return (
    <div className="detail-section">
      <div className="section-header-row">
        <h3>Findings <span className="section-count-badge">{findings.length}</span></h3>
        <button className="btn btn-secondary" onClick={() => setShowCreate(true)}>+ Create Finding</button>
      </div>

      {findings.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {["critical", "major", "minor", "observation"].map((sev) => (
            severityCounts[sev] ? (
              <span key={sev} className="badge" style={{ background: SEVERITY_COLORS[sev], color: "#fff" }}>
                {sev}: {severityCounts[sev]}
              </span>
            ) : null
          ))}
        </div>
      )}

      {findings.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td><Link to={`/issues/${f.id}`}>{f.title}</Link></td>
                  <td>
                    <span className="badge" style={{ background: SEVERITY_COLORS[f.finding_severity] || "#6b7280", color: "#fff" }}>
                      {f.finding_severity}
                    </span>
                  </td>
                  <td><span className={`badge badge-priority-${f.priority}`}>{f.priority}</span></td>
                  <td>{f.status.replace(/_/g, " ")}</td>
                  <td>{f.assignee_name || f.assignee_email || "Unassigned"}</td>
                  <td>{new Date(f.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">No findings recorded.</p>
      )}

      {showCreate && (
        <FindingFormModal users={users} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
