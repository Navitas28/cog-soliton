/**
 * Zustand store for the network model and application state.
 * Single source of truth for the network, solver results, and UI state.
 */
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { NetworkModel, Junction, Reservoir, Pipe, Tank, Pump, Valve, DemandPattern, SimulationOptions, DesignCriteria } from '../model/types';
import { createEmptyNetwork } from '../model/types';
import { serializeToInp } from '../model/serializer';
import { solveSteadyState, solveEPS } from '../engine/engine';
import type { SteadyStateResult, EPSResults, NodeResult, LinkResult } from '../engine/engine';
import { computePipeLength } from '../model/geodesic';

export type DrawingTool = 'select' | 'reservoir' | 'junction' | 'pipe' | 'tank' | 'pump' | 'valve';

interface NetworkState {
  model: NetworkModel;

  // UI state
  activeTool: DrawingTool;
  selectedElementId: string | null;
  selectedElementType: 'junction' | 'reservoir' | 'pipe' | 'tank' | 'pump' | 'valve' | null;
  pipeDrawingFrom: string | null;

  // Solver results
  solveResult: SteadyStateResult | null;
  epsResult: EPSResults | null;
  solveError: string | null;
  isSolving: boolean;
  lastInp: string | null;

  // EPS time slider
  epsTimeIndex: number; // index into epsResult.timestamps

  // View panels
  showResultsDashboard: boolean;
  showScenarioPanel: boolean;

  // ID counters
  nextId: { [prefix: string]: number };

  // Actions — elements
  setActiveTool: (tool: DrawingTool) => void;
  selectElement: (id: string | null, type: NetworkState['selectedElementType']) => void;
  addJunction: (x: number, y: number) => string;
  addReservoir: (x: number, y: number) => string;
  addTank: (x: number, y: number) => string;
  addPipe: (fromNode: string, toNode: string) => string;
  addPump: (fromNode: string, toNode: string) => string;
  addValve: (fromNode: string, toNode: string) => string;
  updateJunction: (id: string, updates: Partial<Junction>) => void;
  updateReservoir: (id: string, updates: Partial<Reservoir>) => void;
  updatePipe: (id: string, updates: Partial<Pipe>) => void;
  updateTank: (id: string, updates: Partial<Tank>) => void;
  updatePump: (id: string, updates: Partial<Pump>) => void;
  updateValve: (id: string, updates: Partial<Valve>) => void;
  moveNode: (id: string, x: number, y: number) => void;
  deleteElement: (id: string, type: string) => void;

  // Actions — patterns
  addPattern: (pattern: DemandPattern) => void;
  updatePattern: (id: string, multipliers: number[]) => void;
  deletePattern: (id: string) => void;

  // Actions — options & criteria
  updateOptions: (updates: Partial<SimulationOptions>) => void;
  updateDesignCriteria: (updates: Partial<DesignCriteria>) => void;

  // Actions — solver
  solve: () => Promise<void>;
  setEpsTimeIndex: (index: number) => void;

  // Actions — model
  loadModel: (model: NetworkModel) => void;
  clearResults: () => void;
  setPipeDrawingFrom: (nodeId: string | null) => void;
  setShowResultsDashboard: (show: boolean) => void;
  setShowScenarioPanel: (show: boolean) => void;

  // Derived helpers
  getNodeResultAtTime: (nodeId: string) => NodeResult | undefined;
  getLinkResultAtTime: (linkId: string) => LinkResult | undefined;
}

/**
 * Generate next ID for a prefix. Returns [id, updatedCounters].
 * Does NOT mutate the input object.
 */
function generateId(prefix: string, nextId: { [prefix: string]: number }): [string, { [prefix: string]: number }] {
  const num = nextId[prefix] || 1;
  return [`${prefix}${num}`, { ...nextId, [prefix]: num + 1 }];
}

function findNode(model: NetworkModel, id: string): { x: number; y: number } | undefined {
  return model.junctions.find(n => n.id === id)
    || model.reservoirs.find(n => n.id === id)
    || model.tanks.find(n => n.id === id);
}

function recomputePipeLengths(model: NetworkModel, nodeId: string) {
  for (const pipe of model.pipes) {
    if (pipe.lengthOverride) continue;
    if (pipe.fromNode === nodeId || pipe.toNode === nodeId) {
      const from = findNode(model, pipe.fromNode);
      const to = findNode(model, pipe.toNode);
      if (from && to) {
        pipe.length = Math.max(1, computePipeLength(from.x, from.y, to.x, to.y));
      }
    }
  }
}

