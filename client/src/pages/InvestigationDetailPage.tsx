import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import api from "../api/client";
import {
  exportBarrierAnalysisPDF,
  exportFiveWhyPDF,
  exportFishbonePDF,
} from "../utils/exportUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvType = "barrier_analysis" | "five_why" | "fishbone";
type InvStatus = "draft" | "complete";

interface Barrier {
  id: string;
  name: string;
  type: "physical" | "administrative" | "behavioral" | "ppe";
  status: "effective" | "failed" | "absent";
  notes: string;
}

interface BarrierAnalysisBody {
  incident_description: string;
  hazard: string;
  target: string;
  barriers: Barrier[];
  recommendations: string;
}

interface WhyRow {
  question: string;
  answer: string;
}

interface FiveWhyBody {
  problem_statement: string;
  whys: WhyRow[];
  root_cause: string;
  corrective_action: string;
}

interface FishboneCategory {
  id: string;
  name: string;
  causes: string[];
}

interface FishboneBody {
  problem_statement: string;
  categories: FishboneCategory[];
  root_cause: string;
}

interface Investigation {
  id: string;
  issue_id: string;
  type: InvType;
  title: string;
  status: InvStatus;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
  body: BarrierAnalysisBody | FiveWhyBody | FishboneBody;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<InvType, string> = {
  barrier_analysis: "Barrier Analysis",
  five_why: "5-Why Analysis",
  fishbone: "Fishbone (Ishikawa)",
};

const TYPE_ICONS: Record<InvType, string> = {
  barrier_analysis: "🔲",
  five_why: "🔢",
  fishbone: "🐟",
};

const BARRIER_STATUS_COLORS: Record<string, string> = {
  effective: "#10b981",
  failed: "#ef4444",
  absent: "#9ca3af",
};

// ─── Barrier Analysis Editor ──────────────────────────────────────────────────

function BarrierAnalysisEditor({
  body,
  onChange,
}: {
  body: BarrierAnalysisBody;
  onChange: (b: BarrierAnalysisBody) => void;
}) {
  function update(patch: Partial<BarrierAnalysisBody>) {
    onChange({ ...body, ...patch });
  }

  function addBarrier() {
    update({
      barriers: [
        ...body.barriers,
        { id: crypto.randomUUID(), name: "", type: "physical", status: "absent", notes: "" },
      ],
    });
  }

  function updateBarrier(id: string, patch: Partial<Barrier>) {
    update({ barriers: body.barriers.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }

  function removeBarrier(id: string) {
    update({ barriers: body.barriers.filter((b) => b.id !== id) });
  }

  return (
    <div className="inv-editor-body">
      <div className="form-group">
        <label>Incident Description</label>
        <textarea rows={3} value={body.incident_description}
          onChange={(e) => update({ incident_description: e.target.value })}
          placeholder="Describe the incident or event…" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Hazard</label>
          <input type="text" value={body.hazard}
            onChange={(e) => update({ hazard: e.target.value })}
            placeholder="What was the hazard?" />
        </div>
        <div className="form-group">
          <label>Target / What Was Protected</label>
          <input type="text" value={body.target}
            onChange={(e) => update({ target: e.target.value })}
            placeholder="Who or what was at risk?" />
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>
            Barriers{" "}
            <span style={{ background: "#ede9fe", color: "#4f46e5", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginLeft: 4, fontWeight: 600 }}>
              {body.barriers.length}
            </span>
          </label>
          <button className="ap-add-btn" onClick={addBarrier}>+ Add Barrier</button>
        </div>
        {body.barriers.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>No barriers added yet.</p>
        ) : (
          <div className="inv-barrier-table-wrap">
            <table className="inv-barrier-table">
              <thead>
                <tr>
                  <th>Barrier Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {body.barriers.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <input type="text" value={b.name} className="inv-table-input"
                        onChange={(e) => updateBarrier(b.id, { name: e.target.value })}
                        placeholder="Barrier name" />
                    </td>
                    <td>
                      <select value={b.type} className="inv-table-select"
                        onChange={(e) => updateBarrier(b.id, { type: e.target.value as Barrier["type"] })}>
                        <option value="physical">Physical</option>
                        <option value="administrative">Administrative</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="ppe">PPE</option>
                      </select>
                    </td>
                    <td>
                      <select value={b.status} className="inv-table-select"
                        style={{ color: BARRIER_STATUS_COLORS[b.status], fontWeight: 600 }}
                        onChange={(e) => updateBarrier(b.id, { status: e.target.value as Barrier["status"] })}>
                        <option value="effective">Effective</option>
                        <option value="failed">Failed</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                    <td>
                      <input type="text" value={b.notes} className="inv-table-input"
                        onChange={(e) => updateBarrier(b.id, { notes: e.target.value })}
                        placeholder="Optional notes" />
                    </td>
                    <td>
                      <button className="inv-remove-btn" onClick={() => removeBarrier(b.id)} title="Remove">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Recommendations</label>
        <textarea rows={3} value={body.recommendations}
          onChange={(e) => update({ recommendations: e.target.value })}
          placeholder="Recommended corrective actions…" />
      </div>
    </div>
  );
}

// ─── 5-Why Editor ─────────────────────────────────────────────────────────────

function FiveWhyEditor({
  body,
  onChange,
}: {
  body: FiveWhyBody;
  onChange: (b: FiveWhyBody) => void;
}) {
  function update(patch: Partial<FiveWhyBody>) {
    onChange({ ...body, ...patch });
  }

  function updateWhy(index: number, patch: Partial<WhyRow>) {
    update({ whys: body.whys.map((w, i) => (i === index ? { ...w, ...patch } : w)) });
  }

  return (
    <div className="inv-editor-body">
      <div className="form-group">
        <label style={{ fontSize: "1rem", fontWeight: 700 }}>Problem Statement</label>
        <textarea rows={3} value={body.problem_statement}
          onChange={(e) => update({ problem_statement: e.target.value })}
          placeholder="Describe the problem clearly and specifically…"
          style={{ fontSize: "0.95rem", borderLeft: "4px solid var(--color-primary)", paddingLeft: "0.875rem" }} />
      </div>

      <div className="inv-5why-chain">
        {body.whys.map((why, i) => (
          <div key={i} className="inv-5why-row">
            <div className="inv-5why-label">Why {i + 1}</div>
            <div className="inv-5why-fields">
              <input type="text" value={why.question}
                onChange={(e) => updateWhy(i, { question: e.target.value })}
                placeholder={i === 0 ? "Why did this happen?" : `Why? (because: ${body.whys[i - 1]?.answer || "…"})`}
                className="inv-5why-question" />
              <textarea rows={2} value={why.answer}
                onChange={(e) => updateWhy(i, { answer: e.target.value })}
                placeholder="Because…"
                className="inv-5why-answer" />
            </div>
            {i < body.whys.length - 1 && (
              <div className="inv-5why-arrow" aria-hidden="true">↓</div>
            )}
          </div>
        ))}
      </div>

      <div className="form-group inv-root-cause-field">
        <label>Root Cause</label>
        <textarea rows={2} value={body.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          placeholder="The identified root cause…" />
      </div>
      <div className="form-group">
        <label>Corrective Action</label>
        <textarea rows={2} value={body.corrective_action}
          onChange={(e) => update({ corrective_action: e.target.value })}
          placeholder="What will be done to address the root cause?" />
      </div>
    </div>
  );
}

// ─── Fishbone Editor ──────────────────────────────────────────────────────────

const LEFT_CATEGORIES = ["Machine", "Method", "Material"];
const RIGHT_CATEGORIES = ["Man", "Measurement", "Environment"];

function FishboneEditor({
  body,
  onChange,
}: {
  body: FishboneBody;
  onChange: (b: FishboneBody) => void;
}) {
  function update(patch: Partial<FishboneBody>) {
    onChange({ ...body, ...patch });
  }

  function updateCategory(id: string, causes: string[]) {
    update({ categories: body.categories.map((c) => (c.id === id ? { ...c, causes } : c)) });
  }

  function addCause(catId: string) {
    const cat = body.categories.find((c) => c.id === catId);
    if (cat) updateCategory(catId, [...cat.causes, ""]);
  }

  function updateCause(catId: string, idx: number, val: string) {
    const cat = body.categories.find((c) => c.id === catId);
    if (cat) updateCategory(catId, cat.causes.map((c, i) => (i === idx ? val : c)));
  }

  function removeCause(catId: string, idx: number) {
    const cat = body.categories.find((c) => c.id === catId);
    if (cat) updateCategory(catId, cat.causes.filter((_, i) => i !== idx));
  }

  function renderCategory(cat: FishboneCategory) {
    return (
      <div key={cat.id} className="inv-fishbone-category">
        <div className="inv-fishbone-cat-header">
          <span className="inv-fishbone-cat-label">{cat.name}</span>
          <button className="btn btn-sm btn-secondary" onClick={() => addCause(cat.id)}>+ Add cause</button>
        </div>
        <div className="inv-fishbone-causes">
          {cat.causes.length === 0 ? (
            <p className="inv-fishbone-empty">No causes yet</p>
          ) : (
            cat.causes.map((cause, idx) => (
              <div key={idx} className="inv-cause-item">
                <input type="text" value={cause}
                  onChange={(e) => updateCause(cat.id, idx, e.target.value)}
                  placeholder="Enter cause…" />
                <button className="inv-remove-btn" onClick={() => removeCause(cat.id, idx)} title="Remove">×</button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const leftCats = body.categories.filter((c) => LEFT_CATEGORIES.includes(c.name));
  const rightCats = body.categories.filter((c) => RIGHT_CATEGORIES.includes(c.name));

  return (
    <div className="inv-editor-body">
      <div className="form-group">
        <label style={{ fontSize: "1rem", fontWeight: 700 }}>Problem Statement (Effect)</label>
        <input type="text" value={body.problem_statement}
          onChange={(e) => update({ problem_statement: e.target.value })}
          placeholder="What is the problem / effect?"
          style={{ fontSize: "0.95rem", borderLeft: "4px solid var(--color-primary)", paddingLeft: "0.875rem" }} />
      </div>

      <div className="inv-fishbone-spine-hint" aria-hidden="true">
        <span>Causes</span>
        <div className="inv-fishbone-spine-line" />
        <span className="inv-fishbone-effect-box">{body.problem_statement || "Effect"}</span>
      </div>

      <div className="inv-fishbone-grid">
        <div className="inv-fishbone-col">
          <div className="inv-fishbone-col-label">Top factors</div>
          {leftCats.map(renderCategory)}
        </div>
        <div className="inv-fishbone-col">
          <div className="inv-fishbone-col-label">Contributing factors</div>
          {rightCats.map(renderCategory)}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: "1.5rem" }}>
        <label>Root Cause Summary</label>
        <textarea rows={2} value={body.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          placeholder="Summarize the identified root cause…" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [editBody, setEditBody] = useState<BarrierAnalysisBody | FiveWhyBody | FishboneBody | null>(null);
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);

  const loadInvestigation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/investigations/${id}`);
      const inv: Investigation = data.investigation;
      // Ensure five_why always has 5 rows
      if (inv.type === "five_why") {
        const fw = inv.body as FiveWhyBody;
        while (fw.whys.length < 5) fw.whys.push({ question: "", answer: "" });
      }
      setInvestigation(inv);
      setEditBody(inv.body);
      // Load the parent issue for breadcrumbs + PDF
      api.get(`/issues/${inv.issue_id}`)
        .then(({ data: d }) => setIssue(d.issue))
        .catch(() => {});
    } catch {
      setError("Analysis not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvestigation();
  }, [loadInvestigation]);

  // Breadcrumbs
  useEffect(() => {
    if (!investigation) return;
    const issueLabel = issue?.issue_number || (issue ? issue.title?.slice(0, 30) : "Issue");
    setBreadcrumbs([
      { label: "Home", path: "/" },
      { label: "Issues", path: "/" },
      { label: issueLabel, path: `/issues/${investigation.issue_id}` },
      { label: investigation.title },
    ]);
    return () => setBreadcrumbs([]);
  }, [investigation, issue, setBreadcrumbs]);

  async function handleSave() {
    if (!investigation || !editBody) return;
    setSaving(true);
    setSaveError("");
    try {
      await api.patch(`/investigations/${investigation.id}`, { body: editBody });
      setDirty(false);
      setInvestigation((prev) => prev ? { ...prev, body: editBody } : prev);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!investigation) return;
    const newStatus: InvStatus = investigation.status === "complete" ? "draft" : "complete";
    try {
      await api.patch(`/investigations/${investigation.id}`, { status: newStatus });
      setInvestigation((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to update status");
    }
  }

  async function handleDelete() {
    if (!investigation) return;
    if (!confirm(`Delete "${investigation.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/investigations/${investigation.id}`);
      navigate(`/issues/${investigation.issue_id}`);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to delete");
    }
  }

  function handleExportPDF() {
    if (!investigation || !editBody) return;
    const issueData = issue || { id: investigation.issue_id, title: "Issue" };
    const invWithBody = { ...investigation, body: editBody };
    if (investigation.type === "barrier_analysis") exportBarrierAnalysisPDF(invWithBody, issueData);
    else if (investigation.type === "five_why") exportFiveWhyPDF(invWithBody, issueData);
    else exportFishbonePDF(invWithBody, issueData);
  }

  function handleBodyChange(body: BarrierAnalysisBody | FiveWhyBody | FishboneBody) {
    setEditBody(body);
    setDirty(true);
  }

  if (loading) return <p className="loading">Loading…</p>;
  if (error || !investigation || !editBody) return <p className="error">{error || "Analysis not found."}</p>;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/issues/${investigation.issue_id}`)}
          style={{ flexShrink: 0 }}
        >
          ← Back to Issue
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18 }}>{TYPE_ICONS[investigation.type]}</span>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
              background: "rgba(99,102,241,0.15)", color: "#a5b4fc", letterSpacing: "0.04em"
            }}>
              {TYPE_LABELS[investigation.type]}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
              background: investigation.status === "complete" ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.15)",
              color: investigation.status === "complete" ? "#10b981" : "#f59e0b",
            }}>
              {investigation.status === "complete" ? "✓ Complete" : "● Draft"}
            </span>
            {dirty && (
              <span style={{ fontSize: 11, color: "#f59e0b" }}>Unsaved changes</span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700, color: "var(--color-text)" }}>
            {investigation.title}
          </h1>
          {investigation.creator_name && (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
              Created by {investigation.creator_name} · {fmtDate(investigation.created_at)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={handleExportPDF}>📤 Export PDF</button>
          <button className="btn btn-secondary" onClick={handleToggleStatus}>
            {investigation.status === "complete" ? "↩ Reopen" : "✓ Mark Complete"}
          </button>
          <button
            className="btn-submit"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save →"}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {saveError && <p className="error" style={{ marginBottom: "1rem" }}>{saveError}</p>}

      {/* ── Editor card ── */}
      <div className="tile" style={{ padding: "1.5rem" }}>
        {investigation.type === "barrier_analysis" && (
          <BarrierAnalysisEditor
            body={editBody as BarrierAnalysisBody}
            onChange={handleBodyChange}
          />
        )}
        {investigation.type === "five_why" && (
          <FiveWhyEditor
            body={editBody as FiveWhyBody}
            onChange={handleBodyChange}
          />
        )}
        {investigation.type === "fishbone" && (
          <FishboneEditor
            body={editBody as FishboneBody}
            onChange={handleBodyChange}
          />
        )}
      </div>

    </div>
  );
}
