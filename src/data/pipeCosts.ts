/**
 * Pipe cost table by diameter and material — Indian municipal SOR-based estimates.
 * Costs are supply + laying in INR per running metre (2024 rates).
 */

export type PipeMaterial = 'DI' | 'HDPE' | 'PVC';

export interface PipeCostEntry {
  diameter: number;     // mm
  material: PipeMaterial;
  costPerMeter: number; // INR/m (supply + laying)
  roughness: number;    // suggested Hazen-Williams C
}

/** Standard diameters available for each material */
export const STANDARD_DIAMETERS: Record<PipeMaterial, number[]> = {
  DI:   [80, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200],
  HDPE: [90, 110, 160, 200, 250, 315, 400, 500, 630],
  PVC:  [90, 110, 140, 160, 200, 250, 315, 400],
};

export const PIPE_COST_TABLE: PipeCostEntry[] = [
  // DI (Ductile Iron) — K7/K9 class
  { diameter: 80,   material: 'DI', costPerMeter: 1200,  roughness: 140 },
  { diameter: 100,  material: 'DI', costPerMeter: 1450,  roughness: 140 },
  { diameter: 150,  material: 'DI', costPerMeter: 2100,  roughness: 140 },
  { diameter: 200,  material: 'DI', costPerMeter: 2800,  roughness: 140 },
  { diameter: 250,  material: 'DI', costPerMeter: 3600,  roughness: 140 },
  { diameter: 300,  material: 'DI', costPerMeter: 4500,  roughness: 140 },
  { diameter: 350,  material: 'DI', costPerMeter: 5500,  roughness: 140 },
  { diameter: 400,  material: 'DI', costPerMeter: 6800,  roughness: 140 },
  { diameter: 450,  material: 'DI', costPerMeter: 8200,  roughness: 140 },
  { diameter: 500,  material: 'DI', costPerMeter: 9800,  roughness: 140 },
  { diameter: 600,  material: 'DI', costPerMeter: 13500, roughness: 140 },
  { diameter: 700,  material: 'DI', costPerMeter: 17500, roughness: 140 },
  { diameter: 800,  material: 'DI', costPerMeter: 22000, roughness: 140 },
  { diameter: 900,  material: 'DI', costPerMeter: 27000, roughness: 140 },
  { diameter: 1000, material: 'DI', costPerMeter: 33000, roughness: 140 },
  { diameter: 1200, material: 'DI', costPerMeter: 45000, roughness: 140 },

  // HDPE (PE100, PN10)
  { diameter: 90,   material: 'HDPE', costPerMeter: 450,  roughness: 150 },
  { diameter: 110,  material: 'HDPE', costPerMeter: 650,  roughness: 150 },
  { diameter: 160,  material: 'HDPE', costPerMeter: 1100, roughness: 150 },
  { diameter: 200,  material: 'HDPE', costPerMeter: 1700, roughness: 150 },
  { diameter: 250,  material: 'HDPE', costPerMeter: 2500, roughness: 150 },
  { diameter: 315,  material: 'HDPE', costPerMeter: 3800, roughness: 150 },
  { diameter: 400,  material: 'HDPE', costPerMeter: 5500, roughness: 150 },
  { diameter: 500,  material: 'HDPE', costPerMeter: 8000, roughness: 150 },
  { diameter: 630,  material: 'HDPE', costPerMeter: 12000, roughness: 150 },

  // PVC (uPVC, Class 4/6)
  { diameter: 90,   material: 'PVC', costPerMeter: 350,  roughness: 150 },
  { diameter: 110,  material: 'PVC', costPerMeter: 500,  roughness: 150 },
  { diameter: 140,  material: 'PVC', costPerMeter: 750,  roughness: 150 },
  { diameter: 160,  material: 'PVC', costPerMeter: 900,  roughness: 150 },
  { diameter: 200,  material: 'PVC', costPerMeter: 1400, roughness: 150 },
  { diameter: 250,  material: 'PVC', costPerMeter: 2100, roughness: 150 },
  { diameter: 315,  material: 'PVC', costPerMeter: 3200, roughness: 150 },
  { diameter: 400,  material: 'PVC', costPerMeter: 5000, roughness: 150 },
];

/** Look up cost per metre for a given diameter and material. Returns nearest match if exact not found. */
export function getCostPerMeter(diameter: number, material: PipeMaterial): number {
  const entries = PIPE_COST_TABLE.filter(e => e.material === material);
  const exact = entries.find(e => e.diameter === diameter);
  if (exact) return exact.costPerMeter;
  // Nearest diameter
  let best = entries[0];
  let bestDiff = Math.abs(best.diameter - diameter);
  for (const e of entries) {
    const diff = Math.abs(e.diameter - diameter);
    if (diff < bestDiff) { best = e; bestDiff = diff; }
  }
  return best.costPerMeter;
}

/** Snap a diameter to the nearest standard size for a material */
export function snapToStandard(diameter: number, material: PipeMaterial): number {
  const sizes = STANDARD_DIAMETERS[material];
  let best = sizes[0];
  let bestDiff = Math.abs(best - diameter);
  for (const s of sizes) {
    const diff = Math.abs(s - diameter);
    if (diff < bestDiff) { best = s; bestDiff = diff; }
  }
  return best;
}

/** Next larger standard diameter (or same if already largest) */
export function nextLargerStandard(diameter: number, material: PipeMaterial): number {
  const sizes = STANDARD_DIAMETERS[material];
  for (const s of sizes) {
    if (s > diameter) return s;
  }
  return sizes[sizes.length - 1];
}

/** Next smaller standard diameter (or same if already smallest) */
export function nextSmallerStandard(diameter: number, material: PipeMaterial): number {
  const sizes = [...STANDARD_DIAMETERS[material]].reverse();
  for (const s of sizes) {
    if (s < diameter) return s;
  }
  return sizes[sizes.length - 1];
}

export const MATERIAL_LABELS: Record<PipeMaterial, string> = {
  DI: 'Ductile Iron',
  HDPE: 'HDPE PE100',
  PVC: 'uPVC',
};
