import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import RiskHeatMap from "../components/RiskHeatMap";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ResponsiveContainer,
} from "recharts";



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

const DEFAULT_CATEGORY_COLORS = ["#667eea", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function RiskAnalyticsPage({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<any>(null);
  const [heatMapData, setHeatMapData] = useState<Record<string, number>>({});
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/risk-dashboard/kpis"),
      api.get("/risk-dashboard/heat-map"),
      api.get("/risk-dashboard/by-category"),
      api.get("/risk-dashboard/by-status"),
      api.get("/risk-dashboard/trend"),
    ]).then(([kpiRes, heatRes, catRes, statusRes, trendRes]) => {
      setKpis(kpiRes.data);
      setHeatMapData(heatRes.data);
      setByCategory(catRes.data.map((d: any) => ({ ...d, count: Number(d.count) })));
      setByStatus(statusRes.data.map((d: any) => ({
        name: d.status.replace(/_/g, " "),
        status: d.status,
        count: Number(d.count),
      })));
      setTrend(trendRes.data);
      setLoading(false);
    });
  }, []);

  function handleHeatMapClick(likelihood: number, impact: number) {
    navigate(`/risks?level=${likelihood <= 1 && impact <= 4 ? "low" : ""}`);
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {!embedded && (
        <div className="dashboard-header">
          <h1>Risk Analytics</h1>
        </div>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
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

      {/* Heat Map */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Risk Heat Map (Residual)</h2>
        <RiskHeatMap data={heatMapData} onCellClick={handleHeatMapClick} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* By Category Pie */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Risks by Category</h3>
          {byCategory.length === 0 ? <p className="text-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category, count }: any) => `${category}: ${count}`}
                >
                  {byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color || DEFAULT_CATEGORY_COLORS[i % DEFAULT_CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Status Bar */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Risks by Status</h3>
          {byStatus.length === 0 ? <p className="text-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Risks">
                  {byStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || "#9ca3af"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trend */}
      {trend.length > 0 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Risk Trend (Created vs Closed)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="created" stackId="1" stroke="#3b82f6" fill="#3b82f680" name="Created" />
              <Area type="monotone" dataKey="closed" stackId="2" stroke="#10b981" fill="#10b98180" name="Closed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
