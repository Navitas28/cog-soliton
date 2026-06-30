/**
 * Ayodhya sample network — synthetic but plausible AMRUT 2.0 24×7 DMA pilot.
 *
 * Modelled as:
 * - Saryu River source augmentation (100 MLD WTP with intake well-cum-pump house)
 * - Raw-water rising main → WTP → clear-water feeder → tanks → distribution
 * - 2 overhead tanks (EPANET tanks, not reservoirs, so EPS shows fill/drain)
 * - ~40 junctions in a looped grid over real Ayodhya coordinates
 * - High-demand zones at Ram Janmabhoomi temple and Saryu ghat areas
 * - Intentionally deficient zones in peripheral wards for demo narrative
 *
 * Implemented by UP Jal Nigam under AMRUT 2.0.
 *
 * Three selectable scenario labels:
 * 1. "24×7 in 11 wards" — full coverage
 * 2. "24×7 in 4 selected DMAs" — reduced scope
 * 3. "Saryu source augmentation Phase 1" — source-only
 */

import type { NetworkModel, DemandPattern } from '../model/types';
import { defaultOptions, defaultDesignCriteria } from '../model/types';
import { DEFAULT_DIURNAL_PATTERN } from '../model/demand';

// Centre: 26.7922°N, 82.1998°E (Ram Janmabhoomi area)
// Grid covers roughly 26.78–26.81°N, 82.18–82.22°E (~3km × 3km)

const AYODHYA_CENTER = { lat: 26.7922, lng: 82.1998 };

// WTP location: north bank of Saryu, intake area
const WTP_LAT = 26.8080;
const WTP_LNG = 82.1750;

// Spread factor — multiplies coordinate offsets from center for visual clarity
// Real Ayodhya DMA would be ~2-3km across; we spread to ~6km for readability
const SPREAD = 3.0;

/** Scale a coordinate relative to Ayodhya center for visual spread */
function sp(lng: number, lat: number): { x: number; y: number } {
  return {
    x: AYODHYA_CENTER.lng + (lng - AYODHYA_CENTER.lng) * SPREAD,
    y: AYODHYA_CENTER.lat + (lat - AYODHYA_CENTER.lat) * SPREAD,
  };
}

export type AyodhyaScenario = '11-wards' | '4-dmas' | 'saryu-phase1';

export const SCENARIO_LABELS: Record<AyodhyaScenario, string> = {
  '11-wards': '24×7 in 11 wards',
  '4-dmas': '24×7 in 4 selected DMAs',
  'saryu-phase1': 'Saryu source augmentation Phase 1',
};

