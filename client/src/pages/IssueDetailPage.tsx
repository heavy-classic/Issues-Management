import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import api from "../api/client";
import CommentThread from "../components/CommentThread";
import SignatureDialog from "../components/SignatureDialog";
import SignatureDisplay from "../components/SignatureDisplay";
import AuditHistoryModal from "../components/AuditHistoryModal";
import HistoryPanel from "../components/HistoryPanel";
import ActionFormModal from "../components/ActionFormModal";
import AttachmentList from "../components/AttachmentList";
import FileUploadModal from "../components/FileUploadModal";
import DropZoneOverlay from "../components/DropZoneOverlay";
import { exportIssuePDF } from "../utils/exportUtils";
import LessonFormModal from "../components/LessonFormModal";

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

interface IssueAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_extension: string;
  file_path: string;
  uploader_name: string | null;
  uploader_email: string | null;
  uploaded_at: string;
  download_count: number;
}

interface Issue {
  id: string;
  issue_number: string | null;
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
  source: string | null;
  on_behalf_of_id: string | null;
  on_behalf_of_name: string | null;
  on_behalf_of_email: string | null;
  department: string | null;
  date_identified: string | null;
  current_stage_id: string | null;
  stage_name: string | null;
  stage_color: string | null;
  created_at: string;
  updated_at: string;
  comments: Comment[];
  stageAssignments: StageAssignment[];
  signatures: Signature[];
  actions: ActionItem[];
  attachments: IssueAttachment[];
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

interface Investigation {
  id: string;
  issue_id: string;
  type: "barrier_analysis" | "five_why" | "fishbone";
  title: string;
  status: "draft" | "complete";
  creator_name: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
}

const SOURCES = ["Internal Audit", "External Audit", "Observation", "Inspection", "Self-Identified"] as const;
const DEPARTMENTS = [
  "Engineering", "Manufacturing / Production", "Quality Assurance",
  "Supply Chain / Procurement", "Safety & Environment (EHS)", "Maintenance & Facilities",
  "Finance & Accounting", "Human Resources", "Information Technology",
  "Program Management", "Sales & Business Development", "Contracts & Legal",
];

function initials(name: string | null | undefined, email: string): string {
  if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return email.charAt(0).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    status: "",
    priority: "",
    assignee_id: "",
    source: "",
    on_behalf_of_id: "",
    department: "",
    date_identified: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingStage, setSigningStage] = useState<StageAssignment | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [showDropUpload, setShowDropUpload] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    signerName: string;
  } | null>(null);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [showNewAnalysisModal, setShowNewAnalysisModal] = useState(false);
  const [newAnalysisType, setNewAnalysisType] = useState<Investigation["type"]>("barrier_analysis");
  const [newAnalysisTitle, setNewAnalysisTitle] = useState("");
  const [creatingAnalysis, setCreatingAnalysis] = useState(false);
  const rteRef = useRef<HTMLDivElement>(null);

  const fetchIssue = useCallback(async () => {
    try {
      const res = await api.get(`/issues/${id}`);
      setIssue(res.data.issue);
    } catch {
      setError("Issue not found");
    }
  }, [id]);

  const fetchInvestigations = useCallback(async () => {
    try {
      const res = await api.get(`/issues/${id}/investigations`);
      setInvestigations(res.data.investigations || []);
    } catch {
      // silently ignore
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
    api.get("/users").then((res) => setUsers(res.data.users));
  }, [fetchIssue]);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  // Set breadcrumbs immediately on mount so UUID never appears in TopBar
  useEffect(() => {
    setBreadcrumbs([
      { label: "Home", path: "/" },
      { label: "Issues", path: "/" },
      { label: "…" },
    ]);
    return () => setBreadcrumbs([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update breadcrumbs once issue data loads
  useEffect(() => {
    if (!issue) return;
    const label = issue.issue_number || issue.title.slice(0, 40);
    setBreadcrumbs([
      { label: "Home", path: "/" },
      { label: "Issues", path: "/" },
      { label: label },
    ]);
  }, [issue, setBreadcrumbs]);

  async function handleCreateAnalysis() {
    if (!newAnalysisTitle.trim()) return;
    setCreatingAnalysis(true);
    try {
      const res = await api.post(`/issues/${id}/investigations`, {
        type: newAnalysisType,
        title: newAnalysisTitle.trim(),
      });
      setShowNewAnalysisModal(false);
      setNewAnalysisTitle("");
      setNewAnalysisType("barrier_analysis");
      navigate(`/investigations/${res.data.investigation.id}`);
    } catch {
      alert("Failed to create analysis");
    } finally {
      setCreatingAnalysis(false);
    }
  }

  async function handleAdvanceWorkflow() {
    if (!issue) return;
    const sortedStages = [...issue.stageAssignments].sort(
      (a, b) => a.stage_position - b.stage_position
    );
    const currentIdx = sortedStages.findIndex(
      (sa) => sa.stage_id === issue.current_stage_id
    );
    const nextStage = sortedStages[currentIdx + 1];
    if (!nextStage) return; // already on last stage
    try {
      await api.post(`/workflow/issues/${issue.id}/transition`, {
        target_stage_id: nextStage.stage_id,
      });
      fetchIssue();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to advance workflow");
    }
  }

  function handleSubmitClick() {
    if (!issue) return;
    const currentStage = issue.stageAssignments.find(
      (sa) => sa.stage_id === issue.current_stage_id
    );
    const alreadySigned = issue.signatures.some(
      (s) =>
        s.workflow_stage_id === issue.current_stage_id &&
        s.user_id === user?.userId
    );
    if (currentStage?.requires_signature && !alreadySigned) {
      setSigningStage(currentStage);
    } else {
      handleAdvanceWorkflow();
    }
  }

  async function handleDeleteInvestigation(invId: string) {
    if (!confirm("Delete this analysis? This cannot be undone.")) return;
    try {
      await api.delete(`/investigations/${invId}`);
      fetchInvestigations();
    } catch {
      alert("Failed to delete analysis");
    }
  }

  function startEditing() {
    if (!issue) return;
    setEditData({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      assignee_id: issue.assignee_id || "",
      source: issue.source || "",
      on_behalf_of_id: issue.on_behalf_of_id || "",
      department: issue.department || "",
      date_identified: issue.date_identified ? issue.date_identified.slice(0, 10) : "",
    });
    setEditing(true);
    // Populate RTE after state updates
    setTimeout(() => {
      if (rteRef.current) rteRef.current.innerHTML = issue.description || "";
    }, 0);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const description = rteRef.current ? rteRef.current.innerHTML : editData.description;
      await api.patch(`/issues/${id}`, {
        title: editData.title,
        description,
        status: editData.status,
        priority: editData.priority,
        assignee_id: editData.assignee_id || null,
        source: editData.source || null,
        on_behalf_of_id: editData.on_behalf_of_id || null,
        department: editData.department || null,
        date_identified: editData.date_identified || null,
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

  function rteExec(cmd: string) {
    document.execCommand(cmd, false, undefined);
    rteRef.current?.focus();
  }

  if (error && !issue) {
    return <p className="error">{error}</p>;
  }
  if (!issue) {
    return <p className="loading">Loading…</p>;
  }

  const isReporter = user?.userId === issue.reporter_id;
  const stageSignatures = (stageId: string) =>
    issue.signatures.filter((s) => s.workflow_stage_id === stageId);

  // Current stage index for workflow display
  const currentStageIdx = issue.stageAssignments.findIndex(
    (sa) => sa.stage_id === issue.current_stage_id
  );

  // AI panel summary data
  const openActions = issue.actions?.filter((a) => a.status !== "completed") || [];
  const assigneeName = issue.assignee_name || issue.assignee_email || "Unassigned";
  const reporterName = issue.reporter_name || issue.reporter_email;

  return (
    <DropZoneOverlay
      onDrop={(files) => {
        setDroppedFiles(files);
        setShowDropUpload(true);
      }}
    >
      {/* Edit form overlay */}
      {editing && (
        <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
          <div className="issue-edit">
            {error && <p className="error">{error}</p>}
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
              <div className="rte">
                <div className="rte-toolbar">
                  <button className="rte-btn" title="Bold" onMouseDown={(e) => { e.preventDefault(); rteExec("bold"); }}><b>B</b></button>
                  <button className="rte-btn" title="Italic" onMouseDown={(e) => { e.preventDefault(); rteExec("italic"); }}><i>I</i></button>
                  <button className="rte-btn" title="Underline" onMouseDown={(e) => { e.preventDefault(); rteExec("underline"); }}><u>U</u></button>
                  <div className="rte-sep" />
                  <button className="rte-btn" title="Bullets" onMouseDown={(e) => { e.preventDefault(); rteExec("insertUnorderedList"); }}>≡</button>
                  <button className="rte-btn" title="Numbered" onMouseDown={(e) => { e.preventDefault(); rteExec("insertOrderedList"); }}>①</button>
                </div>
                <div
                  ref={rteRef}
                  className="rte-content"
                  contentEditable
                  data-placeholder="Enter a description…"
                  suppressContentEditableWarning
                />
              </div>
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
                    <option key={u.id} value={u.id}>{u.full_name || u.name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Source</label>
                <select
                  value={editData.source}
                  onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                >
                  <option value="">— Select source —</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                >
                  <option value="">— Select department —</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date Identified</label>
                <input
                  type="date"
                  value={editData.date_identified}
                  onChange={(e) => setEditData({ ...editData, date_identified: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Submitted on Behalf of</label>
                <select
                  value={editData.on_behalf_of_id}
                  onChange={(e) => setEditData({ ...editData, on_behalf_of_id: e.target.value })}
                >
                  <option value="">— Self (reporter) —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={handleSave} className="btn-submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes →"}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bento detail view */}
      {!editing && (
        <div className="bento-layout-wrap">
          {/* Scrollable bento grid */}
          <div className="bento-area">
            {verifyResult && (
              <div className={`verify-banner ${verifyResult.valid ? "verify-valid" : "verify-invalid"}`}
                style={{ marginBottom: 12 }}>
                Signature by {verifyResult.signerName}:{" "}
                {verifyResult.valid ? "VALID — Hash verified" : "INVALID — Hash mismatch"}
              </div>
            )}

            <div className="bento">

              {/* ── Header tile ── */}
              <div className="tile t-header">
                <div className="bento-header-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rec-type">
                      <div className="rec-type-dot" />
                      Issue Record
                      {issue.issue_number && (
                        <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", fontWeight: 600, letterSpacing: "0.04em" }}>
                          {issue.issue_number}
                        </span>
                      )}
                    </div>
                    <div className="rec-title">{issue.title}</div>
                  </div>
                  <div className="bento-header-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const res = await api.get(`/exports/issues/${id}`);
                          exportIssuePDF(res.data);
                        } catch {
                          alert("Failed to export PDF");
                        }
                      }}
                    >
                      📤 Export PDF
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowHistoryPanel((v) => !v)}>
                      🕐 History
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowLessonForm(true)}>
                      📚 Lesson
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setDroppedFiles([]); setShowDropUpload(true); }}>
                      📎 Attach
                    </button>
                    <button className="btn btn-secondary" onClick={startEditing}>
                      ✏ Edit
                    </button>
                    {isReporter && (
                      <button className="btn btn-danger" onClick={handleDelete}>
                        Delete
                      </button>
                    )}
                    {(() => {
                      const sorted = [...issue.stageAssignments].sort(
                        (a, b) => a.stage_position - b.stage_position
                      );
                      const isLastStage =
                        sorted.length > 0 &&
                        sorted[sorted.length - 1].stage_id === issue.current_stage_id;
                      if (isLastStage || issue.stageAssignments.length === 0) return null;
                      const currentStage = issue.stageAssignments.find(
                        (sa) => sa.stage_id === issue.current_stage_id
                      );
                      const needsSig =
                        currentStage?.requires_signature &&
                        !issue.signatures.some(
                          (s) =>
                            s.workflow_stage_id === issue.current_stage_id &&
                            s.user_id === user?.userId
                        );
                      return (
                        <button className="btn-submit" onClick={handleSubmitClick}>
                          {needsSig ? "Sign & Submit →" : "Submit →"}
                        </button>
                      );
                    })()}
                  </div>
                </div>
                {/* Meta strip */}
                <div className="meta-strip">
                  <div className="ms-item">
                    <div className="ms-status-dot" style={{
                      background: issue.status === "closed" ? "#10b981"
                        : issue.status === "in_progress" ? "#f59e0b"
                        : "#4f46e5"
                    }} />
                    <strong>{issue.status.replace("_", " ")}</strong>
                  </div>
                  <div className="ms-item">
                    {issue.priority === "critical" ? "🔴"
                      : issue.priority === "high" ? "🟠"
                      : issue.priority === "medium" ? "🟡"
                      : "🔵"}{" "}
                    {issue.priority} priority
                  </div>
                  {issue.stage_name && (
                    <div className="ms-item">
                      🏷 {issue.stage_name}
                    </div>
                  )}
                  <div className="ms-item">📅 {fmtDate(issue.created_at)}</div>
                  <div className="ms-item">👤 {assigneeName}</div>
                </div>
              </div>

              {/* ── Workflow tile ── */}
              {issue.stageAssignments.length > 0 && (
                <div className="tile t-workflow">
                  <div className="tile-label acc">
                    Workflow
                    {currentStageIdx >= 0 && (
                      <> — Stage {currentStageIdx + 1} of {issue.stageAssignments.length}</>
                    )}
                  </div>
                  <div className="bento-wf-row">
                    {issue.stageAssignments.map((sa, idx) => {
                      const isCurrent = sa.stage_id === issue.current_stage_id;
                      const isComplete = !!sa.completed_at;
                      const cls = isComplete ? "wf-done" : isCurrent ? "wf-cur" : "";
                      return (
                        <React.Fragment key={sa.id}>
                          <div className={`bento-wf-step ${cls}`}>
                            <div className="bento-wf-icon">
                              {isComplete ? "✓" : idx + 1}
                            </div>
                            <div className="bento-wf-name">{sa.stage_name}</div>
                            <div className="bento-wf-sub">
                              {isComplete ? "Completed" : isCurrent ? "In progress" : "Not started"}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Signatures under workflow */}
                  {issue.stageAssignments.some((sa) => sa.requires_signature) && (
                    <div className="bento-wf-sigs">
                      {issue.stageAssignments.map((sa) => {
                        const isCurrent = sa.stage_id === issue.current_stage_id;
                        const sigs = stageSignatures(sa.stage_id);
                        if (!sa.requires_signature && sigs.length === 0) return null;
                        return (
                          <div key={sa.id} style={{ marginBottom: 8 }}>
                            {sigs.map((sig) => (
                              <SignatureDisplay
                                key={sig.id}
                                signature={sig}
                                onVerify={handleVerifySignature}
                              />
                            ))}
                            {isCurrent &&
                              sa.requires_signature &&
                              !sigs.some((s) => s.user_id === user?.userId) && (
                                <button
                                  onClick={() => setSigningStage(sa)}
                                  className="btn btn-primary btn-sm"
                                >
                                  Sign "{sa.stage_name}" Stage
                                </button>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Description tile ── */}
              <div className="tile t-desc">
                <div className="tile-label">Description</div>
                <div className="rte">
                  <div className="rte-toolbar">
                    <span style={{ fontSize: 11, color: "#a5b4fc", padding: "0 4px" }}>Read-only</span>
                  </div>
                  <div
                    className="rte-content"
                    data-placeholder="No description provided."
                    dangerouslySetInnerHTML={{ __html: issue.description || "" }}
                    style={{ minHeight: 120 }}
                  />
                </div>
              </div>

              {/* ── Details tile ── */}
              <div className="tile t-team">
                <div className="tile-label">Details</div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Reporter</div>
                  <div className="bento-team-v">
                    <div className="bento-av">{initials(issue.reporter_name, issue.reporter_email)}</div>
                    {reporterName}
                  </div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Assignee</div>
                  <div className="bento-team-v">
                    {issue.assignee_email ? (
                      <>
                        <div className="bento-av" style={{ background: "#3b82f6" }}>
                          {initials(issue.assignee_name, issue.assignee_email)}
                        </div>
                        {assigneeName}
                      </>
                    ) : (
                      <span style={{ color: "#a5b4fc" }}>Unassigned</span>
                    )}
                  </div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Status</div>
                  <div className="bento-team-v" style={{ color: "#4f46e5", fontWeight: 600 }}>
                    ● {issue.status.replace("_", " ")}
                  </div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Priority</div>
                  <div className="bento-team-v">{issue.priority}</div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Source</div>
                  <div className="bento-team-v">{issue.source || <span className="bento-team-empty">—</span>}</div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Department</div>
                  <div className="bento-team-v">{issue.department || <span className="bento-team-empty">—</span>}</div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Date Identified</div>
                  <div className="bento-team-v">{issue.date_identified ? fmtDate(issue.date_identified) : <span className="bento-team-empty">—</span>}</div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">On Behalf of</div>
                  <div className="bento-team-v">{issue.on_behalf_of_name || issue.on_behalf_of_email || <span className="bento-team-empty">—</span>}</div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Created</div>
                  <div className="bento-team-v">{fmtDate(issue.created_at)}</div>
                </div>
                <div className="bento-team-row">
                  <div className="bento-team-k">Updated</div>
                  <div className="bento-team-v">{fmtDate(issue.updated_at)}</div>
                </div>
              </div>

              {/* ── Action Plan tile ── */}
              <div className="tile t-actions">
                <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    Action Plan{" "}
                    <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
                      {issue.actions?.length || 0}
                    </span>
                  </span>
                  <button
                    className="ap-add-btn"
                    onClick={() => { setEditingAction(null); setShowActionForm(true); }}
                  >
                    + Add
                  </button>
                </div>
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th className="ap-th">Name</th>
                      <th className="ap-th">Status</th>
                      <th className="ap-th">Priority</th>
                      <th className="ap-th">Assignee</th>
                      <th className="ap-th">Due Date</th>
                      <th className="ap-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issue.actions && issue.actions.length > 0 ? (
                      issue.actions.map((a) => {
                        const isOverdue = a.due_date && a.status !== "completed" && new Date(a.due_date) < new Date();
                        return (
                          <tr key={a.id} className="ap-row">
                            <td className="ap-td ap-name">{a.title}</td>
                            <td className="ap-td">
                              <span className={`ap-status ap-status-${a.status}`}>{a.status.replace("_", " ")}</span>
                            </td>
                            <td className="ap-td">
                              <span className={`ap-pri ap-pri-${a.priority}`}>{a.priority}</span>
                            </td>
                            <td className="ap-td ap-assignee">{a.assignee_name || a.assignee_email || <span style={{ color: "#c7d2fe" }}>—</span>}</td>
                            <td className="ap-td" style={{ color: isOverdue ? "#ef4444" : undefined }}>
                              {a.due_date ? fmtDate(a.due_date) : <span style={{ color: "#c7d2fe" }}>—</span>}
                            </td>
                            <td className="ap-td ap-actions-cell">
                              <button
                                className="ap-btn ap-btn-edit"
                                onClick={() => { setEditingAction(a); setShowActionForm(true); }}
                              >Edit</button>
                              <button
                                className="ap-btn ap-btn-del"
                                onClick={async () => {
                                  if (!confirm("Delete this action?")) return;
                                  try { await api.delete(`/actions/${a.id}`); fetchIssue(); }
                                  catch { alert("Failed to delete action"); }
                                }}
                              >Delete</button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="ap-empty">No action items yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Analysis tile ── only visible once Investigation stage is reached */}
              {(() => {
                const invStageIdx = issue.stageAssignments.findIndex(
                  (sa) => sa.stage_name === "Investigation"
                );
                const isInvestigationReached =
                  invStageIdx >= 0 && currentStageIdx >= invStageIdx;
                const hasAnyInvestigations = investigations.length > 0;
                const showAnalysis = isInvestigationReached || hasAnyInvestigations;
                const isInvestigationStage =
                  issue.stageAssignments[currentStageIdx]?.stage_name === "Investigation";

                if (!showAnalysis) return null;

                const TYPE_LABELS: Record<string, string> = {
                  barrier_analysis: "Barrier Analysis",
                  five_why: "5-Why Analysis",
                  fishbone: "Fishbone",
                };

                return (
                  <div className="tile t-actions">
                    <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        Analysis{" "}
                        <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
                          {investigations.length}
                        </span>
                      </span>
                      {isInvestigationStage && (
                        <button className="ap-add-btn" onClick={() => setShowNewAnalysisModal(true)}>
                          + Create Analysis
                        </button>
                      )}
                    </div>
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th className="ap-th">Title</th>
                          <th className="ap-th">Type</th>
                          <th className="ap-th">Status</th>
                          <th className="ap-th">Created By</th>
                          <th className="ap-th">Date</th>
                          <th className="ap-th">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investigations.length > 0 ? (
                          investigations.map((inv) => (
                            <tr
                              key={inv.id}
                              className="ap-row"
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate(`/investigations/${inv.id}`)}
                            >
                              <td className="ap-td ap-name">{inv.title}</td>
                              <td className="ap-td">
                                <span style={{ fontSize: 12, color: "#a5b4fc" }}>
                                  {TYPE_LABELS[inv.type] || inv.type}
                                </span>
                              </td>
                              <td className="ap-td">
                                <span className={`ap-status ap-status-${inv.status === "complete" ? "completed" : "open"}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="ap-td ap-assignee">{inv.creator_name || <span style={{ color: "#c7d2fe" }}>—</span>}</td>
                              <td className="ap-td">{fmtDate(inv.created_at)}</td>
                              <td className="ap-td ap-actions-cell">
                                <button
                                  className="ap-btn ap-btn-edit"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/investigations/${inv.id}`); }}
                                >Open</button>
                                <button
                                  className="ap-btn ap-btn-del"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteInvestigation(inv.id); }}
                                >Delete</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="ap-empty">No analyses yet — use "Create Analysis" to start an investigation.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* ── Attachments tile ── */}
              <div className="tile t-attach">
                <div className="tile-label">Attachments</div>
                {issue.attachments && issue.attachments.length > 0 ? (
                  <AttachmentList
                    parentId={issue.id}
                    parentType="issue"
                    attachments={issue.attachments}
                    onUpdate={fetchIssue}
                  />
                ) : (
                  <div className="attach-empty">
                    <span>📎</span>
                    <span>No attachments — use the Attach button above to upload files</span>
                  </div>
                )}
              </div>

              {/* ── Comments tile ── */}
              <div className="tile t-comments">
                <div className="tile-label">Comments</div>
                <CommentThread
                  issueId={issue.id}
                  comments={issue.comments}
                  onUpdate={fetchIssue}
                />
              </div>

              {/* ── History tile ── */}
              {showHistoryPanel && (
                <div className="tile" style={{ gridColumn: "span 12" }}>
                  <div className="tile-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🕐 Change History</span>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)" }} onClick={() => setShowHistoryPanel(false)}>×</button>
                  </div>
                  <HistoryPanel parentType="issues" parentId={issue.id} />
                </div>
              )}

            </div>{/* end .bento */}
          </div>{/* end .bento-area */}

          {/* ── AI Panel ── */}
          <div className="ai-panel">
            <div className="ai-hdr">
              <div className="ai-title">
                <div className="ai-dot" />
                AI Assistant
              </div>
              <div className="ai-sub">Preview Mode · Not enabled</div>
            </div>
            <div className="ai-demo-banner">
              <div className="ai-demo-icon">🔮</div>
              <div className="ai-demo-txt">
                <strong>AI features coming soon</strong>
                This panel previews how AI-powered analysis will work. Content shown is rule-based. Live AI is disabled.
              </div>
            </div>
            <div className="ai-body">
              {/* Smart Summary */}
              <div className="ai-card">
                <div className="ai-card-hd">
                  <div className="ai-card-ico">📋</div>
                  <div className="ai-card-ttl">Smart Summary</div>
                  <div className="ai-card-bdg">Auto-generated</div>
                </div>
                <div className="ai-sum">
                  This issue is currently{" "}
                  <span className="hl">{issue.status.replace("_", " ")}</span> with{" "}
                  <span className="hl">{issue.priority} priority</span>
                  {issue.stage_name && (
                    <>, in the <span className="hl">{issue.stage_name}</span> stage</>
                  )}
                  . Assigned to <span className="hl">{assigneeName}</span>
                  {openActions.length > 0 && (
                    <>. <span className="hl">{openActions.length} open action{openActions.length !== 1 ? "s" : ""}</span> pending</>
                  )}
                  .
                </div>
              </div>

              {/* Suggested Next Steps */}
              <div className="ai-card">
                <div className="ai-card-hd">
                  <div className="ai-card-ico">✨</div>
                  <div className="ai-card-ttl">Suggested Next Steps</div>
                </div>
                {issue.assignee_id === null && (
                  <div className="ai-sug">
                    <div className="ai-sug-n">1</div>
                    <div className="ai-sug-t">
                      <strong>Assign an owner</strong>
                      No assignee set — assign someone to drive resolution.
                    </div>
                    <div className="ai-arr">›</div>
                  </div>
                )}
                {openActions.length === 0 && (
                  <div className="ai-sug">
                    <div className="ai-sug-n">{issue.assignee_id === null ? "2" : "1"}</div>
                    <div className="ai-sug-t">
                      <strong>Create an action item</strong>
                      No actions yet — break this issue into concrete tasks.
                    </div>
                    <div className="ai-arr">›</div>
                  </div>
                )}
                {issue.stageAssignments.length > 0 && currentStageIdx < issue.stageAssignments.length - 1 && (
                  <div className="ai-sug">
                    <div className="ai-sug-n">
                      {(issue.assignee_id === null ? 1 : 0) + (openActions.length === 0 ? 1 : 0) + 1}
                    </div>
                    <div className="ai-sug-t">
                      <strong>Advance the workflow</strong>
                      Ready to move to the next stage: {issue.stageAssignments[currentStageIdx + 1]?.stage_name}.
                    </div>
                    <div className="ai-arr">›</div>
                  </div>
                )}
                {issue.status !== "closed" && issue.stageAssignments.length === 0 && (
                  <div className="ai-sug">
                    <div className="ai-sug-n">1</div>
                    <div className="ai-sug-t">
                      <strong>Configure a workflow</strong>
                      No workflow stages — add one in Admin settings.
                    </div>
                    <div className="ai-arr">›</div>
                  </div>
                )}
              </div>

              {/* Risk Signals */}
              <div className="ai-card">
                <div className="ai-card-hd">
                  <div className="ai-card-ico">⚠️</div>
                  <div className="ai-card-ttl">Risk Signals</div>
                </div>
                {(issue.priority === "critical" || issue.priority === "high") && (
                  <div className="ai-risk">
                    <div className="ai-risk-dot" style={{ background: "#ef4444" }} />
                    <div className="ai-risk-txt">
                      {issue.priority === "critical" ? "Critical" : "High"} priority issue — escalation may be needed
                    </div>
                    <div className="ai-risk-lvl" style={{ color: "#ef4444" }}>High</div>
                  </div>
                )}
                {openActions.length > 2 && (
                  <div className="ai-risk">
                    <div className="ai-risk-dot" style={{ background: "#fbbf24" }} />
                    <div className="ai-risk-txt">{openActions.length} open actions — review for blockers</div>
                    <div className="ai-risk-lvl" style={{ color: "#fbbf24" }}>Med</div>
                  </div>
                )}
                {issue.assignee_id === null && (
                  <div className="ai-risk">
                    <div className="ai-risk-dot" style={{ background: "#f59e0b" }} />
                    <div className="ai-risk-txt">No assignee — issue may stall without an owner</div>
                    <div className="ai-risk-lvl" style={{ color: "#f59e0b" }}>Med</div>
                  </div>
                )}
                {issue.priority !== "critical" && issue.priority !== "high" && openActions.length <= 2 && issue.assignee_id !== null && (
                  <div className="ai-risk">
                    <div className="ai-risk-dot" style={{ background: "#818cf8" }} />
                    <div className="ai-risk-txt">No significant risks detected at this time</div>
                    <div className="ai-risk-lvl" style={{ color: "#818cf8" }}>Low</div>
                  </div>
                )}
              </div>
            </div>

            {/* AI input */}
            <div className="ai-in">
              <div className="ai-in-row">
                <input className="ai-input" placeholder="Ask AI about this issue… (coming soon)" disabled />
                <div className="ai-send-btn ai-send-disabled">↑</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
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

      {signingStage && (
        <SignatureDialog
          issueId={issue.id}
          stageId={signingStage.stage_id}
          stageName={signingStage.stage_name}
          onComplete={async () => {
            setSigningStage(null);
            await handleAdvanceWorkflow();
          }}
          onCancel={() => setSigningStage(null)}
        />
      )}

      {showAudit && (
        <AuditHistoryModal issueId={issue.id} onClose={() => setShowAudit(false)} />
      )}

      {showDropUpload && issue && (
        <FileUploadModal
          parentId={issue.id}
          parentType="issue"
          initialFiles={droppedFiles}
          onComplete={() => {
            setShowDropUpload(false);
            setDroppedFiles([]);
            fetchIssue();
          }}
          onCancel={() => {
            setShowDropUpload(false);
            setDroppedFiles([]);
          }}
        />
      )}

      {showLessonForm && issue && (
        <LessonFormModal
          users={users.map((u) => ({ id: u.id, full_name: u.name, email: u.email }))}
          fromIssueId={issue.id}
          onSubmit={async (data) => {
            await api.post("/lessons", data);
            setShowLessonForm(false);
            navigate(`/lessons`);
          }}
          onClose={() => setShowLessonForm(false)}
        />
      )}

      {/* ── Create Analysis Modal ── */}
      {showNewAnalysisModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-hdr">
              <span>Create Analysis</span>
              <button className="modal-close" onClick={() => setShowNewAnalysisModal(false)}>×</button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#a5b4fc" }}>Analysis Type</label>
                <select
                  value={newAnalysisType}
                  onChange={(e) => setNewAnalysisType(e.target.value as Investigation["type"])}
                  style={{ width: "100%" }}
                >
                  <option value="barrier_analysis">Barrier Analysis</option>
                  <option value="five_why">5-Why Analysis</option>
                  <option value="fishbone">Fishbone (Ishikawa)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#a5b4fc" }}>Title</label>
                <input
                  type="text"
                  placeholder="Brief description of what's being analyzed…"
                  value={newAnalysisTitle}
                  onChange={(e) => setNewAnalysisTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateAnalysis(); }}
                  autoFocus
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setShowNewAnalysisModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={handleCreateAnalysis}
                  disabled={creatingAnalysis || !newAnalysisTitle.trim()}
                >
                  {creatingAnalysis ? "Creating…" : "Create & Open →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DropZoneOverlay>
  );
}
