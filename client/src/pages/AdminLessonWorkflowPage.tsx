import React, { useState, useEffect, useCallback } from "react";
import api from "../api/client";

interface Stage {
  id: string;
  name: string;
  description: string;
  color: string;
  position: number;
  requires_signature: boolean;
}

export default function AdminLessonWorkflowPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6b7280",
    position: 0,
    requires_signature: false,
  });
  const [error, setError] = useState("");

  const fetchStages = useCallback(async () => {
    const res = await api.get("/lesson-workflow-stages");
    setStages(res.data.stages);
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/lesson-workflow-stages", {
        ...form,
        position: stages.length,
      });
      setShowCreate(false);
      setForm({ name: "", description: "", color: "#6b7280", position: 0, requires_signature: false });
      fetchStages();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create stage");
    }
  }

  async function handleUpdate(stageId: string) {
    setError("");
    try {
      await api.patch(`/lesson-workflow-stages/${stageId}`, {
        name: form.name,
        description: form.description,
        color: form.color,
        requires_signature: form.requires_signature,
      });
      setEditingId(null);
      fetchStages();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update stage");
    }
  }

  async function handleDelete(stageId: string) {
    if (!confirm("Delete this lesson workflow stage?")) return;
    try {
      await api.delete(`/lesson-workflow-stages/${stageId}`);
      fetchStages();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete stage");
    }
  }

  async function moveStage(index: number, direction: "up" | "down") {
    const newOrder = [...stages];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    try {
      await api.put("/lesson-workflow-stages/reorder", {
        stage_ids: newOrder.map((s) => s.id),
      });
      fetchStages();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reorder");
    }
  }

  function startEdit(stage: Stage) {
    setForm({
      name: stage.name,
      description: stage.description,
      color: stage.color,
      position: stage.position,
      requires_signature: stage.requires_signature,
    });
    setEditingId(stage.id);
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Lesson Learned Workflow Stages</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
          {showCreate ? "Cancel" : "Add Stage"}
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="alw-stage-color">Color</label>
              <input
                id="alw-stage-color"
                type="color"
                value={form.color}
                aria-label="Stage color"
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.requires_signature}
                  onChange={(e) => setForm({ ...form, requires_signature: e.target.checked })}
                />{" "}
                Requires Signature
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      <div className="workflow-stages-list">
        {stages.map((stage, index) => (
          <div key={stage.id} className="workflow-stage-card">
            <div className="stage-color-bar" style={{ backgroundColor: stage.color }} />
            {editingId === stage.id ? (
              <div className="stage-edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="alw-edit-color">Color</label>
                    <input
                      id="alw-edit-color"
                      type="color"
                      value={form.color}
                      aria-label="Stage color"
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={form.requires_signature}
                    onChange={(e) => setForm({ ...form, requires_signature: e.target.checked })}
                  />{" "}
                  Requires Signature
                </label>
                <div className="form-actions">
                  <button onClick={() => handleUpdate(stage.id)} className="btn btn-primary btn-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="stage-card-content">
                <div className="stage-card-header">
                  <strong>{stage.position + 1}. {stage.name}</strong>
                  {stage.requires_signature && (
                    <span className="badge badge-priority-critical">Signature Required</span>
                  )}
                </div>
                <p className="text-muted">{stage.description}</p>
                <div className="stage-card-actions">
                  <button onClick={() => moveStage(index, "up")} className="btn btn-secondary btn-sm" disabled={index === 0}>
                    Up
                  </button>
                  <button onClick={() => moveStage(index, "down")} className="btn btn-secondary btn-sm" disabled={index === stages.length - 1}>
                    Down
                  </button>
                  <button onClick={() => startEdit(stage)} className="btn btn-secondary btn-sm">Edit</button>
                  <button onClick={() => handleDelete(stage.id)} className="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
