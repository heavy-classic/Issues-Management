import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import AuditFormModal from "../components/AuditFormModal";
import SortableHeader from "../components/SortableHeader";
import Pagination from "../components/Pagination";

interface Audit {
  id: string;
  audit_number: string;
  title: string;
  status: string;
  priority: string;
  risk_level: string | null;
  type_name: string;
  type_color: string;
  type_icon: string;
  lead_name: string | null;
  lead_email: string | null;
  team_size: number;
  findings_count: number;
  checklist_count: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  compliance_score: number | null;
  created_at: string;
}

interface AuditType {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  scheduled: "#3b82f6",
  planning: "#8b5cf6",
  in_progress: "#f59e0b",
  under_review: "#06b6d4",
  closed: "#10b981",
  cancelled: "#ef4444",
};

export default function AuditsPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [total, setTotal] = useState(0);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [kpis, setKpis] = useState({ totalAudits: 0, inProgress: 0, overdue: 0, avgComplianceScore: null as number | null });
  const [filters, setFilters] = useState({
    status: "",
    audit_type_id: "",
    risk_level: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchAudits = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.audit_type_id) params.set("audit_type_id", filters.audit_type_id);
    if (filters.risk_level) params.set("risk_level", filters.risk_level);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(page));
    params.set("limit", "50");
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    const res = await api.get(`/audits?${params}`);
    setAudits(res.data.audits);
    setTotal(res.data.total);
    setLoading(false);
  }, [filters, page, sortBy, sortDir]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  useEffect(() => {
    api.get("/audit-types?is_active=true").then((res) => setAuditTypes(res.data.auditTypes));
    api.get("/users").then((res) => setUsers(res.data.users));
    api.get("/audit-dashboard/kpis").then((res) => setKpis(res.data));
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  async function handleCreate(data: any) {
    await api.post("/audits", data);
    setShowCreate(false);
    fetchAudits();
    api.get("/audit-dashboard/kpis").then((res) => setKpis(res.data));
  }

  function statusLabel(s: string) {
    return s.replace(/_/g, " ");
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Audits</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/audits/analytics" className="btn btn-secondary">Analytics</Link>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Audit</button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-value">{kpis.totalAudits}</div>
          <div className="kpi-label">Total Audits</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{kpis.inProgress}</div>
          <div className="kpi-label">In Progress</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: kpis.overdue > 0 ? "#ef4444" : undefined }}>{kpis.overdue}</div>
          <div className="kpi-label">Overdue</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{kpis.avgComplianceScore ? `${kpis.avgComplianceScore}%` : "N/A"}</div>
          <div className="kpi-label">Avg Compliance</div>
        </div>
      </div>

      <div className="filter-bar">
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {["draft", "scheduled", "planning", "in_progress", "under_review", "closed", "cancelled"].map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <select value={filters.audit_type_id} onChange={(e) => setFilters((f) => ({ ...f, audit_type_id: e.target.value }))}>
          <option value="">All Types</option>
          {auditTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={filters.risk_level} onChange={(e) => setFilters((f) => ({ ...f, risk_level: e.target.value }))}>
          <option value="">All Risk Levels</option>
          {["low", "medium", "high", "critical"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search audits..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : audits.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>No audits found.</p>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <SortableHeader label="Audit #" field="audit_number" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Title" field="title" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Type" field="type" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Status" field="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Risk" field="risk_level" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Lead" field="lead" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Start" field="scheduled_start" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="End" field="scheduled_end" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <th>Findings</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/audits/${a.id}`)} style={{ cursor: "pointer" }}>
                    <td><strong>{a.audit_number}</strong></td>
                    <td>{a.title}</td>
                    <td>
                      <span className="badge" style={{ background: a.type_color, color: "#fff" }}>
                        {a.type_icon} {a.type_name}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: STATUS_COLORS[a.status] || "#9ca3af", color: "#fff" }}>
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td>
                      {a.risk_level && (
                        <span className={`badge badge-priority-${a.risk_level}`}>{a.risk_level}</span>
                      )}
                    </td>
                    <td>{a.lead_name || a.lead_email || "Unassigned"}</td>
                    <td>{a.scheduled_start ? new Date(a.scheduled_start).toLocaleDateString() : "\u2014"}</td>
                    <td>{a.scheduled_end ? new Date(a.scheduled_end).toLocaleDateString() : "\u2014"}</td>
                    <td>{a.findings_count}</td>
                    <td>{a.compliance_score ? `${a.compliance_score}%` : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={50} onPageChange={setPage} />
        </>
      )}

      {showCreate && (
        <AuditFormModal
          auditTypes={auditTypes}
          users={users}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
