import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import HistoryPanel from "../components/HistoryPanel";

interface ProcedureStep {
  id: string;
  section_id: string;
  step_text: string;
  sequence_number: number;
  step_type: string;
  step_level: number;
  condition_text: string | null;
  is_nonsequential: boolean;
}

interface ProcedureSection {
  id: string;
  title: string;
  sequence_number: number;
  steps: ProcedureStep[];
}

interface Procedure {
  id: string;
  procedure_number: string;
  title: string;
  procedure_type: string | null;
  status: string;
  revision_number: number;
  revision_date: string | null;
  revision_description: string | null;
  approval_date: string | null;
  approved_by_name: string | null;
  author_name: string | null;
  author_email: string | null;
  building_unit: string | null;
  safety_classification: string | null;
  purpose: string | null;
  scope: string | null;
  applicability: string | null;
  precautions: string | null;
  prereq_planning: string | null;
  prereq_documents: string | null;
  prereq_tools: string | null;
  prereq_field_prep: string | null;
  prereq_approvals: string | null;
  post_testing: string | null;
  post_restoration: string | null;
  post_results: string | null;
  records_section: string | null;
  source_requirements: string | null;
  sections: ProcedureSection[];
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:      { bg: "#f3f4f6",  color: "#6b7280" },
  review:     { bg: "#fef3c7",  color: "#d97706" },
  approved:   { bg: "#d1fae5",  color: "#065f46" },
  superseded: { bg: "#e5e7eb",  color: "#9ca3af" },
  cancelled:  { bg: "#fee2e2",  color: "#dc2626" },
};

const STEP_TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  BASIC:           { bg: "transparent", color: "var(--color-text)", label: "" },
  CONDITIONAL:     { bg: "#eff6ff", color: "#1d4ed8", label: "IF" },
  VERIFICATION:    { bg: "#f0fdf4", color: "#166534", label: "VERIFY" },
  HOLD_POINT:      { bg: "#fff7ed", color: "#c2410c", label: "⊠ HOLD" },
  NOTIFICATION:    { bg: "#ede9fe", color: "#6d28d9", label: "NOTIFY" },
  DATA_RECORDING:  { bg: "#f0f9ff", color: "#0369a1", label: "RECORD" },
  WARNING:         { bg: "#fff1f2", color: "#be123c", label: "⚠ WARNING" },
  CAUTION:         { bg: "#fffbeb", color: "#92400e", label: "⚑ CAUTION" },
  NOTE:            { bg: "#f9fafb", color: "#6b7280", label: "NOTE" },
};

