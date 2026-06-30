/**
 * Shared helpers and constants for DPR page rendering.
 * Extracted from reportGenerator.ts for reuse across page modules.
 */
import { jsPDF } from 'jspdf';

/* ─── Colors ─── */
export const DARK = [26, 26, 46] as [number, number, number];
export const ACCENT = [58, 95, 207] as [number, number, number];
export const PASS_GREEN = [39, 174, 96] as [number, number, number];
export const FAIL_RED = [231, 76, 60] as [number, number, number];
export const MUTED = [120, 120, 140] as [number, number, number];
export const TABLE_HEADER_BG = [240, 242, 248] as [number, number, number];
export const BORDER_COLOR = [60, 60, 60] as [number, number, number];

/* ─── Layout ─── */
export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 15;
export const CONTENT_W = PAGE_W - 2 * MARGIN;

/* ─── Text helper ─── */
export function addText(doc: jsPDF, text: string, x: number, y: number, opts?: {
  size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right';
  font?: string;
}) {
  doc.setFontSize(opts?.size || 10);
  doc.setFont(opts?.font || 'helvetica', opts?.bold ? 'bold' : 'normal');
  doc.setTextColor(...(opts?.color || [30, 30, 30]));
  doc.text(text, x, y, { align: opts?.align });
}

/* ─── Double-line page border ─── */
export function addDoubleBorder(doc: jsPDF) {
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, 194, 281);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, 190, 277);
}

/* ─── Page footer with border ─── */
export function addPageFooter(doc: jsPDF, pageNum: number) {
  const y = 282;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  addText(doc, 'SOLITON \u2014 Hydraulic Network Design Report', MARGIN, y + 4, { size: 7, color: [180, 180, 180] });
  addText(doc, `Page ${pageNum}`, PAGE_W - MARGIN, y + 4, { size: 7, color: [180, 180, 180], align: 'right' });
  addDoubleBorder(doc);
}

/* ─── Section title with accent bar ─── */
export function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, y - 1, 3, 7, 'F');
  addText(doc, title, MARGIN + 7, y + 4, { size: 14, bold: true, color: DARK });
  return y + 12;
}

/* ─── Table header row ─── */
export function tableHeader(doc: jsPDF, cols: { x: number; label: string }[], y: number): number {
  doc.setFillColor(...TABLE_HEADER_BG);
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  for (const c of cols) {
    addText(doc, c.label, c.x, y, { size: 8, bold: true, color: MUTED });
  }
  return y + 5;
}

/* ─── Page break check ─── */
export function checkPageBreak(doc: jsPDF, y: number, pageNum: { n: number }, needed = 15): number {
  if (y > 268 - needed) {
    addPageFooter(doc, pageNum.n);
    doc.addPage();
    pageNum.n++;
    return MARGIN + 5;
  }
  return y;
}
