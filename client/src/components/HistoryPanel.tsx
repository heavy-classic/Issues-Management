import { useState, useEffect } from "react";
import api from "../api/client";

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  change_type: "INSERT" | "UPDATE" | "DELETE" | "SIGNATURE";
  changed_by_user_name: string | null;
  changed_at: string;
  ip_address: string | null;
}

function parseValue(raw: string | null): string {
  if (raw === null || raw === undefined) return "—";
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null) return "—";
    if (typeof parsed === "object") {
      // For INSERT/DELETE we get the whole record — show key fields
      const keys = Object.keys(parsed).filter(
        (k) => !["id", "created_at", "updated_at", "password_hash"].includes(k)
      );
      if (keys.length === 0) return "(record)";
      return keys
        .slice(0, 6)
        .map((k) => `${k}: ${parsed[k] ?? "—"}`)
        .join(" · ");
    }
    return String(parsed);
  } catch {
    return raw;
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function changeLabel(type: AuditEntry["change_type"]): { text: string; color: string; bg: string } {
  switch (type) {
    case "INSERT":   return { text: "Created",   color: "#10b981", bg: "rgba(16,185,129,.12)" };
    case "DELETE":   return { text: "Deleted",   color: "#f43f5e", bg: "rgba(244,63,94,.12)" };
    case "SIGNATURE":return { text: "Signed",    color: "#8b5cf6", bg: "rgba(139,92,246,.12)" };
    default:         return { text: "Updated",   color: "#6366f1", bg: "rgba(99,102,241,.12)" };
  }
}

const TABLE_TO_ENDPOINT: Record<string, string> = {
  issue:     "issues",
  issues:    "issues",
  risk:      "risks",
  risks:     "risks",
  lesson:    "lessons",
  lessons:   "lessons",
  audit:     "audits",
  audits:    "audits",
  procedure: "procedures",
  procedures:"procedures",
};

export default function HistoryPanel({
  parentType,
  parentId,
}: {
  parentType: string;
  parentId: string;
}) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parentId) return;
    setLoading(true);
    setError(null);

    // Map friendly type name to table name
    const tableName = TABLE_TO_ENDPOINT[parentType.toLowerCase()] || parentType;

    api.get(`/audit/entity/${encodeURIComponent(tableName)}/${encodeURIComponent(parentId)}`)
      .then((res) => {
        const raw = res.data;
        setEntries(Array.isArray(raw) ? raw : raw.entries || []);
      })
      .catch(() => setError("Failed to load history."))
      .finally(() => setLoading(false));
  }, [parentType, parentId]);

  if (loading) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
        Loading history…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "16px", background: "#fff1f2", borderRadius: 8, color: "#be123c", fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, fontStyle: "italic", background: "var(--color-bg-subtle)", borderRadius: 10 }}>
        No history recorded yet for this record.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* vertical timeline line */}
      <div style={{
        position: "absolute", left: 15, top: 20, bottom: 20,
        width: 2, background: "var(--color-border)", zIndex: 0,
      }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {entries.map((entry, idx) => {
          const lbl = changeLabel(entry.change_type);
          const oldVal = parseValue(entry.old_value);
          const newVal = parseValue(entry.new_value);
          const isFirst = idx === 0;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                gap: 14,
                padding: "12px 0",
                position: "relative",
                background: isFirst ? "var(--color-bg-subtle)" : undefined,
                borderRadius: isFirst ? 8 : undefined,
                paddingLeft: isFirst ? 8 : 0,
                paddingRight: isFirst ? 8 : 0,
              }}
            >
              {/* Timeline dot */}
              <div style={{
                width: 30, flexShrink: 0,
                display: "flex", alignItems: "flex-start", justifyContent: "center",
                paddingTop: 2, position: "relative", zIndex: 1,
              }}>
                <div style={{
                  width: 12, height: 12,
                  borderRadius: "50%",
                  background: lbl.color,
                  border: `2px solid var(--color-bg-card)`,
                  boxShadow: `0 0 0 2px ${lbl.color}`,
                  flexShrink: 0,
                }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{
                    background: lbl.bg, color: lbl.color,
                    borderRadius: 4, padding: "1px 7px",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}>
                    {lbl.text}
                  </span>
                  {entry.field_name && (
                    <span style={{
                      fontFamily: "monospace", fontSize: 11,
                      background: "var(--color-bg-subtle)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 4, padding: "1px 6px",
                      color: "var(--color-text-secondary)",
                    }}>
                      {entry.field_name}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>
                    {fmtDate(entry.changed_at)}
                  </span>
                </div>

                {/* User */}
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: entry.field_name ? 6 : 0 }}>
                  <span style={{ fontWeight: 600 }}>{entry.changed_by_user_name || "System"}</span>
                  {entry.ip_address && (
                    <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: 6 }}>· {entry.ip_address}</span>
                  )}
                </div>

                {/* Field change diff */}
                {entry.field_name && (
                  <div style={{
                    display: "flex", gap: 8, alignItems: "center",
                    flexWrap: "wrap", marginTop: 2,
                  }}>
                    {entry.old_value !== null && (
                      <>
                        <span style={{
                          fontSize: 11, color: "#be123c",
                          background: "#fff1f2",
                          padding: "2px 7px", borderRadius: 4,
                          maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap", display: "block",
                          textDecoration: "line-through",
                        }} title={oldVal}>
                          {oldVal.length > 35 ? oldVal.slice(0, 35) + "…" : oldVal}
                        </span>
                        <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>→</span>
                      </>
                    )}
                    {entry.new_value !== null && (
                      <span style={{
                        fontSize: 11, color: "#166534",
                        background: "#f0fdf4",
                        padding: "2px 7px", borderRadius: 4,
                        maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", display: "block",
                      }} title={newVal}>
                        {newVal.length > 35 ? newVal.slice(0, 35) + "…" : newVal}
                      </span>
                    )}
                  </div>
                )}

                {/* INSERT/DELETE full record preview */}
                {!entry.field_name && (entry.new_value || entry.old_value) && (
                  <div style={{
                    fontSize: 11, color: "var(--color-text-muted)",
                    marginTop: 4,
                    maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }} title={newVal || oldVal}>
                    {(newVal || oldVal).length > 80 ? (newVal || oldVal).slice(0, 80) + "…" : (newVal || oldVal)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
