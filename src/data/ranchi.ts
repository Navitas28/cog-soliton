/**
 * Ranchi sample network — synthetic AMRUT 2.0 24×7 DMA pilot.
 *
 * Modelled as:
 * - Getalsud Dam / Rukka WTP source (170 MLD, Subarnarekha River)
 * - Chota Nagpur Plateau terrain (580–700m elevation, significant variation)
 * - 2 ESRs (Doranda central, Kanke north)
 * - ~33 junctions across 9 zones
 * - High-demand: Lalpur commercial, Hindpiri old city
 * - Deficient: Ratu Road (peripheral, high elevation, small pipes)
 *
 * Three scenarios:
 * 1. "Full City 24×7 Supply" — all zones
 * 2. "Core 4 Zones" — Lalpur, Hindpiri, Doranda, Morabadi
 * 3. "Rukka Phase 1" — transmission + Doranda + Lalpur
 */

import type { NetworkModel, DemandPattern, CityMetadata } from '../model/types';
import { defaultOptions, defaultDesignCriteria, defaultQualitySettings } from '../model/types';
import { DEFAULT_DIURNAL_PATTERN } from '../model/demand';

const RANCHI_CENTER = { lat: 23.3441, lng: 85.3096 };
const WTP_LAT = 23.3800;
const WTP_LNG = 85.3200;
const SPREAD = 3.0;

const RANCHI_METADATA: CityMetadata = {
  cityName: 'Ranchi',
  stateName: 'Jharkhand',
  stateGovernment: 'Government of Jharkhand',
  implementingAgency: 'Drinking Water & Sanitation Department',
  municipalBody: 'Ranchi Municipal Corporation',
  missionName: 'AMRUT 2.0',
  cityClass: 'Class I',
  populationLakhs: 14,
  growthRatePct: 2.5,
  waterSource: 'Getalsud Dam (Subarnarekha River)',
  sourceType: 'dam',
  wtpCapacityMLD: 170,
  dprRefPrefix: 'RNC',
};

function sp(lng: number, lat: number): { x: number; y: number } {
  return {
    x: RANCHI_CENTER.lng + (lng - RANCHI_CENTER.lng) * SPREAD,
    y: RANCHI_CENTER.lat + (lat - RANCHI_CENTER.lat) * SPREAD,
  };
}

export type RanchiScenario = 'full-city' | 'core-4' | 'rukka-phase1';

export const RANCHI_SCENARIO_LABELS: Record<RanchiScenario, string> = {
  'full-city': 'Full City 24×7 Supply',
  'core-4': 'Core 4 Zones (Lalpur-Doranda)',
  'rukka-phase1': 'Rukka WTP Phase 1',
};

