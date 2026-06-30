/**
 * Multi-scenario comparison dashboard — side-by-side metrics for saved scenarios.
 */
import { useState, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { loadScenarios, type SavedScenario } from '../store/scenarioStore';
import { serializeToInp } from '../model/serializer';
import { solveSteadyState } from '../engine/engine';
import type { SteadyStateResult } from '../engine/engine';
import { getCostPerMeter } from '../data/pipeCosts';
import type { PipeMaterial } from '../model/types';

interface ScenarioMetrics {
  scenario: SavedScenario;
  results: SteadyStateResult | null;
  pressurePassing: number;
  pressureTotal: number;
  velocityPassing: number;
  velocityTotal: number;
  totalCost: number;
  totalLength: number;
  minPressure: number;
  maxPressure: number;
  pipeCount: number;
  nodeCount: number;
}

export function ComparisonDashboard({ onClose }: { onClose: () => void }) {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, true);
  const [scenarios] = useState(() => loadScenarios());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState<ScenarioMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 4) next.add(id);
    setSelected(next);
  };

  const handleCompare = async () => {
    setLoading(true);
    const results: ScenarioMetrics[] = [];

    for (const sc of scenarios.filter(s => selected.has(s.id))) {
      const model = sc.model;
      const dc = model.designCriteria;
      let solveResult: SteadyStateResult | null = null;
      try {
        const inp = serializeToInp(model);
        solveResult = await solveSteadyState(inp);
      } catch { /* solve failed */ }

      let pressurePassing = 0;
      let minPressure = Infinity;
      let maxPressure = -Infinity;
      if (solveResult) {
        for (const j of model.junctions) {
          const nr = solveResult.nodeResults.get(j.id);
          if (!nr) continue;
          if (nr.pressure >= dc.residualPressureFloor) pressurePassing++;
          if (nr.pressure < minPressure) minPressure = nr.pressure;
          if (nr.pressure > maxPressure) maxPressure = nr.pressure;
        }
      }

      let velocityPassing = 0;
      if (solveResult) {
        for (const p of model.pipes) {
          const lr = solveResult.linkResults.get(p.id);
          if (!lr) continue;
          const v = Math.abs(lr.velocity);
          if (v >= dc.velocityMin && v <= dc.velocityMax) velocityPassing++;
        }
      }

      const totalCost = model.pipes.reduce((sum, p) => {
        const mat = (p.material || 'DI') as PipeMaterial;
        return sum + p.length * getCostPerMeter(p.diameter, mat);
      }, 0);

      const totalLength = model.pipes.reduce((sum, p) => sum + p.length, 0);

      results.push({
        scenario: sc,
        results: solveResult,
        pressurePassing,
        pressureTotal: model.junctions.length,
        velocityPassing,
        velocityTotal: model.pipes.length,
        totalCost,
        totalLength,
        minPressure: minPressure === Infinity ? 0 : minPressure,
        maxPressure: maxPressure === -Infinity ? 0 : maxPressure,
        pipeCount: model.pipes.length,
        nodeCount: model.junctions.length + model.reservoirs.length + model.tanks.length,
      });
    }

    setMetrics(results);
    setLoading(false);
  };

  const formatLakhs = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // Find best value per metric for highlighting
  const bestCost = metrics.length > 0 ? Math.min(...metrics.map(m => m.totalCost)) : 0;
  const bestPressure = metrics.length > 0 ? Math.max(...metrics.map(m => m.pressureTotal > 0 ? m.pressurePassing / m.pressureTotal : 0)) : 0;

  return (
    <div ref={trapRef} className="shortcut-overlay-backdrop" onClick={onClose}>
      <div className="comparison-dashboard" onClick={e => e.stopPropagation()}>
        <div className="shortcut-overlay-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Scenario Comparison</span>
          <button className="shortcut-overlay-close" onClick={onClose}>×</button>
        </div>

        {metrics.length === 0 ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Select 2–4 saved scenarios to compare their hydraulic performance and cost.
            </p>

            {scenarios.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                No saved scenarios. Use Scenario panel to save scenarios first.
              </p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
                {scenarios.map(sc => (
                  <label key={sc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                    fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border-light)',
                  }}>
                    <input
                      type="checkbox"
                      checked={selected.has(sc.id)}
                      onChange={() => toggleSelect(sc.id)}
                    />
                    <span style={{ flex: 1 }}>{sc.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(sc.savedAt).toLocaleDateString()}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <button
              className="compute-btn"
              onClick={handleCompare}
              disabled={selected.size < 2 || loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Solving...' : `Compare ${selected.size} Scenarios`}
            </button>
          </>
        ) : (
          <>
            <div className="cost-table-scroll" style={{ maxHeight: 400 }}>
              <table className="cost-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {metrics.map(m => (
                      <th key={m.scenario.id} style={{ minWidth: 100 }}>{m.scenario.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Nodes</td>
                    {metrics.map(m => <td key={m.scenario.id}>{m.nodeCount}</td>)}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Pipes</td>
                    {metrics.map(m => <td key={m.scenario.id}>{m.pipeCount}</td>)}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total Length</td>
                    {metrics.map(m => <td key={m.scenario.id}>{(m.totalLength / 1000).toFixed(2)} km</td>)}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total Cost</td>
                    {metrics.map(m => (
                      <td key={m.scenario.id} style={{ color: m.totalCost === bestCost ? 'var(--success)' : undefined, fontWeight: m.totalCost === bestCost ? 700 : undefined }}>
                        {formatLakhs(m.totalCost)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Pressure Compliance</td>
                    {metrics.map(m => {
                      const pct = m.pressureTotal > 0 ? (m.pressurePassing / m.pressureTotal) : 0;
                      const isBest = pct === bestPressure;
                      return (
                        <td key={m.scenario.id} style={{ color: isBest ? 'var(--success)' : pct < 0.9 ? 'var(--danger)' : undefined, fontWeight: isBest ? 700 : undefined }}>
                          {(pct * 100).toFixed(1)}% ({m.pressurePassing}/{m.pressureTotal})
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Velocity In Band</td>
                    {metrics.map(m => (
                      <td key={m.scenario.id}>{m.velocityPassing}/{m.velocityTotal}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Min Pressure</td>
                    {metrics.map(m => (
                      <td key={m.scenario.id} style={{ color: m.minPressure < m.scenario.model.designCriteria.residualPressureFloor ? 'var(--danger)' : undefined }}>
                        {m.minPressure.toFixed(1)} m
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Max Pressure</td>
                    {metrics.map(m => <td key={m.scenario.id}>{m.maxPressure.toFixed(1)} m</td>)}
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="top-bar-btn" onClick={() => setMetrics([])} style={{ flex: 1 }}>
                Back
              </button>
              <button className="top-bar-btn" onClick={onClose} style={{ flex: 1 }}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
