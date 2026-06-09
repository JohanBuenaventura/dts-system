// src/utils/exportUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// ─── EXPORT DOCUMENTS TO CSV ──────────────────────────────────────────────────
export const exportDocumentsCSV = (documents) => {
  const rows = documents.map(doc => ({
    'Tracking Code':     doc.tracking_code,
    'Title':             doc.title,
    'Type':              doc.type,
    'Status':            doc.status,
    'Current Location':  doc.current_location_dept,
    'Created By':        doc.created_by_name,
    'Created At':        new Date(doc.created_at).toLocaleString(),
    'Description':       doc.description || '',
  }));

  const csv  = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href     = url;
  link.download = `EDTS_Documents_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ─── EXPORT DOCUMENTS TO PDF ──────────────────────────────────────────────────
export const exportDocumentsPDF = (documents) => {
  const doc  = new jsPDF({ orientation: 'landscape' });
  const date = new Date().toLocaleString();

  // Header
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('EDTS — Document List Report', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${date}`, 14, 22);
  doc.text(`Total Records: ${documents.length}`, 14, 27);

  autoTable(doc, {
    startY: 32,
    head: [[
      'Tracking Code', 'Title', 'Type', 'Status',
      'Current Location', 'Created By', 'Created At',
    ]],
    body: documents.map(d => [
      d.tracking_code,
      d.title,
      d.type,
      d.status,
      d.current_location_dept,
      d.created_by_name,
      new Date(d.created_at).toLocaleDateString(),
    ]),
    styles: {
      fontSize:  8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor:  [30, 64, 175],
      textColor:  255,
      fontStyle: 'bold',
      fontSize:   8,
    },
    alternateRowStyles: {
      fillColor: [239, 246, 255],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 35 },
      5: { cellWidth: 30 },
      6: { cellWidth: 28 },
    },
  });

  doc.save(`EDTS_Documents_${new Date().toISOString().slice(0,10)}.pdf`);
};

// ─── EXPORT AUDIT TRAIL TO PDF ────────────────────────────────────────────────
export const exportAuditTrailPDF = (document, history) => {
  const doc  = new jsPDF();
  const date = new Date().toLocaleString();

  // Header
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('EDTS — Document Audit Trail', 14, 15);

  // Document Info Box
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`Tracking Code : ${document.tracking_code}`, 14, 28);
  doc.text(`Title         : ${document.title}`,         14, 35);
  doc.text(`Type          : ${document.type}`,          14, 42);
  doc.text(`Status        : ${document.status}`,        14, 49);
  doc.text(`Location      : ${document.current_location_dept}`, 14, 56);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Report Generated: ${date}`, 14, 63);

  // Audit Table
  autoTable(doc, {
    startY: 70,
    head: [['#', 'Action', 'From', 'To', 'Performed By', 'Timestamp']],
    body: history.map((log, i) => [
      i + 1,
      log.action_taken,
      log.from_department || '—',
      log.to_department   || '—',
      log.performed_by,
      new Date(log.timestamp).toLocaleString(),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [239, 246, 255],
    },
    columnStyles: {
      0: { cellWidth: 8  },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 35 },
      5: { cellWidth: 40 },
    },
  });

  doc.save(`EDTS_AuditTrail_${document.tracking_code}.pdf`);
};

// ─── EXPORT AUDIT TRAIL TO CSV ────────────────────────────────────────────────
export const exportAuditTrailCSV = (document, history) => {
  const rows = history.map((log, i) => ({
    '#':             i + 1,
    'Action':        log.action_taken,
    'From':          log.from_department || '',
    'To':            log.to_department   || '',
    'Performed By':  log.performed_by,
    'Role':          log.performer_role,
    'Department':    log.performer_department,
    'Timestamp':     new Date(log.timestamp).toLocaleString(),
  }));

  const csv  = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href     = url;
  link.download = `EDTS_AuditTrail_${document.tracking_code}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};