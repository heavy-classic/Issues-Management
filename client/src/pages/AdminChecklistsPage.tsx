import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

interface Checklist {
  id: string;
  name: string;
  description: string;
  status: string;
  version: number;
  group_count: number;
  criteria_count: number;
  creator_name: string | null;
  creator_email: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  active: "#10b981",
  archived: "#6b7280",
};

export default function AdminChecklistsPage() {
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function fetchChecklists() {
    const res = await api.get("/checklists");
    setChecklists(res.data.checklists);
    setLoading(false);
  }

  useEffect(() => { fetchChecklists(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    const res = await api.post("/checklists", { name, description });
    setShowCreate(false);
    setName("");
    setDescription("");
    navigate(`/admin/checklists/${res.data.checklist.id}`);
  }

  async function handleClone(id: string) {
    const res = await api.post(`/checklists/${id}/clone`);
    navigate(`/admin/checklists/${res.data.checklist.id}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this checklist?")) return;
    try {
      await api.delete(`/checklists/${id}`);
      fetchChecklists();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Checklists</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Checklist</button>
      </div>

      {loading ? <p>Loading...</p> : checklists.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>No checklists yet.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Groups</th>
                <th>Criteria</th>
                <th>Version</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {checklists.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/admin/checklists/${c.id}`)}
                      style={{ fontWeight: 500, textDecoration: "underline", color: "#667eea" }}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td>
                    <span className="badge" style={{ background: STATUS_COLORS[c.status], color: "#fff" }}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.group_count}</td>
                  <td>{c.criteria_count}</td>
                  <td>v{c.version}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button className="btn-icon" onClick={() => navigate(`/admin/checklists/${c.id}`)} title="Edit">&#9998;</button>
                      <button className="btn-icon" onClick={() => handleClone(c.id)} title="Clone">&#128203;</button>
                      <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(c.id)} title="Delete">&times;</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Checklist</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create & Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
