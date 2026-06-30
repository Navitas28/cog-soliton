/**
 * Export: CSV results, INP file, and printable one-page summary.
 * Renders as a dropdown menu to reduce top-bar clutter.
 */
import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import type { NodeResult, LinkResult } from '../engine/engine';
import { generateReport } from '../export/reportGenerator';

export function ExportPanel() {
  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);
  const lastInp = useNetworkStore(s => s.lastInp);
  const [open, setOpen] = useState(false);

  const hasResults = !!(solveResult || epsResult);
  const hasAnything = hasResults || !!lastInp;

  let nodeResults: Map<string, NodeResult> | undefined;
  let linkResults: Map<string, LinkResult> | undefined;
  if (solveResult) {
    nodeResults = solveResult.nodeResults;
    linkResults = solveResult.linkResults;
  } else if (epsResult) {
    const ts = epsResult.timestamps[epsTimeIndex];
    nodeResults = epsResult.nodeResults.get(ts);
    linkResults = epsResult.linkResults.get(ts);
  }

  const exportNodeCsv = () => {
    if (!nodeResults) return;
    const dc = model.designCriteria;
    const rows = ['Node,Elevation,Pressure(m),Head(m),Demand(LPS),Status'];
    for (const j of model.junctions) {
      const nr = nodeResults.get(j.id);
      if (!nr) continue;
      const status = nr.pressure >= dc.residualPressureFloor ? 'PASS' : 'FAIL';
      rows.push(`${j.id},${j.elevation},${nr.pressure.toFixed(2)},${nr.head.toFixed(2)},${nr.demand.toFixed(4)},${status}`);
    }
    downloadCsv(rows.join('\n'), 'soliton-nodes.csv');
    setOpen(false);
  };

  const exportLinkCsv = () => {
    if (!linkResults) return;
    const dc = model.designCriteria;
    const rows = ['Pipe,Length(m),Diameter(mm),Flow(LPS),Velocity(m/s),HeadLoss(m/km),VelStatus'];
    for (const p of model.pipes) {
      const lr = linkResults.get(p.id);
      if (!lr) continue;
      const v = Math.abs(lr.velocity);
      let status = 'FAIL';
      if (v >= dc.velocityEconomicMin && v <= dc.velocityEconomicMax) status = 'OPTIMAL';
      else if (v >= dc.velocityMin && v <= dc.velocityMax) status = 'OK';
      rows.push(`${p.id},${p.length.toFixed(1)},${p.diameter},${lr.flow.toFixed(2)},${lr.velocity.toFixed(3)},${lr.headloss.toFixed(4)},${status}`);
    }
    downloadCsv(rows.join('\n'), 'soliton-pipes.csv');
    setOpen(false);
  };

  const exportInp = () => {
    if (!lastInp) return;
    downloadCsv(lastInp, 'soliton-model.inp');
    setOpen(false);
  };

  const printSummary = () => {
    if (!nodeResults || !linkResults) return;
    setOpen(false);
    const dc = model.designCriteria;

    const junctionsPassing = model.junctions.filter(j => {
      const nr = nodeResults!.get(j.id);
      return nr && nr.pressure >= dc.residualPressureFloor;
    }).length;

    const pipesInBand = model.pipes.filter(p => {
      const lr = linkResults!.get(p.id);
      if (!lr) return false;
      const v = Math.abs(lr.velocity);
      return v >= dc.velocityMin && v <= dc.velocityMax;
    }).length;

    const totalDemand = model.junctions.reduce((s, j) => {
      const nr = nodeResults!.get(j.id);
      return s + (nr ? Math.abs(nr.demand) : 0);
    }, 0);

    const totalInput = model.reservoirs.reduce((s, r) => {
      const nr = nodeResults!.get(r.id);
      return s + (nr ? Math.abs(nr.demand) : 0);
    }, 0);

    const nrw = totalInput > 0 ? ((totalInput - totalDemand) / totalInput * 100).toFixed(1) : '—';

    const deficient = model.junctions
      .map(j => ({ id: j.id, p: nodeResults!.get(j.id)?.pressure ?? 0 }))
      .filter(n => n.p < dc.residualPressureFloor)
      .sort((a, b) => a.p - b.p)
      .slice(0, 10);

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Soliton — ${model.title}</title>
      <style>
        body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1 { color: #1a1a2e; font-size: 22px; border-bottom: 3px solid #3a5fcf; padding-bottom: 8px; }
        h2 { color: #333; font-size: 16px; margin-top: 24px; }
        .metric { display: inline-block; margin: 8px 16px 8px 0; padding: 12px 20px; background: #f7f8fa; border-radius: 6px; text-align: center; }
        .metric .value { font-size: 24px; font-weight: 700; }
        .metric .label { font-size: 11px; color: #666; }
        .pass { color: #27ae60; } .fail { color: #e74c3c; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { padding: 4px 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; }
        th { font-weight: 600; background: #f7f8fa; }
        .footer { margin-top: 24px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      <h1>SOLITON — Hydraulic Analysis Summary</h1>
      <p><strong>${model.title}</strong></p>
      <p style="font-size: 12px; color: #666;">
        ${model.junctions.length} junctions, ${model.pipes.length} pipes,
        ${model.reservoirs.length} reservoirs, ${model.tanks.length} tanks
        | Design basis: CPHEEO 2024, ${dc.lpcd} lpcd, ${dc.residualPressureFloor}m pressure floor
      </p>

      <div>
        <div class="metric"><div class="value ${parseInt(String(junctionsPassing / model.junctions.length * 100)) >= 90 ? 'pass' : 'fail'}">${(junctionsPassing / model.junctions.length * 100).toFixed(1)}%</div><div class="label">Pressure Compliance</div></div>
        <div class="metric"><div class="value">${pipesInBand}/${model.pipes.length}</div><div class="label">Velocity In Band</div></div>
        <div class="metric"><div class="value">${nrw}%</div><div class="label">NRW Estimate</div></div>
      </div>

      <h2>Deficient Zones</h2>
      ${deficient.length > 0 ? `<table><tr><th>Node</th><th>Pressure (m)</th><th>Deficit</th></tr>
        ${deficient.map(d => `<tr><td>${d.id}</td><td>${d.p.toFixed(2)}</td><td class="fail">${(dc.residualPressureFloor - d.p).toFixed(2)}m below floor</td></tr>`).join('')}
      </table>` : '<p class="pass">All junctions meet pressure floor.</p>'}

      <h2>Design Criteria (CPHEEO)</h2>
      <table>
        <tr><td>Per-capita supply</td><td>${dc.lpcd} lpcd</td></tr>
        <tr><td>Residual pressure floor</td><td>${dc.residualPressureFloor} m (24x7 DMA)</td></tr>
        <tr><td>Velocity band</td><td>${dc.velocityMin}–${dc.velocityMax} m/s (economic: ${dc.velocityEconomicMin}–${dc.velocityEconomicMax})</td></tr>
        <tr><td>Hazen-Williams C</td><td>${dc.defaultRoughness}</td></tr>
        <tr><td>NRW target</td><td>&lt;${(dc.nrwTarget * 100).toFixed(0)}% (AMRUT 2.0)</td></tr>
      </table>

      <div class="footer">
        Generated by Soliton — Browser-based hydraulic design tool | EPANET 2.2 (WebAssembly)
        | ${new Date().toISOString().slice(0, 10)}
      </div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const exportPdf = () => {
    if (!nodeResults || !linkResults) return;
    setOpen(false);
    // Try to capture map screenshot
    let mapImageDataUrl: string | undefined;
    try {
      const mapCanvas = document.querySelector('.map-container canvas') as HTMLCanvasElement;
      if (mapCanvas) mapImageDataUrl = mapCanvas.toDataURL('image/png');
    } catch { /* canvas tainted or not available */ }
    generateReport({
      model,
      results: { nodeResults, linkResults },
      mapImageDataUrl,
    });
  };

  if (!hasAnything) return null;

  return (
    <div className="export-dropdown">
      <button className="top-bar-btn" onClick={() => setOpen(!open)}>
        📥 Export {open ? '▴' : '▾'}
      </button>
      {open && (
        <>
          <div className="export-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="export-dropdown-menu">
            {hasResults && (
              <>
                <button className="export-dropdown-item" onClick={exportNodeCsv}>
                  Nodes CSV
                </button>
                <button className="export-dropdown-item" onClick={exportLinkCsv}>
                  Pipes CSV
                </button>
                <button className="export-dropdown-item" onClick={printSummary}>
                  Print Summary
                </button>
                <button className="export-dropdown-item" onClick={exportPdf} style={{ fontWeight: 600, color: '#3a5fcf' }}>
                  Generate DPR (PDF)
                </button>
              </>
            )}
            {lastInp && (
              <button className="export-dropdown-item" onClick={exportInp}>
                INP File
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
