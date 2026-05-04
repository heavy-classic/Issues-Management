import { useState, type FormEvent } from "react";
import { useModalA11y } from "../hooks/useModalA11y";

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface LessonData {
  id?: string;
  title?: string;
  description?: string;
  lesson_type?: string;
  category?: string | null;
  impact_level?: string | null;
  what_happened?: string;
  root_cause?: string;
  root_cause_category?: string | null;
  recommendation?: string;
  preventive_action?: string;
  corrective_action?: string;
  owner_id?: string | null;
  reviewer_id?: string | null;
  identified_date?: string | null;
  tags?: string[];
  from_issue_id?: string;
  status?: string;
  outcome?: string;
  effectiveness_rating?: string;
}

interface Props {
  users: User[];
  initial?: LessonData;
  fromIssueId?: string;
  onSubmit: (data: LessonData) => Promise<void>;
  onClose: () => void;
}

const LESSON_TYPES = [
  { value: "positive", label: "Positive", color: "#10b981" },
  { value: "negative", label: "Negative", color: "#ef4444" },
  { value: "improvement", label: "Improvement", color: "#3b82f6" },
];

const IMPACT_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CATEGORIES = [
  "Process", "Technology", "People", "Compliance", "Communication",
  "Project Management", "Vendor Management", "Security",
];

const ROOT_CAUSE_CATEGORIES = [
  "Human Error", "Process Gap", "System Failure", "Design Flaw",
  "Training Gap", "Resource Constraint", "External Factor", "Communication Breakdown",
];

export default function LessonFormModal({ users, initial, fromIssueId, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [lessonType, setLessonType] = useState(initial?.lesson_type || "improvement");
  const [category, setCategory] = useState(initial?.category || "");
  const [impactLevel, setImpactLevel] = useState(initial?.impact_level || "");
  const [whatHappened, setWhatHappened] = useState(initial?.what_happened || "");
  const [rootCause, setRootCause] = useState(initial?.root_cause || "");
  const [rootCauseCategory, setRootCauseCategory] = useState(initial?.root_cause_category || "");
  const [recommendation, setRecommendation] = useState(initial?.recommendation || "");
  const [preventiveAction, setPreventiveAction] = useState(initial?.preventive_action || "");
  const [correctiveAction, setCorrectiveAction] = useState(initial?.corrective_action || "");
  const [ownerId, setOwnerId] = useState(initial?.owner_id || "");
  const [reviewerId, setReviewerId] = useState(initial?.reviewer_id || "");
  const [identifiedDate, setIdentifiedDate] = useState(initial?.identified_date?.split("T")[0] || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        lesson_type: lessonType,
        category: category || null,
        impact_level: impactLevel || null,
        what_happened: whatHappened,
        root_cause: rootCause,
        root_cause_category: rootCauseCategory || null,
        recommendation,
        preventive_action: preventiveAction,
        corrective_action: correctiveAction,
        owner_id: ownerId || null,
        reviewer_id: reviewerId || null,
        identified_date: identifiedDate || null,
        from_issue_id: fromIssueId,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save lesson");
    } finally {
      setSubmitting(false);
    }
  }

  const dialogRef = useModalA11y(onClose);

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-form-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="lesson-form-title">{initial?.id ? "Edit Lesson Learned" : "New Lesson Learned"}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Type *</label>
              <select value={lessonType} onChange={(e) => setLessonType(e.target.value)} required>
                {LESSON_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Impact Level</label>
              <select value={impactLevel} onChange={(e) => setImpactLevel(e.target.value)}>
                <option value="">Select...</option>
                {IMPACT_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Identified Date</label>
              <input type="date" value={identifiedDate} onChange={(e) => setIdentifiedDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>What Happened</label>
            <textarea rows={3} value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} placeholder="Describe what occurred..." />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Root Cause</label>
              <textarea rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Identify the root cause..." />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Root Cause Category</label>
              <select value={rootCauseCategory} onChange={(e) => setRootCauseCategory(e.target.value)}>
                <option value="">Select...</option>
                {ROOT_CAUSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Recommendation</label>
            <textarea rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="Recommended actions..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Preventive Action</label>
              <textarea rows={2} value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Corrective Action</label>
              <textarea rows={2} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Select...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Reviewer</label>
              <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>
                <option value="">Select...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : initial?.id ? "Update" : "Create Lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
