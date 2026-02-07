import { useState, useEffect } from "react";
import api from "../api/client";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface ActionData {
  id?: string;
  title: string;
  description: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  issue_id: string;
}

interface Props {
  issueId: string;
  action?: ActionData | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ActionFormModal({
  issueId,
  action,
  onSave,
  onCancel,
}: Props) {
  const isEdit = !!action?.id;
  const [title, setTitle] = useState(action?.title || "");
  const [description, setDescription] = useState(action?.description || "");
  const [priority, setPriority] = useState(action?.priority || "medium");
  const [assignedTo, setAssignedTo] = useState(action?.assigned_to || "");
  const [dueDate, setDueDate] = useState(action?.due_date?.slice(0, 10) || "");
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users").then((res) => setUsers(res.data.users));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = {
        title,
        description,
        priority,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        issue_id: issueId,
      };
      if (isEdit) {
        await api.patch(`/actions/${action!.id}`, data);
      } else {
        await api.post("/actions", data);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save action");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? "Edit Action" : "New Action"}</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label>Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
