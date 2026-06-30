/**
 * Certification / Disclaimer page — last page of DPR.
 * Standard government DPR closure with certification text and signature blocks.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../../model/types';
import { addText, addPageFooter, PAGE_W, MARGIN, CONTENT_W, DARK, ACCENT } from './shared';

export function renderCertificationPage(
  doc: jsPDF,
  pageNum: { n: number },
  model: NetworkModel,
): void {
  let y = MARGIN + 5;

  // Title
  addText(doc, 'CERTIFICATE', PAGE_W / 2, y, {
    size: 18, bold: true, color: DARK, align: 'center', font: 'times',
  });
  y += 4;
  doc.setDrawColor(100, 100, 120);
  doc.setLineWidth(0.5);
  doc.line(70, y, PAGE_W - 70, y);
  y += 12;

  // Certification paragraphs
  const paras = [
    'This Detailed Project Report (DPR) has been prepared based on hydraulic modelling using the EPANET 2.2 simulation engine, compiled to WebAssembly and executed in the Soliton browser-based platform.',
    'All hydraulic computations have been performed using the Hazen-Williams head loss formula with design criteria as specified in CPHEEO Manual on Water Supply and Treatment (2024 Revision).',
    'The network topology, node elevations, and demand allocations are based on publicly available data sources including OpenStreetMap, SRTM 30m DEM (USGS), Census of India 2011, and AMRUT 2.0 DPR filings.',
    'Field verification, detailed topographic survey, and geotechnical investigation are required before implementation. The network model should be calibrated with field pressure measurements prior to finalization.',
    'All cost estimates are indicative and based on State Schedule of Rates (SOR) 2024. Actual costs may vary based on site conditions, tendering process, and prevailing market rates at the time of execution.',
  ];

  for (let i = 0; i < paras.length; i++) {
    addText(doc, `${i + 1}.`, MARGIN + 2, y, { size: 10, bold: true, color: ACCENT });

    // Word-wrap paragraph
    const words = paras[i].split(' ');
    let line = '';
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (test.length > 85) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      addText(doc, l, MARGIN + 12, y, { size: 9, color: [50, 50, 60] });
      y += 4.5;
    }
    y += 3;
  }

  y += 6;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  // 4 signature blocks in 2x2 grid
  const sigLabels = [
    ['Consulting Engineer', 'Executive Engineer'],
    ['Superintending Engineer', 'Chief Engineer'],
  ];

  const colW = (CONTENT_W - 20) / 2;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const sx = MARGIN + col * (colW + 20);
      const sy = y + row * 42;
      const label = sigLabels[row][col];

      // Signature line
      doc.setDrawColor(120, 120, 140);
      doc.setLineWidth(0.3);
      doc.line(sx, sy + 18, sx + colW - 5, sy + 18);

      addText(doc, '(Signature)', sx + (colW - 5) / 2, sy + 23, {
        size: 7, color: [170, 170, 180], align: 'center',
      });

      addText(doc, 'Name: ______________________', sx, sy + 28, {
        size: 8, color: [130, 130, 140],
      });

      addText(doc, label, sx, sy + 35, {
        size: 9, bold: true, color: DARK,
      });
    }
  }

  y += 90;

  // Date and place
  const meta = model.cityMetadata;
  const place = meta?.cityName ?? '___________';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  addText(doc, `Place: ${place}`, MARGIN, y, { size: 9, color: [80, 80, 100] });
  addText(doc, `Date: ${dateStr}`, MARGIN + CONTENT_W, y, {
    size: 9, color: [80, 80, 100], align: 'right',
  });

  addPageFooter(doc, pageNum.n);
}
