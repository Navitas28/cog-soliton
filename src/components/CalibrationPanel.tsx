/**
 * Calibration Panel — upload field measurements, compare model vs measured,
 * visualize with scatter plot and stats.
 */
import { useState, useCallback, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useNetworkStore } from '../store/networkStore';
import {
  parseFieldCsv, matchFieldToModel, computeCalibrationStats,
  type FieldReading, type MatchedPair, type CalibrationStats,
} from '../engine/calibration';

export function CalibrationPanel({ onClose }: { onClose: () => void }) {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, true);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);

  const [fieldReadings, setFieldReadings] = useState<FieldReading[]>([]);
  const [matched, setMatched] = useState<MatchedPair[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [stats, setStats] = useState<CalibrationStats | null>(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current node results
  const getNodeResults = useCallback(() => {
    if (solveResult) return solveResult.nodeResults;
    if (epsResult) {
      const ts = epsResult.timestamps[epsTimeIndex];
      return epsResult.nodeResults.get(ts);
    }
    return undefined;
  }, [solveResult, epsResult, epsTimeIndex]);

  // Handle CSV upload
  const handleFile = useCallback(async (file: File) => {
    setError('');
    try {
      const text = await file.text();
      const readings = parseFieldCsv(text);
      if (readings.length === 0) {
        setError('No valid readings found. CSV must have columns: node_id, measured_pressure');
        return;
      }
      setFieldReadings(readings);

      const nodeResults = getNodeResults();
      if (!nodeResults) {
        setError('No model results available. Run Compute first.');
        return;
      }

      const result = matchFieldToModel(readings, nodeResults);
      setMatched(result.matched);
      setUnmatched(result.unmatched);
      setStats(computeCalibrationStats(result.matched));
    } catch (e) {
      setError(`Failed to parse CSV: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [getNodeResults]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const hasResults = !!(solveResult || epsResult);

  // Scatter data for recharts
  const scatterData = matched.map(m => ({
    measured: parseFloat(m.measured.toFixed(2)),
    modelled: parseFloat(m.modelled.toFixed(2)),
    nodeId: m.nodeId,
  }));

  // 1:1 line range
  const allValues = [...matched.map(m => m.measured), ...matched.map(m => m.modelled)];
  const minVal = allValues.length > 0 ? Math.min(...allValues) - 2 : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) + 2 : 50;

  return (
    <div ref={trapRef} className="chart-modal-backdrop" onClick={onClose}>
      <div className="chart-modal" onClick={e => e.stopPropagation()}>
        <div className="chart-modal-header">
          <div>
            <h3>Model Calibration</h3>
            <span className="chart-modal-subtitle">Compare model predictions vs field measurements</span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          {!hasResults && (
            <div className="chart-empty-state">
              <p>No model results available</p>
              <p>Run Compute first, then upload field measurements.</p>
            </div>
          )}

          {hasResults && matched.length === 0 && (
            <>
              {/* Upload zone */}
              <div
                className={`import-dropzone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ maxHeight: 160 }}
              >
                <div className="import-dropzone-icon">
                  <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
                    <path d="M24 8v24M24 8l-8 8M24 8l8 8M8 36v4h32v-4" stroke="#3a5fcf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="import-dropzone-title">Upload Field Measurements (CSV)</p>
                <p className="import-dropzone-sub">Columns: node_id, measured_pressure</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              {error && <div className="import-error">{error}</div>}

              <div className="import-help" style={{ marginTop: 12 }}>
                <h4>CSV Format Example</h4>
                <pre style={{ background: '#f5f6f8', padding: 12, borderRadius: 8, fontSize: 12 }}>
{`node_id,measured_pressure
N1,18.5
N2,12.3
G1,21.0
C1,15.8`}
                </pre>
              </div>
            </>
          )}

          {/* Results */}
          {stats && matched.length > 0 && (
            <>
              {/* Stats cards */}
              <div className="cal-stats-grid">
                <div className="cal-stat-card">
                  <span className="cal-stat-label">RMSE</span>
                  <span className="cal-stat-value">{stats.rmse.toFixed(2)} m</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">R²</span>
                  <span className="cal-stat-value" style={{ color: stats.r2 >= 0.9 ? '#27ae60' : stats.r2 >= 0.7 ? '#f39c12' : '#e74c3c' }}>
                    {stats.r2.toFixed(4)}
                  </span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">MAE</span>
                  <span className="cal-stat-value">{stats.mae.toFixed(2)} m</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Max Error</span>
                  <span className="cal-stat-value">{stats.maxError.toFixed(2)} m</span>
                  <span className="cal-stat-sub">@ {stats.maxErrorNode}</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Bias</span>
                  <span className="cal-stat-value">{stats.meanError > 0 ? '+' : ''}{stats.meanError.toFixed(2)} m</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Matched</span>
                  <span className="cal-stat-value">{stats.count}/{fieldReadings.length}</span>
                </div>
              </div>

              {/* Scatter plot */}
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>
                  Modelled vs Measured Pressure
                </h4>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis
                      dataKey="measured"
                      type="number"
                      domain={[minVal, maxVal]}
                      tick={{ fontSize: 11, fill: '#888' }}
                      label={{ value: 'Measured Pressure (m)', position: 'bottom', offset: 5, fontSize: 11, fill: '#999' }}
                    />
                    <YAxis
                      dataKey="modelled"
                      type="number"
                      domain={[minVal, maxVal]}
                      tick={{ fontSize: 11, fill: '#888' }}
                      label={{ value: 'Modelled Pressure (m)', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#999' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.96)', border: '1px solid #e0e0e0',
                        borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12,
                      }}
                      formatter={(value: unknown, name: unknown) => [`${Number(value).toFixed(2)} m`, String(name)]}
                      labelFormatter={() => ''}
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const d = payload[0]?.payload as typeof scatterData[0] | undefined;
                        if (!d) return null;
                        return (
                          <div style={{
                            background: 'rgba(255,255,255,0.96)', border: '1px solid #e0e0e0',
                            borderRadius: 8, padding: '8px 12px', fontSize: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.nodeId}</div>
                            <div>Measured: {d.measured} m</div>
                            <div>Modelled: {d.modelled} m</div>
                            <div style={{ color: '#e85d75' }}>Error: {Math.abs(d.modelled - d.measured).toFixed(2)} m</div>
                          </div>
                        );
                      }}
                    />
                    {/* 1:1 reference line */}
                    <ReferenceLine
                      segment={[{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]}
                      stroke="#27ae60"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                    />
                    <Scatter
                      data={scatterData}
                      fill="#3a5fcf"
                      fillOpacity={0.7}
                      r={5}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center' }}>
                  Green dashed line = perfect calibration (1:1). Points closer to line = better model fit.
                </p>
              </div>

              {/* Comparison table */}
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>
                  Node-by-Node Comparison
                </h4>
                <div className="cal-table-wrap">
                  <table className="cal-table">
                    <thead>
                      <tr>
                        <th>Node</th>
                        <th>Modelled (m)</th>
                        <th>Measured (m)</th>
                        <th>Error (m)</th>
                        <th>% Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matched.sort((a, b) => b.error - a.error).map(m => (
                        <tr key={m.nodeId}>
                          <td style={{ fontWeight: 600 }}>{m.nodeId}</td>
                          <td>{m.modelled.toFixed(2)}</td>
                          <td>{m.measured.toFixed(2)}</td>
                          <td style={{ color: m.error > 5 ? '#e74c3c' : m.error > 2 ? '#f39c12' : '#27ae60', fontWeight: 600 }}>
                            {m.error.toFixed(2)}
                          </td>
                          <td>{m.measured !== 0 ? (m.error / Math.abs(m.measured) * 100).toFixed(1) : '—'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unmatched warnings */}
              {unmatched.length > 0 && (
                <div className="import-warnings" style={{ marginTop: 12 }}>
                  <div className="import-warning">
                    {unmatched.length} field reading(s) not matched to model: {unmatched.join(', ')}
                  </div>
                </div>
              )}

              {/* Re-upload */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button className="import-back-btn" onClick={() => { setMatched([]); setStats(null); setFieldReadings([]); }}>
                  Upload Different CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
