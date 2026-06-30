/**
 * Government header / title page — Indian DPR style.
 * Renders state government, implementing agency, mission, project title,
 * document reference, and signature blocks.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../../model/types';
import { addText, addDoubleBorder, PAGE_W, MARGIN, CONTENT_W, ACCENT, DARK, MUTED } from './shared';

export function renderGovHeaderPage(doc: jsPDF, model: NetworkModel): void {
  const meta = model.cityMetadata;

  // Use government-style defaults for custom networks
  const stateGov = meta?.stateGovernment ?? 'STATE GOVERNMENT';
  const agency = meta?.implementingAgency ?? 'State Implementing Agency';
  const municipal = meta?.municipalBody ?? 'Municipal Corporation';
  const mission = meta?.missionName ?? '';
  const refPrefix = meta?.dprRefPrefix ?? 'WSS';

  addDoubleBorder(doc);

  let y = 35;

  // State emblem placeholder (small circle)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.circle(PAGE_W / 2, y, 8);
  addText(doc, '\u2605', PAGE_W / 2, y + 2, { size: 12, color: [180, 180, 180], align: 'center' });
  y += 18;

  // State government name
  addText(doc, stateGov.toUpperCase(), PAGE_W / 2, y, {
    size: 16, bold: true, color: DARK, align: 'center', font: 'times',
  });
  y += 10;

  // Implementing agency
  addText(doc, agency, PAGE_W / 2, y, {
    size: 13, bold: true, color: [50, 50, 70], align: 'center', font: 'times',
  });
  y += 8;

  // Municipal body
  addText(doc, municipal, PAGE_W / 2, y, {
    size: 11, color: [80, 80, 100], align: 'center', font: 'times',
  });
  y += 12;

  // Horizontal rule
  doc.setDrawColor(100, 100, 120);
  doc.setLineWidth(0.8);
  doc.line(40, y, PAGE_W - 40, y);
  doc.setLineWidth(0.3);
  doc.line(40, y + 1.5, PAGE_W - 40, y + 1.5);
  y += 12;

  // Mission name
  if (mission) {
    addText(doc, mission.toUpperCase(), PAGE_W / 2, y, {
      size: 18, bold: true, color: ACCENT, align: 'center', font: 'times',
    });
    y += 8;
    addText(doc, 'Atal Mission for Rejuvenation and Urban Transformation', PAGE_W / 2, y, {
      size: 10, color: MUTED, align: 'center', font: 'times',
    });
    y += 14;
  }

  // "DETAILED PROJECT REPORT"
  doc.setFillColor(240, 242, 248);
  doc.roundedRect(30, y - 4, CONTENT_W + 2 * (MARGIN - 30), 16, 2, 2, 'F');
  addText(doc, 'DETAILED PROJECT REPORT', PAGE_W / 2, y + 8, {
    size: 18, bold: true, color: DARK, align: 'center', font: 'times',
  });
  y += 22;

  // "for"
  addText(doc, 'for', PAGE_W / 2, y, { size: 11, color: MUTED, align: 'center', font: 'times' });
  y += 10;

  // Project title
  addText(doc, model.title, PAGE_W / 2, y, {
    size: 14, bold: true, color: ACCENT, align: 'center', font: 'times',
  });
  y += 8;

  // Subtitle with city details
  if (meta) {
    addText(doc, `${meta.cityName} \u2014 ${meta.stateName}`, PAGE_W / 2, y, {
      size: 11, color: [80, 80, 100], align: 'center', font: 'times',
    });
  }
  y += 18;

  // Document reference
  const refNo = `DPR/AMRUT/${refPrefix}/2024/001`;
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(55, y - 4, 100, 12, 2, 2, 'F');
  addText(doc, `Document Ref: ${refNo}`, PAGE_W / 2, y + 3, {
    size: 9, color: MUTED, align: 'center',
  });
  y += 22;

  // ─── Signature blocks ───
  const sigY = 200;
  const sigW = 50;
  const sigGap = 8;
  const sigStartX = MARGIN + 5;
  const sigs = ['Prepared by', 'Reviewed by', 'Approved by'];

  for (let i = 0; i < 3; i++) {
    const sx = sigStartX + i * (sigW + sigGap);

    addText(doc, sigs[i], sx + sigW / 2, sigY, {
      size: 9, bold: true, color: [80, 80, 100], align: 'center',
    });

    // Signature line
    doc.setDrawColor(150, 150, 160);
    doc.setLineWidth(0.3);
    doc.line(sx + 2, sigY + 22, sx + sigW - 2, sigY + 22);

    addText(doc, '(Name)', sx + sigW / 2, sigY + 27, {
      size: 7, color: [160, 160, 160], align: 'center',
    });
    addText(doc, '(Designation)', sx + sigW / 2, sigY + 32, {
      size: 7, color: [160, 160, 160], align: 'center',
    });
    addText(doc, '(Date)', sx + sigW / 2, sigY + 37, {
      size: 7, color: [160, 160, 160], align: 'center',
    });
  }

  // Date
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  addText(doc, dateStr, PAGE_W / 2, 255, {
    size: 10, color: [100, 100, 120], align: 'center',
  });

  // Confidential notice
  addText(doc, 'CONFIDENTIAL \u2014 For Official Use Only', PAGE_W / 2, 268, {
    size: 8, bold: true, color: [160, 160, 160], align: 'center',
  });
}
