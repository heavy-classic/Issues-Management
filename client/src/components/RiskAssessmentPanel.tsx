import { useState } from "react";
import api from "../api/client";

const LEVEL_BG: Record<string, string> = {
  low: "#d1fae5", medium: "#fef3c7", high: "#ffedd5", extreme: "#fee2e2",
};
const LEVEL_COLOR: Record<string, string> = {
  low: "#065f46", medium: "#d97706", high: "#ea580c", extreme: "#dc2626",
};

interface Assessment {
  id: string; assessment_date: string;
  assessor_name: string | null; assessor_email: string | null;
  likelihood: number; impact: number; score: number; level: string;
  rationale: string | null; assessment_type: string;
}
interface Props { riskId: string; assessments: Assessment[]; onRefresh: () => void; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
        likelihood, impact,
        rationale: rationale || undefined,
        assessment_type: type,
      });
      setShowForm(false);
      setRationale("");
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add assessment");
    } finally { setSubmitting(false); }
  }

  const previewScore = likelihood * impact;

  return (
    <>
      <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Assessments{" "}
          <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
            {assessments.length}
          </span>
        </span>
        <button className="ap-add-btn" onClick={() => setShowForm((v) => !v)}>+ Add</button>
      </div>

      {showForm && (
        <div style={{ background: "#f8f7ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <select value={type} onChange={(e) => setType(e.target.value)}
              style={{ flex: "1 1 110px", padding: "6px 8px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
              <option value="inherent">Inherent</option>
              <option value="residual">Residual</option>
              <option value="target">Target</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#6b7280" }}>L</label>
              <select value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))}
                style={{ width: 60, padding: "6px 6px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
                {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>×</span>
              <label style={{ fontSize: 11, color: "#6b7280" }}>I</label>
              <select value={impact} onChange={(e) => setImpact(Number(e.target.value))}
                style={{ width: 60, padding: "6px 6px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }}>
                {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", marginLeft: 4 }}>= {previewScore}</span>
            </div>
            <input type="text" placeholder="Rationale (optional)" value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              style={{ flex: "2 1 200px", padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e7ff", fontSize: 12 }} />
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="ap-btn" style={{ background: "#e0e7ff", color: "#4f46e5" }} onClick={() => setShowForm(false)}>Cancel</button>
            <button className="ap-btn ap-btn-edit" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Saving…" : "Add Assessment"}
            </button>
          </div>
        </div>
      )}

      <table className="ap-table">
        <thead>
          <tr>
            <th className="ap-th" scope="col">Date</th>
            <th className="ap-th" scope="col">Type</th>
            <th className="ap-th" scope="col">L × I</th>
            <th className="ap-th" scope="col">Score</th>
            <th className="ap-th" scope="col">Level</th>
            <th className="ap-th" scope="col">Assessor</th>
            <th className="ap-th" scope="col">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {assessments.length === 0 ? (
            <tr><td colSpan={7} className="ap-empty">No assessments recorded yet.</td></tr>
          ) : (
            assessments.map((a) => (
              <tr key={a.id} className="ap-row">
                <td className="ap-td" style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(a.assessment_date)}</td>
                <td className="ap-td" style={{ textTransform: "capitalize", fontSize: 12 }}>{a.assessment_type}</td>
                <td className="ap-td" style={{ fontSize: 12 }}>{a.likelihood} × {a.impact}</td>
                <td className="ap-td"><strong style={{ color: "#4f46e5" }}>{a.score}</strong></td>
                <td className="ap-td">
                  <span className="ap-status" style={{ background: LEVEL_BG[a.level] || "#f3f4f6", color: LEVEL_COLOR[a.level] || "#6b7280" }}>
                    {a.level}
                  </span>
                </td>
                <td className="ap-td ap-assignee">{a.assessor_name || a.assessor_email || <span style={{ color: "#c7d2fe" }}>—</span>}</td>
                <td className="ap-td" style={{ fontSize: 12, color: "#6b7280", maxWidth: 200 }}>
                  {a.rationale || <span style={{ color: "#c7d2fe" }}>—</span>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
