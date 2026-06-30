/**
 * Data Sources Annexure — lists all public data sources used.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../../model/types';
import {
  addText, addPageFooter, addSectionTitle, tableHeader,
  MARGIN, CONTENT_W, MUTED, DARK,
} from './shared';

export function renderAnnexuresPage(
  doc: jsPDF,
  pageNum: { n: number },
  model: NetworkModel,
  annexureNum: string,
): void {
  let y = MARGIN;

  y = addSectionTitle(doc, `Annexure ${annexureNum}: Data Sources & References`, y);
  y += 2;

  const meta = model.cityMetadata;
  const stateSOR = meta ? `${meta.stateName} State SOR 2024` : 'State SOR 2024';

  const sources = [
    { sno: 1, source: 'OpenStreetMap (OSM)', purpose: 'Road network, city boundary, ward layout', ref: 'openstreetmap.org' },
    { sno: 2, source: 'SRTM 30m DEM (USGS)', purpose: 'Node elevation data', ref: 'earthdata.nasa.gov' },
    { sno: 3, source: 'Census of India 2011', purpose: 'Population & ward-level demographics', ref: 'censusindia.gov.in' },
    { sno: 4, source: 'CPHEEO Manual 2024', purpose: 'Design criteria, demand norms, standards', ref: 'mohua.gov.in' },
    { sno: 5, source: stateSOR, purpose: 'Pipe cost estimation rates', ref: 'State PWD' },
    { sno: 6, source: 'AMRUT 2.0 DPR Filings', purpose: 'WTP/ESR locations, project scope', ref: 'amrut.gov.in' },
    { sno: 7, source: 'EPANET 2.2', purpose: 'Hydraulic simulation engine', ref: 'epa.gov/water-research' },
    { sno: 8, source: 'URDPFI Guidelines', purpose: 'Population growth rate projection', ref: 'mohua.gov.in' },
  ];

  // Table header
  const cols = [
    { x: MARGIN, label: 'S.No' },
    { x: MARGIN + 14, label: 'Data Source' },
    { x: MARGIN + 70, label: 'Purpose' },
    { x: MARGIN + 130, label: 'Reference' },
  ];
  y = tableHeader(doc, cols, y);

  for (const row of sources) {
    doc.setFillColor(row.sno % 2 === 0 ? 250 : 255, row.sno % 2 === 0 ? 250 : 255, 252);
    doc.rect(MARGIN, y - 3.5, CONTENT_W, 6, 'F');
    addText(doc, String(row.sno), cols[0].x + 3, y, { size: 8 });
    addText(doc, row.source, cols[1].x, y, { size: 8, bold: true });
    addText(doc, row.purpose, cols[2].x, y, { size: 8, color: [60, 60, 80] });
    addText(doc, row.ref, cols[3].x, y, { size: 7, color: MUTED });
    y += 6.5;
  }

  y += 12;

  // Disclaimer
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, 'F');
  addText(doc, 'Disclaimer', MARGIN + 6, y + 7, { size: 9, bold: true, color: DARK });
  addText(doc, 'The demo network models are synthetic but plausible \u2014 built from publicly available data.', MARGIN + 6, y + 13, {
    size: 8, color: [80, 80, 100],
  });
  addText(doc, 'They are representative models designed to demonstrate realistic hydraulic behavior, not actual utility GIS exports.', MARGIN + 6, y + 18, {
    size: 8, color: [80, 80, 100],
  });

  addPageFooter(doc, pageNum.n);
}
