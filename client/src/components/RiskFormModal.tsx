import { useState, type FormEvent } from "react";

interface Category {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface RiskData {
  id?: string;
  title?: string;
  description?: string;
  category_id?: string | null;
  source?: string;
  status?: string;
  inherent_likelihood?: number | null;
  inherent_impact?: number | null;
  residual_likelihood?: number | null;
  residual_impact?: number | null;
  target_likelihood?: number | null;
  target_impact?: number | null;
  velocity?: string | null;
  treatment_strategy?: string | null;
  treatment_plan?: string;
  risk_appetite?: string;
  owner_id?: string | null;
  reviewer_id?: string | null;
  identified_date?: string | null;
  next_review_date?: string | null;
  tags?: string[];
}

interface Props {
  categories: Category[];
  users: User[];
  initial?: RiskData;
  onSubmit: (data: RiskData) => Promise<void>;
  onClose: () => void;
}

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "1 - Rare",
  2: "2 - Unlikely",
  3: "3 - Possible",
  4: "4 - Likely",
  5: "5 - Almost Certain",
};

const IMPACT_LABELS: Record<number, string> = {
  1: "1 - Negligible",
  2: "2 - Minor",
  3: "3 - Moderate",
  4: "4 - Major",
  5: "5 - Catastrophic",
};

function calcLevel(score: number): string {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 16) return "high";
  return "extreme";
}

const LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

export default function RiskFormModal({ categories, users, initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [source, setSource] = useState(initial?.source || "");
  const [inherentL, setInherentL] = useState<number>(initial?.inherent_likelihood || 0);
  const [inherentI, setInherentI] = useState<number>(initial?.inherent_impact || 0);
  const [residualL, setResidualL] = useState<number>(initial?.residual_likelihood || 0);
  const [residualI, setResidualI] = useState<number>(initial?.residual_impact || 0);
  const [targetL, setTargetL] = useState<number>(initial?.target_likelihood || 0);
  const [targetI, setTargetI] = useState<number>(initial?.target_impact || 0);
  const [velocity, setVelocity] = useState(initial?.velocity || "");
  const [treatmentStrategy, setTreatmentStrategy] = useState(initial?.treatment_strategy || "");
  const [treatmentPlan, setTreatmentPlan] = useState(initial?.treatment_plan || "");
  const [riskAppetite, setRiskAppetite] = useState(initial?.risk_appetite || "");
  const [ownerId, setOwnerId] = useState(initial?.owner_id || "");
  const [reviewerId, setReviewerId] = useState(initial?.reviewer_id || "");
  const [identifiedDate, setIdentifiedDate] = useState(initial?.identified_date?.split("T")[0] || "");
  const [nextReviewDate, setNextReviewDate] = useState(initial?.next_review_date?.split("T")[0] || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inherentScore = inherentL && inherentI ? inherentL * inherentI : null;
  const residualScore = residualL && residualI ? residualL * residualI : null;
  const targetScore = targetL && targetI ? targetL * targetI : null;

  function ScoreBadge({ score }: { score: number | null }) {
    if (!score) return <span className="text-muted">-</span>;
    const level = calcLevel(score);
    return (
      <span className="badge" style={{ background: LEVEL_COLORS[level], color: "#fff" }}>
        {score} ({level})
      </span>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        category_id: categoryId || null,
        source,
        inherent_likelihood: inherentL || null,
        inherent_impact: inherentI || null,
        residual_likelihood: residualL || null,
        residual_impact: residualI || null,
        target_likelihood: targetL || null,
        target_impact: targetI || null,
        velocity: velocity || null,
        treatment_strategy: treatmentStrategy || null,
        treatment_plan: treatmentPlan,
        risk_appetite: riskAppetite,
        owner_id: ownerId || null,
        reviewer_id: reviewerId || null,
        identified_date: identifiedDate || null,
        next_review_date: nextReviewDate || null,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save risk");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial?.id ? "Edit Risk" : "Register New Risk"}</h2>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
              <label>Source</label>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g., Internal Audit, Risk Workshop" maxLength={255} />
            </div>
            <div className="form-group">
              <label>Risk Appetite</label>
              <select value={riskAppetite} onChange={(e) => setRiskAppetite(e.target.value)}>
                <option value="">Not set</option>
                {["averse", "cautious", "open", "hungry"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Inherent Risk */}
          <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.75rem" }}>
            <legend style={{ fontWeight: 600, fontSize: "0.9rem" }}>Inherent Risk (before controls) {inherentScore !== null && <ScoreBadge score={inherentScore} />}</legend>
            <div className="form-row">
              <div className="form-group">
                <label>Likelihood</label>
                <select value={inherentL} onChange={(e) => setInherentL(Number(e.target.value))}>
                  <option value={0}>Select...</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{LIKELIHOOD_LABELS[v]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Impact</label>
                <select value={inherentI} onChange={(e) => setInherentI(Number(e.target.value))}>
                  <option value={0}>Select...</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Residual Risk */}
          <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.75rem" }}>
            <legend style={{ fontWeight: 600, fontSize: "0.9rem" }}>Residual Risk (after controls) {residualScore !== null && <ScoreBadge score={residualScore} />}</legend>
            <div className="form-row">
              <div className="form-group">
                <label>Likelihood</label>
                <select value={residualL} onChange={(e) => setResidualL(Number(e.target.value))}>
                  <option value={0}>Select...</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{LIKELIHOOD_LABELS[v]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Impact</label>
                <select value={residualI} onChange={(e) => setResidualI(Number(e.target.value))}>
                  <option value={0}>Select...</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Target Risk */}
          <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.75rem" }}>
            <legend style={{ fontWeight: 600, fontSize: "0.9rem" }}>Target Risk (desired state) {targetScore !== null && <ScoreBadge score={targetScore} />}</legend>
            <div className="form-row">
              <div className="form-group">
                <label>Likelihood</label>
                <select value={targetL} onChange={(e) => setTargetL(Number(e.target.value))}>
                  <option value={0}>Select...</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{LIKELIHOOD_LABELS[v]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Impact</label>
                <select value={targetI} onChange={(e) => setTargetI(Number(e.target.value))}>
                  <option value={0}>Select...</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          <div className="form-row">
            <div className="form-group">
              <label>Treatment Strategy</label>
              <select value={treatmentStrategy} onChange={(e) => setTreatmentStrategy(e.target.value)}>
                <option value="">Select...</option>
                {[
                  { value: "avoid", label: "Avoid" },
                  { value: "mitigate", label: "Mitigate" },
                  { value: "transfer", label: "Transfer" },
                  { value: "accept", label: "Accept" },
                ].map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Velocity</label>
              <select value={velocity} onChange={(e) => setVelocity(e.target.value)}>
                <option value="">Not set</option>
                {[
                  { value: "slow", label: "Slow" },
                  { value: "moderate", label: "Moderate" },
                  { value: "fast", label: "Fast" },
                  { value: "very_fast", label: "Very Fast" },
                ].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Treatment Plan</label>
            <textarea rows={2} value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Reviewer</label>
              <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Identified Date</label>
              <input type="date" value={identifiedDate} onChange={(e) => setIdentifiedDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Next Review Date</label>
              <input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : initial?.id ? "Update Risk" : "Register Risk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
