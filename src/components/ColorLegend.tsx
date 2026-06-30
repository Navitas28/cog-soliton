import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';

export interface LegendRange {
  min: number;
  max: number;
}

export function computePressureRange(
  model: { junctions: { id: string }[] },
  getNodeResult: (id: string) => { pressure: number } | undefined,
): LegendRange {
  let min = Infinity;
  let max = -Infinity;
  for (const j of model.junctions) {
    const nr = getNodeResult(j.id);
    if (!nr) continue;
    if (nr.pressure < min) min = nr.pressure;
    if (nr.pressure > max) max = nr.pressure;
  }
  if (min === Infinity) return { min: 0, max: 40 };
  return { min: Math.floor(min), max: Math.ceil(max) };
}

export function computeFlowRange(
  pipes: { id: string }[],
  getLinkResult: (id: string) => { flow: number } | undefined,
): LegendRange {
  let min = 0;
  let max = 0;
  for (const p of pipes) {
    const lr = getLinkResult(p.id);
    if (!lr) continue;
    const absFlow = Math.abs(lr.flow);
    if (absFlow > max) max = absFlow;
  }
  return { min, max: max > 0 ? Math.ceil(max) : 10 };
}

/** Design-view map legend — explains node/pipe colors and symbols */
export function MapLegend({ colorMode = 'velocity' }: { colorMode?: 'velocity' | 'diameter' }) {
  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const [collapsed, setCollapsed] = useState(false);

  const dc = model.designCriteria;
  const hasResults = !!(solveResult || epsResult);

  return (
    <div className="map-legend">
      <button className="map-legend-toggle" onClick={() => setCollapsed(!collapsed)}>
        Legend {collapsed ? '▸' : '▾'}
      </button>
      {!collapsed && (
        <div className="map-legend-body">
          <div className="map-legend-section">
            <div className="map-legend-section-title">Nodes</div>
            <div className="map-legend-row">
              <span className="map-legend-swatch" style={{ background: '#2980b9' }} />
              <span>Reservoir</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-swatch" style={{ background: '#8e44ad' }} />
              <span>Tank</span>
            </div>
            {hasResults ? (
              <>
                <div className="map-legend-row">
                  <span className="map-legend-swatch" style={{ background: '#2ecc71' }} />
                  <span>Junction — pass ({'\u2265'}{dc.residualPressureFloor}m)</span>
                </div>
                <div className="map-legend-row">
                  <span className="map-legend-swatch" style={{ background: '#e74c3c' }} />
                  <span>Junction — fail ({'<'}{dc.residualPressureFloor}m)</span>
                </div>
              </>
            ) : (
              <div className="map-legend-row">
                <span className="map-legend-swatch" style={{ background: '#34495e' }} />
                <span>Junction (no results)</span>
              </div>
            )}
          </div>

          {hasResults && colorMode === 'velocity' && (
            <div className="map-legend-section">
              <div className="map-legend-section-title">Pipes — Velocity</div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#2ecc71' }} />
                <span>Optimal ({dc.velocityEconomicMin}–{dc.velocityEconomicMax} m/s)</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#f39c12' }} />
                <span>OK ({dc.velocityMin}–{dc.velocityMax} m/s)</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#e74c3c' }} />
                <span>Fail (outside band)</span>
              </div>
            </div>
          )}

          {colorMode === 'diameter' && (
            <div className="map-legend-section">
              <div className="map-legend-section-title">Pipes — Diameter</div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#2ecc71' }} />
                <span>100 mm</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#e74c3c' }} />
                <span>150 mm</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#3498db' }} />
                <span>200 mm</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#e67e22' }} />
                <span>250 mm</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#8e44ad' }} />
                <span>300 mm</span>
              </div>
              <div className="map-legend-row">
                <span className="map-legend-line" style={{ background: '#2c3e50' }} />
                <span>350+ mm</span>
              </div>
            </div>
          )}

          <div className="map-legend-section">
            <div className="map-legend-section-title">Special</div>
            <div className="map-legend-row">
              <span className="map-legend-line" style={{ background: '#3498db' }} />
              <span>Pipe (default)</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-line map-legend-line--dashed" />
              <span>Closed pipe</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-line" style={{ background: '#e67e22' }} />
              <span>Pump</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-line" style={{ background: '#9b59b6' }} />
              <span>Valve</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-ring" />
              <span>Monitored (SCADA)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Digital Twin view gradient legend */
export function ColorLegend() {
  const model = useNetworkStore(s => s.model);
  const getNodeResult = useNetworkStore(s => s.getNodeResultAtTime);
  const getLinkResult = useNetworkStore(s => s.getLinkResultAtTime);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);

  if (!solveResult && !epsResult) return null;

  const pressureRange = computePressureRange(model, getNodeResult);
  const flowRange = computeFlowRange(model.pipes, getLinkResult);

  return (
    <div className="color-legend">
      <div className="legend-item">
        <div className="legend-title">Junction Pressure (m)</div>
        <div
          className="legend-bar"
          style={{
            background: 'linear-gradient(to right, #8b0000, #e74c3c, #e67e22, #f1c40f, #2ecc71)',
          }}
        />
        <div className="legend-labels">
          <span>{pressureRange.min}</span>
          <span>{Math.round((pressureRange.min + pressureRange.max) / 2)}</span>
          <span>{pressureRange.max}</span>
        </div>
      </div>
      <div className="legend-item">
        <div className="legend-title">Pipe Flow (LPS)</div>
        <div
          className="legend-bar"
          style={{
            background: 'linear-gradient(to right, #d6eaf8, #5dade2, #2471a3, #1a5276)',
          }}
        />
        <div className="legend-labels">
          <span>{flowRange.min}</span>
          <span>{Math.round(flowRange.max / 2)}</span>
          <span>{flowRange.max}</span>
        </div>
      </div>
    </div>
  );
}
