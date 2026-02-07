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
