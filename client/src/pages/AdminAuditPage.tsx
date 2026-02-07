import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
  changed_by_user_name: string;
  changed_by_user_id: string;
  changed_at: string;
  ip_address: string | null;
  change_reason: string | null;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    table_name: "",
    change_type: "",
    from_date: "",
    to_date: "",
  });
  const [loading, setLoading] = useState(true);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (filters.table_name) params.set("table_name", filters.table_name);
    if (filters.change_type) params.set("change_type", filters.change_type);
    if (filters.from_date) params.set("from_date", filters.from_date);
    if (filters.to_date) params.set("to_date", filters.to_date);
    const res = await api.get(`/audit?${params}`);
    setEntries(res.data.entries);
    setTotal(res.data.total);
    setLoading(false);
  }, [page, filters]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  async function handleExport() {
    const params = new URLSearchParams();
    if (filters.table_name) params.set("table_name", filters.table_name);
    if (filters.change_type) params.set("change_type", filters.change_type);
    if (filters.from_date) params.set("from_date", filters.from_date);
    if (filters.to_date) params.set("to_date", filters.to_date);
    const res = await api.get(`/audit/export?${params}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / 50);

  function changeTypeColor(type: string) {
    switch (type) {
      case "INSERT": return "#10b981";
      case "UPDATE": return "#f59e0b";
      case "DELETE": return "#dc2626";
      case "SIGNATURE": return "#6366f1";
      default: return "#6b7280";
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Audit Log</h1>
        <button onClick={handleExport} className="btn btn-secondary">
          Export CSV
        </button>
      </div>

      <div className="filters">
        <select
          value={filters.table_name}
          onChange={(e) => { setFilters({ ...filters, table_name: e.target.value }); setPage(1); }}
        >
          <option value="">All Tables</option>
          <option value="issues">Issues</option>
          <option value="comments">Comments</option>
          <option value="electronic_signatures">Signatures</option>
          <option value="issue_stage_assignments">Stage Assignments</option>
        </select>
        <select
          value={filters.change_type}
          onChange={(e) => { setFilters({ ...filters, change_type: e.target.value }); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="INSERT">Insert</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="SIGNATURE">Signature</option>
        </select>
        <input
          type="date"
          value={filters.from_date}
          onChange={(e) => { setFilters({ ...filters, from_date: e.target.value }); setPage(1); }}
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.to_date}
          onChange={(e) => { setFilters({ ...filters, to_date: e.target.value }); setPage(1); }}
          placeholder="To date"
        />
      </div>

      {loading ? (
        <p className="loading">Loading audit log...</p>
      ) : (
        <>
          <p className="text-muted">{total} entries total</p>
          <table className="issues-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Table</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>User</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                    {new Date(entry.changed_at).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: changeTypeColor(entry.change_type) + "20",
                        color: changeTypeColor(entry.change_type),
                      }}
                    >
                      {entry.change_type}
                    </span>
                  </td>
                  <td>{entry.table_name}</td>
                  <td>{entry.field_name || "-"}</td>
                  <td className="audit-value-cell">
                    {entry.old_value ? String(entry.old_value).slice(0, 50) : "-"}
                  </td>
                  <td className="audit-value-cell">
                    {entry.new_value ? String(entry.new_value).slice(0, 50) : "-"}
                  </td>
                  <td>{entry.changed_by_user_name}</td>
                  <td style={{ fontSize: "0.75rem" }}>{entry.ip_address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
