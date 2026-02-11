import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import LessonFormModal from "../components/LessonFormModal";
import SortableHeader from "../components/SortableHeader";
import Pagination from "../components/Pagination";

interface Lesson {
  id: string;
  lesson_number: string;
  title: string;
  status: string;
  lesson_type: string;
  category: string | null;
  impact_level: string | null;
  effectiveness_rating: string | null;
  owner_name: string | null;
  owner_email: string | null;
  stage_name: string | null;
  stage_color: string | null;
  linked_issues_count: number;
  comment_count: number;
  identified_date: string | null;
  created_at: string;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface KPIs {
  total: number;
  open: number;
  high_critical: number;
  implemented: number;
  effective: number;
}

const TYPE_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  improvement: "#3b82f6",
};

const IMPACT_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const STATUS_LABELS = [
  "draft", "identified", "under_review", "approved",
  "in_implementation", "implemented", "validated", "archived", "closed",
];

export default function LessonsPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterImpact, setFilterImpact] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [search, setSearch] = useState("");

  // Pagination & sorting
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchLessons = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterType) params.lesson_type = filterType;
    if (filterImpact) params.impact_level = filterImpact;
    if (filterOwner) params.owner_id = filterOwner;
    if (search) params.search = search;
    params.page = String(page);
    params.limit = "50";
    params.sort_by = sortBy;
    params.sort_dir = sortDir;

    const res = await api.get("/lessons", { params });
    setLessons(res.data.lessons);
    setTotal(res.data.total);
    setLoading(false);
  }, [filterStatus, filterType, filterImpact, filterOwner, search, page, sortBy, sortDir]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  useEffect(() => {
    Promise.all([
      api.get("/users"),
      api.get("/lesson-dashboard/kpis"),
    ]).then(([userRes, kpiRes]) => {
      setUsers(userRes.data.users);
      setKpis(kpiRes.data);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterType, filterImpact, filterOwner, search]);

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
    await api.post("/lessons", data);
    setShowCreate(false);
    fetchLessons();
    const kpiRes = await api.get("/lesson-dashboard/kpis");
    setKpis(kpiRes.data);
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Lessons Learned</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Lesson</button>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.total}</div>
            <div className="text-muted">Total Lessons</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#3b82f6" }}>{kpis.open}</div>
            <div className="text-muted">Open</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{kpis.high_critical}</div>
            <div className="text-muted">High / Critical</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#8b5cf6" }}>{kpis.implemented}</div>
            <div className="text-muted">Implemented</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{kpis.effective}</div>
            <div className="text-muted">Effective</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search lessons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_LABELS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="improvement">Improvement</option>
        </select>
        <select value={filterImpact} onChange={(e) => setFilterImpact(e.target.value)}>
          <option value="">All Impact Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <p>Loading...</p> : lessons.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>No lessons found.</p>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <SortableHeader label="LL #" field="lesson_number" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Title" field="title" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Type" field="lesson_type" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Category" field="category" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Impact" field="impact_level" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Owner" field="owner" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Status" field="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <th>Stage</th>
                  <SortableHeader label="Identified" field="identified_date" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id} onClick={() => navigate(`/lessons/${l.id}`)} style={{ cursor: "pointer" }}>
                    <td><strong>{l.lesson_number}</strong></td>
                    <td>{l.title}</td>
                    <td>
                      <span className="badge" style={{ background: TYPE_COLORS[l.lesson_type] || "#9ca3af", color: "#fff" }}>
                        {l.lesson_type}
                      </span>
                    </td>
                    <td>{l.category || "-"}</td>
                    <td>
                      {l.impact_level ? (
                        <span className="badge" style={{ background: IMPACT_COLORS[l.impact_level] || "#9ca3af", color: "#fff" }}>
                          {l.impact_level}
                        </span>
                      ) : "-"}
                    </td>
                    <td>{l.owner_name || l.owner_email || "-"}</td>
                    <td style={{ textTransform: "capitalize" }}>{l.status.replace(/_/g, " ")}</td>
                    <td>
                      {l.stage_name ? (
                        <span className="badge" style={{ background: l.stage_color || "#9ca3af", color: "#fff" }}>
                          {l.stage_name}
                        </span>
                      ) : "-"}
                    </td>
                    <td>{l.identified_date ? new Date(l.identified_date).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={50} onPageChange={setPage} />
        </>
      )}

      {showCreate && (
        <LessonFormModal
          users={users}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
