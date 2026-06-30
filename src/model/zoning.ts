/**
 * DMA zoning and isolation analysis.
 * Zone assignment, boundary pipe detection, flow balance, graph traversal.
 */
import type { NetworkModel } from './types';
import type { SteadyStateResult } from '../engine/engine';

/* ─── Types ─── */

export interface Zone {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
}

export interface ZoneStats {
  zoneId: string;
  nodeCount: number;
  totalDemand: number;      // LPS
  inflow: number;           // LPS from boundary pipes
  nrwPct: number;           // (inflow - demand) / inflow %
  boundaryPipes: string[];  // pipes crossing zone edge
}

export interface IsolationImpact {
  affectedNodeCount: number;
  affectedDemand: number;   // LPS
  affectedNodeIds: string[];
}

/* ─── Zone Assignment ─── */

export function assignNodesToZones(zones: Zone[]): Map<string, string> {
  const assignment = new Map<string, string>();
  for (const zone of zones) {
    for (const nodeId of zone.nodeIds) {
      assignment.set(nodeId, zone.id);
    }
  }
  return assignment;
}

/* ─── Zone Statistics ─── */

export function computeZoneStats(
  zone: Zone,
  model: NetworkModel,
  results: SteadyStateResult,
  zoneAssignment?: Map<string, string>,
): ZoneStats {
  const nodeSet = new Set(zone.nodeIds);

  // Total demand
  let totalDemand = 0;
  for (const nodeId of zone.nodeIds) {
    const nr = results.nodeResults.get(nodeId);
    if (nr) totalDemand += Math.abs(nr.demand);
  }

  // Find boundary pipes
  const boundaryPipes: string[] = [];
  let inflow = 0;
  const allLinks = [...model.pipes, ...model.pumps, ...model.valves];

  for (const link of allLinks) {
    const fromInZone = nodeSet.has(link.fromNode);
    const toInZone = nodeSet.has(link.toNode);

    if (fromInZone !== toInZone) {
      // Boundary pipe — one end in zone, other outside
      boundaryPipes.push(link.id);

      const lr = results.linkResults.get(link.id);
      if (lr) {
        // If flow direction is into zone, count as inflow
        const flowIntoZone = (toInZone && lr.flow > 0) || (fromInZone && lr.flow < 0);
        if (flowIntoZone) {
          inflow += Math.abs(lr.flow);
        }
      }
    } else if (!fromInZone && !toInZone) {
      // Neither end in zone — skip
      continue;
    } else {
      // Both ends in zone — check if from a source not in any zone
      if (zoneAssignment) {
        const fromZone = zoneAssignment.get(link.fromNode);
        const toZone = zoneAssignment.get(link.toNode);
        if (!fromZone || !toZone) {
          // One end is a reservoir/tank not assigned to any zone
          boundaryPipes.push(link.id);
          const lr = results.linkResults.get(link.id);
          if (lr) inflow += Math.abs(lr.flow);
        }
      }
    }
  }

  // Also count inflow from reservoirs directly connected to zone nodes
  for (const link of allLinks) {
    const fromIsRes = model.reservoirs.some(r => r.id === link.fromNode);
    const toIsRes = model.reservoirs.some(r => r.id === link.toNode);
    if ((fromIsRes && nodeSet.has(link.toNode)) || (toIsRes && nodeSet.has(link.fromNode))) {
      if (!boundaryPipes.includes(link.id)) {
        boundaryPipes.push(link.id);
        const lr = results.linkResults.get(link.id);
        if (lr) inflow += Math.abs(lr.flow);
      }
    }
  }

  const nrwPct = inflow > 0 ? Math.max(0, (inflow - totalDemand) / inflow * 100) : 0;

  return {
    zoneId: zone.id,
    nodeCount: zone.nodeIds.length,
    totalDemand,
    inflow,
    nrwPct,
    boundaryPipes,
  };
}

/* ─── Isolation Analysis (Graph Traversal) ─── */

/**
 * Find nodes that become disconnected from all sources when a pipe is closed.
 * Uses BFS from source nodes through remaining open links.
 */
export function findAffectedNodes(
  model: NetworkModel,
  closedPipeId: string,
  sourceNodeIds: string[],
): string[] {
  // Build adjacency graph excluding closed pipe
  const adj = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };

  const allLinks = [
    ...model.pipes.map(p => ({ id: p.id, from: p.fromNode, to: p.toNode })),
    ...model.pumps.map(p => ({ id: p.id, from: p.fromNode, to: p.toNode })),
    ...model.valves.map(v => ({ id: v.id, from: v.fromNode, to: v.toNode })),
  ];

  // All node IDs
  const allNodeIds = [
    ...model.junctions.map(j => j.id),
    ...model.reservoirs.map(r => r.id),
    ...model.tanks.map(t => t.id),
  ];

  for (const id of allNodeIds) {
    if (!adj.has(id)) adj.set(id, new Set());
  }

  for (const link of allLinks) {
    if (link.id === closedPipeId) continue;
    addEdge(link.from, link.to);
  }

  // BFS from sources
  const reachable = new Set<string>();
  const queue = [...sourceNodeIds];
  for (const s of queue) reachable.add(s);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Also add tanks as alternate sources (they can supply during isolation)
  for (const tank of model.tanks) {
    if (!reachable.has(tank.id)) {
      // Tank itself is disconnected — don't treat as source
      continue;
    }
  }

  // Affected = junctions NOT reachable from any source
  return model.junctions
    .filter(j => !reachable.has(j.id))
    .map(j => j.id);
}

/**
 * Compute impact of isolating affected nodes.
 */
export function computeIsolationImpact(
  affectedNodeIds: string[],
  model: NetworkModel,
): IsolationImpact {
  const affectedSet = new Set(affectedNodeIds);
  let affectedDemand = 0;

  for (const j of model.junctions) {
    if (affectedSet.has(j.id)) {
      affectedDemand += j.baseDemand;
    }
  }

  return {
    affectedNodeCount: affectedNodeIds.length,
    affectedDemand,
    affectedNodeIds,
  };
}
