import { useSearchParams } from "react-router-dom";
import KanbanBoardPage from "./KanbanBoardPage";
import AuditKanbanBoard from "../components/AuditKanbanBoard";
import RiskKanbanBoard from "../components/RiskKanbanBoard";
import LessonKanbanBoard from "../components/LessonKanbanBoard";

const TABS = [
  { key: "issues", label: "Issues" },
  { key: "audits", label: "Audits" },
  { key: "risks", label: "Risks" },
  { key: "lessons", label: "Lessons Learned" },
];

export default function UnifiedKanbanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "issues";

  function handleTab(tab: string) {
    setSearchParams({ tab });
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Kanban Board</h1>
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

      {activeTab === "issues" && <KanbanBoardPage embedded />}
      {activeTab === "audits" && <AuditKanbanBoard />}
      {activeTab === "risks" && <RiskKanbanBoard />}
      {activeTab === "lessons" && <LessonKanbanBoard />}
    </div>
  );
}
