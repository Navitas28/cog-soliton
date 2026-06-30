/**
 * Criticality Panel — bulk pipe-break analysis with resilience score.
 */
import { useState, useCallback } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { serializeToInp } from '../model/serializer';
import {
  runCriticalityAnalysis,
  type CriticalitySummary,
} from '../engine/criticality';

export function CriticalityPanel({ onClose }: { onClose: () => void }) {
  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState<CriticalitySummary | null>(null);

  const hasResults = !!(solveResult || epsResult);

  const getBaselinePressures = useCallback((): Map<string, number> => {
    const pressures = new Map<string, number>();
    let nodeResults: Map<string, { pressure: number }> | undefined;

    if (solveResult) {
      nodeResults = solveResult.nodeResults;
    } else if (epsResult) {
      const ts = epsResult.timestamps[epsTimeIndex];
      nodeResults = epsResult.nodeResults.get(ts);
    }

    if (nodeResults) {
      for (const [id, nr] of nodeResults.entries()) {
        pressures.set(id, nr.pressure);
      }
    }
    return pressures;
  }, [solveResult, epsResult, epsTimeIndex]);

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setSummary(null);

    const inp = serializeToInp(model);
    const pipeIds = model.pipes.map(p => p.id);
    const baseline = getBaselinePressures();

    const result = await runCriticalityAnalysis(
      inp, pipeIds, baseline,
      model.designCriteria.residualPressureFloor,
      (current, total) => setProgress({ current, total }),
    );

    setSummary(result);
    setRunning(false);
  }, [model, getBaselinePressures]);

  return (
    <div className="chart-modal-backdrop" onClick={onClose}>
      <div className="chart-modal" onClick={e => e.stopPropagation()}>
        <div className="chart-modal-header">
          <div>
            <h3>Criticality Analysis</h3>
            <span className="chart-modal-subtitle">
              Pipe-break what-if analysis — rank pipes by failure impact
            </span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          {/* Config */}
          {!running && !summary && (
            <div>
              <div className="ff-calc-row">
                <div className="ff-calc-item">
                  <span className="ff-calc-label">Pipes to Test</span>
                  <span className="ff-calc-value">{model.pipes.length}</span>
                </div>
                <div className="ff-calc-item">
                  <span className="ff-calc-label">Pressure Floor</span>
                  <span className="ff-calc-value">{model.designCriteria.residualPressureFloor} m</span>
                </div>
                <div className="ff-calc-item">
                  <span className="ff-calc-label">Method</span>
                  <span className="ff-calc-value" style={{ fontSize: 12 }}>N-1</span>
                  <span className="ff-calc-sub">Close one at a time</span>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#888', margin: '12px 0', lineHeight: 1.6 }}>
                Each pipe closed individually → steady-state solve → compare pressures to baseline.
                Pipes ranked by severity of impact.
              </div>

              <button className="import-go-btn" style={{ width: '100%' }}
                onClick={runAnalysis} disabled={!hasResults || model.pipes.length === 0}>
                Run Criticality Analysis ({model.pipes.length} pipes)
              </button>
            </div>
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
                Testing pipe {progress.current} of {progress.total}...
              </span>
            </div>
          )}

          {/* Results */}
          {summary && !running && (
            <>
              {/* Summary */}
              <div className="cal-stats-grid" style={{ marginBottom: 16 }}>
                <div className="cal-stat-card" style={{ borderTop: `3px solid ${summary.resilienceScore >= 80 ? '#27ae60' : summary.resilienceScore >= 50 ? '#f39c12' : '#e74c3c'}` }}>
                  <span className="cal-stat-label">Resilience Score</span>
                  <span className="cal-stat-value" style={{
                    color: summary.resilienceScore >= 80 ? '#27ae60' : summary.resilienceScore >= 50 ? '#f39c12' : '#e74c3c'
                  }}>
                    {summary.resilienceScore}%
                  </span>
                  <span className="cal-stat-sub">pipes that can fail safely</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Critical Pipes</span>
                  <span className="cal-stat-value" style={{ color: '#e74c3c' }}>
                    {summary.impacts.filter(i => i.nodesAffected > 0).length}
                  </span>
                  <span className="cal-stat-sub">cause pressure violations</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Safe Pipes</span>
                  <span className="cal-stat-value" style={{ color: '#27ae60' }}>
                    {summary.impacts.filter(i => i.nodesAffected === 0 && !i.solveFailed).length}
                  </span>
                  <span className="cal-stat-sub">no impact on compliance</span>
                </div>
              </div>

              {/* Results table */}
              <div className="cal-table-wrap" style={{ maxHeight: 400 }}>
                <table className="cal-table">
                  <thead>
                    <tr>
                      <th>Pipe</th>
                      <th>Nodes Affected</th>
                      <th>Avg Drop (m)</th>
                      <th>Max Drop (m)</th>
                      <th>Worst Node</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.impacts.map(imp => {
                      const severity = imp.solveFailed ? 'FATAL' : imp.nodesAffected > 3 ? 'CRITICAL' : imp.nodesAffected > 0 ? 'HIGH' : imp.avgPressureDrop > 2 ? 'MODERATE' : 'LOW';
                      const sevColor = severity === 'FATAL' || severity === 'CRITICAL' ? '#e74c3c' : severity === 'HIGH' ? '#e67e22' : severity === 'MODERATE' ? '#f39c12' : '#27ae60';

                      return (
                        <tr key={imp.pipeId}>
                          <td style={{ fontWeight: 600 }}>{imp.pipeId}</td>
                          <td style={{ color: imp.nodesAffected > 0 ? '#e74c3c' : '#27ae60', fontWeight: 600 }}>
                            {imp.solveFailed ? 'N/A' : imp.nodesAffected}
                          </td>
                          <td>{imp.solveFailed ? '—' : imp.avgPressureDrop.toFixed(2)}</td>
                          <td>{imp.solveFailed ? '—' : imp.maxPressureDrop.toFixed(2)}</td>
                          <td style={{ fontSize: 11, color: '#888' }}>{imp.maxDropNode || '—'}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: `${sevColor}18`, color: sevColor,
                            }}>
                              {severity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="import-back-btn" onClick={() => setSummary(null)}>
                  Re-run
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
