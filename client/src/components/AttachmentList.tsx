import { useState } from "react";
import api from "../api/client";
import AttachmentFormModal from "./AttachmentFormModal";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploader_name: string | null;
  uploader_email: string | null;
  created_at: string;
}

interface Props {
  actionId: string;
  attachments: Attachment[];
  onUpdate: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AttachmentList({
  actionId,
  attachments,
  onUpdate,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(attachmentId: string) {
    if (!confirm("Delete this attachment record?")) return;
    try {
      await api.delete(`/actions/${actionId}/attachments/${attachmentId}`);
      onUpdate();
    } catch {
      alert("Failed to delete attachment");
    }
  }

  return (
    <div className="attachment-list">
      <div className="attachment-list-header">
        <span className="attachment-list-title">
          Attachments ({attachments.length})
        </span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowAdd(true)}
        >
          + Add
        </button>
      </div>
      {attachments.length > 0 && (
        <ul className="attachment-items">
          {attachments.map((att) => (
            <li key={att.id} className="attachment-item">
              <div className="attachment-info">
                <span className="attachment-name">{att.file_name}</span>
                <span className="attachment-meta">
                  {att.file_type} &middot; {formatFileSize(att.file_size)}
                </span>
              </div>
              <button
                className="btn-icon btn-danger-icon"
                onClick={() => handleDelete(att.id)}
                title="Delete"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
      {showAdd && (
        <AttachmentFormModal
          actionId={actionId}
          onSave={() => {
            setShowAdd(false);
            onUpdate();
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
