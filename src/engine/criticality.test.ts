/**
 * TDD tests for criticality analysis engine.
 */
import { describe, it, expect } from 'vitest';
import {
  computePipeImpact,
  computeResilienceScore,
  rankByCriticality,
  type PipeImpact,
} from './criticality';

describe('computePipeImpact', () => {
  it('computes pressure drop when pipe closed', () => {
    const baselinePressures = new Map([
      ['J1', 20], ['J2', 18], ['J3', 15],
    ]);
    const withPipeClosed = new Map([
      ['J1', 20], ['J2', 10], ['J3', 5],
    ]);

    const impact = computePipeImpact('P1', baselinePressures, withPipeClosed, 17);
    expect(impact.pipeId).toBe('P1');
    expect(impact.avgPressureDrop).toBeCloseTo((0 + 8 + 10) / 3, 1);
    expect(impact.maxPressureDrop).toBe(10);
    expect(impact.maxDropNode).toBe('J3');
    expect(impact.nodesAffected).toBe(1); // J2 drops below floor (J3 was already below 17m)
  });

  it('handles no pressure change', () => {
    const pressures = new Map([['J1', 20], ['J2', 18]]);
    const impact = computePipeImpact('P1', pressures, pressures, 17);
    expect(impact.avgPressureDrop).toBe(0);
    expect(impact.nodesAffected).toBe(0);
  });
});

describe('computeResilienceScore', () => {
  it('returns 100% when no pipe causes violations', () => {
    const impacts: PipeImpact[] = [
      { pipeId: 'P1', avgPressureDrop: 1, maxPressureDrop: 2, maxDropNode: 'J1', nodesAffected: 0, solveFailed: false },
      { pipeId: 'P2', avgPressureDrop: 0.5, maxPressureDrop: 1, maxDropNode: 'J2', nodesAffected: 0, solveFailed: false },
    ];
    expect(computeResilienceScore(impacts)).toBe(100);
  });

  it('returns 50% when half of pipes cause violations', () => {
    const impacts: PipeImpact[] = [
      { pipeId: 'P1', avgPressureDrop: 1, maxPressureDrop: 2, maxDropNode: 'J1', nodesAffected: 0, solveFailed: false },
      { pipeId: 'P2', avgPressureDrop: 5, maxPressureDrop: 10, maxDropNode: 'J2', nodesAffected: 3, solveFailed: false },
    ];
    expect(computeResilienceScore(impacts)).toBe(50);
  });

  it('returns 0 for empty', () => {
    expect(computeResilienceScore([])).toBe(0);
  });
});

describe('rankByCriticality', () => {
  it('sorts by nodesAffected descending, then avgPressureDrop', () => {
    const impacts: PipeImpact[] = [
      { pipeId: 'P1', avgPressureDrop: 1, maxPressureDrop: 2, maxDropNode: 'J1', nodesAffected: 0, solveFailed: false },
      { pipeId: 'P2', avgPressureDrop: 5, maxPressureDrop: 10, maxDropNode: 'J2', nodesAffected: 3, solveFailed: false },
      { pipeId: 'P3', avgPressureDrop: 8, maxPressureDrop: 12, maxDropNode: 'J3', nodesAffected: 3, solveFailed: false },
    ];
    const ranked = rankByCriticality(impacts);
    expect(ranked[0].pipeId).toBe('P3'); // same nodesAffected, higher avgDrop
    expect(ranked[1].pipeId).toBe('P2');
    expect(ranked[2].pipeId).toBe('P1');
  });
});
