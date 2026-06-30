/**
 * TDD tests for demand allocation — assign demands from external data sources.
 */
import { describe, it, expect } from 'vitest';
import {
  parseDemandCsv,
  allocateByPopulation,
  allocateByBilling,
  allocateAreaProportional,
  matchZonesToNodes,
  type DemandRecord,
} from './demandAllocation';
import { createEmptyNetwork } from './types';

/* ─── CSV Parsing ─── */

describe('parseDemandCsv', () => {
  it('parses CSV with zone_id and population columns', () => {
    const csv = `zone_id,population
Z1,5000
Z2,8000
Z3,3000`;
    const records = parseDemandCsv(csv);
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual({ zoneId: 'Z1', population: 5000, billingVolume: 0, area: 0 });
    expect(records[1].population).toBe(8000);
  });

  it('parses CSV with billing_volume column', () => {
    const csv = `zone_id,billing_volume
Z1,150
Z2,280`;
    const records = parseDemandCsv(csv);
    expect(records[0].billingVolume).toBe(150);
  });

  it('parses CSV with area column', () => {
    const csv = `zone_id,area,population
Z1,2.5,5000
Z2,4.0,8000`;
    const records = parseDemandCsv(csv);
    expect(records[0].area).toBe(2.5);
  });

  it('handles alternative column names', () => {
    const csv = `id,pop,volume
Z1,5000,150`;
    const records = parseDemandCsv(csv);
    expect(records[0].zoneId).toBe('Z1');
    expect(records[0].population).toBe(5000);
    expect(records[0].billingVolume).toBe(150);
  });

  it('returns empty for invalid CSV', () => {
    expect(parseDemandCsv('garbage')).toHaveLength(0);
  });

  it('skips rows with missing zone ID', () => {
    const csv = `zone_id,population
Z1,5000
,3000
Z3,2000`;
    const records = parseDemandCsv(csv);
    expect(records).toHaveLength(2);
  });
});

/* ─── Population-based allocation ─── */

describe('allocateByPopulation', () => {
  it('computes base demand from population and LPCD', () => {
    const records: DemandRecord[] = [
      { zoneId: 'J1', population: 1000, billingVolume: 0, area: 0 },
      { zoneId: 'J2', population: 2000, billingVolume: 0, area: 0 },
    ];
    const result = allocateByPopulation(records, 135);

    expect(result).toHaveLength(2);
    // demand = population * lpcd / 86400
    expect(result[0].nodeId).toBe('J1');
    expect(result[0].demand).toBeCloseTo(1000 * 135 / 86400, 4);
    expect(result[1].demand).toBeCloseTo(2000 * 135 / 86400, 4);
  });

  it('handles zero population', () => {
    const records: DemandRecord[] = [
      { zoneId: 'J1', population: 0, billingVolume: 0, area: 0 },
    ];
    const result = allocateByPopulation(records, 135);
    expect(result[0].demand).toBe(0);
  });
});

/* ─── Billing-based allocation ─── */

describe('allocateByBilling', () => {
  it('computes demand from billing volume with NRW factor', () => {
    const records: DemandRecord[] = [
      { zoneId: 'J1', population: 0, billingVolume: 100, area: 0 }, // 100 m³/day
    ];
    // demand = billingVolume * (1 + nrwFraction) / 86400 (convert m³/day to LPS)
    const result = allocateByBilling(records, 0.2);

    expect(result).toHaveLength(1);
    expect(result[0].nodeId).toBe('J1');
    // 100 * 1.2 / 86.4 = 1.389 LPS (m³/day to LPS: divide by 86.4)
    expect(result[0].demand).toBeCloseTo(100 * 1.2 / 86.4, 3);
  });
});

/* ─── Area-proportional allocation ─── */

describe('allocateAreaProportional', () => {
  it('distributes total demand proportional to area', () => {
    const records: DemandRecord[] = [
      { zoneId: 'J1', population: 0, billingVolume: 0, area: 2 },
      { zoneId: 'J2', population: 0, billingVolume: 0, area: 3 },
    ];
    const totalDemandLPS = 10;
    const result = allocateAreaProportional(records, totalDemandLPS);

    expect(result).toHaveLength(2);
    // J1 gets 2/5 = 4 LPS, J2 gets 3/5 = 6 LPS
    expect(result[0].demand).toBeCloseTo(4, 4);
    expect(result[1].demand).toBeCloseTo(6, 4);
  });

  it('handles zero total area', () => {
    const records: DemandRecord[] = [
      { zoneId: 'J1', population: 0, billingVolume: 0, area: 0 },
    ];
    const result = allocateAreaProportional(records, 10);
    expect(result[0].demand).toBe(0);
  });
});

/* ─── Zone-to-Node matching ─── */

describe('matchZonesToNodes', () => {
  it('matches zones to nodes by exact ID', () => {
    const model = createEmptyNetwork();
    model.junctions = [
      { id: 'J1', x: 0, y: 0, elevation: 0, baseDemand: 0, patternId: '' },
      { id: 'J2', x: 1, y: 0, elevation: 0, baseDemand: 0, patternId: '' },
    ];
    const zoneIds = ['J1', 'J2', 'J3'];
    const result = matchZonesToNodes(zoneIds, model);

    expect(result.matched.get('J1')).toBe('J1');
    expect(result.matched.get('J2')).toBe('J2');
    expect(result.unmatched).toContain('J3');
  });

  it('matches zones to nearest node by proximity', () => {
    const model = createEmptyNetwork();
    model.junctions = [
      { id: 'J1', x: 82.0, y: 26.8, elevation: 0, baseDemand: 0, patternId: '' },
      { id: 'J2', x: 82.01, y: 26.81, elevation: 0, baseDemand: 0, patternId: '' },
    ];
    // Zone coords close to J1
    const result = matchZonesToNodes(
      ['Z1'],
      model,
      new Map([['Z1', { x: 82.0001, y: 26.8001 }]]),
    );

    expect(result.matched.get('Z1')).toBe('J1');
  });
});

/* ─── Total demand verification ─── */

describe('allocation result verification', () => {
  it('total allocated demand matches expected', () => {
    const records: DemandRecord[] = [
      { zoneId: 'J1', population: 5000, billingVolume: 0, area: 0 },
      { zoneId: 'J2', population: 10000, billingVolume: 0, area: 0 },
    ];
    const result = allocateByPopulation(records, 135);
    const totalDemand = result.reduce((s, r) => s + r.demand, 0);
    const expected = 15000 * 135 / 86400;
    expect(totalDemand).toBeCloseTo(expected, 4);
  });
});
