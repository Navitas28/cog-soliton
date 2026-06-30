/**
 * DPR (Detailed Project Report) PDF generator.
 * Produces a professional 12-15 page report suitable for municipal tender submissions.
 * Uses jsPDF for rendering and reportHelpers for data preparation.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../model/types';
import type { SteadyStateResult } from '../engine/engine';
import {
  computeComplianceSummary,
  computeNRW,
  buildPipeSchedule,
  buildNodeResultsTable,
  formatLakhs,
} from './reportHelpers';

interface ReportData {
  model: NetworkModel;
  results: SteadyStateResult;
  mapImageDataUrl?: string;
}

/* ─── Colors ─── */
const DARK = [26, 26, 46] as [number, number, number];
const ACCENT = [58, 95, 207] as [number, number, number];
const PASS_GREEN = [39, 174, 96] as [number, number, number];
const FAIL_RED = [231, 76, 60] as [number, number, number];
const MUTED = [120, 120, 140] as [number, number, number];
const TABLE_HEADER_BG = [240, 242, 248] as [number, number, number];

/* ─── Shared helpers ─── */
const PAGE_W = 210;
const MARGIN = 15;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function addText(doc: jsPDF, text: string, x: number, y: number, opts?: {
  size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right';
}) {
  doc.setFontSize(opts?.size || 10);
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
  doc.setTextColor(...(opts?.color || [30, 30, 30]));
  doc.text(text, x, y, { align: opts?.align });
}

function addPageFooter(doc: jsPDF, pageNum: number) {
  const y = 285;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  addText(doc, 'SOLITON — Hydraulic Network Design Report', MARGIN, y + 4, { size: 7, color: [180, 180, 180] });
  addText(doc, `Page ${pageNum}`, PAGE_W - MARGIN, y + 4, { size: 7, color: [180, 180, 180], align: 'right' });
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, y - 1, 3, 7, 'F');
  addText(doc, title, MARGIN + 7, y + 4, { size: 14, bold: true, color: DARK });
  return y + 12;
}

function tableHeader(doc: jsPDF, cols: { x: number; label: string }[], y: number): number {
  doc.setFillColor(...TABLE_HEADER_BG);
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  for (const c of cols) {
    addText(doc, c.label, c.x, y, { size: 8, bold: true, color: MUTED });
  }
  return y + 5;
}

function checkPageBreak(doc: jsPDF, y: number, pageNum: { n: number }, needed = 15): number {
  if (y > 270 - needed) {
    addPageFooter(doc, pageNum.n);
    doc.addPage();
    pageNum.n++;
    return MARGIN + 5;
  }
  return y;
}

/* ─── Main Generator ─── */

