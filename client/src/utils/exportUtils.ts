import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map((h) => `"${h}"`).join(","),
    ...data.map((row) =>
      headers
        .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  downloadBlob(blob, filename);
}

export function exportToExcel(
  data: Record<string, any>[],
  sheetName: string,
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

interface IssueExportData {
  issue: Record<string, any>;
  actions: Record<string, any>[];
  comments: Record<string, any>[];
  signatures: Record<string, any>[];
  stageAssignments: Record<string, any>[];
  auditEntries: Record<string, any>[];
}

export function exportIssuePDF(data: IssueExportData) {
  const doc = new jsPDF();
  const { issue, actions, comments, signatures, stageAssignments } = data;
  let y = 20;

  // Cover / Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Issue Report", 14, y);
  y += 12;

  doc.setFontSize(14);
  doc.text(issue.title, 14, y);
  y += 10;

  // Metadata
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const meta = [
    ["ID", issue.id],
    ["Status", issue.status],
    ["Priority", issue.priority],
    ["Stage", issue.stage_name || "N/A"],
    ["Reporter", issue.reporter_name || issue.reporter_email],
    ["Assignee", issue.assignee_name || issue.assignee_email || "Unassigned"],
    ["Created", new Date(issue.created_at).toLocaleString()],
    ["Updated", new Date(issue.updated_at).toLocaleString()],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: meta,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Description
  if (issue.description) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Description", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(issue.description, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 8;
  }

  // Workflow Stages
  if (stageAssignments.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Workflow Stages", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Stage", "Assignee", "Completed"]],
      body: stageAssignments.map((sa: any) => [
        sa.stage_name,
        sa.assignee_name || "Unassigned",
        sa.completed_at
          ? new Date(sa.completed_at).toLocaleString()
          : "Pending",
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Actions Table
  if (actions.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Actions (${actions.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Title", "Status", "Priority", "Assignee", "Due Date"]],
      body: actions.map((a: any) => [
        a.title,
        a.status,
        a.priority,
        a.assignee_name || "Unassigned",
        a.due_date
          ? new Date(a.due_date).toLocaleDateString()
          : "N/A",
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 55 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Signatures
  if (signatures.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Electronic Signatures", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Signer", "Meaning", "Timestamp", "Reason"]],
      body: signatures.map((s: any) => [
        s.signer_full_name,
        s.signature_meaning,
        new Date(s.signature_timestamp).toLocaleString(),
        s.signature_reason || "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Comments
  if (comments.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Comments (${comments.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Author", "Comment", "Date"]],
      body: comments.map((c: any) => [
        c.author_name || "Unknown",
        c.body.length > 100 ? c.body.substring(0, 100) + "..." : c.body,
        new Date(c.created_at).toLocaleString(),
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
      columnStyles: { 1: { cellWidth: 90 } },
    });
  }

  // Footer with generation date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`issue_${issue.id.slice(0, 8)}_report.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared PDF helpers ────────────────────────────────────────────────────

const BRAND_COLOR: [number, number, number] = [79, 70, 229]; // #4f46e5

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 180);
    const w = doc.internal.pageSize.width;
    const h = doc.internal.pageSize.height;
    doc.text(
      `Page ${i} of ${pageCount}`,
      w - 14,
      h - 8,
      { align: "right" }
    );
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      h - 8
    );
    doc.setTextColor(0, 0, 0);
  }
}

function addBrandHeader(
  doc: jsPDF,
  controlledLabel: string,
  recordNumber: string | null | undefined,
  title: string,
  status: string
): number {
  const w = doc.internal.pageSize.width;

  // Colored top banner
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, w, 22, "F");

  // CONTROLLED DOCUMENT label
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 200, 255);
  doc.text(controlledLabel.toUpperCase(), 14, 8);

  // Record number (right side of banner)
  if (recordNumber) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(recordNumber, w - 14, 8, { align: "right" });
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(title, w - 28);
  doc.text(titleLines, 14, 16);

  // Status chip (drawn below banner)
  const bannerHeight = 22 + (titleLines.length - 1) * 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.setFillColor(237, 233, 254);
  const chipW = doc.getTextWidth(status.toUpperCase()) + 10;
  doc.roundedRect(14, bannerHeight + 4, chipW, 8, 2, 2, "F");
  doc.text(status.toUpperCase(), 19, bannerHeight + 9.5);

  doc.setTextColor(0, 0, 0);
  return bannerHeight + 18;
}

// ─── Audit PDF ─────────────────────────────────────────────────────────────

interface AuditExportData {
  audit: {
    audit_number?: string;
    title: string;
    type_name?: string;
    status: string;
    risk_level?: string;
    lead_name?: string;
    scheduled_start?: string;
    objective?: string;
    scope?: string;
    methodology?: string;
    compliance_score?: number | string;
  };
  findings: Record<string, any>[];
  checklists: Record<string, any>[];
}

export function exportAuditPDF(data: AuditExportData) {
  const doc = new jsPDF();
  const { audit, findings, checklists } = data;

  let y = addBrandHeader(
    doc,
    "Controlled Document — Audit Report",
    audit.audit_number,
    audit.title,
    audit.status
  );

  // Metadata table
  const meta: [string, string][] = [
    ["Audit Number", audit.audit_number || "—"],
    ["Type", audit.type_name || "—"],
    ["Status", audit.status],
    ["Risk Level", audit.risk_level || "—"],
    ["Lead", audit.lead_name || "—"],
    ["Scheduled Start", audit.scheduled_start ? new Date(audit.scheduled_start).toLocaleDateString() : "—"],
    ["Compliance Score", audit.compliance_score != null ? String(audit.compliance_score) : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: meta,
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Objective / Scope / Methodology
  const textSections: Array<{ label: string; value: string | undefined }> = [
    { label: "Objective", value: audit.objective },
    { label: "Scope", value: audit.scope },
    { label: "Methodology", value: audit.methodology },
  ];
  for (const ts of textSections) {
    if (!ts.value) continue;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(ts.label, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(ts.value, 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 8;
  }

  // Findings
  if (findings.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Findings (${findings.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["#", "Title", "Severity", "Status"]],
      body: findings.map((f: any, i: number) => [
        i + 1,
        f.title || f.description || "—",
        f.severity || f.risk_level || "—",
        f.status || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      columnStyles: { 1: { cellWidth: 80 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Checklists
  if (checklists.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Checklists (${checklists.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Item", "Response", "Notes"]],
      body: checklists.map((c: any) => [
        c.item || c.question || c.title || "—",
        c.response || c.answer || "—",
        c.notes || c.comment || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 70 }, 2: { cellWidth: 60 } },
    });
  }

  addPageNumbers(doc);
  const num = audit.audit_number ? audit.audit_number.replace(/[^a-zA-Z0-9]/g, "_") : "audit";
  doc.save(`audit_${num}_report.pdf`);
}

// ─── Risk PDF ──────────────────────────────────────────────────────────────

interface RiskExportData {
  risk: {
    title: string;
    risk_number?: string;
    category_name?: string;
    status: string;
    inherent_level?: string;
    residual_level?: string;
    likelihood?: string | number;
    consequence?: string | number;
    description?: string;
    treatment_plan?: string;
  };
  mitigations: Record<string, any>[];
  linked_issues: Record<string, any>[];
}

export function exportRiskPDF(data: RiskExportData) {
  const doc = new jsPDF();
  const { risk, mitigations, linked_issues } = data;

  let y = addBrandHeader(
    doc,
    "Controlled Document — Risk Register",
    risk.risk_number,
    risk.title,
    risk.status
  );

  // Risk metadata
  const meta: [string, string][] = [
    ["Risk Number", risk.risk_number || "—"],
    ["Category", risk.category_name || "—"],
    ["Status", risk.status],
    ["Inherent Level", risk.inherent_level || "—"],
    ["Residual Level", risk.residual_level || "—"],
    ["Likelihood", risk.likelihood != null ? String(risk.likelihood) : "—"],
    ["Consequence", risk.consequence != null ? String(risk.consequence) : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: meta,
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Description / Treatment Plan
  for (const ts of [
    { label: "Description", value: risk.description },
    { label: "Treatment Plan", value: risk.treatment_plan },
  ]) {
    if (!ts.value) continue;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(ts.label, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(ts.value, 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 8;
  }

  // Mitigations
  if (mitigations.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Mitigations (${mitigations.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Description", "Owner", "Due Date", "Status"]],
      body: mitigations.map((m: any) => [
        m.description || m.title || "—",
        m.owner_name || m.owner || "—",
        m.due_date ? new Date(m.due_date).toLocaleDateString() : "—",
        m.status || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 80 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Linked Issues
  if (linked_issues.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Linked Issues (${linked_issues.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Title", "Status", "Priority"]],
      body: linked_issues.map((i: any) => [
        i.title || "—",
        i.status || "—",
        i.priority || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
  }

  addPageNumbers(doc);
  const num = risk.risk_number ? risk.risk_number.replace(/[^a-zA-Z0-9]/g, "_") : "risk";
  doc.save(`risk_${num}_report.pdf`);
}

// ─── Lesson Learned PDF ────────────────────────────────────────────────────

interface LessonExportData {
  lesson: {
    title: string;
    lesson_number?: string;
    category?: string;
    status: string;
    reporter_name?: string;
    department?: string;
    date_occurred?: string;
    description?: string;
    root_cause?: string;
    preventive_action?: string;
    corrective_action?: string;
    outcome?: string;
  };
  comments: Record<string, any>[];
}

export function exportLessonPDF(data: LessonExportData) {
  const doc = new jsPDF();
  const { lesson, comments } = data;

  let y = addBrandHeader(
    doc,
    "Controlled Document — Lessons Learned",
    lesson.lesson_number,
    lesson.title,
    lesson.status
  );

  // Metadata
  const meta: [string, string][] = [
    ["Lesson Number", lesson.lesson_number || "—"],
    ["Category", lesson.category || "—"],
    ["Status", lesson.status],
    ["Reporter", lesson.reporter_name || "—"],
    ["Department", lesson.department || "—"],
    ["Date Occurred", lesson.date_occurred ? new Date(lesson.date_occurred).toLocaleDateString() : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: meta,
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Narrative text sections
  const textSections = [
    { label: "Description", value: lesson.description },
    { label: "Root Cause", value: lesson.root_cause },
    { label: "Corrective Action", value: lesson.corrective_action },
    { label: "Preventive Action", value: lesson.preventive_action },
    { label: "Outcome", value: lesson.outcome },
  ];

  for (const ts of textSections) {
    if (!ts.value) continue;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(ts.label, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(ts.value, 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 8;
  }

  // Comments
  if (comments.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`Comments (${comments.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Author", "Comment", "Date"]],
      body: comments.map((c: any) => [
        c.author_name || c.user_name || "Unknown",
        (c.body || c.comment || "").length > 100
          ? (c.body || c.comment || "").substring(0, 100) + "…"
          : (c.body || c.comment || ""),
        new Date(c.created_at).toLocaleString(),
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      columnStyles: { 1: { cellWidth: 90 } },
    });
  }

  addPageNumbers(doc);
  const num = lesson.lesson_number ? lesson.lesson_number.replace(/[^a-zA-Z0-9]/g, "_") : "lesson";
  doc.save(`lesson_${num}_report.pdf`);
}

// ─── Procedure PDF ─────────────────────────────────────────────────────────

interface ProcedureStep {
  step_number?: number | string;
  title?: string;
  content?: string;
  description?: string;
  [key: string]: any;
}

interface ProcedureSection {
  section_number?: number | string;
  title?: string;
  content?: string;
  steps?: ProcedureStep[];
  [key: string]: any;
}

interface ProcedureExportData {
  procedure: {
    title: string;
    procedure_number?: string;
    status: string;
    revision?: string | number;
    owner_name?: string;
    department?: string;
    effective_date?: string;
    review_date?: string;
    purpose?: string;
    scope?: string;
    references?: string;
    definitions?: string;
    [key: string]: any;
  };
  sections: ProcedureSection[];
}

export function exportProcedurePDF(data: ProcedureExportData) {
  const doc = new jsPDF();
  const { procedure, sections } = data;
  const w = doc.internal.pageSize.width;

  let y = addBrandHeader(
    doc,
    "Controlled Document — Procedure",
    procedure.procedure_number,
    procedure.title,
    procedure.status
  );

  // Metadata block
  const meta: [string, string][] = [
    ["Procedure Number", procedure.procedure_number || "—"],
    ["Revision", procedure.revision != null ? String(procedure.revision) : "—"],
    ["Status", procedure.status],
    ["Owner", procedure.owner_name || "—"],
    ["Department", procedure.department || "—"],
    ["Effective Date", procedure.effective_date ? new Date(procedure.effective_date).toLocaleDateString() : "—"],
    ["Review Date", procedure.review_date ? new Date(procedure.review_date).toLocaleDateString() : "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: meta,
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
    tableWidth: "auto",
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // DOE-style numbered sections for standard header sections
  const standardSections: Array<{ num: string; label: string; value: string | undefined }> = [
    { num: "1.0", label: "PURPOSE", value: procedure.purpose },
    { num: "2.0", label: "SCOPE", value: procedure.scope },
    { num: "3.0", label: "REFERENCES", value: procedure.references },
    { num: "4.0", label: "DEFINITIONS", value: procedure.definitions },
  ];

  for (const ss of standardSections) {
    if (!ss.value) continue;
    if (y > 240) { doc.addPage(); y = 20; }

    // Section header bar
    doc.setFillColor(240, 238, 255);
    doc.rect(14, y - 4, w - 28, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLOR);
    doc.text(`${ss.num}  ${ss.label}`, 17, y + 2.5);
    doc.setTextColor(0, 0, 0);
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(ss.value, w - 28);
    doc.text(lines, 17, y);
    y += lines.length * 4.5 + 8;
  }

  // Dynamic procedure sections (5.0+)
  if (sections.length > 0) {
    const baseNum = 5;
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const sectionNum = `${baseNum + si}.0`;
      const sectionTitle = section.title || `Section ${si + 1}`;

      if (y > 220) { doc.addPage(); y = 20; }

      // Section header bar
      doc.setFillColor(240, 238, 255);
      doc.rect(14, y - 4, w - 28, 10, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_COLOR);
      doc.text(`${sectionNum}  ${sectionTitle.toUpperCase()}`, 17, y + 2.5);
      doc.setTextColor(0, 0, 0);
      y += 10;

      // Section-level content
      if (section.content) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(section.content, w - 32);
        doc.text(lines, 17, y);
        y += lines.length * 4.5 + 4;
      }

      // Steps
      const steps = section.steps || [];
      for (let stIdx = 0; stIdx < steps.length; stIdx++) {
        const step = steps[stIdx];
        const stepLabel = `[${stIdx + 1}]`;
        const stepText = step.content || step.description || step.title || "";
        const stepTitle = step.title && step.content ? step.title : null;

        if (y > 250) { doc.addPage(); y = 20; }

        // Step number badge
        doc.setFillColor(...BRAND_COLOR);
        doc.roundedRect(17, y - 3.5, 10, 7, 1.5, 1.5, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(stepLabel, 22, y + 0.5, { align: "center" });
        doc.setTextColor(0, 0, 0);

        // Step title (if separate from content)
        if (stepTitle) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(stepTitle, 31, y);
          y += 5;
          doc.setFont("helvetica", "normal");
        }

        // Step body text
        if (stepText) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const textLines = doc.splitTextToSize(stepText, w - 50);
          doc.text(textLines, 31, y);
          y += textLines.length * 4.5;
        } else if (!stepTitle) {
          y += 4;
        }

        y += 5;
      }

      y += 4;
    }
  }

  addPageNumbers(doc);
  const num = procedure.procedure_number
    ? procedure.procedure_number.replace(/[^a-zA-Z0-9]/g, "_")
    : "procedure";
  doc.save(`procedure_${num}.pdf`);
}
