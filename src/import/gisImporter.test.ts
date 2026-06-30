/**
 * TDD tests for GIS importer — GeoJSON FeatureCollection → NetworkModel.
 */
import { describe, it, expect } from 'vitest';
import {
  importGeoJSON,
  deduplicateNodes,
  autoDetectMapping,
  type AttributeMapping,
} from './gisImporter';

/* ─── Helpers ─── */

function lineFeature(coords: [number, number][], props: Record<string, unknown> = {}): GeoJSON.Feature {
  return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props };
}

function pointFeature(coord: [number, number], props: Record<string, unknown> = {}): GeoJSON.Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: coord }, properties: props };
}

function fc(...features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}

/* ─── Tests ─── */

describe('importGeoJSON', () => {
  it('converts LineString features to pipes + auto-creates junction nodes at endpoints', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]]),
    );
    const result = importGeoJSON(geojson);

    expect(result.pipes).toHaveLength(1);
    expect(result.junctions.length).toBeGreaterThanOrEqual(2);
    // Pipe connects two junctions
    expect(result.pipes[0].fromNode).toBeTruthy();
    expect(result.pipes[0].toNode).toBeTruthy();
    expect(result.pipes[0].fromNode).not.toBe(result.pipes[0].toNode);
  });

  it('converts Point features to junctions with elevation', () => {
    const geojson = fc(
      pointFeature([82.0, 26.8], { ELEVATION: 25, NAME: 'Node-A' }),
    );
    const mapping: AttributeMapping = { elevation: 'ELEVATION', nodeId: 'NAME' };
    const result = importGeoJSON(geojson, mapping);

    expect(result.junctions).toHaveLength(1);
    expect(result.junctions[0].elevation).toBe(25);
    expect(result.junctions[0].id).toBe('Node-A');
  });

  it('deduplicates nodes at shared pipe endpoints within tolerance', () => {
    // Two pipes sharing a node at [82.01, 26.81]
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]]),
      lineFeature([[82.01, 26.81], [82.02, 26.82]]),
    );
    const result = importGeoJSON(geojson);

    // Should have 3 unique junctions, not 4
    expect(result.junctions).toHaveLength(3);
    expect(result.pipes).toHaveLength(2);
    // Pipes share the middle node
    expect(result.pipes[0].toNode).toBe(result.pipes[1].fromNode);
  });

  it('maps attributes: DIAMETER → diameter, ROUGHNESS → roughness', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]], { DIAMETER: 300, ROUGHNESS: 130 }),
    );
    const mapping: AttributeMapping = { diameter: 'DIAMETER', roughness: 'ROUGHNESS' };
    const result = importGeoJSON(geojson, mapping);

    expect(result.pipes[0].diameter).toBe(300);
    expect(result.pipes[0].roughness).toBe(130);
  });

  it('auto-detects common column names (case-insensitive)', () => {
    const props = { dia_mm: 200, length_m: 500, material: 'HDPE', roughness: 150 };
    const mapping = autoDetectMapping(props);

    expect(mapping.diameter).toBe('dia_mm');
    expect(mapping.length).toBe('length_m');
    expect(mapping.material).toBe('material');
    expect(mapping.roughness).toBe('roughness');
  });

  it('handles empty FeatureCollection', () => {
    const result = importGeoJSON(fc());
    expect(result.junctions).toHaveLength(0);
    expect(result.pipes).toHaveLength(0);
  });

  it('filters out non-line/point geometry types', () => {
    const polygon: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      properties: {},
    };
    const geojson = fc(
      polygon,
      lineFeature([[82.0, 26.8], [82.01, 26.81]]),
    );
    const result = importGeoJSON(geojson);

    // Polygon ignored, only line imported
    expect(result.pipes).toHaveLength(1);
    expect(result.warnings).toContain('Skipped 1 features with unsupported geometry type');
  });

  it('computes pipe length from coordinates via haversine', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]]),
    );
    const result = importGeoJSON(geojson);

    // ~1.4km between these coords
    expect(result.pipes[0].length).toBeGreaterThan(1000);
    expect(result.pipes[0].length).toBeLessThan(2000);
  });

  it('generates unique IDs for imported elements', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]]),
      lineFeature([[82.01, 26.81], [82.02, 26.82]]),
      lineFeature([[82.02, 26.82], [82.03, 26.83]]),
    );
    const result = importGeoJSON(geojson);

    const allIds = [...result.junctions.map(j => j.id), ...result.pipes.map(p => p.id)];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('preserves pipe vertices from multi-segment LineStrings', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.005, 26.805], [82.01, 26.81]]),
    );
    const result = importGeoJSON(geojson);

    expect(result.pipes).toHaveLength(1);
    // Middle point should be a vertex, not a separate node
    expect(result.pipes[0].vertices).toHaveLength(1);
    expect(result.pipes[0].vertices![0][0]).toBeCloseTo(82.005, 3);
  });

  it('uses pipe ID from attributes if available', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]], { PIPE_ID: 'P-Main-1' }),
    );
    const mapping: AttributeMapping = { pipeId: 'PIPE_ID' };
    const result = importGeoJSON(geojson, mapping);

    expect(result.pipes[0].id).toBe('P-Main-1');
  });

  it('returns import summary with counts', () => {
    const geojson = fc(
      lineFeature([[82.0, 26.8], [82.01, 26.81]]),
      lineFeature([[82.01, 26.81], [82.02, 26.82]]),
      pointFeature([82.03, 26.83], { ELEVATION: 20 }),
    );
    const result = importGeoJSON(geojson);

    expect(result.summary.pipeCount).toBe(2);
    expect(result.summary.junctionCount).toBeGreaterThanOrEqual(3); // 3 from lines + 1 from point
    expect(result.summary.skippedCount).toBe(0);
  });
});

