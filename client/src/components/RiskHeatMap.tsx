const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

function getCellColor(score: number): string {
  if (score <= 4) return "#10b981";
  if (score <= 9) return "#f59e0b";
  if (score <= 16) return "#f97316";
  return "#ef4444";
}

function getCellBg(score: number): string {
  if (score <= 4) return "rgba(16,185,129,0.15)";
  if (score <= 9) return "rgba(245,158,11,0.15)";
  if (score <= 16) return "rgba(249,115,22,0.15)";
  return "rgba(239,68,68,0.15)";
}

interface Props {
  data: Record<string, number>;
  onCellClick?: (likelihood: number, impact: number) => void;
}

export default function RiskHeatMap({ data, onCellClick }: Props) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        {/* Y-axis label */}
        <div style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textAlign: "center",
          paddingRight: "0.5rem",
        }}>
          LIKELIHOOD
        </div>

        <div style={{ flex: 1 }}>
          {/* Grid rows: likelihood 5 → 1 (top to bottom) */}
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={l} style={{ display: "flex", alignItems: "center" }}>
              {/* Row label */}
              <div style={{
                width: 90,
                fontSize: "0.7rem",
                fontWeight: 500,
                textAlign: "right",
                paddingRight: "0.5rem",
                color: "var(--color-text-muted)",
              }}>
                {l} - {LIKELIHOOD_LABELS[l]}
              </div>
              {/* Cells: impact 1 → 5 */}
              {[1, 2, 3, 4, 5].map((i) => {
                const score = l * i;
                const count = data[`${l}-${i}`] || 0;
                return (
                  <div
                    key={i}
                    onClick={() => onCellClick?.(l, i)}
                    style={{
                      flex: 1,
                      aspectRatio: "1",
                      maxWidth: 80,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: 2,
                      borderRadius: 6,
                      background: count > 0 ? getCellColor(score) : getCellBg(score),
                      color: count > 0 ? "#fff" : getCellColor(score),
                      cursor: onCellClick ? "pointer" : "default",
                      fontWeight: 600,
                      fontSize: count > 0 ? "1.25rem" : "0.85rem",
                      border: `1px solid ${getCellColor(score)}40`,
                      transition: "transform 0.1s",
                    }}
                    title={`L:${l} x I:${i} = ${score} (${count} risks)`}
                  >
                    {count > 0 ? count : score}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Impact labels */}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: 90 }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  maxWidth: 80,
                  textAlign: "center",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  paddingTop: "0.25rem",
                  margin: "0 2px",
                }}
              >
                {i} - {IMPACT_LABELS[i]}
              </div>
            ))}
          </div>

          {/* X-axis label */}
          <div style={{
            textAlign: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--color-text-muted)",
            marginTop: "0.25rem",
          }}>
            IMPACT
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem", fontSize: "0.75rem" }}>
        {[
          { label: "Low (1-4)", color: "#10b981" },
          { label: "Medium (5-9)", color: "#f59e0b" },
          { label: "High (10-16)", color: "#f97316" },
          { label: "Extreme (17-25)", color: "#ef4444" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
