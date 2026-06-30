/**
 * Bhubaneswar sample network — synthetic but plausible AMRUT 2.0 24×7 DMA pilot.
 *
 * Modelled as:
 * - Kuakhai River source (Palasuni WTP, 130 MLD)
 * - Transmission main → WTP → clear-water feeder → ESRs → distribution
 * - 2 elevated service reservoirs (EPANET tanks for EPS dynamics)
 * - ~35 junctions in looped grid over real Bhubaneswar coordinates
 * - High-demand zones at Saheed Nagar (commercial) and Old Town (Lingaraj)
 * - Intentionally deficient Khandagiri hill zone for demo narrative
 *
 * Managed by WATCO (Water Corporation of Odisha) under AMRUT 2.0.
 *
 * Three selectable scenario labels:
 * 1. "Full City 24×7 Supply" — all zones, both tanks
 * 2. "WATCO Zone 1-3 Core" — central/north core zones
 * 3. "Kuakhai Source Phase 1" — source + north development
 */

import type { NetworkModel, DemandPattern } from '../model/types';
import { defaultOptions, defaultDesignCriteria } from '../model/types';
import { DEFAULT_DIURNAL_PATTERN } from '../model/demand';

// Centre: 20.2961°N, 85.8245°E (Lingaraj Temple area, Old Town)
const BBSR_CENTER = { lat: 20.2961, lng: 85.8245 };

// WTP location: Palasuni (east Bhubaneswar, near Kuakhai river)
const WTP_LAT = 20.3350;
const WTP_LNG = 85.8500;

// Spread factor — same as Ayodhya
const SPREAD = 3.0;

function sp(lng: number, lat: number): { x: number; y: number } {
  return {
    x: BBSR_CENTER.lng + (lng - BBSR_CENTER.lng) * SPREAD,
    y: BBSR_CENTER.lat + (lat - BBSR_CENTER.lat) * SPREAD,
  };
}

export type BhubaneswarScenario = 'full-city' | '3-zones' | 'kuakhai-phase1';

export const BBSR_SCENARIO_LABELS: Record<BhubaneswarScenario, string> = {
  'full-city': 'Full City 24×7 Supply',
  '3-zones': 'WATCO Zone 1-3 Core',
  'kuakhai-phase1': 'Kuakhai Source Phase 1',
};

