import { useState, useEffect } from "react";
import api from "../api/client";
import { useModalA11y } from "../hooks/useModalA11y";

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
  changed_by_user_name: string;
  changed_at: string;
  ip_address: string | null;
}

interface Props {
  issueId: string;
  onClose: () => void;
}

function formatValue(val: string | null): string {
  if (val === null || val === "null") return "-";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object") return JSON.stringify(parsed, null, 2);
    return String(parsed);
  } catch {
    return val;
  }
}

export default function AuditHistoryModal({ issueId, onClose }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const dialogRef = useModalA11y(onClose);

  useEffect(() => {
    api.get(`/audit/issues/${issueId}`).then((res) => {
      setEntries(res.data.entries);
      setLoading(false);
    });
  }, [issueId]);

  const filtered = filter
    ? entries.filter((e) => e.change_type === filter)
    : entries;

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
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-content audit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-history-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="audit-modal-header">
          <h2 id="audit-history-title">Audit History</h2>
          <button onClick={onClose} className="btn btn-secondary btn-sm" aria-label="Close Audit History">Close</button>
        </div>

        <div className="audit-filters">
          <label htmlFor="ah-filter" className="sr-only">Filter by type</label>
          <select id="ah-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="INSERT">Insert</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="SIGNATURE">Signature</option>
          </select>
        </div>

        {loading ? (
          <p className="loading">Loading history...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted">No audit entries found.</p>
        ) : (
          <div className="audit-timeline">
            {filtered.map((entry) => (
              <div key={entry.id} className="audit-entry">
                <div
                  className="audit-entry-dot"
                  style={{ backgroundColor: changeTypeColor(entry.change_type) }}
                />
                <div className="audit-entry-content">
                  <div className="audit-entry-header">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: changeTypeColor(entry.change_type) + "20",
                        color: changeTypeColor(entry.change_type),
                      }}
                    >
                      {entry.change_type}
                    </span>
                    <span className="audit-entry-table">{entry.table_name}</span>
                    {entry.field_name && (
                      <span className="audit-entry-field">.{entry.field_name}</span>
                    )}
                    <span className="audit-entry-time">
                      {new Date(entry.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="audit-entry-user">
                    by {entry.changed_by_user_name}
                    {entry.ip_address && ` from ${entry.ip_address}`}
                  </div>
                  {(entry.old_value || entry.new_value) && (
                    <div className="audit-entry-values">
                      {entry.old_value && (
                        <div className="audit-old-value">
                          <span>Old:</span> {formatValue(entry.old_value)}
                        </div>
                      )}
                      {entry.new_value && (
                        <div className="audit-new-value">
                          <span>New:</span> {formatValue(entry.new_value)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
