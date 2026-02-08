import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import api from "../api/client";

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

const REPORT_TYPES = [
  {
    id: "issues",
    label: "Issues",
    description: "Analyze issue data across status, priority, stages",
  },
  {
    id: "actions",
    label: "Actions",
    description: "Analyze action plans, completion rates, overdue items",
  },
  {
    id: "workflow",
    label: "Workflow",
    description: "Stage transitions, funnel analysis, cycle times",
  },
  {
    id: "teams",
    label: "Teams",
    description: "Team workload, assignment distribution, productivity",
  },
];

const FIELDS_BY_TYPE: Record<string, string[]> = {
  issues: [
    "title",
    "status",
    "priority",
    "stage",
    "assignee",
    "reporter",
    "created_at",
    "updated_at",
  ],
  actions: [
    "title",
    "status",
    "priority",
    "assignee",
    "due_date",
    "completed_at",
    "issue",
  ],
  workflow: [
    "stage",
    "status",
    "assignee",
    "completed_at",
    "created_at",
  ],
  teams: [
    "assignee",
    "status",
    "priority",
    "stage",
    "created_at",
  ],
};

const AVAILABLE_DIMENSIONS = [
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "stage", label: "Workflow Stage" },
  { id: "assignee", label: "Assignee" },
  { id: "reporter", label: "Reporter" },
  { id: "created_date", label: "Created Date" },
  { id: "created_month", label: "Created Month" },
  { id: "action_status", label: "Action Status" },
  { id: "action_priority", label: "Action Priority" },
  { id: "action_assignee", label: "Action Assignee" },
];

const AVAILABLE_MEASURES = [
  { id: "count", label: "Count" },
  { id: "issue_count", label: "Issue Count (distinct)" },
  { id: "action_count", label: "Action Count (distinct)" },
  { id: "avg_resolution_days", label: "Avg Resolution Days" },
  { id: "completed_actions", label: "Completed Actions" },
  { id: "overdue_actions", label: "Overdue Actions" },
];

const CHART_TYPES = [
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "pie", label: "Pie" },
  { id: "donut", label: "Donut" },
  { id: "table", label: "Table" },
];

interface SavedReport {
  id: string;
  name: string;
  description: string;
  report_type: string;
  config: any;
  creator_name: string | null;
  creator_email: string;
  is_public: boolean;
  created_at: string;
}

