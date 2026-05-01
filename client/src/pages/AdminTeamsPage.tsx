import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
}

interface Member {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [addMemberId, setAddMemberId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("member");
  const [error, setError] = useState("");

  const fetchTeams = useCallback(async () => {
    const res = await api.get("/teams");
    setTeams(res.data.teams);
  }, []);

  useEffect(() => {
    fetchTeams();
    api.get("/users").then((res) => setUsers(res.data.users));
  }, [fetchTeams]);

  async function fetchMembers(teamId: string) {
    const res = await api.get(`/teams/${teamId}`);
    setMembers(res.data.team.members || []);
    setSelectedTeam(teamId);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/teams", form);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      fetchTeams();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create team");
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm("Delete this team?")) return;
    try {
      await api.delete(`/teams/${teamId}`);
      if (selectedTeam === teamId) setSelectedTeam(null);
      fetchTeams();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete team");
    }
  }

  async function handleAddMember() {
    if (!selectedTeam || !addMemberId) return;
    setError("");
    try {
      await api.post(`/teams/${selectedTeam}/members`, {
        user_id: addMemberId,
        role: addMemberRole,
      });
      setAddMemberId("");
      fetchMembers(selectedTeam);
      fetchTeams();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add member");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam) return;
    try {
      await api.delete(`/teams/${selectedTeam}/members/${userId}`);
      fetchMembers(selectedTeam);
      fetchTeams();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to remove member");
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Team Management</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
          {showCreate ? "Cancel" : "Create Team"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Team Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      <div className="teams-layout">
        <div className="teams-list">
          <table className="issues-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Members</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className={selectedTeam === team.id ? "selected-row" : ""}
                >
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); fetchMembers(team.id); }}>
                      {team.name}
                    </a>
                  </td>
                  <td>{team.member_count || 0}</td>
                  <td>
                    <button onClick={() => handleDeleteTeam(team.id)} className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedTeam && (
          <div className="team-members">
            <h3>Members</h3>
            <div className="member-add-row">
              <select value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)}>
                <option value="">Select user...</option>
                {users
                  .filter((u) => !members.some((m) => m.user_id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.name || u.email}</option>
                  ))}
              </select>
              <select value={addMemberRole} onChange={(e) => setAddMemberRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="lead">Lead</option>
              </select>
              <button onClick={handleAddMember} className="btn btn-primary btn-sm" disabled={!addMemberId}>
                Add
              </button>
            </div>
            <table className="issues-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.full_name || m.name || m.email}</td>
                    <td><span className="badge badge-role-user">{m.role}</span></td>
                    <td>
                      <button onClick={() => handleRemoveMember(m.user_id)} className="btn btn-danger btn-sm">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr><td colSpan={3} className="text-muted">No members yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
