/**
 * Fire Flow Analysis Panel — systematic fire flow test at all junctions.
 */
import { useState, useCallback, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useNetworkStore } from '../store/networkStore';
import { serializeToInp } from '../model/serializer';
import {
  runFireFlowAnalysis, computeFireDemandLPM, lpmToLps,
  type FireFlowSummary,
} from '../engine/fireFlow';

export function FireFlowPanel({ onClose }: { onClose: () => void }) {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, true);
  const model = useNetworkStore(s => s.model);
  const hasResults = !!(useNetworkStore(s => s.solveResult) || useNetworkStore(s => s.epsResult));

  const [population, setPopulation] = useState(10000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState<FireFlowSummary | null>(null);
  const [sortBy, setSortBy] = useState<'nodeId' | 'residualPressure'>('residualPressure');

  const fireDemandLPM = computeFireDemandLPM(population);
  const fireDemandLPS = lpmToLps(fireDemandLPM);

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setSummary(null);

    const inp = serializeToInp(model);
    const junctionIds = model.junctions.map(j => j.id);

    const result = await runFireFlowAnalysis(
      inp,
      junctionIds,
      fireDemandLPS,
      model.designCriteria.residualPressureFloor,
      (current, total) => setProgress({ current, total }),
    );

    result.populationPerNode = population;
    setSummary(result);
    setRunning(false);
  }, [model, fireDemandLPS, population]);

  const sortedResults = summary?.results
    ? [...summary.results].sort((a, b) => {
        if (sortBy === 'nodeId') return a.nodeId.localeCompare(b.nodeId);
        return a.residualPressure - b.residualPressure;
      })
    : [];

  return (
    <div ref={trapRef} className="chart-modal-backdrop" onClick={onClose}>
      <div className="chart-modal" onClick={e => e.stopPropagation()}>
        <div className="chart-modal-header">
          <div>
            <h3>Fire Flow Analysis</h3>
            <span className="chart-modal-subtitle">
              CPHEEO: Q = 100 × sqrt(P in thousands) LPM
            </span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          {/* Configuration */}
          {!running && !summary && (
            <>
              <div className="ff-config">
                <div className="field-row">
                  <span className="field-label">Population (served)</span>
                  <input className="field-input" type="number" value={population}
                    onChange={e => setPopulation(parseInt(e.target.value) || 0)} />
                </div>
                <div className="ff-calc-row">
                  <div className="ff-calc-item">
                    <span className="ff-calc-label">Fire Demand</span>
                    <span className="ff-calc-value">{fireDemandLPM.toFixed(1)} LPM</span>
                    <span className="ff-calc-sub">{fireDemandLPS.toFixed(4)} LPS</span>
                  </div>
                  <div className="ff-calc-item">
                    <span className="ff-calc-label">Nodes to Test</span>
                    <span className="ff-calc-value">{model.junctions.length}</span>
                  </div>
                  <div className="ff-calc-item">
                    <span className="ff-calc-label">Pressure Floor</span>
                    <span className="ff-calc-value">{model.designCriteria.residualPressureFloor} m</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
                  Each junction tested individually: fire demand added → steady-state solve → check if
                  residual pressure stays above {model.designCriteria.residualPressureFloor}m.
                </div>

                <div className="import-actions" style={{ marginTop: 16 }}>
                  <button className="import-go-btn" onClick={runAnalysis}
                    disabled={!hasResults || model.junctions.length === 0}>
                    Run Fire Flow Analysis ({model.junctions.length} nodes)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Progress */}
          {running && (
            <div className="ff-progress">
              <div className="ff-progress-bar">
                <div className="ff-progress-fill" style={{
                  width: `${progress.total > 0 ? progress.current / progress.total * 100 : 0}%`
                }} />
              </div>
              <span className="ff-progress-text">
                Testing node {progress.current} of {progress.total}...
              </span>
            </div>
          )}

          {/* Results */}
          {summary && !running && (
            <>
              {/* Summary cards */}
              <div className="cal-stats-grid" style={{ marginBottom: 16 }}>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Adequate</span>
                  <span className="cal-stat-value" style={{ color: '#27ae60' }}>{summary.adequateCount}</span>
                  <span className="cal-stat-sub">of {summary.totalTested} nodes</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Deficient</span>
                  <span className="cal-stat-value" style={{ color: '#e74c3c' }}>{summary.totalTested - summary.adequateCount}</span>
                  <span className="cal-stat-sub">below {model.designCriteria.residualPressureFloor}m</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Fire Demand</span>
                  <span className="cal-stat-value">{fireDemandLPM.toFixed(0)}</span>
                  <span className="cal-stat-sub">LPM ({fireDemandLPS.toFixed(2)} LPS)</span>
                </div>
              </div>

              {/* Sort controls */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className={`chart-param-tab ${sortBy === 'residualPressure' ? 'active' : ''}`}
                  onClick={() => setSortBy('residualPressure')}>Sort by Pressure</button>
                <button className={`chart-param-tab ${sortBy === 'nodeId' ? 'active' : ''}`}
                  onClick={() => setSortBy('nodeId')}>Sort by Node</button>
              </div>

              {/* Results table */}
              <div className="cal-table-wrap" style={{ maxHeight: 400 }}>
                <table className="cal-table">
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Residual Pressure (m)</th>
                      <th>Min System Pressure (m)</th>
                      <th>Min @ Node</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map(r => (
                      <tr key={r.nodeId}>
                        <td style={{ fontWeight: 600 }}>{r.nodeId}</td>
                        <td style={{ color: r.adequate ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                          {r.residualPressure.toFixed(2)}
                        </td>
                        <td>{r.minSystemPressure.toFixed(2)}</td>
                        <td style={{ fontSize: 11, color: '#888' }}>{r.minPressureNode}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: r.adequate ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)',
                            color: r.adequate ? '#27ae60' : '#e74c3c',
                          }}>
                            {r.adequate ? 'ADEQUATE' : 'DEFICIENT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Re-run */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="import-back-btn" onClick={() => setSummary(null)}>
                  Re-configure
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