export default function ReportBuilderPage() {
  const [mode, setMode] = useState<"list" | "wizard">("list");
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState("issues");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>(["count"]);
  const [chartType, setChartType] = useState("bar");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    priority: "",
    assignee_id: "",
  });
  const [reportName, setReportName] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Preview
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Users for filter
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
    api.get("/users").then((res) => setUsers(res.data.users));
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await api.get("/reports");
      setReports(res.data.reports);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  function startNewReport() {
    setMode("wizard");
    setStep(1);
    setReportType("issues");
    setSelectedFields([]);
    setDimensions([]);
    setMeasures(["count"]);
    setChartType("bar");
    setFilters({ dateFrom: "", dateTo: "", status: "", priority: "", assignee_id: "" });
    setReportName("");
    setReportDesc("");
    setIsPublic(false);
    setPreviewData(null);
  }

  async function handleRunSaved(report: SavedReport) {
    const config = typeof report.config === "string" ? JSON.parse(report.config) : report.config;
    setReportType(config.reportType || report.report_type);
    setDimensions(config.dimensions || []);
    setMeasures(config.measures || ["count"]);
    setChartType(config.chartType || "bar");
    setFilters(config.filters || {});
    setReportName(report.name);
    setMode("wizard");
    setStep(6);

    // Run report
    setPreviewLoading(true);
    try {
      const res = await api.post("/reports/run", config);
      setPreviewData(res.data);
    } catch {
      alert("Failed to run report");
    }
    setPreviewLoading(false);
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm("Delete this saved report?")) return;
    try {
      await api.delete(`/reports/${reportId}`);
      fetchReports();
    } catch {
      alert("Failed to delete report");
    }
  }

  function buildConfig() {
    return {
      reportType,
      fields: selectedFields,
      dimensions,
      measures,
      chartType,
      filters: {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        assignee_id: filters.assignee_id || undefined,
      },
    };
  }

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const res = await api.post("/reports/run", buildConfig());
      setPreviewData(res.data);
    } catch {
      alert("Failed to run report");
    }
    setPreviewLoading(false);
  }

  async function handleSave() {
    if (!reportName.trim()) {
      alert("Please enter a report name");
      return;
    }
    setSaving(true);
    try {
      await api.post("/reports", {
        name: reportName,
        description: reportDesc,
        report_type: reportType,
        config: buildConfig(),
        is_public: isPublic,
      });
      setMode("list");
      fetchReports();
    } catch {
      alert("Failed to save report");
    }
    setSaving(false);
  }

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  // Render chart from preview data
  function renderChart() {
    if (!previewData || !previewData.data || previewData.data.length === 0) {
      return <p className="text-muted">No data available</p>;
    }

    const data = previewData.data;
    const dim = previewData.dimensions[0] || "";
    const measure = previewData.measures[0] || "count";

    if (chartType === "table") {
      return (
        <div className="report-table-wrapper">
          <table className="issues-table">
            <thead>
              <tr>
                {previewData.dimensions.map((d: string) => (
                  <th key={d}>{d}</th>
                ))}
                {previewData.measures.map((m: string) => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={i}>
                  {previewData.dimensions.map((d: string) => (
                    <td key={d}>{row[d] ?? "N/A"}</td>
                  ))}
                  {previewData.measures.map((m: string) => (
                    <td key={m}>
                      {typeof row[m] === "number"
                        ? Math.round(row[m] * 100) / 100
                        : row[m]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (chartType === "pie" || chartType === "donut") {
      const pieData = data.map((row: any) => ({
        name: row[dim] || "N/A",
        value: Number(row[measure]) || 0,
      }));
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === "donut" ? 60 : 0}
              outerRadius={120}
              dataKey="value"
              nameKey="name"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {pieData.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    const chartData = data.map((row: any) => ({
      name: row[dim] || "N/A",
      ...previewData.measures.reduce(
        (acc: any, m: string) => ({
          ...acc,
          [m]:
            typeof row[m] === "number"
              ? Math.round(row[m] * 100) / 100
              : Number(row[m]) || 0,
        }),
        {}
      ),
    }));

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {previewData.measures.map((m: string, i: number) => (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            {previewData.measures.map((m: string, i: number) => (
              <Area
                key={m}
                type="monotone"
                dataKey={m}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.15}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          {previewData.measures.map((m: string, i: number) => (
            <Bar key={m} dataKey={m} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ===== LIST MODE =====
  if (mode === "list") {
    return (
      <div className="report-builder">
        <div className="report-builder-header">
          <h1>Reports</h1>
          <button className="btn btn-primary" onClick={startNewReport}>
            + New Report
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading reports...</div>
        ) : reports.length === 0 ? (
          <p className="text-muted">No saved reports yet. Create your first report!</p>
        ) : (
          <table className="issues-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Creator</th>
                <th>Public</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.report_type}</td>
                  <td>{r.creator_name || r.creator_email}</td>
                  <td>{r.is_public ? "Yes" : "No"}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRunSaved(r)}
                      >
                        Run
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteReport(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // ===== WIZARD MODE =====
  return (
    <div className="report-builder">
      <div className="report-builder-header">
        <h1>Report Builder</h1>
        <button
          className="btn btn-secondary"
          onClick={() => setMode("list")}
        >
          Back to Reports
        </button>
      </div>

      {/* Step Indicator */}
      <div className="wizard-steps">
        {[
          "Type",
          "Fields",
          "Dimensions",
          "Chart",
          "Filters",
          "Save",
        ].map((label, i) => (
          <button
            key={label}
            className={`wizard-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`}
            onClick={() => setStep(i + 1)}
          >
            <span className="wizard-step-num">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="wizard-body">
        {/* Step 1: Report Type */}
        {step === 1 && (
          <div className="wizard-step-content">
            <h3>Select Report Type</h3>
            <div className="report-type-cards">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  className={`report-type-card ${reportType === rt.id ? "selected" : ""}`}
                  onClick={() => setReportType(rt.id)}
                >
                  <strong>{rt.label}</strong>
                  <span>{rt.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Fields */}
        {step === 2 && (
          <div className="wizard-step-content">
            <h3>Select Data Fields</h3>
            <div className="checkbox-grid">
              {(FIELDS_BY_TYPE[reportType] || []).map((f) => (
                <label key={f} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(f)}
                    onChange={() =>
                      setSelectedFields(toggleArrayItem(selectedFields, f))
                    }
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Dimensions & Measures */}
        {step === 3 && (
          <div className="wizard-step-content">
            <h3>Dimensions & Measures</h3>
            <div className="dim-measure-cols">
              <div className="dim-col">
                <h4>Group By (Dimensions)</h4>
                {AVAILABLE_DIMENSIONS.map((d) => (
                  <label key={d.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={dimensions.includes(d.id)}
                      onChange={() =>
                        setDimensions(toggleArrayItem(dimensions, d.id))
                      }
                    />
                    {d.label}
                  </label>
                ))}
              </div>
              <div className="measure-col">
                <h4>Aggregations (Measures)</h4>
                {AVAILABLE_MEASURES.map((m) => (
                  <label key={m.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={measures.includes(m.id)}
                      onChange={() =>
                        setMeasures(toggleArrayItem(measures, m.id))
                      }
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Chart Type */}
        {step === 4 && (
          <div className="wizard-step-content">
            <h3>Visualization Type</h3>
            <div className="chart-type-picker">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  className={`chart-type-btn ${chartType === ct.id ? "selected" : ""}`}
                  onClick={() => setChartType(ct.id)}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Filters */}
        {step === 5 && (
          <div className="wizard-step-content">
            <h3>Filters</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    setFilters({ ...filters, priority: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assignee</label>
                <select
                  value={filters.assignee_id}
                  onChange={(e) =>
                    setFilters({ ...filters, assignee_id: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Save & Preview */}
        {step === 6 && (
          <div className="wizard-step-content">
            <h3>Preview & Save</h3>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Report Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="My Report"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />{" "}
                  Public
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="form-actions" style={{ marginBottom: "1rem" }}>
              <button
                className="btn btn-secondary"
                onClick={handlePreview}
                disabled={previewLoading}
              >
                {previewLoading ? "Running..." : "Preview"}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Report"}
              </button>
            </div>

            {/* Chart Preview */}
            {previewData && (
              <div className="report-preview">
                <h4>Results ({previewData.data?.length || 0} rows)</h4>
                {renderChart()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="wizard-nav">
        {step > 1 && (
          <button
            className="btn btn-secondary"
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        )}
        {step < 6 && (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
