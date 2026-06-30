import { describe, it, expect } from 'vitest';
import { createRanchiNetwork, RANCHI_SCENARIO_LABELS } from './ranchi';
import { serializeToInp } from '../model/serializer';
import { solveSteadyState } from '../engine/engine';

describe('Ranchi sample network', () => {
  it('loads and solves the full-city scenario', async () => {
    const model = createRanchiNetwork('full-city');
    expect(model.junctions.length).toBeGreaterThan(25);
    expect(model.pipes.length).toBeGreaterThan(25);
    expect(model.reservoirs.length).toBe(1);
    expect(model.tanks.length).toBe(2);

    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    for (const j of model.junctions) {
      const nr = nodeResults.get(j.id);
      expect(nr).toBeDefined();
      expect(isFinite(nr!.pressure)).toBe(true);
    }

    // Ratu Road should be deficient
    const deficient = model.junctions.filter(j => {
      const nr = nodeResults.get(j.id);
      return nr && nr.pressure < 17;
    });
    expect(deficient.length).toBeGreaterThan(0);

    const passing = model.junctions.filter(j => {
      const nr = nodeResults.get(j.id);
      return nr && nr.pressure >= 17;
    });
    expect(passing.length).toBeGreaterThan(0);
  });

  it('loads and solves the core-4 scenario', async () => {
    const model = createRanchiNetwork('core-4');
    expect(model.junctions.length).toBeGreaterThan(5);
    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const { nodeResults } = await solveSteadyState(serializeToInp(ssModel));
    for (const j of model.junctions) expect(nodeResults.get(j.id)).toBeDefined();
  });

  it('loads and solves the Rukka Phase 1 scenario', async () => {
    const model = createRanchiNetwork('rukka-phase1');
    expect(model.junctions.length).toBeGreaterThan(2);
    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const { nodeResults } = await solveSteadyState(serializeToInp(ssModel));
    for (const j of model.junctions) expect(nodeResults.get(j.id)).toBeDefined();
  });

  it('has all three scenario labels', () => {
    expect(Object.keys(RANCHI_SCENARIO_LABELS)).toHaveLength(3);
  });
});
