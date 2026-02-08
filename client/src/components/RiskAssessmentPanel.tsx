import { useState } from "react";
import api from "../api/client";

const LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

interface Assessment {
  id: string;
  assessment_date: string;
  assessor_name: string | null;
  assessor_email: string | null;
  likelihood: number;
  impact: number;
  score: number;
  level: string;
  rationale: string | null;
  assessment_type: string;
}

interface Props {
  riskId: string;
  assessments: Assessment[];
  onRefresh: () => void;
}

export default function RiskAssessmentPanel({ riskId, assessments, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("residual");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    setSubmitting(true);
    try {
      await api.post(`/risks/${riskId}/assessments`, {
        assessment_date: new Date().toISOString().split("T")[0],
        likelihood,
        impact,
        rationale: rationale || undefined,
        assessment_type: type,
      });
      setShowForm(false);
      setRationale("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add assessment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Assessment History</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}>
          + New Assessment
        </button>
      </div>

      {showForm && (
        <div style={{ padding: "0.75rem", background: "var(--color-bg-subtle)", borderRadius: 8, marginBottom: "0.75rem" }}>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="inherent">Inherent</option>
                <option value="residual">Residual</option>
                <option value="target">Target</option>
              </select>
            </div>
            <div className="form-group">
              <label>Likelihood (1-5)</label>
              <select value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Impact (1-5)</label>
              <select value={impact} onChange={(e) => setImpact(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Rationale</label>
            <textarea rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Saving..." : "Add Assessment"}
            </button>
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>No assessments recorded yet.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>L x I</th>
                <th>Score</th>
                <th>Level</th>
                <th>Assessor</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.assessment_date).toLocaleDateString()}</td>
                  <td style={{ textTransform: "capitalize" }}>{a.assessment_type}</td>
                  <td>{a.likelihood} x {a.impact}</td>
                  <td><strong>{a.score}</strong></td>
                  <td>
                    <span className="badge" style={{ background: LEVEL_COLORS[a.level] || "#9ca3af", color: "#fff" }}>
                      {a.level}
                    </span>
                  </td>
                  <td>{a.assessor_name || a.assessor_email || "-"}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.rationale || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
