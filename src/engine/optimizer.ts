/**
 * Pipe auto-sizing optimizer — iteratively assign optimal diameters
 * to minimize cost while meeting CPHEEO pressure/velocity constraints.
 */
import { serializeToInp } from '../model/serializer';
import { solveSteadyState } from './engine';
import type { NetworkModel, DesignCriteria } from '../model/types';
import type { PipeMaterial } from '../model/types';
import { STANDARD_DIAMETERS, snapToStandard, nextLargerStandard, nextSmallerStandard, getCostPerMeter } from '../data/pipeCosts';

export interface OptimizationResult {
  model: NetworkModel;
  totalCostBefore: number;
  totalCostAfter: number;
  iterations: number;
  violations: Violation[];
  pipesChanged: number;
}

export interface Violation {
  elementId: string;
  type: 'pressure' | 'velocity-high' | 'velocity-low';
  value: number;
  limit: number;
}

function computeTotalCost(model: NetworkModel, material: PipeMaterial): number {
  return model.pipes.reduce((sum, p) => sum + p.length * getCostPerMeter(p.diameter, material), 0);
}

function findViolations(model: NetworkModel, nodeResults: Map<string, any>, linkResults: Map<string, any>, dc: DesignCriteria): Violation[] {
  const violations: Violation[] = [];
  for (const j of model.junctions) {
    const nr = nodeResults.get(j.id);
    if (nr && nr.pressure < dc.residualPressureFloor) {
      violations.push({ elementId: j.id, type: 'pressure', value: nr.pressure, limit: dc.residualPressureFloor });
    }
  }
  for (const p of model.pipes) {
    const lr = linkResults.get(p.id);
    if (!lr) continue;
    const v = Math.abs(lr.velocity);
    if (v > dc.velocityMax) {
      violations.push({ elementId: p.id, type: 'velocity-high', value: v, limit: dc.velocityMax });
    } else if (v > 0 && v < dc.velocityMin) {
      violations.push({ elementId: p.id, type: 'velocity-low', value: v, limit: dc.velocityMin });
    }
  }
  return violations;
}

/** Find pipes connected to a deficient node (simple: direct connections) */
function findConnectedPipes(nodeId: string, model: NetworkModel): string[] {
  return model.pipes
    .filter(p => p.fromNode === nodeId || p.toNode === nodeId)
    .map(p => p.id);
}

export async function optimizePipeSizes(
  inputModel: NetworkModel,
  material: PipeMaterial,
  onProgress?: (iteration: number, maxIter: number) => void,
): Promise<OptimizationResult> {
  // Deep clone model
  const model: NetworkModel = JSON.parse(JSON.stringify(inputModel));
  const dc = model.designCriteria;
  const maxIterations = 20;

  const totalCostBefore = computeTotalCost(model, material);
  const originalDiameters = new Map(model.pipes.map(p => [p.id, p.diameter]));

  // Phase 1: Initial sizing from flow-velocity relationship
  const inp0 = serializeToInp(model);
  const result0 = await solveSteadyState(inp0);

  for (const pipe of model.pipes) {
    const lr = result0.linkResults.get(pipe.id);
    if (!lr || Math.abs(lr.flow) < 0.001) continue;
    const targetV = (dc.velocityEconomicMin + dc.velocityEconomicMax) / 2;
    const flowM3s = Math.abs(lr.flow) / 1000; // LPS to m³/s
    const area = flowM3s / targetV;
    const dMm = Math.sqrt(4 * area / Math.PI) * 1000;
    pipe.diameter = snapToStandard(dMm, material);
    pipe.material = material;
  }

  // Phase 2: Iterative constraint satisfaction
  let iterations = 0;
  let violations: Violation[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    onProgress?.(iter + 1, maxIterations);

    const inp = serializeToInp(model);
    const result = await solveSteadyState(inp);
    violations = findViolations(model, result.nodeResults, result.linkResults, dc);

    if (violations.length === 0) break;

    const upsized = new Set<string>();

    // Fix pressure violations — upsize pipes feeding deficient nodes
    for (const v of violations) {
      if (v.type === 'pressure') {
        const pipeIds = findConnectedPipes(v.elementId, model);
        for (const pid of pipeIds) {
          if (upsized.has(pid)) continue;
          const pipe = model.pipes.find(p => p.id === pid)!;
          pipe.diameter = nextLargerStandard(pipe.diameter, material);
          upsized.add(pid);
        }
      }
    }

    // Fix velocity-high — upsize
    for (const v of violations) {
      if (v.type === 'velocity-high') {
        if (upsized.has(v.elementId)) continue;
        const pipe = model.pipes.find(p => p.id === v.elementId)!;
        pipe.diameter = nextLargerStandard(pipe.diameter, material);
        upsized.add(v.elementId);
      }
    }

    // Fix velocity-low — downsize (cautiously)
    for (const v of violations) {
      if (v.type === 'velocity-low') {
        if (upsized.has(v.elementId)) continue;
        const pipe = model.pipes.find(p => p.id === v.elementId)!;
        const smaller = nextSmallerStandard(pipe.diameter, material);
        if (smaller < pipe.diameter) pipe.diameter = smaller;
      }
    }
  }

  // Phase 3: Cost reduction — try downsizing each pipe
  const pipesByC = [...model.pipes].sort((a, b) =>
    (b.length * getCostPerMeter(b.diameter, material)) - (a.length * getCostPerMeter(a.diameter, material))
  );

  for (const pipe of pipesByC) {
    const orig = pipe.diameter;
    const smaller = nextSmallerStandard(orig, material);
    if (smaller >= orig) continue;

    pipe.diameter = smaller;
    const inp = serializeToInp(model);
    const result = await solveSteadyState(inp);
    const newViolations = findViolations(model, result.nodeResults, result.linkResults, dc);
    if (newViolations.length > violations.length) {
      pipe.diameter = orig; // revert
    } else {
      violations = newViolations;
    }
  }

  // Count changed pipes
  let pipesChanged = 0;
  for (const pipe of model.pipes) {
    if (pipe.diameter !== originalDiameters.get(pipe.id)) pipesChanged++;
  }

  return {
    model,
    totalCostBefore,
    totalCostAfter: computeTotalCost(model, material),
    iterations,
    violations,
    pipesChanged,
  };
}
