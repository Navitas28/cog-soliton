/**
 * Population & demand projection page — standard DPR chapter.
 * Shows base year → intermediate → design horizon projections.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../../model/types';
import {
  addText, addPageFooter, addSectionTitle, tableHeader,
  MARGIN, CONTENT_W, MUTED, ACCENT, DARK,
} from './shared';

export interface PopulationRow {
  year: number;
  label: string;
  populationLakhs: number;
  lpcd: number;
  avgDemandMLD: number;
  peakDemandMLD: number;
}

export function computePopulationProjection(
  basePopLakhs: number,
  growthRatePct: number,
  lpcd: number,
  peakFactor: number,
  designPeriodYears: number,
): PopulationRow[] {
  const baseYear = 2024;
  const midYear = baseYear + Math.floor(designPeriodYears / 3);
  const endYear = baseYear + designPeriodYears;

  const project = (years: number) => basePopLakhs * Math.pow(1 + growthRatePct / 100, years);
  const avgMLD = (pop: number) => (pop * 100000 * lpcd) / 1e6; // lakhs → persons, lpcd → MLD
  const peakMLD = (avg: number) => avg * peakFactor;

  const rows: PopulationRow[] = [];

  for (const [year, label] of [[baseYear, 'Base Year'], [midYear, 'Intermediate'], [endYear, 'Design Horizon']] as [number, string][]) {
    const pop = project(year - baseYear);
    const avg = avgMLD(pop);
    rows.push({
      year,
      label,
      populationLakhs: pop,
      lpcd,
      avgDemandMLD: avg,
      peakDemandMLD: peakMLD(avg),
    });
  }

  return rows;
}

export function renderPopulationPage(
  doc: jsPDF,
  pageNum: { n: number },
  model: NetworkModel,
  chapterNum: number,
): void {
  const meta = model.cityMetadata;
  if (!meta) return; // skip for custom networks

  const dc = model.designCriteria;
  let y = MARGIN;

  y = addSectionTitle(doc, `${chapterNum}. Population & Demand Projection`, y);

  // Intro text
  addText(doc, `City: ${meta.cityName} (${meta.cityClass}) | State: ${meta.stateName}`, MARGIN, y, {
    size: 10, color: [60, 60, 80],
  });
  y += 6;
  addText(doc, `Base population: ${meta.populationLakhs.toFixed(2)} lakh | Growth rate: ${meta.growthRatePct}% (URDPFI)`, MARGIN, y, {
    size: 9, color: MUTED,
  });
  y += 6;
  addText(doc, `Per-capita supply: ${dc.lpcd} lpcd (CPHEEO 2024) | Peak factor: ${dc.peakFactor}`, MARGIN, y, {
    size: 9, color: MUTED,
  });
  y += 10;

  // Projection table
  const rows = computePopulationProjection(
    meta.populationLakhs,
    meta.growthRatePct,
    dc.lpcd,
    dc.peakFactor,
    dc.designPeriodYears,
  );

  const cols = [
    { x: MARGIN, label: 'Year' },
    { x: MARGIN + 18, label: 'Stage' },
    { x: MARGIN + 52, label: 'Pop (lakh)' },
    { x: MARGIN + 80, label: 'LPCD' },
    { x: MARGIN + 100, label: 'Avg Demand (MLD)' },
    { x: MARGIN + 140, label: 'Peak Demand (MLD)' },
  ];
  y = tableHeader(doc, cols, y);

  for (const row of rows) {
    const isBold = row.label === 'Design Horizon';
    addText(doc, String(row.year), cols[0].x, y, { size: 9, bold: isBold });
    addText(doc, row.label, cols[1].x, y, { size: 9, bold: isBold });
    addText(doc, row.populationLakhs.toFixed(2), cols[2].x, y, { size: 9, bold: isBold });
    addText(doc, String(row.lpcd), cols[3].x, y, { size: 9 });
    addText(doc, row.avgDemandMLD.toFixed(2), cols[4].x, y, { size: 9, bold: isBold });
    addText(doc, row.peakDemandMLD.toFixed(2), cols[5].x, y, { size: 9, bold: isBold, color: ACCENT });
    y += 6;
  }

  y += 8;

  // Design basis box
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 40, 3, 3, 'F');
  const bx = MARGIN + 6;
  addText(doc, 'Design Basis', bx, y + 8, { size: 11, bold: true, color: DARK });
  addText(doc, `\u2022  Design period: ${dc.designPeriodYears} years (CPHEEO 2024)`, bx, y + 16, { size: 9, color: [60, 60, 80] });
  addText(doc, `\u2022  Growth rate: ${meta.growthRatePct}% per annum (URDPFI guidelines)`, bx, y + 22, { size: 9, color: [60, 60, 80] });
  addText(doc, `\u2022  Per-capita supply: ${dc.lpcd} lpcd for ${meta.cityClass} city with sewerage`, bx, y + 28, { size: 9, color: [60, 60, 80] });
  addText(doc, `\u2022  Peak factor: ${dc.peakFactor} (CPHEEO Ch. 2)`, bx, y + 34, { size: 9, color: [60, 60, 80] });

  y += 50;

  // Source summary
  addText(doc, 'Source of Supply', MARGIN, y, { size: 11, bold: true, color: DARK });
  y += 7;
  const sourceRows = [
    ['Water Source', meta.waterSource],
    ['Source Type', meta.sourceType.charAt(0).toUpperCase() + meta.sourceType.slice(1)],
    ['WTP Capacity', `${meta.wtpCapacityMLD} MLD`],
    ['Design Demand (Horizon)', `${rows[rows.length - 1].peakDemandMLD.toFixed(2)} MLD (peak)`],
  ];
  for (const [label, value] of sourceRows) {
    addText(doc, label, MARGIN + 2, y, { size: 9, color: MUTED });
    addText(doc, value, MARGIN + 60, y, { size: 9, bold: true });
    y += 5.5;
  }

  addPageFooter(doc, pageNum.n);
}
