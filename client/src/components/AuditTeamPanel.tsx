import { useState } from "react";
import api from "../api/client";

interface Props { auditId: string; team: any[]; users: any[]; onUpdate: () => void; }

const ROLE_BG: Record<string, string> = {
  lead: "#ede9fe", auditor: "#d1fae5", observer: "#f3f4f6",
};
const ROLE_COLOR: Record<string, string> = {
  lead: "#5b21b6", auditor: "#065f46", observer: "#6b7280",
};

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return email.charAt(0).toUpperCase();
}

export default function AuditTeamPanel({ auditId, team, users, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("auditor");

  const teamUserIds = new Set(team.map((m: any) => m.user_id));

  async function handleAdd() {
    if (!userId) return;
    await api.post(`/audits/${auditId}/team`, { user_id: userId, role });
    setShowAdd(false); setUserId(""); setRole("auditor");
    onUpdate();
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    await api.delete(`/audits/${auditId}/team/${memberId}`);
    onUpdate();
  }

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Team{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {team.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => setShowAdd((v) => !v)}>+ Add</button>
      </div>

      {showAdd && (
        <div style={{ background: "#f8f7ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              style={{ flex: "2 1 160px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
              <option value="">Select member…</option>
              {users.filter((u: any) => !teamUserIds.has(u.id)).map((u: any) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              style={{ flex: "1 1 100px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
              <option value="lead">Lead</option>
              <option value="auditor">Auditor</option>
              <option value="observer">Observer</option>
            </select>
            <button className="ap-btn" style={{ background: "#e0e7ff", color: "#4f46e5" }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="ap-btn ap-btn-edit" onClick={handleAdd}>Add</button>
          </div>
        </div>
      )}

      <table className="ap-table">
        <thead>
          <tr>
            <th className="ap-th">Member</th>
            <th className="ap-th">Role</th>
            <th className="ap-th" />
          </tr>
        </thead>
        <tbody>
          {team.length === 0 ? (
            <tr><td colSpan={3} className="ap-empty">No team members assigned.</td></tr>
          ) : (
            team.map((m: any) => (
              <tr key={m.id} className="ap-row">
                <td className="ap-td">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="bento-av" style={{ width: 26, height: 26, fontSize: 11 }}>
                      {getInitials(m.user_name, m.user_email)}
                    </div>
                    <span className="ap-name" style={{ fontSize: 13 }}>{m.user_name || m.user_email}</span>
                  </div>
                </td>
                <td className="ap-td">
                  <span className="ap-status" style={{ background: ROLE_BG[m.role] || "#f3f4f6", color: ROLE_COLOR[m.role] || "#6b7280" }}>
                    {m.role}
                  </span>
                </td>
                <td className="ap-td ap-actions-cell">
                  <button className="ap-btn ap-btn-del" onClick={() => handleRemove(m.id)}>Remove</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
