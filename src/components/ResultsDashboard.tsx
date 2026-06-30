/**
 * Results dashboard — sortable tables, headline summary, NRW readout, tank-level trace.
 * All numbers come from the engine. Never fabricated.
 */
import { useState, useRef, useMemo } from 'react';
import { useNetworkStore } from '../store/networkStore';
import type { NodeResult, LinkResult } from '../engine/engine';

type SortKey = 'id' | 'pressure' | 'demand' | 'head' | 'flow' | 'velocity' | 'headloss';
type SortDir = 'asc' | 'desc';

export function ResultsDashboard() {
  const show = useNetworkStore(s => s.showResultsDashboard);
  const setShow = useNetworkStore(s => s.setShowResultsDashboard);
  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);
  const setEpsTimeIndex = useNetworkStore(s => s.setEpsTimeIndex);
  const selectElement = useNetworkStore(s => s.selectElement);

  const [nodeSort, setNodeSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'id', dir: 'asc' });
  const [linkSort, setLinkSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'id', dir: 'asc' });
  const [tab, setTab] = useState<'nodes' | 'links' | 'tanks' | 'nrw'>('nodes');
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!show) return null;

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = heightPx ?? containerRef.current?.offsetHeight ?? window.innerHeight * 0.45;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setHeightPx(Math.max(150, Math.min(window.innerHeight * 0.8, startHeight + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Get current timestep results
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

  const dc = model.designCriteria;
  const hasResults = nodeResults && linkResults;

  // Compute headline stats
  const junctionsPassing = model.junctions.filter(j => {
    const nr = nodeResults?.get(j.id);
    return nr && nr.pressure >= dc.residualPressureFloor;
  }).length;
  const totalJunctions = model.junctions.length;
  const passRate = totalJunctions > 0 ? (junctionsPassing / totalJunctions * 100).toFixed(1) : '—';

  const pipesInBand = model.pipes.filter(p => {
    const lr = linkResults?.get(p.id);
    if (!lr) return false;
    const v = Math.abs(lr.velocity);
    return v >= dc.velocityMin && v <= dc.velocityMax;
  }).length;

  // NRW calculation: total system input vs summed demand
  const totalDemand = model.junctions.reduce((sum, j) => {
    const nr = nodeResults?.get(j.id);
    return sum + (nr ? Math.abs(nr.demand) : 0);
  }, 0);

  const totalSystemInput = model.reservoirs.reduce((sum, r) => {
    const nr = nodeResults?.get(r.id);
    return sum + (nr ? Math.abs(nr.demand) : 0);
  }, 0);

  const nrwFraction = totalSystemInput > 0 ? (totalSystemInput - totalDemand) / totalSystemInput : 0;
  const nrwPercent = (nrwFraction * 100).toFixed(1);

  return (
    <div ref={containerRef} style={{
      position: 'absolute', bottom: 0, left: 52, right: 320,
      height: heightPx ? `${heightPx}px` : '45%',
      background: '#fff', borderTop: '2px solid #1a1a2e', zIndex: 15,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }} role="complementary" aria-label="Results dashboard">
      {/* Resize handle */}
      <div className="results-resize-handle" onMouseDown={handleResizeMouseDown} />
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 16px',
        borderBottom: '1px solid #e0e0e0', gap: 12, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Results Dashboard</span>

        {/* Headline summary */}
        {hasResults && (
          <div style={{ display: 'flex', gap: 16, fontSize: 12, flex: 1 }}>
            <span>
              Pressure: <strong style={{ color: parseInt(passRate) >= 90 ? '#27ae60' : '#e74c3c' }}>
                {passRate}%
              </strong> pass ({junctionsPassing}/{totalJunctions})
            </span>
            <span>
              Velocity: <strong>{pipesInBand}/{model.pipes.length}</strong> in band
            </span>
            <span>
              NRW: <strong style={{ color: nrwFraction <= dc.nrwTarget ? '#27ae60' : '#e74c3c' }}>
                {nrwPercent}%
              </strong>
              {nrwFraction > dc.nrwTarget ? ' — exceeds AMRUT target' : ' — within target'}
            </span>
          </div>
        )}

        {/* EPS time slider */}
        {epsResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: '#666' }}>
              Time: {formatTime(epsResult.timestamps[epsTimeIndex])}
            </span>
            <input type="range" min={0} max={epsResult.timestamps.length - 1}
              value={epsTimeIndex}
              onChange={e => setEpsTimeIndex(parseInt(e.target.value))}
              style={{ width: 150 }} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['nodes', 'links', 'tanks', 'nrw'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '4px 10px', border: 'none', borderRadius: 4,
                background: tab === t ? '#1a1a2e' : '#f0f0f0',
                color: tab === t ? '#fff' : '#333',
                cursor: 'pointer', fontSize: 12, textTransform: 'capitalize',
              }}>
              {t}
            </button>
          ))}
        </div>

        <button onClick={() => setShow(false)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 }}
          aria-label="Close results dashboard">×</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        {!hasResults && <div style={{ padding: 20, color: '#999' }}>Run Compute to see results.</div>}

        {hasResults && tab === 'nodes' && (
          <NodeTable
            junctions={model.junctions}
            nodeResults={nodeResults!}
            pressureFloor={dc.residualPressureFloor}
            sort={nodeSort}
            setSort={setNodeSort}
            onSelect={(id) => selectElement(id, 'junction')}
          />
        )}

        {hasResults && tab === 'links' && (
          <LinkTable
            pipes={model.pipes}
            linkResults={linkResults!}
            criteria={dc}
            sort={linkSort}
            setSort={setLinkSort}
            onSelect={(id) => selectElement(id, 'pipe')}
          />
        )}

        {hasResults && tab === 'tanks' && (
          <TankTrace
            tanks={model.tanks}
            epsResult={epsResult}
            solveResult={solveResult ? { nodeResults: solveResult.nodeResults } : null}
          />
        )}

        {hasResults && tab === 'nrw' && (
          <NRWPanel
            totalSystemInput={totalSystemInput}
            totalDemand={totalDemand}
            nrwFraction={nrwFraction}
            nrwTarget={dc.nrwTarget}
            nodeResults={nodeResults!}
            junctions={model.junctions}
            pressureFloor={dc.residualPressureFloor}
          />
        )}
      </div>
    </div>
  );
}

