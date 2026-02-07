import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

interface Props {
  title: string;
  value: number | string;
  trend?: { direction: "up" | "down"; percent: number } | null;
  sparklineData?: { value: number }[];
  color?: string;
}

export default function KPICard({
  title,
  value,
  trend,
  sparklineData,
  color = "#2563eb",
}: Props) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-title">{title}</span>
        {trend && (
          <span
            className={`kpi-trend ${trend.direction === "up" ? "kpi-trend-up" : "kpi-trend-down"}`}
          >
            {trend.direction === "up" ? "\u2191" : "\u2193"} {trend.percent}%
          </span>
        )}
      </div>
      <div className="kpi-card-value" style={{ color }}>
        {value}
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <div className="kpi-sparkline">
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparklineData}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
