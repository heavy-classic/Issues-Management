import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import api from "../api/client";

interface Issue {
  id: string;
  title: string;
  priority: string;
  assignee_name: string | null;
  assignee_email: string | null;
  reporter_name: string | null;
  current_stage_id: string;
  signatureCount: number;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  requires_signature: boolean;
}

interface Column {
  stage: Stage;
  issues: Issue[];
}

export default function KanbanBoardPage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [filters, setFilters] = useState({
    priority: "",
    search: "",
  });
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    const res = await api.get(`/workflow/kanban?${params}`);
    setColumns(res.data.columns);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const sourceStageId = result.source.droppableId;
    const destStageId = result.destination.droppableId;
    if (sourceStageId === destStageId) return;

    const issueId = result.draggableId;

    // Optimistic update
    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        issues: [...col.issues],
      }));
      const srcCol = next.find((c) => c.stage.id === sourceStageId);
      const dstCol = next.find((c) => c.stage.id === destStageId);
      if (!srcCol || !dstCol) return prev;
      const issueIdx = srcCol.issues.findIndex((i) => i.id === issueId);
      if (issueIdx < 0) return prev;
      const [issue] = srcCol.issues.splice(issueIdx, 1);
      issue.current_stage_id = destStageId;
      dstCol.issues.splice(result.destination!.index, 0, issue);
      return next;
    });

    try {
      await api.post(`/workflow/issues/${issueId}/transition`, {
        target_stage_id: destStageId,
      });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to transition issue");
      fetchBoard();
    }
  }

  function priorityColor(priority: string) {
    const colors: Record<string, string> = {
      low: "#6b7280",
      medium: "#2563eb",
      high: "#f59e0b",
      critical: "#dc2626",
    };
    return colors[priority] || "#6b7280";
  }

  if (loading) return <div className="loading">Loading board...</div>;

  return (
    <div className="kanban-page">
      <div className="kanban-header">
        <h1>Kanban Board</h1>
        <div className="kanban-filters">
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="kanban-search"
          />
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => (
            <div key={column.stage.id} className="kanban-column">
              <div
                className="kanban-column-header"
                style={{ borderTopColor: column.stage.color }}
              >
                <span
                  className="kanban-column-dot"
                  style={{ backgroundColor: column.stage.color }}
                />
                <span className="kanban-column-title">{column.stage.name}</span>
                <span className="kanban-column-count">{column.issues.length}</span>
                {column.stage.requires_signature && (
                  <span className="kanban-sig-badge" title="Requires signature">S</span>
                )}
              </div>
              <Droppable droppableId={column.stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                  >
                    {column.issues.map((issue, index) => (
                      <Draggable
                        key={issue.id}
                        draggableId={issue.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card ${snapshot.isDragging ? "dragging" : ""}`}
                          >
                            <Link to={`/issues/${issue.id}`} className="kanban-card-title">
                              {issue.title}
                            </Link>
                            <div className="kanban-card-meta">
                              <span
                                className="kanban-card-priority"
                                style={{ color: priorityColor(issue.priority) }}
                              >
                                {issue.priority}
                              </span>
                              <span className="kanban-card-assignee">
                                {issue.assignee_name || issue.assignee_email || "Unassigned"}
                              </span>
                            </div>
                            {issue.signatureCount > 0 && (
                              <span className="kanban-card-sig">
                                {issue.signatureCount} sig{issue.signatureCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
