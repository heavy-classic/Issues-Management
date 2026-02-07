import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import CommentThread from "../components/CommentThread";
import SignatureDialog from "../components/SignatureDialog";
import SignatureDisplay from "../components/SignatureDisplay";
import AuditHistoryModal from "../components/AuditHistoryModal";
import ActionCard from "../components/ActionCard";
import ActionFormModal from "../components/ActionFormModal";
import { exportIssuePDF } from "../utils/exportUtils";

interface StageAssignment {
  id: string;
  stage_id: string;
  stage_name: string;
  stage_color: string;
  stage_position: number;
  requires_signature: boolean;
  user_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  completed_at: string | null;
}

interface Signature {
  id: string;
  workflow_stage_id: string;
  user_id: string;
  signer_full_name: string;
  signature_meaning: string;
  signature_timestamp: string;
  signature_reason: string | null;
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
  current_stage_id: string | null;
  stage_name: string | null;
  stage_color: string | null;
  created_at: string;
  updated_at: string;
  comments: Comment[];
  stageAssignments: StageAssignment[];
  signatures: Signature[];
  actions: ActionItem[];
}

interface ActionItem {
  id: string;
  issue_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  creator_name: string | null;
  creator_email: string | null;
  due_date: string | null;
  completed_at: string | null;
  attachment_count: number;
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
  const [signingStage, setSigningStage] = useState<StageAssignment | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    signerName: string;
  } | null>(null);

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

  async function handleVerifySignature(signatureId: string) {
    try {
      const res = await api.get(`/signatures/${signatureId}/verify`);
      setVerifyResult({
        valid: res.data.valid,
        signerName: res.data.signature.signer_full_name,
      });
      setTimeout(() => setVerifyResult(null), 5000);
    } catch {
      alert("Failed to verify signature");
    }
  }

  if (error && !issue) {
    return <p className="error">{error}</p>;
  }
  if (!issue) {
    return <p>Loading...</p>;
  }

  const isReporter = user?.userId === issue.reporter_id;
  const stageSignatures = (stageId: string) =>
    issue.signatures.filter((s) => s.workflow_stage_id === stageId);

  return (
    <div className="issue-detail">
      {error && <p className="error">{error}</p>}

      {verifyResult && (
        <div className={`verify-banner ${verifyResult.valid ? "verify-valid" : "verify-invalid"}`}>
          Signature by {verifyResult.signerName}:{" "}
          {verifyResult.valid ? "VALID - Hash verified" : "INVALID - Hash mismatch"}
        </div>
      )}

      {editing ? (
        <div className="issue-edit">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows={6}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
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
                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
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
                onChange={(e) => setEditData({ ...editData, assignee_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="issue-header">
            <h1>{issue.title}</h1>
            <div className="issue-actions">
              <button
                onClick={async () => {
                  try {
                    const res = await api.get(`/exports/issues/${id}`);
                    exportIssuePDF(res.data);
                  } catch {
                    alert("Failed to export PDF");
                  }
                }}
                className="btn btn-secondary"
              >
                Export PDF
              </button>
              <button onClick={() => setShowAudit(true)} className="btn btn-secondary">
                History
              </button>
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
            {issue.stage_name && (
              <span
                className="badge"
                style={{
                  backgroundColor: (issue.stage_color || "#6b7280") + "20",
                  color: issue.stage_color || "#6b7280",
                }}
              >
                {issue.stage_name}
              </span>
            )}
          </div>

          <div className="issue-info">
            <p><strong>Reporter:</strong> {issue.reporter_name || issue.reporter_email}</p>
            <p><strong>Assignee:</strong> {issue.assignee_name || issue.assignee_email || "Unassigned"}</p>
            <p><strong>Created:</strong> {new Date(issue.created_at).toLocaleString()}</p>
            <p><strong>Updated:</strong> {new Date(issue.updated_at).toLocaleString()}</p>
          </div>

          {issue.description && (
            <div className="issue-description">
              <h3>Description</h3>
              <p>{issue.description}</p>
            </div>
          )}

          {/* Workflow Stage Progress */}
          {issue.stageAssignments.length > 0 && (
            <div className="stage-progress">
              <h3>Workflow Progress</h3>
              <div className="stage-progress-bar">
                {issue.stageAssignments.map((sa) => {
                  const isCurrent = sa.stage_id === issue.current_stage_id;
                  const isComplete = !!sa.completed_at;
                  const sigs = stageSignatures(sa.stage_id);
                  const hasSig = sigs.length > 0;

                  return (
                    <div
                      key={sa.id}
                      className={`stage-step ${isCurrent ? "stage-current" : ""} ${isComplete ? "stage-complete" : ""}`}
                      style={{ borderColor: sa.stage_color }}
                    >
                      <div className="stage-step-header">
                        <span
                          className="stage-step-dot"
                          style={{
                            backgroundColor: isCurrent
                              ? sa.stage_color
                              : isComplete
                                ? "#10b981"
                                : "#d1d5db",
                          }}
                        />
                        <span className="stage-step-name">{sa.stage_name}</span>
                        {sa.requires_signature && (
                          <span
                            className={`stage-sig-indicator ${hasSig ? "signed" : "unsigned"}`}
                            title={hasSig ? "Signed" : "Signature required"}
                          >
                            S
                          </span>
                        )}
                      </div>

                      {/* Show signatures for this stage */}
                      {sigs.map((sig) => (
                        <SignatureDisplay
                          key={sig.id}
                          signature={sig}
                          onVerify={handleVerifySignature}
                        />
                      ))}

                      {/* Show Sign button if current stage requires signature and user hasn't signed */}
                      {isCurrent &&
                        sa.requires_signature &&
                        !sigs.some((s) => s.user_id === user?.userId) && (
                          <button
                            onClick={() => setSigningStage(sa)}
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: "0.5rem" }}
                          >
                            Sign Stage
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Plan */}
      {!editing && (
        <div className="action-plan-section">
          <div className="action-plan-header">
            <h3>Action Plan ({issue.actions?.length || 0})</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingAction(null);
                setShowActionForm(true);
              }}
            >
              + Add Action
            </button>
          </div>
          {issue.actions && issue.actions.length > 0 ? (
            <div className="action-cards-grid">
              {issue.actions.map((a) => (
                <ActionCard
                  key={a.id}
                  action={a}
                  onEdit={(action) => {
                    setEditingAction(action);
                    setShowActionForm(true);
                  }}
                  onDelete={async (actionId) => {
                    if (!confirm("Delete this action?")) return;
                    try {
                      await api.delete(`/actions/${actionId}`);
                      fetchIssue();
                    } catch {
                      alert("Failed to delete action");
                    }
                  }}
                  onUpdate={fetchIssue}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted">No actions yet.</p>
          )}
        </div>
      )}

      {showActionForm && (
        <ActionFormModal
          issueId={issue.id}
          action={
            editingAction
              ? { ...editingAction, issue_id: issue.id }
              : null
          }
          onSave={() => {
            setShowActionForm(false);
            setEditingAction(null);
            fetchIssue();
          }}
          onCancel={() => {
            setShowActionForm(false);
            setEditingAction(null);
          }}
        />
      )}

      <CommentThread
        issueId={issue.id}
        comments={issue.comments}
        onUpdate={fetchIssue}
      />

      {signingStage && (
        <SignatureDialog
          issueId={issue.id}
          stageId={signingStage.stage_id}
          stageName={signingStage.stage_name}
          onComplete={() => {
            setSigningStage(null);
            fetchIssue();
          }}
          onCancel={() => setSigningStage(null)}
        />
      )}

      {showAudit && (
        <AuditHistoryModal issueId={issue.id} onClose={() => setShowAudit(false)} />
      )}
    </div>
  );
}
