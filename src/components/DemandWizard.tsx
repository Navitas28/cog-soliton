/**
 * Demand Allocation Wizard — step-by-step demand assignment from external data.
 */
import { useState, useCallback, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useNetworkStore } from '../store/networkStore';
import {
  parseDemandCsv, allocateByPopulation, allocateByBilling,
  allocateAreaProportional, matchZonesToNodes,
  type DemandRecord, type AllocationResult,
} from '../model/demandAllocation';

type WizardStep = 'upload' | 'method' | 'preview' | 'done';
type AllocMethod = 'population' | 'billing' | 'area';

export function DemandWizard({ onClose }: { onClose: () => void }) {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, true);
  const model = useNetworkStore(s => s.model);
  const loadModel = useNetworkStore(s => s.loadModel);

  const [step, setStep] = useState<WizardStep>('upload');
  const [records, setRecords] = useState<DemandRecord[]>([]);
  const [method, setMethod] = useState<AllocMethod>('population');
  const [allocations, setAllocations] = useState<AllocationResult[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedZones, setUnmatchedZones] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lpcd = model.designCriteria.lpcd;
  const nrwTarget = model.designCriteria.nrwTarget;

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    setError('');
    try {
      const text = await file.text();
      const parsed = parseDemandCsv(text);
      if (parsed.length === 0) {
        setError('No valid records found. CSV must have zone_id column + population/billing_volume/area.');
        return;
      }
      setRecords(parsed);
      setStep('method');
    } catch (e) {
      setError(`Failed to parse: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  // Compute allocations
  const computeAllocations = useCallback(() => {
    let alloc: AllocationResult[];
    if (method === 'population') {
      alloc = allocateByPopulation(records, lpcd);
    } else if (method === 'billing') {
      alloc = allocateByBilling(records, nrwTarget);
    } else {
      const totalDemand = model.junctions.reduce((s, j) => s + j.baseDemand, 0) || 1;
      alloc = allocateAreaProportional(records, totalDemand);
    }

    // Match zone IDs to nodes
    const zoneIds = alloc.map(a => a.nodeId);
    const matchResult = matchZonesToNodes(zoneIds, model);

    // Remap allocations to matched node IDs
    const mapped: AllocationResult[] = [];
    for (const a of alloc) {
      const nodeId = matchResult.matched.get(a.nodeId);
      if (nodeId) {
        mapped.push({ nodeId, demand: a.demand });
      }
    }

    setAllocations(mapped);
    setMatchedCount(matchResult.matched.size);
    setUnmatchedZones(matchResult.unmatched);
    setStep('preview');
  }, [method, records, lpcd, nrwTarget, model]);

  // Apply to model
  const applyAllocations = useCallback(() => {
    const updatedJunctions = model.junctions.map(j => {
      const alloc = allocations.find(a => a.nodeId === j.id);
      if (alloc) return { ...j, baseDemand: alloc.demand };
      return j;
    });
    loadModel({ ...model, junctions: updatedJunctions });
    setStep('done');
  }, [model, allocations, loadModel]);

  const totalAllocated = allocations.reduce((s, a) => s + a.demand, 0);
  const totalPopulation = records.reduce((s, r) => s + r.population, 0);

  return (
    <div ref={trapRef} className="chart-modal-backdrop" onClick={onClose}>
      <div className="import-dialog" onClick={e => e.stopPropagation()}>
        <div className="import-dialog-header">
          <div>
            <h3>Demand Allocation</h3>
            <span className="chart-modal-subtitle">
              {step === 'upload' && 'Upload demand data'}
              {step === 'method' && 'Select allocation method'}
              {step === 'preview' && 'Preview & apply'}
              {step === 'done' && 'Allocation complete'}
            </span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Steps */}
        <div className="import-steps">
          {['Upload', 'Method', 'Preview', 'Done'].map((label, i) => {
            const steps: WizardStep[] = ['upload', 'method', 'preview', 'done'];
            const isActive = steps.indexOf(step) >= i;
            return (
              <div key={label} className={`import-step ${isActive ? 'active' : ''}`}>
                <div className="import-step-num">{i + 1}</div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="import-body">
          {/* ─── Upload ─── */}
          {step === 'upload' && (
            <>
              <div
                className={`import-dropzone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="import-dropzone-icon">
                  <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                    <path d="M24 8v24M24 8l-8 8M24 8l8 8M8 36v4h32v-4" stroke="#3a5fcf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="import-dropzone-title">Upload Demand Data (CSV)</p>
                <p className="import-dropzone-sub">zone_id + population / billing_volume / area</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {error && <div className="import-error">{error}</div>}

              <div className="import-help" style={{ marginTop: 12 }}>
                <h4>CSV Format Examples</h4>
                <pre style={{ background: '#f5f6f8', padding: 10, borderRadius: 8, fontSize: 11, marginBottom: 8 }}>
{`zone_id,population
N1,5000
G1,8000
W1,3000`}
                </pre>
                <pre style={{ background: '#f5f6f8', padding: 10, borderRadius: 8, fontSize: 11 }}>
{`zone_id,billing_volume,area
J1,150,2.5
J2,280,4.0`}
                </pre>
              </div>
            </>
          )}

          {/* ─── Method ─── */}
          {step === 'method' && (
            <>
              <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
                {records.length} zones loaded. Select allocation method:
              </div>

              {[
                { id: 'population' as AllocMethod, label: 'Population-Based', desc: `demand = population × ${lpcd} lpcd ÷ 86400`, available: records.some(r => r.population > 0) },
                { id: 'billing' as AllocMethod, label: 'Billing-Based', desc: `demand = billing × (1 + ${(nrwTarget * 100).toFixed(0)}% NRW) ÷ 86.4`, available: records.some(r => r.billingVolume > 0) },
                { id: 'area' as AllocMethod, label: 'Area-Proportional', desc: 'distribute existing total demand by area', available: records.some(r => r.area > 0) },
              ].map(m => (
                <label key={m.id} className={`import-mode-opt ${method === m.id ? 'active' : ''}`}
                  style={{ marginBottom: 6, opacity: m.available ? 1 : 0.4 }}>
                  <input type="radio" name="method" checked={method === m.id}
                    onChange={() => setMethod(m.id)} disabled={!m.available} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{m.desc}</div>
                    {!m.available && <div style={{ fontSize: 10, color: '#e74c3c' }}>No data for this method</div>}
                  </div>
                </label>
              ))}

              <div className="import-actions">
                <button className="import-back-btn" onClick={() => setStep('upload')}>Back</button>
                <button className="import-go-btn" onClick={computeAllocations}>
                  Compute Allocations
                </button>
              </div>
            </>
          )}

          {/* ─── Preview ─── */}
          {step === 'preview' && (
            <>
              {/* Summary */}
              <div className="cal-stats-grid" style={{ marginBottom: 12 }}>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Matched</span>
                  <span className="cal-stat-value" style={{ color: '#27ae60' }}>{matchedCount}</span>
                  <span className="cal-stat-sub">of {records.length} zones</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Total Demand</span>
                  <span className="cal-stat-value">{totalAllocated.toFixed(2)}</span>
                  <span className="cal-stat-sub">LPS</span>
                </div>
                <div className="cal-stat-card">
                  <span className="cal-stat-label">Method</span>
                  <span className="cal-stat-value" style={{ fontSize: 12 }}>
                    {method === 'population' ? 'Population' : method === 'billing' ? 'Billing' : 'Area'}
                  </span>
                </div>
              </div>

              {method === 'population' && totalPopulation > 0 && (
                <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                  Total population: {totalPopulation.toLocaleString()} × {lpcd} lpcd = {(totalPopulation * lpcd / 86400).toFixed(2)} LPS
                </div>
              )}

              {unmatchedZones.length > 0 && (
                <div className="import-warning" style={{ marginBottom: 8 }}>
                  {unmatchedZones.length} zone(s) not matched: {unmatchedZones.join(', ')}
                </div>
              )}

              {/* Allocation table */}
              <div className="cal-table-wrap" style={{ maxHeight: 300 }}>
                <table className="cal-table">
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Current (LPS)</th>
                      <th>New (LPS)</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map(a => {
                      const current = model.junctions.find(j => j.id === a.nodeId)?.baseDemand || 0;
                      const change = a.demand - current;
                      return (
                        <tr key={a.nodeId}>
                          <td style={{ fontWeight: 600 }}>{a.nodeId}</td>
                          <td>{current.toFixed(4)}</td>
                          <td style={{ fontWeight: 600, color: '#3a5fcf' }}>{a.demand.toFixed(4)}</td>
                          <td style={{ color: change > 0 ? '#e74c3c' : change < 0 ? '#27ae60' : '#888', fontSize: 11 }}>
                            {change > 0 ? '+' : ''}{change.toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="import-actions">
                <button className="import-back-btn" onClick={() => setStep('method')}>Back</button>
                <button className="import-go-btn" onClick={applyAllocations}>
                  Apply to {allocations.length} Nodes
                </button>
              </div>
            </>
          )}

          {/* ─── Done ─── */}
          {step === 'done' && (
            <div className="import-success">
              <div className="import-success-icon">&#10003;</div>
              <h3>Demands Updated</h3>
              <div className="import-success-stats">
                <div className="import-success-stat">
                  <span className="import-success-num">{allocations.length}</span>
                  <span>Nodes Updated</span>
                </div>
                <div className="import-success-stat">
                  <span className="import-success-num">{totalAllocated.toFixed(2)}</span>
                  <span>Total LPS</span>
                </div>
              </div>
              <p className="import-success-hint">
                Click <strong>Compute</strong> to run hydraulic analysis with new demands.
              </p>
              <div className="import-actions" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button className="import-go-btn" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
