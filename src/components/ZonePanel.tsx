/**
 * Zone/DMA Panel — define zones, view per-zone stats, isolation analysis.
 */
import { useState, useCallback } from 'react';
import { useNetworkStore } from '../store/networkStore';
import {
  assignNodesToZones, computeZoneStats, findAffectedNodes, computeIsolationImpact,
  type Zone, type ZoneStats,
} from '../model/zoning';

const ZONE_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

export function ZonePanel({ onClose }: { onClose: () => void }) {
  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);

  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [isolationPipeId, setIsolationPipeId] = useState('');
  const [isolationResult, setIsolationResult] = useState<{ affected: string[]; demand: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'zones' | 'isolation'>('zones');

  // Get current results
  const getResults = useCallback(() => {
    if (solveResult) return solveResult;
    if (epsResult) {
      const ts = epsResult.timestamps[epsTimeIndex];
      return {
        nodeResults: epsResult.nodeResults.get(ts) || new Map(),
        linkResults: epsResult.linkResults.get(ts) || new Map(),
      };
    }
    return null;
  }, [solveResult, epsResult, epsTimeIndex]);

  const allJunctionIds = model.junctions.map(j => j.id);
  const allPipeIds = model.pipes.map(p => p.id);

  // Add zone
  const addZone = () => {
    const idx = zones.length;
    const newZone: Zone = {
      id: `Z${idx + 1}`,
      name: `Zone ${idx + 1}`,
      color: ZONE_COLORS[idx % ZONE_COLORS.length],
      nodeIds: [],
    };
    setZones([...zones, newZone]);
  };

  // Remove zone
  const removeZone = (idx: number) => {
    setZones(zones.filter((_, i) => i !== idx));
    setZoneStats([]);
  };

  // Toggle node in zone
  const toggleNodeInZone = (zoneIdx: number, nodeId: string) => {
    setZones(zones.map((z, i) => {
      if (i !== zoneIdx) {
        // Remove from other zones
        return { ...z, nodeIds: z.nodeIds.filter(n => n !== nodeId) };
      }
      // Toggle in this zone
      const has = z.nodeIds.includes(nodeId);
      return { ...z, nodeIds: has ? z.nodeIds.filter(n => n !== nodeId) : [...z.nodeIds, nodeId] };
    }));
  };

  // Compute zone stats
  const computeStats = () => {
    const results = getResults();
    if (!results) return;

    const assignment = assignNodesToZones(zones);
    const stats = zones.map(z => computeZoneStats(z, model, results, assignment));
    setZoneStats(stats);
  };

  // Run isolation
  const runIsolation = () => {
    if (!isolationPipeId) return;
    const sourceIds = [
      ...model.reservoirs.map(r => r.id),
      ...model.tanks.map(t => t.id),
    ];
    const affected = findAffectedNodes(model, isolationPipeId, sourceIds);
    const impact = computeIsolationImpact(affected, model);
    setIsolationResult({ affected, demand: impact.affectedDemand });
  };

  const hasResults = !!(solveResult || epsResult);

  return (
    <div className="chart-modal-backdrop" onClick={onClose}>
      <div className="chart-modal" onClick={e => e.stopPropagation()}>
        <div className="chart-modal-header">
          <div>
            <h3>DMA / Network Zones</h3>
            <span className="chart-modal-subtitle">District Metered Areas & Isolation Analysis</span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Tabs */}
        <div className="chart-param-tabs">
          <button className={`chart-param-tab ${activeTab === 'zones' ? 'active' : ''}`}
            onClick={() => setActiveTab('zones')}>Zones</button>
          <button className={`chart-param-tab ${activeTab === 'isolation' ? 'active' : ''}`}
            onClick={() => setActiveTab('isolation')}>Isolation Analysis</button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          {/* ─── Zones Tab ─── */}
          {activeTab === 'zones' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#888' }}>{zones.length} zones defined</span>
                <button className="import-go-btn" style={{ padding: '4px 14px', fontSize: 11 }} onClick={addZone}>
                  + Add Zone
                </button>
              </div>

              {zones.map((zone, zi) => (
                <div key={zone.id} style={{
                  border: '1px solid #e8e8e8', borderRadius: 8, padding: 10, marginBottom: 8,
                  borderLeft: `4px solid ${zone.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <input style={{ border: 'none', fontWeight: 600, fontSize: 13, color: '#333', background: 'transparent', outline: 'none' }}
                      value={zone.name}
                      onChange={e => setZones(zones.map((z, i) => i === zi ? { ...z, name: e.target.value } : z))} />
                    <button onClick={() => removeZone(zi)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {allJunctionIds.map(nodeId => {
                      const inZone = zone.nodeIds.includes(nodeId);
                      return (
                        <button key={nodeId} onClick={() => toggleNodeInZone(zi, nodeId)}
                          style={{
                            padding: '2px 6px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                            border: inZone ? `1px solid ${zone.color}` : '1px solid #ddd',
                            background: inZone ? `${zone.color}22` : '#fff',
                            color: inZone ? zone.color : '#999',
                            fontWeight: inZone ? 700 : 400,
                          }}>
                          {nodeId}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
                    {zone.nodeIds.length} nodes selected
                  </div>
                </div>
              ))}

              {zones.length > 0 && hasResults && (
                <button className="import-go-btn" style={{ width: '100%', marginTop: 8 }} onClick={computeStats}>
                  Compute Zone Statistics
                </button>
              )}

              {/* Zone stats table */}
              {zoneStats.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="cal-table-wrap">
                    <table className="cal-table">
                      <thead>
                        <tr>
                          <th>Zone</th>
                          <th>Nodes</th>
                          <th>Demand (LPS)</th>
                          <th>Inflow (LPS)</th>
                          <th>NRW %</th>
                          <th>Boundary Pipes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneStats.map((s, i) => (
                          <tr key={s.zoneId}>
                            <td style={{ fontWeight: 600, color: zones[i]?.color }}>{zones[i]?.name || s.zoneId}</td>
                            <td>{s.nodeCount}</td>
                            <td>{s.totalDemand.toFixed(3)}</td>
                            <td>{s.inflow.toFixed(3)}</td>
                            <td style={{ color: s.nrwPct > 20 ? '#e74c3c' : '#27ae60', fontWeight: 600 }}>
                              {s.nrwPct.toFixed(1)}%
                            </td>
                            <td style={{ fontSize: 10 }}>{s.boundaryPipes.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Isolation Tab ─── */}
          {activeTab === 'isolation' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div className="field-row">
                  <span className="field-label">Close Pipe</span>
                  <select className="field-select" value={isolationPipeId}
                    onChange={e => { setIsolationPipeId(e.target.value); setIsolationResult(null); }}>
                    <option value="">— select pipe —</option>
                    {allPipeIds.map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
                <button className="import-go-btn" style={{ width: '100%', marginTop: 8 }}
                  onClick={runIsolation} disabled={!isolationPipeId}>
                  Analyze Isolation Impact
                </button>
              </div>

              {isolationResult && (
                <div style={{ marginTop: 8 }}>
                  <div className="cal-stats-grid">
                    <div className="cal-stat-card">
                      <span className="cal-stat-label">Affected Nodes</span>
                      <span className="cal-stat-value" style={{ color: isolationResult.affected.length > 0 ? '#e74c3c' : '#27ae60' }}>
                        {isolationResult.affected.length}
                      </span>
                    </div>
                    <div className="cal-stat-card">
                      <span className="cal-stat-label">Lost Demand</span>
                      <span className="cal-stat-value">{isolationResult.demand.toFixed(4)}</span>
                      <span className="cal-stat-sub">LPS</span>
                    </div>
                    <div className="cal-stat-card">
                      <span className="cal-stat-label">Pipe Closed</span>
                      <span className="cal-stat-value" style={{ fontSize: 14 }}>{isolationPipeId}</span>
                    </div>
                  </div>

                  {isolationResult.affected.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      <h4 style={{ fontSize: 12, color: '#e74c3c', marginBottom: 4 }}>Disconnected Nodes</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {isolationResult.affected.map(id => (
                          <span key={id} style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: 'rgba(231,76,60,0.1)', color: '#e74c3c',
                          }}>{id}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: 'rgba(39,174,96,0.08)', color: '#27ae60', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                      No nodes disconnected — network has redundant paths
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
