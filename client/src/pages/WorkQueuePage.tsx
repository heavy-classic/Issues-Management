import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Action {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  issue_id: string | null;
  issue_title: string | null;
}

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  stage_name: string | null;
}

interface Procedure {
  id: string;
  title: string;
  procedure_number: string | null;
  status: string;
  updated_at: string;
  owner_name: string | null;
}

const PRI_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  critical: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  high:     { bg: "#ffedd5", color: "#c2410c", dot: "#f97316" },
  medium:   { bg: "#fef9c3", color: "#a16207", dot: "#eab308" },
  low:      { bg: "#f0f9ff", color: "#0369a1", dot: "#38bdf8" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:        { bg: "#ede9fe", color: "#5b21b6" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8" },
  assigned:    { bg: "#dbeafe", color: "#1d4ed8" },
  review:      { bg: "#fef3c7", color: "#d97706" },
  closed:      { bg: "#d1fae5", color: "#065f46" },
  completed:   { bg: "#d1fae5", color: "#065f46" },
};

function PriBadge({ priority }: { priority: string }) {
  const s = PRI_STYLE[priority?.toLowerCase()] || PRI_STYLE.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 10, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block", background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, padding: "2px 9px",
      borderRadius: 10, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
interface SectionProps {
  title: string;
  subtitle: string;
  count: number;
  loading: boolean;
  accentColor: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, count, loading, accentColor, children }: SectionProps) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 20px 12px",
        borderBottom: "1px solid #f0f0f6",
        borderLeft: `4px solid ${accentColor}`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1e1b4b" }}>{title}</span>
            <span style={{
              background: accentColor + "18", color: accentColor,
              border: `1px solid ${accentColor}40`,
              borderRadius: 10, fontSize: 11, fontWeight: 700,
              padding: "1px 8px", minWidth: 22, textAlign: "center",
            }}>
              {loading ? "…" : count}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#a5b4fc", fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{
        padding: "28px 20px", textAlign: "center",
        color: "#9ca3af", fontSize: 13, fontStyle: "italic",
      }}>
        {message}
      </td>
    </tr>
  );
}

