import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEmptyNetwork } from '../model/types';

// Dynamic import — scenarioStore doesn't exist yet
async function getScenarioStore() {
  return import('./scenarioStore');
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Phase 12 — Scenario Comparison', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('saveScenario stores model in localStorage', async () => {
    const { saveScenario, loadScenarios } = await getScenarioStore();

    const model = createEmptyNetwork('Test Scenario');
    model.junctions.push({ id: 'J1', x: 0, y: 0, elevation: 10, baseDemand: 5, patternId: '' });

    saveScenario('My Scenario', model);

    const scenarios = loadScenarios();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe('My Scenario');
    expect(scenarios[0].model.junctions).toHaveLength(1);
  });

  it('loadScenarios retrieves saved scenarios', async () => {
    const { saveScenario, loadScenarios } = await getScenarioStore();

    const m1 = createEmptyNetwork('S1');
    const m2 = createEmptyNetwork('S2');

    saveScenario('Scenario A', m1);
    saveScenario('Scenario B', m2);

    const scenarios = loadScenarios();
    expect(scenarios).toHaveLength(2);
    expect(scenarios.map(s => s.name)).toContain('Scenario A');
    expect(scenarios.map(s => s.name)).toContain('Scenario B');
  });

  it('deleteScenario removes from localStorage', async () => {
    const { saveScenario, loadScenarios, deleteScenario } = await getScenarioStore();

    const model = createEmptyNetwork('Delete Me');
    saveScenario('Delete Me', model);

    let scenarios = loadScenarios();
    expect(scenarios).toHaveLength(1);

    deleteScenario(scenarios[0].id);

    scenarios = loadScenarios();
    expect(scenarios).toHaveLength(0);
  });

  it('saved scenario survives JSON round-trip', async () => {
    const { saveScenario, loadScenarios } = await getScenarioStore();

    const model = createEmptyNetwork('JSON Test');
    model.junctions.push({ id: 'J1', x: 82.20, y: 26.79, elevation: 15, baseDemand: 8.5, patternId: '1' });
    model.pipes.push({ id: 'P1', fromNode: 'R1', toNode: 'J1', length: 500, lengthOverride: true, diameter: 300, roughness: 130, minorLoss: 0, status: 'Open' });

    saveScenario('JSON Test', model);

    // Simulate browser refresh — clear module cache and reload from localStorage
    const scenarios = loadScenarios();
    const loaded = scenarios[0].model;

    expect(loaded.junctions[0].id).toBe('J1');
    expect(loaded.junctions[0].x).toBeCloseTo(82.20, 2);
    expect(loaded.junctions[0].baseDemand).toBeCloseTo(8.5, 1);
    expect(loaded.pipes[0].diameter).toBe(300);
  });

  it('export scenarios as JSON content is valid', async () => {
    const { saveScenario, exportScenariosJson } = await getScenarioStore();

    const model = createEmptyNetwork('Export Test');
    saveScenario('Export Test', model);

    const json = exportScenariosJson();
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Export Test');
  });

  it('import scenarios from JSON', async () => {
    const { importScenariosJson, loadScenarios } = await getScenarioStore();

    const json = JSON.stringify([{
      id: 'test-id',
      name: 'Imported',
      savedAt: new Date().toISOString(),
      model: createEmptyNetwork('Imported'),
    }]);

    importScenariosJson(json);

    const scenarios = loadScenarios();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe('Imported');
  });
});
