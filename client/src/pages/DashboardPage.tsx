import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import IssueForm from "../components/IssueForm";
import { exportToCSV, exportToExcel } from "../utils/exportUtils";

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  reporter_email: string;
  reporter_name: string | null;
  assignee_email: string | null;
  assignee_name: string | null;
  stage_name: string | null;
  stage_color: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "closed", label: "Closed" },
];

const PRIORITY_ICONS: Record<string, string> = {
  critical: "↑↑",
  high: "↑",
  medium: "→",
  low: "↓",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#6d6d9e",
};

const STATUS_PILL: Record<string, { bg: string; color: string; dot: string }> = {
  open:        { bg: "#ede9fe", color: "#5b21b6", dot: "#7c3aed" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8", dot: "#2563eb" },
  closed:      { bg: "#d1fae5", color: "#065f46", dot: "#16a34a" },
};

const AVATAR_COLORS = ["#4f46e5", "#3b82f6", "#0ea5e9", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6"];

function getAvatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("status") || "");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") || "");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchIssues = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeTab) params.set("status", activeTab);
    if (priorityFilter) params.set("priority", priorityFilter);
    params.set("page", String(page));
    params.set("limit", "100");
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    const res = await api.get(`/issues?${params}`);
    setIssues(res.data.issues);
    setTotal(res.data.total);
    setLoading(false);
  }, [activeTab, priorityFilter, page, sortBy, sortDir]);

  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ["open", "in_progress", "closed"];
      const results = await Promise.all(
        statuses.map((s) => api.get(`/issues?status=${s}&limit=1`))
      );
      const allRes = await api.get(`/issues?limit=1`);
      const c: Record<string, number> = { "": allRes.data.total };
      statuses.forEach((s, i) => { c[s] = results[i].data.total; });
      setCounts(c);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { api.get("/users").then((res) => setUsers(res.data.users)); }, []);
  useEffect(() => { setPage(1); }, [activeTab, priorityFilter]);

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
    setPage(1);
  }

  async function handleCreate(data: { title: string; description: string; priority: string; assignee_id: string | null; source: string | null; on_behalf_of_id: string | null; department: string | null; date_identified: string }) {
    await api.post("/issues", data);
    setShowCreate(false);
    fetchIssues();
    fetchCounts();
  }

  // Client-side text search
  const displayed = search.trim()
    ? issues.filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        (i.reporter_name || i.reporter_email).toLowerCase().includes(search.toLowerCase()) ||
        (i.assignee_name || i.assignee_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.stage_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : issues;

  function SortTh({ field, label }: { field: string; label: string }) {
    const active = sortBy === field;
    return (
      <th
        className={`il-th-sort${active ? " il-th-sorted" : ""}`}
        onClick={() => handleSort(field)}
      >
        {label}
        <span className="il-sort-arrow">{active ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
      </th>
    );
  }

  return (
    <div className="issues-list-page">
      {/* Header */}
      <div className="il-header">
        <div className="il-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="il-page-title">Issues</div>
            <div className="il-record-count">{total} records</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportToCSV(issues.map((i) => ({
                Title: i.title, Status: i.status, Priority: i.priority,
                Stage: i.stage_name || "", Reporter: i.reporter_name || i.reporter_email,
                Assignee: i.assignee_name || i.assignee_email || "Unassigned",
                Created: fmtDate(i.created_at),
              })), "issues.csv")}
            >
              CSV
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportToExcel(issues.map((i) => ({
                Title: i.title, Status: i.status, Priority: i.priority,
                Stage: i.stage_name || "", Reporter: i.reporter_name || i.reporter_email,
                Assignee: i.assignee_name || i.assignee_email || "Unassigned",
                Created: fmtDate(i.created_at),
              })), "Issues", "issues.xlsx")}
            >
              Excel
            </button>
            <button className="btn-submit" style={{ fontSize: 12, padding: "7px 16px" }} onClick={() => setShowCreate(true)}>
              + New Issue
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="il-toolbar">
          <div className="il-search-wrap">
            <span className="il-search-ico">🔍</span>
            <input
              className="il-search-input"
              type="text"
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Priority filter pills */}
          {["critical", "high", "medium", "low"].map((p) => (
            <button
              key={p}
              className={`il-filter-btn${priorityFilter === p ? " il-filter-active" : ""}`}
              onClick={() => setPriorityFilter(priorityFilter === p ? "" : p)}
            >
              {priorityFilter === p && <div className="il-filter-dot" />}
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="il-filter-btn il-filter-active" title="List view">☰</button>
            <button className="il-filter-btn" title="Kanban view" onClick={() => navigate("/board")}>⊞</button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="il-tabs">
          {STATUS_TABS.map((tab) => (
            <div
              key={tab.key}
              className={`il-tab${activeTab === tab.key ? " il-tab-active" : ""}`}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
            >
              {tab.label}
              <span className={`il-tab-count${activeTab === tab.key ? " il-tab-count-active" : ""}`}>
                {counts[tab.key] ?? "…"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="il-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#c7d2fe" }}>Loading…</div>
        ) : (
          <table className="il-table">
            <thead>
              <tr>
                <SortTh field="title" label="Title" />
                <th className="il-th">Stage</th>
                <SortTh field="priority" label="Priority" />
                <th className="il-th">Assignee</th>
                <SortTh field="created_at" label="Created" />
                <th className="il-th" />
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr className="il-empty-row">
                  <td colSpan={6}>
                    {search ? `No issues matching "${search}"` : "No issues found."}
                  </td>
                </tr>
              ) : (
                displayed.map((issue) => {
                  const pill = STATUS_PILL[issue.status] || { bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" };
                  const priColor = PRIORITY_COLORS[issue.priority] || "#6d6d9e";
                  const priIcon = PRIORITY_ICONS[issue.priority] || "";
                  const assigneeName = issue.assignee_name || issue.assignee_email || null;
                  const assigneeKey = issue.assignee_email || "x";
                  const avColor = getAvatarColor(assigneeKey);

                  return (
                    <tr key={issue.id} className="il-row" onClick={() => navigate(`/issues/${issue.id}`)}>
                      {/* Title */}
                      <td className="il-td">
                        <div className="il-title-cell">
                          {issue.title}
                        </div>
                      </td>

                      {/* Stage (replaces Status) */}
                      <td className="il-td">
                        {issue.stage_name ? (
                          <div className="il-stage-badge">
                            <div
                              className="il-stage-dot"
                              style={{ background: issue.stage_color || "#4f46e5" }}
                            />
                            {issue.stage_name}
                          </div>
                        ) : (
                          <span
                            className="il-status-pill"
                            style={{ background: pill.bg, color: pill.color }}
                          >
                            <span className="il-s-dot" style={{ background: pill.dot }} />
                            {issue.status.replace("_", " ")}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="il-td">
                        <span className="il-priority" style={{ color: priColor }}>
                          {priIcon} {issue.priority}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="il-td">
                        {assigneeName ? (
                          <div className="il-assignee">
                            <div className="il-av" style={{ background: avColor }}>
                              {initials(issue.assignee_name, issue.assignee_email!)}
                            </div>
                            <span>{assigneeName}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#c7d2fe", fontSize: 12 }}>Unassigned</span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="il-td">
                        <span className="il-date">{fmtDate(issue.created_at)}</span>
                      </td>

                      {/* Row actions */}
                      <td className="il-td" onClick={(e) => e.stopPropagation()}>
                        <div className="il-row-actions">
                          <button
                            className="il-ra-btn"
                            title="Open"
                            onClick={(e) => { e.stopPropagation(); navigate(`/issues/${issue.id}`); }}
                          >
                            ↗
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Issue</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <IssueForm
              users={users}
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
