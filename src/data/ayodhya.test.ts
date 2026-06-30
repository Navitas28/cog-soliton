import { describe, it, expect } from 'vitest';
import { createAyodhyaNetwork, SCENARIO_LABELS } from './ayodhya';
import { serializeToInp } from '../model/serializer';
import { solveSteadyState } from '../engine/engine';

describe('Phase 5 — Ayodhya sample network', () => {
  it('loads and solves the 11-wards scenario', async () => {
    const model = createAyodhyaNetwork('11-wards');

    expect(model.junctions.length).toBeGreaterThan(30);
    expect(model.pipes.length).toBeGreaterThan(30);
    expect(model.reservoirs.length).toBe(1);
    expect(model.tanks.length).toBe(2);
    expect(model.patterns.length).toBe(1);

    // Serialize and solve (steady-state for speed)
    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    // All junctions should have results
    for (const j of model.junctions) {
      const nr = nodeResults.get(j.id);
      expect(nr).toBeDefined();
      expect(isFinite(nr!.pressure)).toBe(true);
    }

    // Should have some deficient zones (pressure below 17m floor)
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

  it('loads and solves the 4-DMAs scenario', async () => {
    const model = createAyodhyaNetwork('4-dmas');
    expect(model.junctions.length).toBeGreaterThan(5);

    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    for (const j of model.junctions) {
      expect(nodeResults.get(j.id)).toBeDefined();
    }
  });

  it('loads and solves the Saryu Phase 1 scenario', async () => {
    const model = createAyodhyaNetwork('saryu-phase1');
    expect(model.junctions.length).toBeGreaterThan(2);

    const ssModel = { ...model, options: { ...model.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const { nodeResults } = await solveSteadyState(inp);

    for (const j of model.junctions) {
      expect(nodeResults.get(j.id)).toBeDefined();
    }
  });

  it('has all three scenario labels', () => {
    expect(Object.keys(SCENARIO_LABELS)).toHaveLength(3);
    expect(SCENARIO_LABELS['11-wards']).toContain('11 wards');
  });
});
