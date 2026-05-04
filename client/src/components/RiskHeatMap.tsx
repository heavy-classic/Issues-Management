const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

function getCellColor(score: number): string {
  if (score <= 4) return "#10b981";
  if (score <= 9) return "#f59e0b";
  if (score <= 16) return "#f97316";
  return "#ef4444";
}

function getCellBg(score: number): string {
  if (score <= 4) return "rgba(16,185,129,0.12)";
  if (score <= 9) return "rgba(245,158,11,0.12)";
  if (score <= 16) return "rgba(249,115,22,0.12)";
  return "rgba(239,68,68,0.12)";
}

interface Props {
  data: Record<string, number>;
  onCellClick?: (likelihood: number, impact: number) => void;
}

const CELL_SIZE = 72;
const ROW_LABEL_W = 100;

export default function RiskHeatMap({ data, onCellClick }: Props) {
  const gridW = ROW_LABEL_W + 5 * (CELL_SIZE + 4) + 4;

  return (
    <div style={{ display: "inline-block" }}>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        {/* Y-axis label */}
        <div style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textAlign: "center",
          paddingRight: "0.5rem",
          alignSelf: "center",
        }}>
          LIKELIHOOD
        </div>

        <div style={{ width: gridW }}>
          {/* Grid rows: likelihood 5 → 1 */}
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={l} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
              {/* Row label */}
              <div style={{
                width: ROW_LABEL_W,
                fontSize: "0.68rem",
                fontWeight: 500,
                textAlign: "right",
                paddingRight: "0.5rem",
                color: "var(--color-text-muted)",
                flexShrink: 0,
              }}>
                {l} – {LIKELIHOOD_LABELS[l]}
              </div>
              {/* Cells: impact 1 → 5 */}
              {[1, 2, 3, 4, 5].map((i) => {
                const score = l * i;
                const count = data[`${l}-${i}`] ?? 0;
                const hasRisks = count > 0;
                const riskLabel = score <= 4 ? "Low" : score <= 9 ? "Medium" : score <= 16 ? "High" : "Extreme";
                const ariaLabel = `${riskLabel} risk — Likelihood: ${LIKELIHOOD_LABELS[l]}, Impact: ${IMPACT_LABELS[i]}, Score: ${score}${hasRisks ? `, ${count} risk${count !== 1 ? "s" : ""}` : ", no risks"}`;
                return (
                  <div
                    key={i}
                    role={onCellClick ? "button" : undefined}
                    tabIndex={onCellClick ? 0 : undefined}
                    aria-label={ariaLabel}
                    onClick={() => onCellClick?.(l, i)}
                    onKeyDown={(e) => {
                      if (onCellClick && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onCellClick(l, i);
                      }
                    }}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 2px",
                      borderRadius: 8,
                      background: hasRisks ? getCellColor(score) : getCellBg(score),
                      color: hasRisks ? "#fff" : getCellColor(score),
                      cursor: onCellClick ? "pointer" : "default",
                      fontWeight: 700,
                      fontSize: hasRisks ? "1.4rem" : "0.75rem",
                      border: `1px solid ${getCellColor(score)}${hasRisks ? "99" : "33"}`,
                      transition: "transform 0.1s, box-shadow 0.1s",
                      flexShrink: 0,
                      opacity: hasRisks ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => {
                      if (onCellClick) {
                        (e.currentTarget as HTMLElement).style.transform = "scale(1.07)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "";
                    }}
                  >
                    <span aria-hidden="true">
                      {hasRisks ? count : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Impact column labels */}
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: 4 }}>
            <div style={{ width: ROW_LABEL_W, flexShrink: 0 }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: CELL_SIZE,
                  textAlign: "center",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  margin: "0 2px",
                  flexShrink: 0,
                }}
              >
                {i} – {IMPACT_LABELS[i]}
              </div>
            ))}
          </div>

          {/* X-axis label */}
          <div style={{
            textAlign: "center",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--color-text-muted)",
            marginTop: "0.4rem",
            paddingLeft: ROW_LABEL_W,
          }}>
            IMPACT
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        marginTop: "1rem",
        fontSize: "0.72rem",
        paddingLeft: ROW_LABEL_W / 2,
      }}>
        {[
          { label: "Low (1–4)", color: "#10b981" },
          { label: "Medium (5–9)", color: "#f59e0b" },
          { label: "High (10–16)", color: "#f97316" },
          { label: "Extreme (17–25)", color: "#ef4444" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 3, background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
