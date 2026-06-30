/**
 * Network data model types for Soliton.
 * These types define the complete hydraulic network that serializes to EPANET INP format.
 */

export interface Junction {
  id: string;
  x: number;       // longitude or map x
  y: number;       // latitude or map y
  elevation: number; // metres
  baseDemand: number; // average-day demand in LPS (peak factor is in the pattern, NOT here)
  patternId: string;  // demand pattern reference (empty string = no pattern)
}

export interface Reservoir {
  id: string;
  x: number;
  y: number;
  head: number;     // fixed hydraulic head in metres
  patternId: string; // head pattern (empty = constant)
}

export interface Tank {
  id: string;
  x: number;
  y: number;
  elevation: number;  // bottom elevation in metres
  initLevel: number;  // initial water level above bottom (m)
  minLevel: number;   // minimum water level (m)
  maxLevel: number;   // maximum water level (m)
  diameter: number;   // tank diameter (m) — used for volume calc
  minVolume: number;  // minimum volume at minLevel (m³), typically 0
}

export type PipeStatus = 'Open' | 'Closed' | 'CV';
export type PipeMaterial = 'DI' | 'HDPE' | 'PVC';

export interface Pipe {
  id: string;
  fromNode: string;
  toNode: string;
  length: number;      // metres — auto-populated from geodesic distance, with manual override
  lengthOverride: boolean; // true if user manually set length (don't auto-recompute)
  diameter: number;    // mm
  roughness: number;   // Hazen-Williams C coefficient
  minorLoss: number;   // minor loss coefficient
  status: PipeStatus;
  material?: PipeMaterial; // pipe material (default 'DI' if absent)
  vertices?: [number, number][]; // intermediate bend points [x(lng), y(lat)]
}

export interface Pump {
  id: string;
  fromNode: string;
  toNode: string;
  // Power-based pump for simplicity; head-curve pumps use curveId
  power: number;       // kW (constant power pump) — 0 if using curve
  curveId: string;     // pump head-flow curve id (empty = power pump)
  speed: number;       // relative speed factor (default 1.0)
  patternId: string;   // speed pattern (empty = constant)
}

export type ValveType = 'PRV' | 'PSV' | 'PBV' | 'FCV' | 'TCV' | 'GPV';

export interface Valve {
  id: string;
  fromNode: string;
  toNode: string;
  diameter: number;    // mm
  type: ValveType;
  setting: number;     // pressure/flow setting depending on type
  minorLoss: number;
}

export interface DemandPattern {
  id: string;
  multipliers: number[]; // hourly multipliers (24 values for a diurnal curve)
}

export interface Curve {
  id: string;
  type: 'PUMP' | 'EFFICIENCY' | 'VOLUME' | 'HEADLOSS';
  points: { x: number; y: number }[];
}

export interface SimulationOptions {
  flowUnits: 'LPS';           // locked to LPS (SI)
  headloss: 'H-W';            // locked to Hazen-Williams
  duration: number;            // total simulation duration in hours (0 = steady-state)
  hydraulicTimestep: number;   // hours
  patternTimestep: number;     // hours
  reportTimestep: number;      // hours
  qualityTimestep: number;     // hours (fractional)
  demandMultiplier: number;    // global demand multiplier (default 1.0)
  accuracy: number;            // convergence accuracy (default 0.001)
  unbalanced: 'Continue' | 'Stop';
  unbalancedN: number;         // max unbalanced trials
}

/** CPHEEO-based design criteria — all user-overridable */
export interface DesignCriteria {
  lpcd: number;                  // per-capita supply (litres per capita per day)
  peakFactor: number;            // peak-hour factor (pattern peak multiplier) — verify against CPHEEO
  residualPressureFloor: number; // minimum residual pressure at junctions (m)
  velocityMin: number;           // minimum pipe velocity (m/s)
  velocityMax: number;           // maximum pipe velocity (m/s)
  velocityEconomicMin: number;   // economic velocity band lower (m/s)
  velocityEconomicMax: number;   // economic velocity band upper (m/s)
  defaultRoughness: number;      // default H-W C for new pipes
  nrwTarget: number;             // non-revenue water target (fraction, e.g. 0.20)
  designPeriodYears: number;     // design period (years)
}

/** The complete network model */
export interface NetworkModel {
  title: string;
  junctions: Junction[];
  reservoirs: Reservoir[];
  tanks: Tank[];
  pipes: Pipe[];
  pumps: Pump[];
  valves: Valve[];
  patterns: DemandPattern[];
  curves: Curve[];
  options: SimulationOptions;
  designCriteria: DesignCriteria;
}

/** Default simulation options */
export function defaultOptions(): SimulationOptions {
  return {
    flowUnits: 'LPS',
    headloss: 'H-W',
    duration: 0,
    hydraulicTimestep: 1,
    patternTimestep: 1,
    reportTimestep: 1,
    qualityTimestep: 0.0833, // 5 minutes
    demandMultiplier: 1.0,
    accuracy: 0.001,
    unbalanced: 'Continue',
    unbalancedN: 10,
  };
}

/** Default CPHEEO design criteria for Ayodhya (Class I city) */
export function defaultDesignCriteria(): DesignCriteria {
  return {
    lpcd: 135,                   // Class I city under 10 lakh with sewerage
    peakFactor: 2.5,             // verify against CPHEEO Ch. 2
    residualPressureFloor: 17,   // CPHEEO 24x7 DMA target for Class I/II
    velocityMin: 0.6,
    velocityMax: 2.5,
    velocityEconomicMin: 1.0,
    velocityEconomicMax: 1.5,
    defaultRoughness: 140,       // new ductile iron
    nrwTarget: 0.20,             // AMRUT 2.0 target
    designPeriodYears: 30,
  };
}

/** Create an empty network model */
export function createEmptyNetwork(title = 'Untitled Network'): NetworkModel {
  return {
    title,
    junctions: [],
    reservoirs: [],
    tanks: [],
    pipes: [],
    pumps: [],
    valves: [],
    patterns: [],
    curves: [],
    options: defaultOptions(),
    designCriteria: defaultDesignCriteria(),
  };
}
