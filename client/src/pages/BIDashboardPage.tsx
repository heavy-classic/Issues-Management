import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";

const COLORS = [
  "#667eea",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];
const PRIORITY_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};
const STATUS_COLORS: Record<string, string> = {
  open: "#667eea",
  in_progress: "#f59e0b",
  closed: "#10b981",
};

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Stage {
  id: string;
  name: string;
}

export default function BIDashboardPage({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("90d");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [stageId, setStageId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({
    totalIssues: 0,
    openIssues: 0,
    completedActions: 0,
    avgResolutionDays: 0,
  });
  const [issuesByStatus, setIssuesByStatus] = useState<any[]>([]);
  const [issuesByPriority, setIssuesByPriority] = useState<any[]>([]);
  const [issuesByStage, setIssuesByStage] = useState<any[]>([]);
  const [issueTrend, setIssueTrend] = useState<any[]>([]);
  const [actionsByStatus, setActionsByStatus] = useState<any[]>([]);
  const [resolutionFunnel, setResolutionFunnel] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);

  useEffect(() => {
    api.get("/users").then((res) => setUsers(res.data.users));
    api
      .get("/workflow-stages")
      .then((res) => setStages(res.data.stages));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const dateFrom = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    dateFrom.setDate(dateFrom.getDate() - days);
    const params: Record<string, string> = {
      date_from: dateFrom.toISOString(),
    };
    if (priority) params.priority = priority;
    if (assigneeId) params.assignee_id = assigneeId;
    if (stageId) params.stage_id = stageId;

    try {
      const [
        kpiRes,
        statusRes,
        priorityRes,
        stageRes,
        trendRes,
        actionsRes,
        funnelRes,
        heatmapRes,
        workloadRes,
      ] = await Promise.all([
        api.get("/dashboard/kpis", { params }),
        api.get("/dashboard/issues-by-status", { params }),
        api.get("/dashboard/issues-by-priority", { params }),
        api.get("/dashboard/issues-by-stage", { params }),
        api.get("/dashboard/issue-trend", { params }),
        api.get("/dashboard/actions-by-status", { params }),
        api.get("/dashboard/resolution-funnel", { params }),
        api.get("/dashboard/priority-stage-heatmap", { params }),
        api.get("/dashboard/team-workload", { params }),
      ]);

      setKpis(kpiRes.data);
      setIssuesByStatus(statusRes.data.data);
      setIssuesByPriority(priorityRes.data.data);
      setIssuesByStage(stageRes.data.data);
      setIssueTrend(trendRes.data.data);
      setActionsByStatus(actionsRes.data.data);
      setResolutionFunnel(funnelRes.data.data);
      setHeatmapData(heatmapRes.data.data);
      setTeamWorkload(workloadRes.data.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, priority, assigneeId, stageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function drillDown(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    navigate(`/?${qs}`);
  }

  function stageIdByName(name: string): string {
    return stages.find((s) => s.name === name)?.id || "";
  }

  function userIdByName(name: string): string {
    return users.find((u) => u.name === name || u.email === name)?.id || "";
  }

  // Build heatmap grid
  const heatmapStages = [
    ...new Set(heatmapData.map((d: any) => d.stage)),
  ] as string[];
  const priorities = ["critical", "high", "medium", "low"];
  const maxHeatVal = Math.max(
    ...heatmapData.map((d: any) => d.count),
    1
  );

  return (
    <div className="bi-dashboard">
      {!embedded && (
        <div className="bi-dashboard-header">
          <h1>Analytics Dashboard</h1>
        </div>
      )}

      {/* Filter bar */}
      <div className="bi-filter-bar">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">All Stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading dashboard data...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-cards-row">
            <KPICard
              title="Total Issues"
              value={kpis.totalIssues}
              color="#667eea"
              sparklineData={issueTrend.map((d: any) => ({
                value: d.count,
              }))}
            />
            <KPICard
              title="Open Issues"
              value={kpis.openIssues}
              color="#f59e0b"
            />
            <KPICard
              title="Completed Actions"
              value={kpis.completedActions}
              color="#10b981"
            />
            <KPICard
              title="Avg Resolution Days"
              value={kpis.avgResolutionDays}
              color="#8b5cf6"
            />
          </div>

          {/* Charts Grid */}
          <div className="bi-charts-grid">
            {/* Issues by Status - Donut */}
            <ChartCard title="Issues by Status">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={issuesByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    style={{ cursor: "pointer" }}
                    onClick={(data: any) => drillDown({ status: data.name })}
                  >
                    {issuesByStatus.map((entry: any, i: number) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Issues by Priority - Bar */}
            <ChartCard title="Issues by Priority">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={issuesByPriority} style={{ cursor: "pointer" }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" onClick={(data: any) => drillDown({ priority: data.name })}>
                    {issuesByPriority.map((entry: any, i: number) => (
                      <Cell
                        key={entry.name}
                        fill={PRIORITY_COLORS[entry.name] || COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Issue Creation Trend - Area */}
            <ChartCard title="Issue Creation Trend">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={issueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(d) =>
                      new Date(d).toLocaleDateString()
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    fill="#667eea"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Actions by Status - Donut */}
            <ChartCard title="Actions by Status">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={actionsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {actionsByStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Workflow Funnel - Horizontal Bar */}
            <ChartCard title="Workflow Funnel">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={resolutionFunnel} layout="vertical" style={{ cursor: "pointer" }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="value" onClick={(data: any) => {
                    const sid = stageIdByName(data.name);
                    if (sid) drillDown({ stage_id: sid });
                  }}>
                    {resolutionFunnel.map((entry: any, i: number) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color || COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Issues by Stage - Bar */}
            <ChartCard title="Issues by Stage">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={issuesByStage} style={{ cursor: "pointer" }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" onClick={(data: any) => {
                    const sid = stageIdByName(data.name);
                    if (sid) drillDown({ stage_id: sid });
                  }}>
                    {issuesByStage.map((entry: any, i: number) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color || COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Priority x Stage Heatmap */}
            <ChartCard title="Priority x Stage Heatmap">
              <div className="heatmap-grid">
                <div className="heatmap-row heatmap-header-row">
                  <div className="heatmap-cell heatmap-label" />
                  {heatmapStages.map((s) => (
                    <div key={s} className="heatmap-cell heatmap-col-header">
                      {s}
                    </div>
                  ))}
                </div>
                {priorities.map((p) => (
                  <div key={p} className="heatmap-row">
                    <div className="heatmap-cell heatmap-label">{p}</div>
                    {heatmapStages.map((s) => {
                      const val =
                        heatmapData.find(
                          (d: any) => d.priority === p && d.stage === s
                        )?.count || 0;
                      const intensity = val / maxHeatVal;
                      return (
                        <div
                          key={s}
                          className="heatmap-cell heatmap-value"
                          style={{
                            backgroundColor: `rgba(37, 99, 235, ${intensity * 0.8})`,
                            color: intensity > 0.5 ? "white" : "#1f2937",
                            cursor: val ? "pointer" : "default",
                          }}
                          title={`${p} / ${s}: ${val}`}
                          onClick={() => {
                            if (!val) return;
                            const sid = stageIdByName(s);
                            const params: Record<string, string> = { priority: p };
                            if (sid) params.stage_id = sid;
                            drillDown(params);
                          }}
                        >
                          {val || ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Team Workload - Grouped Bar */}
            <ChartCard title="Team Workload">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={teamWorkload} style={{ cursor: "pointer" }}
                  onClick={(data: any) => {
                    if (data?.activePayload?.[0]?.payload?.name) {
                      const uid = userIdByName(data.activePayload[0].payload.name);
                      if (uid) drillDown({ assignee_id: uid });
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" fill="#667eea" name="Open" />
                  <Bar
                    dataKey="in_progress"
                    fill="#f59e0b"
                    name="In Progress"
                  />
                  <Bar dataKey="closed" fill="#10b981" name="Closed" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
