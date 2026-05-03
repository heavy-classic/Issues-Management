import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import RiskFormModal from "../components/RiskFormModal";
import HistoryPanel from "../components/HistoryPanel";
import RiskScoreDisplay from "../components/RiskScoreDisplay";
import RiskAssessmentPanel from "../components/RiskAssessmentPanel";
import RiskMitigationsPanel from "../components/RiskMitigationsPanel";
import RiskLinkedIssuesPanel from "../components/RiskLinkedIssuesPanel";
import RiskLinkedAuditsPanel from "../components/RiskLinkedAuditsPanel";

interface WorkflowStage {
  id: string;
  name: string;
  color: string;
  position: number;
  requires_signature: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981",
};

interface Category { id: string; name: string; }
interface User { id: string; full_name: string | null; email: string; }

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function RiskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [risk, setRisk] = useState<any>(null);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [mitigations, setMitigations] = useState<any[]>([]);
  const [linkedIssues, setLinkedIssues] = useState<any[]>([]);
  const [linkedAudits, setLinkedAudits] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
      api.get("/workflow/risk-stages"),
    ]).then(([catRes, userRes, stagesRes]) => {
      setCategories(catRes.data.categories);
      setUsers(userRes.data.users);
      setStages(stagesRes.data.stages);
    });
  }, [fetchRisk, fetchRelated]);

  async function handleUpdate(data: any) {
    await api.put(`/risks/${id}`, data);
    setShowEdit(false);
    fetchRisk();
  }

  async function handleAdvanceWorkflow() {
    if (!risk) return;
    const currentIdx = stages.findIndex((s) => s.id === risk.current_stage_id);
    const nextStage = stages[currentIdx + 1];
    if (!nextStage) return;
    try {
      await api.post(`/workflow/risks/${id}/transition`, { target_stage_id: nextStage.id });
      fetchRisk();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to advance workflow");
    }
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

  if (loading) return <p className="loading">Loading…</p>;
  if (!risk) return <p>Risk not found.</p>;

  const residualLevel = risk.residual_level || risk.inherent_level;
  const openMitigations = mitigations.filter((m: any) => m.status !== "completed");

  // Workflow display helpers
  const currentStageIdx = stages.findIndex((s) => s.id === risk.current_stage_id);
  const isLastStage = stages.length > 0 && currentStageIdx === stages.length - 1;

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
                    <div className="rec-type-dot" style={{ background: LEVEL_COLORS[residualLevel] || "#4f46e5" }} />
                    Risk Record
                    {risk.risk_number && (
                      <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", fontWeight: 600, letterSpacing: "0.04em" }}>
                        {risk.risk_number}
                      </span>
                    )}
                  </div>
                  <div className="rec-title">{risk.title}</div>
                </div>
                <div className="bento-header-actions">
                  <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>✏ Edit</button>
                  <button className="btn btn-secondary" onClick={() => setShowHistory((v) => !v)}>🕐 History</button>
                  <button className="btn btn-secondary" onClick={async () => {
                    try {
                      const { exportRiskPDF } = await import("../utils/exportUtils");
                      exportRiskPDF({ risk, mitigations: mitigations || [], linked_issues: linkedIssues || [] });
                    } catch(e) { console.error(e); }
                  }}>⬇ Export PDF</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                  {!isLastStage && stages.length > 0 && (
                    <button className="btn-submit" onClick={handleAdvanceWorkflow}>
                      Submit →
                    </button>
                  )}
                </div>
              </div>

              {/* Meta strip */}
              <div className="meta-strip">
                <div className="ms-item">
                  <div className="ms-status-dot" style={{ background: stages[currentStageIdx]?.color || "#4f46e5" }} />
                  <strong>{risk.status.replace(/_/g, " ")}</strong>
                </div>
                {residualLevel && (
                  <div className="ms-item" style={{ color: LEVEL_COLORS[residualLevel] || "#6d6d9e", fontWeight: 600 }}>
                    ⚠ {residualLevel} risk
                  </div>
                )}
                {risk.category_name && <div className="ms-item">🏷 {risk.category_name}</div>}
                {risk.treatment_strategy && (
                  <div className="ms-item" style={{ textTransform: "capitalize" }}>
                    🛡 {risk.treatment_strategy}
                  </div>
                )}
                <div className="ms-item">👤 {risk.owner_name || risk.owner_email || "No owner"}</div>
                {risk.next_review_date && (
                  <div className="ms-item">📅 Review: {fmtDate(risk.next_review_date)}</div>
                )}
              </div>
            </div>

            {/* ── Workflow tile ── */}
            {stages.length > 0 && (
              <div className="tile t-workflow">
                <div className="tile-label acc">
                  Workflow
                  {currentStageIdx >= 0 && (
                    <> — Stage {currentStageIdx + 1} of {stages.length}</>
                  )}
                </div>
                <div className="bento-wf-row">
                  {stages.map((stage, idx) => {
                    const isCurrent = stage.id === risk.current_stage_id;
                    const isComplete = currentStageIdx >= 0 && idx < currentStageIdx;
                    const cls = isComplete ? "wf-done" : isCurrent ? "wf-cur" : "";
                    return (
                      <React.Fragment key={stage.id}>
                        <div className={`bento-wf-step ${cls}`}>
                          <div className="bento-wf-icon">
                            {isComplete ? "✓" : idx + 1}
                          </div>
                          <div className="bento-wf-name">{stage.name}</div>
                          <div className="bento-wf-sub">
                            {isComplete ? "Completed" : isCurrent ? "In progress" : "Not started"}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Risk Scores tile ── */}
            <div className="tile t-desc">
              <div className="tile-label acc">Risk Scores</div>
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

            {/* ── Description tile ── */}
            {(risk.description || risk.treatment_plan) && (
              <div className="tile t-team">
                {risk.description && (
                  <>
                    <div className="tile-label">Description</div>
                    <div className="rte">
                      <div className="rte-toolbar">
                        <span style={{ fontSize: 11, color: "#a5b4fc", padding: "0 4px" }}>Read-only</span>
                      </div>
                      <div className="rte-content" style={{ whiteSpace: "pre-wrap", minHeight: 80 }}>
                        {risk.description}
                      </div>
                    </div>
                  </>
                )}
                {risk.treatment_plan && (
                  <div style={{ marginTop: 16 }}>
                    <div className="tile-label">Treatment Plan</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {risk.treatment_plan}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Details tile ── */}
            <div className="tile t-team">
              <div className="tile-label">Details</div>
              <div className="bento-team-row">
                <div className="bento-team-k">Owner</div>
                <div className="bento-team-v">
                  {risk.owner_email ? (
                    <>
                      <div className="bento-av">{(risk.owner_name || risk.owner_email).charAt(0).toUpperCase()}</div>
                      {risk.owner_name || risk.owner_email}
                    </>
                  ) : <span style={{ color: "#a5b4fc" }}>Unassigned</span>}
                </div>
              </div>
              {risk.reviewer_email && (
                <div className="bento-team-row">
                  <div className="bento-team-k">Reviewer</div>
                  <div className="bento-team-v">
                    <div className="bento-av" style={{ background: "#3b82f6" }}>
                      {(risk.reviewer_name || risk.reviewer_email).charAt(0).toUpperCase()}
                    </div>
                    {risk.reviewer_name || risk.reviewer_email}
                  </div>
                </div>
              )}
              <div className="bento-team-row">
                <div className="bento-team-k">Category</div>
                <div className="bento-team-v">{risk.category_name || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Source</div>
                <div className="bento-team-v">{risk.source || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Treatment</div>
                <div className="bento-team-v" style={{ textTransform: "capitalize" }}>{risk.treatment_strategy || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Velocity</div>
                <div className="bento-team-v" style={{ textTransform: "capitalize" }}>{risk.velocity?.replace("_", " ") || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Appetite</div>
                <div className="bento-team-v" style={{ textTransform: "capitalize" }}>{risk.risk_appetite || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Identified</div>
                <div className="bento-team-v">{fmtDate(risk.identified_date)}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Next Review</div>
                <div className="bento-team-v">{fmtDate(risk.next_review_date)}</div>
              </div>
            </div>

            {/* ── Mitigations tile ── */}
            <div className="tile t-actions">
              <RiskMitigationsPanel
                riskId={id as string}
                mitigations={mitigations}
                users={users}
                onRefresh={handleRefresh}
              />
            </div>

            {/* ── Assessments tile ── */}
            <div className="tile t-comments">
              <RiskAssessmentPanel
                riskId={id as string}
                assessments={assessments}
                onRefresh={handleRefresh}
              />
            </div>

            {/* ── Linked Issues tile ── */}
            <div className="tile t-actions">
              <RiskLinkedIssuesPanel riskId={id as string} issues={linkedIssues} onRefresh={handleRefresh} />
            </div>

            {/* ── Linked Audits tile ── */}
            <div className="tile t-comments">
              <RiskLinkedAuditsPanel riskId={id as string} audits={linkedAudits} onRefresh={handleRefresh} />
            </div>

            {/* ── History tile ── */}
            {showHistory && (
              <div className="tile" style={{ gridColumn: "span 12" }}>
                <div className="tile-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🕐 Change History</span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)" }} onClick={() => setShowHistory(false)}>×</button>
                </div>
                <HistoryPanel parentType="risks" parentId={id as string} />
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
                Risk <span className="hl">{risk.title}</span> is currently{" "}
                <span className="hl">{risk.status.replace(/_/g, " ")}</span>
                {residualLevel && <> with <span className="hl">{residualLevel} residual risk</span></>}
                . Owned by <span className="hl">{risk.owner_name || risk.owner_email || "no one"}</span>
                {mitigations.length > 0 && (
                  <>. <span className="hl">{mitigations.length} mitigation{mitigations.length !== 1 ? "s" : ""}</span>
                  {openMitigations.length > 0 && <>, {openMitigations.length} open</>}</>
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
              {!risk.owner_email && (
                <div className="ai-sug">
                  <div className="ai-sug-n">1</div>
                  <div className="ai-sug-t">
                    <strong>Assign an owner</strong>
                    Risk has no owner — accountability is needed.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {openMitigations.length === 0 && risk.status === "in_treatment" && (
                <div className="ai-sug">
                  <div className="ai-sug-n">{risk.owner_email ? "1" : "2"}</div>
                  <div className="ai-sug-t">
                    <strong>Add mitigations</strong>
                    In-treatment with no active mitigations — add control actions.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {!risk.next_review_date && (
                <div className="ai-sug">
                  <div className="ai-sug-n">{(risk.owner_email ? 0 : 1) + (openMitigations.length === 0 && risk.status === "in_treatment" ? 1 : 0) + 1}</div>
                  <div className="ai-sug-t">
                    <strong>Set a review date</strong>
                    No next review date — schedule one to stay on top of this risk.
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
              {(residualLevel === "critical" || residualLevel === "high") && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: LEVEL_COLORS[residualLevel] }} />
                  <div className="ai-risk-txt">{residualLevel} residual risk level — escalation may be needed</div>
                  <div className="ai-risk-lvl" style={{ color: LEVEL_COLORS[residualLevel] }}>
                    {residualLevel === "critical" ? "Crit" : "High"}
                  </div>
                </div>
              )}
              {openMitigations.length > 3 && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#fbbf24" }} />
                  <div className="ai-risk-txt">{openMitigations.length} open mitigations — review for blockers</div>
                  <div className="ai-risk-lvl" style={{ color: "#fbbf24" }}>Med</div>
                </div>
              )}
              {!risk.owner_email && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#f59e0b" }} />
                  <div className="ai-risk-txt">No owner assigned — risk accountability gap</div>
                  <div className="ai-risk-lvl" style={{ color: "#f59e0b" }}>Med</div>
                </div>
              )}
              {residualLevel !== "critical" && residualLevel !== "high" && openMitigations.length <= 3 && risk.owner_email && (
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
              <input className="ai-input" placeholder="Ask AI about this risk… (coming soon)" disabled />
              <div className="ai-send-btn ai-send-disabled">↑</div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <RiskFormModal
          categories={categories}
          users={users}
          initial={risk}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
