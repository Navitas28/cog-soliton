/**
 * Scenario persistence — save/load/compare network models via localStorage.
 * No backend required.
 */
import type { NetworkModel } from '../model/types';

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  model: NetworkModel;
}

const STORAGE_KEY = 'soliton-scenarios';

function generateId(): string {
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Save current model as a named scenario */
export function saveScenario(name: string, model: NetworkModel): SavedScenario {
  const scenarios = loadScenarios();
  const scenario: SavedScenario = {
    id: generateId(),
    name,
    savedAt: new Date().toISOString(),
    model: JSON.parse(JSON.stringify(model)), // deep clone
  };
  scenarios.push(scenario);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  return scenario;
}

/** Load all saved scenarios */
export function loadScenarios(): SavedScenario[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Delete a scenario by ID */
export function deleteScenario(id: string): void {
  const scenarios = loadScenarios().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

/** Export all scenarios as JSON string (for file download) */
export function exportScenariosJson(): string {
  return JSON.stringify(loadScenarios(), null, 2);
}

/** Import scenarios from JSON string (merges with existing) */
export function importScenariosJson(json: string): void {
  try {
    const imported: SavedScenario[] = JSON.parse(json);
    if (!Array.isArray(imported)) return;
    const existing = loadScenarios();
    const existingIds = new Set(existing.map(s => s.id));
    for (const s of imported) {
      if (!existingIds.has(s.id)) existing.push(s);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // invalid JSON — ignore
  }
}
