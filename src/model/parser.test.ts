import { describe, it, expect } from 'vitest';
import { serializeToInp } from './serializer';
import { createEmptyNetwork } from './types';
import { solveSteadyState } from '../engine/engine';
import { createAyodhyaNetwork } from '../data/ayodhya';

// parseInpFile will be implemented — dynamic import
async function getParser() {
  return import('./parser');
}

describe('Phase 11 — INP Parser', () => {
  it('parse minimal INP: 1 reservoir, 1 junction, 1 pipe', async () => {
    const { parseInpFile } = await getParser();

    const model = createEmptyNetwork('Minimal');
    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 50, patternId: '' });
    model.junctions.push({ id: 'J1', x: 100, y: 0, elevation: 10, baseDemand: 10, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 1000, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const inp = serializeToInp(model);
    const parsed = parseInpFile(inp);

    expect(parsed.junctions).toHaveLength(1);
    expect(parsed.reservoirs).toHaveLength(1);
    expect(parsed.pipes).toHaveLength(1);
    expect(parsed.junctions[0].id).toBe('J1');
    expect(parsed.junctions[0].elevation).toBe(10);
    expect(parsed.junctions[0].baseDemand).toBe(10);
    expect(parsed.pipes[0].diameter).toBe(300);
  });

  it('parse INP with patterns: multipliers loaded correctly', async () => {
    const { parseInpFile } = await getParser();

    const model = createEmptyNetwork('Patterns');
    model.patterns.push({ id: '1', multipliers: [0.5, 1.0, 1.5, 2.0, 2.5, 1.0, 0.5, 1.0, 1.5, 2.0, 2.5, 1.0, 0.5, 1.0, 1.5, 2.0, 2.5, 1.0, 0.5, 1.0, 1.5, 2.0, 2.5, 1.0] });
    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 50, patternId: '' });
    model.junctions.push({ id: 'J1', x: 100, y: 0, elevation: 10, baseDemand: 10, patternId: '1' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 1000, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const inp = serializeToInp(model);
    const parsed = parseInpFile(inp);

    expect(parsed.patterns).toHaveLength(1);
    expect(parsed.patterns[0].id).toBe('1');
    expect(parsed.patterns[0].multipliers).toHaveLength(24);
    expect(parsed.patterns[0].multipliers[0]).toBeCloseTo(0.5, 2);
    expect(parsed.patterns[0].multipliers[3]).toBeCloseTo(2.0, 2);
  });

  it('parse INP with tanks: all fields populated', async () => {
    const { parseInpFile } = await getParser();

    const model = createEmptyNetwork('Tanks');
    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 80, patternId: '' });
    model.tanks.push({ id: 'T1', x: 300, y: 0, elevation: 30, initLevel: 5, minLevel: 1, maxLevel: 10, diameter: 20, minVolume: 0 });
    model.junctions.push({ id: 'J1', x: 150, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.pipes.push(
      { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' },
      { id: 'P2', fromNode: 'J1', toNode: 'T1', length: 500, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' },
    );

    const inp = serializeToInp(model);
    const parsed = parseInpFile(inp);

    expect(parsed.tanks).toHaveLength(1);
    expect(parsed.tanks[0].elevation).toBe(30);
    expect(parsed.tanks[0].initLevel).toBe(5);
    expect(parsed.tanks[0].maxLevel).toBe(10);
    expect(parsed.tanks[0].diameter).toBe(20);
  });

  it('parse INP with coordinates: node x/y set', async () => {
    const { parseInpFile } = await getParser();

    const model = createEmptyNetwork('Coords');
    model.reservoirs.push({ id: 'R1', x: 82.19, y: 26.80, head: 50, patternId: '' });
    model.junctions.push({ id: 'J1', x: 82.20, y: 26.79, elevation: 10, baseDemand: 5, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 1000, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const inp = serializeToInp(model);
    const parsed = parseInpFile(inp);

    expect(parsed.reservoirs[0].x).toBeCloseTo(82.19, 2);
    expect(parsed.reservoirs[0].y).toBeCloseTo(26.80, 2);
    expect(parsed.junctions[0].x).toBeCloseTo(82.20, 2);
  });

  it('round-trip: serialize → parse → serialize produces functionally equivalent INP', async () => {
    const { parseInpFile } = await getParser();

    const model = createEmptyNetwork('RoundTrip');
    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 50, patternId: '' });
    model.junctions.push(
      { id: 'J1', x: 100, y: 0, elevation: 10, baseDemand: 5, patternId: '' },
      { id: 'J2', x: 200, y: 100, elevation: 15, baseDemand: 8, patternId: '' },
    );
    model.pipes.push(
      { id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' },
      { id: 'P2', fromNode: 'J1', toNode: 'J2', length: 400, lengthOverride: true, diameter: 250, roughness: 140, minorLoss: 0, status: 'Open' },
    );

    const inp1 = serializeToInp(model);
    const parsed = parseInpFile(inp1);
    const inp2 = serializeToInp(parsed);

    // Both should solve to same result
    const result1 = await solveSteadyState(inp1);
    const result2 = await solveSteadyState(inp2);

    const j1p1 = result1.nodeResults.get('J1')!.pressure;
    const j1p2 = result2.nodeResults.get('J1')!.pressure;
    expect(j1p2).toBeCloseTo(j1p1, 1);
  });

  it('round-trip: Ayodhya network survives serialize → parse → solve', async () => {
    const { parseInpFile } = await getParser();

    const ayodhya = createAyodhyaNetwork('11-wards');
    // Use steady-state for faster test
    const ssModel = { ...ayodhya, options: { ...ayodhya.options, duration: 0 } };
    const inp = serializeToInp(ssModel);
    const parsed = parseInpFile(inp);

    // Should have same element counts
    expect(parsed.junctions.length).toBe(ssModel.junctions.length);
    expect(parsed.pipes.length).toBe(ssModel.pipes.length);
    expect(parsed.reservoirs.length).toBe(ssModel.reservoirs.length);
    expect(parsed.tanks.length).toBe(ssModel.tanks.length);

    // Re-serialize and solve
    const inp2 = serializeToInp(parsed);
    const result = await solveSteadyState(inp2);

    // All junctions should have results
    for (const j of parsed.junctions) {
      expect(result.nodeResults.get(j.id)).toBeDefined();
    }
  });
});

describe('Phase 11 — Pipe Vertices in serializer', () => {
  it('pipe with vertices serializes [VERTICES] section correctly', async () => {
    const model = createEmptyNetwork('Vertices');
    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 50, patternId: '' });
    model.junctions.push({ id: 'J1', x: 100, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.pipes.push({
      id: 'P1', fromNode: 'R1', toNode: 'J1', length: 1000, lengthOverride: true,
      diameter: 300, roughness: 130, minorLoss: 0, status: 'Open',
      vertices: [[30, 10], [60, -5]],
    });

    const inp = serializeToInp(model);
    expect(inp).toContain('[VERTICES]');
    expect(inp).toContain('P1');
    expect(inp).toContain('30.0000');
    expect(inp).toContain('10.0000');
    expect(inp).toContain('60.0000');
  });

  it('pipe without vertices produces empty [VERTICES]', () => {
    const model = createEmptyNetwork('NoVertices');
    model.reservoirs.push({ id: 'R1', x: 0, y: 0, head: 50, patternId: '' });
    model.junctions.push({ id: 'J1', x: 100, y: 0, elevation: 10, baseDemand: 5, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 1000, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    const inp = serializeToInp(model);
    // [VERTICES] section exists but has no data lines (only comment header)
    const verticesIdx = inp.indexOf('[VERTICES]');
    expect(verticesIdx).toBeGreaterThan(-1);
    const afterVertices = inp.substring(verticesIdx + '[VERTICES]'.length);
    const nextSection = afterVertices.indexOf('[');
    const verticesContent = afterVertices.substring(0, nextSection).trim();
    // Should only have the comment header, no actual vertex data
    const dataLines = verticesContent.split('\n').filter(l => l.trim() && !l.trim().startsWith(';'));
    expect(dataLines).toHaveLength(0);
  });
});
