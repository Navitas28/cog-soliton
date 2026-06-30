/**
 * Bareilly sample network — synthetic AMRUT 2.0 24×7 DMA pilot.
 *
 * Modelled as:
 * - Ramganga River source (WTP north-west of city)
 * - Flat Indo-Gangetic terrain (165–180m, minimal elevation variation)
 * - 2 OHTs (Central near Kutubkhana, North near Izzat Nagar)
 * - ~32 junctions across 8 zones
 * - High-demand: Kutubkhana/Bada Bazaar old city, CB Ganj industrial
 * - Deficient: Shahjahanpur Road (south peripheral, small pipes)
 *
 * Managed by Jal Kal Department under Nagar Nigam Bareilly, AMRUT 2.0.
 *
 * Three scenarios:
 * 1. "Full City 24×7 Supply" — all zones
 * 2. "Core Zones" — Old city, Civil Lines, Rajendra Nagar
 * 3. "Ramganga Phase 1" — WTP + transmission + central
 */

import type { NetworkModel, DemandPattern } from '../model/types';
import { defaultOptions, defaultDesignCriteria, defaultQualitySettings } from '../model/types';
import { DEFAULT_DIURNAL_PATTERN } from '../model/demand';

const BAREILLY_CENTER = { lat: 28.3670, lng: 79.4304 };
const WTP_LAT = 28.4000;
const WTP_LNG = 79.3800;
const SPREAD = 3.0;

function sp(lng: number, lat: number): { x: number; y: number } {
  return {
    x: BAREILLY_CENTER.lng + (lng - BAREILLY_CENTER.lng) * SPREAD,
    y: BAREILLY_CENTER.lat + (lat - BAREILLY_CENTER.lat) * SPREAD,
  };
}

export type BareillyScenario = 'full-city' | 'core-zones' | 'ramganga-phase1';

export const BAREILLY_SCENARIO_LABELS: Record<BareillyScenario, string> = {
  'full-city': 'Full City 24×7 Supply',
  'core-zones': 'Core Zones (Old City-Civil Lines)',
  'ramganga-phase1': 'Ramganga WTP Phase 1',
};