function recalcNextIds(model: NetworkModel): { [prefix: string]: number } {
  const nextId: { [p: string]: number } = { J: 1, R: 1, P: 1, T: 1, PU: 1, V: 1 };
  const bump = (prefix: string, id: string) => {
    const n = parseInt(id.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n >= nextId[prefix]) nextId[prefix] = n + 1;
  };
  model.junctions.forEach(j => bump('J', j.id));
  model.reservoirs.forEach(r => bump('R', r.id));
  model.pipes.forEach(p => bump('P', p.id));
  model.tanks.forEach(t => bump('T', t.id));
  model.pumps.forEach(p => bump('PU', p.id));
  model.valves.forEach(v => bump('V', v.id));
  return nextId;
}

export const useNetworkStore = create<NetworkState>()(
  temporal(
    (set, get) => ({
  model: createEmptyNetwork('Soliton Network'),
  activeTool: 'select',
  selectedElementId: null,
  selectedElementType: null,
  pipeDrawingFrom: null,
  solveResult: null,
  epsResult: null,
  solveError: null,
  isSolving: false,
  lastInp: null,
  epsTimeIndex: 0,
  showResultsDashboard: false,
  showScenarioPanel: false,
  nextId: { J: 1, R: 1, P: 1, T: 1, PU: 1, V: 1 },

  setActiveTool: (tool) => set({ activeTool: tool, pipeDrawingFrom: null }),

  selectElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),

  addJunction: (x, y) => {
    const state = get();
    const [id, nextId] = generateId('J', state.nextId);
    set({
      model: { ...state.model, junctions: [...state.model.junctions, { id, x, y, elevation: 0, baseDemand: 0, patternId: '' }] },
      nextId,
    });
    return id;
  },

  addReservoir: (x, y) => {
    const state = get();
    const [id, nextId] = generateId('R', state.nextId);
    set({
      model: { ...state.model, reservoirs: [...state.model.reservoirs, { id, x, y, head: 50, patternId: '' }] },
      nextId,
    });
    return id;
  },

  addTank: (x, y) => {
    const state = get();
    const [id, nextId] = generateId('T', state.nextId);
    set({
      model: { ...state.model, tanks: [...state.model.tanks, { id, x, y, elevation: 0, initLevel: 3, minLevel: 0.5, maxLevel: 6, diameter: 15, minVolume: 0 }] },
      nextId,
    });
    return id;
  },

  addPipe: (fromNode, toNode) => {
    const state = get();
    const [id, nextId] = generateId('P', state.nextId);
    const from = findNode(state.model, fromNode);
    const to = findNode(state.model, toNode);
    const length = from && to ? Math.max(1, computePipeLength(from.x, from.y, to.x, to.y)) : 100;
    set({
      model: { ...state.model, pipes: [...state.model.pipes, {
        id, fromNode, toNode, length, lengthOverride: false,
        diameter: 200, roughness: state.model.designCriteria.defaultRoughness,
        minorLoss: 0, status: 'Open' as const,
      }] },
      nextId,
    });
    return id;
  },

  addPump: (fromNode, toNode) => {
    const state = get();
    const [id, nextId] = generateId('PU', state.nextId);
    set({
      model: { ...state.model, pumps: [...state.model.pumps, {
        id, fromNode, toNode, power: 10, curveId: '', speed: 1.0, patternId: '',
      }] },
      nextId,
    });
    return id;
  },

  addValve: (fromNode, toNode) => {
    const state = get();
    const [id, nextId] = generateId('V', state.nextId);
    set({
      model: { ...state.model, valves: [...state.model.valves, {
        id, fromNode, toNode, diameter: 200, type: 'PRV' as const, setting: 30, minorLoss: 0,
      }] },
      nextId,
    });
    return id;
  },

  updateJunction: (id, updates) => {
    const state = get();
    set({ model: { ...state.model, junctions: state.model.junctions.map(j => j.id === id ? { ...j, ...updates } : j) } });
  },

  updateReservoir: (id, updates) => {
    const state = get();
    set({ model: { ...state.model, reservoirs: state.model.reservoirs.map(r => r.id === id ? { ...r, ...updates } : r) } });
  },

  updatePipe: (id, updates) => {
    const state = get();
    set({ model: { ...state.model, pipes: state.model.pipes.map(p => p.id === id ? { ...p, ...updates } : p) } });
  },

  updateTank: (id, updates) => {
    const state = get();
    set({ model: { ...state.model, tanks: state.model.tanks.map(t => t.id === id ? { ...t, ...updates } : t) } });
  },

  updatePump: (id, updates) => {
    const state = get();
    set({ model: { ...state.model, pumps: state.model.pumps.map(p => p.id === id ? { ...p, ...updates } : p) } });
  },

  updateValve: (id, updates) => {
    const state = get();
    set({ model: { ...state.model, valves: state.model.valves.map(v => v.id === id ? { ...v, ...updates } : v) } });
  },

  moveNode: (id, x, y) => {
    const state = get();
    const model = { ...state.model };
    model.junctions = model.junctions.map(j => j.id === id ? { ...j, x, y } : j);
    model.reservoirs = model.reservoirs.map(r => r.id === id ? { ...r, x, y } : r);
    model.tanks = model.tanks.map(t => t.id === id ? { ...t, x, y } : t);
    recomputePipeLengths(model, id);
    set({ model });
  },

  deleteElement: (id, type) => {
    const state = get();
    const model = { ...state.model };
    if (type === 'junction') model.junctions = model.junctions.filter(j => j.id !== id);
    else if (type === 'reservoir') model.reservoirs = model.reservoirs.filter(r => r.id !== id);
    else if (type === 'tank') model.tanks = model.tanks.filter(t => t.id !== id);
    else if (type === 'pipe') model.pipes = model.pipes.filter(p => p.id !== id);
    else if (type === 'pump') model.pumps = model.pumps.filter(p => p.id !== id);
    else if (type === 'valve') model.valves = model.valves.filter(v => v.id !== id);
    // Remove connected links when a node is deleted
    if (!['pipe', 'pump', 'valve'].includes(type)) {
      model.pipes = model.pipes.filter(p => p.fromNode !== id && p.toNode !== id);
      model.pumps = model.pumps.filter(p => p.fromNode !== id && p.toNode !== id);
      model.valves = model.valves.filter(v => v.fromNode !== id && v.toNode !== id);
    }
    set({
      model,
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
    });
  },

  // Pattern management
  addPattern: (pattern) => {
    const state = get();
    set({ model: { ...state.model, patterns: [...state.model.patterns, pattern] } });
  },

  updatePattern: (id, multipliers) => {
    const state = get();
    set({ model: { ...state.model, patterns: state.model.patterns.map(p => p.id === id ? { ...p, multipliers } : p) } });
  },

  deletePattern: (id) => {
    const state = get();
    set({ model: { ...state.model, patterns: state.model.patterns.filter(p => p.id !== id) } });
  },

  // Options & criteria
  updateOptions: (updates) => {
    const state = get();
    set({ model: { ...state.model, options: { ...state.model.options, ...updates } } });
  },

  updateDesignCriteria: (updates) => {
    const state = get();
    set({ model: { ...state.model, designCriteria: { ...state.model.designCriteria, ...updates } } });
  },

  // Solver
  solve: async () => {
    const state = get();
    set({ isSolving: true, solveError: null });
    try {
      const inp = serializeToInp(state.model);
      set({ lastInp: inp });
      if (state.model.options.duration === 0) {
        const result = await solveSteadyState(inp);
        set({ solveResult: result, epsResult: null, isSolving: false, epsTimeIndex: 0 });
      } else {
        const result = await solveEPS(inp);
        set({ epsResult: result, solveResult: null, isSolving: false, epsTimeIndex: 0 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ solveError: msg, isSolving: false });
    }
  },

  setEpsTimeIndex: (index) => set({ epsTimeIndex: index }),

  loadModel: (model) => {
    set({
      model,
      nextId: recalcNextIds(model),
      solveResult: null,
      epsResult: null,
      solveError: null,
      selectedElementId: null,
      selectedElementType: null,
      epsTimeIndex: 0,
    });
  },

  clearResults: () => set({ solveResult: null, epsResult: null, solveError: null, lastInp: null, epsTimeIndex: 0 }),

  setPipeDrawingFrom: (nodeId) => set({ pipeDrawingFrom: nodeId }),

  setShowResultsDashboard: (show) => set({ showResultsDashboard: show }),
  setShowScenarioPanel: (show) => set({ showScenarioPanel: show }),

  // EPS result helpers — get result at current time index
  getNodeResultAtTime: (nodeId) => {
    const state = get();
    if (state.solveResult) return state.solveResult.nodeResults.get(nodeId);
    if (state.epsResult) {
      const ts = state.epsResult.timestamps[state.epsTimeIndex];
      return state.epsResult.nodeResults.get(ts)?.get(nodeId);
    }
    return undefined;
  },

  getLinkResultAtTime: (linkId) => {
    const state = get();
    if (state.solveResult) return state.solveResult.linkResults.get(linkId);
    if (state.epsResult) {
      const ts = state.epsResult.timestamps[state.epsTimeIndex];
      return state.epsResult.linkResults.get(ts)?.get(linkId);
    }
    return undefined;
  },
}),
    {
      // Only track model changes for undo/redo — UI state excluded
      partialize: (state) => ({ model: state.model }),
      limit: 50,
    },
  ),
);
