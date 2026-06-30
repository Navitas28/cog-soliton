/**
 * Zustand store for the network model and application state.
 * Single source of truth for the network, solver results, and UI state.
 */
import { create } from 'zustand';
import type { NetworkModel, Junction, Reservoir, Pipe, Tank } from '../model/types';
import { createEmptyNetwork } from '../model/types';
import { serializeToInp } from '../model/serializer';
import { solveSteadyState, solveEPS } from '../engine/engine';
import type { SteadyStateResult, EPSResults } from '../engine/engine';
import { computePipeLength } from '../model/geodesic';

export type DrawingTool = 'select' | 'reservoir' | 'junction' | 'pipe' | 'tank' | 'pump' | 'valve';

interface NetworkState {
  // Model
  model: NetworkModel;

  // UI state
  activeTool: DrawingTool;
  selectedElementId: string | null;
  selectedElementType: 'junction' | 'reservoir' | 'pipe' | 'tank' | 'pump' | 'valve' | null;
  pipeDrawingFrom: string | null; // first node when drawing a pipe

  // Solver results
  solveResult: SteadyStateResult | null;
  epsResult: EPSResults | null;
  solveError: string | null;
  isSolving: boolean;
  lastInp: string | null;

  // Counter for auto-generated IDs
  nextId: { [prefix: string]: number };

  // Actions
  setActiveTool: (tool: DrawingTool) => void;
  selectElement: (id: string | null, type: NetworkState['selectedElementType']) => void;

  addJunction: (x: number, y: number) => string;
  addReservoir: (x: number, y: number) => string;
  addTank: (x: number, y: number) => string;
  addPipe: (fromNode: string, toNode: string) => string;

  updateJunction: (id: string, updates: Partial<Junction>) => void;
  updateReservoir: (id: string, updates: Partial<Reservoir>) => void;
  updatePipe: (id: string, updates: Partial<Pipe>) => void;
  updateTank: (id: string, updates: Partial<Tank>) => void;

  moveNode: (id: string, x: number, y: number) => void;
  deleteElement: (id: string, type: string) => void;

  solve: () => Promise<void>;

  loadModel: (model: NetworkModel) => void;
  clearResults: () => void;

  setPipeDrawingFrom: (nodeId: string | null) => void;
}

function generateId(prefix: string, nextId: { [prefix: string]: number }): string {
  const num = nextId[prefix] || 1;
  nextId[prefix] = num + 1;
  return `${prefix}${num}`;
}

function findNode(model: NetworkModel, id: string): { x: number; y: number } | undefined {
  const j = model.junctions.find(n => n.id === id);
  if (j) return j;
  const r = model.reservoirs.find(n => n.id === id);
  if (r) return r;
  const t = model.tanks.find(n => n.id === id);
  if (t) return t;
  return undefined;
}

/** Recompute pipe lengths for all pipes connected to a moved node */
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

