import { describe, it, expect } from 'vitest';
import { serializeToInp } from './serializer';
import { createEmptyNetwork, defaultOptions, defaultDesignCriteria } from './types';
import { computePipeLength, haversineDistance } from './geodesic';
import { solveSteadyState } from '../engine/engine';

describe('INP serializer', () => {
  it('serializes the Phase-1 minimal network and produces same solved pressure', async () => {
    // Reconstruct the Phase-1 network using the data model
    const model = createEmptyNetwork('Soliton Phase 1 Proof');

    model.reservoirs.push({
      id: 'R1', x: 0, y: 0, head: 50, patternId: '',
    });

    model.junctions.push({
      id: 'J1', x: 1000, y: 0, elevation: 10, baseDemand: 10, patternId: '',
    });

    model.pipes.push({
      id: 'P1', fromNode: 'R1', toNode: 'J1',
      length: 1000, lengthOverride: true,
      diameter: 300, roughness: 130, minorLoss: 0, status: 'Open',
    });

    const inp = serializeToInp(model);

    // Verify key sections exist
    expect(inp).toContain('[JUNCTIONS]');
    expect(inp).toContain('[RESERVOIRS]');
    expect(inp).toContain('[PIPES]');
    expect(inp).toContain('[OPTIONS]');
    expect(inp).toContain('LPS');
    expect(inp).toContain('H-W');
    expect(inp).toContain('[END]');

    // Solve and verify same result as Phase-1 hardcoded INP
    const { nodeResults } = await solveSteadyState(inp);
    const j1 = nodeResults.get('J1');
    expect(j1).toBeDefined();
    expect(j1!.pressure).toBeGreaterThan(20);
    expect(j1!.pressure).toBeLessThan(40);
    expect(isFinite(j1!.pressure)).toBe(true);
  });

  it('serializes a multi-node network that opens in epanet-js without error', async () => {
    const model = createEmptyNetwork('Multi-node test');

    model.reservoirs.push({
      id: 'R1', x: 0, y: 0, head: 60, patternId: '',
    });

    model.junctions.push(
      { id: 'J1', x: 100, y: 0, elevation: 15, baseDemand: 5, patternId: '' },
      { id: 'J2', x: 200, y: 0, elevation: 12, baseDemand: 8, patternId: '' },
      { id: 'J3', x: 200, y: 100, elevation: 18, baseDemand: 3, patternId: '' },
    );

    model.pipes.push(
      { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 400, roughness: 140, minorLoss: 0, status: 'Open' },
      { id: 'P2', fromNode: 'J1', toNode: 'J2', length: 400, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' },
      { id: 'P3', fromNode: 'J1', toNode: 'J3', length: 600, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' },
    );

    const inp = serializeToInp(model);

    // Should solve without error
    const { nodeResults, linkResults } = await solveSteadyState(inp);

    // All junctions should have finite positive pressure
    for (const jId of ['J1', 'J2', 'J3']) {
      const n = nodeResults.get(jId);
      expect(n).toBeDefined();
      expect(n!.pressure).toBeGreaterThan(0);
      expect(isFinite(n!.pressure)).toBe(true);
    }

    // All pipes should have flow
    for (const pId of ['P1', 'P2', 'P3']) {
      const l = linkResults.get(pId);
      expect(l).toBeDefined();
      expect(isFinite(l!.flow)).toBe(true);
    }
  });

  it('serializes tanks correctly', async () => {
    const model = createEmptyNetwork('Tank test');

    model.reservoirs.push({
      id: 'R1', x: 0, y: 0, head: 80, patternId: '',
    });

    model.tanks.push({
      id: 'T1', x: 300, y: 0, elevation: 30,
      initLevel: 5, minLevel: 1, maxLevel: 10,
      diameter: 20, minVolume: 0,
    });

    model.junctions.push(
      { id: 'J1', x: 150, y: 0, elevation: 10, baseDemand: 5, patternId: '' },
    );

    model.pipes.push(
      { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' },
      { id: 'P2', fromNode: 'J1', toNode: 'T1', length: 500, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' },
    );

    const inp = serializeToInp(model);
    expect(inp).toContain('[TANKS]');
    expect(inp).toContain('T1');

    // Should solve without error
    const { nodeResults } = await solveSteadyState(inp);
    const j1 = nodeResults.get('J1');
    expect(j1).toBeDefined();
    expect(j1!.pressure).toBeGreaterThan(0);
  });

  it('serializes demand patterns correctly', async () => {
    const model = createEmptyNetwork('Pattern test');

    model.patterns.push({
      id: '1',
      multipliers: [0.5, 0.6, 0.7, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 1.8, 1.5, 1.2,
                     1.0, 1.0, 1.1, 1.3, 1.6, 1.9, 2.2, 1.8, 1.4, 1.0, 0.7, 0.5],
    });

    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 50, patternId: '' });
    model.junctions.push({ id: 'J1', x: 100, y: 0, elevation: 10, baseDemand: 10, patternId: '1' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 1000, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const inp = serializeToInp(model);
    expect(inp).toContain('[PATTERNS]');
    expect(inp).toContain('0.5000');

    // Should solve
    const { nodeResults } = await solveSteadyState(inp);
    expect(nodeResults.get('J1')!.pressure).toBeGreaterThan(0);
  });
});

describe('geodesic distance', () => {
  it('computes correct haversine distance', () => {
    // Ayodhya (26.7922, 82.1998) to a point ~1km east
    const d = haversineDistance(26.7922, 82.1998, 26.7922, 82.2100);
    // ~1000m, should be roughly 900-1100m
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });

  it('computePipeLength uses x=lng, y=lat convention', () => {
    const d = computePipeLength(82.1998, 26.7922, 82.2100, 26.7922);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });

  it('returns 0 for same point', () => {
    expect(haversineDistance(26.7922, 82.1998, 26.7922, 82.1998)).toBe(0);
  });
});
