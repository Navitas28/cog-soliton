/**
 * Source & Raw Water section — Phase B.
 * Renders source details and treatment process flow diagram.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../../model/types';
import {
  addText, addPageFooter, addSectionTitle,
  MARGIN, CONTENT_W, MUTED, ACCENT, DARK,
} from './shared';

export function renderSourceWaterPage(
  doc: jsPDF,
  pageNum: { n: number },
  model: NetworkModel,
  chapterNum: number,
): void {
  const meta = model.cityMetadata;
  if (!meta) return;

  let y = MARGIN;
  y = addSectionTitle(doc, `${chapterNum}. Source & Raw Water`, y);

  // Source details table
  addText(doc, 'Source Details', MARGIN, y, { size: 11, bold: true, color: DARK });
  y += 7;

  const details = [
    ['Water Source', meta.waterSource],
    ['Source Type', meta.sourceType.charAt(0).toUpperCase() + meta.sourceType.slice(1)],
    ['WTP Capacity', `${meta.wtpCapacityMLD} MLD`],
    ['Implementing Agency', meta.implementingAgency],
    ['City', `${meta.cityName}, ${meta.stateName}`],
    ['City Classification', meta.cityClass],
  ];

  for (const [label, value] of details) {
    doc.setFillColor(250, 250, 252);
    doc.rect(MARGIN, y - 3.5, CONTENT_W, 6, 'F');
    addText(doc, label, MARGIN + 4, y, { size: 9, color: MUTED });
    addText(doc, value, MARGIN + 65, y, { size: 9, bold: true });
    y += 6.5;
  }

  y += 10;

  // Treatment process flow
  addText(doc, 'Treatment Process Flow', MARGIN, y, { size: 11, bold: true, color: DARK });
  y += 10;

  const steps = [
    'Raw Water\nIntake',
    'Coagulation\n& Flocculation',
    'Sedimentation',
    'Rapid Sand\nFiltration',
    'Chlorination',
    'Clear Water\nSump',
  ];

  const boxW = 26;
  const boxH = 18;
  const gap = 3;
  const totalW = steps.length * boxW + (steps.length - 1) * gap;
  const startX = MARGIN + (CONTENT_W - totalW) / 2;

  for (let i = 0; i < steps.length; i++) {
    const bx = startX + i * (boxW + gap);

    // Box
    doc.setFillColor(240, 242, 248);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'FD');

    // Text (split by newline)
    const lines = steps[i].split('\n');
    const lineY = y + (boxH / 2) - ((lines.length - 1) * 3);
    for (let li = 0; li < lines.length; li++) {
      addText(doc, lines[li], bx + boxW / 2, lineY + li * 5, {
        size: 6, color: DARK, align: 'center',
      });
    }

    // Arrow to next
    if (i < steps.length - 1) {
      const ax = bx + boxW + 0.5;
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.5);
      doc.line(ax, y + boxH / 2, ax + gap - 1, y + boxH / 2);
      // Arrowhead
      doc.setFillColor(...ACCENT);
      doc.triangle(
        ax + gap - 1, y + boxH / 2 - 1.5,
        ax + gap - 1, y + boxH / 2 + 1.5,
        ax + gap + 0.5, y + boxH / 2,
        'F',
      );
    }
  }

  y += boxH + 12;

  // Distribution system note
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 3, 3, 'F');
  addText(doc, 'Distribution System', MARGIN + 6, y + 8, { size: 10, bold: true, color: DARK });
  addText(doc, '\u2022  Clear water from WTP is pumped to Overhead Tanks (OHTs) via transmission mains', MARGIN + 6, y + 15, {
    size: 8, color: [60, 60, 80],
  });
  addText(doc, '\u2022  Distribution network operates under gravity from OHTs to consumer endpoints', MARGIN + 6, y + 21, {
    size: 8, color: [60, 60, 80],
  });

  addPageFooter(doc, pageNum.n);
}
