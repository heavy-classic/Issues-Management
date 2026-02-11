import { useState } from "react";
import api from "../api/client";
import AttachmentList from "./AttachmentList";

interface Action {
  id: string;
  issue_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  creator_name: string | null;
  creator_email: string | null;
  due_date: string | null;
  completed_at: string | null;
  attachment_count: number;
  created_at: string;
}

interface Attachment {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_extension: string;
  file_path: string;
  uploader_name: string | null;
  uploader_email: string | null;
  uploaded_at: string;
  download_count: number;
}

interface Props {
  action: Action;
  onEdit: (action: Action) => void;
  onDelete: (actionId: string) => void;
  onUpdate: () => void;
}

export default function ActionCard({
  action,
  onEdit,
  onDelete,
  onUpdate,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadedAttachments, setLoadedAttachments] = useState(false);

  const isOverdue =
    action.due_date &&
    action.status !== "completed" &&
    new Date(action.due_date) < new Date();

  async function toggleExpand() {
    if (!expanded && !loadedAttachments) {
      try {
        const res = await api.get(`/actions/${action.id}`);
        setAttachments(res.data.action.attachments || []);
        setLoadedAttachments(true);
      } catch {
        // ignore
      }
    }
    setExpanded(!expanded);
  }

  async function refreshAttachments() {
    try {
      const res = await api.get(`/actions/${action.id}`);
      setAttachments(res.data.action.attachments || []);
    } catch {
      // ignore
    }
    onUpdate();
  }

  return (
    <div className={`action-card ${isOverdue ? "action-overdue" : ""}`}>
      <div className="action-card-header">
        <h4 className="action-card-title" onClick={toggleExpand}>
          {action.title}
        </h4>
        <div className="action-card-actions">
          <button
            className="btn-icon"
            onClick={() => onEdit(action)}
            title="Edit"
          >
            &#9998;
          </button>
          <button
            className="btn-icon btn-danger-icon"
            onClick={() => onDelete(action.id)}
            title="Delete"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="action-card-badges">
        <span className={`badge badge-priority-${action.priority}`}>
          {action.priority}
        </span>
        <span className={`badge badge-action-${action.status}`}>
          {action.status}
        </span>
        {action.attachment_count > 0 && (
          <span className="badge badge-attachment">
            {action.attachment_count} file{action.attachment_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="action-card-meta">
        {action.assignee_name || action.assignee_email ? (
          <span>Assigned: {action.assignee_name || action.assignee_email}</span>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
        {action.due_date && (
          <span className={isOverdue ? "text-danger" : ""}>
            Due: {new Date(action.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {expanded && (
        <div className="action-card-expanded">
          {action.description && (
            <p className="action-card-desc">{action.description}</p>
          )}
          <AttachmentList
            parentId={action.id}
            parentType="action"
            attachments={attachments}
            onUpdate={refreshAttachments}
          />
        </div>
      )}
    </div>
  );
}