function QueueThead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: "#f9fafb" }}>
        {cols.map((h) => (
          <th key={h} style={{
            padding: "8px 16px", textAlign: "left",
            fontSize: 10, fontWeight: 700, color: "#6b7280",
            textTransform: "uppercase", letterSpacing: "0.06em",
            borderBottom: "1px solid #e5e7eb",
          }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkQueuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myActions, setMyActions] = useState<Action[]>([]);
  const [reviewActions, setReviewActions] = useState<Action[]>([]);
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [pendingProcedures, setPendingProcedures] = useState<Procedure[]>([]);

  const [loadingActions, setLoadingActions] = useState(true);
  const [loadingReview, setLoadingReview] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadingProcedures, setLoadingProcedures] = useState(true);

  const userId = user?.userId;

  const fetchAll = useCallback(async () => {
    if (!userId) return;

    setLoadingActions(true);
    api.get(`/actions?assigned_to=${userId}&status=assigned`)
      .then((res) => {
        const items = res.data.actions || res.data || [];
        // Sort: overdue first, then by due_date asc, then no due date last
        items.sort((a: Action, b: Action) => {
          const aOver = isOverdue(a.due_date);
          const bOver = isOverdue(b.due_date);
          if (aOver && !bOver) return -1;
          if (!aOver && bOver) return 1;
          if (!a.due_date && b.due_date) return 1;
          if (a.due_date && !b.due_date) return -1;
          if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          return 0;
        });
        setMyActions(items);
      })
      .catch(() => setMyActions([]))
      .finally(() => setLoadingActions(false));

    setLoadingReview(true);
    api.get(`/actions?assigned_to=${userId}&status=review`)
      .then((res) => setReviewActions(res.data.actions || res.data || []))
      .catch(() => setReviewActions([]))
      .finally(() => setLoadingReview(false));

    setLoadingIssues(true);
    api.get(`/issues?assignee_id=${userId}&status=open`)
      .then((res) => setMyIssues(res.data.issues || res.data || []))
      .catch(() => setMyIssues([]))
      .finally(() => setLoadingIssues(false));

    setLoadingProcedures(true);
    api.get(`/procedures?status=review`)
      .then((res) => setPendingProcedures(res.data.procedures || res.data || []))
      .catch(() => setPendingProcedures([]))
      .finally(() => setLoadingProcedures(false));
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalItems =
    (loadingActions ? 0 : myActions.length) +
    (loadingReview ? 0 : reviewActions.length) +
    (loadingIssues ? 0 : myIssues.length) +
    (loadingProcedures ? 0 : pendingProcedures.length);

  const overdueCount = myActions.filter((a) => isOverdue(a.due_date)).length;

  return (
    <div className="issues-list-page">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="il-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="il-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="il-page-title">Work Queue</div>
            {user?.name && (
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                — {user.name}
              </span>
            )}
            <div className="il-record-count">{totalItems} items</div>
          </div>
          {overdueCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#fee2e2", color: "#b91c1c",
              border: "1px solid #fca5a5",
              borderRadius: 8, padding: "5px 12px",
              fontSize: 12, fontWeight: 700,
            }}>
              <span style={{ fontSize: 14 }}>⚠</span>
              {overdueCount} overdue action{overdueCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Summary stats row */}
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {[
            { label: "Open Actions", value: myActions.length, loading: loadingActions, color: "#4f46e5" },
            { label: "Pending Review", value: reviewActions.length, loading: loadingReview, color: "#d97706" },
            { label: "My Issues", value: myIssues.length, loading: loadingIssues, color: "#0ea5e9" },
            { label: "Procedures", value: pendingProcedures.length, loading: loadingProcedures, color: "#10b981" },
          ].map(({ label, value, loading, color }) => (
            <div key={label} style={{
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 8, padding: "8px 16px",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>
                {loading ? "–" : value}
              </span>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, lineHeight: 1.3 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-column grid ──────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
        gap: 16,
        padding: "20px 28px 28px",
      }}>

        {/* 1. My Open Actions */}
        <Section
          title="My Open Actions"
          subtitle="Actions assigned to you that are still in progress"
          count={myActions.length}
          loading={loadingActions}
          accentColor="#4f46e5"
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <QueueThead cols={["Task", "Priority", "Due Date", ""]} />
            <tbody>
              {myActions.length === 0 ? (
                <EmptyRow cols={4} message="No open actions assigned to you." />
              ) : (
                myActions.map((action) => {
                  const overdue = isOverdue(action.due_date);
                  return (
                    <tr
                      key={action.id}
                      style={{
                        borderBottom: "1px solid #f0f0f6",
                        borderLeft: overdue ? "3px solid #ef4444" : "3px solid transparent",
                        background: overdue ? "#fff9f9" : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(action.issue_id ? `/issues/${action.issue_id}` : `/actions/${action.id}`)}
                    >
                      <td style={{ padding: "10px 16px", maxWidth: 240 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", lineHeight: 1.4 }}>
                          {action.title}
                        </div>
                        {action.issue_title && (
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {action.issue_title}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <PriBadge priority={action.priority} />
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontSize: 12, fontWeight: overdue ? 700 : 400,
                          color: overdue ? "#dc2626" : "#374151",
                        }}>
                          {overdue && <span style={{ marginRight: 4 }}>!</span>}
                          {fmtDate(action.due_date)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 600 }}>Open →</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Section>

        {/* 2. Pending My Review */}
        <Section
          title="Pending My Review"
          subtitle="Items waiting on your review or approval"
          count={reviewActions.length}
          loading={loadingReview}
          accentColor="#d97706"
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <QueueThead cols={["Task", "Status", "Due Date", ""]} />
            <tbody>
              {reviewActions.length === 0 ? (
                <EmptyRow cols={4} message="Nothing pending your review." />
              ) : (
                reviewActions.map((action) => {
                  const overdue = isOverdue(action.due_date);
                  return (
                    <tr
                      key={action.id}
                      style={{
                        borderBottom: "1px solid #f0f0f6",
                        borderLeft: overdue ? "3px solid #ef4444" : "3px solid transparent",
                        background: overdue ? "#fff9f9" : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(action.issue_id ? `/issues/${action.issue_id}` : `/actions/${action.id}`)}
                    >
                      <td style={{ padding: "10px 16px", maxWidth: 240 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", lineHeight: 1.4 }}>
                          {action.title}
                        </div>
                        {action.issue_title && (
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {action.issue_title}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <StatusBadge status={action.status} />
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontSize: 12, fontWeight: overdue ? 700 : 400,
                          color: overdue ? "#dc2626" : "#374151",
                        }}>
                          {overdue && <span style={{ marginRight: 4 }}>!</span>}
                          {fmtDate(action.due_date)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>Review →</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Section>

        {/* 3. Issues Assigned to Me */}
        <Section
          title="Issues Assigned to Me"
          subtitle="Open issues where you are the assignee"
          count={myIssues.length}
          loading={loadingIssues}
          accentColor="#0ea5e9"
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <QueueThead cols={["Issue", "Priority", "Stage", ""]} />
            <tbody>
              {myIssues.length === 0 ? (
                <EmptyRow cols={4} message="No open issues assigned to you." />
              ) : (
                myIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    style={{ borderBottom: "1px solid #f0f0f6", borderLeft: "3px solid transparent", cursor: "pointer" }}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    <td style={{ padding: "10px 16px", maxWidth: 240 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", lineHeight: 1.4 }}>
                        {issue.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        Created {fmtDate(issue.created_at)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <PriBadge priority={issue.priority} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {issue.stage_name ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: "#4f46e5",
                          background: "#ede9fe", padding: "2px 8px", borderRadius: 8,
                        }}>
                          {issue.stage_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 600 }}>Open →</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        {/* 4. Procedures Pending Approval */}
        <Section
          title="Procedures Pending Approval"
          subtitle="Procedures currently in Review status awaiting sign-off"
          count={pendingProcedures.length}
          loading={loadingProcedures}
          accentColor="#10b981"
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <QueueThead cols={["Title", "Number", "Owner", ""]} />
            <tbody>
              {pendingProcedures.length === 0 ? (
                <EmptyRow cols={4} message="No procedures pending approval." />
              ) : (
                pendingProcedures.map((proc) => (
                  <tr
                    key={proc.id}
                    style={{ borderBottom: "1px solid #f0f0f6", borderLeft: "3px solid transparent", cursor: "pointer" }}
                    onClick={() => navigate(`/procedures/${proc.id}`)}
                  >
                    <td style={{ padding: "10px 16px", maxWidth: 240 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", lineHeight: 1.4 }}>
                        {proc.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        Updated {fmtDate(proc.updated_at)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {proc.procedure_number ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: "#059669",
                          fontFamily: "monospace", background: "#d1fae5",
                          padding: "2px 8px", borderRadius: 4,
                        }}>
                          {proc.procedure_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        {proc.owner_name || <span style={{ color: "#d1d5db" }}>—</span>}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Review →</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

      </div>
    </div>
  );
}
