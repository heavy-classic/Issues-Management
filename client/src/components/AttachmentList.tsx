import { useState } from "react";
import api from "../api/client";
import FileUploadModal from "./FileUploadModal";
import DocumentViewerModal from "./DocumentViewerModal";
import { downloadFile } from "../utils/downloadUtils";

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
  parentId: string;
  parentType: "issue" | "action";
  attachments: Attachment[];
  onUpdate: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType.includes("word") || mimeType.includes("document")) return "DOC";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLS";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "PPT";
  if (mimeType.startsWith("text/")) return "TXT";
  if (mimeType === "application/zip") return "ZIP";
  return "FILE";
}

function isPreviewable(att: Attachment): boolean {
  if (att.file_path.startsWith("legacy/")) return false;
  const m = att.mime_type;
  return (
    m === "application/pdf" ||
    m.startsWith("image/") ||
    m.startsWith("text/")
  );
}

export default function AttachmentList({
  parentId,
  parentType,
  attachments,
  onUpdate,
}: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(
    null
  );

  async function handleDelete(attachmentId: string) {
    if (!confirm("Delete this attachment?")) return;
    try {
      await api.delete(`/attachments/${attachmentId}`);
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
          onClick={() => setShowUpload(true)}
        >
          {"\u{1F4CE}"} Upload
        </button>
      </div>

      {attachments.length > 0 && (
        <ul className="attachment-items">
          {attachments.map((att) => (
            <li key={att.id} className="attachment-item">
              <div className="attachment-icon">
                <span
                  className={`file-type-badge file-type-${getFileIcon(att.mime_type).toLowerCase()}`}
                >
                  {getFileIcon(att.mime_type)}
                </span>
              </div>
              <div className="attachment-info">
                <span className="attachment-name" title={att.original_name}>
                  {att.original_name}
                </span>
                <span className="attachment-meta">
                  {formatFileSize(att.file_size)} &middot;{" "}
                  {att.uploader_name || att.uploader_email} &middot;{" "}
                  {new Date(att.uploaded_at).toLocaleDateString()}
                </span>
              </div>
              <div className="attachment-actions">
                {isPreviewable(att) && (
                  <button
                    className="btn-icon"
                    onClick={() => setViewingAttachment(att)}
                    title="View"
                  >
                    {"\u{1F441}"}
                  </button>
                )}
                {!att.file_path.startsWith("legacy/") && (
                  <button
                    className="btn-icon"
                    onClick={() => downloadFile(att.id, att.original_name)}
                    title="Download"
                  >
                    {"\u2B07"}
                  </button>
                )}
                <button
                  className="btn-icon btn-danger-icon"
                  onClick={() => handleDelete(att.id)}
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showUpload && (
        <FileUploadModal
          parentId={parentId}
          parentType={parentType}
          onComplete={() => {
            setShowUpload(false);
            onUpdate();
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {viewingAttachment && (
        <DocumentViewerModal
          attachment={viewingAttachment}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </div>
  );
}
