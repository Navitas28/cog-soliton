/**
 * Scenario panel — simulation options, design criteria, demand patterns.
 */
import { useState, useRef, useEffect } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { DEFAULT_DIURNAL_PATTERN, computeBaseDemand, computeFireDemand, validatePatternAverage } from '../model/demand';
import type { QualityType, QualitySource, Rule, RuleCondition, RuleAction } from '../model/types';

function CollapsibleSection({ title, defaultOpen = true, children, actions }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="panel-section-header" onClick={() => setOpen(!open)}
          aria-expanded={open} style={{ flex: 1 }}>
          <span className={`panel-section-arrow ${open ? 'open' : ''}`}>▸</span>
          <h4>{title}</h4>
        </button>
        {actions}
      </div>
      {open && <div className="panel-section-body">{children}</div>}
    </div>
  );
}

export function ScenarioPanel() {
  const model = useNetworkStore(s => s.model);
  const updateOptions = useNetworkStore(s => s.updateOptions);
  const updateDesignCriteria = useNetworkStore(s => s.updateDesignCriteria);
  const addPattern = useNetworkStore(s => s.addPattern);
  const show = useNetworkStore(s => s.showScenarioPanel);
  const setShow = useNetworkStore(s => s.setShowScenarioPanel);
  const markScenarioPanelSeen = useNetworkStore(s => s.markScenarioPanelSeen);

  if (!show) return null;

  const opts = model.options;
  const dc = model.designCriteria;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 52, bottom: 0, width: 340,
      background: '#fff', borderRight: '1px solid #e0e0e0', overflowY: 'auto', zIndex: 20,
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
    }} role="complementary" aria-label="Scenario settings">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Scenario Settings
        <button onClick={() => { setShow(false); markScenarioPanelSeen(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }} aria-label="Close scenario panel">×</button>
      </div>

      {/* Simulation Mode */}
      <CollapsibleSection title="Simulation">
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
      </CollapsibleSection>

      {/* CPHEEO Design Criteria */}
      <CollapsibleSection title="CPHEEO Design Criteria">
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
      </CollapsibleSection>

      {/* LPCD presets */}
      <CollapsibleSection title="LPCD Presets (CPHEEO)" defaultOpen={false}>
        {[
          { label: '150 — Cities > 10 lakh', value: 150 },
          { label: '135 — With sewerage', value: 135 },
          { label: '100 — Without sewerage (planned)', value: 100 },
          { label: '70 — Towns without sewerage', value: 70 },
        ].map(p => (
          <button key={p.value} onClick={() => updateDesignCriteria({ lpcd: p.value })}
            className={`preset-btn ${dc.lpcd === p.value ? 'active' : ''}`}>
            <span className="preset-value">{p.value}</span>
            <span className="preset-label">{p.label.split(' — ')[1]}</span>
          </button>
        ))}
      </CollapsibleSection>

      {/* Pressure Floor presets */}
      <CollapsibleSection title="Pressure Floor Presets" defaultOpen={false}>
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
            className={`preset-btn ${dc.residualPressureFloor === p.value ? 'active' : ''}`}>
            <span className="preset-value">{p.value} m</span>
            <span className="preset-label">{p.label.split(' — ')[1]}</span>
          </button>
        ))}
      </CollapsibleSection>

      {/* Demand Patterns */}
      <CollapsibleSection title="Demand Patterns" defaultOpen={false}>
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
      </CollapsibleSection>

      {/* Demand calculator */}
      <CollapsibleSection title="Demand Calculator" defaultOpen={false}>
        <DemandCalc lpcd={dc.lpcd} />
      </CollapsibleSection>

      {/* Fire demand calculator */}
      <CollapsibleSection title="Fire Demand Calculator" defaultOpen={false}>
        <FireDemandCalc />
        <div style={{ fontSize: 10, color: '#e67e22', marginTop: 4, fontWeight: 600 }}>
          ⚠ Verify against CPHEEO Ch. 2
        </div>
      </CollapsibleSection>
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
  const updatePattern = useNetworkStore(s => s.updatePattern);
  const deletePattern = useNetworkStore(s => s.deletePattern);
  const [editingBar, setEditingBar] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { valid, average } = validatePatternAverage(pattern.multipliers);
  const peak = Math.max(...pattern.multipliers);
  const CHART_HEIGHT = 80;
  const MAX_MULTIPLIER = 5;

  // Handle mouse drag on bars
  const handleBarMouseDown = (barIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setEditingBar(barIndex);
    updateBarFromMouse(barIndex, e.clientY);
  };

  const updateBarFromMouse = (barIndex: number, clientY: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const rect = chart.getBoundingClientRect();
    const relY = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const newVal = Math.round(relY * MAX_MULTIPLIER * 10) / 10; // snap to 0.1
    const newMultipliers = [...pattern.multipliers];
    newMultipliers[barIndex] = Math.max(0, Math.min(MAX_MULTIPLIER, newVal));
    updatePattern(pattern.id, newMultipliers);
  };

  useEffect(() => {
    if (editingBar === null) return;
    const handleMove = (e: MouseEvent) => updateBarFromMouse(editingBar, e.clientY);
    const handleUp = () => setEditingBar(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [editingBar, pattern.id]);

  return (
    <div style={{ marginBottom: 8, padding: 6, background: '#f7f8fa', borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Pattern {pattern.id}</span>
        <span style={{ fontSize: 10, color: '#666' }}>Peak: {peak.toFixed(1)}× | Avg: {average.toFixed(2)}</span>
        <button onClick={() => deletePattern(pattern.id)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 12 }}>×</button>
      </div>

      {/* Interactive bar chart — drag to edit */}
      <div ref={chartRef} style={{ display: 'flex', gap: 1, height: CHART_HEIGHT, alignItems: 'flex-end', cursor: 'ns-resize' }}>
        {pattern.multipliers.map((m, i) => (
          <div key={i}
            onMouseDown={handleBarMouseDown(i)}
            style={{
              flex: 1,
              background: editingBar === i ? '#2c3e50' : m >= 2.0 ? '#e74c3c' : m >= 1.0 ? '#3498db' : '#95a5a6',
              height: `${(m / MAX_MULTIPLIER) * 100}%`,
              borderRadius: '2px 2px 0 0',
              transition: editingBar !== null ? 'none' : 'height 0.1s',
            }}
            title={`${i}:00 — ${m.toFixed(1)}×`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#999', marginTop: 2 }}>
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
      </div>

      {/* Validation */}
      {!valid && (
        <div style={{ fontSize: 10, color: '#e74c3c', marginTop: 4 }}>
          ⚠ Average multiplier ({average.toFixed(2)}) far from 1.0 — total daily demand will be {average > 1 ? 'over' : 'under'}-stated.
        </div>
      )}

      {/* Presets */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button onClick={() => updatePattern(pattern.id, [...DEFAULT_DIURNAL_PATTERN])} style={presetBtn}>CPHEEO Default</button>
        <button onClick={() => updatePattern(pattern.id, new Array(24).fill(1.0))} style={presetBtn}>Flat</button>
        <button onClick={() => updatePattern(pattern.id, [
          0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 1.2, 2.0, 2.5, 2.8, 2.5, 2.0,
          1.8, 1.5, 1.3, 1.5, 1.8, 2.2, 2.0, 1.5, 1.0, 0.7, 0.5, 0.3,
        ])} style={presetBtn}>Commercial</button>
      </div>
    </div>
  );
}

function FireDemandCalc() {
  const [popK, setPopK] = useState(100); // thousands
  const fireDemand = computeFireDemand(popK);
  const fireDemandM3h = fireDemand * 3.6;
  const hydrants = Math.ceil(fireDemand * 60 / 1000); // ~1000 LPM per hydrant

  return (
    <div>
      <div className="field-row">
        <span className="field-label">Population (000s)</span>
        <input className="field-input" type="number" value={popK}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPopK(v); }} />
      </div>
      <div className="field-row">
        <span className="field-label">Fire demand</span>
        <span style={{ fontWeight: 600 }}>{fireDemand.toFixed(2)} LPS</span>
        <span className="field-unit">({fireDemandM3h.toFixed(1)} m3/hr)</span>
      </div>
      <div className="field-row">
        <span className="field-label">Hydrants needed</span>
        <span style={{ fontWeight: 600 }}>{hydrants}</span>
        <span className="field-unit">(@ 1000 LPM)</span>
      </div>
      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
        Q = 100 × sqrt(P) LPM. Apply as additional demand at fire hydrant junctions.
      </div>

      {/* Water Quality Settings */}
      <QualitySection />

      {/* Rule-Based Controls */}
      <RulesSection />
    </div>
  );
}

const presetBtn: React.CSSProperties = {
  padding: '2px 6px', border: '1px solid #ccc', borderRadius: 3, background: '#fff',
  cursor: 'pointer', fontSize: 10,
};

/* ─── Water Quality Section ─── */
function QualitySection() {
  const model = useNetworkStore(s => s.model);
  const loadModel = useNetworkStore(s => s.loadModel);
  const qs = model.qualitySettings || { type: 'None' as QualityType, chemicalName: 'Chlorine', chemicalUnits: 'mg/L', traceNodeId: '', bulkCoeff: -0.5, wallCoeff: -1.0 };

  const updateQuality = (updates: Partial<typeof qs>) => {
    loadModel({ ...model, qualitySettings: { ...qs, ...updates } });
  };

  const sources = model.qualitySources || [];

  const addSource = () => {
    const firstRes = model.reservoirs[0];
    const newSource: QualitySource = {
      nodeId: firstRes?.id || '',
      type: 'CONCEN',
      baseline: 1.0,
      patternId: '',
    };
    loadModel({ ...model, qualitySources: [...sources, newSource] });
  };

  const removeSource = (idx: number) => {
    loadModel({ ...model, qualitySources: sources.filter((_, i) => i !== idx) });
  };

  const updateSource = (idx: number, updates: Partial<QualitySource>) => {
    loadModel({
      ...model,
      qualitySources: sources.map((s, i) => i === idx ? { ...s, ...updates } : s),
    });
  };

  const allNodeIds = [
    ...model.reservoirs.map(r => r.id),
    ...model.junctions.map(j => j.id),
    ...model.tanks.map(t => t.id),
  ];

  return (
    <CollapsibleSection title="Water Quality" defaultOpen={false}>
      <div className="field-row">
        <span className="field-label">Type</span>
        <select className="field-select" value={qs.type}
          onChange={e => updateQuality({ type: e.target.value as QualityType })}>
          <option value="None">None</option>
          <option value="Age">Water Age</option>
          <option value="Chemical">Chemical (Chlorine)</option>
          <option value="Trace">Source Trace</option>
        </select>
      </div>

      {qs.type === 'Chemical' && (
        <>
          <div className="field-row">
            <span className="field-label">Chemical</span>
            <input className="field-input" value={qs.chemicalName}
              onChange={e => updateQuality({ chemicalName: e.target.value })} />
          </div>
          <div className="field-row">
            <span className="field-label">Bulk Coeff</span>
            <input className="field-input" type="number" step="0.1"
              value={qs.bulkCoeff}
              onChange={e => updateQuality({ bulkCoeff: parseFloat(e.target.value) || 0 })} />
            <span className="field-unit">1/day</span>
          </div>
          <div className="field-row">
            <span className="field-label">Wall Coeff</span>
            <input className="field-input" type="number" step="0.1"
              value={qs.wallCoeff}
              onChange={e => updateQuality({ wallCoeff: parseFloat(e.target.value) || 0 })} />
            <span className="field-unit">m/day</span>
          </div>

          {/* Sources */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>Injection Sources</span>
              <button onClick={addSource} style={{ ...presetBtn, color: '#3a5fcf' }}>+ Add</button>
            </div>
            {sources.map((src, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                <select className="field-select" style={{ flex: 1, fontSize: 11 }}
                  value={src.nodeId}
                  onChange={e => updateSource(idx, { nodeId: e.target.value })}>
                  {allNodeIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
                <select className="field-select" style={{ width: 70, fontSize: 11 }}
                  value={src.type}
                  onChange={e => updateSource(idx, { type: e.target.value as QualitySource['type'] })}>
                  <option value="CONCEN">Concen</option>
                  <option value="MASS">Mass</option>
                  <option value="SETPOINT">Setpoint</option>
                  <option value="FLOWPACED">FlowPaced</option>
                </select>
                <input className="field-input" type="number" step="0.1"
                  style={{ width: 50, fontSize: 11 }}
                  value={src.baseline}
                  onChange={e => updateSource(idx, { baseline: parseFloat(e.target.value) || 0 })} />
                <button onClick={() => removeSource(idx)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        </>
      )}

      {qs.type === 'Trace' && (
        <div className="field-row">
          <span className="field-label">Trace Node</span>
          <select className="field-select" value={qs.traceNodeId}
            onChange={e => updateQuality({ traceNodeId: e.target.value })}>
            <option value="">— select —</option>
            {allNodeIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
      )}

      {qs.type !== 'None' && (
        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
          Requires EPS mode. Quality results computed alongside hydraulics.
        </div>
      )}
    </CollapsibleSection>
  );
}

/* ─── Rules Section ─── */
function RulesSection() {
  const model = useNetworkStore(s => s.model);
  const loadModel = useNetworkStore(s => s.loadModel);
  const rules = model.rules || [];

  const addRule = () => {
    const firstTank = model.tanks[0];
    const firstPump = model.pumps[0];
    const newRule: Rule = {
      id: `Rule${rules.length + 1}`,
      enabled: true,
      priority: rules.length + 1,
      conditions: [{
        elementId: firstTank?.id || '',
        property: 'LEVEL',
        operator: 'BELOW',
        value: 2.0,
        logic: 'IF',
      }],
      actions: [{
        elementId: firstPump?.id || '',
        property: 'STATUS',
        value: 'OPEN',
      }],
    };
    loadModel({ ...model, rules: [...rules, newRule] });
  };

  const removeRule = (idx: number) => {
    loadModel({ ...model, rules: rules.filter((_, i) => i !== idx) });
  };

  const toggleRule = (idx: number) => {
    loadModel({
      ...model,
      rules: rules.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r),
    });
  };

  const updateCondition = (ruleIdx: number, condIdx: number, updates: Partial<RuleCondition>) => {
    loadModel({
      ...model,
      rules: rules.map((r, ri) => ri === ruleIdx ? {
        ...r,
        conditions: r.conditions.map((c, ci) => ci === condIdx ? { ...c, ...updates } : c),
      } : r),
    });
  };

  const updateAction = (ruleIdx: number, actIdx: number, updates: Partial<RuleAction>) => {
    loadModel({
      ...model,
      rules: rules.map((r, ri) => ri === ruleIdx ? {
        ...r,
        actions: r.actions.map((a, ai) => ai === actIdx ? { ...a, ...updates } : a),
      } : r),
    });
  };

  const allElementIds = [
    ...model.tanks.map(t => t.id),
    ...model.pumps.map(p => p.id),
    ...model.valves.map(v => v.id),
    ...model.junctions.map(j => j.id),
  ];

  return (
    <CollapsibleSection title="Operational Rules" defaultOpen={false}
      actions={<button onClick={addRule} style={{ ...presetBtn, color: '#3a5fcf' }}>+ Add Rule</button>}>

      {rules.length === 0 && (
        <div style={{ fontSize: 11, color: '#999', padding: '8px 0' }}>
          No rules defined. Rules automate pump/valve control based on tank levels, time, or pressures.
        </div>
      )}

      {rules.map((rule, ri) => (
        <div key={ri} className="rule-card" style={{
          border: '1px solid #e8e8e8', borderRadius: 8, padding: 8, marginBottom: 6,
          opacity: rule.enabled ? 1 : 0.5, background: rule.enabled ? '#fafbfd' : '#f5f5f5',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3a5fcf' }}>{rule.id}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => toggleRule(ri)} style={{ ...presetBtn, fontSize: 9 }}>
                {rule.enabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => removeRule(ri)} style={{ ...presetBtn, color: '#e74c3c', fontSize: 9 }}>×</button>
            </div>
          </div>

          {/* Condition */}
          {rule.conditions.map((cond, ci) => (
            <div key={ci} style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: 3, fontSize: 10 }}>
              <span style={{ fontWeight: 600, color: '#888', width: 20 }}>{cond.logic}</span>
              <select className="field-select" style={{ flex: 1, fontSize: 10 }}
                value={cond.elementId}
                onChange={e => updateCondition(ri, ci, { elementId: e.target.value })}>
                {allElementIds.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              <select className="field-select" style={{ width: 55, fontSize: 10 }}
                value={cond.property}
                onChange={e => updateCondition(ri, ci, { property: e.target.value as RuleCondition['property'] })}>
                <option value="LEVEL">Level</option>
                <option value="PRESSURE">Pressure</option>
                <option value="HEAD">Head</option>
                <option value="FLOW">Flow</option>
                <option value="STATUS">Status</option>
              </select>
              <select className="field-select" style={{ width: 55, fontSize: 10 }}
                value={cond.operator}
                onChange={e => updateCondition(ri, ci, { operator: e.target.value as RuleCondition['operator'] })}>
                <option value="BELOW">Below</option>
                <option value="ABOVE">Above</option>
                <option value="IS">Is</option>
              </select>
              <input className="field-input" type="number" step="0.1"
                style={{ width: 40, fontSize: 10 }}
                value={Number(cond.value)}
                onChange={e => updateCondition(ri, ci, { value: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}

          {/* Action */}
          {rule.actions.map((act, ai) => (
            <div key={ai} style={{ display: 'flex', gap: 3, alignItems: 'center', fontSize: 10 }}>
              <span style={{ fontWeight: 600, color: '#27ae60', width: 20 }}>THEN</span>
              <select className="field-select" style={{ flex: 1, fontSize: 10 }}
                value={act.elementId}
                onChange={e => updateAction(ri, ai, { elementId: e.target.value })}>
                {allElementIds.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              <select className="field-select" style={{ width: 55, fontSize: 10 }}
                value={act.property}
                onChange={e => updateAction(ri, ai, { property: e.target.value as RuleAction['property'] })}>
                <option value="STATUS">Status</option>
                <option value="SETTING">Setting</option>
              </select>
              <select className="field-select" style={{ width: 55, fontSize: 10 }}
                value={String(act.value)}
                onChange={e => updateAction(ri, ai, { value: e.target.value })}>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          ))}
        </div>
      ))}

      <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
        Rules execute during EPS. Example: "IF Tank T1 level BELOW 2m THEN Pump PU1 OPEN".
      </div>
    </CollapsibleSection>
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
