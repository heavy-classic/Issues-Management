import { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import {
  exportBarrierAnalysisPDF,
  exportFiveWhyPDF,
  exportFishbonePDF,
} from "../utils/exportUtils";

// ─── Types ──────────────────────────────────────────────────────────────────

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
  created_at: string;
  updated_at: string;
  body?: BarrierAnalysisBody | FiveWhyBody | FishboneBody;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<InvType, string> = {
  barrier_analysis: "Barrier Analysis",
  five_why: "5 Why",
  fishbone: "Fishbone",
};

const TYPE_ICONS: Record<InvType, string> = {
  barrier_analysis: "🔲",
  five_why: "🔢",
  fishbone: "🐟",
};

const DEFAULT_BARRIER_BODY: BarrierAnalysisBody = {
  incident_description: "",
  hazard: "",
  target: "",
  barriers: [],
  recommendations: "",
};

const DEFAULT_FIVE_WHY_BODY: FiveWhyBody = {
  problem_statement: "",
  whys: Array.from({ length: 5 }, () => ({ question: "", answer: "" })),
  root_cause: "",
  corrective_action: "",
};

const FISHBONE_CATEGORIES = [
  "Machine",
  "Method",
  "Material",
  "Man",
  "Measurement",
  "Environment",
];

function makeDefaultFishboneBody(): FishboneBody {
  return {
    problem_statement: "",
    categories: FISHBONE_CATEGORIES.map((name) => ({
      id: crypto.randomUUID(),
      name,
      causes: [],
    })),
    root_cause: "",
  };
}

// ─── Barrier Analysis Editor ─────────────────────────────────────────────────

const BARRIER_STATUS_COLORS: Record<string, string> = {
  effective: "#10b981",
  failed: "#ef4444",
  absent: "#9ca3af",
};

interface BarrierAnalysisEditorProps {
  body: BarrierAnalysisBody;
  onChange: (body: BarrierAnalysisBody) => void;
  isReadOnly: boolean;
}

function BarrierAnalysisEditor({
  body,
  onChange,
  isReadOnly,
}: BarrierAnalysisEditorProps) {
  function update(patch: Partial<BarrierAnalysisBody>) {
    onChange({ ...body, ...patch });
  }

  function addBarrier() {
    const newBarrier: Barrier = {
      id: crypto.randomUUID(),
      name: "",
      type: "physical",
      status: "absent",
      notes: "",
    };
    update({ barriers: [...body.barriers, newBarrier] });
  }

  function updateBarrier(id: string, patch: Partial<Barrier>) {
    update({
      barriers: body.barriers.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    });
  }

  function removeBarrier(id: string) {
    update({ barriers: body.barriers.filter((b) => b.id !== id) });
  }

  return (
    <div className="inv-editor-body">
      <div className="form-group">
        <label>Incident Description</label>
        <textarea
          rows={3}
          value={body.incident_description}
          onChange={(e) => update({ incident_description: e.target.value })}
          disabled={isReadOnly}
          placeholder="Describe the incident..."
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Hazard</label>
          <input
            type="text"
            value={body.hazard}
            onChange={(e) => update({ hazard: e.target.value })}
            disabled={isReadOnly}
            placeholder="What was the hazard?"
          />
        </div>
        <div className="form-group">
          <label>Target / What Was Protected</label>
          <input
            type="text"
            value={body.target}
            onChange={(e) => update({ target: e.target.value })}
            disabled={isReadOnly}
            placeholder="Who or what was at risk?"
          />
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div className="section-header-row" style={{ marginBottom: "0.5rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            Barriers{" "}
            <span className="section-count-badge">{body.barriers.length}</span>
          </label>
          {!isReadOnly && (
            <button className="btn btn-sm btn-secondary" onClick={addBarrier}>
              + Add Barrier
            </button>
          )}
        </div>

        {body.barriers.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.875rem" }}>
            No barriers added yet.
          </p>
        ) : (
          <div className="inv-barrier-table-wrap">
            <table className="inv-barrier-table">
              <thead>
                <tr>
                  <th>Barrier Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Notes</th>
                  {!isReadOnly && <th style={{ width: 40 }}></th>}
                </tr>
              </thead>
              <tbody>
                {body.barriers.map((barrier) => (
                  <tr key={barrier.id}>
                    <td>
                      <input
                        type="text"
                        value={barrier.name}
                        onChange={(e) =>
                          updateBarrier(barrier.id, { name: e.target.value })
                        }
                        disabled={isReadOnly}
                        placeholder="Barrier name"
                        className="inv-table-input"
                      />
                    </td>
                    <td>
                      <select
                        value={barrier.type}
                        onChange={(e) =>
                          updateBarrier(barrier.id, {
                            type: e.target.value as Barrier["type"],
                          })
                        }
                        disabled={isReadOnly}
                        className="inv-table-select"
                      >
                        <option value="physical">Physical</option>
                        <option value="administrative">Administrative</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="ppe">PPE</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={barrier.status}
                        onChange={(e) =>
                          updateBarrier(barrier.id, {
                            status: e.target.value as Barrier["status"],
                          })
                        }
                        disabled={isReadOnly}
                        className="inv-table-select"
                        style={{
                          color: BARRIER_STATUS_COLORS[barrier.status],
                          fontWeight: 600,
                        }}
                      >
                        <option value="effective">Effective</option>
                        <option value="failed">Failed</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={barrier.notes}
                        onChange={(e) =>
                          updateBarrier(barrier.id, { notes: e.target.value })
                        }
                        disabled={isReadOnly}
                        placeholder="Optional notes"
                        className="inv-table-input"
                      />
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          className="inv-remove-btn"
                          onClick={() => removeBarrier(barrier.id)}
                          title="Remove barrier"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Recommendations</label>
        <textarea
          rows={3}
          value={body.recommendations}
          onChange={(e) => update({ recommendations: e.target.value })}
          disabled={isReadOnly}
          placeholder="Recommended corrective actions..."
        />
      </div>
    </div>
  );
}

// ─── Five Why Editor ─────────────────────────────────────────────────────────

interface FiveWhyEditorProps {
  body: FiveWhyBody;
  onChange: (body: FiveWhyBody) => void;
  isReadOnly: boolean;
}

function FiveWhyEditor({ body, onChange, isReadOnly }: FiveWhyEditorProps) {
  function update(patch: Partial<FiveWhyBody>) {
    onChange({ ...body, ...patch });
  }

  function updateWhy(index: number, patch: Partial<WhyRow>) {
    const whys = body.whys.map((w, i) => (i === index ? { ...w, ...patch } : w));
    update({ whys });
  }

  return (
    <div className="inv-editor-body">
      <div className="form-group">
        <label style={{ fontSize: "1rem", fontWeight: 700 }}>
          Problem Statement
        </label>
        <textarea
          rows={3}
          value={body.problem_statement}
          onChange={(e) => update({ problem_statement: e.target.value })}
          disabled={isReadOnly}
          placeholder="Describe the problem clearly and specifically..."
          style={{
            fontSize: "0.95rem",
            borderLeft: "4px solid var(--color-primary)",
            paddingLeft: "0.875rem",
          }}
        />
      </div>

      <div className="inv-5why-chain">
        {body.whys.map((why, i) => (
          <div key={i} className="inv-5why-row">
            <div className="inv-5why-label">Why {i + 1}</div>
            <div className="inv-5why-fields">
              <input
                type="text"
                value={why.question}
                onChange={(e) => updateWhy(i, { question: e.target.value })}
                disabled={isReadOnly}
                placeholder={
                  i === 0
                    ? "Why did this happen?"
                    : `Why? (because: ${body.whys[i - 1]?.answer || "..."})`
                }
                className="inv-5why-question"
              />
              <textarea
                rows={2}
                value={why.answer}
                onChange={(e) => updateWhy(i, { answer: e.target.value })}
                disabled={isReadOnly}
                placeholder="Because..."
                className="inv-5why-answer"
              />
            </div>
            {i < body.whys.length - 1 && (
              <div className="inv-5why-arrow" aria-hidden="true">↓</div>
            )}
          </div>
        ))}
      </div>

      <div className="form-group inv-root-cause-field">
        <label>Root Cause</label>
        <textarea
          rows={2}
          value={body.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          disabled={isReadOnly}
          placeholder="The identified root cause..."
        />
      </div>

      <div className="form-group">
        <label>Corrective Action</label>
        <textarea
          rows={2}
          value={body.corrective_action}
          onChange={(e) => update({ corrective_action: e.target.value })}
          disabled={isReadOnly}
          placeholder="What will be done to address the root cause?"
        />
      </div>
    </div>
  );
}

// ─── Fishbone Editor ─────────────────────────────────────────────────────────

interface FishboneEditorProps {
  body: FishboneBody;
  onChange: (body: FishboneBody) => void;
  isReadOnly: boolean;
}

// Left side: Machine, Method, Material — Right side: Man, Measurement, Environment
const LEFT_CATEGORIES = ["Machine", "Method", "Material"];
const RIGHT_CATEGORIES = ["Man", "Measurement", "Environment"];

function FishboneEditor({ body, onChange, isReadOnly }: FishboneEditorProps) {
  function update(patch: Partial<FishboneBody>) {
    onChange({ ...body, ...patch });
  }

  function updateCategory(id: string, causes: string[]) {
    update({
      categories: body.categories.map((c) =>
        c.id === id ? { ...c, causes } : c
      ),
    });
  }

  function addCause(catId: string) {
    const cat = body.categories.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, [...cat.causes, ""]);
  }

  function updateCause(catId: string, idx: number, val: string) {
    const cat = body.categories.find((c) => c.id === catId);
    if (!cat) return;
    const causes = cat.causes.map((c, i) => (i === idx ? val : c));
    updateCategory(catId, causes);
  }

  function removeCause(catId: string, idx: number) {
    const cat = body.categories.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(
      catId,
      cat.causes.filter((_, i) => i !== idx)
    );
  }

  function renderCategory(cat: FishboneCategory) {
    return (
      <div key={cat.id} className="inv-fishbone-category">
        <div className="inv-fishbone-cat-header">
          <span className="inv-fishbone-cat-label">{cat.name}</span>
          {!isReadOnly && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => addCause(cat.id)}
            >
              + Add cause
            </button>
          )}
        </div>
        <div className="inv-fishbone-causes">
          {cat.causes.length === 0 ? (
            <p className="inv-fishbone-empty">No causes yet</p>
          ) : (
            cat.causes.map((cause, idx) => (
              <div key={idx} className="inv-cause-item">
                <input
                  type="text"
                  value={cause}
                  onChange={(e) => updateCause(cat.id, idx, e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Enter cause..."
                />
                {!isReadOnly && (
                  <button
                    className="inv-remove-btn"
                    onClick={() => removeCause(cat.id, idx)}
                    title="Remove cause"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const leftCats = body.categories.filter((c) =>
    LEFT_CATEGORIES.includes(c.name)
  );
  const rightCats = body.categories.filter((c) =>
    RIGHT_CATEGORIES.includes(c.name)
  );

  return (
    <div className="inv-editor-body">
      <div className="form-group">
        <label style={{ fontSize: "1rem", fontWeight: 700 }}>
          Problem Statement (Effect)
        </label>
        <input
          type="text"
          value={body.problem_statement}
          onChange={(e) => update({ problem_statement: e.target.value })}
          disabled={isReadOnly}
          placeholder="What is the problem / effect?"
          style={{
            fontSize: "0.95rem",
            borderLeft: "4px solid var(--color-primary)",
            paddingLeft: "0.875rem",
          }}
        />
      </div>

      {/* Visual fishbone spine hint */}
      <div className="inv-fishbone-spine-hint" aria-hidden="true">
        <span>Causes</span>
        <div className="inv-fishbone-spine-line" />
        <span className="inv-fishbone-effect-box">
          {body.problem_statement || "Effect"}
        </span>
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
        <textarea
          rows={2}
          value={body.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          disabled={isReadOnly}
          placeholder="Summarize the identified root cause..."
        />
      </div>
    </div>
  );
}

// ─── New Investigation Modal ─────────────────────────────────────────────────

interface NewInvModalProps {
  onClose: () => void;
  onCreate: (type: InvType, title: string) => Promise<void>;
}

function NewInvModal({ onClose, onCreate }: NewInvModalProps) {
  const [type, setType] = useState<InvType>("barrier_analysis");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate(type, title.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>New Investigation</h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Investigation Type</label>
            <div
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
            >
              {(["barrier_analysis", "five_why", "fishbone"] as InvType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn ${type === t ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setType(t)}
                    style={{ flex: "1 1 auto" }}
                  >
                    {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Barrier Analysis — Aug Incident"
              autoFocus
              required
            />
          </div>
          <div className="form-actions" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? "Creating..." : "Create Investigation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface Props {
  issueId: string;
  isReadOnly?: boolean;
}

export default function InvestigationPanel({
  issueId,
  isReadOnly = false,
}: Props) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selected, setSelected] = useState<Investigation | null>(null);
  const [editBody, setEditBody] = useState<
    BarrierAnalysisBody | FiveWhyBody | FishboneBody | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── issue data (for PDF export) ──
  const [issue, setIssue] = useState<any>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/issues/${issueId}/investigations`);
      setInvestigations(data.investigations);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load investigations");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    loadList();
    // load issue for PDF metadata
    api.get(`/issues/${issueId}`).then(({ data }) => setIssue(data.issue)).catch(() => {});
  }, [issueId, loadList]);

  async function openInvestigation(inv: Investigation) {
    try {
      const { data } = await api.get(`/investigations/${inv.id}`);
      const full: Investigation = data.investigation;
      // Ensure body defaults are set
      let body = full.body;
      if (!body) {
        if (full.type === "barrier_analysis") body = { ...DEFAULT_BARRIER_BODY };
        else if (full.type === "five_why") body = { ...DEFAULT_FIVE_WHY_BODY };
        else body = makeDefaultFishboneBody();
      }
      // Ensure five_why always has 5 whys
      if (full.type === "five_why") {
        const fw = body as FiveWhyBody;
        while (fw.whys.length < 5) fw.whys.push({ question: "", answer: "" });
      }
      setSelected({ ...full, body });
      setEditBody(body);
      setSaveError("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load investigation");
    }
  }

  async function handleCreate(type: InvType, title: string) {
    const { data } = await api.post(`/issues/${issueId}/investigations`, {
      type,
      title,
    });
    setShowNewModal(false);
    await loadList();
    openInvestigation(data.investigation);
  }

  async function handleSave() {
    if (!selected || !editBody) return;
    setSaving(true);
    setSaveError("");
    try {
      await api.patch(`/investigations/${selected.id}`, { body: editBody });
      // Refresh the list item
      setInvestigations((prev) =>
        prev.map((i) =>
          i.id === selected.id ? { ...i, body: editBody } : i
        )
      );
      setSelected((prev) => (prev ? { ...prev, body: editBody } : prev));
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!selected) return;
    const newStatus: InvStatus =
      selected.status === "complete" ? "draft" : "complete";
    try {
      await api.patch(`/investigations/${selected.id}`, { status: newStatus });
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setInvestigations((prev) =>
        prev.map((i) =>
          i.id === selected.id ? { ...i, status: newStatus } : i
        )
      );
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to update status");
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (
      !window.confirm(
        `Delete "${selected.title}"? This cannot be undone.`
      )
    )
      return;
    try {
      await api.delete(`/investigations/${selected.id}`);
      setSelected(null);
      setEditBody(null);
      loadList();
    } catch (err: any) {
      setSaveError(err.response?.data?.error || "Failed to delete");
    }
  }

  function handleExportPDF() {
    if (!selected || !editBody) return;
    const issueData = issue || { id: issueId, title: "Issue" };
    const invWithBody = { ...selected, body: editBody };
    if (selected.type === "barrier_analysis") {
      exportBarrierAnalysisPDF(invWithBody, issueData);
    } else if (selected.type === "five_why") {
      exportFiveWhyPDF(invWithBody, issueData);
    } else {
      exportFishbonePDF(invWithBody, issueData);
    }
  }

  // ── List view ──

  if (selected) {
    return (
      <div className="inv-panel">
        {/* Editor header */}
        <div className="inv-editor-header">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setSelected(null);
              setEditBody(null);
            }}
          >
            ← Back to list
          </button>

          <div className="inv-editor-title">
            <span className="inv-type-badge inv-type-badge--{selected.type}">
              {TYPE_ICONS[selected.type]} {TYPE_LABELS[selected.type]}
            </span>
            <h3>{selected.title}</h3>
            <span
              className={`inv-status-badge ${
                selected.status === "complete"
                  ? "inv-status-badge--complete"
                  : "inv-status-badge--draft"
              }`}
            >
              {selected.status}
            </span>
          </div>

          <div className="inv-editor-actions">
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleExportPDF}
              title="Export PDF"
            >
              ↓ PDF
            </button>
            {!isReadOnly && (
              <>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleToggleStatus}
                >
                  {selected.status === "complete"
                    ? "↩ Reopen"
                    : "✓ Mark Complete"}
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {saveError && (
          <p className="error" style={{ margin: "0.5rem 0" }}>
            {saveError}
          </p>
        )}

        <div className="inv-editor">
          {selected.type === "barrier_analysis" && editBody && (
            <BarrierAnalysisEditor
              body={editBody as BarrierAnalysisBody}
              onChange={setEditBody}
              isReadOnly={isReadOnly}
            />
          )}
          {selected.type === "five_why" && editBody && (
            <FiveWhyEditor
              body={editBody as FiveWhyBody}
              onChange={setEditBody}
              isReadOnly={isReadOnly}
            />
          )}
          {selected.type === "fishbone" && editBody && (
            <FishboneEditor
              body={editBody as FishboneBody}
              onChange={setEditBody}
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="inv-panel">
      <div className="section-header-row">
        <h3>
          Investigations{" "}
          <span className="section-count-badge">{investigations.length}</span>
        </h3>
        {!isReadOnly && (
          <button
            className="btn btn-secondary"
            onClick={() => setShowNewModal(true)}
          >
            + New Investigation
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="text-muted">Loading investigations...</p>
      ) : investigations.length === 0 ? (
        <p className="text-muted">
          No investigations yet.{" "}
          {!isReadOnly && (
            <button
              className="btn btn-sm btn-primary"
              style={{ marginLeft: "0.5rem" }}
              onClick={() => setShowNewModal(true)}
            >
              Create one
            </button>
          )}
        </p>
      ) : (
        <div className="inv-list">
          {investigations.map((inv) => (
            <div
              key={inv.id}
              className="inv-list-item"
              onClick={() => openInvestigation(inv)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openInvestigation(inv);
              }}
            >
              <span className="inv-type-icon">{TYPE_ICONS[inv.type]}</span>
              <div className="inv-list-info">
                <span className="inv-list-title">{inv.title}</span>
                <span className="inv-type-badge">
                  {TYPE_LABELS[inv.type]}
                </span>
              </div>
              <div className="inv-list-meta">
                <span
                  className={`inv-status-badge ${
                    inv.status === "complete"
                      ? "inv-status-badge--complete"
                      : "inv-status-badge--draft"
                  }`}
                >
                  {inv.status}
                </span>
                <span className="inv-list-date">
                  {new Date(inv.created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="inv-list-chevron">›</span>
            </div>
          ))}
        </div>
      )}

      {showNewModal && (
        <NewInvModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