function NodeTable({ junctions, nodeResults, pressureFloor, sort, setSort, onSelect }: {
  junctions: { id: string }[];
  nodeResults: Map<string, NodeResult>;
  pressureFloor: number;
  sort: { key: SortKey; dir: SortDir };
  setSort: (s: { key: SortKey; dir: SortDir }) => void;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(() => {
    const data = junctions.map(j => {
      const nr = nodeResults.get(j.id);
      return { id: j.id, pressure: nr?.pressure ?? 0, head: nr?.head ?? 0, demand: nr?.demand ?? 0 };
    });
    data.sort((a, b) => {
      const key = sort.key as keyof typeof a;
      const av = a[key] as number | string;
      const bv = b[key] as number | string;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [junctions, nodeResults, sort]);

  const toggleSort = (key: SortKey) => {
    setSort({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #ddd', cursor: 'pointer' }}>
          <th style={thS} onClick={() => toggleSort('id')}>Node {sort.key === 'id' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</th>
          <th style={thS} onClick={() => toggleSort('pressure')}>Pressure (m) {sort.key === 'pressure' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</th>
          <th style={thS} onClick={() => toggleSort('head')}>Head (m)</th>
          <th style={thS} onClick={() => toggleSort('demand')}>Demand (LPS)</th>
          <th style={thS}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} onClick={() => onSelect(r.id)}
            style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
            <td style={tdS}>{r.id}</td>
            <td style={tdS}>{r.pressure.toFixed(2)}</td>
            <td style={tdS}>{r.head.toFixed(2)}</td>
            <td style={tdS}>{r.demand.toFixed(4)}</td>
            <td style={tdS}>
              <span className={`result-indicator ${r.pressure >= pressureFloor ? 'result-pass' : 'result-fail'}`}>
                {r.pressure >= pressureFloor ? 'PASS' : 'FAIL'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LinkTable({ pipes, linkResults, criteria, sort, setSort, onSelect }: {
  pipes: { id: string }[];
  linkResults: Map<string, LinkResult>;
  criteria: { velocityMin: number; velocityMax: number; velocityEconomicMin: number; velocityEconomicMax: number };
  sort: { key: SortKey; dir: SortDir };
  setSort: (s: { key: SortKey; dir: SortDir }) => void;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(() => {
    const data = pipes.map(p => {
      const lr = linkResults.get(p.id);
      return { id: p.id, flow: lr?.flow ?? 0, velocity: lr?.velocity ?? 0, headloss: lr?.headloss ?? 0 };
    });
    data.sort((a, b) => {
      const key = sort.key as keyof typeof a;
      const av = a[key] as number | string;
      const bv = b[key] as number | string;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [pipes, linkResults, sort]);

  const toggleSort = (key: SortKey) => {
    setSort({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' });
  };

  const velStatus = (v: number) => {
    const absV = Math.abs(v);
    if (absV >= criteria.velocityEconomicMin && absV <= criteria.velocityEconomicMax) return 'OPTIMAL';
    if (absV >= criteria.velocityMin && absV <= criteria.velocityMax) return 'OK';
    return 'FAIL';
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #ddd', cursor: 'pointer' }}>
          <th style={thS} onClick={() => toggleSort('id')}>Pipe</th>
          <th style={thS} onClick={() => toggleSort('flow')}>Flow (LPS)</th>
          <th style={thS} onClick={() => toggleSort('velocity')}>Velocity (m/s)</th>
          <th style={thS} onClick={() => toggleSort('headloss')}>Head Loss (m/km)</th>
          <th style={thS}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const st = velStatus(r.velocity);
          return (
            <tr key={r.id} onClick={() => onSelect(r.id)}
              style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
              <td style={tdS}>{r.id}</td>
              <td style={tdS}>{r.flow.toFixed(2)}</td>
              <td style={tdS}>{r.velocity.toFixed(3)}</td>
              <td style={tdS}>{r.headloss.toFixed(4)}</td>
              <td style={tdS}>
                <span className={`result-indicator ${st === 'FAIL' ? 'result-fail' : 'result-pass'}`}>{st}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TankTrace({ tanks, epsResult, solveResult }: {
  tanks: { id: string }[];
  epsResult: import('../engine/engine').EPSResults | null;
  solveResult: { nodeResults: Map<string, NodeResult> } | null;
}) {
  if (tanks.length === 0) return <div style={{ padding: 20, color: '#999' }}>No tanks in network.</div>;

  if (!epsResult) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: '#999' }}>Tank level traces require EPS simulation. Switch to 24-hour EPS mode.</p>
        {solveResult && tanks.map(t => {
          const nr = solveResult.nodeResults.get(t.id);
          return (
            <div key={t.id} style={{ marginTop: 8 }}>
              <strong>{t.id}:</strong> Level = {nr?.tankLevel?.toFixed(2) ?? '—'} m
            </div>
          );
        })}
      </div>
    );
  }

  // Draw tank level charts using simple canvas-like divs
  return (
    <div style={{ padding: 8 }}>
      {tanks.map(tank => (
        <TankChart key={tank.id} tankId={tank.id} epsResult={epsResult} />
      ))}
    </div>
  );
}

function TankChart({ tankId, epsResult }: {
  tankId: string;
  epsResult: import('../engine/engine').EPSResults;
}) {
  const levels = epsResult.timestamps.map(ts => {
    const nr = epsResult.nodeResults.get(ts)?.get(tankId);
    return nr?.tankLevel ?? 0;
  });

  const maxLevel = Math.max(...levels, 1);
  const chartWidth = 400;
  const chartHeight = 80;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
        Tank {tankId} — Level Trace
      </div>
      <svg width={chartWidth} height={chartHeight + 20} style={{ background: '#f7f8fa', borderRadius: 4 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={40} y1={chartHeight * (1 - f) + 5} x2={chartWidth} y2={chartHeight * (1 - f) + 5}
            stroke="#e0e0e0" strokeWidth={0.5} />
        ))}
        {/* Y axis labels */}
        {[0, 0.5, 1].map(f => (
          <text key={f} x={36} y={chartHeight * (1 - f) + 9} textAnchor="end" fontSize={9} fill="#999">
            {(maxLevel * f).toFixed(1)}
          </text>
        ))}
        {/* Level line */}
        <polyline
          fill="none" stroke="#3498db" strokeWidth={2}
          points={levels.map((l, i) => {
            const x = 40 + (i / Math.max(levels.length - 1, 1)) * (chartWidth - 45);
            const y = chartHeight - (l / maxLevel) * (chartHeight - 10) + 5;
            return `${x},${y}`;
          }).join(' ')}
        />
        {/* X axis labels */}
        {[0, 6, 12, 18, 24].map(h => {
          const idx = epsResult.timestamps.findIndex(ts => ts >= h * 3600);
          if (idx < 0) return null;
          const x = 40 + (idx / Math.max(levels.length - 1, 1)) * (chartWidth - 45);
          return <text key={h} x={x} y={chartHeight + 18} textAnchor="middle" fontSize={9} fill="#999">{h}h</text>;
        })}
      </svg>
    </div>
  );
}

function NRWPanel({ totalSystemInput, totalDemand, nrwFraction, nrwTarget, nodeResults, junctions, pressureFloor }: {
  totalSystemInput: number;
  totalDemand: number;
  nrwFraction: number;
  nrwTarget: number;
  nodeResults: Map<string, NodeResult>;
  junctions: { id: string }[];
  pressureFloor: number;
}) {
  // Identify high-pressure zones as leakage hotspots
  const highPressureNodes = junctions
    .map(j => ({ id: j.id, pressure: nodeResults.get(j.id)?.pressure ?? 0 }))
    .filter(n => n.pressure > pressureFloor * 1.5) // >50% above floor = excess head
    .sort((a, b) => b.pressure - a.pressure);

  return (
    <div style={{ padding: 12 }}>
      <h4 style={{ marginBottom: 12 }}>Water Balance / Non-Revenue Water</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 12, background: '#f7f8fa', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#666' }}>System Input</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalSystemInput.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: '#999' }}>LPS</div>
        </div>
        <div style={{ padding: 12, background: '#f7f8fa', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#666' }}>Summed Demand</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalDemand.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: '#999' }}>LPS</div>
        </div>
        <div style={{ padding: 12, background: nrwFraction <= nrwTarget ? '#d4edda' : '#f8d7da', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#666' }}>NRW</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{(nrwFraction * 100).toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: nrwFraction <= nrwTarget ? '#155724' : '#721c24' }}>
            Target: &lt;{(nrwTarget * 100).toFixed(0)}% (AMRUT 2.0)
          </div>
        </div>
      </div>

      {highPressureNodes.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 8 }}>Leakage Hotspots (excess head zones)</h4>
          <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
            Sustained high-pressure zones are leakage and NRW hotspots — excess head is lost water.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={thS}>Node</th>
                <th style={thS}>Pressure (m)</th>
                <th style={thS}>Excess above floor</th>
              </tr>
            </thead>
            <tbody>
              {highPressureNodes.slice(0, 10).map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdS}>{n.id}</td>
                  <td style={tdS}>{n.pressure.toFixed(2)}</td>
                  <td style={tdS}>{(n.pressure - pressureFloor).toFixed(2)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const thS: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' };
const tdS: React.CSSProperties = { padding: '4px 8px' };