export function generateReport(data: ReportData): void {
  const { model, results, mapImageDataUrl } = data;
  const dc = model.designCriteria;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageNum = { n: 1 };

  const compliance = computeComplianceSummary(model, results, dc.residualPressureFloor, dc.velocityMin, dc.velocityMax);
  const nrw = computeNRW(
    model.reservoirs.map(r => r.id),
    model.junctions.map(j => j.id),
    results,
  );
  const pipeSchedule = buildPipeSchedule(model, results);
  const nodeTable = buildNodeResultsTable(model, results, dc.residualPressureFloor);
  const totalCost = pipeSchedule.reduce((s, p) => s + p.cost, 0);
  const totalLength = pipeSchedule.reduce((s, p) => s + p.length, 0);

  // ═══════════════════════════════════════════
  // PAGE 1: COVER
  // ═══════════════════════════════════════════
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 297, 'F');

  // Accent strip
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  addText(doc, 'DETAILED PROJECT REPORT', PAGE_W / 2, 60, { size: 12, color: MUTED, align: 'center' });

  addText(doc, 'SOLITON', PAGE_W / 2, 80, { size: 36, bold: true, color: [255, 255, 255], align: 'center' });
  addText(doc, 'Hydraulic Network Design & Analysis', PAGE_W / 2, 92, { size: 14, color: [138, 138, 158], align: 'center' });

  // Project title box
  doc.setFillColor(40, 45, 70);
  doc.roundedRect(30, 110, 150, 30, 4, 4, 'F');
  addText(doc, model.title, PAGE_W / 2, 128, { size: 20, bold: true, color: ACCENT, align: 'center' });

  // Key metrics on cover
  const metricsY = 160;
  const metricBoxW = 40;
  const metrics = [
    { label: 'Junctions', value: String(model.junctions.length) },
    { label: 'Pipes', value: String(model.pipes.length) },
    { label: 'Reservoirs', value: String(model.reservoirs.length) },
    { label: 'Tanks', value: String(model.tanks.length) },
  ];

  metrics.forEach((m, i) => {
    const mx = 25 + i * (metricBoxW + 6);
    doc.setFillColor(40, 45, 70);
    doc.roundedRect(mx, metricsY, metricBoxW, 22, 3, 3, 'F');
    addText(doc, m.value, mx + metricBoxW / 2, metricsY + 10, { size: 16, bold: true, color: [255, 255, 255], align: 'center' });
    addText(doc, m.label, mx + metricBoxW / 2, metricsY + 17, { size: 8, color: MUTED, align: 'center' });
  });

  // Design basis
  addText(doc, `Design Basis: CPHEEO 2024 | ${dc.lpcd} lpcd | ${dc.residualPressureFloor}m pressure floor`, PAGE_W / 2, 200, { size: 10, color: MUTED, align: 'center' });
  addText(doc, `Hazen-Williams | ${dc.velocityMin}–${dc.velocityMax} m/s velocity band | NRW target <${(dc.nrwTarget * 100).toFixed(0)}%`, PAGE_W / 2, 208, { size: 9, color: [100, 100, 120], align: 'center' });

  // Date + tool
  addText(doc, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), PAGE_W / 2, 240, { size: 10, color: [100, 100, 120], align: 'center' });

  // Footer bar
  doc.setFillColor(40, 45, 70);
  doc.rect(0, 275, PAGE_W, 22, 'F');
  addText(doc, 'EPANET 2.2 (WebAssembly) | Browser-based Hydraulic Analysis | No Server Required', PAGE_W / 2, 285, { size: 8, color: [100, 100, 120], align: 'center' });

  // ═══════════════════════════════════════════
  // PAGE 2: TABLE OF CONTENTS
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  let y = MARGIN;

  y = addSectionTitle(doc, 'Table of Contents', y);
  y += 4;

  const tocItems = [
    { num: '1', title: 'Executive Summary', page: '3' },
    { num: '2', title: 'Network Map', page: '4' },
    { num: '3', title: 'Pressure Compliance', page: '5' },
    { num: '4', title: 'Velocity Analysis', page: '6' },
    { num: '5', title: 'Water Balance & NRW', page: '7' },
    { num: '6', title: 'Node Results Schedule', page: '8' },
    { num: '7', title: 'Pipe Schedule', page: '9' },
    { num: '8', title: 'Cost Summary', page: '10' },
    { num: '9', title: 'Design Criteria (CPHEEO)', page: '11' },
    { num: '10', title: 'Deficient Zones', page: '12' },
  ];

  for (const item of tocItems) {
    addText(doc, `${item.num}.`, MARGIN + 4, y, { size: 11, color: ACCENT });
    addText(doc, item.title, MARGIN + 16, y, { size: 11 });
    // Dotted line
    const textEnd = MARGIN + 16 + doc.getTextWidth(item.title) + 2;
    for (let dx = textEnd; dx < PAGE_W - MARGIN - 15; dx += 2) {
      doc.circle(dx, y - 0.5, 0.3, 'F');
    }
    addText(doc, item.page, PAGE_W - MARGIN, y, { size: 11, color: MUTED, align: 'right' });
    y += 8;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 3: EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '1. Executive Summary', y);

  // Summary cards
  const cardW = (CONTENT_W - 8) / 3;
  const cards = [
    {
      label: 'Pressure Compliance',
      value: `${compliance.pressurePct.toFixed(1)}%`,
      sub: `${compliance.pressurePassing}/${compliance.pressureTotal} pass`,
      color: compliance.pressurePct >= 90 ? PASS_GREEN : FAIL_RED,
    },
    {
      label: 'Velocity In Band',
      value: `${compliance.velocityPassing}/${compliance.velocityTotal}`,
      sub: `${(compliance.velocityTotal > 0 ? compliance.velocityPassing / compliance.velocityTotal * 100 : 0).toFixed(0)}% in range`,
      color: ACCENT,
    },
    {
      label: 'NRW Estimate',
      value: `${nrw.nrwPct.toFixed(1)}%`,
      sub: `${nrw.nrwLps.toFixed(2)} LPS loss`,
      color: nrw.nrwPct <= dc.nrwTarget * 100 ? PASS_GREEN : FAIL_RED,
    },
  ];

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + 4);
    doc.setFillColor(247, 248, 252);
    doc.roundedRect(cx, y, cardW, 28, 3, 3, 'F');
    doc.setFillColor(...card.color);
    doc.rect(cx, y, cardW, 3, 'F');
    addText(doc, card.value, cx + cardW / 2, y + 14, { size: 18, bold: true, color: card.color, align: 'center' });
    addText(doc, card.label, cx + cardW / 2, y + 21, { size: 8, color: MUTED, align: 'center' });
    addText(doc, card.sub, cx + cardW / 2, y + 26, { size: 7, color: [160, 160, 160], align: 'center' });
  });

  y += 36;

  // Network overview
  addText(doc, 'Network Overview', MARGIN, y, { size: 12, bold: true });
  y += 7;

  const overviewData = [
    ['Project Title', model.title],
    ['Total Junctions', String(model.junctions.length)],
    ['Total Pipes', String(model.pipes.length)],
    ['Reservoirs / Tanks', `${model.reservoirs.length} / ${model.tanks.length}`],
    ['Pumps / Valves', `${model.pumps.length} / ${model.valves.length}`],
    ['Total Pipe Length', `${(totalLength / 1000).toFixed(2)} km`],
    ['Estimated Pipe Cost', formatLakhs(totalCost)],
    ['Total System Input', `${nrw.totalInput.toFixed(2)} LPS (${(nrw.totalInput * 86.4).toFixed(0)} m³/day)`],
    ['Total System Demand', `${nrw.totalDemand.toFixed(2)} LPS`],
    ['Simulation Mode', model.options.duration > 0 ? `EPS (${model.options.duration}hr)` : 'Steady State'],
    ['Design Period', `${dc.designPeriodYears} years`],
  ];

  for (const [label, value] of overviewData) {
    addText(doc, label, MARGIN + 2, y, { size: 9, color: MUTED });
    addText(doc, value, MARGIN + 70, y, { size: 9, bold: true });
    y += 5.5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 4: NETWORK MAP
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '2. Network Map', y);

  if (mapImageDataUrl) {
    try {
      const imgW = CONTENT_W;
      const imgH = imgW * 0.65;
      doc.addImage(mapImageDataUrl, 'PNG', MARGIN, y, imgW, imgH);
      y += imgH + 6;
      addText(doc, 'Figure 1: Network layout with hydraulic results overlay', PAGE_W / 2, y, { size: 8, color: MUTED, align: 'center' });
    } catch {
      addText(doc, '(Map screenshot not available — canvas may be tainted by cross-origin tiles)', MARGIN, y + 30, { size: 10, color: MUTED });
    }
  } else {
    doc.setFillColor(247, 248, 252);
    doc.roundedRect(MARGIN, y, CONTENT_W, 100, 4, 4, 'F');
    addText(doc, 'Network Map', PAGE_W / 2, y + 45, { size: 14, color: [200, 200, 210], align: 'center' });
    addText(doc, '(Map screenshot not available)', PAGE_W / 2, y + 55, { size: 10, color: MUTED, align: 'center' });
  }

  // Legend
  y += 10;
  const legendY = 200;
  addText(doc, 'Legend', MARGIN, legendY, { size: 10, bold: true });
  const legendItems = [
    { color: [0, 128, 255] as [number, number, number], label: 'Reservoir (WTP)' },
    { color: [128, 0, 255] as [number, number, number], label: 'Overhead Tank (OHT)' },
    { color: PASS_GREEN, label: `Junction — Pressure >= ${dc.residualPressureFloor}m (PASS)` },
    { color: FAIL_RED, label: `Junction — Pressure < ${dc.residualPressureFloor}m (FAIL)` },
  ];
  let ly = legendY + 6;
  for (const item of legendItems) {
    doc.setFillColor(...item.color);
    doc.circle(MARGIN + 4, ly - 1, 2.5, 'F');
    addText(doc, item.label, MARGIN + 10, ly, { size: 8, color: [80, 80, 80] });
    ly += 5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 5: PRESSURE COMPLIANCE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '3. Pressure Compliance', y);

  // Headline
  const pColor = compliance.pressurePct >= 90 ? PASS_GREEN : FAIL_RED;
  addText(doc, `${compliance.pressurePct.toFixed(1)}% of junctions meet the ${dc.residualPressureFloor}m pressure floor`, MARGIN, y, { size: 12, bold: true, color: pColor });
  y += 8;
  addText(doc, `${compliance.pressurePassing} PASS | ${compliance.pressureTotal - compliance.pressurePassing} FAIL out of ${compliance.pressureTotal} junctions`, MARGIN, y, { size: 10, color: MUTED });
  y += 10;

  // Pressure distribution table (all junctions sorted)
  const sortedNodes = [...nodeTable].sort((a, b) => a.pressure - b.pressure);
  const pCols = [
    { x: MARGIN, label: 'Node' },
    { x: MARGIN + 25, label: 'Elevation (m)' },
    { x: MARGIN + 55, label: 'Pressure (m)' },
    { x: MARGIN + 85, label: 'Head (m)' },
    { x: MARGIN + 110, label: 'Demand (LPS)' },
    { x: MARGIN + 140, label: 'Status' },
  ];
  y = tableHeader(doc, pCols, y);

  for (const row of sortedNodes) {
    y = checkPageBreak(doc, y, pageNum);
    addText(doc, row.id, pCols[0].x, y, { size: 8 });
    addText(doc, row.elevation.toFixed(1), pCols[1].x, y, { size: 8 });
    addText(doc, row.pressure.toFixed(2), pCols[2].x, y, { size: 8, color: row.passes ? [30, 30, 30] : FAIL_RED });
    addText(doc, row.head.toFixed(2), pCols[3].x, y, { size: 8 });
    addText(doc, row.demand.toFixed(4), pCols[4].x, y, { size: 8 });
    addText(doc, row.passes ? 'PASS' : 'FAIL', pCols[5].x, y, { size: 8, bold: true, color: row.passes ? PASS_GREEN : FAIL_RED });
    y += 4.5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 6: VELOCITY ANALYSIS
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '4. Velocity Analysis', y);

  addText(doc, `${compliance.velocityPassing}/${compliance.velocityTotal} pipes within permissible velocity band (${dc.velocityMin}–${dc.velocityMax} m/s)`, MARGIN, y, { size: 11, bold: true });
  y += 6;
  addText(doc, `Economic velocity band: ${dc.velocityEconomicMin}–${dc.velocityEconomicMax} m/s`, MARGIN, y, { size: 9, color: MUTED });
  y += 10;

  // Velocity table
  const vCols = [
    { x: MARGIN, label: 'Pipe' },
    { x: MARGIN + 20, label: 'Dia (mm)' },
    { x: MARGIN + 42, label: 'Length (m)' },
    { x: MARGIN + 65, label: 'Flow (LPS)' },
    { x: MARGIN + 90, label: 'Velocity (m/s)' },
    { x: MARGIN + 120, label: 'Headloss' },
    { x: MARGIN + 145, label: 'Status' },
  ];
  y = tableHeader(doc, vCols, y);

  const sortedPipes = [...pipeSchedule].sort((a, b) => b.velocity - a.velocity);
  for (const row of sortedPipes) {
    y = checkPageBreak(doc, y, pageNum);
    const inPerm = row.velocity >= dc.velocityMin && row.velocity <= dc.velocityMax;
    const inEcon = row.velocity >= dc.velocityEconomicMin && row.velocity <= dc.velocityEconomicMax;
    const status = inEcon ? 'OPTIMAL' : inPerm ? 'OK' : 'FAIL';
    const sColor = inEcon ? PASS_GREEN : inPerm ? ACCENT : FAIL_RED;

    addText(doc, row.id, vCols[0].x, y, { size: 8 });
    addText(doc, String(row.diameter), vCols[1].x, y, { size: 8 });
    addText(doc, row.length.toFixed(0), vCols[2].x, y, { size: 8 });
    addText(doc, row.flow.toFixed(2), vCols[3].x, y, { size: 8 });
    addText(doc, row.velocity.toFixed(3), vCols[4].x, y, { size: 8 });
    addText(doc, row.headloss.toFixed(4), vCols[5].x, y, { size: 8 });
    addText(doc, status, vCols[6].x, y, { size: 8, bold: true, color: sColor });
    y += 4.5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 7: WATER BALANCE & NRW
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '5. Water Balance & NRW', y);

  // Water balance box
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 55, 4, 4, 'F');

  const wbY = y + 8;
  addText(doc, 'System Input (from sources)', MARGIN + 8, wbY, { size: 10, color: MUTED });
  addText(doc, `${nrw.totalInput.toFixed(2)} LPS`, MARGIN + CONTENT_W - 10, wbY, { size: 12, bold: true, align: 'right' });

  addText(doc, 'System Demand (at junctions)', MARGIN + 8, wbY + 10, { size: 10, color: MUTED });
  addText(doc, `${nrw.totalDemand.toFixed(2)} LPS`, MARGIN + CONTENT_W - 10, wbY + 10, { size: 12, bold: true, align: 'right' });

  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN + 8, wbY + 16, MARGIN + CONTENT_W - 8, wbY + 16);

  addText(doc, 'Non-Revenue Water (NRW)', MARGIN + 8, wbY + 24, { size: 10, bold: true });
  const nrwColor = nrw.nrwPct <= dc.nrwTarget * 100 ? PASS_GREEN : FAIL_RED;
  addText(doc, `${nrw.nrwLps.toFixed(2)} LPS (${nrw.nrwPct.toFixed(1)}%)`, MARGIN + CONTENT_W - 10, wbY + 24, { size: 12, bold: true, color: nrwColor, align: 'right' });

  addText(doc, `AMRUT 2.0 Target: <${(dc.nrwTarget * 100).toFixed(0)}%`, MARGIN + 8, wbY + 34, { size: 9, color: MUTED });
  addText(doc, nrw.nrwPct <= dc.nrwTarget * 100 ? 'MEETS TARGET' : 'EXCEEDS TARGET', MARGIN + CONTENT_W - 10, wbY + 34, { size: 9, bold: true, color: nrwColor, align: 'right' });

  y += 65;

  // Daily volumes
  addText(doc, 'Daily Volumes', MARGIN, y, { size: 12, bold: true });
  y += 7;
  const dailyData = [
    ['System Input', `${(nrw.totalInput * 86.4).toFixed(0)} m³/day`, `${(nrw.totalInput * 86400 / 1000).toFixed(1)} kL/day`],
    ['System Demand', `${(nrw.totalDemand * 86.4).toFixed(0)} m³/day`, `${(nrw.totalDemand * 86400 / 1000).toFixed(1)} kL/day`],
    ['NRW Volume', `${(nrw.nrwLps * 86.4).toFixed(0)} m³/day`, `${(nrw.nrwLps * 86400 / 1000).toFixed(1)} kL/day`],
  ];
  for (const [label, v1, v2] of dailyData) {
    addText(doc, label, MARGIN + 2, y, { size: 9, color: MUTED });
    addText(doc, v1, MARGIN + 60, y, { size: 9, bold: true });
    addText(doc, v2, MARGIN + 110, y, { size: 9, color: MUTED });
    y += 5.5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 8: NODE RESULTS SCHEDULE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '6. Node Results Schedule', y);

  // Reservoir results
  addText(doc, 'Reservoirs', MARGIN, y, { size: 11, bold: true });
  y += 6;
  for (const r of model.reservoirs) {
    const nr = results.nodeResults.get(r.id);
    if (!nr) continue;
    addText(doc, `${r.id}: Head = ${nr.head.toFixed(2)}m, Net Flow = ${Math.abs(nr.demand).toFixed(2)} LPS`, MARGIN + 4, y, { size: 9 });
    y += 5;
  }
  y += 4;

  // Tank results
  if (model.tanks.length > 0) {
    addText(doc, 'Tanks', MARGIN, y, { size: 11, bold: true });
    y += 6;
    for (const t of model.tanks) {
      const nr = results.nodeResults.get(t.id);
      if (!nr) continue;
      addText(doc, `${t.id}: Level = ${nr.tankLevel.toFixed(2)}m, Pressure = ${nr.pressure.toFixed(2)}m, Head = ${nr.head.toFixed(2)}m`, MARGIN + 4, y, { size: 9 });
      y += 5;
    }
    y += 4;
  }

  // Junction results (full list)
  addText(doc, 'Junctions', MARGIN, y, { size: 11, bold: true });
  y += 6;

  const nCols = [
    { x: MARGIN, label: 'Node' },
    { x: MARGIN + 22, label: 'Elev (m)' },
    { x: MARGIN + 48, label: 'Demand (LPS)' },
    { x: MARGIN + 78, label: 'Pressure (m)' },
    { x: MARGIN + 108, label: 'Head (m)' },
    { x: MARGIN + 133, label: 'Status' },
  ];
  y = tableHeader(doc, nCols, y);

  for (const row of nodeTable) {
    y = checkPageBreak(doc, y, pageNum);
    addText(doc, row.id, nCols[0].x, y, { size: 8 });
    addText(doc, row.elevation.toFixed(1), nCols[1].x, y, { size: 8 });
    addText(doc, row.demand.toFixed(4), nCols[2].x, y, { size: 8 });
    addText(doc, row.pressure.toFixed(2), nCols[3].x, y, { size: 8, color: row.passes ? [30, 30, 30] : FAIL_RED });
    addText(doc, row.head.toFixed(2), nCols[4].x, y, { size: 8 });
    addText(doc, row.passes ? 'PASS' : 'FAIL', nCols[5].x, y, { size: 8, bold: true, color: row.passes ? PASS_GREEN : FAIL_RED });
    y += 4.5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 9: PIPE SCHEDULE
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '7. Pipe Schedule', y);

  addText(doc, `Total: ${model.pipes.length} pipes | ${(totalLength / 1000).toFixed(2)} km | ${formatLakhs(totalCost)}`, MARGIN, y, { size: 10, color: MUTED });
  y += 8;

  const pipeCols = [
    { x: MARGIN, label: 'Pipe' },
    { x: MARGIN + 16, label: 'From' },
    { x: MARGIN + 32, label: 'To' },
    { x: MARGIN + 48, label: 'Dia' },
    { x: MARGIN + 60, label: 'Mat' },
    { x: MARGIN + 74, label: 'Len (m)' },
    { x: MARGIN + 93, label: 'C' },
    { x: MARGIN + 104, label: 'Flow' },
    { x: MARGIN + 120, label: 'Vel' },
    { x: MARGIN + 135, label: 'H.L.' },
    { x: MARGIN + 150, label: 'Cost' },
  ];
  y = tableHeader(doc, pipeCols, y);

  for (const row of pipeSchedule) {
    y = checkPageBreak(doc, y, pageNum);
    addText(doc, row.id, pipeCols[0].x, y, { size: 7 });
    addText(doc, row.fromNode, pipeCols[1].x, y, { size: 7 });
    addText(doc, row.toNode, pipeCols[2].x, y, { size: 7 });
    addText(doc, String(row.diameter), pipeCols[3].x, y, { size: 7 });
    addText(doc, row.material, pipeCols[4].x, y, { size: 7 });
    addText(doc, row.length.toFixed(0), pipeCols[5].x, y, { size: 7 });
    addText(doc, String(row.roughness), pipeCols[6].x, y, { size: 7 });
    addText(doc, row.flow.toFixed(2), pipeCols[7].x, y, { size: 7 });
    addText(doc, row.velocity.toFixed(3), pipeCols[8].x, y, { size: 7 });
    addText(doc, row.headloss.toFixed(3), pipeCols[9].x, y, { size: 7 });
    addText(doc, formatLakhs(row.cost), pipeCols[10].x, y, { size: 7 });
    y += 4.2;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 10: COST SUMMARY
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '8. Cost Summary', y);

  // Total cost card
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 4, 4, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, y, CONTENT_W, 3, 'F');
  addText(doc, 'Total Estimated Pipe Cost', MARGIN + 8, y + 12, { size: 10, color: MUTED });
  addText(doc, formatLakhs(totalCost), MARGIN + CONTENT_W - 10, y + 12, { size: 18, bold: true, color: ACCENT, align: 'right' });
  addText(doc, `${(totalLength / 1000).toFixed(2)} km | Cost/km: ${formatLakhs(totalCost / (totalLength / 1000 || 1))}`, MARGIN + 8, y + 19, { size: 8, color: MUTED });
  y += 32;

  // Cost by diameter
  addText(doc, 'Cost by Pipe Diameter', MARGIN, y, { size: 11, bold: true });
  y += 7;

  const byDia = new Map<number, { count: number; length: number; cost: number }>();
  for (const p of pipeSchedule) {
    const existing = byDia.get(p.diameter) || { count: 0, length: 0, cost: 0 };
    existing.count++;
    existing.length += p.length;
    existing.cost += p.cost;
    byDia.set(p.diameter, existing);
  }

  const diaCols = [
    { x: MARGIN, label: 'Diameter (mm)' },
    { x: MARGIN + 35, label: 'Count' },
    { x: MARGIN + 55, label: 'Length (m)' },
    { x: MARGIN + 85, label: 'Cost' },
    { x: MARGIN + 120, label: '% of Total' },
  ];
  y = tableHeader(doc, diaCols, y);

  const sortedDias = [...byDia.entries()].sort((a, b) => b[1].cost - a[1].cost);
  for (const [dia, data] of sortedDias) {
    y = checkPageBreak(doc, y, pageNum);
    const pct = totalCost > 0 ? (data.cost / totalCost * 100) : 0;
    addText(doc, String(dia), diaCols[0].x, y, { size: 9 });
    addText(doc, String(data.count), diaCols[1].x, y, { size: 9 });
    addText(doc, data.length.toFixed(0), diaCols[2].x, y, { size: 9 });
    addText(doc, formatLakhs(data.cost), diaCols[3].x, y, { size: 9 });
    addText(doc, `${pct.toFixed(1)}%`, diaCols[4].x, y, { size: 9 });
    y += 5;
  }

  y += 6;

  // Cost by material
  addText(doc, 'Cost by Material', MARGIN, y, { size: 11, bold: true });
  y += 7;

  const byMat = new Map<string, { count: number; length: number; cost: number }>();
  for (const p of pipeSchedule) {
    const existing = byMat.get(p.material) || { count: 0, length: 0, cost: 0 };
    existing.count++;
    existing.length += p.length;
    existing.cost += p.cost;
    byMat.set(p.material, existing);
  }

  const matCols = [
    { x: MARGIN, label: 'Material' },
    { x: MARGIN + 35, label: 'Count' },
    { x: MARGIN + 55, label: 'Length (m)' },
    { x: MARGIN + 85, label: 'Cost' },
    { x: MARGIN + 120, label: '% of Total' },
  ];
  y = tableHeader(doc, matCols, y);

  for (const [mat, data] of byMat.entries()) {
    y = checkPageBreak(doc, y, pageNum);
    const pct = totalCost > 0 ? (data.cost / totalCost * 100) : 0;
    addText(doc, mat, matCols[0].x, y, { size: 9 });
    addText(doc, String(data.count), matCols[1].x, y, { size: 9 });
    addText(doc, data.length.toFixed(0), matCols[2].x, y, { size: 9 });
    addText(doc, formatLakhs(data.cost), matCols[3].x, y, { size: 9 });
    addText(doc, `${pct.toFixed(1)}%`, matCols[4].x, y, { size: 9 });
    y += 5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 11: DESIGN CRITERIA
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '9. Design Criteria (CPHEEO 2024)', y);

  const criteriaData = [
    ['Parameter', 'Value', 'Reference'],
    ['Per-capita supply', `${dc.lpcd} lpcd`, 'CPHEEO 2024 Rev, Class I city'],
    ['Peak factor', `${dc.peakFactor}`, 'CPHEEO Ch. 2 (verify)'],
    ['Residual pressure floor', `${dc.residualPressureFloor} m`, 'CPHEEO 24x7 DMA (Class I/II)'],
    ['Velocity (permissible)', `${dc.velocityMin}–${dc.velocityMax} m/s`, 'CPHEEO'],
    ['Velocity (economic)', `${dc.velocityEconomicMin}–${dc.velocityEconomicMax} m/s`, 'CPHEEO'],
    ['Hazen-Williams C', `${dc.defaultRoughness}`, 'CPHEEO — new DI pipe'],
    ['NRW target', `<${(dc.nrwTarget * 100).toFixed(0)}%`, 'AMRUT 2.0'],
    ['Design period', `${dc.designPeriodYears} years`, 'CPHEEO'],
    ['Headloss formula', 'Hazen-Williams', 'CPHEEO standard'],
    ['Flow units', 'LPS (litres per second)', 'SI units'],
    ['Demand multiplier', `${model.options.demandMultiplier}`, 'Global multiplier'],
  ];

  // Header row
  doc.setFillColor(...TABLE_HEADER_BG);
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  addText(doc, criteriaData[0][0], MARGIN, y, { size: 9, bold: true, color: MUTED });
  addText(doc, criteriaData[0][1], MARGIN + 60, y, { size: 9, bold: true, color: MUTED });
  addText(doc, criteriaData[0][2], MARGIN + 110, y, { size: 9, bold: true, color: MUTED });
  y += 6;

  for (let i = 1; i < criteriaData.length; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(MARGIN, y - 4, CONTENT_W, 5.5, 'F');
    }
    addText(doc, criteriaData[i][0], MARGIN, y, { size: 9, color: [80, 80, 80] });
    addText(doc, criteriaData[i][1], MARGIN + 60, y, { size: 9, bold: true });
    addText(doc, criteriaData[i][2], MARGIN + 110, y, { size: 9, color: MUTED });
    y += 5.5;
  }

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // PAGE 12: DEFICIENT ZONES
  // ═══════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  y = MARGIN;

  y = addSectionTitle(doc, '10. Deficient Zones — Remediation Required', y);

  if (compliance.deficientJunctions.length === 0) {
    doc.setFillColor(230, 245, 235);
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 4, 4, 'F');
    addText(doc, 'All junctions meet the minimum pressure requirement.', PAGE_W / 2, y + 12, { size: 12, bold: true, color: PASS_GREEN, align: 'center' });
  } else {
    addText(doc, `${compliance.deficientJunctions.length} junctions below ${dc.residualPressureFloor}m pressure floor — remediation required`, MARGIN, y, { size: 10, bold: true, color: FAIL_RED });
    y += 8;

    const dCols = [
      { x: MARGIN, label: 'Node' },
      { x: MARGIN + 30, label: 'Pressure (m)' },
      { x: MARGIN + 65, label: 'Deficit (m)' },
      { x: MARGIN + 100, label: 'Severity' },
    ];
    y = tableHeader(doc, dCols, y);

    for (const dj of compliance.deficientJunctions) {
      y = checkPageBreak(doc, y, pageNum);
      const severity = dj.deficit > 10 ? 'CRITICAL' : dj.deficit > 5 ? 'HIGH' : 'MODERATE';
      const sevColor = dj.deficit > 10 ? FAIL_RED : dj.deficit > 5 ? [230, 126, 34] as [number, number, number] : [243, 156, 18] as [number, number, number];

      addText(doc, dj.id, dCols[0].x, y, { size: 9 });
      addText(doc, dj.pressure.toFixed(2), dCols[1].x, y, { size: 9, color: FAIL_RED });
      addText(doc, dj.deficit.toFixed(2), dCols[2].x, y, { size: 9 });
      addText(doc, severity, dCols[3].x, y, { size: 9, bold: true, color: sevColor });
      y += 5;
    }

    y += 8;
    addText(doc, 'Recommended Actions:', MARGIN, y, { size: 10, bold: true });
    y += 6;
    const actions = [
      'Increase pipe diameters in critical corridors to reduce head loss',
      'Consider additional booster pumps or elevated storage near deficient zones',
      'Review demand allocation — verify population estimates for affected zones',
      'Evaluate network looping to provide alternative flow paths',
    ];
    for (const action of actions) {
      addText(doc, `  •  ${action}`, MARGIN, y, { size: 9, color: [80, 80, 80] });
      y += 5.5;
    }
  }

  // Final footer
  y += 15;
  y = checkPageBreak(doc, y, pageNum, 30);
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  addText(doc, '— End of Report —', PAGE_W / 2, y, { size: 10, color: MUTED, align: 'center' });
  y += 8;
  addText(doc, 'Generated by Soliton — Browser-based Hydraulic Design Tool', PAGE_W / 2, y, { size: 8, color: [180, 180, 180], align: 'center' });
  addText(doc, 'EPANET 2.2 (WebAssembly) | No server, no license, no installation', PAGE_W / 2, y + 5, { size: 8, color: [180, 180, 180], align: 'center' });

  addPageFooter(doc, pageNum.n);

  // ═══════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════
  doc.save(`DPR-${model.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
