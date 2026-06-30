import { describe, it, expect } from 'vitest';
import { buildNodeFeatures, buildLinkFeatures, buildLabelFeatures, offlineBlankStyle, countPressurePassing, countVelocityPassing } from './mapHelpers';
import { createEmptyNetwork } from '../model/types';
import { AYODHYA_OUTLINE } from '../data/ayodhyaOutline';
import type { NodeResult, LinkResult } from '../engine/engine';

describe('Phase 9 — MapLibre helpers', () => {
  it('junctions produce Point features with correct coords', () => {
    const model = createEmptyNetwork('test');
    model.junctions.push({ id: 'J1', x: 82.20, y: 26.79, elevation: 10, baseDemand: 5, patternId: '' });
    model.junctions.push({ id: 'J2', x: 82.21, y: 26.80, elevation: 15, baseDemand: 3, patternId: '' });

    const noResult = () => undefined;
    const fc = buildNodeFeatures(model, noResult, null, null, null);

    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);

    const f1 = fc.features.find(f => f.properties.id === 'J1')!;
    expect(f1.geometry.type).toBe('Point');
    expect(f1.geometry.coordinates).toEqual([82.20, 26.79]);
    expect(f1.properties.type).toBe('junction');
    expect(f1.properties.hasResult).toBe(false);
  });

  it('pipes produce LineString features', () => {
    const model = createEmptyNetwork('test');
    model.junctions.push({ id: 'J1', x: 82.20, y: 26.79, elevation: 10, baseDemand: 5, patternId: '' });
    model.reservoirs.push({ id: 'R1', x: 82.19, y: 26.80, head: 50, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const noResult = () => undefined;
    const fc = buildLinkFeatures(model, noResult, null);

    expect(fc.features).toHaveLength(1);
    const f = fc.features[0];
    expect(f.geometry.type).toBe('LineString');
    expect(f.geometry.coordinates).toEqual([[82.19, 26.80], [82.20, 26.79]]);
    expect(f.properties.type).toBe('pipe');
    expect(f.properties.closed).toBe(false);
  });

  it('result colors map correctly to properties', () => {
    const model = createEmptyNetwork('test');
    model.designCriteria.residualPressureFloor = 17;
    model.designCriteria.velocityEconomicMin = 1.0;
    model.designCriteria.velocityEconomicMax = 1.5;
    model.designCriteria.velocityMin = 0.6;
    model.designCriteria.velocityMax = 2.5;

    model.junctions.push({ id: 'J1', x: 0, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.junctions.push({ id: 'J2', x: 1, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.reservoirs.push({ id: 'R1', x: -1, y: 0, head: 50, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    // Mock results
    const nodeResults = new Map<string, NodeResult>([
      ['J1', { pressure: 20, head: 30, demand: 5, tankLevel: 0 }],   // passes 17m floor
      ['J2', { pressure: 10, head: 20, demand: 3, tankLevel: 0 }],   // fails 17m floor
    ]);
    const linkResults = new Map<string, LinkResult>([
      ['P1', { flow: 5, velocity: 1.2, headloss: 2 }],  // optimal velocity
    ]);

    const getNodeResult = (id: string) => nodeResults.get(id);
    const getLinkResult = (id: string) => linkResults.get(id);

    const nodes = buildNodeFeatures(model, getNodeResult, null, null, null);
    const j1 = nodes.features.find(f => f.properties.id === 'J1')!;
    const j2 = nodes.features.find(f => f.properties.id === 'J2')!;

    expect(j1.properties.passesPressure).toBe(true);
    expect(j2.properties.passesPressure).toBe(false);
    expect(j1.properties.hasResult).toBe(true);

    const links = buildLinkFeatures(model, getLinkResult, null);
    const p1 = links.features.find(f => f.properties.id === 'P1')!;
    expect(p1.properties.velocityStatus).toBe('optimal');
    expect(p1.properties.hasResult).toBe(true);
  });

  it('basemap style is valid MapLibre style object with CartoDB tiles', () => {
    const style = offlineBlankStyle();
    expect(style.version).toBe(8);
    expect(style.sources).toBeDefined();
    expect(style.layers).toHaveLength(1);
    expect(style.layers[0].type).toBe('raster');
    expect((style.sources as any)['carto-voyager']).toBeDefined();
  });

  it('ayodhyaOutline GeoJSON is valid FeatureCollection', () => {
    expect(AYODHYA_OUTLINE.type).toBe('FeatureCollection');
    expect(AYODHYA_OUTLINE.features.length).toBeGreaterThan(0);

    // Has boundary polygon
    const boundary = AYODHYA_OUTLINE.features.find(f => f.properties?.type === 'boundary');
    expect(boundary).toBeDefined();
    expect(boundary!.geometry.type).toBe('Polygon');

    // Has river
    const river = AYODHYA_OUTLINE.features.find(f => f.properties?.type === 'river');
    expect(river).toBeDefined();
    expect(river!.geometry.type).toBe('LineString');
  });

  it('label features at link midpoints', () => {
    const model = createEmptyNetwork('test');
    model.junctions.push({ id: 'J1', x: 0, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.reservoirs.push({ id: 'R1', x: 2, y: 4, head: 50, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const labels = buildLabelFeatures(model, () => undefined);
    expect(labels.features).toHaveLength(1);
    expect(labels.features[0].geometry.coordinates).toEqual([1, 2]); // midpoint of (2,4)→(0,0)
    expect(labels.features[0].properties?.label).toBe('P1');
  });

  it('countPressurePassing counts junctions above pressure floor', () => {
    const model = createEmptyNetwork('test');
    model.designCriteria.residualPressureFloor = 17;
    model.junctions.push(
      { id: 'J1', x: 0, y: 0, elevation: 10, baseDemand: 5, patternId: '' },
      { id: 'J2', x: 1, y: 0, elevation: 10, baseDemand: 5, patternId: '' },
      { id: 'J3', x: 2, y: 0, elevation: 10, baseDemand: 5, patternId: '' },
    );
    const results = new Map<string, NodeResult>([
      ['J1', { pressure: 20, head: 30, demand: 5, tankLevel: 0 }],
      ['J2', { pressure: 10, head: 20, demand: 3, tankLevel: 0 }],
      ['J3', { pressure: 17, head: 27, demand: 4, tankLevel: 0 }],
    ]);

    const { passing, total } = countPressurePassing(model, id => results.get(id));
    expect(total).toBe(3);
    expect(passing).toBe(2); // J1 (20>=17) and J3 (17>=17)
  });

  it('countVelocityPassing counts pipes within permissible band', () => {
    const model = createEmptyNetwork('test');
    model.designCriteria.velocityMin = 0.6;
    model.designCriteria.velocityMax = 2.5;
    model.junctions.push({ id: 'J1', x: 0, y: 0, elevation: 0, baseDemand: 0, patternId: '' });
    model.junctions.push({ id: 'J2', x: 1, y: 0, elevation: 0, baseDemand: 0, patternId: '' });
    model.pipes.push(
      { id: 'P1', fromNode: 'J1', toNode: 'J2', length: 100, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' },
      { id: 'P2', fromNode: 'J1', toNode: 'J2', length: 100, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' },
    );
    const results = new Map<string, LinkResult>([
      ['P1', { flow: 5, velocity: 1.2, headloss: 2 }],   // in band
      ['P2', { flow: 1, velocity: 0.3, headloss: 0.5 }], // outside band
    ]);

    const { passing, total } = countVelocityPassing(model, id => results.get(id));
    expect(total).toBe(2);
    expect(passing).toBe(1);
  });
});
