import { useState, useEffect } from "react";
import api from "../api/client";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
}

export default function AdminRiskCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#667eea");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  async function fetchCategories() {
    const res = await api.get("/risk-categories");
    setCategories(res.data.categories);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  function openCreate() {
    setEditId(null);
    setName("");
    setDescription("");
    setColor("#667eea");
    setIcon("");
    setSortOrder(0);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setColor(cat.color || "#667eea");
    setIcon(cat.icon || "");
    setSortOrder(cat.sort_order);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    try {
      const data = { name, description, color, icon, sort_order: sortOrder };
      if (editId) {
        await api.put(`/risk-categories/${editId}`, data);
      } else {
        await api.post("/risk-categories", data);
      }
      setShowForm(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save category");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      await api.delete(`/risk-categories/${id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete category");
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Risk Categories</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Category</button>
      </div>

      {loading ? <p>Loading...</p> : categories.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>No categories yet.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Color</th>
                <th>Name</th>
                <th>Description</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: c.color || "#9ca3af" }} />
                  </td>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.description || "-"}</td>
                  <td>{c.sort_order}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button className="btn-icon" onClick={() => openEdit(c)} title="Edit">&#9998;</button>
                      <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(c.id)} title="Delete">&times;</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Category" : "New Category"}</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="arc-color">Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input id="arc-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, height: 32, padding: 0, border: "none" }} aria-label="Category color (color picker)" />
                  <input id="arc-color-hex" type="text" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 100 }} maxLength={7} aria-label="Category color (hex value)" />
                </div>
              </div>
              <div className="form-group">
                <label>Icon</label>
                <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g., shield, chart" maxLength={50} />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