export function createBhubaneswarNetwork(scenario: BhubaneswarScenario = 'full-city'): NetworkModel {
  const diurnalPattern: DemandPattern = {
    id: '1',
    multipliers: [...DEFAULT_DIURNAL_PATTERN],
  };

  // ---- SUPPLY SOURCE ----
  // Palasuni WTP (draws from Kuakhai river, 130 MLD capacity)
  const reservoirs = [
    { id: 'WTP', x: WTP_LNG, y: WTP_LAT, head: 75, patternId: '' },
  ];

  // ---- ELEVATED SERVICE RESERVOIRS ----
  const tanks = [
    {
      id: 'ESR1', ...sp(85.8300, 20.3000),
      elevation: 50, initLevel: 4, minLevel: 1, maxLevel: 8,
      diameter: 22, minVolume: 0,
    },
    {
      id: 'ESR2', ...sp(85.8350, 20.3150),
      elevation: 48, initLevel: 3.5, minLevel: 1, maxLevel: 7,
      diameter: 18, minVolume: 0,
    },
  ];

  // ---- JUNCTIONS ----

  const junctions = [
    // Transmission nodes (WTP to ESRs)
    { id: 'TN1', ...sp(85.8420, 20.3250), elevation: 42, baseDemand: 0.5, patternId: '1' },
    { id: 'TN2', ...sp(85.8380, 20.3180), elevation: 40, baseDemand: 0.5, patternId: '1' },

    // Old Town — Lingaraj Temple area (DENSE, heritage, HIGH DEMAND)
    { id: 'OT1', ...sp(85.8230, 20.2950), elevation: 33, baseDemand: 8, patternId: '1' },
    { id: 'OT2', ...sp(85.8250, 20.2940), elevation: 32, baseDemand: 10, patternId: '1' },
    { id: 'OT3', ...sp(85.8270, 20.2930), elevation: 31, baseDemand: 9, patternId: '1' },
    { id: 'OT4', ...sp(85.8240, 20.2920), elevation: 30, baseDemand: 7, patternId: '1' },
    { id: 'OT5', ...sp(85.8260, 20.2910), elevation: 30, baseDemand: 6, patternId: '1' },

    // Saheed Nagar — Central commercial hub (HIGHEST DEMAND)
    { id: 'SN1', ...sp(85.8290, 20.2980), elevation: 35, baseDemand: 10, patternId: '1' },
    { id: 'SN2', ...sp(85.8310, 20.2970), elevation: 34, baseDemand: 12, patternId: '1' },
    { id: 'SN3', ...sp(85.8330, 20.2960), elevation: 33, baseDemand: 8, patternId: '1' },
    { id: 'SN4', ...sp(85.8320, 20.2990), elevation: 34, baseDemand: 9, patternId: '1' },

    // Chandrasekharpur — North planned residential
    { id: 'CH1', ...sp(85.8280, 20.3100), elevation: 37, baseDemand: 6, patternId: '1' },
    { id: 'CH2', ...sp(85.8300, 20.3100), elevation: 36, baseDemand: 7, patternId: '1' },
    { id: 'CH3', ...sp(85.8320, 20.3100), elevation: 35, baseDemand: 8, patternId: '1' },
    { id: 'CH4', ...sp(85.8340, 20.3090), elevation: 36, baseDemand: 5, patternId: '1' },
    { id: 'CH5', ...sp(85.8360, 20.3080), elevation: 38, baseDemand: 5, patternId: '1' },

    // Patia / Infocity — IT corridor (north-east)
    { id: 'PT1', ...sp(85.8380, 20.3120), elevation: 40, baseDemand: 5, patternId: '1' },
    { id: 'PT2', ...sp(85.8400, 20.3110), elevation: 41, baseDemand: 6, patternId: '1' },
    { id: 'PT3', ...sp(85.8420, 20.3100), elevation: 42, baseDemand: 4, patternId: '1' },
    { id: 'PT4', ...sp(85.8410, 20.3130), elevation: 39, baseDemand: 7, patternId: '1' },

    // Nayapalli — West dense residential
    { id: 'NP1', ...sp(85.8180, 20.2990), elevation: 30, baseDemand: 6, patternId: '1' },
    { id: 'NP2', ...sp(85.8160, 20.2970), elevation: 29, baseDemand: 5, patternId: '1' },
    { id: 'NP3', ...sp(85.8140, 20.2950), elevation: 28, baseDemand: 4, patternId: '1' },

    // Rasulgarh — East industrial/mixed
    { id: 'RG1', ...sp(85.8400, 20.2980), elevation: 33, baseDemand: 7, patternId: '1' },
    { id: 'RG2', ...sp(85.8420, 20.2960), elevation: 32, baseDemand: 5, patternId: '1' },
    { id: 'RG3', ...sp(85.8440, 20.2940), elevation: 30, baseDemand: 6, patternId: '1' },

    // Khandagiri — South-west HILLY (DEFICIENT ZONE)
    { id: 'KG1', ...sp(85.8100, 20.2880), elevation: 45, baseDemand: 5, patternId: '1' },
    { id: 'KG2', ...sp(85.8080, 20.2860), elevation: 50, baseDemand: 4, patternId: '1' },
    { id: 'KG3', ...sp(85.8060, 20.2840), elevation: 55, baseDemand: 3, patternId: '1' },

    // Mancheswar — North-east industrial
    { id: 'MC1', ...sp(85.8420, 20.3050), elevation: 30, baseDemand: 5, patternId: '1' },
    { id: 'MC2', ...sp(85.8440, 20.3030), elevation: 29, baseDemand: 6, patternId: '1' },
    { id: 'MC3', ...sp(85.8460, 20.3010), elevation: 28, baseDemand: 4, patternId: '1' },

    // Pokhariput — Far south peripheral
    { id: 'PK1', ...sp(85.8200, 20.2870), elevation: 27, baseDemand: 4, patternId: '1' },
    { id: 'PK2', ...sp(85.8220, 20.2860), elevation: 26, baseDemand: 3, patternId: '1' },
    { id: 'PK3', ...sp(85.8240, 20.2850), elevation: 25, baseDemand: 3, patternId: '1' },
  ];

  // ---- PIPES ----

  const pipes = [
    // WTP → ESR feeders (large transmission mains)
    { id: 'TM1', fromNode: 'WTP', toNode: 'TN1', length: 400, lengthOverride: true, diameter: 500, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM2', fromNode: 'TN1', toNode: 'TN2', length: 350, lengthOverride: true, diameter: 450, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM3', fromNode: 'TN2', toNode: 'ESR2', length: 250, lengthOverride: true, diameter: 400, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM4', fromNode: 'TN2', toNode: 'CH3', length: 200, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // ESR1 feed from Saheed Nagar area
    { id: 'TF1', fromNode: 'SN4', toNode: 'ESR1', length: 400, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // ESR1 distribution
    { id: 'D1', fromNode: 'ESR1', toNode: 'SN1', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D2', fromNode: 'ESR1', toNode: 'OT1', length: 300, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // ESR2 distribution
    { id: 'D3', fromNode: 'ESR2', toNode: 'CH2', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D4', fromNode: 'ESR2', toNode: 'PT4', length: 250, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Old Town grid
    { id: 'OG1', fromNode: 'OT1', toNode: 'OT2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'OG2', fromNode: 'OT2', toNode: 'OT3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'OG3', fromNode: 'OT1', toNode: 'OT4', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'OG4', fromNode: 'OT4', toNode: 'OT5', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'OG5', fromNode: 'OT3', toNode: 'OT5', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Old Town to Saheed Nagar connections
    { id: 'OS1', fromNode: 'OT2', toNode: 'SN1', length: 350, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'OS2', fromNode: 'OT3', toNode: 'SN3', length: 350, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Saheed Nagar grid
    { id: 'SG1', fromNode: 'SN1', toNode: 'SN2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SG2', fromNode: 'SN2', toNode: 'SN3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SG3', fromNode: 'SN1', toNode: 'SN4', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SG4', fromNode: 'SN2', toNode: 'SN4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Chandrasekharpur grid
    { id: 'CG1', fromNode: 'CH1', toNode: 'CH2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG2', fromNode: 'CH2', toNode: 'CH3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG3', fromNode: 'CH3', toNode: 'CH4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG4', fromNode: 'CH4', toNode: 'CH5', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Saheed Nagar to Chandrasekharpur
    { id: 'SC1', fromNode: 'SN4', toNode: 'CH1', length: 500, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SC2', fromNode: 'SN3', toNode: 'RG1', length: 400, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Patia / Infocity grid
    { id: 'PG1', fromNode: 'PT1', toNode: 'PT2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'PG2', fromNode: 'PT2', toNode: 'PT3', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'PG3', fromNode: 'PT1', toNode: 'PT4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'PG4', fromNode: 'CH5', toNode: 'PT1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Nayapalli (west) from Old Town
    { id: 'NW1', fromNode: 'OT1', toNode: 'NP1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NW2', fromNode: 'NP1', toNode: 'NP2', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NW3', fromNode: 'NP2', toNode: 'NP3', length: 250, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Rasulgarh (east)
    { id: 'RE1', fromNode: 'RG1', toNode: 'RG2', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'RE2', fromNode: 'RG2', toNode: 'RG3', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'RE3', fromNode: 'RG1', toNode: 'MC1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Mancheswar (north-east industrial)
    { id: 'MG1', fromNode: 'MC1', toNode: 'MC2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'MG2', fromNode: 'MC2', toNode: 'MC3', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'MG3', fromNode: 'MC3', toNode: 'RG3', length: 300, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Khandagiri — DEFICIENT (small pipes, hilly, long runs)
    { id: 'KP1', fromNode: 'NP3', toNode: 'KG1', length: 500, lengthOverride: true, diameter: 100, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'KP2', fromNode: 'KG1', toNode: 'KG2', length: 300, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'KP3', fromNode: 'KG2', toNode: 'KG3', length: 300, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },

    // Pokhariput (far south)
    { id: 'PP1', fromNode: 'OT5', toNode: 'PK1', length: 400, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'PP2', fromNode: 'PK1', toNode: 'PK2', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'PP3', fromNode: 'PK2', toNode: 'PK3', length: 200, lengthOverride: true, diameter: 100, roughness: 120, minorLoss: 0, status: 'Open' as const },

    // Loop closures for hydraulic redundancy
    { id: 'L1', fromNode: 'SN3', toNode: 'OT5', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L2', fromNode: 'CH1', toNode: 'SN1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L3', fromNode: 'NP1', toNode: 'CH1', length: 500, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L4', fromNode: 'PK3', toNode: 'OT5', length: 300, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
  ];

  // Scenario filtering
  let activeJunctions = junctions;
  let activePipes = pipes;

  if (scenario === '3-zones') {
    // Core zones: Old Town, Saheed Nagar, Chandrasekharpur, Nayapalli, Transmission
    const activeZones = new Set(['OT', 'SN', 'CH', 'NP', 'TN']);
    activeJunctions = junctions.filter(j => activeZones.has(j.id.replace(/\d+$/, '')));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'ESR1', 'ESR2']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  } else if (scenario === 'kuakhai-phase1') {
    // Source development: transmission + Chandrasekharpur + Patia
    const sourceNodes = new Set(['TN1', 'TN2', 'CH2', 'CH3', 'CH4', 'CH5']);
    activeJunctions = junctions.filter(j => sourceNodes.has(j.id));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'ESR2']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  }

  const options = defaultOptions();
  options.duration = 24; // 24-hour EPS

  return {
    title: `Bhubaneswar AMRUT 2.0 — ${BBSR_SCENARIO_LABELS[scenario]}`,
    junctions: activeJunctions,
    reservoirs,
    tanks: scenario === 'kuakhai-phase1' ? [tanks[1]] : tanks,
    pipes: activePipes,
    pumps: [],
    valves: [],
    patterns: [diurnalPattern],
    curves: [],
    options,
    designCriteria: defaultDesignCriteria(),
  };
}

export { BBSR_CENTER };
