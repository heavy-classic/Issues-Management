import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AuditExportData {
  audit: Record<string, any>;
  team: Record<string, any>[];
  instances: Record<string, any>[];
  findings: Record<string, any>[];
  meetings: Record<string, any>[];
}

export function exportAuditPDF(data: AuditExportData) {
  const doc = new jsPDF();
  const { audit, team, instances, findings, meetings } = data;
  const pageWidth = doc.internal.pageSize.width;
  let y = 20;

  // ── Cover / Title ──────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Audit Report", 14, y);
  y += 10;

  doc.setFontSize(16);
  doc.text(audit.title, 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`${audit.audit_number} | ${audit.type_name || ""}`, 14, y);
  doc.setTextColor(0);
  y += 12;

  // ── Audit Metadata ─────────────────────────────────
  const meta = [
    ["Status", audit.status?.replace(/_/g, " ") || ""],
    ["Risk Level", audit.risk_level || "N/A"],
    ["Lead Auditor", audit.lead_name || audit.lead_email || "Unassigned"],
    ["Department", audit.auditee_department || "N/A"],
    ["Location", audit.location || "N/A"],
    ["Scheduled Start", audit.scheduled_start ? new Date(audit.scheduled_start).toLocaleDateString() : "N/A"],
    ["Scheduled End", audit.scheduled_end ? new Date(audit.scheduled_end).toLocaleDateString() : "N/A"],
    ["Actual Start", audit.actual_start ? new Date(audit.actual_start).toLocaleDateString() : "N/A"],
    ["Actual End", audit.actual_end ? new Date(audit.actual_end).toLocaleDateString() : "N/A"],
    ["Compliance Score", audit.compliance_score != null ? `${audit.compliance_score}%` : "Not scored"],
    ["Overall Rating", audit.overall_rating || "Not rated"],
    ["Prepared By", audit.creator_name || audit.creator_email || ""],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: meta,
    theme: "grid",
    headStyles: { fillColor: [102, 126, 234] },
    margin: { left: 14, right: 14 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Executive Summary ──────────────────────────────
  if (audit.objective || audit.scope || audit.methodology) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 14, y);
    y += 8;

    const sections: [string, string][] = [];
    if (audit.objective) sections.push(["Objective", audit.objective]);
    if (audit.scope) sections.push(["Scope", audit.scope]);
    if (audit.methodology) sections.push(["Methodology", audit.methodology]);
    if (audit.criteria_standards) sections.push(["Standards", audit.criteria_standards]);

    for (const [label, text] of sections) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(label + ":", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(text, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 4;
    }
    y += 4;
  }

  // ── Team Members ───────────────────────────────────
  if (team.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Team Members (${team.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Name", "Email", "Role"]],
      body: team.map((m) => [
        m.user_name || "",
        m.user_email || "",
        m.role || "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Checklist Results ──────────────────────────────
  if (instances.length > 0) {
    for (const instance of instances) {
      if (y > 200) { doc.addPage(); y = 20; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Checklist: ${instance.checklist_name}`, 14, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Status: ${instance.status?.replace(/_/g, " ") || "N/A"}`, 14, y);
      y += 6;

      const groups = instance.groups || [];
      for (const group of groups) {
        if (y > 240) { doc.addPage(); y = 20; }

        const criteriaRows = (group.criteria || []).map((c: any) => [
          c.criterion_id_display || "",
          c.text?.length > 80 ? c.text.substring(0, 80) + "..." : c.text || "",
          c.response?.response_value || "—",
          c.response?.notes || "",
          c.risk_rating || "",
        ]);

        if (criteriaRows.length > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(group.name, 14, y);
          y += 2;

          autoTable(doc, {
            startY: y,
            head: [["ID", "Criterion", "Response", "Notes", "Risk"]],
            body: criteriaRows,
            theme: "striped",
            headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
            bodyStyles: { fontSize: 7 },
            margin: { left: 14, right: 14 },
            columnStyles: {
              0: { cellWidth: 18 },
              1: { cellWidth: 60 },
              2: { cellWidth: 30 },
              3: { cellWidth: 50 },
              4: { cellWidth: 16 },
            },
          });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }
      y += 4;
    }
  }

  // ── Findings ───────────────────────────────────────
  if (findings.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Findings (${findings.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Title", "Severity", "Priority", "Status", "Assignee", "Created"]],
      body: findings.map((f) => [
        f.title?.length > 50 ? f.title.substring(0, 50) + "..." : f.title || "",
        f.finding_severity || "N/A",
        f.priority || "",
        f.status?.replace(/_/g, " ") || "",
        f.assignee_name || "Unassigned",
        f.created_at ? new Date(f.created_at).toLocaleDateString() : "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 50 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Meetings ───────────────────────────────────────
  if (meetings.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Meetings (${meetings.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Type", "Title", "Date", "Notes"]],
      body: meetings.map((m) => [
        m.meeting_type || "",
        m.title || "",
        m.scheduled_date ? new Date(m.scheduled_date).toLocaleString() : "",
        m.notes?.length > 60 ? m.notes.substring(0, 60) + "..." : m.notes || "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer ─────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      audit.audit_number || "",
      pageWidth - 14,
      doc.internal.pageSize.height - 10,
      { align: "right" }
    );
    doc.setTextColor(0);
  }

  doc.save(`audit_${audit.audit_number || audit.id?.slice(0, 8)}_report.pdf`);
}
