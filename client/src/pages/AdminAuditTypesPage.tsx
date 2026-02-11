import { useState, useEffect, type FormEvent } from "react";
import api from "../api/client";

interface ChecklistSettings {
  required: boolean;
  default_checklists: string[];
  include_audit_plan: boolean;
}

interface TeamSettings {
  require_team: boolean;
  min_team_size: number;
  require_lead: boolean;
}

interface AuditType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  workflow_phases: string[];
  checklist_settings: ChecklistSettings;
  team_settings: TeamSettings;
  is_active: boolean;
  audit_count?: number;
}

interface ChecklistOption {
  id: string;
  name: string;
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return val as T;
}

const defaultChecklistSettings: ChecklistSettings = {
  required: false,
  default_checklists: [],
  include_audit_plan: true,
};

const defaultTeamSettings: TeamSettings = {
  require_team: false,
  min_team_size: 1,
  require_lead: true,
};

export default function AdminAuditTypesPage() {
  const [types, setTypes] = useState<AuditType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AuditType | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function fetchTypes() {
    const res = await api.get("/audit-types");
    setTypes(res.data.auditTypes.map((t: any) => ({
      ...t,
      workflow_phases: parseJson(t.workflow_phases, []),
      checklist_settings: parseJson(t.checklist_settings, defaultChecklistSettings),
      team_settings: parseJson(t.team_settings, defaultTeamSettings),
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
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {types.map((t) => (
            <div key={t.id} className="audit-type-card" style={{ borderTopColor: t.color, opacity: t.is_active ? 1 : 0.6 }}>
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

              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
                {t.checklist_settings?.default_checklists?.length > 0 && (
                  <span className="text-muted">
                    {t.checklist_settings.default_checklists.length} default checklist(s)
                  </span>
                )}
                {t.checklist_settings?.required && (
                  <span className="badge" style={{ fontSize: "0.7rem", background: "var(--color-primary, #667eea)", color: "#fff" }}>Checklists Required</span>
                )}
                {t.team_settings?.require_lead && (
                  <span className="badge" style={{ fontSize: "0.7rem" }}>Lead Required</span>
                )}
                {t.checklist_settings?.include_audit_plan && (
                  <span className="badge" style={{ fontSize: "0.7rem" }}>Audit Plan</span>
                )}
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
  const [phases, setPhases] = useState<string[]>(initial?.workflow_phases || ["Schedule", "Plan", "Execute", "Review", "Closeout"]);
  const [newPhase, setNewPhase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Checklist settings
  const initCS = initial?.checklist_settings || defaultChecklistSettings;
  const [checklistRequired, setChecklistRequired] = useState(initCS.required);
  const [defaultChecklists, setDefaultChecklists] = useState<string[]>(initCS.default_checklists || []);
  const [includeAuditPlan, setIncludeAuditPlan] = useState(initCS.include_audit_plan !== false);

  // Team settings
  const initTS = initial?.team_settings || defaultTeamSettings;
  const [requireTeam, setRequireTeam] = useState(initTS.require_team || false);
  const [minTeamSize, setMinTeamSize] = useState(initTS.min_team_size || 1);
  const [requireLead, setRequireLead] = useState(initTS.require_lead !== false);

  // Available checklists for multi-select
  const [availableChecklists, setAvailableChecklists] = useState<ChecklistOption[]>([]);

  useEffect(() => {
    api.get("/checklists?status=active").then((r) => {
      setAvailableChecklists(r.data.checklists.map((c: any) => ({ id: c.id, name: c.name })));
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        color,
        icon,
        workflow_phases: phases,
        checklist_settings: {
          required: checklistRequired,
          default_checklists: defaultChecklists,
          include_audit_plan: includeAuditPlan,
        },
        team_settings: {
          require_team: requireTeam,
          min_team_size: minTeamSize,
          require_lead: requireLead,
        },
      });
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

  function toggleDefaultChecklist(id: string) {
    setDefaultChecklists((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflow: "auto" }}>
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

          {/* Workflow Phases */}
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

          {/* Checklist Settings */}
          <fieldset style={{ border: "1px solid var(--color-border, #e5e7eb)", borderRadius: "8px", padding: "1rem", margin: "1rem 0" }}>
            <legend style={{ fontSize: "0.9rem", fontWeight: 600, padding: "0 0.5rem" }}>Checklist Settings</legend>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={checklistRequired} onChange={(e) => setChecklistRequired(e.target.checked)} />
                Checklists required
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={includeAuditPlan} onChange={(e) => setIncludeAuditPlan(e.target.checked)} />
                Include audit plan step
              </label>
            </div>
            {availableChecklists.length > 0 && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.85rem" }}>Default Checklists (auto-assigned on audit creation)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "150px", overflow: "auto", padding: "0.5rem", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: "6px" }}>
                  {availableChecklists.map((c) => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                      <input
                        type="checkbox"
                        checked={defaultChecklists.includes(c.id)}
                        onChange={() => toggleDefaultChecklist(c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          {/* Team Settings */}
          <fieldset style={{ border: "1px solid var(--color-border, #e5e7eb)", borderRadius: "8px", padding: "1rem", margin: "1rem 0" }}>
            <legend style={{ fontSize: "0.9rem", fontWeight: 600, padding: "0 0.5rem" }}>Team Settings</legend>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={requireLead} onChange={(e) => setRequireLead(e.target.checked)} />
                Require lead auditor
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={requireTeam} onChange={(e) => setRequireTeam(e.target.checked)} />
                Require team members
              </label>
              {requireTeam && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>Min team size:</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: "60px" }}
                  />
                </div>
              )}
            </div>
          </fieldset>

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
