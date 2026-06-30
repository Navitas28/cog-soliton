/**
 * Revision History table — rendered on TOC page.
 */
import { jsPDF } from 'jspdf';
import { addText, MARGIN, CONTENT_W, MUTED, DARK } from './shared';

export function renderRevisionHistory(doc: jsPDF, y: number): number {
  addText(doc, 'Revision History', MARGIN, y, { size: 10, bold: true, color: DARK });
  y += 6;

  // Header
  doc.setFillColor(240, 242, 248);
  doc.rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F');
  const rx = [MARGIN + 2, MARGIN + 22, MARGIN + 65, MARGIN + 115, MARGIN + 150];
  const headers = ['Rev', 'Date', 'Description', 'Prepared by', 'Reviewed by'];
  for (let i = 0; i < headers.length; i++) {
    addText(doc, headers[i], rx[i], y, { size: 8, bold: true, color: MUTED });
  }
  y += 6;

  // Rev 0 row
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  addText(doc, '0', rx[0], y, { size: 8 });
  addText(doc, dateStr, rx[1], y, { size: 8 });
  addText(doc, 'Initial Submission', rx[2], y, { size: 8 });
  addText(doc, '\u2014', rx[3], y, { size: 8, color: MUTED });
  addText(doc, '\u2014', rx[4], y, { size: 8, color: MUTED });
  y += 8;

  return y;
}
