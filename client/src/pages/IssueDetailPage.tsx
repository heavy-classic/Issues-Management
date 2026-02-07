import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import CommentThread from "../components/CommentThread";

interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  reporter_id: string;
  reporter_email: string;
  reporter_name: string | null;
  assignee_id: string | null;
  assignee_email: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  issue_id: string;
  author_id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    status: "",
    priority: "",
    assignee_id: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchIssue = useCallback(async () => {
    try {
      const res = await api.get(`/issues/${id}`);
      setIssue(res.data.issue);
    } catch {
      setError("Issue not found");
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
    api.get("/users").then((res) => setUsers(res.data.users));
  }, [fetchIssue]);

  function startEditing() {
    if (!issue) return;
    setEditData({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      assignee_id: issue.assignee_id || "",
    });
    setEditing(true);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/issues/${id}`, {
        title: editData.title,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        assignee_id: editData.assignee_id || null,
      });
      setEditing(false);
      fetchIssue();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update issue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this issue?")) return;
    try {
      await api.delete(`/issues/${id}`);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete issue");
    }
  }

  if (error && !issue) {
    return <p className="error">{error}</p>;
  }
  if (!issue) {
    return <p>Loading...</p>;
  }

  const isReporter = user?.userId === issue.reporter_id;

  return (
    <div className="issue-detail">
      {error && <p className="error">{error}</p>}

      {editing ? (
        <div className="issue-edit">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              rows={6}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={editData.status}
                onChange={(e) =>
                  setEditData({ ...editData, status: e.target.value })
                }
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={editData.priority}
                onChange={(e) =>
                  setEditData({ ...editData, priority: e.target.value })
                }
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
                value={editData.assignee_id}
                onChange={(e) =>
                  setEditData({ ...editData, assignee_id: e.target.value })
                }
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="issue-header">
            <h1>{issue.title}</h1>
            <div className="issue-actions">
              <button onClick={startEditing} className="btn btn-secondary">
                Edit
              </button>
              {isReporter && (
                <button onClick={handleDelete} className="btn btn-danger">
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="issue-meta">
            <span className={`badge badge-status-${issue.status}`}>
              {issue.status.replace("_", " ")}
            </span>
            <span className={`badge badge-priority-${issue.priority}`}>
              {issue.priority}
            </span>
          </div>

          <div className="issue-info">
            <p>
              <strong>Reporter:</strong>{" "}
              {issue.reporter_name || issue.reporter_email}
            </p>
            <p>
              <strong>Assignee:</strong>{" "}
              {issue.assignee_name ||
                issue.assignee_email ||
                "Unassigned"}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {new Date(issue.created_at).toLocaleString()}
            </p>
            <p>
              <strong>Updated:</strong>{" "}
              {new Date(issue.updated_at).toLocaleString()}
            </p>
          </div>

          {issue.description && (
            <div className="issue-description">
              <h3>Description</h3>
              <p>{issue.description}</p>
            </div>
          )}
        </>
      )}

      <CommentThread
        issueId={issue.id}
        comments={issue.comments}
        onUpdate={fetchIssue}
      />
    </div>
  );
}
