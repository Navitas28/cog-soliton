/**
 * Scenario panel — simulation options, design criteria, demand patterns.
 */
import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { DEFAULT_DIURNAL_PATTERN, computeBaseDemand } from '../model/demand';

export function ScenarioPanel() {
  const model = useNetworkStore(s => s.model);
  const updateOptions = useNetworkStore(s => s.updateOptions);
  const updateDesignCriteria = useNetworkStore(s => s.updateDesignCriteria);
  const addPattern = useNetworkStore(s => s.addPattern);
  const show = useNetworkStore(s => s.showScenarioPanel);
  const setShow = useNetworkStore(s => s.setShowScenarioPanel);

  if (!show) return null;

  const opts = model.options;
  const dc = model.designCriteria;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 52, bottom: 0, width: 340,
      background: '#fff', borderRight: '1px solid #e0e0e0', overflowY: 'auto', zIndex: 20,
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
    }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Scenario Settings
        <button onClick={() => setShow(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>

      {/* Simulation Mode */}
      <div className="panel-section">
        <h4>Simulation</h4>
        <div className="field-row">
          <span className="field-label">Mode</span>
          <select className="field-select" value={opts.duration === 0 ? 'steady' : 'eps'}
            onChange={e => updateOptions({ duration: e.target.value === 'steady' ? 0 : 24 })}>
            <option value="steady">Steady State</option>
            <option value="eps">24-hour EPS</option>
          </select>
        </div>
        {opts.duration > 0 && (
          <>
            <NumField label="Duration" value={opts.duration} unit="hr" onChange={v => updateOptions({ duration: v })} />
            <NumField label="Hyd. Timestep" value={opts.hydraulicTimestep} unit="hr" onChange={v => updateOptions({ hydraulicTimestep: v })} />
            <NumField label="Report Timestep" value={opts.reportTimestep} unit="hr" onChange={v => updateOptions({ reportTimestep: v })} />
          </>
        )}
      </div>

      {/* CPHEEO Design Criteria */}
      <div className="panel-section">
        <h4>CPHEEO Design Criteria</h4>
        <NumField label="LPCD" value={dc.lpcd} unit="lpcd" onChange={v => updateDesignCriteria({ lpcd: v })} />
        <NumField label="Peak Factor" value={dc.peakFactor} unit="" onChange={v => updateDesignCriteria({ peakFactor: v })} />
        <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>⚠ Verify peak factor against CPHEEO Ch. 2</div>
        <NumField label="Pressure Floor" value={dc.residualPressureFloor} unit="m" onChange={v => updateDesignCriteria({ residualPressureFloor: v })} />
        <NumField label="Vel. Min" value={dc.velocityMin} unit="m/s" onChange={v => updateDesignCriteria({ velocityMin: v })} />
        <NumField label="Vel. Max" value={dc.velocityMax} unit="m/s" onChange={v => updateDesignCriteria({ velocityMax: v })} />
        <NumField label="Vel. Econ. Min" value={dc.velocityEconomicMin} unit="m/s" onChange={v => updateDesignCriteria({ velocityEconomicMin: v })} />
        <NumField label="Vel. Econ. Max" value={dc.velocityEconomicMax} unit="m/s" onChange={v => updateDesignCriteria({ velocityEconomicMax: v })} />
        <NumField label="Default C (H-W)" value={dc.defaultRoughness} unit="" onChange={v => updateDesignCriteria({ defaultRoughness: v })} />
        <NumField label="NRW Target" value={dc.nrwTarget * 100} unit="%" onChange={v => updateDesignCriteria({ nrwTarget: v / 100 })} />
        <NumField label="Design Period" value={dc.designPeriodYears} unit="yr" onChange={v => updateDesignCriteria({ designPeriodYears: v })} />
      </div>

      {/* LPCD presets */}
      <div className="panel-section">
        <h4>LPCD Presets (CPHEEO)</h4>
        {[
          { label: '150 — Cities > 10 lakh', value: 150 },
          { label: '135 — With sewerage', value: 135 },
          { label: '100 — Without sewerage (planned)', value: 100 },
          { label: '70 — Towns without sewerage', value: 70 },
        ].map(p => (
          <button key={p.value} onClick={() => updateDesignCriteria({ lpcd: p.value })}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px',
              border: 'none', background: dc.lpcd === p.value ? '#e8f0fe' : 'transparent',
              cursor: 'pointer', fontSize: 12, borderRadius: 3, marginBottom: 2,
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Pressure Floor presets */}
      <div className="panel-section">
        <h4>Pressure Floor Presets</h4>
        {[
          { label: '17 m — 24×7 DMA (Class I/II)', value: 17 },
          { label: '21 m — 24×7 DMA (upper)', value: 21 },
          { label: '12 m — Other cities (lower)', value: 12 },
          { label: '15 m — Other cities (upper)', value: 15 },
          { label: '7 m — Legacy 1-storey', value: 7 },
          { label: '12 m — Legacy 2-storey', value: 12 },
          { label: '17 m — Legacy 3-storey', value: 17 },
          { label: '22 m — Legacy 4-storey', value: 22 },
        ].map(p => (
          <button key={`${p.value}-${p.label}`} onClick={() => updateDesignCriteria({ residualPressureFloor: p.value })}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px',
              border: 'none', background: dc.residualPressureFloor === p.value ? '#e8f0fe' : 'transparent',
              cursor: 'pointer', fontSize: 12, borderRadius: 3, marginBottom: 2,
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Demand Patterns */}
      <div className="panel-section">
        <h4>Demand Patterns</h4>
        {model.patterns.length === 0 && (
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>No patterns defined. EPS requires at least one.</div>
        )}
        {model.patterns.map(pat => (
          <PatternMini key={pat.id} pattern={pat} />
        ))}
        <button onClick={() => addPattern({ id: String(model.patterns.length + 1), multipliers: [...DEFAULT_DIURNAL_PATTERN] })}
          style={{ padding: '4px 10px', border: '1px solid #3a5fcf', borderRadius: 4, background: 'transparent', color: '#3a5fcf', cursor: 'pointer', fontSize: 12 }}>
          + Add Default Diurnal Pattern
        </button>
      </div>

      {/* Demand calculator */}
      <div className="panel-section">
        <h4>Demand Calculator</h4>
        <DemandCalc lpcd={dc.lpcd} />
      </div>
    </div>
  );
}

function NumField({ label, value, unit, onChange, decimals = 2 }: {
  label: string; value: number; unit: string; decimals?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <input className="field-input" type="number" step="any"
        value={value.toFixed(decimals)}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }} />
      <span className="field-unit">{unit}</span>
    </div>
  );
}

function PatternMini({ pattern }: { pattern: { id: string; multipliers: number[] } }) {
  const deletePattern = useNetworkStore(s => s.deletePattern);
  const max = Math.max(...pattern.multipliers);

  return (
    <div style={{ marginBottom: 8, padding: 6, background: '#f7f8fa', borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Pattern {pattern.id}</span>
        <span style={{ fontSize: 10, color: '#666' }}>Peak: {max.toFixed(1)}×</span>
        <button onClick={() => deletePattern(pattern.id)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 12 }}>×</button>
      </div>
      {/* Mini bar chart */}
      <div style={{ display: 'flex', gap: 1, height: 30, alignItems: 'flex-end' }}>
        {pattern.multipliers.map((m, i) => (
          <div key={i} style={{
            flex: 1, background: m >= 2.0 ? '#e74c3c' : m >= 1.0 ? '#3498db' : '#95a5a6',
            height: `${(m / max) * 100}%`, borderRadius: '1px 1px 0 0',
          }} title={`${i}:00 — ${m.toFixed(2)}×`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#999', marginTop: 2 }}>
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
      </div>
    </div>
  );
}

function DemandCalc({ lpcd }: { lpcd: number }) {
  const [pop, setPop] = useState(1000);
  const demand = computeBaseDemand(pop, lpcd);

  return (
    <div>
      <div className="field-row">
        <span className="field-label">Population</span>
        <input className="field-input" type="number" value={pop}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setPop(v); }} />
      </div>
      <div className="field-row">
        <span className="field-label">Avg-day demand</span>
        <span style={{ fontWeight: 600 }}>{demand.toFixed(4)} LPS</span>
      </div>
      <div style={{ fontSize: 10, color: '#999' }}>
        = {pop} × {lpcd} ÷ 86400. Peak factor applied via pattern, not here.
      </div>
    </div>
  );
}
