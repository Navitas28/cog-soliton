import { describe, it, expect } from 'vitest';
import { buildNodeFeatures } from './mapHelpers';
import { createEmptyNetwork } from '../model/types';
import { computePressureRange, computeFlowRange } from './ColorLegend';
import type { NodeResult } from '../engine/engine';

describe('Digital Twin — heatmap + legend + layer helpers', () => {
  it('heatmap GeoJSON has pressure weights for all junctions with results', () => {
    const model = createEmptyNetwork('test');
    model.junctions.push({ id: 'J1', x: 82.20, y: 26.79, elevation: 10, baseDemand: 5, patternId: '' });
    model.junctions.push({ id: 'J2', x: 82.21, y: 26.80, elevation: 15, baseDemand: 3, patternId: '' });
    model.reservoirs.push({ id: 'R1', x: 82.19, y: 26.81, head: 50, patternId: '' });

    const nodeResults = new Map<string, NodeResult>([
      ['J1', { pressure: 25, head: 35, demand: 5, tankLevel: 0 }],
      ['J2', { pressure: 12, head: 27, demand: 3, tankLevel: 0 }],
    ]);
    const getNodeResult = (id: string) => nodeResults.get(id);

    const fc = buildNodeFeatures(model, getNodeResult, null, null, null);

    // All junctions + reservoir = 3 features
    expect(fc.features).toHaveLength(3);

    // Junctions with results have pressure values suitable for heatmap weight
    const j1 = fc.features.find(f => f.properties.id === 'J1')!;
    const j2 = fc.features.find(f => f.properties.id === 'J2')!;
    expect(j1.properties.hasResult).toBe(true);
    expect(j1.properties.pressure).toBe(25);
    expect(j2.properties.hasResult).toBe(true);
    expect(j2.properties.pressure).toBe(12);

    // Reservoir has no result
    const r1 = fc.features.find(f => f.properties.id === 'R1')!;
    expect(r1.properties.hasResult).toBe(false);
    expect(r1.properties.pressure).toBe(0);
  });

  it('color legend computes correct min/max from solve results', () => {
    const junctions = [{ id: 'J1' }, { id: 'J2' }, { id: 'J3' }];
    const nodeResults = new Map<string, { pressure: number }>([
      ['J1', { pressure: 22.3 }],
      ['J2', { pressure: 8.7 }],
      ['J3', { pressure: 35.1 }],
    ]);
    const getNodeResult = (id: string) => nodeResults.get(id);

    const range = computePressureRange({ junctions }, getNodeResult);
    expect(range.min).toBe(8);  // floor(8.7)
    expect(range.max).toBe(36); // ceil(35.1)
  });

  it('color legend returns default range when no results', () => {
    const range = computePressureRange({ junctions: [{ id: 'J1' }] }, () => undefined);
    expect(range.min).toBe(0);
    expect(range.max).toBe(40);
  });

  it('flow range computes from pipe results', () => {
    const pipes = [{ id: 'P1' }, { id: 'P2' }];
    const linkResults = new Map<string, { flow: number }>([
      ['P1', { flow: 15.3 }],
      ['P2', { flow: -8.2 }], // negative flow = reverse direction
    ]);
    const getLinkResult = (id: string) => linkResults.get(id);

    const range = computeFlowRange(pipes, getLinkResult);
    expect(range.min).toBe(0);
    expect(range.max).toBe(16); // ceil(15.3)
  });

  it('monitored flag set for nodes in monitoredNodeIds set', () => {
    const model = createEmptyNetwork('test');
    model.junctions.push({ id: 'J1', x: 0, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.junctions.push({ id: 'J2', x: 1, y: 1, elevation: 10, baseDemand: 5, patternId: '' });

    const monitored = new Set(['J1']);
    const fc = buildNodeFeatures(model, () => undefined, null, null, null, monitored);

    const j1 = fc.features.find(f => f.properties.id === 'J1')!;
    const j2 = fc.features.find(f => f.properties.id === 'J2')!;
    expect(j1.properties.monitored).toBe(true);
    expect(j2.properties.monitored).toBe(false);
  });
});
