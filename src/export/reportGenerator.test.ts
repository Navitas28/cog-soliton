/**
 * TDD tests for DPR report generation.
 * Tests data preparation functions (not PDF rendering — that's visual).
 */
import { describe, it, expect } from 'vitest';
import {
  computeComplianceSummary,
  computeNRW,
  buildPipeSchedule,
  buildNodeResultsTable,
  formatLakhs,
} from './reportHelpers';
import type { NetworkModel } from '../model/types';
import { createEmptyNetwork } from '../model/types';
import type { NodeResult, LinkResult } from '../engine/engine';

// Helper: build minimal model + results
function makeModel(
  junctions: { id: string; elevation: number; baseDemand: number }[],
  pipes: { id: string; fromNode: string; toNode: string; diameter: number; length: number; material?: string }[],
  reservoirs: { id: string; head: number }[] = [],
): NetworkModel {
  const m = createEmptyNetwork('Test');
  m.junctions = junctions.map(j => ({ ...j, x: 0, y: 0, patternId: '' }));
  m.pipes = pipes.map(p => ({
    id: p.id, fromNode: p.fromNode, toNode: p.toNode,
    diameter: p.diameter, length: p.length, roughness: 140, minorLoss: 0,
    status: 'Open' as const, lengthOverride: false,
    material: (p.material || 'DI') as any,
  }));
  m.reservoirs = reservoirs.map(r => ({ id: r.id, x: 0, y: 0, head: r.head, patternId: '' }));
  return m;
}

function makeResults(
  nodeData: Record<string, NodeResult>,
  linkData: Record<string, LinkResult>,
) {
  return {
    nodeResults: new Map(Object.entries(nodeData)),
    linkResults: new Map(Object.entries(linkData)),
  };
}

const nr = (p: number, h = 0, d = 0): NodeResult => ({
  pressure: p, head: h, demand: d, tankLevel: 0,
});

const lr = (f: number, v = 0, hl = 0): LinkResult => ({
  flow: f, velocity: v, headloss: hl,
});

describe('computeComplianceSummary', () => {
  it('computes pressure pass/fail counts', () => {
    const model = makeModel(
      [{ id: 'J1', elevation: 0, baseDemand: 0.05 }, { id: 'J2', elevation: 0, baseDemand: 0.05 }],
      [],
    );
    const results = makeResults({ J1: nr(20), J2: nr(10) }, {});
    const summary = computeComplianceSummary(model, results, 17);

    expect(summary.pressurePassing).toBe(1);
    expect(summary.pressureTotal).toBe(2);
    expect(summary.pressurePct).toBeCloseTo(50, 0);
  });

  it('computes velocity pass/fail counts', () => {
    const model = makeModel(
      [],
      [
        { id: 'P1', fromNode: 'J1', toNode: 'J2', diameter: 200, length: 100 },
        { id: 'P2', fromNode: 'J2', toNode: 'J3', diameter: 200, length: 100 },
      ],
    );
    const results = makeResults({}, {
      P1: lr(10, 1.2, 0.5), // velocity 1.2 — in band
      P2: lr(5, 0.3, 0.1),  // velocity 0.3 — below min
    });
    const summary = computeComplianceSummary(model, results, 17, 0.6, 2.5);

    expect(summary.velocityPassing).toBe(1);
    expect(summary.velocityTotal).toBe(2);
  });

  it('identifies deficient junctions sorted by pressure', () => {
    const model = makeModel(
      [
        { id: 'J1', elevation: 0, baseDemand: 0 },
        { id: 'J2', elevation: 0, baseDemand: 0 },
        { id: 'J3', elevation: 0, baseDemand: 0 },
      ],
      [],
    );
    const results = makeResults({
      J1: nr(20), J2: nr(5), J3: nr(12),
    }, {});
    const summary = computeComplianceSummary(model, results, 17);

    expect(summary.deficientJunctions).toHaveLength(2);
    expect(summary.deficientJunctions[0].id).toBe('J2'); // worst first
    expect(summary.deficientJunctions[1].id).toBe('J3');
  });
});

describe('computeNRW', () => {
  it('computes NRW from reservoir input vs junction demand', () => {
    const results = makeResults(
      { R1: nr(0, 50, -10), J1: nr(20, 30, 4), J2: nr(18, 28, 3) },
      {},
    );
    // Reservoir demand is negative (outflow). Input = 10 LPS, demand = 4+3 = 7 LPS
    const nrw = computeNRW(['R1'], ['J1', 'J2'], results);
    expect(nrw.totalInput).toBeCloseTo(10, 1);
    expect(nrw.totalDemand).toBeCloseTo(7, 1);
    expect(nrw.nrwPct).toBeCloseTo(30, 0); // (10-7)/10 * 100 = 30%
  });

  it('returns 0% when no reservoirs', () => {
    const results = makeResults({ J1: nr(20, 30, 5) }, {});
    const nrw = computeNRW([], ['J1'], results);
    expect(nrw.nrwPct).toBe(0);
  });
});

describe('buildPipeSchedule', () => {
  it('builds pipe schedule with cost calculation', () => {
    const model = makeModel(
      [],
      [
        { id: 'P1', fromNode: 'J1', toNode: 'J2', diameter: 200, length: 500, material: 'DI' },
        { id: 'P2', fromNode: 'J2', toNode: 'J3', diameter: 150, length: 300, material: 'HDPE' },
      ],
    );
    const results = makeResults({}, {
      P1: lr(10, 1.2, 0.5),
      P2: lr(5, 0.8, 0.3),
    });
    const schedule = buildPipeSchedule(model, results);

    expect(schedule).toHaveLength(2);
    expect(schedule[0].id).toBe('P1');
    expect(schedule[0].diameter).toBe(200);
    expect(schedule[0].length).toBe(500);
    expect(schedule[0].flow).toBeCloseTo(10, 1);
    expect(schedule[0].velocity).toBeCloseTo(1.2, 1);
    expect(schedule[0].cost).toBeGreaterThan(0);
  });

  it('handles pipes with no results', () => {
    const model = makeModel(
      [],
      [{ id: 'P1', fromNode: 'J1', toNode: 'J2', diameter: 200, length: 500 }],
    );
    const results = makeResults({}, {});
    const schedule = buildPipeSchedule(model, results);

    expect(schedule).toHaveLength(1);
    expect(schedule[0].flow).toBe(0);
  });
});

describe('buildNodeResultsTable', () => {
  it('builds node results table with pass/fail', () => {
    const model = makeModel(
      [
        { id: 'J1', elevation: 10, baseDemand: 0.05 },
        { id: 'J2', elevation: 15, baseDemand: 0.08 },
      ],
      [],
    );
    const results = makeResults({
      J1: nr(20, 30, 0.05),
      J2: nr(12, 27, 0.08),
    }, {});
    const table = buildNodeResultsTable(model, results, 17);

    expect(table).toHaveLength(2);
    expect(table[0].id).toBe('J1');
    expect(table[0].passes).toBe(true);
    expect(table[1].id).toBe('J2');
    expect(table[1].passes).toBe(false);
  });
});

describe('formatLakhs', () => {
  it('formats crores', () => {
    expect(formatLakhs(25000000)).toBe('Rs 2.50 Cr');
  });

  it('formats lakhs', () => {
    expect(formatLakhs(500000)).toBe('Rs 5.00 L');
  });

  it('formats small amounts', () => {
    const result = formatLakhs(50000);
    expect(result).toContain('50');
  });
});
