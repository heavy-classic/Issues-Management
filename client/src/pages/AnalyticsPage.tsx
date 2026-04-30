import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import BIDashboardPage from "./BIDashboardPage";
import AuditAnalyticsPage from "./AuditAnalyticsPage";
import RiskAnalyticsPage from "./RiskAnalyticsPage";
import LessonAnalyticsPage from "./LessonAnalyticsPage";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "issues", label: "Issues" },
  { key: "audits", label: "Audits" },
  { key: "risks", label: "Risks" },
  { key: "lessons", label: "Lessons" },
];

const AVATAR_COLORS = ["#4f46e5", "#3b82f6", "#0ea5e9", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6"];
function avColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function today() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  function handleTab(tab: string) {
    setSearchParams({ tab });
  }

  return (
    <div>
      <div className="app-tabs" style={{ marginBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? " active" : ""}`}
            onClick={() => handleTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewDashboard />}
      {activeTab === "issues" && <BIDashboardPage embedded />}
      {activeTab === "audits" && <AuditAnalyticsPage embedded />}
      {activeTab === "risks" && <RiskAnalyticsPage embedded />}
      {activeTab === "lessons" && <LessonAnalyticsPage embedded />}
    </div>
  );
}

function OverviewDashboard() {
  const [kpis, setKpis] = useState<any>({});
  const [stageData, setStageData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [kpiRes, stageRes, trendRes, issuesRes] = await Promise.all([
        api.get("/dashboard/kpis"),
        api.get("/dashboard/issues-by-stage"),
        api.get("/dashboard/issue-trend"),
        api.get("/issues?limit=5&sort_by=created_at&sort_dir=desc"),
      ]);
      setKpis(kpiRes.data);
      setStageData(stageRes.data.data || []);
      setTrendData(trendRes.data.data || []);
      setRecentIssues(issuesRes.data.issues || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="loading">Loading…</div>;

  const maxStage = Math.max(...stageData.map((s: any) => s.value || s.count || 0), 1);
  const maxTrend = Math.max(...trendData.map((t: any) => t.count || t.value || 0), 1);
  const trendBars = trendData.slice(-8);

  const openIssues = kpis.openIssues ?? 0;
  const totalIssues = kpis.totalIssues ?? 0;
  const completedActions = kpis.completedActions ?? 0;
  const avgDays = kpis.avgResolutionDays ?? 0;

  return (
    <div className="db-bento-area">
      <div className="db-page-title">
        Analytics Overview
        <small>{today()}</small>
      </div>

      <div className="db-bento">

        {/* ── KPI tiles ── */}
        <div className="db-tile db-t1" style={{ position: "relative" }}>
          <span className="db-stat-icon">⚑</span>
          <div className="db-stat-val">{openIssues}</div>
          <div className="db-stat-label">Open Issues</div>
          <div className="db-stat-delta db-delta-neutral">of {totalIssues} total</div>
        </div>

        <div className="db-tile db-t1" style={{ position: "relative" }}>
          <span className="db-stat-icon">☑</span>
          <div className="db-stat-val" style={{ color: "#10b981" }}>{completedActions}</div>
          <div className="db-stat-label">Completed Actions</div>
          <div className="db-stat-delta db-delta-down">actions closed</div>
        </div>

        <div className="db-tile db-t1" style={{ position: "relative" }}>
          <span className="db-stat-icon">⏱</span>
          <div className="db-stat-val" style={{ color: "#f59e0b" }}>
            {typeof avgDays === "number" ? avgDays.toFixed(1) : avgDays}
          </div>
          <div className="db-stat-label">Avg Resolution Days</div>
          <div className="db-stat-delta db-delta-neutral">days to close</div>
        </div>

        <div className="db-tile db-t1" style={{ position: "relative" }}>
          <span className="db-stat-icon">📊</span>
          <div className="db-stat-val" style={{ color: "#4f46e5" }}>{totalIssues}</div>
          <div className="db-stat-label">Total Issues</div>
          <div className="db-stat-delta db-delta-neutral">all time</div>
        </div>

        <div className="db-tile db-t1" style={{ position: "relative" }}>
          <span className="db-stat-icon">📋</span>
          <div className="db-stat-val">{kpis.totalAudits ?? "—"}</div>
          <div className="db-stat-label">Active Audits</div>
          <div className="db-stat-delta db-delta-neutral">in progress</div>
        </div>

        <div className="db-tile db-t1" style={{ position: "relative" }}>
          <span className="db-stat-icon">◈</span>
          <div className="db-stat-val">{kpis.openRisks ?? "—"}</div>
          <div className="db-stat-label">Open Risks</div>
          <div className="db-stat-delta db-delta-neutral">registered</div>
        </div>

        {/* ── Issues by Stage ── */}
        <div className="db-tile db-t2">
          <div className="db-tile-label acc">Issues by Stage</div>
          {stageData.length === 0 ? (
            <p style={{ color: "#c7d2fe", fontSize: 12 }}>No stage data.</p>
          ) : (
            stageData.map((s: any, i: number) => {
              const val = s.value || s.count || 0;
              const pct = Math.round((val / maxStage) * 100);
              const color = i === 0 ? "#4f46e5" : i === stageData.length - 1 ? "#e11d48" : i > stageData.length / 2 ? "#d97706" : "#4f46e5";
              return (
                <div key={s.name || i}>
                  <div className="db-prog-row">
                    <span className="db-prog-name">{s.name}</span>
                    <span className="db-prog-val">{val}</span>
                  </div>
                  <div className="db-prog-bar">
                    <div className="db-prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Issue Trend Sparkline ── */}
        <div className="db-tile db-t2">
          <div className="db-tile-label acc">New Issues — Recent Weeks</div>
          {trendBars.length === 0 ? (
            <p style={{ color: "#c7d2fe", fontSize: 12 }}>No trend data.</p>
          ) : (
            <>
              <div className="db-sparkline">
                {trendBars.map((t: any, i: number) => {
                  const val = t.count || t.value || 0;
                  const h = Math.max(4, Math.round((val / maxTrend) * 100));
                  const isLast = i === trendBars.length - 1;
                  return (
                    <div
                      key={i}
                      className={`db-sp-bar${isLast ? " db-sp-active" : ""}`}
                      style={{ height: `${h}%` }}
                      title={`${t.date || t.week || ""}: ${val}`}
                    />
                  );
                })}
              </div>
              <div className="db-sp-labels">
                {trendBars.filter((_: any, i: number) => i % 2 === 0).map((t: any, i: number) => (
                  <span key={i}>{t.date ? fmtDate(t.date) : (t.week || "")}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div className="db-tile db-t2">
          <div className="db-tile-label acc">Quick Actions</div>
          <div className="db-qa-grid">
            <Link to="/" className="db-qa-btn" style={{ textDecoration: "none" }}>
              <div className="db-qa-ico">⚑</div>
              <div className="db-qa-lbl">Issues</div>
              <div className="db-qa-sub">View all issues</div>
            </Link>
            <Link to="/audits" className="db-qa-btn" style={{ textDecoration: "none" }}>
              <div className="db-qa-ico">📋</div>
              <div className="db-qa-lbl">Audits</div>
              <div className="db-qa-sub">Manage audits</div>
            </Link>
            <Link to="/risks" className="db-qa-btn" style={{ textDecoration: "none" }}>
              <div className="db-qa-ico">◈</div>
              <div className="db-qa-lbl">Risks</div>
              <div className="db-qa-sub">Risk register</div>
            </Link>
            <Link to="/lessons" className="db-qa-btn" style={{ textDecoration: "none" }}>
              <div className="db-qa-ico">✦</div>
              <div className="db-qa-lbl">Lessons</div>
              <div className="db-qa-sub">Knowledge base</div>
            </Link>
            <Link to="/board" className="db-qa-btn" style={{ textDecoration: "none" }}>
              <div className="db-qa-ico">⊞</div>
              <div className="db-qa-lbl">Kanban</div>
              <div className="db-qa-sub">Board view</div>
            </Link>
            <Link to="/reports" className="db-qa-btn" style={{ textDecoration: "none" }}>
              <div className="db-qa-ico">📑</div>
              <div className="db-qa-lbl">Reports</div>
              <div className="db-qa-sub">Build reports</div>
            </Link>
          </div>
        </div>

        {/* ── Recent Issues ── */}
        <div className="db-tile db-t3">
          <div className="db-tile-label acc">Recent Issues</div>
          {recentIssues.length === 0 ? (
            <p style={{ color: "#c7d2fe", fontSize: 12 }}>No issues yet.</p>
          ) : (
            recentIssues.map((issue: any) => {
              const name = issue.assignee_name || issue.assignee_email;
              const col = avColor(issue.assignee_email || issue.reporter_email || "x");
              return (
                <Link key={issue.id} to={`/issues/${issue.id}`} className="db-act-item" style={{ textDecoration: "none" }}>
                  {name ? (
                    <div className="db-act-av" style={{ background: col }}>
                      {(name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2))}
                    </div>
                  ) : (
                    <div className="db-act-av" style={{ background: "#9ca3af" }}>?</div>
                  )}
                  <div className="db-act-body">
                    <div className="db-act-text">
                      <strong style={{ color: "#1e1b4b" }}>{issue.title}</strong>
                      <span
                        className="db-act-badge"
                        style={{
                          background: issue.status === "closed" ? "#d1fae5" : issue.status === "in_progress" ? "#dbeafe" : "#ede9fe",
                          color: issue.status === "closed" ? "#065f46" : issue.status === "in_progress" ? "#1d4ed8" : "#5b21b6",
                        }}
                      >
                        {issue.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="db-act-meta">
                      {issue.priority} priority · {issue.stage_name || "no stage"} · {fmtDate(issue.created_at)}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0eeff" }}>
            <Link to="/" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
              View all issues →
            </Link>
          </div>
        </div>

        {/* ── Issue Status Breakdown ── */}
        <div className="db-tile db-t3">
          <div className="db-tile-label acc">Status Breakdown</div>
          {[
            { label: "Open", color: "#7c3aed", bg: "#ede9fe", count: openIssues },
            { label: "Closed", color: "#065f46", bg: "#d1fae5", count: (totalIssues - openIssues) },
          ].map((item) => (
            <div key={item.label} className="db-act-item" style={{ borderBottom: "1px solid #f5f3ff" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0, marginTop: 4 }} />
              <div className="db-act-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#1e1b4b", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.count}</span>
                </div>
                <div style={{ height: 6, background: "#f0eeff", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: item.color, borderRadius: 3, width: totalIssues > 0 ? `${Math.round((item.count / totalIssues) * 100)}%` : "0%" }} />
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <div className="db-tile-label acc">Priority Mix</div>
            {["critical", "high", "medium", "low"].map((p, i) => {
              const colors: Record<string, string> = { critical: "#dc2626", high: "#ea580c", medium: "#d97706", low: "#10b981" };
              return (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[p], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#374151", flex: 1, textTransform: "capitalize" }}>{p}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
