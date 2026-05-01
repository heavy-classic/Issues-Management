import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

// Hardcoded statuses for record types that don't use a stages table
const AUDIT_STATUSES = [
  { key: "draft",        label: "Draft" },
  { key: "scheduled",   label: "Scheduled" },
  { key: "planning",    label: "Planning" },
  { key: "in_progress", label: "In Progress" },
  { key: "under_review",label: "Under Review" },
  { key: "closed",      label: "Closed" },
];

const RISK_STATUSES = [
  { key: "identified",       label: "Identified" },
  { key: "under_assessment", label: "Under Assessment" },
  { key: "assessed",         label: "Assessed" },
  { key: "in_treatment",     label: "In Treatment" },
  { key: "monitoring",       label: "Monitoring" },
  { key: "under_review",     label: "Under Review" },
  { key: "accepted",         label: "Accepted" },
  { key: "closed",           label: "Closed" },
];

type RecordType = "issues" | "risks" | "audits" | "lessons" | "procedures";

interface Stage { id: string; name: string; position: number; color: string; }

const TABS: { key: RecordType; label: string; icon: string }[] = [
  { key: "issues",     label: "Issues",     icon: "🚨" },
  { key: "risks",      label: "Risks",      icon: "🛡️" },
  { key: "audits",     label: "Audits",     icon: "📋" },
  { key: "lessons",    label: "Lessons",    icon: "💡" },
  { key: "procedures", label: "Procedures", icon: "📄" },
];

