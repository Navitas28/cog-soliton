/**
 * PDF report generator — branded report with compliance tables and cost summary.
 * Uses jsPDF for PDF generation and MapLibre canvas capture for map screenshot.
 */
import { jsPDF } from 'jspdf';
import type { NetworkModel } from '../model/types';
import type { SteadyStateResult } from '../engine/engine';
import { getCostPerMeter } from '../data/pipeCosts';
import type { PipeMaterial } from '../data/pipeCosts';

interface ReportData {
  model: NetworkModel;
  results: SteadyStateResult;
  mapImageDataUrl?: string; // from map.getCanvas().toDataURL()
}

export function generateReport(data: ReportData): void {
  const { model, results, mapImageDataUrl } = data;
  const dc = model.designCriteria;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - 2 * margin;
  let y = margin;

  const addText = (text: string, x: number, yPos: number, opts?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }) => {
    doc.setFontSize(opts?.size || 10);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setTextColor(...(opts?.color || [30, 30, 30]));
    doc.text(text, x, yPos, { align: opts?.align });
  };

  // --- Cover Page ---
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pageW, 297, 'F');

  addText('SOLITON', pageW / 2, 80, { size: 32, bold: true, color: [255, 255, 255], align: 'center' });
  addText('Hydraulic Network Design Report', pageW / 2, 92, { size: 14, color: [138, 138, 158], align: 'center' });

  addText(model.title, pageW / 2, 120, { size: 18, bold: true, color: [58, 95, 207], align: 'center' });

  addText(`Design Basis: CPHEEO 2024 | ${dc.lpcd} lpcd | ${dc.residualPressureFloor}m pressure floor`, pageW / 2, 140, { size: 10, color: [138, 138, 158], align: 'center' });
  addText(`${model.junctions.length} junctions, ${model.pipes.length} pipes, ${model.reservoirs.length} reservoirs, ${model.tanks.length} tanks`, pageW / 2, 148, { size: 10, color: [138, 138, 158], align: 'center' });

  addText(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW / 2, 170, { size: 10, color: [100, 100, 120], align: 'center' });

  addText('EPANET 2.2 (WebAssembly) | Browser-based analysis', pageW / 2, 270, { size: 8, color: [100, 100, 120], align: 'center' });

  // --- Page 2: Network Map ---
  doc.addPage();
  y = margin;
  addText('Network Map', margin, y, { size: 16, bold: true });
  y += 8;

  if (mapImageDataUrl) {
    try {
      const imgW = contentW;
      const imgH = imgW * 0.6; // ~16:10 aspect
      doc.addImage(mapImageDataUrl, 'PNG', margin, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      addText('(Map screenshot not available)', margin, y, { size: 10, color: [150, 150, 150] });
      y += 8;
    }
  } else {
    addText('(Map screenshot not available)', margin, y, { size: 10, color: [150, 150, 150] });
    y += 8;
  }

  // --- Page 3: Compliance Summary ---
  doc.addPage();
  y = margin;
  addText('Compliance Summary', margin, y, { size: 16, bold: true });
  y += 10;

  // Pressure compliance
  let pressurePassing = 0;
  const junctionPressures: { id: string; pressure: number; passes: boolean }[] = [];
  for (const j of model.junctions) {
    const nr = results.nodeResults.get(j.id);
    if (!nr) continue;
    const passes = nr.pressure >= dc.residualPressureFloor;
    if (passes) pressurePassing++;
    junctionPressures.push({ id: j.id, pressure: nr.pressure, passes });
  }
  const pPct = model.junctions.length > 0 ? (pressurePassing / model.junctions.length * 100) : 0;

  let velocityPassing = 0;
  const pipeVelocities: { id: string; diameter: number; velocity: number; passes: boolean }[] = [];
  for (const p of model.pipes) {
    const lr = results.linkResults.get(p.id);
    if (!lr) continue;
    const v = Math.abs(lr.velocity);
    const passes = v >= dc.velocityMin && v <= dc.velocityMax;
    if (passes) velocityPassing++;
    pipeVelocities.push({ id: p.id, diameter: p.diameter, velocity: v, passes });
  }

  addText(`Pressure: ${pressurePassing}/${model.junctions.length} junctions pass (${pPct.toFixed(1)}%)`, margin, y, { size: 11, bold: true, color: pPct >= 90 ? [39, 174, 96] : [231, 76, 60] });
  y += 6;
  addText(`Velocity: ${velocityPassing}/${model.pipes.length} pipes in permissible band`, margin, y, { size: 11, bold: true });
  y += 10;

  // Pressure table
  addText('Junction Pressures', margin, y, { size: 12, bold: true });
  y += 6;

  // Table header
  const cols = [margin, margin + 30, margin + 65, margin + 100];
  doc.setFillColor(247, 248, 250);
  doc.rect(margin, y - 4, contentW, 6, 'F');
  addText('Node', cols[0], y, { size: 9, bold: true, color: [100, 100, 100] });
  addText('Pressure (m)', cols[1], y, { size: 9, bold: true, color: [100, 100, 100] });
  addText('Floor (m)', cols[2], y, { size: 9, bold: true, color: [100, 100, 100] });
  addText('Status', cols[3], y, { size: 9, bold: true, color: [100, 100, 100] });
  y += 5;

  for (const jp of junctionPressures.sort((a, b) => a.pressure - b.pressure).slice(0, 30)) {
    if (y > 275) { doc.addPage(); y = margin; }
    addText(jp.id, cols[0], y, { size: 9 });
    addText(jp.pressure.toFixed(2), cols[1], y, { size: 9 });
    addText(String(dc.residualPressureFloor), cols[2], y, { size: 9 });
    addText(jp.passes ? 'PASS' : 'FAIL', cols[3], y, { size: 9, bold: true, color: jp.passes ? [39, 174, 96] : [231, 76, 60] });
    y += 4.5;
  }

  // --- Page 4: Cost Summary ---
  doc.addPage();
  y = margin;
  addText('Cost Summary', margin, y, { size: 16, bold: true });
  y += 10;

  const totalCost = model.pipes.reduce((sum, p) => {
    const mat = (p.material || 'DI') as PipeMaterial;
    return sum + p.length * getCostPerMeter(p.diameter, mat);
  }, 0);
  const totalLength = model.pipes.reduce((sum, p) => sum + p.length, 0);

  const formatLakhs = (n: number) => {
    if (n >= 10000000) return `Rs ${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `Rs ${(n / 100000).toFixed(2)} L`;
    return `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  addText(`Total Pipe Cost: ${formatLakhs(totalCost)}`, margin, y, { size: 12, bold: true });
  y += 6;
  addText(`Total Length: ${(totalLength / 1000).toFixed(2)} km | Cost/km: ${formatLakhs(totalCost / (totalLength / 1000 || 1))}`, margin, y, { size: 10, color: [100, 100, 100] });
  y += 10;

  // Pipe cost table
  addText('Pipe Cost Breakdown', margin, y, { size: 12, bold: true });
  y += 6;

  const pipeCols = [margin, margin + 25, margin + 50, margin + 75, margin + 100, margin + 130];
  doc.setFillColor(247, 248, 250);
  doc.rect(margin, y - 4, contentW, 6, 'F');
  addText('Pipe', pipeCols[0], y, { size: 8, bold: true, color: [100, 100, 100] });
  addText('Dia (mm)', pipeCols[1], y, { size: 8, bold: true, color: [100, 100, 100] });
  addText('Material', pipeCols[2], y, { size: 8, bold: true, color: [100, 100, 100] });
  addText('Length (m)', pipeCols[3], y, { size: 8, bold: true, color: [100, 100, 100] });
  addText('Rate (Rs/m)', pipeCols[4], y, { size: 8, bold: true, color: [100, 100, 100] });
  addText('Total', pipeCols[5], y, { size: 8, bold: true, color: [100, 100, 100] });
  y += 5;

  for (const p of model.pipes.sort((a, b) => (b.length * getCostPerMeter(b.diameter, (b.material || 'DI') as PipeMaterial)) - (a.length * getCostPerMeter(a.diameter, (a.material || 'DI') as PipeMaterial)))) {
    if (y > 275) { doc.addPage(); y = margin; }
    const mat = (p.material || 'DI') as PipeMaterial;
    const rate = getCostPerMeter(p.diameter, mat);
    addText(p.id, pipeCols[0], y, { size: 8 });
    addText(String(p.diameter), pipeCols[1], y, { size: 8 });
    addText(mat, pipeCols[2], y, { size: 8 });
    addText(p.length.toFixed(0), pipeCols[3], y, { size: 8 });
    addText(rate.toLocaleString('en-IN'), pipeCols[4], y, { size: 8 });
    addText(formatLakhs(p.length * rate), pipeCols[5], y, { size: 8 });
    y += 4.5;
  }

  // --- Page 5: Design Criteria ---
  doc.addPage();
  y = margin;
  addText('Design Criteria (CPHEEO 2024)', margin, y, { size: 16, bold: true });
  y += 10;

  const criteria = [
    ['Per-capita supply', `${dc.lpcd} lpcd`],
    ['Peak factor', `${dc.peakFactor}`],
    ['Residual pressure floor', `${dc.residualPressureFloor} m`],
    ['Velocity range', `${dc.velocityMin}–${dc.velocityMax} m/s`],
    ['Economic velocity', `${dc.velocityEconomicMin}–${dc.velocityEconomicMax} m/s`],
    ['Hazen-Williams C (default)', `${dc.defaultRoughness}`],
    ['NRW target', `<${(dc.nrwTarget * 100).toFixed(0)}%`],
    ['Design period', `${dc.designPeriodYears} years`],
  ];

  for (const [label, value] of criteria) {
    addText(label, margin, y, { size: 10, color: [100, 100, 100] });
    addText(value, margin + 80, y, { size: 10, bold: true });
    y += 6;
  }

  // Footer
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  addText('Generated by Soliton — Browser-based Hydraulic Design Tool | EPANET 2.2 (WebAssembly)', margin, y, { size: 8, color: [150, 150, 150] });

  // Save
  doc.save(`soliton-report-${model.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
