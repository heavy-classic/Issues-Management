import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import LessonFormModal from "../components/LessonFormModal";
import LessonLinkedIssuesPanel from "../components/LessonLinkedIssuesPanel";
import LessonCommentThread from "../components/LessonCommentThread";
import AttachmentList from "../components/AttachmentList";
import FileUploadModal from "../components/FileUploadModal";
import HistoryPanel from "../components/HistoryPanel";

const TYPE_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  improvement: "#3b82f6",
};

const IMPACT_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af", identified: "#3b82f6", under_review: "#8b5cf6",
  approved: "#06b6d4", in_implementation: "#f59e0b", implemented: "#10b981",
  validated: "#059669", archived: "#6b7280", closed: "#374151",
};

interface User { id: string; full_name: string | null; email: string; }

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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function TextBlock({ label, content }: { label: string; content: string | null | undefined }) {
  if (!content) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="bento-team-k" style={{ marginBottom: 6 }}>{label}</div>
      <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{content}</p>
    </div>
  );
}

export default function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [linkedIssues, setLinkedIssues] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<{ currentStageId: string | null; assignments: StageAssignment[] } | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLesson = useCallback(async () => {
    const res = await api.get(`/lessons/${id}`);
    setLesson(res.data.lesson);
    setLoading(false);
  }, [id]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/lessons/${id}/comments`);
      setComments(res.data.comments || []);
    } catch { /* ignore */ }
  }, [id]);

  const fetchRelated = useCallback(async () => {
    const [iRes, wRes, aRes] = await Promise.all([
      api.get(`/lessons/${id}/issues`),
      api.get(`/lesson-workflow/lessons/${id}`),
      api.get(`/lessons/${id}/attachments`),
    ]);
    setLinkedIssues(iRes.data.issues);
    setWorkflow(wRes.data);
    setAttachments(aRes.data.attachments);
  }, [id]);

  useEffect(() => {
    fetchLesson();
    fetchRelated();
    fetchComments();
    api.get("/users").then((res) => setUsers(res.data.users));
  }, [fetchLesson, fetchRelated, fetchComments]);

  async function handleUpdate(data: any) {
    await api.put(`/lessons/${id}`, data);
    setShowEdit(false);
    fetchLesson();
  }

  async function handleStatusChange(newStatus: string) {
    const data: any = { status: newStatus };
    if (newStatus === "closed" || newStatus === "archived") data.closure_date = new Date().toISOString().split("T")[0];
    await api.put(`/lessons/${id}`, data);
    fetchLesson();
  }

  async function handleDelete() {
    if (!confirm("Delete this lesson?")) return;
    await api.delete(`/lessons/${id}`);
    navigate("/lessons");
  }

  async function handleTransition(targetStageId: string) {
    try {
      await api.post(`/lesson-workflow/lessons/${id}/transition`, { target_stage_id: targetStageId });
      fetchLesson();
      fetchRelated();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to transition");
    }
  }

  function handleRefresh() {
    fetchLesson();
    fetchRelated();
    fetchComments();
  }

  if (loading) return <p className="loading">Loading…</p>;
  if (!lesson) return <p>Lesson not found.</p>;

  const typeColor = TYPE_COLORS[lesson.lesson_type] || "#9ca3af";
  const impactColor = IMPACT_COLORS[lesson.impact_level] || "#9ca3af";

  return (
    <>
      <div className="bento-layout-wrap">
        <div className="bento-area">
          <div className="bento">

            {/* ── Header tile ── */}
            <div className="tile t-header">
              <div className="bento-header-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rec-type">
                    <div className="rec-type-dot" style={{ background: typeColor }} />
                    Lesson Learned
                    {lesson.lesson_type && (
                      <span style={{ background: typeColor + "20", color: typeColor, padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}>
                        {lesson.lesson_type}
                      </span>
                    )}
                  </div>
                  <div className="rec-title">{lesson.lesson_number ? `${lesson.lesson_number}: ` : ""}{lesson.title}</div>
                </div>
                <div className="bento-header-actions">
                  <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>✏ Edit</button>
                  <button className="btn btn-secondary" onClick={() => setShowUpload(true)}>📎 Attach</button>
                  <button className="btn btn-secondary" onClick={() => setShowHistory((v) => !v)}>🕐 History</button>
                  <button className="btn btn-secondary" onClick={async () => {
                    try {
                      const { exportLessonPDF } = await import("../utils/exportUtils");
                      exportLessonPDF({ lesson, comments: [] });
                    } catch(e) { console.error(e); }
                  }}>⬇ Export PDF</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                  <select
                    value={lesson.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e0e7ff", fontSize: 12, background: "#fff", color: "#1e1b4b" }}
                  >
                    {["draft", "identified", "under_review", "approved", "in_implementation", "implemented", "validated", "archived", "closed"].map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                  {lesson.status !== "validated" && lesson.status !== "closed" && lesson.status !== "archived" && (
                    <button
                      className="btn-submit"
                      style={{ background: "#10b981", borderColor: "#10b981", boxShadow: "0 3px 14px rgba(16,185,129,.4)" }}
                      onClick={() => handleStatusChange("validated")}
                    >
                      Publish →
                    </button>
                  )}
                </div>
              </div>

              {/* Meta strip */}
              <div className="meta-strip">
                <div className="ms-item">
                  <div className="ms-status-dot" style={{ background: STATUS_COLORS[lesson.status] || "#9ca3af" }} />
                  <strong>{lesson.status.replace(/_/g, " ")}</strong>
                </div>
                {lesson.impact_level && (
                  <div className="ms-item" style={{ color: impactColor, fontWeight: 600 }}>
                    ⚡ {lesson.impact_level} impact
                  </div>
                )}
                {lesson.category && <div className="ms-item">🏷 {lesson.category}</div>}
                {lesson.root_cause_category && <div className="ms-item">🔍 {lesson.root_cause_category}</div>}
                <div className="ms-item">👤 {lesson.owner_name || lesson.owner_email || "No owner"}</div>
                {lesson.identified_date && <div className="ms-item">📅 {fmtDate(lesson.identified_date)}</div>}
              </div>
            </div>

            {/* ── Workflow tile ── */}
            {workflow && workflow.assignments.length > 0 && (
              <div className="tile t-workflow">
                <div className="tile-label acc">
                  Workflow Progress — {workflow.assignments.find((a) => a.stage_id === workflow?.currentStageId)?.stage_name || "Not started"}
                </div>
                <div className="bento-wf-row">
                  {workflow.assignments.map((a, idx) => {
                    const isCurrent = a.stage_id === workflow.currentStageId;
                    const isCompleted = !!a.completed_at;
                    const cls = isCompleted ? "wf-done" : isCurrent ? "wf-cur" : "";
                    return (
                      <div
                        key={a.id}
                        className={`bento-wf-step ${cls}`}
                        onClick={() => !isCurrent && !isCompleted && handleTransition(a.stage_id)}
                        style={{ cursor: isCurrent || isCompleted ? "default" : "pointer" }}
                      >
                        <div className="bento-wf-icon" style={isCurrent ? { background: a.stage_color, color: "#fff", boxShadow: `0 0 0 4px ${a.stage_color}30, 0 4px 14px ${a.stage_color}60` } : {}}>
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <div className="bento-wf-name">{a.stage_name}</div>
                        <div className="bento-wf-sub">
                          {isCompleted ? "Completed" : isCurrent ? "Current" : "Pending"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Description / What happened tile ── */}
            <div className="tile t-desc">
              <div className="tile-label">Lesson Content</div>
              <TextBlock label="Description" content={lesson.description} />
              <TextBlock label="What Happened" content={lesson.what_happened} />
              <TextBlock label="Root Cause" content={lesson.root_cause} />
              <TextBlock label="Recommendation" content={lesson.recommendation} />
              {!lesson.description && !lesson.what_happened && !lesson.root_cause && !lesson.recommendation && (
                <p style={{ color: "#a5b4fc", fontSize: 13 }}>No content recorded yet.</p>
              )}
            </div>

            {/* ── Details tile ── */}
            <div className="tile t-team">
              <div className="tile-label">Details</div>
              <div className="bento-team-row">
                <div className="bento-team-k">Owner</div>
                <div className="bento-team-v">
                  {lesson.owner_email ? (
                    <>
                      <div className="bento-av">{(lesson.owner_name || lesson.owner_email).charAt(0).toUpperCase()}</div>
                      {lesson.owner_name || lesson.owner_email}
                    </>
                  ) : <span style={{ color: "#a5b4fc" }}>Unassigned</span>}
                </div>
              </div>
              {lesson.reviewer_email && (
                <div className="bento-team-row">
                  <div className="bento-team-k">Reviewer</div>
                  <div className="bento-team-v">
                    <div className="bento-av" style={{ background: "#3b82f6" }}>
                      {(lesson.reviewer_name || lesson.reviewer_email).charAt(0).toUpperCase()}
                    </div>
                    {lesson.reviewer_name || lesson.reviewer_email}
                  </div>
                </div>
              )}
              <div className="bento-team-row">
                <div className="bento-team-k">Category</div>
                <div className="bento-team-v">{lesson.category || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Type</div>
                <div className="bento-team-v" style={{ color: typeColor, fontWeight: 600, textTransform: "capitalize" }}>
                  {lesson.lesson_type || "—"}
                </div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Impact</div>
                <div className="bento-team-v" style={{ color: impactColor, fontWeight: 600, textTransform: "capitalize" }}>
                  {lesson.impact_level || "—"}
                </div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Root Cause</div>
                <div className="bento-team-v">{lesson.root_cause_category || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Effectiveness</div>
                <div className="bento-team-v" style={{ textTransform: "capitalize" }}>
                  {lesson.effectiveness_rating?.replace(/_/g, " ") || "Not rated"}
                </div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Identified</div>
                <div className="bento-team-v">{fmtDate(lesson.identified_date)}</div>
              </div>
            </div>

            {/* ── Actions tile (preventive / corrective) ── */}
            {(lesson.preventive_action || lesson.corrective_action || lesson.outcome) && (
              <div className="tile t-actions">
                <div className="tile-label">Actions & Outcome</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {lesson.preventive_action && (
                    <div>
                      <div className="bento-team-k" style={{ marginBottom: 6 }}>Preventive Action</div>
                      <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lesson.preventive_action}</p>
                    </div>
                  )}
                  {lesson.corrective_action && (
                    <div>
                      <div className="bento-team-k" style={{ marginBottom: 6 }}>Corrective Action</div>
                      <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lesson.corrective_action}</p>
                    </div>
                  )}
                  {lesson.outcome && (
                    <div>
                      <div className="bento-team-k" style={{ marginBottom: 6 }}>Outcome</div>
                      <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lesson.outcome}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Linked Issues tile ── */}
            <div className="tile t-comments">
              <LessonLinkedIssuesPanel lessonId={id!} issues={linkedIssues} onRefresh={handleRefresh} />
            </div>

            {/* ── Attachments tile ── */}
            <div className="tile t-attach">
              <div className="tile-label">Attachments</div>
              {attachments.length > 0 ? (
                <AttachmentList
                  parentId={id!}
                  parentType="lesson"
                  attachments={attachments}
                  onUpdate={handleRefresh}
                />
              ) : (
                <div className="bento-attach-zone" onClick={() => setShowUpload(true)}>
                  <div style={{ fontSize: 28 }}>📎</div>
                  <div>No attachments</div>
                  <div style={{ fontSize: 11, color: "#c7d2fe" }}>Click to upload</div>
                </div>
              )}
            </div>

            {/* ── Comments tile ── */}
            <div className="tile t-comments">
              <LessonCommentThread lessonId={id!} comments={comments} onUpdate={fetchComments} />
            </div>

            {/* ── History tile ── */}
            {showHistory && (
              <div className="tile" style={{ gridColumn: "span 12" }}>
                <div className="tile-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🕐 Change History</span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)" }} onClick={() => setShowHistory(false)}>×</button>
                </div>
                <HistoryPanel parentType="lessons" parentId={id!} />
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
                <span className="hl" style={{ textTransform: "capitalize" }}>{lesson.lesson_type || "Lesson"}</span> lesson{" "}
                <span className="hl">{lesson.title}</span> is{" "}
                <span className="hl">{lesson.status.replace(/_/g, " ")}</span>
                {lesson.impact_level && <> with <span className="hl">{lesson.impact_level} impact</span></>}
                . Owner: <span className="hl">{lesson.owner_name || lesson.owner_email || "unassigned"}</span>
                {linkedIssues.length > 0 && <>. Linked to <span className="hl">{linkedIssues.length} issue{linkedIssues.length !== 1 ? "s" : ""}</span></>}
                .
              </div>
            </div>

            {/* Suggested Next Steps */}
            <div className="ai-card">
              <div className="ai-card-hd">
                <div className="ai-card-ico">✨</div>
                <div className="ai-card-ttl">Suggested Next Steps</div>
              </div>
              {lesson.status === "draft" && (
                <div className="ai-sug">
                  <div className="ai-sug-n">1</div>
                  <div className="ai-sug-t">
                    <strong>Submit for review</strong>
                    Draft lesson — move to under review when ready.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {lesson.status === "under_review" && (
                <div className="ai-sug">
                  <div className="ai-sug-n">1</div>
                  <div className="ai-sug-t">
                    <strong>Approve or revise</strong>
                    Awaiting review decision — approve to proceed.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {lesson.status === "implemented" && (
                <div className="ai-sug">
                  <div className="ai-sug-n">1</div>
                  <div className="ai-sug-t">
                    <strong>Validate effectiveness</strong>
                    Implemented — validate to confirm it worked.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {!lesson.recommendation && (
                <div className="ai-sug">
                  <div className="ai-sug-n">2</div>
                  <div className="ai-sug-t">
                    <strong>Add a recommendation</strong>
                    No recommendation recorded — capture the key takeaway.
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
              {(lesson.impact_level === "critical" || lesson.impact_level === "high") && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: impactColor }} />
                  <div className="ai-risk-txt">{lesson.impact_level} impact — ensure actions are tracked</div>
                  <div className="ai-risk-lvl" style={{ color: impactColor }}>High</div>
                </div>
              )}
              {!lesson.owner_email && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#f59e0b" }} />
                  <div className="ai-risk-txt">No owner — lesson may not be acted on</div>
                  <div className="ai-risk-lvl" style={{ color: "#f59e0b" }}>Med</div>
                </div>
              )}
              {lesson.impact_level !== "critical" && lesson.impact_level !== "high" && lesson.owner_email && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#818cf8" }} />
                  <div className="ai-risk-txt">No significant risks detected</div>
                  <div className="ai-risk-lvl" style={{ color: "#818cf8" }}>Low</div>
                </div>
              )}
            </div>
          </div>

          {/* AI input */}
          <div className="ai-in">
            <div className="ai-in-row">
              <input className="ai-input" placeholder="Ask AI about this lesson… (coming soon)" disabled />
              <div className="ai-send-btn ai-send-disabled">↑</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <LessonFormModal
          users={users}
          initial={lesson}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showUpload && (
        <FileUploadModal
          parentId={id!}
          parentType="lesson"
          onComplete={() => {
            setShowUpload(false);
            handleRefresh();
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}
    </>
  );
}
