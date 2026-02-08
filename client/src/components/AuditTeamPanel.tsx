import { useState } from "react";
import api from "../api/client";

interface Props {
  auditId: string;
  team: any[];
  users: any[];
  onUpdate: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  lead: "#667eea",
  auditor: "#10b981",
  observer: "#9ca3af",
};

export default function AuditTeamPanel({ auditId, team, users, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("auditor");

  const teamUserIds = new Set(team.map((m: any) => m.user_id));

  async function handleAdd() {
    if (!userId) return;
    await api.post(`/audits/${auditId}/team`, { user_id: userId, role });
    setShowAdd(false);
    setUserId("");
    setRole("auditor");
    onUpdate();
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    await api.delete(`/audits/${auditId}/team/${memberId}`);
    onUpdate();
  }

  function getInitials(name: string | null, email: string): string {
    if (name) {
      return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  }

  return (
    <div className="detail-section">
      <div className="section-header-row">
        <h3>Team <span className="section-count-badge">{team.length}</span></h3>
        <button className="btn btn-secondary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add Member"}
        </button>
      </div>

      {showAdd && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select user...</option>
            {users.filter((u: any) => !teamUserIds.has(u.id)).map((u: any) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="lead">Lead</option>
            <option value="auditor">Auditor</option>
            <option value="observer">Observer</option>
          </select>
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
        </div>
      )}

      {team.length > 0 ? (
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {team.map((m: any) => (
            <div key={m.id} style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
              <div className="comment-avatar">{getInitials(m.user_name, m.user_email)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{m.user_name || m.user_email}</div>
                <span className="badge" style={{ background: ROLE_COLORS[m.role], color: "#fff", fontSize: "0.75rem" }}>
                  {m.role}
                </span>
              </div>
              <button className="btn-icon btn-danger-icon" onClick={() => handleRemove(m.id)} title="Remove">&times;</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">No team members assigned.</p>
      )}
    </div>
  );
}
