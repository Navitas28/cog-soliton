/**
 * Demand allocation — assign demands from external data sources.
 * Supports population-based, billing-based, and area-proportional methods.
 */
import type { NetworkModel } from './types';
import { haversineDistance } from './geodesic';

/* ─── Types ─── */

export interface DemandRecord {
  zoneId: string;
  population: number;
  billingVolume: number; // m³/day
  area: number;          // km² or hectares
}

export interface AllocationResult {
  nodeId: string;
  demand: number; // LPS
}

export interface MatchResult {
  matched: Map<string, string>;  // zoneId → nodeId
  unmatched: string[];           // zoneIds not matched
}

/* ─── CSV Parsing ─── */

const ID_PATTERNS = [/zone_id/i, /^id$/i, /^zone$/i, /^name$/i, /^node/i, /^junction/i];
const POP_PATTERNS = [/population/i, /^pop$/i, /^pop_/i, /capita/i, /people/i];
const BILLING_PATTERNS = [/billing/i, /volume/i, /consumption/i, /^vol$/i, /m3/i];
const AREA_PATTERNS = [/^area/i, /^size$/i, /hectare/i, /km2/i];

function findCol(headers: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const idx = headers.findIndex(h => p.test(h.trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseDemandCsv(csv: string): DemandRecord[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const idCol = findCol(headers, ID_PATTERNS);
  if (idCol < 0) return [];

  const popCol = findCol(headers, POP_PATTERNS);
  const billingCol = findCol(headers, BILLING_PATTERNS);
  const areaCol = findCol(headers, AREA_PATTERNS);

  const records: DemandRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    const zoneId = cells[idCol];
    if (!zoneId) continue;

    records.push({
      zoneId,
      population: popCol >= 0 ? (parseFloat(cells[popCol]) || 0) : 0,
      billingVolume: billingCol >= 0 ? (parseFloat(cells[billingCol]) || 0) : 0,
      area: areaCol >= 0 ? (parseFloat(cells[areaCol]) || 0) : 0,
    });
  }

  return records;
}

/* ─── Allocation Methods ─── */

/**
 * Population-based: demand = population × lpcd / 86400 (LPS)
 */
export function allocateByPopulation(
  records: DemandRecord[],
  lpcd: number,
): AllocationResult[] {
  return records.map(r => ({
    nodeId: r.zoneId,
    demand: r.population * lpcd / 86400,
  }));
}

/**
 * Billing-based: demand = billingVolume × (1 + nrwFraction) / 86.4 (m³/day → LPS)
 */
export function allocateByBilling(
  records: DemandRecord[],
  nrwFraction: number,
): AllocationResult[] {
  return records.map(r => ({
    nodeId: r.zoneId,
    demand: r.billingVolume * (1 + nrwFraction) / 86.4,
  }));
}

/**
 * Area-proportional: distribute totalDemandLPS proportional to area
 */
export function allocateAreaProportional(
  records: DemandRecord[],
  totalDemandLPS: number,
): AllocationResult[] {
  const totalArea = records.reduce((s, r) => s + r.area, 0);
  if (totalArea === 0) {
    return records.map(r => ({ nodeId: r.zoneId, demand: 0 }));
  }
  return records.map(r => ({
    nodeId: r.zoneId,
    demand: (r.area / totalArea) * totalDemandLPS,
  }));
}

/* ─── Zone-to-Node Matching ─── */

/**
 * Match zone IDs to model junction IDs.
 * First tries exact match, then proximity if coordinates provided.
 */
export function matchZonesToNodes(
  zoneIds: string[],
  model: NetworkModel,
  zoneCoords?: Map<string, { x: number; y: number }>,
): MatchResult {
  const matched = new Map<string, string>();
  const unmatched: string[] = [];
  const junctionIds = new Set(model.junctions.map(j => j.id));

  for (const zoneId of zoneIds) {
    // Exact match
    if (junctionIds.has(zoneId)) {
      matched.set(zoneId, zoneId);
      continue;
    }

    // Proximity match
    if (zoneCoords && zoneCoords.has(zoneId)) {
      const coord = zoneCoords.get(zoneId)!;
      let bestDist = Infinity;
      let bestNode = '';

      for (const j of model.junctions) {
        const dist = haversineDistance(coord.y, coord.x, j.y, j.x);
        if (dist < bestDist) {
          bestDist = dist;
          bestNode = j.id;
        }
      }

      if (bestNode && bestDist < 5000) { // within 5km
        matched.set(zoneId, bestNode);
        continue;
      }
    }

    unmatched.push(zoneId);
  }

  return { matched, unmatched };
}
