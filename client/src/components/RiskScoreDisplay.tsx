const LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

const LEVEL_BG: Record<string, string> = {
  low: "rgba(16,185,129,0.1)",
  medium: "rgba(245,158,11,0.1)",
  high: "rgba(249,115,22,0.1)",
  extreme: "rgba(239,68,68,0.1)",
};

interface ScoreSet {
  label: string;
  likelihood: number | null;
  impact: number | null;
  score: number | null;
  level: string | null;
}

interface Props {
  inherent: ScoreSet;
  residual: ScoreSet;
  target: ScoreSet;
}

function ScoreBox({ data }: { data: ScoreSet }) {
  const color = data.level ? LEVEL_COLORS[data.level] : "var(--color-text-muted)";
  const bg = data.level ? LEVEL_BG[data.level] : "var(--color-bg-subtle)";

  return (
    <div style={{
      flex: 1,
      textAlign: "center",
      padding: "1rem",
      borderRadius: 8,
      background: bg,
      border: `1px solid ${color}`,
    }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
        {data.label}
      </div>
      {data.score ? (
        <>
          <div style={{ fontSize: "2rem", fontWeight: 700, color }}>{data.score}</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color, textTransform: "capitalize" }}>{data.level}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            L:{data.likelihood} x I:{data.impact}
          </div>
        </>
      ) : (
        <div style={{ fontSize: "1.5rem", color: "var(--color-text-muted)" }}>-</div>
      )}
    </div>
  );
}

export default function RiskScoreDisplay({ inherent, residual, target }: Props) {
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "stretch" }}>
      <ScoreBox data={{ ...inherent, label: "Inherent" }} />
      <div style={{ display: "flex", alignItems: "center", fontSize: "1.5rem", color: "var(--color-text-muted)" }}>
        &rarr;
      </div>
      <ScoreBox data={{ ...residual, label: "Residual" }} />
      <div style={{ display: "flex", alignItems: "center", fontSize: "1.5rem", color: "var(--color-text-muted)" }}>
        &rarr;
      </div>
      <ScoreBox data={{ ...target, label: "Target" }} />
    </div>
  );
}
