import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import RiskFormModal from "../components/RiskFormModal";
import SortableHeader from "../components/SortableHeader";
import Pagination from "../components/Pagination";

interface Risk {
  id: string;
  risk_number: string;
  title: string;
  status: string;
  category_name: string | null;
  category_color: string | null;
  inherent_score: number | null;
  inherent_level: string | null;
  residual_score: number | null;
  residual_level: string | null;
  treatment_strategy: string | null;
  owner_name: string | null;
  owner_email: string | null;
  mitigation_count: number;
  next_review_date: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface KPIs {
  total: number;
  open: number;
  high_extreme: number;
  avg_residual_score: number;
  overdue_reviews: number;
}

const LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  identified: "#3b82f6",
  under_assessment: "#8b5cf6",
  assessed: "#06b6d4",
  in_treatment: "#f59e0b",
  monitoring: "#10b981",
  under_review: "#f97316",
  accepted: "#059669",
  closed: "#6b7280",
};

export default function RisksPage() {
  const navigate = useNavigate();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [search, setSearch] = useState("");

  // Pagination & sorting
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchRisks = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterCategory) params.category_id = filterCategory;
    if (filterLevel) params.level = filterLevel;
    if (filterOwner) params.owner_id = filterOwner;
    if (search) params.search = search;
    params.page = String(page);
    params.limit = "50";
    params.sort_by = sortBy;
    params.sort_dir = sortDir;

    const res = await api.get("/risks", { params });
    setRisks(res.data.risks);
    setTotal(res.data.total);
    setLoading(false);
  }, [filterStatus, filterCategory, filterLevel, filterOwner, search, page, sortBy, sortDir]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  useEffect(() => {
    Promise.all([
      api.get("/risk-categories"),
      api.get("/users"),
      api.get("/risk-dashboard/kpis"),
    ]).then(([catRes, userRes, kpiRes]) => {
      setCategories(catRes.data.categories);
      setUsers(userRes.data.users);
      setKpis(kpiRes.data);
    });
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterCategory, filterLevel, filterOwner, search]);

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
    await api.post("/risks", data);
    setShowCreate(false);
    fetchRisks();
    const kpiRes = await api.get("/risk-dashboard/kpis");
    setKpis(kpiRes.data);
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Risk Register</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Risk</button>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.total}</div>
            <div className="text-muted">Total Risks</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#3b82f6" }}>{kpis.open}</div>
            <div className="text-muted">Open Risks</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{kpis.high_extreme}</div>
            <div className="text-muted">High / Extreme</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.avg_residual_score}</div>
            <div className="text-muted">Avg Residual Score</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: kpis.overdue_reviews > 0 ? "#f97316" : "#10b981" }}>{kpis.overdue_reviews}</div>
            <div className="text-muted">Overdue Reviews</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search risks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {["draft", "identified", "under_assessment", "assessed", "in_treatment", "monitoring", "under_review", "accepted", "closed"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="">All Levels</option>
          {["low", "medium", "high", "extreme"].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <p>Loading...</p> : risks.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>No risks found.</p>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <SortableHeader label="Risk #" field="risk_number" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Title" field="title" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Category" field="category" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Inherent" field="inherent_score" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Residual" field="residual_score" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Treatment" field="treatment_strategy" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Owner" field="owner" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Status" field="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Next Review" field="next_review_date" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/risks/${r.id}`)} style={{ cursor: "pointer" }}>
                    <td><strong>{r.risk_number}</strong></td>
                    <td>{r.title}</td>
                    <td>
                      {r.category_name && (
                        <span className="badge" style={{ background: r.category_color || "#9ca3af", color: "#fff" }}>
                          {r.category_name}
                        </span>
                      )}
                    </td>
                    <td>
                      {r.inherent_score !== null ? (
                        <span className="badge" style={{ background: LEVEL_COLORS[r.inherent_level || "low"], color: "#fff" }}>
                          {r.inherent_score}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      {r.residual_score !== null ? (
                        <span className="badge" style={{ background: LEVEL_COLORS[r.residual_level || "low"], color: "#fff" }}>
                          {r.residual_score}
                        </span>
                      ) : "-"}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{r.treatment_strategy || "-"}</td>
                    <td>{r.owner_name || r.owner_email || "-"}</td>
                    <td>
                      <span className="badge" style={{ background: STATUS_COLORS[r.status] || "#9ca3af", color: "#fff" }}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{r.next_review_date ? new Date(r.next_review_date).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={50} onPageChange={setPage} />
        </>
      )}

      {showCreate && (
        <RiskFormModal
          categories={categories}
          users={users}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
