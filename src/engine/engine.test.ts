import { describe, it, expect } from 'vitest';
import { solveSteadyState } from './engine';
import { MINIMAL_INP } from './minimalInp';

describe('EPANET engine round-trip', () => {
  it('solves minimal network and returns finite positive junction pressure', async () => {
    const { nodeResults, linkResults } = await solveSteadyState(MINIMAL_INP);

    const j1 = nodeResults.get('J1');
    expect(j1).toBeDefined();
    expect(j1!.pressure).toBeGreaterThan(0);
    expect(isFinite(j1!.pressure)).toBe(true);

    // Physically: head = 50, elev = 10, so pressure < 40 (some head loss)
    expect(j1!.pressure).toBeLessThan(40);
    expect(j1!.pressure).toBeGreaterThan(20);

    const p1 = linkResults.get('P1');
    expect(p1).toBeDefined();
    // Flow should equal demand (10 LPS) in steady state with single junction
    expect(p1!.flow).toBeCloseTo(10, 0);
    expect(p1!.velocity).toBeGreaterThan(0);
  });
});
