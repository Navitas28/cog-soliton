/**
 * Systematic fire flow analysis — test each junction for fire flow adequacy.
 * CPHEEO formula: Q = 100 * sqrt(P) LPM, where P = population in thousands.
 */
import { solveSteadyState } from './engine';

/* ─── Types ─── */

export interface FireFlowResult {
  nodeId: string;
  fireDemandLPS: number;
  fireDemandLPM: number;
  residualPressure: number;    // pressure at test node during fire
  minSystemPressure: number;   // lowest pressure anywhere during fire
  minPressureNode: string;     // which node has lowest pressure
  adequate: boolean;           // residual >= pressure floor
}

export interface FireFlowSummary {
  results: FireFlowResult[];
  adequateCount: number;
  totalTested: number;
  populationPerNode: number;
}

/* ─── CPHEEO Fire Demand ─── */

/**
 * Compute fire demand in LPM using CPHEEO formula.
 * Q = 100 * sqrt(P), where P = population in thousands.
 */
export function computeFireDemandLPM(population: number): number {
  if (population <= 0) return 0;
  const pThousands = population / 1000;
  return 100 * Math.sqrt(pThousands);
}

/**
 * Convert LPM to LPS.
 */
export function lpmToLps(lpm: number): number {
  return lpm / 60;
}

/* ─── INP Modification ─── */

/**
 * Build a modified INP string with additional fire demand at a specific junction.
 * Modifies the junction's demand in-place without touching other sections.
 */
export function buildFireFlowTestModel(
  baseInp: string,
  testNodeId: string,
  additionalDemandLPS: number,
): string {
  const lines = baseInp.split('\n');
  let inJunctions = false;
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[JUNCTIONS]')) {
      inJunctions = true;
      result.push(line);
      continue;
    }
    if (trimmed.startsWith('[') && inJunctions) {
      inJunctions = false;
    }

    if (inJunctions && !trimmed.startsWith(';') && trimmed.length > 0) {
      const parts = trimmed.split(/\s+/);
      if (parts[0] === testNodeId && parts.length >= 3) {
        const originalDemand = parseFloat(parts[2]) || 0;
        const newDemand = originalDemand + additionalDemandLPS;
        parts[2] = newDemand.toFixed(4);
        result.push(` ${parts.join('  ')}`);
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/* ─── Systematic Analysis ─── */

/**
 * Run fire flow analysis on all junctions.
 * For each junction: add fire demand → solve → check pressures.
 */
export async function runFireFlowAnalysis(
  baseInp: string,
  junctionIds: string[],
  fireDemandLPS: number,
  pressureFloor: number,
  onProgress?: (current: number, total: number) => void,
): Promise<FireFlowSummary> {
  const results: FireFlowResult[] = [];
  const fireDemandLPM = fireDemandLPS * 60;

  for (let i = 0; i < junctionIds.length; i++) {
    const nodeId = junctionIds[i];
    onProgress?.(i + 1, junctionIds.length);

    try {
      const modifiedInp = buildFireFlowTestModel(baseInp, nodeId, fireDemandLPS);
      const solveResult = await solveSteadyState(modifiedInp);

      const testNodeResult = solveResult.nodeResults.get(nodeId);
      const residualPressure = testNodeResult?.pressure ?? 0;

      // Find minimum pressure across all nodes
      let minPressure = Infinity;
      let minNode = '';
      for (const [id, nr] of solveResult.nodeResults.entries()) {
        if (nr.pressure < minPressure) {
          minPressure = nr.pressure;
          minNode = id;
        }
      }

      results.push({
        nodeId,
        fireDemandLPS,
        fireDemandLPM,
        residualPressure,
        minSystemPressure: minPressure === Infinity ? 0 : minPressure,
        minPressureNode: minNode,
        adequate: residualPressure >= pressureFloor,
      });
    } catch {
      results.push({
        nodeId,
        fireDemandLPS,
        fireDemandLPM,
        residualPressure: -999,
        minSystemPressure: -999,
        minPressureNode: '',
        adequate: false,
      });
    }
  }

  return {
    results,
    adequateCount: results.filter(r => r.adequate).length,
    totalTested: results.length,
    populationPerNode: 0,
  };
}
