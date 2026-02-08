import { useSearchParams } from "react-router-dom";
import BIDashboardPage from "./BIDashboardPage";
import AuditAnalyticsPage from "./AuditAnalyticsPage";
import RiskAnalyticsPage from "./RiskAnalyticsPage";

const TABS = [
  { key: "issues", label: "Issues" },
  { key: "audits", label: "Audits" },
  { key: "risks", label: "Risks" },
];

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "issues";

  function handleTab(tab: string) {
    setSearchParams({ tab });
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Analytics</h1>
      </div>

      <div className="app-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? " active" : ""}`}
            onClick={() => handleTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "issues" && <BIDashboardPage embedded />}
      {activeTab === "audits" && <AuditAnalyticsPage embedded />}
      {activeTab === "risks" && <RiskAnalyticsPage embedded />}
    </div>
  );
}
