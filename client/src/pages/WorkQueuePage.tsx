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

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  open:        { bg: "#ede9fe", color: "#5b21b6" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8" },
  assigned:    { bg: "#dbeafe", color: "#1d4ed8" },
  review:      { bg: "#fef3c7", color: "#d97706" },
  closed:      { bg: "#d1fae5", color: "#065f46" },
  completed:   { bg: "#d1fae5", color: "#065f46" },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high:     "#ea580c",
  medium:   "#d97706",
  low:      "#6d6d9e",
};

function StatusChip({ status }: { status: string }) {
  const pill = STATUS_PILL[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: pill.bg,
        color: pill.color,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] || "#6d6d9e";
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, textTransform: "capitalize" }}>
      {priority}
    </span>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

interface SectionProps {
  title: string;
  count: number;
  loading: boolean;
  children: React.ReactNode;
  accentColor?: string;
}

function Section({ title, count, loading, children, accentColor = "#4f46e5" }: SectionProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            width: 4,
            height: 20,
            borderRadius: 2,
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 14, color: "#e0e7ff" }}>{title}</span>
        <span
          style={{
            marginLeft: 2,
            background: accentColor + "30",
            color: accentColor,
            border: `1px solid ${accentColor}50`,
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            padding: "1px 8px",
            minWidth: 22,
            textAlign: "center",
          }}
        >
          {loading ? "…" : count}
        </span>
      </div>
      {/* Content */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#6366f1", fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "32px 20px",
        textAlign: "center",
        color: "rgba(199,210,254,0.4)",
        fontSize: 13,
        fontStyle: "italic",
      }}
    >
      {message}
    </div>
  );
}

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

    // My Open Actions
    setLoadingActions(true);
    api
      .get(`/actions?assigned_to=${userId}&status=assigned`)
      .then((res) => setMyActions(res.data.actions || res.data || []))
      .catch(() => setMyActions([]))
      .finally(() => setLoadingActions(false));

    // Pending My Review
    setLoadingReview(true);
    api
      .get(`/actions?assigned_to=${userId}&status=review`)
      .then((res) => setReviewActions(res.data.actions || res.data || []))
      .catch(() => setReviewActions([]))
      .finally(() => setLoadingReview(false));

    // Issues Assigned to Me
    setLoadingIssues(true);
    api
      .get(`/issues?assignee_id=${userId}&status=open`)
      .then((res) => setMyIssues(res.data.issues || res.data || []))
      .catch(() => setMyIssues([]))
      .finally(() => setLoadingIssues(false));

    // Procedures Pending Approval
    setLoadingProcedures(true);
    api
      .get(`/procedures?status=review`)
      .then((res) => setPendingProcedures(res.data.procedures || res.data || []))
      .catch(() => setPendingProcedures([]))
      .finally(() => setLoadingProcedures(false));
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#e0e7ff",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            Work Queue
          </h1>
          {user?.name && (
            <span
              style={{
                fontSize: 13,
                color: "rgba(199,210,254,0.5)",
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              — {user.name}
            </span>
          )}
        </div>
        <p style={{ margin: "6px 0 0", color: "rgba(199,210,254,0.55)", fontSize: 14 }}>
          Your assigned tasks and pending reviews
        </p>
      </div>

      {/* Bento grid — 2 columns on wide, 1 on narrow */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: 16,
        }}
      >
        {/* ── 1. My Open Actions ─────────────────────────────── */}
        <Section
          title="My Open Actions"
          count={myActions.length}
          loading={loadingActions}
          accentColor="#6366f1"
        >
          {myActions.length === 0 ? (
            <EmptyState message="No open actions assigned to you." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Title", "Priority", "Due Date", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(199,210,254,0.45)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.01)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myActions.map((action) => (
                  <tr
                    key={action.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e7ff" }}>
                        {action.title}
                      </div>
                      {action.issue_title && (
                        <div style={{ fontSize: 11, color: "rgba(199,210,254,0.45)", marginTop: 2 }}>
                          {action.issue_title}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <PriorityChip priority={action.priority} />
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: isOverdue(action.due_date) ? "#f87171" : "rgba(199,210,254,0.6)",
                          fontWeight: isOverdue(action.due_date) ? 600 : 400,
                        }}
                      >
                        {fmtDate(action.due_date)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 20px 10px 4px", textAlign: "right" }}>
                      <button
                        onClick={() =>
                          navigate(action.issue_id ? `/issues/${action.issue_id}` : `/actions/${action.id}`)
                        }
                        style={{
                          background: "rgba(99,102,241,0.15)",
                          color: "#818cf8",
                          border: "1px solid rgba(99,102,241,0.25)",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── 2. Pending My Review ───────────────────────────── */}
        <Section
          title="Pending My Review"
          count={reviewActions.length}
          loading={loadingReview}
          accentColor="#d97706"
        >
          {reviewActions.length === 0 ? (
            <EmptyState message="Nothing pending your review." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Title", "Status", "Due Date", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(199,210,254,0.45)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.01)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewActions.map((action) => (
                  <tr
                    key={action.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e7ff" }}>
                        {action.title}
                      </div>
                      {action.issue_title && (
                        <div style={{ fontSize: 11, color: "rgba(199,210,254,0.45)", marginTop: 2 }}>
                          {action.issue_title}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusChip status={action.status} />
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: isOverdue(action.due_date) ? "#f87171" : "rgba(199,210,254,0.6)",
                          fontWeight: isOverdue(action.due_date) ? 600 : 400,
                        }}
                      >
                        {fmtDate(action.due_date)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 20px 10px 4px", textAlign: "right" }}>
                      <button
                        onClick={() =>
                          navigate(action.issue_id ? `/issues/${action.issue_id}` : `/actions/${action.id}`)
                        }
                        style={{
                          background: "rgba(217,119,6,0.15)",
                          color: "#fbbf24",
                          border: "1px solid rgba(217,119,6,0.25)",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── 3. Issues Assigned to Me ───────────────────────── */}
        <Section
          title="Issues Assigned to Me"
          count={myIssues.length}
          loading={loadingIssues}
          accentColor="#0ea5e9"
        >
          {myIssues.length === 0 ? (
            <EmptyState message="No open issues assigned to you." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Title", "Priority", "Stage", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(199,210,254,0.45)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.01)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e7ff" }}>
                        {issue.title}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(199,210,254,0.4)", marginTop: 2 }}>
                        Created {fmtDate(issue.created_at)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <PriorityChip priority={issue.priority} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {issue.stage_name ? (
                        <span style={{ fontSize: 12, color: "rgba(199,210,254,0.6)" }}>
                          {issue.stage_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "rgba(199,210,254,0.25)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 20px 10px 4px", textAlign: "right" }}>
                      <button
                        onClick={() => navigate(`/issues/${issue.id}`)}
                        style={{
                          background: "rgba(14,165,233,0.15)",
                          color: "#38bdf8",
                          border: "1px solid rgba(14,165,233,0.25)",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── 4. Procedures Pending Approval ────────────────── */}
        <Section
          title="Procedures Pending Approval"
          count={pendingProcedures.length}
          loading={loadingProcedures}
          accentColor="#10b981"
        >
          {pendingProcedures.length === 0 ? (
            <EmptyState message="No procedures pending approval." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Title", "Number", "Owner", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(199,210,254,0.45)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.01)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingProcedures.map((proc) => (
                  <tr
                    key={proc.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e7ff" }}>
                        {proc.title}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(199,210,254,0.4)", marginTop: 2 }}>
                        Updated {fmtDate(proc.updated_at)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {proc.procedure_number ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#6ee7b7",
                            fontFamily: "monospace",
                            background: "rgba(16,185,129,0.1)",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {proc.procedure_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "rgba(199,210,254,0.25)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, color: "rgba(199,210,254,0.6)" }}>
                        {proc.owner_name || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 20px 10px 4px", textAlign: "right" }}>
                      <button
                        onClick={() => navigate(`/procedures/${proc.id}`)}
                        style={{
                          background: "rgba(16,185,129,0.15)",
                          color: "#34d399",
                          border: "1px solid rgba(16,185,129,0.25)",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
