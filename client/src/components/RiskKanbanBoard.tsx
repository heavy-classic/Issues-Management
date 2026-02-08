import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import api from "../api/client";

const LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  extreme: "#ef4444",
};

interface Risk {
  id: string;
  risk_number: string;
  title: string;
  status: string;
  residual_score: number | null;
  residual_level: string | null;
  category_name: string | null;
  category_color: string | null;
  owner_name: string | null;
  owner_email: string | null;
}

interface Column {
  status: string;
  label: string;
  color: string;
  risks: Risk[];
}

export default function RiskKanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await api.get(`/risks/kanban?${params}`);
    setColumns(res.data.columns);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const srcStatus = result.source.droppableId;
    const dstStatus = result.destination.droppableId;
    if (srcStatus === dstStatus) return;

    const riskId = result.draggableId;

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, risks: [...col.risks] }));
      const srcCol = next.find((c) => c.status === srcStatus);
      const dstCol = next.find((c) => c.status === dstStatus);
      if (!srcCol || !dstCol) return prev;
      const idx = srcCol.risks.findIndex((r) => r.id === riskId);
      if (idx < 0) return prev;
      const [risk] = srcCol.risks.splice(idx, 1);
      risk.status = dstStatus;
      dstCol.risks.splice(result.destination!.index, 0, risk);
      return next;
    });

    try {
      await api.post(`/risks/kanban/${riskId}/transition`, { status: dstStatus });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to transition risk");
      fetchBoard();
    }
  }

  if (loading) return <div className="loading">Loading board...</div>;

  return (
    <div className="kanban-page">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search risks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="kanban-search"
        />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => (
            <div key={column.status} className="kanban-column">
              <div className="kanban-column-header" style={{ borderTopColor: column.color }}>
                <span className="kanban-column-dot" style={{ backgroundColor: column.color }} />
                <span className="kanban-column-title">{column.label}</span>
                <span className="kanban-column-count">{column.risks.length}</span>
              </div>
              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                  >
                    {column.risks.map((risk, index) => (
                      <Draggable key={risk.id} draggableId={risk.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card ${snapshot.isDragging ? "dragging" : ""}`}
                          >
                            <Link to={`/risks/${risk.id}`} className="kanban-card-title">
                              {risk.risk_number}: {risk.title}
                            </Link>
                            <div className="kanban-card-meta">
                              {risk.category_name && (
                                <span className="badge" style={{ background: risk.category_color || "#9ca3af", color: "#fff", fontSize: "0.65rem" }}>
                                  {risk.category_name}
                                </span>
                              )}
                              {risk.residual_level && (
                                <span className="badge" style={{ background: LEVEL_COLORS[risk.residual_level] || "#9ca3af", color: "#fff", fontSize: "0.65rem" }}>
                                  {risk.residual_score}
                                </span>
                              )}
                              <span className="kanban-card-assignee">
                                {risk.owner_name || risk.owner_email || "No Owner"}
                              </span>
                            </div>
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
