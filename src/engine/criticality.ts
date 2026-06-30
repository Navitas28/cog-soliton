/**
 * Criticality analysis — bulk pipe-break what-if analysis.
 * Close each pipe, solve, record pressure impact, rank by severity.
 */
import { solveSteadyState } from './engine';

/* ─── Types ─── */

export interface PipeImpact {
  pipeId: string;
  avgPressureDrop: number;    // average pressure drop across all junctions (m)
  maxPressureDrop: number;    // worst single-node pressure drop (m)
  maxDropNode: string;        // which node experienced worst drop
  nodesAffected: number;      // how many nodes newly fall below floor
  solveFailed: boolean;       // solver couldn't converge
}

export interface CriticalitySummary {
  impacts: PipeImpact[];
  resilienceScore: number;    // % of pipes that can fail without causing violations
  totalPipes: number;
}

/* ─── Impact Computation ─── */

export function computePipeImpact(
  pipeId: string,
  baselinePressures: Map<string, number>,
  closedPressures: Map<string, number>,
  pressureFloor: number,
): PipeImpact {
  let sumDrop = 0;
  let maxDrop = 0;
  let maxDropNode = '';
  let nodesAffected = 0;
  let count = 0;

  for (const [nodeId, basePressure] of baselinePressures.entries()) {
    const closedPressure = closedPressures.get(nodeId);
    if (closedPressure === undefined) continue;

    const drop = basePressure - closedPressure;
    sumDrop += Math.max(0, drop);
    count++;

    if (drop > maxDrop) {
      maxDrop = drop;
      maxDropNode = nodeId;
    }

    // Newly affected: was above floor, now below
    if (basePressure >= pressureFloor && closedPressure < pressureFloor) {
      nodesAffected++;
    }
  }

  return {
    pipeId,
    avgPressureDrop: count > 0 ? sumDrop / count : 0,
    maxPressureDrop: maxDrop,
    maxDropNode,
    nodesAffected,
    solveFailed: false,
  };
}

/* ─── Resilience Score ─── */

export function computeResilienceScore(impacts: PipeImpact[]): number {
  if (impacts.length === 0) return 0;
  const safe = impacts.filter(i => i.nodesAffected === 0 && !i.solveFailed).length;
  return Math.round(safe / impacts.length * 100);
}

/* ─── Ranking ─── */

export function rankByCriticality(impacts: PipeImpact[]): PipeImpact[] {
  return [...impacts].sort((a, b) => {
    if (b.nodesAffected !== a.nodesAffected) return b.nodesAffected - a.nodesAffected;
    return b.avgPressureDrop - a.avgPressureDrop;
  });
}

/* ─── Bulk Analysis Runner ─── */

/**
 * Run criticality analysis: close each pipe one at a time, solve, compare pressures.
 */
export async function runCriticalityAnalysis(
  baseInp: string,
  pipeIds: string[],
  baselinePressures: Map<string, number>,
  pressureFloor: number,
  onProgress?: (current: number, total: number) => void,
): Promise<CriticalitySummary> {
  const impacts: PipeImpact[] = [];

  for (let i = 0; i < pipeIds.length; i++) {
    const pipeId = pipeIds[i];
    onProgress?.(i + 1, pipeIds.length);

    try {
      // Close pipe by setting status to Closed in INP
      const modifiedInp = closePipeInInp(baseInp, pipeId);
      const result = await solveSteadyState(modifiedInp);

      // Extract junction pressures
      const closedPressures = new Map<string, number>();
      for (const [nodeId, nr] of result.nodeResults.entries()) {
        closedPressures.set(nodeId, nr.pressure);
      }

      impacts.push(computePipeImpact(pipeId, baselinePressures, closedPressures, pressureFloor));
    } catch {
      impacts.push({
        pipeId,
        avgPressureDrop: 999,
        maxPressureDrop: 999,
        maxDropNode: '',
        nodesAffected: baselinePressures.size,
        solveFailed: true,
      });
    }
  }

  return {
    impacts: rankByCriticality(impacts),
    resilienceScore: computeResilienceScore(impacts),
    totalPipes: pipeIds.length,
  };
}

/**
 * Modify INP string to close a specific pipe.
 */
function closePipeInInp(inp: string, pipeId: string): string {
  const lines = inp.split('\n');
  let inPipes = false;
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '[PIPES]') inPipes = true;
    else if (trimmed.startsWith('[') && inPipes) inPipes = false;

    if (inPipes && !trimmed.startsWith(';') && trimmed.length > 0) {
      const parts = trimmed.split(/\s+/);
      if (parts[0] === pipeId) {
        // Replace status (last meaningful field before ';') with 'Closed'
        const modified = line.replace(/\bOpen\b/i, 'Closed').replace(/\bCV\b/i, 'Closed');
        result.push(modified);
        continue;
      }
    }
    result.push(line);
  }

  return result.join('\n');
}
