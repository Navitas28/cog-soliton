/**
 * Optimizer UI — modal dialog for pipe auto-sizing.
 */
import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { optimizePipeSizes } from '../engine/optimizer';
import { MATERIAL_LABELS } from '../data/pipeCosts';
import type { PipeMaterial } from '../model/types';
import type { OptimizationResult } from '../engine/optimizer';

export function OptimizerPanel({ onClose }: { onClose: () => void }) {
  const model = useNetworkStore(s => s.model);
  const loadModel = useNetworkStore(s => s.loadModel);
  const solve = useNetworkStore(s => s.solve);

  const [material, setMaterial] = useState<PipeMaterial>('DI');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const formatLakhs = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const handleOptimize = async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await optimizePipeSizes(model, material, (iter, max) => {
        setProgress(Math.round((iter / max) * 100));
      });
      setResult(res);
    } finally {
      setRunning(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    loadModel(result.model);
    solve();
    onClose();
  };

  return (
    <div className="shortcut-overlay-backdrop" onClick={onClose}>
      <div className="optimizer-panel" onClick={e => e.stopPropagation()}>
        <div className="shortcut-overlay-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Pipe Auto-Sizing</span>
          <button className="shortcut-overlay-close" onClick={onClose}>×</button>
        </div>

        {!result ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Material</label>
              <select
                className="field-select"
                value={material}
                onChange={e => setMaterial(e.target.value as PipeMaterial)}
                disabled={running}
                style={{ width: '100%' }}
              >
                {(Object.keys(MATERIAL_LABELS) as PipeMaterial[]).map(m => (
                  <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Optimizes all pipe diameters to minimize cost while meeting CPHEEO pressure ({model.designCriteria.residualPressureFloor}m)
              and velocity ({model.designCriteria.velocityMin}–{model.designCriteria.velocityMax} m/s) constraints.
            </p>

            {running && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Optimizing... {progress}%</div>
              </div>
            )}

            <button
              className="compute-btn"
              onClick={handleOptimize}
              disabled={running || model.pipes.length === 0}
              style={{ width: '100%' }}
            >
              {running ? '⏳ Optimizing…' : '▶ Optimize Pipe Sizes'}
            </button>
          </>
        ) : (
          <>
            <div className="cost-summary" style={{ marginBottom: 12 }}>
              <div className="cost-metric">
                <div className="cost-metric-value" style={{ textDecoration: 'line-through', opacity: 0.5 }}>{formatLakhs(result.totalCostBefore)}</div>
                <div className="cost-metric-label">Before</div>
              </div>
              <div className="cost-metric">
                <div className="cost-metric-value" style={{ color: 'var(--success)' }}>{formatLakhs(result.totalCostAfter)}</div>
                <div className="cost-metric-label">After</div>
              </div>
              <div className="cost-metric">
                <div className="cost-metric-value">{result.pipesChanged}</div>
                <div className="cost-metric-label">Pipes Changed</div>
              </div>
            </div>

            <div style={{ fontSize: 12, marginBottom: 8 }}>
              {result.iterations} iterations, {result.violations.length} remaining violations
            </div>

            {result.violations.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8, maxHeight: 80, overflowY: 'auto' }}>
                {result.violations.slice(0, 5).map((v, i) => (
                  <div key={i}>{v.elementId}: {v.type} ({v.value.toFixed(2)} vs {v.limit})</div>
                ))}
                {result.violations.length > 5 && <div>...and {result.violations.length - 5} more</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="compute-btn" onClick={handleApply} style={{ flex: 1 }}>
                Apply Changes
              </button>
              <button className="top-bar-btn" onClick={() => setResult(null)} style={{ flex: 1 }}>
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
