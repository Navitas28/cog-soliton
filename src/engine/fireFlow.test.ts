/**
 * TDD tests for systematic fire flow analysis.
 */
import { describe, it, expect } from 'vitest';
import {
  computeFireDemandLPM,
  buildFireFlowTestModel,
} from './fireFlow';

describe('computeFireDemandLPM', () => {
  it('computes fire demand using CPHEEO formula Q=100*sqrt(P)', () => {
    // Population 10000 → Q = 100 * sqrt(10) = 316.2 LPM
    expect(computeFireDemandLPM(10000)).toBeCloseTo(316.23, 0);
  });

  it('computes for small population', () => {
    // Population 1000 → Q = 100 * sqrt(1) = 100 LPM
    expect(computeFireDemandLPM(1000)).toBeCloseTo(100, 0);
  });

  it('returns 0 for 0 population', () => {
    expect(computeFireDemandLPM(0)).toBe(0);
  });
});

describe('buildFireFlowTestModel', () => {
  it('adds fire demand to specified junction', () => {
    const baseInp = `[TITLE]
Test

[JUNCTIONS]
;ID  Elev  Demand  Pattern
 J1  10  0.05  ;
 J2  15  0.08  ;

[RESERVOIRS]
 R1  50  ;

[PIPES]
 P1  R1  J1  100  200  140  0  Open  ;
 P2  J1  J2  100  200  140  0  Open  ;

[OPTIONS]
 Units LPS
 Headloss H-W

[END]
`;
    const fireDemandLPS = 5.0; // 5 LPS fire demand
    const modified = buildFireFlowTestModel(baseInp, 'J1', fireDemandLPS);

    // Should contain the modified demand for J1
    expect(modified).toContain('J1');
    // J1's demand should be increased (0.05 + 5.0 = 5.05)
    expect(modified).toContain('5.05');
    // J2 should remain unchanged
    expect(modified).toContain('0.08');
  });

  it('handles junction not found gracefully', () => {
    const baseInp = `[TITLE]
Test

[JUNCTIONS]
 J1  10  0.05  ;

[END]
`;
    const modified = buildFireFlowTestModel(baseInp, 'UNKNOWN', 5.0);
    // Should return original INP unchanged
    expect(modified).toContain('J1');
    expect(modified).not.toContain('UNKNOWN');
  });
});