export const useNetworkStore = create<NetworkState>((set, get) => ({
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
  nextId: { J: 1, R: 1, P: 1, T: 1, PU: 1, V: 1 },

  setActiveTool: (tool) => set({ activeTool: tool, pipeDrawingFrom: null }),

  selectElement: (id, type) => set({
    selectedElementId: id,
    selectedElementType: type,
  }),

  addJunction: (x, y) => {
    const state = get();
    const id = generateId('J', state.nextId);
    const junction: Junction = {
      id, x, y,
      elevation: 0,
      baseDemand: 0,
      patternId: '',
    };
    set({
      model: { ...state.model, junctions: [...state.model.junctions, junction] },
      nextId: { ...state.nextId },
    });
    return id;
  },

  addReservoir: (x, y) => {
    const state = get();
    const id = generateId('R', state.nextId);
    const reservoir: Reservoir = {
      id, x, y,
      head: 50,
      patternId: '',
    };
    set({
      model: { ...state.model, reservoirs: [...state.model.reservoirs, reservoir] },
      nextId: { ...state.nextId },
    });
    return id;
  },

  addTank: (x, y) => {
    const state = get();
    const id = generateId('T', state.nextId);
    const tank: Tank = {
      id, x, y,
      elevation: 0,
      initLevel: 3,
      minLevel: 0.5,
      maxLevel: 6,
      diameter: 15,
      minVolume: 0,
    };
    set({
      model: { ...state.model, tanks: [...state.model.tanks, tank] },
      nextId: { ...state.nextId },
    });
    return id;
  },

  addPipe: (fromNode, toNode) => {
    const state = get();
    const id = generateId('P', state.nextId);
    const from = findNode(state.model, fromNode);
    const to = findNode(state.model, toNode);
    const length = from && to ? Math.max(1, computePipeLength(from.x, from.y, to.x, to.y)) : 100;
    const pipe: Pipe = {
      id, fromNode, toNode,
      length,
      lengthOverride: false,
      diameter: 200,
      roughness: state.model.designCriteria.defaultRoughness,
      minorLoss: 0,
      status: 'Open',
    };
    set({
      model: { ...state.model, pipes: [...state.model.pipes, pipe] },
      nextId: { ...state.nextId },
    });
    return id;
  },

  updateJunction: (id, updates) => {
    const state = get();
    set({
      model: {
        ...state.model,
        junctions: state.model.junctions.map(j =>
          j.id === id ? { ...j, ...updates } : j
        ),
      },
    });
  },

  updateReservoir: (id, updates) => {
    const state = get();
    set({
      model: {
        ...state.model,
        reservoirs: state.model.reservoirs.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      },
    });
  },

  updatePipe: (id, updates) => {
    const state = get();
    set({
      model: {
        ...state.model,
        pipes: state.model.pipes.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
      },
    });
  },

  updateTank: (id, updates) => {
    const state = get();
    set({
      model: {
        ...state.model,
        tanks: state.model.tanks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      },
    });
  },

  moveNode: (id, x, y) => {
    const state = get();
    const model = { ...state.model };

    // Update node position
    model.junctions = model.junctions.map(j =>
      j.id === id ? { ...j, x, y } : j
    );
    model.reservoirs = model.reservoirs.map(r =>
      r.id === id ? { ...r, x, y } : r
    );
    model.tanks = model.tanks.map(t =>
      t.id === id ? { ...t, x, y } : t
    );

    // Recompute connected pipe lengths (unless manually overridden)
    recomputePipeLengths(model, id);

    set({ model });
  },

  deleteElement: (id, type) => {
    const state = get();
    const model = { ...state.model };

    if (type === 'junction') {
      model.junctions = model.junctions.filter(j => j.id !== id);
    } else if (type === 'reservoir') {
      model.reservoirs = model.reservoirs.filter(r => r.id !== id);
    } else if (type === 'tank') {
      model.tanks = model.tanks.filter(t => t.id !== id);
    } else if (type === 'pipe') {
      model.pipes = model.pipes.filter(p => p.id !== id);
    }

    // Remove connected pipes when a node is deleted
    if (type !== 'pipe') {
      model.pipes = model.pipes.filter(p => p.fromNode !== id && p.toNode !== id);
    }

    set({
      model,
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
    });
  },

  solve: async () => {
    const state = get();
    set({ isSolving: true, solveError: null });

    try {
      const inp = serializeToInp(state.model);
      set({ lastInp: inp });

      if (state.model.options.duration === 0) {
        const result = await solveSteadyState(inp);
        set({ solveResult: result, epsResult: null, isSolving: false });
      } else {
        const result = await solveEPS(inp);
        set({ epsResult: result, solveResult: null, isSolving: false });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Make EPANET errors readable
      set({ solveError: msg, isSolving: false });
    }
  },

  loadModel: (model) => {
    // Recalculate nextId counters based on loaded model
    const nextId: { [prefix: string]: number } = { J: 1, R: 1, P: 1, T: 1, PU: 1, V: 1 };
    for (const j of model.junctions) {
      const n = parseInt(j.id.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n >= nextId['J']) nextId['J'] = n + 1;
    }
    for (const r of model.reservoirs) {
      const n = parseInt(r.id.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n >= nextId['R']) nextId['R'] = n + 1;
    }
    for (const p of model.pipes) {
      const n = parseInt(p.id.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n >= nextId['P']) nextId['P'] = n + 1;
    }
    for (const t of model.tanks) {
      const n = parseInt(t.id.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n >= nextId['T']) nextId['T'] = n + 1;
    }

    set({
      model,
      nextId,
      solveResult: null,
      epsResult: null,
      solveError: null,
      selectedElementId: null,
      selectedElementType: null,
    });
  },

  clearResults: () => set({
    solveResult: null,
    epsResult: null,
    solveError: null,
    lastInp: null,
  }),

  setPipeDrawingFrom: (nodeId) => set({ pipeDrawingFrom: nodeId }),
}));
