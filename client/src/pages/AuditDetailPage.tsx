import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import AuditFormModal from "../components/AuditFormModal";
import AuditPhaseProgress from "../components/AuditPhaseProgress";
import ChecklistInstanceCard from "../components/ChecklistInstanceCard";
import FindingsPanel from "../components/FindingsPanel";
import AuditTeamPanel from "../components/AuditTeamPanel";
import AuditMeetingsPanel from "../components/AuditMeetingsPanel";
import AttachmentList from "../components/AttachmentList";
import { exportAuditPDF } from "../utils/auditExportUtils";
import HistoryPanel from "../components/HistoryPanel";

interface AuditType { id: string; name: string; }
interface User { id: string; full_name: string | null; email: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af", scheduled: "#3b82f6", planning: "#8b5cf6",
  in_progress: "#f59e0b", under_review: "#06b6d4", closed: "#10b981", cancelled: "#ef4444",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);

  const fetchAudit = useCallback(async () => {
    const res = await api.get(`/audits/${id}`);
    setAudit(res.data.audit);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAudit();
    api.get("/audit-types?is_active=true").then((r) => setAuditTypes(r.data.auditTypes));
    api.get("/users").then((r) => setUsers(r.data.users));
    api.get("/checklists?status=active").then((r) => setChecklists(r.data.checklists));
  }, [fetchAudit]);

  async function handleUpdate(data: any) {
    await api.patch(`/audits/${id}`, data);
    setEditing(false);
    fetchAudit();
  }

  async function handleAdvancePhase() {
    if (!confirm("Advance to the next workflow phase?")) return;
    await api.post(`/audits/${id}/advance-phase`);
    fetchAudit();
  }

  async function handleDelete() {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    await api.delete(`/audits/${id}`);
    navigate("/audits");
  }

  async function handleStatusChange(status: string) {
    await api.patch(`/audits/${id}`, { status });
    fetchAudit();
  }

  async function handleExportPDF() {
    try {
      const res = await api.get(`/audit-exports/${id}`);
      exportAuditPDF(res.data);
    } catch {
      alert("Failed to generate PDF report");
    }
  }

  if (loading) return <p className="loading">Loading…</p>;
  if (!audit) return <p>Audit not found.</p>;

  const phases = typeof audit.workflow_phases === "string"
    ? JSON.parse(audit.workflow_phases)
    : audit.workflow_phases || [];

  const openFindings = (audit.findings || []).filter((f: any) => f.status !== "closed");

  return (
    <>
      <div className="bento-layout-wrap">
        {/* Scrollable bento area */}
        <div className="bento-area">
          <div className="bento">

            {/* ── Header tile ── */}
            <div className="tile t-header">
              <div className="bento-header-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rec-type">
                    <div className="rec-type-dot" style={{ background: audit.type_color || "#4f46e5" }} />
                    {audit.type_icon && <span>{audit.type_icon}</span>}
                    Audit Record
                  </div>
                  <div className="rec-title">{audit.title}</div>
                </div>
                <div className="bento-header-actions">
                  <button className="btn btn-secondary" onClick={() => setEditing(true)}>✏ Edit</button>
                  <button className="btn btn-secondary" onClick={() => setShowHistory((v) => !v)}>🕐 History</button>
                  <button className="btn btn-secondary" onClick={handleExportPDF}>⬇ Export PDF</button>
                  {audit.status !== "closed" && audit.status !== "cancelled" && (
                    <>
                      <select
                        value={audit.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e0e7ff", fontSize: 12, background: "#fff", color: "#1e1b4b" }}
                      >
                        {["draft", "scheduled", "planning", "in_progress", "under_review", "closed", "cancelled"].map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <button className="btn-submit" onClick={handleAdvancePhase}>
                        Advance Phase →
                      </button>
                    </>
                  )}
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>

              {/* Meta strip */}
              <div className="meta-strip">
                <div className="ms-item">
                  <div className="ms-status-dot" style={{ background: STATUS_COLORS[audit.status] || "#4f46e5" }} />
                  <strong>{audit.status.replace(/_/g, " ")}</strong>
                </div>
                {audit.audit_number && (
                  <div className="ms-item" style={{ fontFamily: "monospace", fontSize: 11, color: "#7c5cbf" }}>
                    {audit.audit_number}
                  </div>
                )}
                {audit.type_name && <div className="ms-item">🏷 {audit.type_name}</div>}
                {audit.risk_level && <div className="ms-item">⚠ {audit.risk_level} risk</div>}
                <div className="ms-item">📅 {fmtDate(audit.scheduled_start)}</div>
                <div className="ms-item">👤 {audit.lead_name || audit.lead_email || "No lead"}</div>
                {audit.compliance_score && (
                  <div className="ms-item">✓ {audit.compliance_score}% compliant</div>
                )}
              </div>
            </div>

            {/* ── Workflow / Phases tile ── */}
            {phases.length > 0 && (
              <div className="tile t-workflow">
                <div className="tile-label acc">
                  Workflow Phases — {audit.current_phase || "Not started"}
                </div>
                <AuditPhaseProgress
                  phases={phases}
                  currentPhase={audit.current_phase}
                  status={audit.status}
                />
              </div>
            )}

            {/* ── Audit Plan tile ── */}
            {(audit.objective || audit.scope || audit.methodology || audit.criteria_standards) && (
              <div className="tile t-desc">
                <div className="tile-label">Audit Plan</div>
                {audit.objective && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="bento-team-k" style={{ marginBottom: 4 }}>Objective</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{audit.objective}</p>
                  </div>
                )}
                {audit.scope && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="bento-team-k" style={{ marginBottom: 4 }}>Scope</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{audit.scope}</p>
                  </div>
                )}
                {audit.methodology && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="bento-team-k" style={{ marginBottom: 4 }}>Methodology</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{audit.methodology}</p>
                  </div>
                )}
                {audit.criteria_standards && (
                  <div>
                    <div className="bento-team-k" style={{ marginBottom: 4 }}>Standards</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{audit.criteria_standards}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Details tile ── */}
            <div className="tile t-team">
              <div className="tile-label">Details</div>
              <div className="bento-team-row">
                <div className="bento-team-k">Lead Auditor</div>
                <div className="bento-team-v">
                  {audit.lead_name || audit.lead_email ? (
                    <>
                      <div className="bento-av">{(audit.lead_name || audit.lead_email || "?").charAt(0).toUpperCase()}</div>
                      {audit.lead_name || audit.lead_email}
                    </>
                  ) : <span style={{ color: "#a5b4fc" }}>Unassigned</span>}
                </div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Team Size</div>
                <div className="bento-team-v">{audit.team?.length || 0} members</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Department</div>
                <div className="bento-team-v">{audit.auditee_department || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Location</div>
                <div className="bento-team-v">{audit.location || "—"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Scheduled</div>
                <div className="bento-team-v">{fmtDate(audit.scheduled_start)} → {fmtDate(audit.scheduled_end)}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Rating</div>
                <div className="bento-team-v">{audit.overall_rating || "Not rated"}</div>
              </div>
              <div className="bento-team-row">
                <div className="bento-team-k">Score</div>
                <div className="bento-team-v" style={{ color: "#4f46e5", fontWeight: 600 }}>
                  {audit.compliance_score ? `${audit.compliance_score}%` : "Not scored"}
                </div>
              </div>
            </div>

            {/* ── Findings tile ── */}
            <div className="tile t-actions">
              <FindingsPanel
                auditId={id!}
                findings={audit.findings || []}
                users={users}
                onUpdate={fetchAudit}
              />
            </div>

            {/* ── Checklists tile ── */}
            <div className="tile t-comments">
              <div className="tile-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  Checklists{" "}
                  <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
                    {audit.instances?.length || 0}
                  </span>
                </span>
                <AssignChecklistButton auditId={id!} checklists={checklists} users={users} onAssigned={fetchAudit} />
              </div>
              {audit.instances?.length > 0 ? (
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: 8 }}>
                  {audit.instances.map((inst: any) => (
                    <ChecklistInstanceCard key={inst.id} instance={inst} onUpdate={fetchAudit} />
                  ))}
                </div>
              ) : (
                <p className="text-muted" style={{ marginTop: 8 }}>No checklists assigned.</p>
              )}
            </div>

            {/* ── Evidence tile ── */}
            <div className="tile t-attach">
              <div className="tile-label">Evidence</div>
              {audit.attachments?.length > 0 ? (
                <AttachmentList
                  parentId={id!}
                  parentType="audit"
                  attachments={audit.attachments || []}
                  onUpdate={fetchAudit}
                />
              ) : (
                <div className="attach-empty">
                  <span>📎</span>
                  <span>No attachments — use the Attach button above to upload files</span>
                </div>
              )}
            </div>

            {/* ── Team tile ── */}
            <div className="tile" style={{ gridColumn: "span 3" }}>
              <AuditTeamPanel
                auditId={id!}
                team={audit.team || []}
                users={users}
                onUpdate={fetchAudit}
              />
            </div>

            {/* ── Meetings tile ── */}
            <div className="tile" style={{ gridColumn: "span 3" }}>
              <AuditMeetingsPanel
                auditId={id!}
                meetings={audit.meetings || []}
                users={users}
                onUpdate={fetchAudit}
              />
            </div>

            {/* ── History tile ── */}
            {showHistory && (
              <div className="tile" style={{ gridColumn: "span 12" }}>
                <div className="tile-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🕐 Change History</span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)" }} onClick={() => setShowHistory(false)}>×</button>
                </div>
                <HistoryPanel parentType="audits" parentId={id as string} />
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
                Audit <span className="hl">{audit.audit_number || audit.title}</span> is{" "}
                <span className="hl">{audit.status.replace(/_/g, " ")}</span>
                {audit.type_name && <>, type: <span className="hl">{audit.type_name}</span></>}
                . Led by <span className="hl">{audit.lead_name || audit.lead_email || "no lead assigned"}</span>
                {audit.findings?.length > 0 && (
                  <>. <span className="hl">{audit.findings.length} finding{audit.findings.length !== 1 ? "s" : ""}</span>
                  {openFindings.length > 0 && <>, {openFindings.length} open</>}</>
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
              {!audit.lead_email && (
                <div className="ai-sug">
                  <div className="ai-sug-n">1</div>
                  <div className="ai-sug-t">
                    <strong>Assign a lead auditor</strong>
                    No lead assigned — the audit needs an owner.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {openFindings.length > 0 && (
                <div className="ai-sug">
                  <div className="ai-sug-n">{audit.lead_email ? "1" : "2"}</div>
                  <div className="ai-sug-t">
                    <strong>Close open findings</strong>
                    {openFindings.length} finding{openFindings.length !== 1 ? "s" : ""} still open.
                  </div>
                  <div className="ai-arr">›</div>
                </div>
              )}
              {audit.status === "in_progress" && phases.length > 0 && (
                <div className="ai-sug">
                  <div className="ai-sug-n">{(audit.lead_email ? 0 : 1) + (openFindings.length > 0 ? 1 : 0) + 1}</div>
                  <div className="ai-sug-t">
                    <strong>Advance to next phase</strong>
                    Current: {audit.current_phase || "—"}. Move forward when ready.
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
              {(audit.risk_level === "high" || audit.risk_level === "critical") && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#ef4444" }} />
                  <div className="ai-risk-txt">{audit.risk_level} risk audit — needs close monitoring</div>
                  <div className="ai-risk-lvl" style={{ color: "#ef4444" }}>High</div>
                </div>
              )}
              {openFindings.length > 3 && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#fbbf24" }} />
                  <div className="ai-risk-txt">{openFindings.length} open findings — review urgently</div>
                  <div className="ai-risk-lvl" style={{ color: "#fbbf24" }}>Med</div>
                </div>
              )}
              {!audit.lead_email && (
                <div className="ai-risk">
                  <div className="ai-risk-dot" style={{ background: "#f59e0b" }} />
                  <div className="ai-risk-txt">No lead auditor — audit may stall</div>
                  <div className="ai-risk-lvl" style={{ color: "#f59e0b" }}>Med</div>
                </div>
              )}
              {audit.risk_level !== "high" && audit.risk_level !== "critical" && openFindings.length <= 3 && audit.lead_email && (
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
              <input className="ai-input" placeholder="Ask AI about this audit… (coming soon)" disabled />
              <div className="ai-send-btn ai-send-disabled">↑</div>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <AuditFormModal
          auditTypes={auditTypes}
          users={users}
          initial={audit}
          onSubmit={handleUpdate}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function AssignChecklistButton({
  auditId, checklists, users, onAssigned,
}: {
  auditId: string; checklists: any[]; users: any[]; onAssigned: () => void;
}) {
  const [show, setShow] = useState(false);
  const [checklistId, setChecklistId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  async function handleAssign() {
    if (!checklistId) return;
    await api.post(`/audits/${auditId}/checklists`, {
      checklist_id: checklistId,
      assigned_to: assignedTo || null,
    });
    setShow(false);
    setChecklistId("");
    setAssignedTo("");
    onAssigned();
  }

  if (!show) return <button className="btn btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setShow(true)}>+ Assign</button>;

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <select value={checklistId} onChange={(e) => setChecklistId(e.target.value)} style={{ fontSize: 12, padding: "4px 6px" }}>
        <option value="">Select checklist...</option>
        {checklists.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ fontSize: 12, padding: "4px 6px" }}>
        <option value="">Assign to...</option>
        {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
      </select>
      <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
      <button className="btn btn-secondary" onClick={() => setShow(false)}>Cancel</button>
    </div>
  );
}
