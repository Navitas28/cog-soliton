import { useNetworkStore } from '../store/networkStore';

export function PropertiesPanel() {
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

  if (!selectedId || !selectedType) {
    return (
      <div className="properties-panel">
        <div className="panel-header">Properties</div>
        <div className="panel-section" style={{ color: '#999', fontSize: 13 }}>
          Select an element to edit its properties.
        </div>
        <div className="panel-section">
          <h4>Network Summary</h4>
          <div className="field-row">
            <span className="field-label">Junctions</span>
            <span>{model.junctions.length}</span>
          </div>
          <div className="field-row">
            <span className="field-label">Reservoirs</span>
            <span>{model.reservoirs.length}</span>
          </div>
          <div className="field-row">
            <span className="field-label">Tanks</span>
            <span>{model.tanks.length}</span>
          </div>
          <div className="field-row">
            <span className="field-label">Pipes</span>
            <span>{model.pipes.length}</span>
          </div>
          <div className="field-row">
            <span className="field-label">Pumps</span>
            <span>{model.pumps.length}</span>
          </div>
          <div className="field-row">
            <span className="field-label">Valves</span>
            <span>{model.valves.length}</span>
          </div>
        </div>
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
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(junction.id, 'junction')}>
            Delete Junction
          </button>
        </div>
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
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(res.id, 'reservoir')}>
            Delete Reservoir
          </button>
        </div>
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
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(tank.id, 'tank')}>
            Delete Tank
          </button>
        </div>
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
            <span className="field-label">Status</span>
            <select className="field-select" value={pipe.status}
              onChange={e => updatePipe(pipe.id, { status: e.target.value as 'Open' | 'Closed' | 'CV' })}>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="CV">Check Valve</option>
            </select>
          </div>
        </div>
        {linkResult && (
          <div className="panel-section">
            <h4>Results</h4>
            <ResultRow label="Flow" value={linkResult.flow} unit="LPS" />
            <VelocityRow value={linkResult.velocity} criteria={model.designCriteria} />
            <ResultRow label="Head Loss" value={linkResult.headloss} unit="m/km" />
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(pipe.id, 'pipe')}>
            Delete Pipe
          </button>
        </div>
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
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(pump.id, 'pump')}>
            Delete Pump
          </button>
        </div>
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
          </div>
        )}
        <div className="panel-section">
          <button className="delete-btn" onClick={() => deleteElement(valve.id, 'valve')}>
            Delete Valve
          </button>
        </div>
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
