/**
 * TDD tests for water quality and rule-based controls serialization.
 */
import { describe, it, expect } from 'vitest';
import { serializeToInp } from './serializer';
import { createEmptyNetwork } from './types';


describe('Water Quality INP serialization', () => {
  it('serializes quality type "Age" in [OPTIONS]', () => {
    const model = createEmptyNetwork();
    model.qualitySettings.type = 'Age';
    // Add minimum network for valid INP
    model.junctions.push({ id: 'J1', x: 0, y: 0, elevation: 0, baseDemand: 0, patternId: '' });
    model.reservoirs.push({ id: 'R1', x: 1, y: 1, head: 50, patternId: '' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 100, diameter: 200, roughness: 140, minorLoss: 0, status: 'Open', lengthOverride: false });

    const inp = serializeToInp(model);
    expect(inp).toContain('Quality             Age');
  });

  it('serializes quality type "Chemical" with name in [OPTIONS]', () => {
    const model = createEmptyNetwork();
    model.qualitySettings.type = 'Chemical';
    model.qualitySettings.chemicalName = 'Chlorine';
    model.qualitySettings.chemicalUnits = 'mg/L';

    const inp = serializeToInp(model);
    expect(inp).toContain('Quality             Chemical Chlorine mg/L');
  });

  it('serializes quality type "Trace" with node in [OPTIONS]', () => {
    const model = createEmptyNetwork();
    model.qualitySettings.type = 'Trace';
    model.qualitySettings.traceNodeId = 'R1';

    const inp = serializeToInp(model);
    expect(inp).toContain('Quality             Trace R1');
  });

  it('serializes [REACTIONS] section with bulk and wall coefficients', () => {
    const model = createEmptyNetwork();
    model.qualitySettings.type = 'Chemical';
    model.qualitySettings.bulkCoeff = -0.5;
    model.qualitySettings.wallCoeff = -1.0;

    const inp = serializeToInp(model);
    expect(inp).toContain('[REACTIONS]');
    expect(inp).toContain('Global Bulk');
    expect(inp).toContain('-0.5');
    expect(inp).toContain('Global Wall');
    expect(inp).toContain('-1.0');
  });

  it('serializes [SOURCES] section for chemical injection nodes', () => {
    const model = createEmptyNetwork();
    model.qualitySettings.type = 'Chemical';
    model.qualitySources.push({
      nodeId: 'R1',
      type: 'CONCEN',
      baseline: 1.0,
      patternId: '',
    });

    const inp = serializeToInp(model);
    expect(inp).toContain('[SOURCES]');
    expect(inp).toMatch(/R1\s+CONCEN\s+1\.0/);
  });

  it('keeps quality "None" when not configured', () => {
    const model = createEmptyNetwork();
    const inp = serializeToInp(model);
    expect(inp).toContain('Quality             None mg/L');
  });
});

describe('Rule-based controls INP serialization', () => {
  it('serializes a simple tank level → pump rule', () => {
    const model = createEmptyNetwork();
    model.tanks.push({ id: 'T1', x: 0, y: 0, elevation: 0, initLevel: 3, minLevel: 0, maxLevel: 6, diameter: 10, minVolume: 0 });
    model.pumps.push({ id: 'PU1', fromNode: 'R1', toNode: 'T1', power: 10, curveId: '', speed: 1, patternId: '' });
    model.rules.push({
      id: 'Rule1',
      enabled: true,
      priority: 1,
      conditions: [
        { elementId: 'T1', property: 'LEVEL', operator: 'BELOW', value: 2.0, logic: 'IF' },
      ],
      actions: [
        { elementId: 'PU1', property: 'STATUS', value: 'OPEN' },
      ],
    });

    const inp = serializeToInp(model);
    expect(inp).toContain('[RULES]');
    expect(inp).toContain('RULE Rule1');
    expect(inp).toContain('IF TANK T1 LEVEL BELOW 2');
    expect(inp).toContain('THEN PUMP PU1 STATUS IS OPEN');
    expect(inp).toContain('PRIORITY 1');
  });

  it('serializes compound rule with AND condition', () => {
    const model = createEmptyNetwork();
    model.tanks.push({ id: 'T1', x: 0, y: 0, elevation: 0, initLevel: 3, minLevel: 0, maxLevel: 6, diameter: 10, minVolume: 0 });
    model.pumps.push({ id: 'PU1', fromNode: 'R1', toNode: 'T1', power: 10, curveId: '', speed: 1, patternId: '' });
    model.rules.push({
      id: 'Rule2',
      enabled: true,
      priority: 2,
      conditions: [
        { elementId: 'T1', property: 'LEVEL', operator: 'ABOVE', value: 5.0, logic: 'IF' },
        { elementId: 'T1', property: 'LEVEL', operator: 'BELOW', value: 6.0, logic: 'AND' },
      ],
      actions: [
        { elementId: 'PU1', property: 'STATUS', value: 'CLOSED' },
      ],
    });

    const inp = serializeToInp(model);
    expect(inp).toContain('IF TANK T1 LEVEL ABOVE 5');
    expect(inp).toContain('AND TANK T1 LEVEL BELOW 6');
  });

  it('skips disabled rules', () => {
    const model = createEmptyNetwork();
    model.rules.push({
      id: 'DisabledRule',
      enabled: false,
      priority: 1,
      conditions: [
        { elementId: 'T1', property: 'LEVEL', operator: 'BELOW', value: 2.0, logic: 'IF' },
      ],
      actions: [
        { elementId: 'PU1', property: 'STATUS', value: 'OPEN' },
      ],
    });

    const inp = serializeToInp(model);
    expect(inp).not.toContain('RULE DisabledRule');
  });

  it('serializes multiple rules', () => {
    const model = createEmptyNetwork();
    model.rules.push(
      {
        id: 'R1', enabled: true, priority: 1,
        conditions: [{ elementId: 'T1', property: 'LEVEL', operator: 'BELOW', value: 2, logic: 'IF' }],
        actions: [{ elementId: 'PU1', property: 'STATUS', value: 'OPEN' }],
      },
      {
        id: 'R2', enabled: true, priority: 2,
        conditions: [{ elementId: 'T1', property: 'LEVEL', operator: 'ABOVE', value: 5, logic: 'IF' }],
        actions: [{ elementId: 'PU1', property: 'STATUS', value: 'CLOSED' }],
      },
    );

    const inp = serializeToInp(model);
    expect(inp).toContain('RULE R1');
    expect(inp).toContain('RULE R2');
  });

  it('empty rules array produces empty [RULES] section', () => {
    const model = createEmptyNetwork();
    const inp = serializeToInp(model);
    expect(inp).toContain('[RULES]');
    // Section header present but no RULE keywords
    expect(inp).not.toContain('RULE ');
  });
});
