/**
 * SCADA panel — connect mock adapter, show live readings,
 * measured-vs-modelled comparison.
 */
import { useState, useRef, useCallback } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { MockScadaAdapter } from '../engine/scadaAdapter';
import { generateMockTelemetry, parseTelemetryCsv } from '../engine/telemetry';
import type { TelemetryReading } from '../engine/telemetry';

const adapterRef: { current: MockScadaAdapter | null } = { current: null };

export function ScadaIndicator() {
  const connected = useNetworkStore(s => s.scadaConnected);
  const readingsCount = useNetworkStore(s => s.scadaReadings.length);
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <button
        className="top-bar-dropdown-item"
        onClick={() => setShowPanel(!showPanel)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        title={connected ? `SCADA connected (${readingsCount} readings)` : 'SCADA disconnected'}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? '#27ae60' : '#ccc',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        SCADA {connected ? `(${readingsCount})` : ''}
      </button>
      {showPanel && <ScadaPanel onClose={() => setShowPanel(false)} />}
    </>
  );
}

function ScadaPanel({ onClose }: { onClose: () => void }) {
  const connected = useNetworkStore(s => s.scadaConnected);
  const readings = useNetworkStore(s => s.scadaReadings);
  const telemetryData = useNetworkStore(s => s.telemetryData);
  const solveResult = useNetworkStore(s => s.solveResult);
  const model = useNetworkStore(s => s.model);
  const setScadaConnected = useNetworkStore(s => s.setScadaConnected);
  const loadTelemetry = useNetworkStore(s => s.loadTelemetry);
  const clearTelemetry = useNetworkStore(s => s.clearTelemetry);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectMock = useCallback(() => {
    if (!solveResult) return;

    // Build modelled pressures map from latest solve
    const modelledPressures = new Map<string, number>();
    for (const j of model.junctions) {
      const nr = solveResult.nodeResults.get(j.id);
      if (nr) modelledPressures.set(j.id, nr.pressure);
    }

    const adapter = new MockScadaAdapter();
    adapter.onReading((reading: TelemetryReading) => {
      useNetworkStore.getState().addScadaReading(reading);
    });

    adapter.connect({
      endpoint: 'mock://',
      stationIds: [...modelledPressures.keys()].slice(0, 10), // monitor first 10 nodes
      pollIntervalMs: 2000,
      modelledPressures,
    });

    adapterRef.current = adapter;
    setScadaConnected(true);
  }, [solveResult, model.junctions, setScadaConnected]);

  const disconnect = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.disconnect();
      adapterRef.current = null;
    }
    setScadaConnected(false);
  }, [setScadaConnected]);

  const generateMock = useCallback(() => {
    if (!solveResult) return;
    const modelledPressures = new Map<string, number>();
    for (const j of model.junctions) {
      const nr = solveResult.nodeResults.get(j.id);
      if (nr) modelledPressures.set(j.id, nr.pressure);
    }
    const dataset = generateMockTelemetry(modelledPressures, 0.6);
    loadTelemetry(dataset);
  }, [solveResult, model.junctions, loadTelemetry]);

  const handleCsvImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = reader.result as string;
      const dataset = parseTelemetryCsv(csv);
      loadTelemetry(dataset);
    };
    reader.readAsText(file);
  }, [loadTelemetry]);

  // Build comparison data
  const comparisonRows = telemetryData ? buildComparison(telemetryData.readings, solveResult) : [];
  const liveRows = readings.slice(-20).reverse();

  return (
    <div style={{
      position: 'absolute', top: 50, right: 330, width: 420,
      background: '#fff', border: '1px solid #ddd', borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 25,
      maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #eee',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>SCADA / Telemetry</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 }}>x</button>
      </div>

      <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
        {/* Connection controls */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Live SCADA (Mock)</div>
          {!solveResult && (
            <div style={{ fontSize: 11, color: '#e74c3c' }}>Run Compute first to enable SCADA.</div>
          )}
          {solveResult && !connected && (
            <button onClick={connectMock} style={btnStyle}>Connect Mock SCADA</button>
          )}
          {connected && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 600 }}>Connected — {readings.length} readings</span>
              <button onClick={disconnect} style={{ ...btnStyle, borderColor: '#e74c3c', color: '#e74c3c' }}>Disconnect</button>
            </div>
          )}
        </div>

        {/* Import controls */}
        <div style={{ marginBottom: 12, display: 'flex', gap: 6 }}>
          <button onClick={generateMock} disabled={!solveResult} style={btnStyle}>Generate Mock Telemetry</button>
          <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>Import CSV</button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
          {telemetryData && (
            <button onClick={clearTelemetry} style={{ ...btnStyle, borderColor: '#e74c3c', color: '#e74c3c' }}>Clear</button>
          )}
        </div>

        {/* Telemetry info */}
        {telemetryData && (
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
            Source: {telemetryData.source} | {telemetryData.readings.length} readings | {telemetryData.importedAt.slice(0, 19)}
          </div>
        )}

        {/* Measured vs Modelled comparison */}
        {comparisonRows.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Measured vs Modelled</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={thS}>Node</th>
                  <th style={thS}>Modelled (m)</th>
                  <th style={thS}>Measured (m)</th>
                  <th style={thS}>Delta</th>
                  <th style={thS}>% Error</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(r => (
                  <tr key={r.nodeId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={tdS}>{r.nodeId}</td>
                    <td style={tdS}>{r.modelled.toFixed(1)}</td>
                    <td style={tdS}>{r.measured.toFixed(1)}</td>
                    <td style={{ ...tdS, color: Math.abs(r.delta) > 2 ? '#e74c3c' : '#27ae60' }}>
                      {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}
                    </td>
                    <td style={{ ...tdS, color: Math.abs(r.pctError) > 10 ? '#e74c3c' : '#27ae60' }}>
                      {r.pctError.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Live SCADA readings */}
        {liveRows.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Live Readings (last 20)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={thS}>Time</th>
                  <th style={thS}>Node</th>
                  <th style={thS}>Pressure (m)</th>
                </tr>
              </thead>
              <tbody>
                {liveRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={tdS}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                    <td style={tdS}>{r.nodeId}</td>
                    <td style={tdS}>{r.pressure?.toFixed(1) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!telemetryData && liveRows.length === 0 && (
          <div style={{ fontSize: 12, color: '#999', padding: 16, textAlign: 'center' }}>
            No telemetry data. Generate mock data or connect SCADA to see measured-vs-modelled comparison.
          </div>
        )}
      </div>
    </div>
  );
}

interface ComparisonRow {
  nodeId: string;
  modelled: number;
  measured: number;
  delta: number;
  pctError: number;
}

function buildComparison(
  readings: TelemetryReading[],
  solveResult: { nodeResults: Map<string, { pressure: number }> } | null,
): ComparisonRow[] {
  if (!solveResult) return [];

  // Group readings by nodeId, take latest pressure
  const latestByNode = new Map<string, number>();
  for (const r of readings) {
    if (r.pressure !== undefined) latestByNode.set(r.nodeId, r.pressure);
  }

  const rows: ComparisonRow[] = [];
  for (const [nodeId, measured] of latestByNode) {
    const nr = solveResult.nodeResults.get(nodeId);
    if (!nr) continue;
    const modelled = nr.pressure;
    const delta = measured - modelled;
    const pctError = modelled !== 0 ? (delta / modelled) * 100 : 0;
    rows.push({ nodeId, modelled, measured, delta, pctError });
  }

  return rows.sort((a, b) => Math.abs(b.pctError) - Math.abs(a.pctError));
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', border: '1px solid #3a5fcf', borderRadius: 4,
  background: '#fff', color: '#3a5fcf', cursor: 'pointer', fontSize: 11,
};

const thS: React.CSSProperties = { textAlign: 'left', padding: '4px 6px', fontWeight: 600 };
const tdS: React.CSSProperties = { padding: '3px 6px' };
