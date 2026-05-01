import { useState, useEffect } from "react";
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
  updated_at: string;
  safety_classification: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:      { bg: "#f3f4f6",  color: "#6b7280" },
  review:     { bg: "#fef3c7",  color: "#d97706" },
  approved:   { bg: "#d1fae5",  color: "#065f46" },
  superseded: { bg: "#e5e7eb",  color: "#9ca3af" },
  cancelled:  { bg: "#fee2e2",  color: "#dc2626" },
};

export default function ProceduresPage() {
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: LIMIT };
    if (search) params.search = search;
    if (statusFilter !== "all") params.status = statusFilter;
    if (typeFilter !== "all") params.procedure_type = typeFilter;

    api.get("/procedures", { params })
      .then((res) => {
        setProcedures(res.data.procedures || res.data);
        setTotal(res.data.total ?? (res.data.procedures || res.data).length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, statusFilter, typeFilter, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-dark)", margin: 0 }}>
            📄 Procedures
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4, margin: 0 }}>
            Administrative and operational procedures following DOE-STD-1029
          </p>
        </div>
        <button
          className="btn-submit"
          style={{ fontSize: 13, padding: "8px 18px" }}
          onClick={() => navigate("/procedures/new")}
        >
          + New Procedure
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by number or title…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200, maxWidth: 340, fontSize: 13 }}
        />
        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ fontSize: 13, minWidth: 130 }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="superseded">Superseded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="form-input"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          style={{ fontSize: 13, minWidth: 180 }}
        >
          <option value="all">All types</option>
          <option value="Operating Procedure">Operating</option>
          <option value="Maintenance Procedure">Maintenance</option>
          <option value="Safety Procedure">Safety</option>
          <option value="Quality Procedure">Quality</option>
          <option value="Administrative Procedure">Administrative</option>
          <option value="Calibration Procedure">Calibration</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Number</th>
              <th style={{ minWidth: 280 }}>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Rev</th>
              <th>Author</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>Loading…</td></tr>
            ) : procedures.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>No procedures found</td></tr>
            ) : procedures.map((p) => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
              return (
                <tr
                  key={p.id}
                  className="table-row-hover"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/procedures/${p.id}`)}
                >
                  <td>
                    <span style={{
                      fontFamily: "monospace", fontSize: 12,
                      background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)",
                      borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap"
                    }}>
                      {p.procedure_number}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--color-text)" }}>{p.title}</td>
                  <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {p.procedure_type?.replace(" Procedure", "") ?? "—"}
                  </td>
                  <td>
                    <span style={{
                      background: sc.bg, color: sc.color,
                      borderRadius: 5, padding: "2px 8px",
                      fontSize: 11, fontWeight: 700, textTransform: "capitalize"
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontSize: 12 }}>
                    Rev {p.revision_number ?? 0}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {p.author_name || p.author_email || "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ fontSize: 12 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", alignSelf: "center" }}>
            Page {page} of {totalPages}
          </span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ fontSize: 12 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
