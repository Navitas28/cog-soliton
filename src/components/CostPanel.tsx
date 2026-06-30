/**
 * Cost estimation panel — total project cost and per-pipe breakdown.
 */
import { useNetworkStore } from '../store/networkStore';
import { getCostPerMeter, MATERIAL_LABELS } from '../data/pipeCosts';
import type { PipeMaterial } from '../model/types';

export function CostPanel({ onClose }: { onClose: () => void }) {
  const model = useNetworkStore(s => s.model);

  const pipeData = model.pipes.map(p => {
    const mat = (p.material || 'DI') as PipeMaterial;
    const unitCost = getCostPerMeter(p.diameter, mat);
    const totalCost = p.length * unitCost;
    return { id: p.id, diameter: p.diameter, material: mat, length: p.length, unitCost, totalCost };
  });

  const totalCost = pipeData.reduce((s, p) => s + p.totalCost, 0);
  const totalLength = pipeData.reduce((s, p) => s + p.length, 0);

  // Breakdown by material
  const byMaterial: Record<string, { length: number; cost: number; count: number }> = {};
  for (const p of pipeData) {
    if (!byMaterial[p.material]) byMaterial[p.material] = { length: 0, cost: 0, count: 0 };
    byMaterial[p.material].length += p.length;
    byMaterial[p.material].cost += p.totalCost;
    byMaterial[p.material].count++;
  }

  const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const formatLakhs = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return formatINR(n);
  };

  return (
    <div className="cost-panel">
      <div className="cost-panel-header">
        <span style={{ fontWeight: 700, fontSize: 14 }}>Cost Estimate</span>
        <button className="cost-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="cost-summary">
        <div className="cost-metric">
          <div className="cost-metric-value">{formatLakhs(totalCost)}</div>
          <div className="cost-metric-label">Total Pipe Cost</div>
        </div>
        <div className="cost-metric">
          <div className="cost-metric-value">{(totalLength / 1000).toFixed(2)} km</div>
          <div className="cost-metric-label">Total Length</div>
        </div>
        <div className="cost-metric">
          <div className="cost-metric-value">{totalLength > 0 ? formatINR(totalCost / (totalLength / 1000)) : '—'}</div>
          <div className="cost-metric-label">Cost / km</div>
        </div>
      </div>

      {/* Material breakdown */}
      <div className="cost-section-title">By Material</div>
      <table className="cost-table">
        <thead>
          <tr><th>Material</th><th>Pipes</th><th>Length</th><th>Cost</th></tr>
        </thead>
        <tbody>
          {Object.entries(byMaterial).map(([mat, d]) => (
            <tr key={mat}>
              <td>{MATERIAL_LABELS[mat as PipeMaterial] || mat}</td>
              <td>{d.count}</td>
              <td>{(d.length / 1000).toFixed(2)} km</td>
              <td>{formatLakhs(d.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Per-pipe breakdown */}
      <div className="cost-section-title">Per Pipe</div>
      <div className="cost-table-scroll">
        <table className="cost-table">
          <thead>
            <tr><th>ID</th><th>Dia</th><th>Mat</th><th>Length</th><th>₹/m</th><th>Total</th></tr>
          </thead>
          <tbody>
            {pipeData.sort((a, b) => b.totalCost - a.totalCost).map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.diameter}mm</td>
                <td>{p.material}</td>
                <td>{p.length.toFixed(0)}m</td>
                <td>{formatINR(p.unitCost)}</td>
                <td>{formatLakhs(p.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
