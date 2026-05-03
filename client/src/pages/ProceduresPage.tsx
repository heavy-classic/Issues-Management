import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

interface Procedure {
  id: string;
  procedure_number: string;
  title: string;
  procedure_type: string | null;
  status: string;
  revision_number: number;
  author_name: string | null;
  author_email: string | null;
  owner_name: string | null;
  owner_email: string | null;
  updated_at: string;
  safety_classification: string | null;
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "superseded", label: "Superseded" },
];

const STATUS_PILL: Record<string, { bg: string; color: string; dot: string }> = {
  draft:      { bg: "#f3f4f6",  color: "#6b7280", dot: "#9ca3af" },
  review:     { bg: "#fef3c7",  color: "#d97706", dot: "#f59e0b" },
  approved:   { bg: "#d1fae5",  color: "#065f46", dot: "#10b981" },
  superseded: { bg: "#e5e7eb",  color: "#9ca3af", dot: "#d1d5db" },
  cancelled:  { bg: "#fee2e2",  color: "#dc2626", dot: "#ef4444" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProceduresPage() {
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchProcedures = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeTab) params.set("status", activeTab);
    if (typeFilter) params.set("procedure_type", typeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "100");
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    const res = await api.get(`/procedures?${params}`);
    const data = res.data.procedures ?? res.data;
    setProcedures(data);
    setTotal(res.data.total ?? data.length);
    setLoading(false);
  }, [activeTab, typeFilter, search, page, sortBy, sortDir]);

  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ["draft", "review", "approved", "superseded"];
      const [allRes, ...statusRes] = await Promise.all([
        api.get("/procedures?limit=1"),
        ...statuses.map((s) => api.get(`/procedures?status=${s}&limit=1`)),
      ]);
      const c: Record<string, number> = { "": allRes.data.total ?? 0 };
      statuses.forEach((s, i) => { c[s] = statusRes[i].data.total ?? 0; });
      setCounts(c);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchProcedures(); }, [fetchProcedures]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { setPage(1); }, [activeTab, typeFilter, search]);

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
    setPage(1);
  }

  function SortTh({ field, label }: { field: string; label: string }) {
    const active = sortBy === field;
    return (
      <th className={`il-th-sort${active ? " il-th-sorted" : ""}`} onClick={() => handleSort(field)}>
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
            <div className="il-page-title">Procedures</div>
            <div className="il-record-count">{total} records</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-submit" style={{ fontSize: 12, padding: "7px 16px" }} onClick={() => navigate("/procedures/new")}>
              + New Procedure
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
              placeholder="Search procedures…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Type filter pills */}
          {["Safety", "Operations", "Maintenance", "Quality", "Administrative"].map((t) => {
            const full = `${t} Procedure`;
            const active = typeFilter === full || (t === "Operations" && typeFilter === "Operating Procedure");
            const val = t === "Operations" ? "Operating Procedure" : full;
            return (
              <button
                key={t}
                className={`il-filter-btn${active ? " il-filter-active" : ""}`}
                onClick={() => setTypeFilter(active ? "" : val)}
              >
                {active && <div className="il-filter-dot" />}
                {t}
              </button>
            );
          })}
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
                <SortTh field="procedure_number" label="Number" />
                <SortTh field="title" label="Title" />
                <th className="il-th">Type</th>
                <th className="il-th">Status</th>
                <th className="il-th">Rev</th>
                <th className="il-th">Author</th>
                <SortTh field="updated_at" label="Updated" />
                <th className="il-th" />
              </tr>
            </thead>
            <tbody>
              {procedures.length === 0 ? (
                <tr className="il-empty-row">
                  <td colSpan={8}>
                    {search ? `No procedures matching "${search}"` : "No procedures found."}
                  </td>
                </tr>
              ) : (
                procedures.map((p) => {
                  const pill = STATUS_PILL[p.status] || STATUS_PILL.draft;
                  const authorName = p.author_name || p.author_email || p.owner_name || p.owner_email || "—";
                  return (
                    <tr key={p.id} className="il-row" onClick={() => navigate(`/procedures/${p.id}`)}>
                      {/* Number */}
                      <td className="il-td">
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#4f46e5", fontWeight: 600, letterSpacing: "0.03em" }}>
                          {p.procedure_number}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="il-td">
                        <div className="il-title-cell">{p.title}</div>
                      </td>

                      {/* Type */}
                      <td className="il-td">
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {p.procedure_type?.replace(" Procedure", "") || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="il-td">
                        <span className="il-status-pill" style={{ background: pill.bg, color: pill.color }}>
                          <span className="il-s-dot" style={{ background: pill.dot }} />
                          {p.status}
                        </span>
                      </td>

                      {/* Revision */}
                      <td className="il-td">
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Rev {p.revision_number ?? 0}</span>
                      </td>

                      {/* Author */}
                      <td className="il-td">
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{authorName}</span>
                      </td>

                      {/* Updated */}
                      <td className="il-td">
                        <span className="il-date">{fmtDate(p.updated_at)}</span>
                      </td>

                      {/* Actions */}
                      <td className="il-td" onClick={(e) => e.stopPropagation()}>
                        <div className="il-row-actions">
                          <button
                            className="il-ra-btn"
                            title="Open"
                            onClick={(e) => { e.stopPropagation(); navigate(`/procedures/${p.id}`); }}
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
    </div>
  );
}
