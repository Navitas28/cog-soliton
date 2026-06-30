import { describe, it, expect } from 'vitest';
import { createBhubaneswarNetwork, BBSR_SCENARIO_LABELS } from './bhubaneswar';
import { serializeToInp } from '../model/serializer';
import { solveSteadyState } from '../engine/engine';

describe('Bhubaneswar sample network', () => {
  it('loads and solves the full-city scenario', async () => {
    const model = createBhubaneswarNetwork('full-city');

    expect(model.junctions.length).toBeGreaterThan(30);
    expect(model.pipes.length).toBeGreaterThan(30);
    expect(model.reservoirs.length).toBe(1);
    expect(model.tanks.length).toBe(2);
    expect(model.patterns.length).toBe(1);

    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    for (const j of model.junctions) {
      const nr = nodeResults.get(j.id);
      expect(nr).toBeDefined();
      expect(isFinite(nr!.pressure)).toBe(true);
    }

    // Should have deficient Khandagiri hill zone
    const deficient = model.junctions.filter(j => {
      const nr = nodeResults.get(j.id);
      return nr && nr.pressure < 17;
    });
    expect(deficient.length).toBeGreaterThan(0);

    // Should also have zones that pass
    const passing = model.junctions.filter(j => {
      const nr = nodeResults.get(j.id);
      return nr && nr.pressure >= 17;
    });
    expect(passing.length).toBeGreaterThan(0);
  });

  it('loads and solves the 3-zones scenario', async () => {
    const model = createBhubaneswarNetwork('3-zones');
    expect(model.junctions.length).toBeGreaterThan(5);

    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    for (const j of model.junctions) {
      expect(nodeResults.get(j.id)).toBeDefined();
    }
  });

  it('loads and solves the Kuakhai Phase 1 scenario', async () => {
    const model = createBhubaneswarNetwork('kuakhai-phase1');
    expect(model.junctions.length).toBeGreaterThan(2);

    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    for (const j of model.junctions) {
      expect(nodeResults.get(j.id)).toBeDefined();
    }
  });

  it('has all three scenario labels', () => {
    expect(Object.keys(BBSR_SCENARIO_LABELS)).toHaveLength(3);
    expect(BBSR_SCENARIO_LABELS['full-city']).toContain('Full City');
  });
});
