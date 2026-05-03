import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
}

interface IssueFormProps {
  users: User[];
  onSubmit: (data: {
    title: string;
    description: string;
    priority: string;
    assignee_id: string | null;
    source: string | null;
    on_behalf_of_id: string | null;
    department: string | null;
    date_identified: string;
  }) => Promise<{ id: string } | void>;
  onCancel: () => void;
}

const SOURCES = [
  "Internal Audit",
  "External Audit",
  "Observation",
  "Inspection",
  "Self-Identified",
];

const DEPARTMENTS = [
  "Manufacturing Engineering",
  "Production / Operations",
  "Quality Assurance",
  "Maintenance & Reliability",
  "Supply Chain & Logistics",
  "Safety, Health & Environment",
  "Human Resources",
  "Finance & Accounting",
  "Information Technology",
  "Research & Development",
  "Facilities",
  "Sales & Customer Service",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function IssueForm({ users, onSubmit, onCancel }: IssueFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const rteRef = useRef<HTMLDivElement>(null);
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [source, setSource] = useState("");
  const [onBehalfOfId, setOnBehalfOfId] = useState("");
  const [department, setDepartment] = useState("");
  const [dateIdentified, setDateIdentified] = useState(todayISO());
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setPendingFiles((prev) => [...prev, ...accepted]);
  }, []);
  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 25 * 1024 * 1024,
    noClick: true,
  });

  // Default "on behalf of" to the logged-in user
  useEffect(() => {
    if (user && users.length > 0) {
      const me = users.find((u) => u.email === user.email);
      if (me) setOnBehalfOfId(me.id);
    }
  }, [user, users]);

  // Load instructions from settings
  useEffect(() => {
    api.get("/settings/issue_instructions")
      .then((res) => setInstructions(res.data.value))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await onSubmit({
        title,
        description: rteRef.current ? rteRef.current.innerHTML : "",
        priority,
        assignee_id: assigneeId || null,
        source: source || null,
        on_behalf_of_id: onBehalfOfId || null,
        department: department || null,
        date_identified: dateIdentified,
      });
      // Upload any queued attachments after the issue is created
      if (result?.id && pendingFiles.length > 0) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        await api.post(`/issues/${result.id}/attachments`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="issue-form">
      {/* Instructions banner */}
      {instructions && (
        <div className="if-instructions">
          <div className="if-inst-icon">ℹ</div>
          <div className="if-inst-body">
            {instructions.split("\n").map((line, i) =>
              line.trim() === "" ? (
                <div key={i} style={{ height: 6 }} />
              ) : (
                <p key={i} style={{ margin: 0, lineHeight: 1.6 }}>{line}</p>
              )
            )}
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {/* Row 1: Title */}
      <div className="form-group">
        <label>Title <span className="if-req">*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
          placeholder="Brief summary of the issue"
        />
      </div>

      {/* Row 2: Source + Date Identified */}
      <div className="form-row">
        <div className="form-group">
          <label>Source <span className="if-req">*</span></label>
          <select value={source} onChange={(e) => setSource(e.target.value)} required>
            <option value="">— Select source —</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date Identified</label>
          <input
            type="date"
            value={dateIdentified}
            onChange={(e) => setDateIdentified(e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: Department + Priority */}
      <div className="form-row">
        <div className="form-group">
          <label>Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">— Select department —</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Row 4: Submit on behalf of + Assignee */}
      <div className="form-row">
        <div className="form-group">
          <label>Submit on Behalf of</label>
          <select value={onBehalfOfId} onChange={(e) => setOnBehalfOfId(e.target.value)}>
            <option value="">— Select person —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.name || u.email}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Assignee</label>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.name || u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description — rich text */}
      <div className="form-group">
        <label>Description</label>
        <div className="rte">
          <div className="rte-toolbar">
            <button type="button" className="rte-btn" title="Bold" onMouseDown={(e) => { e.preventDefault(); document.execCommand("bold"); rteRef.current?.focus(); }}><b>B</b></button>
            <button type="button" className="rte-btn" title="Italic" onMouseDown={(e) => { e.preventDefault(); document.execCommand("italic"); rteRef.current?.focus(); }}><i>I</i></button>
            <button type="button" className="rte-btn" title="Underline" onMouseDown={(e) => { e.preventDefault(); document.execCommand("underline"); rteRef.current?.focus(); }}><u>U</u></button>
            <div className="rte-sep" />
            <button type="button" className="rte-btn" title="Bullet list" onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertUnorderedList"); rteRef.current?.focus(); }}>≡</button>
            <button type="button" className="rte-btn" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertOrderedList"); rteRef.current?.focus(); }}>①</button>
          </div>
          <div
            ref={rteRef}
            className="rte-content"
            contentEditable
            data-placeholder="Describe the issue in detail — what happened, where, when, and the impact…"
            suppressContentEditableWarning
          />
        </div>
      </div>

      {/* Attachments — queued before submission */}
      <div className="form-group">
        <label>Attachments</label>
        <div
          {...getRootProps()}
          className={`if-dropzone${isDragActive ? " if-dropzone-active" : ""}`}
        >
          <input {...getInputProps()} />
          <span className="if-drop-icon">📎</span>
          {isDragActive ? (
            <span>Drop files here…</span>
          ) : (
            <>
              <span>Drag files here or{" "}
                <button type="button" className="if-drop-browse" onClick={openFilePicker}>browse</button>
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>PDF, images, Office docs · max 25 MB each</span>
            </>
          )}
        </div>
        {pendingFiles.length > 0 && (
          <ul className="if-file-list">
            {pendingFiles.map((f, i) => (
              <li key={i} className="if-file-item">
                <span className="if-file-name">📄 {f.name}</span>
                <span className="if-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  className="if-file-remove"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Issue →"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