export function createRanchiNetwork(scenario: RanchiScenario = 'full-city'): NetworkModel {
  const diurnalPattern: DemandPattern = { id: '1', multipliers: [...DEFAULT_DIURNAL_PATTERN] };

  const reservoirs = [
    { id: 'WTP', x: WTP_LNG, y: WTP_LAT, head: 700, patternId: '' },
  ];

  const tanks = [
    { id: 'ESR1', ...sp(85.3150, 23.3400), elevation: 670, initLevel: 4, minLevel: 1, maxLevel: 8, diameter: 20, minVolume: 0 },
    { id: 'ESR2', ...sp(85.3200, 23.3500), elevation: 680, initLevel: 3.5, minLevel: 1, maxLevel: 7, diameter: 16, minVolume: 0 },
  ];

  const junctions = [
    // Transmission
    { id: 'TN1', ...sp(85.3180, 23.3650), elevation: 660, baseDemand: 0.5, patternId: '1' },
    { id: 'TN2', ...sp(85.3170, 23.3550), elevation: 655, baseDemand: 0.5, patternId: '1' },

    // Doranda — Government/commercial hub
    { id: 'DR1', ...sp(85.3130, 23.3380), elevation: 645, baseDemand: 8, patternId: '1' },
    { id: 'DR2', ...sp(85.3150, 23.3370), elevation: 643, baseDemand: 10, patternId: '1' },
    { id: 'DR3', ...sp(85.3170, 23.3360), elevation: 642, baseDemand: 7, patternId: '1' },

    // Lalpur — Commercial/business (HIGHEST DEMAND)
    { id: 'LP1', ...sp(85.3100, 23.3420), elevation: 650, baseDemand: 10, patternId: '1' },
    { id: 'LP2', ...sp(85.3120, 23.3410), elevation: 648, baseDemand: 12, patternId: '1' },
    { id: 'LP3', ...sp(85.3140, 23.3400), elevation: 647, baseDemand: 9, patternId: '1' },
    { id: 'LP4', ...sp(85.3110, 23.3390), elevation: 649, baseDemand: 8, patternId: '1' },

    // Hindpiri — Dense old city
    { id: 'HP1', ...sp(85.3080, 23.3350), elevation: 640, baseDemand: 8, patternId: '1' },
    { id: 'HP2', ...sp(85.3100, 23.3340), elevation: 638, baseDemand: 7, patternId: '1' },
    { id: 'HP3', ...sp(85.3120, 23.3330), elevation: 636, baseDemand: 6, patternId: '1' },

    // Morabadi — Premium residential
    { id: 'MB1', ...sp(85.3160, 23.3450), elevation: 655, baseDemand: 6, patternId: '1' },
    { id: 'MB2', ...sp(85.3180, 23.3440), elevation: 653, baseDemand: 5, patternId: '1' },
    { id: 'MB3', ...sp(85.3200, 23.3430), elevation: 652, baseDemand: 5, patternId: '1' },

    // Bariatu — Medical/residential
    { id: 'BR1', ...sp(85.3050, 23.3420), elevation: 655, baseDemand: 5, patternId: '1' },
    { id: 'BR2', ...sp(85.3030, 23.3400), elevation: 657, baseDemand: 4, patternId: '1' },
    { id: 'BR3', ...sp(85.3010, 23.3380), elevation: 658, baseDemand: 4, patternId: '1' },

    // HEC/Dhurwa — Industrial PSU township
    { id: 'HC1', ...sp(85.3050, 23.3300), elevation: 630, baseDemand: 6, patternId: '1' },
    { id: 'HC2', ...sp(85.3030, 23.3280), elevation: 628, baseDemand: 5, patternId: '1' },
    { id: 'HC3', ...sp(85.3010, 23.3260), elevation: 625, baseDemand: 4, patternId: '1' },

    // Harmu — Mid-city residential
    { id: 'HM1', ...sp(85.3050, 23.3460), elevation: 652, baseDemand: 5, patternId: '1' },
    { id: 'HM2', ...sp(85.3030, 23.3450), elevation: 654, baseDemand: 4, patternId: '1' },

    // Namkum — Southern industrial/IT
    { id: 'NK1', ...sp(85.3180, 23.3300), elevation: 635, baseDemand: 5, patternId: '1' },
    { id: 'NK2', ...sp(85.3200, 23.3280), elevation: 632, baseDemand: 4, patternId: '1' },

    // Ratu Road — DEFICIENT (peripheral, high elevation, chronic shortage)
    { id: 'RT1', ...sp(85.2950, 23.3450), elevation: 680, baseDemand: 5, patternId: '1' },
    { id: 'RT2', ...sp(85.2930, 23.3430), elevation: 690, baseDemand: 4, patternId: '1' },
    { id: 'RT3', ...sp(85.2910, 23.3410), elevation: 700, baseDemand: 3, patternId: '1' },
  ];

  const pipes = [
    // WTP → ESR transmission
    { id: 'TM1', fromNode: 'WTP', toNode: 'TN1', length: 500, lengthOverride: true, diameter: 500, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM2', fromNode: 'TN1', toNode: 'TN2', length: 350, lengthOverride: true, diameter: 450, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM3', fromNode: 'TN2', toNode: 'ESR2', length: 250, lengthOverride: true, diameter: 400, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TM4', fromNode: 'TN2', toNode: 'MB1', length: 300, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'TF1', fromNode: 'LP3', toNode: 'ESR1', length: 400, lengthOverride: true, diameter: 350, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // ESR distribution
    { id: 'D1', fromNode: 'ESR1', toNode: 'DR1', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D2', fromNode: 'ESR1', toNode: 'LP1', length: 250, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },
    { id: 'D3', fromNode: 'ESR2', toNode: 'MB2', length: 200, lengthOverride: true, diameter: 300, roughness: 140, minorLoss: 0, status: 'Open' as const },

    // Lalpur grid
    { id: 'LG1', fromNode: 'LP1', toNode: 'LP2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'LG2', fromNode: 'LP2', toNode: 'LP3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'LG3', fromNode: 'LP1', toNode: 'LP4', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'LG4', fromNode: 'LP4', toNode: 'HP1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Doranda grid
    { id: 'DG1', fromNode: 'DR1', toNode: 'DR2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'DG2', fromNode: 'DR2', toNode: 'DR3', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'DG3', fromNode: 'LP3', toNode: 'DR1', length: 300, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Hindpiri grid
    { id: 'HG1', fromNode: 'HP1', toNode: 'HP2', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'HG2', fromNode: 'HP2', toNode: 'HP3', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'HG3', fromNode: 'HP3', toNode: 'DR3', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Morabadi
    { id: 'MG1', fromNode: 'MB1', toNode: 'MB2', length: 200, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'MG2', fromNode: 'MB2', toNode: 'MB3', length: 200, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'MG3', fromNode: 'MB1', toNode: 'LP2', length: 400, lengthOverride: true, diameter: 250, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Bariatu (west)
    { id: 'BG1', fromNode: 'LP1', toNode: 'BR1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'BG2', fromNode: 'BR1', toNode: 'BR2', length: 250, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'BG3', fromNode: 'BR2', toNode: 'BR3', length: 250, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // HEC/Dhurwa (south)
    { id: 'HE1', fromNode: 'HP3', toNode: 'HC1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'HE2', fromNode: 'HC1', toNode: 'HC2', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'HE3', fromNode: 'HC2', toNode: 'HC3', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Harmu (north-west)
    { id: 'HR1', fromNode: 'BR1', toNode: 'HM1', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'HR2', fromNode: 'HM1', toNode: 'HM2', length: 200, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Namkum (south-east)
    { id: 'NG1', fromNode: 'DR3', toNode: 'NK1', length: 400, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'NG2', fromNode: 'NK1', toNode: 'NK2', length: 250, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },

    // Ratu Road — DEFICIENT (high elevation, small pipes, long runs)
    { id: 'RR1', fromNode: 'HM2', toNode: 'RT1', length: 600, lengthOverride: true, diameter: 100, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'RR2', fromNode: 'RT1', toNode: 'RT2', length: 300, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },
    { id: 'RR3', fromNode: 'RT2', toNode: 'RT3', length: 300, lengthOverride: true, diameter: 80, roughness: 120, minorLoss: 0, status: 'Open' as const },

    // Loop closures
    { id: 'L1', fromNode: 'MB3', toNode: 'DR2', length: 300, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L2', fromNode: 'LP4', toNode: 'DR1', length: 350, lengthOverride: true, diameter: 200, roughness: 130, minorLoss: 0, status: 'Open' as const },
    { id: 'L3', fromNode: 'HC1', toNode: 'NK1', length: 400, lengthOverride: true, diameter: 150, roughness: 130, minorLoss: 0, status: 'Open' as const },
  ];

  let activeJunctions = junctions;
  let activePipes = pipes;

  if (scenario === 'core-4') {
    const activeZones = new Set(['LP', 'DR', 'HP', 'MB', 'TN']);
    activeJunctions = junctions.filter(j => activeZones.has(j.id.replace(/\d+$/, '')));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'ESR1', 'ESR2']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  } else if (scenario === 'rukka-phase1') {
    const sourceNodes = new Set(['TN1', 'TN2', 'MB1', 'MB2', 'MB3']);
    activeJunctions = junctions.filter(j => sourceNodes.has(j.id));
    const activeNodeIds = new Set([...activeJunctions.map(j => j.id), 'WTP', 'ESR2']);
    activePipes = pipes.filter(p => activeNodeIds.has(p.fromNode) && activeNodeIds.has(p.toNode));
  }

  const options = defaultOptions();
  options.duration = 24;

  return {
    title: `Ranchi AMRUT 2.0 — ${RANCHI_SCENARIO_LABELS[scenario]}`,
    cityMetadata: RANCHI_METADATA,
    junctions: activeJunctions,
    reservoirs,
    tanks: scenario === 'rukka-phase1' ? [tanks[1]] : tanks,
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

export { RANCHI_CENTER };