export function createAyodhyaNetwork(scenario: AyodhyaScenario = '11-wards'): NetworkModel {
  const diurnalPattern: DemandPattern = {
    id: '1',
    multipliers: [...DEFAULT_DIURNAL_PATTERN],
  };

  // ---- SUPPLY SOURCE ----
  // WTP modelled as reservoir (constant head source = treated water output)
  const reservoirs = [
    { id: 'WTP', x: WTP_LNG, y: WTP_LAT, head: 85, patternId: '' },
  ];

  // ---- OVERHEAD TANKS ----
  const tanks = [
    {
      id: 'OHT1', ...sp(82.1960, 26.7950),
      elevation: 45, initLevel: 4, minLevel: 1, maxLevel: 8,
      diameter: 20, minVolume: 0,
    },
    {
      id: 'OHT2', ...sp(82.2080, 26.7870),
      elevation: 42, initLevel: 3.5, minLevel: 1, maxLevel: 7,
      diameter: 16, minVolume: 0,
    },
  ];

  // ---- JUNCTIONS ----
  // Coordinates spread 3x from center for visual clarity on map

  const junctions = [
    // Transmission nodes (between WTP and tanks)
    { id: 'TN1', ...sp(82.1920, 26.7990), elevation: 38, baseDemand: 0.5, patternId: '1' },
    { id: 'TN2', ...sp(82.1940, 26.7970), elevation: 36, baseDemand: 0.5, patternId: '1' },

    // Central zone — Ram Janmabhoomi / temple area (HIGH DEMAND)
    { id: 'C1', ...sp(82.1985, 26.7930), elevation: 34, baseDemand: 8, patternId: '1' },
    { id: 'C2', ...sp(82.2000, 26.7925), elevation: 33, baseDemand: 12, patternId: '1' },
    { id: 'C3', ...sp(82.2015, 26.7920), elevation: 33, baseDemand: 10, patternId: '1' },
    { id: 'C4', ...sp(82.1990, 26.7910), elevation: 32, baseDemand: 7, patternId: '1' },
    { id: 'C5', ...sp(82.2010, 26.7910), elevation: 32, baseDemand: 9, patternId: '1' },
    { id: 'C6', ...sp(82.2025, 26.7915), elevation: 33, baseDemand: 6, patternId: '1' },

    // Ghat zone — Saryu riverfront (HIGH DEMAND, bathing ghats)
    { id: 'G1', ...sp(82.1970, 26.7960), elevation: 30, baseDemand: 10, patternId: '1' },
    { id: 'G2', ...sp(82.1990, 26.7955), elevation: 30, baseDemand: 8, patternId: '1' },
    { id: 'G3', ...sp(82.2010, 26.7950), elevation: 31, baseDemand: 7, patternId: '1' },
    { id: 'G4', ...sp(82.2030, 26.7945), elevation: 31, baseDemand: 6, patternId: '1' },

    // North residential
    { id: 'N1', ...sp(82.1950, 26.7980), elevation: 36, baseDemand: 4, patternId: '1' },
    { id: 'N2', ...sp(82.1970, 26.7980), elevation: 35, baseDemand: 5, patternId: '1' },
    { id: 'N3', ...sp(82.1990, 26.7975), elevation: 34, baseDemand: 5, patternId: '1' },
    { id: 'N4', ...sp(82.2010, 26.7975), elevation: 34, baseDemand: 4, patternId: '1' },
    { id: 'N5', ...sp(82.2030, 26.7970), elevation: 35, baseDemand: 3, patternId: '1' },

    // South wards — PERIPHERAL (intentionally under-served)
    { id: 'S1', ...sp(82.1960, 26.7880), elevation: 30, baseDemand: 5, patternId: '1' },
    { id: 'S2', ...sp(82.1980, 26.7875), elevation: 29, baseDemand: 6, patternId: '1' },
    { id: 'S3', ...sp(82.2000, 26.7870), elevation: 29, baseDemand: 7, patternId: '1' },
    { id: 'S4', ...sp(82.2020, 26.7865), elevation: 28, baseDemand: 5, patternId: '1' },
    { id: 'S5', ...sp(82.2040, 26.7860), elevation: 28, baseDemand: 4, patternId: '1' },

    // East residential
    { id: 'E1', ...sp(82.2050, 26.7920), elevation: 34, baseDemand: 4, patternId: '1' },
    { id: 'E2', ...sp(82.2060, 26.7900), elevation: 33, baseDemand: 5, patternId: '1' },
    { id: 'E3', ...sp(82.2070, 26.7880), elevation: 32, baseDemand: 4, patternId: '1' },

    // West residential
    { id: 'W1', ...sp(82.1940, 26.7920), elevation: 34, baseDemand: 4, patternId: '1' },
    { id: 'W2', ...sp(82.1930, 26.7900), elevation: 33, baseDemand: 5, patternId: '1' },
    { id: 'W3', ...sp(82.1920, 26.7880), elevation: 32, baseDemand: 5, patternId: '1' },

    // Far periphery — DEFICIENT ZONE (small pipes, high elevation)
    { id: 'F1', ...sp(82.2080, 26.7840), elevation: 36, baseDemand: 6, patternId: '1' },
    { id: 'F2', ...sp(82.2100, 26.7830), elevation: 38, baseDemand: 5, patternId: '1' },
    { id: 'F3', ...sp(82.2120, 26.7820), elevation: 40, baseDemand: 4, patternId: '1' },

    // South-west expansion
    { id: 'SW1', ...sp(82.1910, 26.7860), elevation: 31, baseDemand: 3, patternId: '1' },
    { id: 'SW2', ...sp(82.1900, 26.7840), elevation: 32, baseDemand: 3, patternId: '1' },
  ];

  // ---- PIPES ----
  // Transmission mains (large diameter) from WTP to tanks
  // Distribution mains (medium) from tanks to zones
  // Looped grid within zones
  // Intentionally small pipes to peripheral/deficient zones

  const pipes = [
    // WTP → Tank feeders (large transmission mains)
    { id: 'TM1', fromNode: 'WTP', toNode: 'TN1', length: 400, lengthOverride: true, diameter: 500, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM2', fromNode: 'TN1', toNode: 'TN2', length: 300, lengthOverride: true, diameter: 450, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM3', fromNode: 'TN2', toNode: 'OHT1', length: 250, lengthOverride: true, diameter: 400, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM4', fromNode: 'TN2', toNode: 'N1', length: 200, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // OHT1 distribution
    { id: 'D1', fromNode: 'OHT1', toNode: 'G1', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D2', fromNode: 'OHT1', toNode: 'N2', length: 150, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // Ghat zone grid
    { id: 'GH1', fromNode: 'G1', toNode: 'G2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'GH2', fromNode: 'G2', toNode: 'G3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'GH3', fromNode: 'G3', toNode: 'G4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Ghat to central connections
    { id: 'GC1', fromNode: 'G1', toNode: 'C1', length: 350, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'GC2', fromNode: 'G2', toNode: 'C2', length: 350, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'GC3', fromNode: 'G3', toNode: 'C3', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // North grid
    { id: 'NG1', fromNode: 'N1', toNode: 'N2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NG2', fromNode: 'N2', toNode: 'N3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NG3', fromNode: 'N3', toNode: 'N4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NG4', fromNode: 'N4', toNode: 'N5', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // North to central
    { id: 'NC1', fromNode: 'N2', toNode: 'G2', length: 300, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NC2', fromNode: 'N3', toNode: 'C2', length: 500, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NC3', fromNode: 'N5', toNode: 'G4', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Central grid
    { id: 'CG1', fromNode: 'C1', toNode: 'C2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG2', fromNode: 'C2', toNode: 'C3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG3', fromNode: 'C1', toNode: 'C4', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG4', fromNode: 'C4', toNode: 'C5', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG5', fromNode: 'C3', toNode: 'C6', length: 150, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG6', fromNode: 'C5', toNode: 'C6', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG7', fromNode: 'C2', toNode: 'C5', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // OHT2 feed from central
    { id: 'TF1', fromNode: 'C5', toNode: 'OHT2', length: 800, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // South distribution from OHT2
    { id: 'SD1', fromNode: 'OHT2', toNode: 'S3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SD2', fromNode: 'S1', toNode: 'S2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SD3', fromNode: 'S2', toNode: 'S3', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SD4', fromNode: 'S3', toNode: 'S4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SD5', fromNode: 'S4', toNode: 'S5', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Central to south connections
    { id: 'CS1', fromNode: 'C4', toNode: 'S1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CS2', fromNode: 'C5', toNode: 'S3', length: 500, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // West wing
    { id: 'WG1', fromNode: 'C1', toNode: 'W1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'WG2', fromNode: 'W1', toNode: 'W2', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'WG3', fromNode: 'W2', toNode: 'W3', length: 250, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'WG4', fromNode: 'W3', toNode: 'S1', length: 300, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // East wing
    { id: 'EG1', fromNode: 'C6', toNode: 'E1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'EG2', fromNode: 'E1', toNode: 'E2', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'EG3', fromNode: 'E2', toNode: 'E3', length: 250, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'EG4', fromNode: 'E3', toNode: 'S5', length: 350, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Far periphery — INTENTIONALLY DEFICIENT (small pipes, long runs)
    { id: 'FP1', fromNode: 'S5', toNode: 'F1', length: 500, lengthOverride: true, diameter: 100, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'FP2', fromNode: 'F1', toNode: 'F2', length: 300, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'FP3', fromNode: 'F2', toNode: 'F3', length: 300, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },

    // South-west expansion
    { id: 'SWG1', fromNode: 'W3', toNode: 'SW1', length: 300, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SWG2', fromNode: 'SW1', toNode: 'SW2', length: 250, lengthOverride: true, diameter: 100, roughness: 120, minorLoss: 0, status: 'Open' as const },

    // Loop closures for hydraulic redundancy
    { id: 'L1', fromNode: 'G4', toNode: 'E1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L2', fromNode: 'N1', toNode: 'G1', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L3', fromNode: 'W1', toNode: 'N1', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
  ];

  // For reduced scenarios, limit active nodes/pipes
  let activeJunctions = junctions;
  let activePipes = pipes;

  if (scenario === '4-dmas') {
    // Only central + ghat + north zones
    const activeZones = new Set(['C', 'G', 'N', 'TN']);
    activeJunctions = junctions.filter(j => activeZones.has(j.id.replace(/\d+$/, '')));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'OHT1']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  } else if (scenario === 'saryu-phase1') {
    // Only transmission + tank fill, minimal distribution
    const sourceNodes = new Set(['TN1', 'TN2', 'N1', 'G1', 'G2']);
    activeJunctions = junctions.filter(j => sourceNodes.has(j.id));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'OHT1']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  }

  const options = defaultOptions();
  options.duration = 24; // 24-hour EPS by default for the demo

  return {
    title: `Ayodhya AMRUT 2.0 — ${SCENARIO_LABELS[scenario]}`,
    junctions: activeJunctions,
    reservoirs,
    tanks: scenario === 'saryu-phase1' ? [tanks[0]] : tanks,
    pipes: activePipes,
    pumps: [],
    valves: [],
    patterns: [diurnalPattern],
    curves: [],
    options,
    designCriteria: defaultDesignCriteria(),
  };
}

export { AYODHYA_CENTER };
