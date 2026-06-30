/**
 * Abstract of Cost page — standard Indian DPR cost summary format.
 * Breaks down pipe cost into components + contingency + supervision + GST.
 */
import { jsPDF } from 'jspdf';
import {
  addText, addPageFooter, addSectionTitle,
  MARGIN, CONTENT_W, MUTED, ACCENT, DARK,
} from './shared';
import { formatLakhs } from '../reportHelpers';

export interface AbstractCostRow {
  sno: number;
  item: string;
  pctLabel: string;
  amount: number;
}

export interface AbstractCostResult {
  rows: AbstractCostRow[];
  subTotal: number;
  contingency: number;
  supervision: number;
  gst: number;
  grandTotal: number;
}

export function computeAbstractOfCost(pipeCostTotal: number): AbstractCostResult {
  const items: { item: string; pctLabel: string; pct: number }[] = [
    { item: 'Pipe Supply', pctLabel: '', pct: 1.0 },
    { item: 'Pipe Laying & Jointing', pctLabel: '60% of pipe supply', pct: 0.6 },
    { item: 'Excavation & Backfill', pctLabel: '40% of pipe supply', pct: 0.4 },
    { item: 'Valves & Specials', pctLabel: '5% of pipe supply', pct: 0.05 },
    { item: 'Civil Works', pctLabel: '10% of pipe supply', pct: 0.1 },
    { item: 'Mechanical Works', pctLabel: '8% of pipe supply', pct: 0.08 },
    { item: 'Electrical Works', pctLabel: '5% of pipe supply', pct: 0.05 },
  ];

  const rows: AbstractCostRow[] = items.map((it, i) => ({
    sno: i + 1,
    item: it.item,
    pctLabel: it.pctLabel,
    amount: pipeCostTotal * it.pct,
  }));

  const subTotal = rows.reduce((s, r) => s + r.amount, 0);
  const contingency = subTotal * 0.03;
  const supervision = subTotal * 0.05;
  const gst = (subTotal + contingency + supervision) * 0.18;
  const grandTotal = subTotal + contingency + supervision + gst;

  return { rows, subTotal, contingency, supervision, gst, grandTotal };
}

function formatCrores(n: number): string {
  return `\u20B9 ${(n / 10000000).toFixed(2)} Cr`;
}

export function renderAbstractOfCostPage(
  doc: jsPDF,
  pageNum: { n: number },
  pipeCostTotal: number,
  chapterNum: number,
): void {
  let y = MARGIN;

  y = addSectionTitle(doc, `${chapterNum}. Abstract of Cost`, y);

  addText(doc, 'As per State Schedule of Rates (SOR) 2024', MARGIN, y, { size: 9, color: MUTED });
  y += 10;

  const cost = computeAbstractOfCost(pipeCostTotal);

  // Table header
  doc.setFillColor(240, 242, 248);
  doc.rect(MARGIN, y - 4, CONTENT_W, 8, 'F');
  addText(doc, 'S.No', MARGIN + 2, y, { size: 8, bold: true, color: MUTED });
  addText(doc, 'Item of Work', MARGIN + 16, y, { size: 8, bold: true, color: MUTED });
  addText(doc, 'Basis', MARGIN + 90, y, { size: 8, bold: true, color: MUTED });
  addText(doc, 'Amount (Rs)', MARGIN + 135, y, { size: 8, bold: true, color: MUTED });
  y += 7;

  // Line items
  for (const row of cost.rows) {
    addText(doc, String(row.sno), MARGIN + 4, y, { size: 9 });
    addText(doc, row.item, MARGIN + 16, y, { size: 9 });
    addText(doc, row.pctLabel, MARGIN + 90, y, { size: 8, color: MUTED });
    addText(doc, formatLakhs(row.amount), MARGIN + 135, y, { size: 9 });
    y += 6;
  }

  // Sub-total line (double rule)
  y += 2;
  doc.setDrawColor(100, 100, 120);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y - 3, MARGIN + CONTENT_W, y - 3);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y - 1.5, MARGIN + CONTENT_W, y - 1.5);

  addText(doc, 'Sub-Total', MARGIN + 16, y + 2, { size: 10, bold: true, color: DARK });
  addText(doc, formatLakhs(cost.subTotal), MARGIN + 135, y + 2, { size: 10, bold: true });
  y += 10;

  // Additional charges
  const extras = [
    { sno: 8, item: 'Contingency', basis: '3% of sub-total', amount: cost.contingency },
    { sno: 9, item: 'Supervision Charges', basis: '5% of sub-total', amount: cost.supervision },
    { sno: 10, item: 'GST', basis: '18%', amount: cost.gst },
  ];

  for (const ex of extras) {
    addText(doc, String(ex.sno), MARGIN + 4, y, { size: 9 });
    addText(doc, ex.item, MARGIN + 16, y, { size: 9 });
    addText(doc, ex.basis, MARGIN + 90, y, { size: 8, color: MUTED });
    addText(doc, formatLakhs(ex.amount), MARGIN + 135, y, { size: 9 });
    y += 6;
  }

  // Grand total (bold double rule)
  y += 4;
  doc.setDrawColor(40, 40, 60);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y - 3, MARGIN + CONTENT_W, y - 3);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 1, MARGIN + CONTENT_W, y - 1);

  doc.setFillColor(240, 242, 248);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, 'F');
  addText(doc, 'GRAND TOTAL (ESTIMATED PROJECT COST)', MARGIN + 8, y + 8, {
    size: 11, bold: true, color: DARK,
  });
  addText(doc, formatCrores(cost.grandTotal), MARGIN + CONTENT_W - 8, y + 8, {
    size: 14, bold: true, color: ACCENT, align: 'right',
  });
  y += 20;

  // Also show in lakhs
  addText(doc, `(${formatLakhs(cost.grandTotal)})`, MARGIN + CONTENT_W - 8, y, {
    size: 9, color: MUTED, align: 'right',
  });
  y += 12;

  // Note
  addText(doc, 'Notes:', MARGIN, y, { size: 9, bold: true, color: DARK });
  y += 5;
  const notes = [
    'All rates are indicative and based on State Schedule of Rates (SOR) 2024.',
    'Actual costs may vary based on site conditions, tendering, and market rates.',
    'Laying costs include trenching, bedding, backfill, and surface restoration.',
    'GST rates are as applicable at the time of tendering.',
  ];
  for (const note of notes) {
    addText(doc, `\u2022  ${note}`, MARGIN + 2, y, { size: 8, color: [100, 100, 120] });
    y += 4.5;
  }

  addPageFooter(doc, pageNum.n);
}
