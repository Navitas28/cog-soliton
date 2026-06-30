/**
 * Demand helpers.
 *
 * DEMAND CONVENTION (stated explicitly):
 * - Base demand at a node = average-day demand = population × lpcd ÷ 86400 (LPS)
 * - The peak factor is NOT baked into base demand
 * - The diurnal pattern carries temporal variation; its peak multiplier IS the peak factor
 * - Never multiply by peak factor in both base demand and pattern — that double-counts
 */

/**
 * Compute average-day base demand in LPS from population and lpcd.
 * peak factor is applied through the diurnal pattern, not here.
 */
export function computeBaseDemand(population: number, lpcd: number): number {
  return (population * lpcd) / 86400;
}

/**
 * Default 24-hour diurnal demand pattern.
 * Peak multiplier ~2.5 (peak factor), representing typical Indian municipal demand variation.
 * This is the CPHEEO-style diurnal curve. Verify peak factor against CPHEEO Ch. 2.
 *
 * Hour:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
 */
export const DEFAULT_DIURNAL_PATTERN: number[] = [
  0.4, 0.3, 0.3, 0.3, 0.4, 0.6,  // 00:00–05:00 night minimum
  1.0, 1.5, 2.0, 2.5, 2.2, 1.8,  // 06:00–11:00 morning peak
  1.5, 1.3, 1.2, 1.2, 1.4, 1.6,  // 12:00–17:00 afternoon
  2.0, 2.5, 2.2, 1.8, 1.2, 0.6,  // 18:00–23:00 evening peak
];

/**
 * Validate that a diurnal pattern averages to ~1.0 (within tolerance).
 * If the average is too far from 1.0, the total daily demand will be
 * over- or under-stated relative to the average-day base demand.
 */
/**
 * CPHEEO fire demand calculation (Kuichling formula).
 * Q = 100 * sqrt(P) litres/minute, where P = population in thousands.
 * Returns fire demand in LPS.
 *
 * WARNING: Verify against CPHEEO Ch. 2 — the manual also provides
 * tabulated fire demand values by city population class. This formula
 * is one of several methods listed.
 */
export function computeFireDemand(populationThousands: number): number {
  if (populationThousands <= 0) return 0;
  const qlpm = 100 * Math.sqrt(populationThousands); // litres per minute
  return qlpm / 60; // convert to LPS
}

export function validatePatternAverage(multipliers: number[], tolerance = 0.1): {
  valid: boolean;
  average: number;
} {
  if (multipliers.length === 0) return { valid: false, average: 0 };
  const avg = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
  return { valid: Math.abs(avg - 1.0) <= tolerance, average: avg };
}
