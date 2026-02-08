import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import RiskFormModal from "../components/RiskFormModal";
import RiskScoreDisplay from "../components/RiskScoreDisplay";
import RiskAssessmentPanel from "../components/RiskAssessmentPanel";
import RiskMitigationsPanel from "../components/RiskMitigationsPanel";
import RiskLinkedIssuesPanel from "../components/RiskLinkedIssuesPanel";
import RiskLinkedAuditsPanel from "../components/RiskLinkedAuditsPanel";

const LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  identified: "#3b82f6",
  under_assessment: "#8b5cf6",
  assessed: "#06b6d4",
  in_treatment: "#f59e0b",
  monitoring: "#10b981",
  under_review: "#f97316",
  accepted: "#059669",
  closed: "#6b7280",
};

const ALL_STATUSES = [
  "draft", "identified", "under_assessment", "assessed",
  "in_treatment", "monitoring", "under_review", "accepted", "closed",
];

interface Category { id: string; name: string; }
interface User { id: string; full_name: string | null; email: string; }

export default function RiskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [risk, setRisk] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [mitigations, setMitigations] = useState<any[]>([]);
  const [linkedIssues, setLinkedIssues] = useState<any[]>([]);
  const [linkedAudits, setLinkedAudits] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRisk = useCallback(async () => {
    const res = await api.get(`/risks/${id}`);
    setRisk(res.data.risk);
    setLoading(false);
  }, [id]);

  const fetchRelated = useCallback(async () => {
    const [aRes, mRes, iRes, auRes] = await Promise.all([
      api.get(`/risks/${id}/assessments`),
      api.get(`/risks/${id}/mitigations`),
      api.get(`/risks/${id}/issues`),
      api.get(`/risks/${id}/audits`),
    ]);
    setAssessments(aRes.data.assessments);
    setMitigations(mRes.data.mitigations);
    setLinkedIssues(iRes.data.issues);
    setLinkedAudits(auRes.data.audits);
  }, [id]);

  useEffect(() => {
    fetchRisk();
    fetchRelated();
    Promise.all([
      api.get("/risk-categories"),
      api.get("/users"),
    ]).then(([catRes, userRes]) => {
      setCategories(catRes.data.categories);
      setUsers(userRes.data.users);
    });
  }, [fetchRisk, fetchRelated]);

  async function handleUpdate(data: any) {
    await api.put(`/risks/${id}`, data);
    setShowEdit(false);
    fetchRisk();
  }

  async function handleStatusChange(newStatus: string) {
    const data: any = { status: newStatus };
    if (newStatus === "closed") data.closed_date = new Date().toISOString().split("T")[0];
    await api.put(`/risks/${id}`, data);
    fetchRisk();
  }

  async function handleDelete() {
    if (!confirm("Delete this risk?")) return;
    await api.delete(`/risks/${id}`);
    navigate("/risks");
  }

  function handleRefresh() {
    fetchRisk();
    fetchRelated();
  }

  if (loading) return <p>Loading...</p>;
  if (!risk) return <p>Risk not found.</p>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <button className="btn-icon" onClick={() => navigate("/risks")} style={{ marginBottom: "0.5rem" }}>
            &larr; Back to Risk Register
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ margin: 0 }}>{risk.risk_number}: {risk.title}</h1>
            <span className="badge" style={{ background: STATUS_COLORS[risk.status] || "#9ca3af", color: "#fff", fontSize: "0.85rem" }}>
              {risk.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-secondary btn-danger-icon" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Status Change */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ fontWeight: 600, marginRight: "0.5rem" }}>Status:</label>
        <select
          value={risk.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{ padding: "0.25rem 0.5rem", borderRadius: 4, border: "1px solid var(--color-border)" }}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Score Display */}
      <div style={{ marginBottom: "1.5rem" }}>
        <RiskScoreDisplay
          inherent={{
            label: "Inherent",
            likelihood: risk.inherent_likelihood,
            impact: risk.inherent_impact,
            score: risk.inherent_score,
            level: risk.inherent_level,
          }}
          residual={{
            label: "Residual",
            likelihood: risk.residual_likelihood,
            impact: risk.residual_impact,
            score: risk.residual_score,
            level: risk.residual_level,
          }}
          target={{
            label: "Target",
            likelihood: risk.target_likelihood,
            impact: risk.target_impact,
            score: risk.target_score,
            level: risk.target_level,
          }}
        />
      </div>

      {/* Metadata Grid */}
      <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Category</div>
            <div>{risk.category_name || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Source</div>
            <div>{risk.source || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Owner</div>
            <div>{risk.owner_name || risk.owner_email || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Reviewer</div>
            <div>{risk.reviewer_name || risk.reviewer_email || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Treatment Strategy</div>
            <div style={{ textTransform: "capitalize" }}>{risk.treatment_strategy || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Velocity</div>
            <div style={{ textTransform: "capitalize" }}>{risk.velocity?.replace("_", " ") || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Risk Appetite</div>
            <div style={{ textTransform: "capitalize" }}>{risk.risk_appetite || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Identified</div>
            <div>{risk.identified_date ? new Date(risk.identified_date).toLocaleDateString() : "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Next Review</div>
            <div>{risk.next_review_date ? new Date(risk.next_review_date).toLocaleDateString() : "-"}</div>
          </div>
        </div>
      </div>

      {/* Treatment Plan */}
      {risk.treatment_plan && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Treatment Plan</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{risk.treatment_plan}</p>
        </div>
      )}

      {/* Description */}
      {risk.description && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Description</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{risk.description}</p>
        </div>
      )}

      {/* Panels */}
      <RiskAssessmentPanel riskId={id as string} assessments={assessments} onRefresh={handleRefresh} />
      <RiskMitigationsPanel riskId={id as string} mitigations={mitigations} users={users} onRefresh={handleRefresh} />
      <RiskLinkedIssuesPanel riskId={id as string} issues={linkedIssues} onRefresh={handleRefresh} />
      <RiskLinkedAuditsPanel riskId={id as string} audits={linkedAudits} onRefresh={handleRefresh} />

      {showEdit && (
        <RiskFormModal
          categories={categories}
          users={users}
          initial={risk}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
