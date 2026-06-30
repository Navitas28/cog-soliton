/**
 * TDD tests for DMA zoning and isolation analysis.
 */
import { describe, it, expect } from 'vitest';
import {
  assignNodesToZones,
  computeZoneStats,
  findAffectedNodes,
  computeIsolationImpact,
  type Zone,
} from './zoning';
import type { NetworkModel } from './types';
import { createEmptyNetwork } from './types';
import type { NodeResult, LinkResult, SteadyStateResult } from '../engine/engine';

/* ─── Helpers ─── */

function makeModel(): NetworkModel {
  const m = createEmptyNetwork('Test');
  m.junctions = [
    { id: 'J1', x: 0, y: 0, elevation: 10, baseDemand: 0.05, patternId: '' },
    { id: 'J2', x: 1, y: 0, elevation: 15, baseDemand: 0.08, patternId: '' },
    { id: 'J3', x: 2, y: 0, elevation: 12, baseDemand: 0.06, patternId: '' },
    { id: 'J4', x: 0, y: 1, elevation: 10, baseDemand: 0.04, patternId: '' },
    { id: 'J5', x: 1, y: 1, elevation: 14, baseDemand: 0.07, patternId: '' },
  ];
  m.reservoirs = [{ id: 'R1', x: -1, y: 0, head: 50, patternId: '' }];
  m.pipes = [
    { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    { id: 'P2', fromNode: 'J1', toNode: 'J2', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    { id: 'P3', fromNode: 'J2', toNode: 'J3', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    { id: 'P4', fromNode: 'J1', toNode: 'J4', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    { id: 'P5', fromNode: 'J4', toNode: 'J5', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    { id: 'P6', fromNode: 'J2', toNode: 'J5', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
  ];
  return m;
}

function makeResults(): SteadyStateResult {
  return {
    nodeResults: new Map<string, NodeResult>([
      ['R1', { pressure: 0, head: 50, demand: -0.5, tankLevel: 0 }],
      ['J1', { pressure: 40, head: 50, demand: 0.05, tankLevel: 0 }],
      ['J2', { pressure: 35, head: 50, demand: 0.08, tankLevel: 0 }],
      ['J3', { pressure: 30, head: 42, demand: 0.06, tankLevel: 0 }],
      ['J4', { pressure: 38, head: 48, demand: 0.04, tankLevel: 0 }],
      ['J5', { pressure: 33, head: 47, demand: 0.07, tankLevel: 0 }],
    ]),
    linkResults: new Map<string, LinkResult>([
      ['P1', { flow: 0.3, velocity: 1.0, headloss: 0.5 }],
      ['P2', { flow: 0.15, velocity: 0.8, headloss: 0.3 }],
      ['P3', { flow: 0.06, velocity: 0.4, headloss: 0.2 }],
      ['P4', { flow: 0.1, velocity: 0.6, headloss: 0.3 }],
      ['P5', { flow: 0.04, velocity: 0.3, headloss: 0.1 }],
      ['P6', { flow: 0.07, velocity: 0.5, headloss: 0.2 }],
    ]),
  };
}

/* ─── Tests ─── */

describe('assignNodesToZones', () => {
  it('assigns nodes to specified zones', () => {
    const zones: Zone[] = [
      { id: 'Z1', name: 'Zone A', color: '#ff0000', nodeIds: ['J1', 'J2', 'J3'] },
      { id: 'Z2', name: 'Zone B', color: '#00ff00', nodeIds: ['J4', 'J5'] },
    ];
    const assignment = assignNodesToZones(zones);

    expect(assignment.get('J1')).toBe('Z1');
    expect(assignment.get('J4')).toBe('Z2');
    expect(assignment.get('J5')).toBe('Z2');
  });

  it('handles nodes not in any zone', () => {
    const zones: Zone[] = [
      { id: 'Z1', name: 'Zone A', color: '#ff0000', nodeIds: ['J1'] },
    ];
    const assignment = assignNodesToZones(zones);

    expect(assignment.get('J1')).toBe('Z1');
    expect(assignment.has('J2')).toBe(false);
  });
});

describe('computeZoneStats', () => {
  it('computes demand for a zone', () => {
    const model = makeModel();
    const results = makeResults();
    const zone: Zone = { id: 'Z1', name: 'Zone A', color: '#ff0000', nodeIds: ['J1', 'J2'] };

    const stats = computeZoneStats(zone, model, results);
    expect(stats.totalDemand).toBeCloseTo(0.05 + 0.08, 4);
    expect(stats.nodeCount).toBe(2);
  });

  it('identifies boundary pipes (pipes crossing zone edges)', () => {
    const model = makeModel();
    const results = makeResults();
    const zone: Zone = { id: 'Z1', name: 'Zone A', color: '#ff0000', nodeIds: ['J1', 'J2', 'J3'] };
    const zoneAssignment = new Map([['J1', 'Z1'], ['J2', 'Z1'], ['J3', 'Z1'], ['J4', 'Z2'], ['J5', 'Z2']]);

    const stats = computeZoneStats(zone, model, results, zoneAssignment);
    // P4 (J1→J4) and P6 (J2→J5) cross zone boundary
    expect(stats.boundaryPipes).toContain('P4');
    expect(stats.boundaryPipes).toContain('P6');
    // P2 (J1→J2) is internal
    expect(stats.boundaryPipes).not.toContain('P2');
  });

  it('computes inflow from boundary pipes', () => {
    const model = makeModel();
    const results = makeResults();
    const zone: Zone = { id: 'Z1', name: 'Zone A', color: '#ff0000', nodeIds: ['J1', 'J2', 'J3'] };
    const zoneAssignment = new Map([['J1', 'Z1'], ['J2', 'Z1'], ['J3', 'Z1']]);

    const stats = computeZoneStats(zone, model, results, zoneAssignment);
    // P1 (R1→J1) is inflow from reservoir (R1 not in any zone)
    expect(stats.inflow).toBeGreaterThan(0);
  });
});

describe('findAffectedNodes', () => {
  it('finds nodes disconnected when a pipe is closed', () => {
    const model = makeModel();
    // Close P4 (J1→J4): J4 still reachable via J5→P6→J2→P2→J1→P1→R1
    const affected = findAffectedNodes(model, 'P4', ['R1']);
    // All nodes still reachable via alternate paths
    expect(affected).toHaveLength(0);
  });

  it('finds disconnected nodes in linear network', () => {
    const m = createEmptyNetwork('Linear');
    m.reservoirs = [{ id: 'R1', x: 0, y: 0, head: 50, patternId: '' }];
    m.junctions = [
      { id: 'J1', x: 1, y: 0, elevation: 10, baseDemand: 0.05, patternId: '' },
      { id: 'J2', x: 2, y: 0, elevation: 15, baseDemand: 0.08, patternId: '' },
    ];
    m.pipes = [
      { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
      { id: 'P2', fromNode: 'J1', toNode: 'J2', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    ];
    // Close P2: J2 disconnected from R1
    const affected = findAffectedNodes(m, 'P2', ['R1']);
    expect(affected).toContain('J2');
    expect(affected).not.toContain('J1');
  });

  it('closing source pipe disconnects everything downstream', () => {
    const m = createEmptyNetwork('Linear');
    m.reservoirs = [{ id: 'R1', x: 0, y: 0, head: 50, patternId: '' }];
    m.junctions = [
      { id: 'J1', x: 1, y: 0, elevation: 10, baseDemand: 0.05, patternId: '' },
      { id: 'J2', x: 2, y: 0, elevation: 15, baseDemand: 0.08, patternId: '' },
    ];
    m.pipes = [
      { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
      { id: 'P2', fromNode: 'J1', toNode: 'J2', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false },
    ];
    // Close P1: both J1 and J2 disconnected
    const affected = findAffectedNodes(m, 'P1', ['R1']);
    expect(affected).toContain('J1');
    expect(affected).toContain('J2');
  });
});

describe('computeIsolationImpact', () => {
  it('computes population affected by pipe closure', () => {
    const model = makeModel();
    const affected = ['J1', 'J2'];
    const impact = computeIsolationImpact(affected, model);

    expect(impact.affectedNodeCount).toBe(2);
    expect(impact.affectedDemand).toBeCloseTo(0.05 + 0.08, 4);
  });

  it('returns zero for empty affected list', () => {
    const model = makeModel();
    const impact = computeIsolationImpact([], model);
    expect(impact.affectedNodeCount).toBe(0);
    expect(impact.affectedDemand).toBe(0);
  });
});
