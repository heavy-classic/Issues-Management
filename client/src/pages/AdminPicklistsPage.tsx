import { useState, useEffect } from "react";
import api from "../api/client";

interface PicklistType {
  type: string;
  count: number;
}

interface PicklistValue {
  id: string;
  picklist_type: string;
  value: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  description: string | null;
}

function formatTypeName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminPicklistsPage() {
  const [types, setTypes] = useState<PicklistType[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [values, setValues] = useState<PicklistValue[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formColor, setFormColor] = useState("#667eea");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    api.get("/picklists/types").then((res) => {
      setTypes(res.data.types);
      if (res.data.types.length > 0) {
        setSelectedType(res.data.types[0].type);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    api.get(`/picklists/${selectedType}`).then((res) => {
      setValues(res.data.values);
    });
  }, [selectedType]);

  function resetForm() {
    setEditId(null);
    setFormValue("");
    setFormLabel("");
    setFormColor("#667eea");
    setFormSortOrder(0);
    setFormActive(true);
    setFormDescription("");
    setShowForm(false);
  }

  function openCreate() {
    resetForm();
    setFormSortOrder(values.length + 1);
    setShowForm(true);
  }

  function openEdit(v: PicklistValue) {
    setEditId(v.id);
    setFormValue(v.value);
    setFormLabel(v.label);
    setFormColor(v.color || "#667eea");
    setFormSortOrder(v.sort_order);
    setFormActive(v.is_active);
    setFormDescription(v.description || "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!formLabel.trim()) return;
    try {
      if (editId) {
        await api.put(`/picklists/${editId}`, {
          label: formLabel,
          color: formColor,
          sort_order: formSortOrder,
          is_active: formActive,
          description: formDescription || null,
        });
      } else {
        if (!formValue.trim()) return;
        await api.post("/picklists", {
          picklist_type: selectedType,
          value: formValue,
          label: formLabel,
          color: formColor,
          sort_order: formSortOrder,
          is_active: formActive,
          description: formDescription || null,
        });
      }
      resetForm();
      const res = await api.get(`/picklists/${selectedType}`);
      setValues(res.data.values);
      const typesRes = await api.get("/picklists/types");
      setTypes(typesRes.data.types);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this picklist value?")) return;
    try {
      await api.delete(`/picklists/${id}`);
      const res = await api.get(`/picklists/${selectedType}`);
      setValues(res.data.values);
      const typesRes = await api.get("/picklists/types");
      setTypes(typesRes.data.types);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="dashboard-header">
        <h1>Picklist Management</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem" }}>
        {/* Left panel: type list */}
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0, fontSize: "0.875rem", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Picklist Types</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {types.map((t) => (
              <button
                key={t.type}
                onClick={() => { setSelectedType(t.type); setShowForm(false); }}
                className={`btn ${selectedType === t.type ? "btn-primary" : "btn-secondary"} btn-sm`}
                style={{ textAlign: "left", justifyContent: "space-between", display: "flex" }}
              >
                <span>{formatTypeName(t.type)}</span>
                <span style={{ opacity: 0.6 }}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel: values */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>{formatTypeName(selectedType)}</h2>
            <button className="btn btn-primary" onClick={openCreate}>+ Add Value</button>
          </div>

          {values.length === 0 ? (
            <p className="text-muted">No values for this picklist type.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Value</th>
                    <th>Label</th>
                    <th>Order</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {values.map((v) => (
                    <tr key={v.id} style={{ opacity: v.is_active ? 1 : 0.5 }}>
                      <td>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: v.color || "#9ca3af" }} />
                      </td>
                      <td><code>{v.value}</code></td>
                      <td><strong>{v.label}</strong></td>
                      <td>{v.sort_order}</td>
                      <td>{v.is_active ? "Yes" : "No"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button className="btn-icon" onClick={() => openEdit(v)} title="Edit">&#9998;</button>
                          <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(v.id)} title="Delete">&times;</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showForm && (
            <div className="modal-overlay" onClick={resetForm}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editId ? "Edit Value" : "New Value"}</h2>
                  <button className="btn-icon" onClick={resetForm}>&times;</button>
                </div>
                {!editId && (
                  <div className="form-group">
                    <label>Value (key) *</label>
                    <input
                      type="text"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      placeholder="e.g., in_progress"
                      maxLength={100}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Label *</label>
                  <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} maxLength={255} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Color</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} style={{ width: 40, height: 32, padding: 0, border: "none" }} />
                      <input type="text" value={formColor} onChange={(e) => setFormColor(e.target.value)} style={{ width: 100 }} maxLength={7} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Sort Order</label>
                    <input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Active</label>
                    <select value={formActive ? "true" : "false"} onChange={(e) => setFormActive(e.target.value === "true")}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave}>{editId ? "Update" : "Create"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
