import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import LessonFormModal from "../components/LessonFormModal";
import LessonLinkedIssuesPanel from "../components/LessonLinkedIssuesPanel";
import LessonCommentThread from "../components/LessonCommentThread";
import AttachmentList from "../components/AttachmentList";
import FileUploadModal from "../components/FileUploadModal";

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

const EFFECTIVENESS_COLORS: Record<string, string> = {
  not_rated: "#9ca3af",
  ineffective: "#ef4444",
  partially_effective: "#f59e0b",
  effective: "#10b981",
  highly_effective: "#059669",
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

export default function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [linkedIssues, setLinkedIssues] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<{ currentStageId: string | null; assignments: StageAssignment[] } | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLesson = useCallback(async () => {
    const res = await api.get(`/lessons/${id}`);
    setLesson(res.data.lesson);
    setLoading(false);
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
    api.get("/users").then((res) => setUsers(res.data.users));
  }, [fetchLesson, fetchRelated]);

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
  }

  if (loading) return <p>Loading...</p>;
  if (!lesson) return <p>Lesson not found.</p>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <button className="btn-icon" onClick={() => navigate("/lessons")} style={{ marginBottom: "0.5rem" }}>
            &larr; Back to Lessons Learned
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ margin: 0 }}>{lesson.lesson_number}: {lesson.title}</h1>
            <span className="badge" style={{ background: TYPE_COLORS[lesson.lesson_type] || "#9ca3af", color: "#fff", fontSize: "0.85rem" }}>
              {lesson.lesson_type}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-secondary" onClick={() => setShowUpload(true)}>Attach</button>
          <button className="btn btn-secondary btn-danger-icon" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Status Change */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ fontWeight: 600, marginRight: "0.5rem" }}>Status:</label>
        <select
          value={lesson.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{ padding: "0.25rem 0.5rem", borderRadius: 4, border: "1px solid var(--color-border)" }}
        >
          {["draft", "identified", "under_review", "approved", "in_implementation", "implemented", "validated", "archived", "closed"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Workflow Stepper */}
      {workflow && workflow.assignments.length > 0 && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Workflow Progress</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {workflow.assignments.map((a) => {
              const isCurrent = a.stage_id === workflow.currentStageId;
              const isCompleted = !!a.completed_at;
              return (
                <div
                  key={a.id}
                  onClick={() => !isCurrent && handleTransition(a.stage_id)}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: "0.5rem",
                    borderRadius: 8,
                    border: isCurrent ? `2px solid ${a.stage_color}` : "1px solid var(--color-border)",
                    background: isCompleted ? `${a.stage_color}20` : "transparent",
                    cursor: isCurrent ? "default" : "pointer",
                    textAlign: "center",
                    opacity: isCompleted ? 0.8 : 1,
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: a.stage_color, fontWeight: 700 }}>
                    {a.stage_name}
                  </div>
                  <div style={{ fontSize: "0.65rem" }} className="text-muted">
                    {isCompleted ? "Completed" : isCurrent ? "Current" : "Pending"}
                  </div>
                  {a.requires_signature && (
                    <div style={{ fontSize: "0.6rem", color: "#f59e0b" }}>Signature Req.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Category</div>
            <div>{lesson.category || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Impact Level</div>
            <div>
              {lesson.impact_level ? (
                <span className="badge" style={{ background: IMPACT_COLORS[lesson.impact_level] || "#9ca3af", color: "#fff" }}>
                  {lesson.impact_level}
                </span>
              ) : "-"}
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Owner</div>
            <div>{lesson.owner_name || lesson.owner_email || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Reviewer</div>
            <div>{lesson.reviewer_name || lesson.reviewer_email || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Root Cause Category</div>
            <div>{lesson.root_cause_category || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Effectiveness</div>
            <div>
              {lesson.effectiveness_rating && lesson.effectiveness_rating !== "not_rated" ? (
                <span className="badge" style={{ background: EFFECTIVENESS_COLORS[lesson.effectiveness_rating] || "#9ca3af", color: "#fff" }}>
                  {lesson.effectiveness_rating.replace(/_/g, " ")}
                </span>
              ) : "-"}
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Identified Date</div>
            <div>{lesson.identified_date ? new Date(lesson.identified_date).toLocaleDateString() : "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Created By</div>
            <div>{lesson.creator_name || lesson.creator_email || "-"}</div>
          </div>
        </div>
      </div>

      {/* Text Sections */}
      {lesson.description && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Description</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{lesson.description}</p>
        </div>
      )}
      {lesson.what_happened && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>What Happened</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{lesson.what_happened}</p>
        </div>
      )}
      {lesson.root_cause && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Root Cause</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{lesson.root_cause}</p>
        </div>
      )}
      {lesson.recommendation && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Recommendation</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{lesson.recommendation}</p>
        </div>
      )}
      {(lesson.preventive_action || lesson.corrective_action) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {lesson.preventive_action && (
            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>Preventive Action</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{lesson.preventive_action}</p>
            </div>
          )}
          {lesson.corrective_action && (
            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>Corrective Action</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{lesson.corrective_action}</p>
            </div>
          )}
        </div>
      )}
      {lesson.outcome && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Outcome</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{lesson.outcome}</p>
        </div>
      )}

      {/* Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <LessonLinkedIssuesPanel lessonId={id!} issues={linkedIssues} onRefresh={handleRefresh} />
        <LessonCommentThread lessonId={id!} />
      </div>

      {/* Attachments */}
      <AttachmentList
        parentId={id!}
        parentType="lesson"
        attachments={attachments}
        onUpdate={handleRefresh}
      />

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
    </div>
  );
}
