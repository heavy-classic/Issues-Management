import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import api from "../api/client";

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

interface Lesson {
  id: string;
  lesson_number: string;
  title: string;
  lesson_type: string;
  impact_level: string | null;
  current_stage_id: string;
  owner_name: string | null;
  owner_email: string | null;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Column {
  stage: Stage;
  lessons: Lesson[];
}

export default function LessonKanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await api.get(`/lessons/kanban?${params}`);
    setColumns(res.data.columns);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const srcStageId = result.source.droppableId;
    const dstStageId = result.destination.droppableId;
    if (srcStageId === dstStageId) return;

    const lessonId = result.draggableId;

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, lessons: [...col.lessons] }));
      const srcCol = next.find((c) => c.stage.id === srcStageId);
      const dstCol = next.find((c) => c.stage.id === dstStageId);
      if (!srcCol || !dstCol) return prev;
      const idx = srcCol.lessons.findIndex((l) => l.id === lessonId);
      if (idx < 0) return prev;
      const [lesson] = srcCol.lessons.splice(idx, 1);
      lesson.current_stage_id = dstStageId;
      dstCol.lessons.splice(result.destination!.index, 0, lesson);
      return next;
    });

    try {
      await api.post(`/lesson-workflow/lessons/${lessonId}/transition`, {
        target_stage_id: dstStageId,
      });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to transition lesson");
      fetchBoard();
    }
  }

  if (loading) return <div className="loading">Loading board...</div>;

  return (
    <div className="kanban-page">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search lessons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="kanban-search"
        />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => (
            <div key={column.stage.id} className="kanban-column">
              <div className="kanban-column-header" style={{ borderTopColor: column.stage.color }}>
                <span className="kanban-column-dot" style={{ backgroundColor: column.stage.color }} />
                <span className="kanban-column-title">{column.stage.name}</span>
                <span className="kanban-column-count">{column.lessons.length}</span>
              </div>
              <Droppable droppableId={column.stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                  >
                    {column.lessons.map((lesson, index) => (
                      <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card ${snapshot.isDragging ? "dragging" : ""}`}
                          >
                            <Link to={`/lessons/${lesson.id}`} className="kanban-card-title">
                              {lesson.lesson_number}: {lesson.title}
                            </Link>
                            <div className="kanban-card-meta">
                              <span className="badge" style={{ background: TYPE_COLORS[lesson.lesson_type] || "#9ca3af", color: "#fff", fontSize: "0.65rem" }}>
                                {lesson.lesson_type}
                              </span>
                              {lesson.impact_level && (
                                <span className="badge" style={{ background: IMPACT_COLORS[lesson.impact_level] || "#9ca3af", color: "#fff", fontSize: "0.65rem" }}>
                                  {lesson.impact_level}
                                </span>
                              )}
                              <span className="kanban-card-assignee">
                                {lesson.owner_name || lesson.owner_email || "No Owner"}
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
