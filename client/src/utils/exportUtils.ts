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

// ─── Investigation PDF helpers ─────────────────────────────────────────────

function sectionHeading(doc: jsPDF, label: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(label, 14, y);
  doc.setTextColor(0, 0, 0);
  return y + 5;
}

function textBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontSize = 9
): number {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(text || "—", maxW);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize * 0.55) + 4;
}

// ─── Barrier Analysis PDF ──────────────────────────────────────────────────

export function exportBarrierAnalysisPDF(investigation: any, issue: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.width;
  const body = investigation.body || {};
  const barriers: any[] = body.barriers || [];

  let y = addBrandHeader(
    doc,
    "Root Cause Investigation — Barrier Analysis",
    null,
    investigation.title || "Barrier Analysis",
    investigation.status || "draft"
  );

  // Metadata table
  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Issue ID", issue.id ? issue.id.slice(0, 8) : "—"],
      ["Issue Title", issue.title || "—"],
      ["Priority", issue.priority || "—"],
      ["Stage", issue.stage_name || "—"],
      ["Investigation Date", new Date(investigation.created_at || Date.now()).toLocaleDateString()],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Incident description
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Incident Description", y);
  doc.setFillColor(248, 247, 255);
  const descLines = doc.splitTextToSize(body.incident_description || "—", w - 30);
  const descH = descLines.length * 5 + 8;
  doc.roundedRect(14, y, w - 28, descH, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(descLines, 18, y + 5);
  y += descH + 8;

  // Hazard / Target row
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Hazard & Target", y);
  autoTable(doc, {
    startY: y,
    head: [["Hazard", "Target / What Was Protected"]],
    body: [[body.hazard || "—", body.target || "—"]],
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: "auto" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Barriers table
  if (y > 200) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, `Barriers (${barriers.length})`, y);

  const STATUS_FILL: Record<string, [number, number, number]> = {
    effective: [209, 250, 229],
    failed: [254, 226, 226],
    absent: [243, 244, 246],
  };
  const STATUS_TEXT: Record<string, [number, number, number]> = {
    effective: [6, 95, 70],
    failed: [153, 27, 27],
    absent: [75, 85, 99],
  };

  autoTable(doc, {
    startY: y,
    head: [["Barrier Name", "Type", "Status", "Notes"]],
    body: barriers.map((b: any) => [
      b.name || "—",
      b.type ? b.type.charAt(0).toUpperCase() + b.type.slice(1) : "—",
      b.status || "—",
      b.notes || "—",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 } },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 2) {
        const status = (barriers[data.row.index]?.status || "").toLowerCase();
        const fill = STATUS_FILL[status];
        const text = STATUS_TEXT[status];
        if (fill) {
          doc.setFillColor(...fill);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
          doc.setTextColor(...text);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(
            (barriers[data.row.index]?.status || "").toUpperCase(),
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2 + 1,
            { align: "center" }
          );
          doc.setTextColor(0, 0, 0);
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Recommendations
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Recommendations", y);
  y = textBlock(doc, body.recommendations || "—", 14, y, w - 28);

  addPageNumbers(doc);
  doc.save(`investigation_barrier_${(investigation.id || "report").slice(0, 8)}.pdf`);
}

// ─── Five Why PDF ──────────────────────────────────────────────────────────

export function exportFiveWhyPDF(investigation: any, issue: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.width;
  const body = investigation.body || {};
  const whys: any[] = body.whys || [];

  let y = addBrandHeader(
    doc,
    "Root Cause Investigation — 5 Why Analysis",
    null,
    investigation.title || "5 Why Analysis",
    investigation.status || "draft"
  );

  // Metadata
  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Issue", issue.title || "—"],
      ["Priority", issue.priority || "—"],
      ["Date", new Date(investigation.created_at || Date.now()).toLocaleDateString()],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Problem statement box
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Problem Statement", y);
  doc.setFillColor(237, 233, 254);
  const psLines = doc.splitTextToSize(body.problem_statement || "—", w - 34);
  const psH = psLines.length * 5.5 + 10;
  doc.roundedRect(14, y, w - 28, psH, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(psLines, 18, y + 7);
  doc.setTextColor(0, 0, 0);
  y += psH + 10;

  // 5-Why chain table
  if (y > 200) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "5-Why Chain", y);
  autoTable(doc, {
    startY: y,
    head: [["#", "Why (Question)", "Answer / Because"]],
    body: whys.map((w: any, i: number) => [
      `Why ${i + 1}`,
      w.question || `Why did this happen?`,
      w.answer || "—",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 72 } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Root cause box
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Root Cause", y);
  doc.setFillColor(255, 237, 213);
  const rcLines = doc.splitTextToSize(body.root_cause || "—", w - 34);
  const rcH = rcLines.length * 5.5 + 10;
  doc.roundedRect(14, y, w - 28, rcH, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(154, 52, 18);
  doc.text(rcLines, 18, y + 7);
  doc.setTextColor(0, 0, 0);
  y += rcH + 10;

  // Corrective action
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Corrective Action", y);
  y = textBlock(doc, body.corrective_action || "—", 14, y, w - 28);

  addPageNumbers(doc);
  doc.save(`investigation_5why_${(investigation.id || "report").slice(0, 8)}.pdf`);
}

// ─── Fishbone PDF ──────────────────────────────────────────────────────────

export function exportFishbonePDF(investigation: any, issue: any) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.width;   // ~297mm
  const h = doc.internal.pageSize.height;  // ~210mm
  const body = investigation.body || {};
  const categories: any[] = body.categories || [];
  const problemStatement: string = body.problem_statement || "Effect";

  // Page 1: Fishbone diagram
  // ── Brand banner (slim) ──
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, w, 14, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ROOT CAUSE INVESTIGATION — FISHBONE (ISHIKAWA) DIAGRAM", 10, 9);
  doc.setFontSize(7);
  doc.text(investigation.title || "", w - 10, 9, { align: "right" });

  // ── Diagram area ──
  const diagTop = 20;
  const diagBottom = h - 18;
  const midY = (diagTop + diagBottom) / 2;

  // Spine
  const spineLeft = 30;
  const spineRight = w - 60;  // leave room for effect box
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(1.2);
  doc.line(spineLeft, midY, spineRight, midY);

  // Arrow head on spine
  doc.setFillColor(...BRAND_COLOR);
  doc.triangle(
    spineRight, midY,
    spineRight - 5, midY - 3,
    spineRight - 5, midY + 3,
    "F"
  );

  // Effect box
  const effBoxW = 52;
  const effBoxH = 22;
  const effBoxX = spineRight + 2;
  const effBoxY = midY - effBoxH / 2;
  doc.setFillColor(...BRAND_COLOR);
  doc.roundedRect(effBoxX, effBoxY, effBoxW, effBoxH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const effLines = doc.splitTextToSize(problemStatement, effBoxW - 6);
  const effLineH = 4.5;
  const effTextY = midY - (effLines.length * effLineH) / 2 + effLineH;
  doc.text(effLines, effBoxX + effBoxW / 2, effTextY, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Layout: 3 bones top, 3 bones bottom
  // Top categories (angling down toward spine): Machine, Method, Material
  // Bottom categories (angling up toward spine): Man, Measurement, Environment
  const topCats = categories.filter((c: any) =>
    ["Machine", "Method", "Material"].includes(c.name)
  );
  const bottomCats = categories.filter((c: any) =>
    ["Man", "Measurement", "Environment"].includes(c.name)
  );

  const boneCount = 3;
  const boneSpacing = (spineRight - spineLeft - 20) / boneCount;
  const boneAngleH = (midY - diagTop) * 0.75;  // how far from spine to bone tip

  function drawBone(
    cat: any,
    boneX: number,  // attachment point on spine
    isTop: boolean
  ) {
    const tipY = isTop ? midY - boneAngleH : midY + boneAngleH;
    const startX = boneX;
    const startY = midY;

    // Main bone line
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.8);
    doc.line(startX, startY, boneX - 8, tipY);

    // Category label
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLOR);
    const labelY = isTop ? tipY - 4 : tipY + 6;
    doc.text(cat.name || "", boneX - 8, labelY, { align: "center" });
    doc.setTextColor(0, 0, 0);

    // Cause ticks along the bone
    const causes: string[] = cat.causes || [];
    const maxCauses = Math.min(causes.length, 5);
    for (let ci = 0; ci < maxCauses; ci++) {
      const t = (ci + 1) / (maxCauses + 1);
      const cx = startX + (boneX - 8 - startX) * t;
      const cy = startY + (tipY - startY) * t;

      // Tick line (perpendicular-ish)
      const tickLen = 10;
      const perpSign = isTop ? -1 : 1;
      doc.setDrawColor(120, 120, 180);
      doc.setLineWidth(0.5);
      doc.line(cx, cy, cx - tickLen, cy + perpSign * 5);

      // Cause text
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const causeLines = doc.splitTextToSize(causes[ci] || "", 28);
      doc.text(causeLines, cx - tickLen - 1, cy + perpSign * 4.5, {
        align: "right",
      });
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
  }

  // Draw top bones
  topCats.forEach((cat: any, i: number) => {
    const boneX = spineLeft + 20 + boneSpacing * i + boneSpacing / 2;
    drawBone(cat, boneX, true);
  });

  // Draw bottom bones
  bottomCats.forEach((cat: any, i: number) => {
    const boneX = spineLeft + 20 + boneSpacing * i + boneSpacing / 2;
    drawBone(cat, boneX, false);
  });

  // Diagram caption
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(160, 160, 180);
  doc.text(`Issue: ${issue.title || ""}  |  Generated: ${new Date().toLocaleDateString()}`, 10, h - 6);
  doc.setTextColor(0, 0, 0);

  // Page 2: Summary table + root cause
  doc.addPage();
  // Portrait for summary
  let y = 20;

  // Summary heading
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text("Cause Summary by Category", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  const summaryRows: [string, string][] = [];
  for (const cat of categories) {
    const causes: string[] = cat.causes || [];
    if (causes.length === 0) {
      summaryRows.push([cat.name, "—"]);
    } else {
      causes.forEach((c, i) => {
        summaryRows.push([i === 0 ? cat.name : "", c]);
      });
    }
  }

  autoTable(doc, {
    startY: y,
    head: [["Category", "Causes"]],
    body: summaryRows,
    theme: "striped",
    headStyles: { fillColor: BRAND_COLOR },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Problem statement
  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Problem Statement", y);
  y = textBlock(doc, body.problem_statement || "—", 14, y, 180);

  // Root cause
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHeading(doc, "Root Cause", y);
  doc.setFillColor(255, 237, 213);
  const rcLines2 = doc.splitTextToSize(body.root_cause || "—", 176);
  const rcH2 = rcLines2.length * 5.5 + 10;
  doc.roundedRect(14, y, 180, rcH2, 3, 3, "F");
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(154, 52, 18);
  doc.text(rcLines2, 18, y + 7);
  doc.setTextColor(0, 0, 0);

  addPageNumbers(doc);
  doc.save(`investigation_fishbone_${(investigation.id || "report").slice(0, 8)}.pdf`);
}
