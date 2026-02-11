import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import AuditFormModal from "../components/AuditFormModal";
import AuditPhaseProgress from "../components/AuditPhaseProgress";
import ChecklistInstanceCard from "../components/ChecklistInstanceCard";
import FindingsPanel from "../components/FindingsPanel";
import AuditTeamPanel from "../components/AuditTeamPanel";
import AuditMeetingsPanel from "../components/AuditMeetingsPanel";
import AttachmentList from "../components/AttachmentList";
import { exportAuditPDF } from "../utils/auditExportUtils";

interface AuditType { id: string; name: string; }
interface User { id: string; full_name: string | null; email: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: "#9ca3af", scheduled: "#3b82f6", planning: "#8b5cf6",
  in_progress: "#f59e0b", under_review: "#06b6d4", closed: "#10b981", cancelled: "#ef4444",
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);

  const fetchAudit = useCallback(async () => {
    const res = await api.get(`/audits/${id}`);
    setAudit(res.data.audit);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAudit();
    api.get("/audit-types?is_active=true").then((r) => setAuditTypes(r.data.auditTypes));
    api.get("/users").then((r) => setUsers(r.data.users));
    api.get("/checklists?status=active").then((r) => setChecklists(r.data.checklists));
  }, [fetchAudit]);

  async function handleUpdate(data: any) {
    await api.patch(`/audits/${id}`, data);
    setEditing(false);
    fetchAudit();
  }

  async function handleAdvancePhase() {
    if (!confirm("Advance to the next workflow phase?")) return;
    await api.post(`/audits/${id}/advance-phase`);
    fetchAudit();
  }

  async function handleDelete() {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    await api.delete(`/audits/${id}`);
    navigate("/audits");
  }

  async function handleStatusChange(status: string) {
    await api.patch(`/audits/${id}`, { status });
    fetchAudit();
  }

  async function handleExportPDF() {
    try {
      const res = await api.get(`/audit-exports/${id}`);
      exportAuditPDF(res.data);
    } catch {
      alert("Failed to generate PDF report");
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!audit) return <p>Audit not found.</p>;

  const phases = typeof audit.workflow_phases === "string"
    ? JSON.parse(audit.workflow_phases)
    : audit.workflow_phases || [];

  return (
    <div className="audit-detail">
      {/* Header */}
      <div className="audit-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <span className="text-muted">{audit.audit_number}</span>
            <span className="badge" style={{ background: audit.type_color, color: "#fff" }}>
              {audit.type_icon} {audit.type_name}
            </span>
            <span className="badge" style={{ background: STATUS_COLORS[audit.status], color: "#fff" }}>
              {audit.status.replace(/_/g, " ")}
            </span>
            {audit.risk_level && (
              <span className={`badge badge-priority-${audit.risk_level}`}>{audit.risk_level} risk</span>
            )}
          </div>
          <h1 style={{ margin: 0 }}>{audit.title}</h1>
          {audit.description && <p className="text-muted" style={{ marginTop: "0.5rem" }}>{audit.description}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          {audit.status !== "closed" && audit.status !== "cancelled" && (
            <>
              <button className="btn btn-primary" onClick={handleAdvancePhase}>Advance Phase</button>
              <select
                value={audit.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{ padding: "0.5rem" }}
              >
                {["draft", "scheduled", "planning", "in_progress", "under_review", "closed", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </>
          )}
          <button className="btn btn-secondary" style={{ color: "#ef4444" }} onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Phase Progress */}
      {phases.length > 0 && (
        <AuditPhaseProgress phases={phases} currentPhase={audit.current_phase} status={audit.status} />
      )}

      {/* Metadata Grid */}
      <div className="issue-meta-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="meta-item">
          <div className="meta-label">Lead Auditor</div>
          <div className="meta-value">{audit.lead_name || audit.lead_email || "Unassigned"}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Team Size</div>
          <div className="meta-value">{audit.team?.length || 0} members</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Department</div>
          <div className="meta-value">{audit.auditee_department || "—"}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Location</div>
          <div className="meta-value">{audit.location || "—"}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Scheduled</div>
          <div className="meta-value">
            {audit.scheduled_start ? new Date(audit.scheduled_start).toLocaleDateString() : "—"}
            {" — "}
            {audit.scheduled_end ? new Date(audit.scheduled_end).toLocaleDateString() : "—"}
          </div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Compliance Score</div>
          <div className="meta-value">{audit.compliance_score ? `${audit.compliance_score}%` : "Not scored"}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Overall Rating</div>
          <div className="meta-value">{audit.overall_rating || "Not rated"}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Findings</div>
          <div className="meta-value">{audit.findings?.length || 0}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Created By</div>
          <div className="meta-value">{audit.creator_name || audit.creator_email}</div>
        </div>
      </div>

      {/* Audit Plan */}
      {(audit.objective || audit.scope || audit.methodology) && (
        <div className="detail-section">
          <h3>Audit Plan</h3>
          {audit.objective && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Objective:</strong>
              <p style={{ margin: "0.25rem 0" }}>{audit.objective}</p>
            </div>
          )}
          {audit.scope && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Scope:</strong>
              <p style={{ margin: "0.25rem 0" }}>{audit.scope}</p>
            </div>
          )}
          {audit.methodology && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Methodology:</strong>
              <p style={{ margin: "0.25rem 0" }}>{audit.methodology}</p>
            </div>
          )}
          {audit.criteria_standards && (
            <div>
              <strong>Standards:</strong>
              <p style={{ margin: "0.25rem 0" }}>{audit.criteria_standards}</p>
            </div>
          )}
        </div>
      )}

      {/* Checklists */}
      <div className="detail-section">
        <div className="section-header-row">
          <h3>Checklists <span className="section-count-badge">{audit.instances?.length || 0}</span></h3>
          <AssignChecklistButton auditId={id!} checklists={checklists} users={users} onAssigned={fetchAudit} />
        </div>
        {audit.instances?.length > 0 ? (
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {audit.instances.map((inst: any) => (
              <ChecklistInstanceCard key={inst.id} instance={inst} onUpdate={fetchAudit} />
            ))}
          </div>
        ) : (
          <p className="text-muted">No checklists assigned.</p>
        )}
      </div>

      {/* Findings */}
      <FindingsPanel
        auditId={id!}
        findings={audit.findings || []}
        users={users}
        onUpdate={fetchAudit}
      />

      {/* Evidence / Attachments */}
      <div className="detail-section">
        <h3>Evidence</h3>
        <AttachmentList
          parentId={id!}
          parentType="audit"
          attachments={audit.attachments || []}
          onUpdate={fetchAudit}
        />
      </div>

      {/* Team */}
      <AuditTeamPanel
        auditId={id!}
        team={audit.team || []}
        users={users}
        onUpdate={fetchAudit}
      />

      {/* Meetings */}
      <AuditMeetingsPanel
        auditId={id!}
        meetings={audit.meetings || []}
        users={users}
        onUpdate={fetchAudit}
      />

      {editing && (
        <AuditFormModal
          auditTypes={auditTypes}
          users={users}
          initial={audit}
          onSubmit={handleUpdate}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function AssignChecklistButton({
  auditId, checklists, users, onAssigned,
}: {
  auditId: string; checklists: any[]; users: any[]; onAssigned: () => void;
}) {
  const [show, setShow] = useState(false);
  const [checklistId, setChecklistId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  async function handleAssign() {
    if (!checklistId) return;
    await api.post(`/audits/${auditId}/checklists`, {
      checklist_id: checklistId,
      assigned_to: assignedTo || null,
    });
    setShow(false);
    setChecklistId("");
    setAssignedTo("");
    onAssigned();
  }

  if (!show) return <button className="btn btn-secondary" onClick={() => setShow(true)}>+ Assign Checklist</button>;

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <select value={checklistId} onChange={(e) => setChecklistId(e.target.value)}>
        <option value="">Select checklist...</option>
        {checklists.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
        <option value="">Assign to...</option>
        {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
      </select>
      <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
      <button className="btn btn-secondary" onClick={() => setShow(false)}>Cancel</button>
    </div>
  );
}