function ViewerSection({ section, sectionIdx }: { section: ProcedureSection; sectionIdx: number }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        borderBottom: "2px solid #4f46e5",
        paddingBottom: 6,
        marginBottom: 14,
        display: "flex",
        gap: 10,
        alignItems: "baseline",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#4f46e5" }}>
          {sectionIdx + 5}.0
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {section.title}
        </span>
      </div>
      {section.steps.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic" }}>No steps defined.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {section.steps.map((step, si) => {
            const ts = STEP_TYPE_STYLES[step.step_type] || STEP_TYPE_STYLES.BASIC;
            const isWarningCaution = step.step_type === "WARNING" || step.step_type === "CAUTION";
            return (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: isWarningCaution ? "10px 14px" : "6px 0",
                  background: ts.bg,
                  borderLeft: isWarningCaution ? `3px solid ${ts.color}` : undefined,
                  borderRadius: isWarningCaution ? 6 : undefined,
                  paddingLeft: isWarningCaution ? 14 : (step.step_level || 0) * 20,
                }}
              >
                {!isWarningCaution && (
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#ede9fe", color: "#4f46e5",
                    fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {si + 1}
                  </span>
                )}
                <div style={{ flex: 1 }}>
                  {ts.label && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: ts.color, letterSpacing: "0.08em", marginBottom: 2 }}>
                      {ts.label}
                    </div>
                  )}
                  {step.condition_text && (
                    <div style={{ fontSize: 12, color: "#1d4ed8", fontStyle: "italic", marginBottom: 3 }}>
                      IF {step.condition_text}:
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--color-text)" }}>
                    {step.step_text}
                  </p>
                  {step.step_type === "DATA_RECORDING" && (
                    <div style={{
                      marginTop: 6, borderBottom: "1px solid #d1d5db",
                      height: 24,
                      display: "flex", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Value: ________________</span>
                    </div>
                  )}
                  {step.step_type === "VERIFICATION" && (
                    <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
                      <label style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                        <input type="checkbox" readOnly /> Verified
                      </label>
                      <label style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                        <input type="checkbox" readOnly /> N/A
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProcedureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"view" | "edit" | "history">("view");
  const [exporting, setExporting] = useState(false);
  const [editData, setEditData] = useState<Partial<Procedure>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!id || id === "new") return;
    api.get(`/procedures/${id}`)
      .then((res) => { setProcedure(res.data.procedure); setEditData(res.data.procedure); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleExport() {
    if (!procedure) return;
    setExporting(true);
    try {
      const { exportProcedurePDF } = await import("../utils/exportUtils");
      exportProcedurePDF({
        procedure: {
          title: procedure.title,
          procedure_number: procedure.procedure_number,
          status: procedure.status,
          revision: procedure.revision_number,
          owner_name: procedure.author_name ?? undefined,
          department: procedure.building_unit ?? undefined,
          effective_date: procedure.approval_date ?? undefined,
          review_date: procedure.revision_date ?? undefined,
          purpose: procedure.purpose ?? undefined,
          scope: procedure.scope ?? undefined,
          references: procedure.source_requirements ?? undefined,
          definitions: procedure.applicability ?? undefined,
        },
        sections: (procedure.sections ?? []).map((sec) => ({
          title: sec.title,
          section_number: sec.sequence_number,
          steps: sec.steps.map((st) => ({
            step_number: st.sequence_number,
            content: st.step_text,
          })),
        })),
      });
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  }

  async function handleSave() {
    if (!procedure || !id) return;
    setSaving(true);
    try {
      const res = await api.patch(`/procedures/${id}`, editData);
      setProcedure(res.data.procedure);
      setEditData(res.data.procedure);
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Save failed.");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSaving(false);
  }

  if (loading) return <div className="loading">Loading…</div>;
  if (!procedure) return <div style={{ padding: 32, color: "var(--color-text-muted)" }}>Procedure not found.</div>;

  const sc = STATUS_COLORS[procedure.status] || STATUS_COLORS.draft;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        {/* Back + Header */}
        <button className="btn btn-secondary" style={{ fontSize: 12, marginBottom: 14 }} onClick={() => navigate("/procedures")}>
          ← Back to Procedures
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "monospace", fontSize: 13,
                background: "#ede9fe", color: "#4f46e5",
                borderRadius: 6, padding: "3px 10px", fontWeight: 700
              }}>
                {procedure.procedure_number}
              </span>
              <span style={{
                background: sc.bg, color: sc.color,
                borderRadius: 5, padding: "2px 9px",
                fontSize: 11, fontWeight: 700, textTransform: "capitalize"
              }}>
                {procedure.status}
              </span>
              {procedure.safety_classification && (
                <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, letterSpacing: "0.05em" }}>
                  {procedure.safety_classification.toUpperCase()}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-dark)", margin: "8px 0 4px" }}>
              {procedure.title}
            </h1>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
              {procedure.procedure_type && <span>{procedure.procedure_type}</span>}
              <span>Rev {procedure.revision_number ?? 0}</span>
              {procedure.revision_date && <span>Dated: {new Date(procedure.revision_date).toLocaleDateString()}</span>}
              {procedure.author_name && <span>Author: {procedure.author_name}</span>}
              {procedure.approved_by_name && <span>Approved by: {procedure.approved_by_name}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "📤 Export PDF"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid var(--color-border)", marginBottom: 20 }}>
          {(["view", "edit", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: tab === t ? 700 : 400,
                color: tab === t ? "#4f46e5" : "var(--color-text-muted)",
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid #4f46e5" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                textTransform: "capitalize",
              }}
            >
              {t === "view" ? "📄 View" : t === "edit" ? "✏ Edit" : "🕐 History"}
            </button>
          ))}
        </div>

        {/* ── VIEW TAB ── */}
        {tab === "view" && (
          <div style={{ maxWidth: 820, fontFamily: "system-ui, sans-serif" }}>
            {/* Procedure header box */}
            <div style={{
              background: "linear-gradient(135deg, #1e1b4b, #312e81)",
              color: "#fff",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", opacity: 0.7, marginBottom: 6, textTransform: "uppercase" }}>
                Controlled Procedure — {procedure.procedure_type || "Administrative"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                {procedure.procedure_number} — {procedure.title}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 14 }}>
                {[
                  ["Status", procedure.status?.toUpperCase()],
                  ["Revision", `Rev ${procedure.revision_number ?? 0}`],
                  ["Revision Date", procedure.revision_date ? new Date(procedure.revision_date).toLocaleDateString() : "—"],
                  ["Author", procedure.author_name || "—"],
                  ["Approved By", procedure.approved_by_name || "—"],
                  ["Facility/Unit", procedure.building_unit || "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard DOE sections 1–4 */}
            {[
              ["1.0 PURPOSE", procedure.purpose],
              ["2.0 SCOPE", procedure.scope],
              ["3.0 APPLICABILITY", procedure.applicability],
              ["4.0 PRECAUTIONS AND LIMITATIONS", procedure.precautions],
            ].map(([heading, content]) =>
              content ? (
                <div key={heading as string} style={{ marginBottom: 20 }}>
                  <div style={{
                    borderBottom: "2px solid #4f46e5",
                    paddingBottom: 5, marginBottom: 10,
                    fontSize: 13, fontWeight: 800, color: "#4f46e5",
                    textTransform: "uppercase", letterSpacing: "0.04em"
                  }}>
                    {heading}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
                    {content}
                  </p>
                </div>
              ) : null
            )}

            {/* Prerequisites */}
            {(procedure.prereq_planning || procedure.prereq_documents || procedure.prereq_tools) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  borderBottom: "2px solid #4f46e5",
                  paddingBottom: 5, marginBottom: 12,
                  fontSize: 13, fontWeight: 800, color: "#4f46e5",
                  textTransform: "uppercase", letterSpacing: "0.04em"
                }}>
                  PREREQUISITES
                </div>
                {[
                  ["Planning", procedure.prereq_planning],
                  ["Reference Documents", procedure.prereq_documents],
                  ["Tools & Equipment", procedure.prereq_tools],
                  ["Field Preparation", procedure.prereq_field_prep],
                  ["Required Approvals", procedure.prereq_approvals],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label as string} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {label}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--color-text)", whiteSpace: "pre-wrap" }}>{val}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Procedure body sections */}
            {procedure.sections.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", background: "var(--color-bg-subtle)", borderRadius: 10 }}>
                No procedure sections defined. Switch to the Edit tab to add sections.
              </div>
            ) : (
              procedure.sections.map((section, idx) => (
                <ViewerSection key={section.id} section={section} sectionIdx={idx} />
              ))
            )}

            {/* Post-job completion */}
            {(procedure.post_testing || procedure.post_restoration || procedure.post_results) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  borderBottom: "2px solid #4f46e5",
                  paddingBottom: 5, marginBottom: 12,
                  fontSize: 13, fontWeight: 800, color: "#4f46e5",
                  textTransform: "uppercase", letterSpacing: "0.04em"
                }}>
                  POST-JOB COMPLETION
                </div>
                {[
                  ["Testing / Verification", procedure.post_testing],
                  ["System Restoration", procedure.post_restoration],
                  ["Results Documentation", procedure.post_results],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label as string} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{val}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Records */}
            {procedure.records_section && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  borderBottom: "2px solid #4f46e5", paddingBottom: 5, marginBottom: 10,
                  fontSize: 13, fontWeight: 800, color: "#4f46e5",
                  textTransform: "uppercase", letterSpacing: "0.04em"
                }}>
                  RECORDS
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{procedure.records_section}</p>
              </div>
            )}

            {/* Footer */}
            <div style={{
              marginTop: 32, paddingTop: 16,
              borderTop: "1px solid var(--color-border)",
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20, fontSize: 12, color: "var(--color-text-muted)"
            }}>
              <div>
                <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 24, marginBottom: 4 }} />
                <div>Prepared by / Date</div>
              </div>
              <div>
                <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 24, marginBottom: 4 }} />
                <div>Reviewed by / Date</div>
              </div>
              <div>
                <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 24, marginBottom: 4 }} />
                <div>Approved by / Date</div>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT TAB ── */}
        {tab === "edit" && (
          <div style={{ maxWidth: 820 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 8 }}>
              {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes("fail") ? "#dc2626" : "#16a34a", alignSelf: "center" }}>{saveMsg}</span>}
              <button className="btn-submit" style={{ fontSize: 13 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Procedure Number", "procedure_number"],
                ["Title", "title"],
                ["Procedure Type", "procedure_type"],
                ["Status", "status"],
                ["Building / Unit", "building_unit"],
                ["Safety Classification", "safety_classification"],
              ].map(([label, field]) => (
                <div className="form-group" key={field}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>{label}</label>
                  <input
                    className="form-input"
                    style={{ fontSize: 13 }}
                    value={(editData as any)[field] ?? ""}
                    onChange={(e) => setEditData((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {[
              ["Purpose", "purpose"],
              ["Scope", "scope"],
              ["Applicability", "applicability"],
              ["Precautions and Limitations", "precautions"],
              ["Prerequisites — Planning", "prereq_planning"],
              ["Prerequisites — Reference Documents", "prereq_documents"],
              ["Prerequisites — Tools & Equipment", "prereq_tools"],
              ["Prerequisites — Field Preparation", "prereq_field_prep"],
              ["Prerequisites — Required Approvals", "prereq_approvals"],
              ["Post-Job — Testing / Verification", "post_testing"],
              ["Post-Job — System Restoration", "post_restoration"],
              ["Post-Job — Results Documentation", "post_results"],
              ["Records", "records_section"],
              ["Source Requirements / References", "source_requirements"],
            ].map(([label, field]) => (
              <div className="form-group" key={field} style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>{label}</label>
                <textarea
                  className="form-input"
                  rows={4}
                  style={{ fontSize: 13, resize: "vertical", width: "100%" }}
                  value={(editData as any)[field] ?? ""}
                  onChange={(e) => setEditData((prev) => ({ ...prev, [field]: e.target.value }))}
                />
              </div>
            ))}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes("fail") ? "#dc2626" : "#16a34a", alignSelf: "center", marginRight: 10 }}>{saveMsg}</span>}
              <button className="btn-submit" style={{ fontSize: 13 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div style={{ maxWidth: 680 }}>
            <HistoryPanel parentType="procedure" parentId={id!} />
          </div>
        )}

      </div>

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
            This panel previews how AI-powered analysis will work. Content shown is illustrative. Live AI is disabled.
          </div>
        </div>
        <div className="ai-body">
          {/* Smart Summary */}
          <div className="ai-card">
            <div className="ai-card-hd">
              <div className="ai-card-ico">📋</div>
              <div className="ai-card-ttl">Smart Summary</div>
              <div className="ai-card-bdg">Preview</div>
            </div>
            <div className="ai-sum">
              Procedure <span className="hl">{procedure.procedure_number}</span> is{" "}
              <span className="hl">{procedure.status}</span>
              {procedure.procedure_type && <>, type: <span className="hl">{procedure.procedure_type}</span></>}
              . Author: <span className="hl">{procedure.author_name || "—"}</span>
              {procedure.sections.length > 0 && <>. <span className="hl">{procedure.sections.length} section{procedure.sections.length !== 1 ? "s" : ""}</span></>}
              .
            </div>
          </div>

          {/* DOE Compliance Check */}
          <div className="ai-card">
            <div className="ai-card-hd">
              <div className="ai-card-ico">✅</div>
              <div className="ai-card-ttl">DOE-STD-1029 Compliance</div>
            </div>
            {!procedure.purpose && (
              <div className="ai-sug">
                <div className="ai-sug-n">1</div>
                <div className="ai-sug-t">
                  <strong>Add Purpose section</strong>
                  DOE-STD-1029 requires a clear purpose statement.
                </div>
                <div className="ai-arr">›</div>
              </div>
            )}
            {!procedure.precautions && (
              <div className="ai-sug">
                <div className="ai-sug-n">{procedure.purpose ? "1" : "2"}</div>
                <div className="ai-sug-t">
                  <strong>Add Precautions</strong>
                  List all safety precautions per §4.0 requirements.
                </div>
                <div className="ai-arr">›</div>
              </div>
            )}
            {procedure.sections.length === 0 && (
              <div className="ai-sug">
                <div className="ai-sug-n">3</div>
                <div className="ai-sug-t">
                  <strong>Add procedure steps</strong>
                  No body sections yet — add imperative-verb steps.
                </div>
                <div className="ai-arr">›</div>
              </div>
            )}
            {procedure.purpose && procedure.precautions && procedure.sections.length > 0 && (
              <div className="ai-sug">
                <div className="ai-sug-n">✓</div>
                <div className="ai-sug-t">
                  <strong>Core structure complete</strong>
                  Purpose, precautions, and steps are defined.
                </div>
                <div className="ai-arr" />
              </div>
            )}
          </div>

          {/* Risk Signals */}
          <div className="ai-card">
            <div className="ai-card-hd">
              <div className="ai-card-ico">⚠️</div>
              <div className="ai-card-ttl">Risk Signals</div>
            </div>
            {procedure.status === "draft" && (
              <div className="ai-risk">
                <div className="ai-risk-dot" style={{ background: "#f59e0b" }} />
                <div className="ai-risk-txt">Procedure is in draft — not yet approved for use</div>
                <div className="ai-risk-lvl" style={{ color: "#f59e0b" }}>Med</div>
              </div>
            )}
            {!procedure.approved_by_name && procedure.status === "approved" && (
              <div className="ai-risk">
                <div className="ai-risk-dot" style={{ background: "#ef4444" }} />
                <div className="ai-risk-txt">Status is approved but no approver is recorded</div>
                <div className="ai-risk-lvl" style={{ color: "#ef4444" }}>High</div>
              </div>
            )}
            {procedure.sections.some((s) => s.steps.length === 0) && (
              <div className="ai-risk">
                <div className="ai-risk-dot" style={{ background: "#fbbf24" }} />
                <div className="ai-risk-txt">Some sections have no steps defined</div>
                <div className="ai-risk-lvl" style={{ color: "#fbbf24" }}>Med</div>
              </div>
            )}
            {procedure.status !== "draft" && procedure.approved_by_name && !procedure.sections.some((s) => s.steps.length === 0) && (
              <div className="ai-risk">
                <div className="ai-risk-dot" style={{ background: "#818cf8" }} />
                <div className="ai-risk-txt">No significant compliance risks detected</div>
                <div className="ai-risk-lvl" style={{ color: "#818cf8" }}>Low</div>
              </div>
            )}
          </div>
        </div>

        {/* AI input */}
        <div className="ai-in">
          <div className="ai-in-row">
            <input className="ai-input" placeholder="Ask AI about this procedure… (coming soon)" disabled />
            <div className="ai-send-btn ai-send-disabled">↑</div>
          </div>
        </div>
      </div>

    </div>
  );
}