export default function AdminInstructionsPage() {
  const [activeTab, setActiveTab] = useState<RecordType>("issues");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [issueStages, setIssueStages] = useState<Stage[]>([]);
  const [lessonStages, setLessonStages] = useState<Stage[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // All the settings keys we care about
  const allKeys = useCallback(() => {
    const keys = [
      "issue_instructions",
      "risk_instructions",
      "audit_instructions",
      "lesson_instructions",
      "procedure_instructions",
      ...issueStages.map((s) => `instructions:issues:stage:${s.id}`),
      ...lessonStages.map((s) => `instructions:lessons:stage:${s.id}`),
      ...AUDIT_STATUSES.map((s) => `instructions:audits:status:${s.key}`),
      ...RISK_STATUSES.map((s) => `instructions:risks:status:${s.key}`),
    ];
    return keys;
  }, [issueStages, lessonStages]);

  // Fetch stages and all settings in parallel
  useEffect(() => {
    Promise.all([
      api.get("/workflow-stages").catch(() => ({ data: { stages: [] } })),
      api.get("/lesson-workflow-stages").catch(() => ({ data: { stages: [] } })),
    ]).then(([issRes, lesRes]) => {
      const iStages: Stage[] = (issRes.data.stages || []).sort((a: Stage, b: Stage) => a.position - b.position);
      const lStages: Stage[] = (lesRes.data.stages || []).sort((a: Stage, b: Stage) => a.position - b.position);
      setIssueStages(iStages);
      setLessonStages(lStages);
    });
  }, []);

  // Once stages are loaded, fetch all setting values
  useEffect(() => {
    const keys = allKeys();
    if (keys.length === 0) return;

    Promise.all(
      keys.map((k) =>
        api.get(`/settings/${encodeURIComponent(k)}`).then((r) => [k, r.data.value ?? ""] as [string, string]).catch(() => [k, ""] as [string, string])
      )
    ).then((pairs) => {
      const map: Record<string, string> = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      setSettings(map);
      setLoading(false);
    });
  }, [allKeys]);

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(key: string) {
    setSaving((p) => ({ ...p, [key]: true }));
    try {
      await api.put(`/settings/${encodeURIComponent(key)}`, { value: settings[key] ?? "" });
      setSaved((p) => ({ ...p, [key]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2500);
    } finally {
      setSaving((p) => ({ ...p, [key]: false }));
    }
  }

  function InstructionBlock({
    settingKey,
    label,
    hint,
  }: {
    settingKey: string;
    label: string;
    hint?: string;
  }) {
    return (
      <div className="instr-block">
        <div className="instr-block-hd">
          <div>
            <div className="instr-block-label">{label}</div>
            {hint && <div className="instr-block-hint">{hint}</div>}
          </div>
          <button
            className="btn-submit"
            style={{ fontSize: 12, padding: "6px 18px", whiteSpace: "nowrap" }}
            onClick={() => handleSave(settingKey)}
            disabled={saving[settingKey]}
          >
            {saved[settingKey] ? "✓ Saved" : saving[settingKey] ? "Saving…" : "Save →"}
          </button>
        </div>

        {/* Preview */}
        {settings[settingKey] && (
          <div className="if-instructions" style={{ marginBottom: 10 }}>
            <div className="if-inst-icon">ℹ</div>
            <div className="if-inst-body">
              {settings[settingKey].split("\n").map((line, i) =>
                line.trim() === "" ? (
                  <div key={i} style={{ height: 5 }} />
                ) : (
                  <p key={i} style={{ margin: 0, lineHeight: 1.6 }}>{line}</p>
                )
              )}
            </div>
          </div>
        )}

        <textarea
          value={settings[settingKey] ?? ""}
          onChange={(e) => handleChange(settingKey, e.target.value)}
          rows={6}
          className="instr-textarea"
          placeholder="Enter instructions shown to users… (leave blank to hide)"
        />
      </div>
    );
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
          Contextual Instructions
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
          Set instructions shown to users at the top of each form or record screen. Leave blank to hide. Changes save per-section.
        </p>
      </div>

      {/* Record type tabs */}
      <div className="instr-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`instr-tab${activeTab === tab.key ? " instr-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="instr-tab-body">

        {/* ── ISSUES ── */}
        {activeTab === "issues" && (
          <div>
            <InstructionBlock
              settingKey="issue_instructions"
              label="New Issue Form"
              hint="Shown at the top of the New Issue submission form."
            />
            {issueStages.length > 0 && (
              <>
                <div className="instr-section-title">Workflow Stage Instructions</div>
                <p className="instr-section-hint">
                  Each instruction appears at the top of the issue detail view when the issue is at that stage.
                </p>
                {issueStages.map((stage) => (
                  <InstructionBlock
                    key={stage.id}
                    settingKey={`instructions:issues:stage:${stage.id}`}
                    label={stage.name}
                    hint={`Shown when an issue is in the "${stage.name}" stage.`}
                  />
                ))}
              </>
            )}
            {issueStages.length === 0 && (
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 12 }}>
                No workflow stages configured. Add stages in <strong>Admin → Workflow</strong> to set stage-level instructions.
              </p>
            )}
          </div>
        )}

        {/* ── RISKS ── */}
        {activeTab === "risks" && (
          <div>
            <InstructionBlock
              settingKey="risk_instructions"
              label="New Risk Form"
              hint="Shown at the top of the New Risk form."
            />
            <div className="instr-section-title">Status Instructions</div>
            <p className="instr-section-hint">
              Each instruction appears at the top of the risk detail view when the risk is at that status.
            </p>
            {RISK_STATUSES.map((s) => (
              <InstructionBlock
                key={s.key}
                settingKey={`instructions:risks:status:${s.key}`}
                label={s.label}
                hint={`Shown when a risk is in "${s.label}" status.`}
              />
            ))}
          </div>
        )}

        {/* ── AUDITS ── */}
        {activeTab === "audits" && (
          <div>
            <InstructionBlock
              settingKey="audit_instructions"
              label="New Audit Form"
              hint="Shown at the top of the New Audit form."
            />
            <div className="instr-section-title">Status Instructions</div>
            <p className="instr-section-hint">
              Each instruction appears at the top of the audit detail view when the audit is at that status.
            </p>
            {AUDIT_STATUSES.map((s) => (
              <InstructionBlock
                key={s.key}
                settingKey={`instructions:audits:status:${s.key}`}
                label={s.label}
                hint={`Shown when an audit is in "${s.label}" status.`}
              />
            ))}
          </div>
        )}

        {/* ── LESSONS ── */}
        {activeTab === "lessons" && (
          <div>
            <InstructionBlock
              settingKey="lesson_instructions"
              label="New Lesson Form"
              hint="Shown at the top of the New Lesson Learned form."
            />
            {lessonStages.length > 0 && (
              <>
                <div className="instr-section-title">Workflow Stage Instructions</div>
                <p className="instr-section-hint">
                  Each instruction appears at the top of the lesson detail view when the lesson is at that stage.
                </p>
                {lessonStages.map((stage) => (
                  <InstructionBlock
                    key={stage.id}
                    settingKey={`instructions:lessons:stage:${stage.id}`}
                    label={stage.name}
                    hint={`Shown when a lesson is in the "${stage.name}" stage.`}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── PROCEDURES ── */}
        {activeTab === "procedures" && (
          <div>
            <InstructionBlock
              settingKey="procedure_instructions"
              label="New Procedure Form"
              hint="Shown at the top of the New Procedure form."
            />
          </div>
        )}

      </div>
    </div>
  );
}
