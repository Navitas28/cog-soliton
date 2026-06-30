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
