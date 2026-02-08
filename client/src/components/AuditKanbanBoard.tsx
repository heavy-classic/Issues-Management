import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import api from "../api/client";

interface Audit {
  id: string;
  audit_number: string;
  title: string;
  status: string;
  priority: string;
  risk_level: string | null;
  type_name: string;
  type_color: string;
  lead_name: string | null;
  lead_email: string | null;
}

interface Column {
  status: string;
  label: string;
  color: string;
  audits: Audit[];
}

export default function AuditKanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await api.get(`/audits/kanban?${params}`);
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

    const auditId = result.draggableId;

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, audits: [...col.audits] }));
      const srcCol = next.find((c) => c.status === srcStatus);
      const dstCol = next.find((c) => c.status === dstStatus);
      if (!srcCol || !dstCol) return prev;
      const idx = srcCol.audits.findIndex((a) => a.id === auditId);
      if (idx < 0) return prev;
      const [audit] = srcCol.audits.splice(idx, 1);
      audit.status = dstStatus;
      dstCol.audits.splice(result.destination!.index, 0, audit);
      return next;
    });

    try {
      await api.post(`/audits/kanban/${auditId}/transition`, { status: dstStatus });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to transition audit");
      fetchBoard();
    }
  }

  if (loading) return <div className="loading">Loading board...</div>;

  return (
    <div className="kanban-page">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search audits..."
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
                <span className="kanban-column-count">{column.audits.length}</span>
              </div>
              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                  >
                    {column.audits.map((audit, index) => (
                      <Draggable key={audit.id} draggableId={audit.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card ${snapshot.isDragging ? "dragging" : ""}`}
                          >
                            <Link to={`/audits/${audit.id}`} className="kanban-card-title">
                              {audit.audit_number}: {audit.title}
                            </Link>
                            <div className="kanban-card-meta">
                              {audit.type_name && (
                                <span className="badge" style={{ background: audit.type_color, color: "#fff", fontSize: "0.65rem" }}>
                                  {audit.type_name}
                                </span>
                              )}
                              <span className="kanban-card-assignee">
                                {audit.lead_name || audit.lead_email || "No Lead"}
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
