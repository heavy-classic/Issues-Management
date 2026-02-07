import { useState } from "react";
import api from "../api/client";

interface Props {
  actionId: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function AttachmentFormModal({
  actionId,
  onSave,
  onCancel,
}: Props) {
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/actions/${actionId}/attachments`, {
        file_name: fileName,
        file_type: fileType,
        file_size: Number(fileSize),
      });
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add attachment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Add Attachment Metadata</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>File Name</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="report.pdf"
              required
            />
          </div>
          <div className="form-group">
            <label>File Type</label>
            <input
              type="text"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              placeholder="application/pdf"
              required
            />
          </div>
          <div className="form-group">
            <label>File Size (bytes)</label>
            <input
              type="number"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              placeholder="1024"
              min={0}
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