describe('deduplicateNodes', () => {
  it('merges nodes within 1m tolerance', () => {
    const nodes = [
      { x: 82.0, y: 26.8 },
      { x: 82.00000001, y: 26.80000001 }, // ~0.001m apart — same node
      { x: 82.01, y: 26.81 }, // ~1.4km apart — different node
    ];
    const result = deduplicateNodes(nodes, 1);

    expect(result.uniqueNodes).toHaveLength(2);
    // Index mapping: 0→0, 1→0, 2→1
    expect(result.indexMap[0]).toBe(0);
    expect(result.indexMap[1]).toBe(0);
    expect(result.indexMap[2]).toBe(1);
  });
});

describe('autoDetectMapping', () => {
  it('detects diameter variations', () => {
    expect(autoDetectMapping({ DIAMETER: 200 }).diameter).toBe('DIAMETER');
    expect(autoDetectMapping({ Dia: 200 }).diameter).toBe('Dia');
    expect(autoDetectMapping({ pipe_dia: 200 }).diameter).toBe('pipe_dia');
    expect(autoDetectMapping({ DIA_MM: 200 }).diameter).toBe('DIA_MM');
  });

  it('detects elevation variations', () => {
    expect(autoDetectMapping({ ELEVATION: 25 }).elevation).toBe('ELEVATION');
    expect(autoDetectMapping({ elev: 25 }).elevation).toBe('elev');
    expect(autoDetectMapping({ ELEV_M: 25 }).elevation).toBe('ELEV_M');
  });

  it('detects ID variations', () => {
    expect(autoDetectMapping({ PIPE_ID: 'P1' }).pipeId).toBe('PIPE_ID');
    expect(autoDetectMapping({ ID: 'P1' }).pipeId).toBe('ID');
    expect(autoDetectMapping({ NAME: 'N1' }).nodeId).toBe('NAME');
    expect(autoDetectMapping({ NODE_ID: 'N1' }).nodeId).toBe('NODE_ID');
  });

  it('returns empty for unrecognized columns', () => {
    const mapping = autoDetectMapping({ foo: 1, bar: 2 });
    expect(mapping.diameter).toBeUndefined();
    expect(mapping.elevation).toBeUndefined();
  });
});
