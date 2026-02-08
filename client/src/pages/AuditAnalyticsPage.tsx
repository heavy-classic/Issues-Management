import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";
import api from "../api/client";
import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";

const COLORS = ["#667eea", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af", scheduled: "#3b82f6", planning: "#8b5cf6",
  in_progress: "#f59e0b", under_review: "#06b6d4", closed: "#10b981", cancelled: "#ef4444",
};
const SEVERITY_COLORS: Record<string, string> = {
  observation: "#6b7280", minor: "#f59e0b", major: "#f97316", critical: "#ef4444",
};
const RISK_COLORS: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};

interface AuditType { id: string; name: string; }

export default function AuditAnalyticsPage({ embedded }: { embedded?: boolean }) {
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<any>({});
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [byType, setByType] = useState<any[]>([]);
  const [completionTrend, setCompletionTrend] = useState<any[]>([]);
  const [findingsBySeverity, setFindingsBySeverity] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("audit_type_id", typeFilter);
    if (riskFilter) params.set("risk_level", riskFilter);
    const qs = params.toString() ? `?${params}` : "";

    const [kpiRes, statusRes, typeRes, trendRes, sevRes, riskRes] = await Promise.all([
      api.get(`/audit-dashboard/kpis${qs}`),
      api.get(`/audit-dashboard/by-status${qs}`),
      api.get(`/audit-dashboard/by-type${qs}`),
      api.get(`/audit-dashboard/completion-trend${qs}`),
      api.get(`/audit-dashboard/findings-by-severity${qs}`),
      api.get(`/audit-dashboard/risk-distribution${qs}`),
    ]);

    setKpis(kpiRes.data);
    setByStatus(statusRes.data.data.map((d: any) => ({ ...d, count: Number(d.count), fill: STATUS_COLORS[d.status] || "#667eea" })));
    setByType(typeRes.data.data.map((d: any) => ({ ...d, count: Number(d.count) })));
    setCompletionTrend(trendRes.data.data.map((d: any) => ({ ...d, count: Number(d.count), avg_score: Number(d.avg_score || 0) })));
    setFindingsBySeverity(sevRes.data.data.map((d: any) => ({ ...d, count: Number(d.count), fill: SEVERITY_COLORS[d.severity] || "#667eea" })));
    setRiskDistribution(riskRes.data.data.map((d: any) => ({ ...d, count: Number(d.count), fill: RISK_COLORS[d.risk_level] || "#667eea" })));
    setLoading(false);
  }, [typeFilter, riskFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get("/audit-types?is_active=true").then((r) => setAuditTypes(r.data.auditTypes));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {!embedded && <div className="dashboard-header">
        <h1>Audit Analytics</h1>
      </div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {auditTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="">All Risk Levels</option>
            {["low", "medium", "high", "critical"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="kpi-row">
        <KPICard title="Total Audits" value={kpis.totalAudits} />
        <KPICard title="Closed" value={kpis.closed} />
        <KPICard title="In Progress" value={kpis.inProgress} />
        <KPICard title="Overdue" value={kpis.overdue} color={kpis.overdue > 0 ? "#ef4444" : undefined} />
        <KPICard title="Avg Score" value={kpis.avgComplianceScore ? `${kpis.avgComplianceScore}%` : "N/A"} />
        <KPICard title="Total Findings" value={kpis.totalFindings} />
        <KPICard title="Open Findings" value={kpis.openFindings} color={kpis.openFindings > 0 ? "#f59e0b" : undefined} />
      </div>

      <div className="charts-grid">
        <ChartCard title="Audits by Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status} (${count})`}>
                {byStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Audits by Type">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#667eea">
                {byType.map((entry, i) => <Cell key={i} fill={entry.type_color || COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Completion Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={completionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#667eea" fill="#667eea" fillOpacity={0.2} name="Completed" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Findings by Severity">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={findingsBySeverity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="severity" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count">
                {findingsBySeverity.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="count" nameKey="risk_level" cx="50%" cy="50%" innerRadius={40} outerRadius={100} label={({ risk_level, count }) => `${risk_level} (${count})`}>
                {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