export function createBareillyNetwork(scenario: BareillyScenario = 'full-city'): NetworkModel {
  const diurnalPattern: DemandPattern = { id: '1', multipliers: [...DEFAULT_DIURNAL_PATTERN] };

  const reservoirs = [
    { id: 'WTP', x: WTP_LNG, y: WTP_LAT, head: 210, patternId: '' },
  ];

  const tanks = [
    { id: 'OHT1', ...sp(79.4280, 28.3700), elevation: 190, initLevel: 4, minLevel: 1, maxLevel: 8, diameter: 20, minVolume: 0 },
    { id: 'OHT2', ...sp(79.4350, 28.3850), elevation: 188, initLevel: 3.5, minLevel: 1, maxLevel: 7, diameter: 16, minVolume: 0 },
  ];

  const junctions = [
    // Transmission
    { id: 'TN1', ...sp(79.4100, 28.3900), elevation: 175, baseDemand: 0.5, patternId: '1' },
    { id: 'TN2', ...sp(79.4200, 28.3800), elevation: 173, baseDemand: 0.5, patternId: '1' },

    // Kutubkhana / Bada Bazaar — Old city commercial (HIGH DEMAND)
    { id: 'KB1', ...sp(79.4280, 28.3680), elevation: 170, baseDemand: 10, patternId: '1' },
    { id: 'KB2', ...sp(79.4300, 28.3670), elevation: 169, baseDemand: 12, patternId: '1' },
    { id: 'KB3', ...sp(79.4320, 28.3660), elevation: 169, baseDemand: 9, patternId: '1' },
    { id: 'KB4', ...sp(79.4290, 28.3650), elevation: 168, baseDemand: 8, patternId: '1' },

    // Civil Lines — Administrative/premium residential
    { id: 'CL1', ...sp(79.4250, 28.3730), elevation: 172, baseDemand: 6, patternId: '1' },
    { id: 'CL2', ...sp(79.4270, 28.3720), elevation: 171, baseDemand: 7, patternId: '1' },
    { id: 'CL3', ...sp(79.4240, 28.3710), elevation: 172, baseDemand: 5, patternId: '1' },

    // Rajendra Nagar — Middle-class residential
    { id: 'RN1', ...sp(79.4340, 28.3700), elevation: 170, baseDemand: 6, patternId: '1' },
    { id: 'RN2', ...sp(79.4360, 28.3690), elevation: 170, baseDemand: 5, patternId: '1' },
    { id: 'RN3', ...sp(79.4380, 28.3680), elevation: 169, baseDemand: 5, patternId: '1' },

    // DD Puram — Planned residential
    { id: 'DD1', ...sp(79.4220, 28.3660), elevation: 171, baseDemand: 5, patternId: '1' },
    { id: 'DD2', ...sp(79.4200, 28.3640), elevation: 170, baseDemand: 4, patternId: '1' },
    { id: 'DD3', ...sp(79.4180, 28.3620), elevation: 170, baseDemand: 4, patternId: '1' },

    // Izzat Nagar — North suburban/railway
    { id: 'IZ1', ...sp(79.4330, 28.3830), elevation: 173, baseDemand: 5, patternId: '1' },
    { id: 'IZ2', ...sp(79.4350, 28.3820), elevation: 172, baseDemand: 6, patternId: '1' },
    { id: 'IZ3', ...sp(79.4370, 28.3810), elevation: 172, baseDemand: 4, patternId: '1' },

    // CB Ganj — Industrial
    { id: 'CB1', ...sp(79.4400, 28.3730), elevation: 169, baseDemand: 7, patternId: '1' },
    { id: 'CB2', ...sp(79.4420, 28.3720), elevation: 168, baseDemand: 6, patternId: '1' },
    { id: 'CB3', ...sp(79.4440, 28.3710), elevation: 168, baseDemand: 5, patternId: '1' },

    // Subhash Nagar — Residential
    { id: 'SB1', ...sp(79.4200, 28.3720), elevation: 172, baseDemand: 4, patternId: '1' },
    { id: 'SB2', ...sp(79.4180, 28.3700), elevation: 171, baseDemand: 4, patternId: '1' },

    // Shahjahanpur Road — DEFICIENT (south peripheral, under-served)
    { id: 'SP1', ...sp(79.4300, 28.3580), elevation: 167, baseDemand: 5, patternId: '1' },
    { id: 'SP2', ...sp(79.4320, 28.3560), elevation: 166, baseDemand: 4, patternId: '1' },
    { id: 'SP3', ...sp(79.4340, 28.3540), elevation: 165, baseDemand: 3, patternId: '1' },
  ];

  const pipes = [
    // WTP → OHT transmission
    { id: 'TM1', fromNode: 'WTP', toNode: 'TN1', length: 500, lengthOverride: true, diameter: 500, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM2', fromNode: 'TN1', toNode: 'TN2', length: 400, lengthOverride: true, diameter: 450, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM3', fromNode: 'TN2', toNode: 'OHT1', length: 300, lengthOverride: true, diameter: 400, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM4', fromNode: 'TN2', toNode: 'CL1', length: 250, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TF1', fromNode: 'IZ1', toNode: 'OHT2', length: 300, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // OHT distribution
    { id: 'D1', fromNode: 'OHT1', toNode: 'KB1', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D2', fromNode: 'OHT1', toNode: 'CL2', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D3', fromNode: 'OHT2', toNode: 'IZ2', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // Kutubkhana grid
    { id: 'KG1', fromNode: 'KB1', toNode: 'KB2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'KG2', fromNode: 'KB2', toNode: 'KB3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'KG3', fromNode: 'KB1', toNode: 'KB4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'KG4', fromNode: 'KB3', toNode: 'KB4', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Civil Lines
    { id: 'CG1', fromNode: 'CL1', toNode: 'CL2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG2', fromNode: 'CL1', toNode: 'CL3', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CG3', fromNode: 'CL2', toNode: 'KB1', length: 250, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Rajendra Nagar
    { id: 'RG1', fromNode: 'KB3', toNode: 'RN1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'RG2', fromNode: 'RN1', toNode: 'RN2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'RG3', fromNode: 'RN2', toNode: 'RN3', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // DD Puram (west)
    { id: 'DG1', fromNode: 'KB4', toNode: 'DD1', length: 350, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'DG2', fromNode: 'DD1', toNode: 'DD2', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'DG3', fromNode: 'DD2', toNode: 'DD3', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Izzat Nagar
    { id: 'IG1', fromNode: 'CL1', toNode: 'IZ1', length: 500, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'IG2', fromNode: 'IZ1', toNode: 'IZ2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'IG3', fromNode: 'IZ2', toNode: 'IZ3', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // CB Ganj (east industrial)
    { id: 'CJ1', fromNode: 'RN3', toNode: 'CB1', length: 350, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CJ2', fromNode: 'CB1', toNode: 'CB2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'CJ3', fromNode: 'CB2', toNode: 'CB3', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Subhash Nagar
    { id: 'SG1', fromNode: 'CL3', toNode: 'SB1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'SG2', fromNode: 'SB1', toNode: 'SB2', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Shahjahanpur Road — DEFICIENT (peripheral, very long thin pipes, high demand)
    { id: 'SR1', fromNode: 'KB4', toNode: 'SP1', length: 1200, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'SR2', fromNode: 'SP1', toNode: 'SP2', length: 600, lengthOverride: true, diameter: 60, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'SR3', fromNode: 'SP2', toNode: 'SP3', length: 600, lengthOverride: true, diameter: 60, roughness: 120, minorLoss: 0, status: 'Open' as const },

    // Loop closures
    { id: 'L1', fromNode: 'RN1', toNode: 'CB1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L2', fromNode: 'IZ3', toNode: 'CB1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L3', fromNode: 'SB2', toNode: 'DD1', length: 300, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
  ];

  let activeJunctions = junctions;
  let activePipes = pipes;

  if (scenario === 'core-zones') {
    const activeZones = new Set(['KB', 'CL', 'RN', 'DD', 'SB', 'TN']);
    activeJunctions = junctions.filter(j => activeZones.has(j.id.replace(/\d+$/, '')));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'OHT1']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  } else if (scenario === 'ramganga-phase1') {
    const sourceNodes = new Set(['TN1', 'TN2', 'CL1', 'CL2', 'KB1', 'KB2']);
    activeJunctions = junctions.filter(j => sourceNodes.has(j.id));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'OHT1']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  }

  const options = defaultOptions();
  options.duration = 24;

  return {
    title: `Bareilly AMRUT 2.0 — ${BAREILLY_SCENARIO_LABELS[scenario]}`,
    junctions: activeJunctions,
    reservoirs,
    tanks: scenario === 'ramganga-phase1' ? [tanks[0]] : tanks,
    pipes: activePipes,
    pumps: [],
    valves: [],
    patterns: [diurnalPattern],
    curves: [],
    options,
    designCriteria: defaultDesignCriteria(),
    qualitySettings: defaultQualitySettings(),
    qualitySources: [],
    rules: [],
  };
}

export { BAREILLY_CENTER };
