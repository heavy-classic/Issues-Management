import { useState, useEffect } from "react";
import api from "../api/client";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, ResponsiveContainer, Legend,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  improvement: "#3b82f6",
};

const IMPACT_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const EFFECTIVENESS_COLORS: Record<string, string> = {
  ineffective: "#ef4444",
  partially_effective: "#f59e0b",
  effective: "#10b981",
  highly_effective: "#059669",
};

const DEFAULT_COLORS = ["#667eea", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function LessonAnalyticsPage({ embedded }: { embedded?: boolean }) {
  const [kpis, setKpis] = useState<any>(null);
  const [byType, setByType] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [byImpact, setByImpact] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [byEffectiveness, setByEffectiveness] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/lesson-dashboard/kpis"),
      api.get("/lesson-dashboard/by-type"),
      api.get("/lesson-dashboard/by-category"),
      api.get("/lesson-dashboard/by-impact"),
      api.get("/lesson-dashboard/by-status"),
      api.get("/lesson-dashboard/by-effectiveness"),
      api.get("/lesson-dashboard/trend"),
    ]).then(([kpiRes, typeRes, catRes, impactRes, statusRes, effRes, trendRes]) => {
      setKpis(kpiRes.data);
      setByType(typeRes.data.map((d: any) => ({ name: d.type, count: Number(d.count) })));
      setByCategory(catRes.data.map((d: any) => ({ name: d.category || "Uncategorized", count: Number(d.count) })));
      setByImpact(impactRes.data.map((d: any) => ({ name: d.impact_level, count: Number(d.count) })));
      setByStatus(statusRes.data.map((d: any) => ({ name: d.status.replace(/_/g, " "), status: d.status, count: Number(d.count) })));
      setByEffectiveness(effRes.data.map((d: any) => ({ name: d.effectiveness_rating.replace(/_/g, " "), rating: d.effectiveness_rating, count: Number(d.count) })));
      setTrend(trendRes.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {!embedded && (
        <div className="dashboard-header">
          <h1>Lessons Learned Analytics</h1>
        </div>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{kpis.total}</div>
            <div className="text-muted">Total Lessons</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#3b82f6" }}>{kpis.open}</div>
            <div className="text-muted">Open</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{kpis.high_critical}</div>
            <div className="text-muted">High / Critical</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#8b5cf6" }}>{kpis.implemented}</div>
            <div className="text-muted">Implemented</div>
          </div>
          <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{kpis.effective}</div>
            <div className="text-muted">Effective</div>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* By Type Pie */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Lessons by Type</h3>
          {byType.length === 0 ? <p className="text-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byType}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.name}: ${entry.count}`}
                >
                  {byType.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Category Bar */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Lessons by Category</h3>
          {byCategory.length === 0 ? <p className="text-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Lessons">
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* By Impact */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Lessons by Impact Level</h3>
          {byImpact.length === 0 ? <p className="text-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byImpact}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Lessons">
                  {byImpact.map((entry, i) => (
                    <Cell key={i} fill={IMPACT_COLORS[entry.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Effectiveness */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Effectiveness Rating</h3>
          {byEffectiveness.length === 0 ? <p className="text-muted">No data</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byEffectiveness}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.name}: ${entry.count}`}
                >
                  {byEffectiveness.map((entry, i) => (
                    <Cell key={i} fill={EFFECTIVENESS_COLORS[entry.rating] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* By Status */}
      {byStatus.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Lessons by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Lessons">
                {byStatus.map((_, i) => (
                  <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend */}
      {trend.length > 0 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Lesson Trend (Created vs Closed)</h3>
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
