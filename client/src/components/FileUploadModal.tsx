import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import api from "../api/client";

interface Props {
  parentId: string;
  parentType: "issue" | "action";
  onComplete: () => void;
  onCancel: () => void;
  initialFiles?: File[];
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
}

const MAX_SIZE = 25 * 1024 * 1024;

export default function FileUploadModal({
  parentId,
  parentType,
  onComplete,
  onCancel,
  initialFiles,
}: Props) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setFiles(
        initialFiles.map((f) => ({ file: f, progress: 0, status: "pending" }))
      );
    }
  }, [initialFiles]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const reasons = rejectedFiles.map((r: any) => {
          const errs = r.errors?.map((e: any) => e.message).join(", ");
          return `${r.file.name}: ${errs}`;
        });
        setError(reasons.join("; "));
      }
      const newFiles = acceptedFiles.map((f) => ({
        file: f,
        progress: 0,
        status: "pending" as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/bmp": [".bmp"],
      "image/svg+xml": [".svg"],
      "application/zip": [".zip"],
    },
    multiple: true,
    maxFiles: 20,
  });

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f.file));

    try {
      const url =
        parentType === "issue"
          ? `/issues/${parentId}/attachments`
          : `/actions/${parentId}/attachments`;

      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "uploading" as const }))
      );

      await api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const pct = Math.round((progressEvent.loaded * 100) / total);
          setFiles((prev) =>
            prev.map((f) => ({
              ...f,
              progress: pct,
              status: "uploading" as const,
            }))
          );
        },
      });

      setFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 100, status: "done" as const }))
      );
      setTimeout(() => onComplete(), 500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed");
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "error" as const }))
      );
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content modal-upload"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Upload Files</h3>
        {error && <p className="error">{error}</p>}

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <span className="dropzone-icon">{"\u{1F4CE}"}</span>
            {isDragActive ? (
              <p>Drop files here...</p>
            ) : (
              <p>Drag & drop files here, or click to browse</p>
            )}
            <span className="dropzone-hint">
              Max 25MB per file. PDF, DOC, XLS, PPT, TXT, CSV, images, ZIP.
            </span>
          </div>
        </div>

        {files.length > 0 && (
          <ul className="upload-file-list">
            {files.map((f, i) => (
              <li key={i} className="upload-file-item">
                <div className="upload-file-info">
                  <span className="upload-file-name">{f.file.name}</span>
                  <span className="upload-file-size">
                    {formatSize(f.file.size)}
                  </span>
                </div>
                {f.status === "uploading" && (
                  <div className="upload-progress-bar">
                    <div
                      className="upload-progress-fill"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === "done" && (
                  <span className="upload-status-done">{"\u2713"}</span>
                )}
                {f.status === "error" && (
                  <span className="upload-status-error">{"\u2717"}</span>
                )}
                {f.status === "pending" && (
                  <button
                    className="btn-icon"
                    onClick={() => removeFile(i)}
                    title="Remove"
                  >
                    {"\u00D7"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading
              ? "Uploading..."
              : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={uploading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
