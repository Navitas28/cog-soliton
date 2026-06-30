import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { getCostPerMeter, MATERIAL_LABELS } from '../data/pipeCosts';
import type { PipeMaterial } from '../model/types';
import { Sparkline, TimeSeriesModal } from './TimeSeriesChart';
import { extractNodeSeries, extractLinkSeries } from '../model/timeSeries';
import type { NodeSeriesParam, LinkSeriesParam } from '../model/timeSeries';

export function PropertiesPanel() {
  const [chartModal, setChartModal] = useState<{
    elementId: string;
    elementType: 'node' | 'link';
    param: NodeSeriesParam | LinkSeriesParam;
    label: string;
    unit: string;
  } | null>(null);

  const selectedId = useNetworkStore(s => s.selectedElementId);
  const selectedType = useNetworkStore(s => s.selectedElementType);
  const model = useNetworkStore(s => s.model);
  const getNodeResultAtTime = useNetworkStore(s => s.getNodeResultAtTime);
  const getLinkResultAtTime = useNetworkStore(s => s.getLinkResultAtTime);
  const updateJunction = useNetworkStore(s => s.updateJunction);
  const updateReservoir = useNetworkStore(s => s.updateReservoir);
  const updatePipe = useNetworkStore(s => s.updatePipe);
  const updateTank = useNetworkStore(s => s.updateTank);
  const updatePump = useNetworkStore(s => s.updatePump);
  const updateValve = useNetworkStore(s => s.updateValve);
  const deleteElement = useNetworkStore(s => s.deleteElement);

  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const getNodeResultAtTimeForCount = useNetworkStore(s => s.getNodeResultAtTime);
  const getLinkResultAtTimeForCount = useNetworkStore(s => s.getLinkResultAtTime);

  if (!selectedId || !selectedType) {
    const dc = model.designCriteria;
    const totalNodes = model.junctions.length + model.reservoirs.length + model.tanks.length;
    const totalLinks = model.pipes.length + model.pumps.length + model.valves.length;
    const isSmallNetwork = totalNodes + totalLinks < 5;
    const hasResults = !!(solveResult || epsResult);

    // Compute compliance if results exist
    let pressurePassing = 0;
    let velocityPassing = 0;
    if (hasResults) {
      for (const j of model.junctions) {
        const nr = getNodeResultAtTimeForCount(j.id);
        if (nr && nr.pressure >= dc.residualPressureFloor) pressurePassing++;
      }
      for (const p of model.pipes) {
        const lr = getLinkResultAtTimeForCount(p.id);
        if (lr) {
          const v = Math.abs(lr.velocity);
          if (v >= dc.velocityMin && v <= dc.velocityMax) velocityPassing++;
        }
      }
    }

    return (
      <div className="properties-panel">
        <div className="panel-header">Properties</div>

        <div className="panel-section" style={{ color: '#888', fontSize: 13 }}>
          Select an element on the map to edit its properties.
        </div>

        {/* Quick-start guide for new users */}
        {isSmallNetwork && (
          <div className="panel-section">
            <h4>Getting Started</h4>
            <div className="quick-start">
              <div className="quick-start-step"><span className="step-num">1</span> Place nodes using toolbar: <strong>R</strong> = Reservoir, <strong>J</strong> = Junction, <strong>T</strong> = Tank</div>
              <div className="quick-start-step"><span className="step-num">2</span> Connect with <strong>P</strong> = Pipe, <strong>U</strong> = Pump, <strong>V</strong> = Valve</div>
              <div className="quick-start-step"><span className="step-num">3</span> Set demands on junctions in this panel</div>
              <div className="quick-start-step"><span className="step-num">4</span> Click <strong>Compute</strong> to run hydraulic analysis</div>
              <div className="quick-start-step"><span className="step-num">5</span> Green = pass, Red = fail</div>
            </div>
          </div>
        )}

        {/* Network summary */}
        <div className="panel-section">
          <h4>Network</h4>
          <div className="field-row">
            <span className="field-label">Nodes</span>
            <span>{totalNodes} ({model.reservoirs.length} res, {model.tanks.length} tank, {model.junctions.length} junc)</span>
          </div>
          <div className="field-row">
            <span className="field-label">Links</span>
            <span>{totalLinks} ({model.pipes.length} pipe, {model.pumps.length} pump, {model.valves.length} valve)</span>
          </div>
        </div>

        {/* Design criteria quick-ref */}
        <div className="panel-section">
          <h4>Design Criteria</h4>
          <div className="field-row">
            <span className="field-label">Pressure floor</span>
            <span>{dc.residualPressureFloor} m</span>
          </div>
          <div className="field-row">
            <span className="field-label">Velocity band</span>
            <span>{dc.velocityMin}–{dc.velocityMax} m/s</span>
          </div>
          <div className="field-row">
            <span className="field-label">Economic band</span>
            <span>{dc.velocityEconomicMin}–{dc.velocityEconomicMax} m/s</span>
          </div>
          <div className="field-row">
            <span className="field-label">LPCD</span>
            <span>{dc.lpcd}</span>
          </div>
          <div className="field-row">
            <span className="field-label">Roughness (C)</span>
            <span>{dc.defaultRoughness}</span>
          </div>
        </div>

        {/* Results summary when available */}
        {hasResults && (
          <div className="panel-section">
            <h4>Results</h4>
            <div className="field-row">
              <span className="field-label">Pressure</span>
              <span>
                <span className={`result-indicator ${pressurePassing === model.junctions.length ? 'result-pass' : 'result-fail'}`}>
                  {pressurePassing}/{model.junctions.length}
                </span>
                {' '}pass ({model.junctions.length > 0 ? (pressurePassing / model.junctions.length * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <div className="field-row">
              <span className="field-label">Velocity</span>
              <span>
                {velocityPassing}/{model.pipes.length} in band
              </span>
            </div>
            <div className="field-row">
              <span className="field-label">Mode</span>
              <span>{model.options.duration > 0 ? 'Extended Period (EPS)' : 'Steady State'}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const nodeResult = getNodeResultAtTime(selectedId);
  const linkResult = getLinkResultAtTime(selectedId);
  const pressureFloor = model.designCriteria.residualPressureFloor;

  if (selectedType === 'junction') {
    const junction = model.junctions.find(j => j.id === selectedId);
    if (!junction) return null;

    return (
      <div className="properties-panel">
        <div className="panel-header">Junction — {junction.id}</div>
        <div className="panel-section">
          <h4>Properties</h4>
          <FieldRow label="Elevation" value={junction.elevation} unit="m"
            onChange={v => updateJunction(junction.id, { elevation: v })} />
          <FieldRow label="Base Demand" value={junction.baseDemand} unit="LPS"
            onChange={v => updateJunction(junction.id, { baseDemand: v })} />
          <FieldRow label="X (Lng)" value={junction.x} unit="°" decimals={6}
            onChange={v => updateJunction(junction.id, { x: v })} />
          <FieldRow label="Y (Lat)" value={junction.y} unit="°" decimals={6}
            onChange={v => updateJunction(junction.id, { y: v })} />
        </div>
        {nodeResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Pressure" value={nodeResult.pressure} unit="m"
              pass={nodeResult.pressure >= pressureFloor} />
            <ResultRow label="Head" value={nodeResult.head} unit="m" />
            <ResultRow label="Demand" value={nodeResult.demand} unit="LPS" />
            <NodeSparklineSection nodeId={junction.id} param="pressure" threshold={pressureFloor}
              onOpenChart={(param) => setChartModal({ elementId: junction.id, elementType: 'node', param, label: 'Pressure', unit: 'm' })} />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(junction.id, 'junction')}>
            Delete Junction
          </button>
        </div>
        {chartModal && <TimeSeriesModal config={chartModal} onClose={() => setChartModal(null)} />}
      </div>
    );
  }

  if (selectedType === 'reservoir') {
    const res = model.reservoirs.find(r => r.id === selectedId);
    if (!res) return null;

    return (
      <div className="properties-panel">
        <div className="panel-header">Reservoir — {res.id}</div>
        <div className="panel-section">
          <h4>Properties</h4>
          <FieldRow label="Head" value={res.head} unit="m"
            onChange={v => updateReservoir(res.id, { head: v })} />
          <FieldRow label="X (Lng)" value={res.x} unit="°" decimals={6}
            onChange={v => updateReservoir(res.id, { x: v })} />
          <FieldRow label="Y (Lat)" value={res.y} unit="°" decimals={6}
            onChange={v => updateReservoir(res.id, { y: v })} />
        </div>
        {nodeResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Head" value={nodeResult.head} unit="m" />
            <ResultRow label="Net Flow" value={nodeResult.demand} unit="LPS" />
            <NodeSparklineSection nodeId={res.id} param="demand"
              onOpenChart={(param) => setChartModal({ elementId: res.id, elementType: 'node', param, label: 'Demand', unit: 'LPS' })} />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(res.id, 'reservoir')}>
            Delete Reservoir
          </button>
        </div>
        {chartModal && <TimeSeriesModal config={chartModal} onClose={() => setChartModal(null)} />}
      </div>
    );
  }

  if (selectedType === 'tank') {
    const tank = model.tanks.find(t => t.id === selectedId);
    if (!tank) return null;

    return (
      <div className="properties-panel">
        <div className="panel-header">Tank — {tank.id}</div>
        <div className="panel-section">
          <h4>Properties</h4>
          <FieldRow label="Elevation" value={tank.elevation} unit="m"
            onChange={v => updateTank(tank.id, { elevation: v })} />
          <FieldRow label="Init Level" value={tank.initLevel} unit="m"
            onChange={v => updateTank(tank.id, { initLevel: v })} />
          <FieldRow label="Min Level" value={tank.minLevel} unit="m"
            onChange={v => updateTank(tank.id, { minLevel: v })} />
          <FieldRow label="Max Level" value={tank.maxLevel} unit="m"
            onChange={v => updateTank(tank.id, { maxLevel: v })} />
          <FieldRow label="Diameter" value={tank.diameter} unit="m"
            onChange={v => updateTank(tank.id, { diameter: v })} />
        </div>
        {nodeResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Pressure" value={nodeResult.pressure} unit="m" />
            <ResultRow label="Head" value={nodeResult.head} unit="m" />
            <NodeSparklineSection nodeId={tank.id} param="tankLevel"
              onOpenChart={(param) => setChartModal({ elementId: tank.id, elementType: 'node', param, label: 'Tank Level', unit: 'm' })} />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(tank.id, 'tank')}>
            Delete Tank
          </button>
        </div>
        {chartModal && <TimeSeriesModal config={chartModal} onClose={() => setChartModal(null)} />}
      </div>
    );
  }

  if (selectedType === 'pipe') {
    const pipe = model.pipes.find(p => p.id === selectedId);
    if (!pipe) return null;

    return (
      <div className="properties-panel">
        <div className="panel-header">Pipe — {pipe.id}</div>
        <div className="panel-section">
          <h4>Properties</h4>
          <div className="field-row">
            <span className="field-label">From → To</span>
            <span style={{ fontSize: 13 }}>{pipe.fromNode} → {pipe.toNode}</span>
          </div>
          <FieldRow label="Length" value={pipe.length} unit="m" decimals={1}
            onChange={v => updatePipe(pipe.id, { length: v, lengthOverride: true })} />
          <FieldRow label="Diameter" value={pipe.diameter} unit="mm"
            onChange={v => updatePipe(pipe.id, { diameter: v })} />
          <FieldRow label="Roughness (C)" value={pipe.roughness} unit=""
            onChange={v => updatePipe(pipe.id, { roughness: v })} />
          <FieldRow label="Minor Loss" value={pipe.minorLoss} unit=""
            onChange={v => updatePipe(pipe.id, { minorLoss: v })} />
          <div className="field-row">
            <span className="field-label">Material</span>
            <select className="field-select" value={pipe.material || 'DI'}
              onChange={e => updatePipe(pipe.id, { material: e.target.value as PipeMaterial })}>
              {(Object.keys(MATERIAL_LABELS) as PipeMaterial[]).map(m => (
                <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <span className="field-label">Status</span>
            <select className="field-select" value={pipe.status}
              onChange={e => updatePipe(pipe.id, { status: e.target.value as 'Open' | 'Closed' | 'CV' })}>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="CV">Check Valve</option>
            </select>
          </div>
          <div className="field-row" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span className="field-label">Cost</span>
            <span>₹{(pipe.length * getCostPerMeter(pipe.diameter, pipe.material || 'DI')).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        {linkResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Flow" value={linkResult.flow} unit="LPS" />
            <VelocityRow value={linkResult.velocity} criteria={model.designCriteria} />
            <ResultRow label="Head Loss" value={linkResult.headloss} unit="m/km" />
            <LinkSparklineSection linkId={pipe.id} param="flow"
              onOpenChart={(param) => setChartModal({ elementId: pipe.id, elementType: 'link', param, label: 'Flow', unit: 'LPS' })} />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(pipe.id, 'pipe')}>
            Delete Pipe
          </button>
        </div>
        {chartModal && <TimeSeriesModal config={chartModal} onClose={() => setChartModal(null)} />}
      </div>
    );
  }

  if (selectedType === 'pump') {
    const pump = model.pumps.find(p => p.id === selectedId);
    if (!pump) return null;

    return (
      <div className="properties-panel">
        <div className="panel-header">Pump — {pump.id}</div>
        <div className="panel-section">
          <h4>Properties</h4>
          <div className="field-row">
            <span className="field-label">From → To</span>
            <span style={{ fontSize: 13 }}>{pump.fromNode} → {pump.toNode}</span>
          </div>
          <FieldRow label="Power" value={pump.power} unit="kW"
            onChange={v => updatePump(pump.id, { power: v })} />
          <FieldRow label="Speed" value={pump.speed} unit="×"
            onChange={v => updatePump(pump.id, { speed: v })} />
          <div className="field-row">
            <span className="field-label">Curve ID</span>
            <input className="field-input" type="text" value={pump.curveId}
              onChange={e => updatePump(pump.id, { curveId: e.target.value })} />
          </div>
          <div className="field-row">
            <span className="field-label">Pattern ID</span>
            <input className="field-input" type="text" value={pump.patternId}
              onChange={e => updatePump(pump.id, { patternId: e.target.value })} />
          </div>
        </div>
        {linkResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Flow" value={linkResult.flow} unit="LPS" />
            <ResultRow label="Velocity" value={linkResult.velocity} unit="m/s" />
            <ResultRow label="Head Loss" value={linkResult.headloss} unit="m" />
            <LinkSparklineSection linkId={pump.id} param="flow"
              onOpenChart={(param) => setChartModal({ elementId: pump.id, elementType: 'link', param, label: 'Flow', unit: 'LPS' })} />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(pump.id, 'pump')}>
            Delete Pump
          </button>
        </div>
        {chartModal && <TimeSeriesModal config={chartModal} onClose={() => setChartModal(null)} />}
      </div>
    );
  }

  if (selectedType === 'valve') {
    const valve = model.valves.find(v => v.id === selectedId);
    if (!valve) return null;

    return (
      <div className="properties-panel">
        <div className="panel-header">Valve — {valve.id}</div>
        <div className="panel-section">
          <h4>Properties</h4>
          <div className="field-row">
            <span className="field-label">From → To</span>
            <span style={{ fontSize: 13 }}>{valve.fromNode} → {valve.toNode}</span>
          </div>
          <FieldRow label="Diameter" value={valve.diameter} unit="mm"
            onChange={v => updateValve(valve.id, { diameter: v })} />
          <div className="field-row">
            <span className="field-label">Type</span>
            <select className="field-select" value={valve.type}
              onChange={e => updateValve(valve.id, { type: e.target.value as any })}>
              <option value="PRV">PRV — Pressure Reducing</option>
              <option value="PSV">PSV — Pressure Sustaining</option>
              <option value="PBV">PBV — Pressure Breaker</option>
              <option value="FCV">FCV — Flow Control</option>
              <option value="TCV">TCV — Throttle Control</option>
              <option value="GPV">GPV — General Purpose</option>
            </select>
          </div>
          <FieldRow label="Setting" value={valve.setting} unit={valve.type === 'FCV' ? 'LPS' : 'm'}
            onChange={v => updateValve(valve.id, { setting: v })} />
          <FieldRow label="Minor Loss" value={valve.minorLoss} unit=""
            onChange={v => updateValve(valve.id, { minorLoss: v })} />
        </div>
        {linkResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Flow" value={linkResult.flow} unit="LPS" />
            <ResultRow label="Velocity" value={linkResult.velocity} unit="m/s" />
            <ResultRow label="Head Loss" value={linkResult.headloss} unit="m" />
            <LinkSparklineSection linkId={valve.id} param="flow"
              onOpenChart={(param) => setChartModal({ elementId: valve.id, elementType: 'link', param, label: 'Flow', unit: 'LPS' })} />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(valve.id, 'valve')}>
            Delete Valve
          </button>
        </div>
        {chartModal && <TimeSeriesModal config={chartModal} onClose={() => setChartModal(null)} />}
      </div>
    );
  }

  return null;
}

// Field row with numeric input
function FieldRow({ label, value, unit, decimals = 2, onChange }: {
  label: string; value: number; unit: string; decimals?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="number"
        step="any"
        value={value.toFixed(decimals)}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
      />
      <span className="field-unit">{unit}</span>
    </div>
  );
}

// Result display row
function ResultRow({ label, value, unit, pass }: {
  label: string; value: number; unit: string; pass?: boolean;
}) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <span style={{ fontWeight: 500 }}>{value.toFixed(2)}</span>
      <span className="field-unit">{unit}</span>
      {pass !== undefined && (
        <span className={`result-indicator ${pass ? 'result-pass' : 'result-fail'}`}
          style={{ marginLeft: 8 }}>
          {pass ? 'PASS' : 'FAIL'}
        </span>
      )}
    </div>
  );
}

// Sparkline section for nodes (junction/tank)
function NodeSparklineSection({ nodeId, param, threshold, onOpenChart }: {
  nodeId: string;
  param: NodeSeriesParam;
  threshold?: number;
  onOpenChart: (param: NodeSeriesParam) => void;
}) {
  const epsResult = useNetworkStore(s => s.epsResult);
  if (!epsResult) return null;

  const series = extractNodeSeries(epsResult, nodeId, param);
  if (series.length < 2) return null;

  return (
    <>
      <div onClick={() => onOpenChart(param)}>
        <Sparkline data={series} threshold={threshold} />
      </div>
      <button className="view-chart-btn" onClick={() => onOpenChart(param)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 10l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        View Time Series
      </button>
    </>
  );
}

// Sparkline section for links (pipe/pump/valve)
function LinkSparklineSection({ linkId, param, onOpenChart }: {
  linkId: string;
  param: LinkSeriesParam;
  onOpenChart: (param: LinkSeriesParam) => void;
}) {
  const epsResult = useNetworkStore(s => s.epsResult);
  if (!epsResult) return null;

  const series = extractLinkSeries(epsResult, linkId, param);
  if (series.length < 2) return null;

  return (
    <>
      <div onClick={() => onOpenChart(param)}>
        <Sparkline data={series} color="#e67e22" />
      </div>
      <button className="view-chart-btn" onClick={() => onOpenChart(param)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 10l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        View Time Series
      </button>
    </>
  );
}

// Velocity with economic/permissible band check
function VelocityRow({ value, criteria }: {
  value: number; criteria: { velocityMin: number; velocityMax: number; velocityEconomicMin: number; velocityEconomicMax: number };
}) {
  const absV = Math.abs(value);
  const inPermissible = absV >= criteria.velocityMin && absV <= criteria.velocityMax;
  const inEconomic = absV >= criteria.velocityEconomicMin && absV <= criteria.velocityEconomicMax;

  let badge = 'FAIL';
  let cls = 'result-fail';
  if (inEconomic) { badge = 'OPTIMAL'; cls = 'result-pass'; }
  else if (inPermissible) { badge = 'OK'; cls = 'result-pass'; }

  return (
    <div className="field-row">
      <span className="field-label">Velocity</span>
      <span style={{ fontWeight: 500 }}>{value.toFixed(3)}</span>
      <span className="field-unit">m/s</span>
      <span className={`result-indicator ${cls}`} style={{ marginLeft: 8 }}>{badge}</span>
    </div>
  );
}
