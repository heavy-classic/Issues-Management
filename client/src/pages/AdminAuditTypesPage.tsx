import { useState, useEffect, FormEvent } from "react";
import api from "../api/client";

interface AuditType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  workflow_phases: string[];
  is_active: boolean;
  audit_count?: number;
}

export default function AdminAuditTypesPage() {
  const [types, setTypes] = useState<AuditType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AuditType | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function fetchTypes() {
    const res = await api.get("/audit-types");
    setTypes(res.data.auditTypes.map((t: any) => ({
      ...t,
      workflow_phases: typeof t.workflow_phases === "string" ? JSON.parse(t.workflow_phases) : t.workflow_phases,
    })));
    setLoading(false);
  }

  useEffect(() => { fetchTypes(); }, []);

  function handleNew() {
    setEditing(null);
    setShowForm(true);
  }

  function handleEdit(t: AuditType) {
    setEditing(t);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this audit type?")) return;
    try {
      await api.delete(`/audit-types/${id}`);
      fetchTypes();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  }

  async function handleToggleActive(t: AuditType) {
    await api.patch(`/audit-types/${t.id}`, { is_active: !t.is_active });
    fetchTypes();
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Audit Configuration</h1>
        <button className="btn btn-primary" onClick={handleNew}>+ New Audit Type</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {types.map((t) => (
            <div key={t.id} style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1.25rem",
              borderTop: `4px solid ${t.color}`,
              opacity: t.is_active ? 1 : 0.6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>{t.icon}</span> {t.name}
                  </h3>
                  {!t.is_active && <span className="badge" style={{ background: "#9ca3af", color: "#fff", marginTop: "0.25rem" }}>Inactive</span>}
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button className="btn-icon" onClick={() => handleEdit(t)} title="Edit">&#9998;</button>
                  <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(t.id)} title="Delete">&times;</button>
                </div>
              </div>
              <p className="text-muted" style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>{t.description || "No description"}</p>
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>Workflow Phases:</div>
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {(t.workflow_phases || []).map((p, i) => (
                    <span key={i} className="badge" style={{ fontSize: "0.75rem" }}>{p}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button className="btn btn-secondary" style={{ fontSize: "0.8rem" }} onClick={() => handleToggleActive(t)}>
                  {t.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AuditTypeFormModal
          initial={editing}
          onSubmit={async (data) => {
            if (editing) {
              await api.patch(`/audit-types/${editing.id}`, data);
            } else {
              await api.post("/audit-types", data);
            }
            setShowForm(false);
            fetchTypes();
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function AuditTypeFormModal({
  initial, onSubmit, onClose,
}: {
  initial: AuditType | null; onSubmit: (data: any) => Promise<void>; onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || "#667eea");
  const [icon, setIcon] = useState(initial?.icon || "\u{1F50D}");
  const [phases, setPhases] = useState<string[]>(initial?.workflow_phases || ["Planning", "Fieldwork", "Review", "Closeout"]);
  const [newPhase, setNewPhase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ name, description, color, icon, workflow_phases: phases });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  function addPhase() {
    if (newPhase.trim() && !phases.includes(newPhase.trim())) {
      setPhases([...phases, newPhase.trim()]);
      setNewPhase("");
    }
  }

  function removePhase(idx: number) {
    setPhases(phases.filter((_, i) => i !== idx));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Audit Type" : "New Audit Type"}</h2>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
            </div>
            <div className="form-group" style={{ width: "80px" }}>
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: "38px", padding: "2px" }} />
            </div>
            <div className="form-group" style={{ width: "80px" }}>
              <label>Icon</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={10} />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Workflow Phases</label>
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {phases.map((p, i) => (
                <span key={i} className="badge" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  {p}
                  <button type="button" onClick={() => removePhase(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "1rem" }}>&times;</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" value={newPhase} onChange={(e) => setNewPhase(e.target.value)} placeholder="Add phase..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhase(); } }} />
              <button type="button" className="btn btn-secondary" onClick={addPhase}>Add</button>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
