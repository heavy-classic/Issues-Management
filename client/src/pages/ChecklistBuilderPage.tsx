import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function ChecklistBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchChecklist() {
    const res = await api.get(`/checklists/${id}`);
    setChecklist(res.data.checklist);
    setLoading(false);
  }

  useEffect(() => { fetchChecklist(); }, [id]);

  async function handleUpdateMeta(field: string, value: string) {
    await api.patch(`/checklists/${id}`, { [field]: value });
    fetchChecklist();
  }

  async function handleAddGroup() {
    const name = prompt("Group name:");
    if (!name) return;
    await api.post(`/checklists/${id}/groups`, { name });
    fetchChecklist();
  }

  async function handleUpdateGroup(groupId: string, name: string) {
    await api.patch(`/checklists/groups/${groupId}`, { name });
    fetchChecklist();
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm("Delete this group and all its criteria?")) return;
    await api.delete(`/checklists/groups/${groupId}`);
    fetchChecklist();
  }

  async function handleAddCriterion(groupId: string) {
    await api.post(`/checklists/groups/${groupId}/criteria`, { text: "New criterion" });
    fetchChecklist();
  }

  async function handleUpdateCriterion(criterionId: string, data: any) {
    setSaving(true);
    await api.patch(`/checklists/criteria/${criterionId}`, data);
    await fetchChecklist();
    setSaving(false);
  }

  async function handleDeleteCriterion(criterionId: string) {
    if (!confirm("Delete this criterion?")) return;
    await api.delete(`/checklists/criteria/${criterionId}`);
    fetchChecklist();
  }

  if (loading) return <p>Loading...</p>;
  if (!checklist) return <p>Checklist not found.</p>;

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 style={{ margin: 0 }}>{checklist.name}</h1>
          <span className="badge" style={{ background: checklist.status === "active" ? "#10b981" : "#9ca3af", color: "#fff", marginTop: "0.25rem" }}>
            {checklist.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            value={checklist.status}
            onChange={(e) => handleUpdateMeta("status", e.target.value)}
            style={{ padding: "0.5rem" }}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn btn-secondary" onClick={() => navigate("/admin/checklists")}>Back</button>
        </div>
      </div>

      {/* Editable meta fields */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            defaultValue={checklist.name}
            onBlur={(e) => { if (e.target.value !== checklist.name) handleUpdateMeta("name", e.target.value); }}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            rows={2}
            defaultValue={checklist.description}
            onBlur={(e) => { if (e.target.value !== checklist.description) handleUpdateMeta("description", e.target.value); }}
          />
        </div>
        <div className="form-group">
          <label>Instructions</label>
          <textarea
            rows={2}
            defaultValue={checklist.instructions}
            onBlur={(e) => { if (e.target.value !== checklist.instructions) handleUpdateMeta("instructions", e.target.value); }}
          />
        </div>
      </div>

      {/* Groups */}
      {checklist.groups?.map((group: any) => (
        <GroupSection
          key={group.id}
          group={group}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
          onAddCriterion={handleAddCriterion}
          onUpdateCriterion={handleUpdateCriterion}
          onDeleteCriterion={handleDeleteCriterion}
          saving={saving}
        />
      ))}

      <button className="btn btn-primary" onClick={handleAddGroup} style={{ marginTop: "1rem" }}>
        + Add Group
      </button>
    </div>
  );
}

function GroupSection({
  group, onUpdateGroup, onDeleteGroup, onAddCriterion, onUpdateCriterion, onDeleteCriterion, saving,
}: {
  group: any;
  onUpdateGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onAddCriterion: (groupId: string) => void;
  onUpdateCriterion: (id: string, data: any) => void;
  onDeleteCriterion: (id: string) => void;
  saving: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "1rem", overflow: "hidden" }}>
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0.75rem 1rem", background: "#f9fafb", cursor: "pointer",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{collapsed ? "\u25B6" : "\u25BC"}</span>
          <h3 style={{ margin: 0 }}>{group.name}</h3>
          <span className="section-count-badge">{group.criteria?.length || 0}</span>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
          <button className="btn-icon" onClick={() => {
            const name = prompt("Rename group:", group.name);
            if (name) onUpdateGroup(group.id, name);
          }} title="Rename">&#9998;</button>
          <button className="btn-icon btn-danger-icon" onClick={() => onDeleteGroup(group.id)} title="Delete">&times;</button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: "0.75rem 1rem" }}>
          {group.criteria?.map((criterion: any) => (
            <CriterionEditor
              key={criterion.id}
              criterion={criterion}
              onUpdate={onUpdateCriterion}
              onDelete={onDeleteCriterion}
              saving={saving}
            />
          ))}
          <button className="btn btn-secondary" onClick={() => onAddCriterion(group.id)} style={{ marginTop: "0.5rem" }}>
            + Add Criterion
          </button>
        </div>
      )}
    </div>
  );
}

function CriterionEditor({
  criterion, onUpdate, onDelete, saving,
}: {
  criterion: any; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void; saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.75rem",
      marginBottom: "0.5rem", background: "#fff",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          {criterion.criterion_id_display && (
            <span className="badge" style={{ background: "#667eea", color: "#fff", fontSize: "0.75rem" }}>{criterion.criterion_id_display}</span>
          )}
          <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{criterion.text}</span>
        </div>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <span className="badge" style={{ fontSize: "0.7rem" }}>{criterion.answer_type}</span>
          <button className="btn-icon btn-danger-icon" onClick={() => onDelete(criterion.id)} title="Delete">&times;</button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
          <div className="form-row">
            <div className="form-group" style={{ width: "100px" }}>
              <label>ID</label>
              <input type="text" defaultValue={criterion.criterion_id_display}
                onBlur={(e) => onUpdate(criterion.id, { criterion_id_display: e.target.value })} maxLength={20} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Text</label>
              <textarea rows={2} defaultValue={criterion.text}
                onBlur={(e) => onUpdate(criterion.id, { text: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Answer Type</label>
              <select defaultValue={criterion.answer_type}
                onChange={(e) => onUpdate(criterion.id, { answer_type: e.target.value })}>
                <option value="yes_no">Yes/No</option>
                <option value="yes_no_na">Yes/No/N/A</option>
                <option value="compliant">Compliant</option>
                <option value="rating_scale">Rating Scale</option>
                <option value="expectations">Expectations</option>
              </select>
            </div>
            <div className="form-group">
              <label>Risk Rating</label>
              <select defaultValue={criterion.risk_rating || ""}
                onChange={(e) => onUpdate(criterion.id, { risk_rating: e.target.value || null })}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group" style={{ width: "80px" }}>
              <label>Weight</label>
              <input type="number" step="0.1" defaultValue={criterion.weight}
                onBlur={(e) => onUpdate(criterion.id, { weight: parseFloat(e.target.value) || 1.0 })} />
            </div>
          </div>
          <div className="form-group">
            <label>Reference Citation</label>
            <input type="text" defaultValue={criterion.reference_citation}
              onBlur={(e) => onUpdate(criterion.id, { reference_citation: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Help Text</label>
            <textarea rows={1} defaultValue={criterion.help_text}
              onBlur={(e) => onUpdate(criterion.id, { help_text: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
