/**
 * TDD tests for calibration module — model vs field measurement comparison.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFieldCsv,
  matchFieldToModel,
  computeCalibrationStats,
  type FieldReading,
} from './calibration';
import type { NodeResult } from './engine';

describe('parseFieldCsv', () => {
  it('parses CSV with node_id and measured_pressure columns', () => {
    const csv = `node_id,measured_pressure
N1,18.5
N2,12.3
N3,22.1`;
    const readings = parseFieldCsv(csv);
    expect(readings).toHaveLength(3);
    expect(readings[0]).toEqual({ nodeId: 'N1', measuredPressure: 18.5 });
    expect(readings[1]).toEqual({ nodeId: 'N2', measuredPressure: 12.3 });
  });

  it('handles whitespace and empty lines', () => {
    const csv = `  node_id , measured_pressure
N1 , 18.5

N2, 12.3
`;
    const readings = parseFieldCsv(csv);
    expect(readings).toHaveLength(2);
    expect(readings[0].nodeId).toBe('N1');
    expect(readings[0].measuredPressure).toBe(18.5);
  });

  it('handles alternative column names', () => {
    const csv = `id,pressure
N1,18.5`;
    const readings = parseFieldCsv(csv);
    expect(readings).toHaveLength(1);
    expect(readings[0].nodeId).toBe('N1');
  });

  it('returns empty array for invalid CSV', () => {
    const readings = parseFieldCsv('garbage data no headers');
    expect(readings).toHaveLength(0);
  });
});

describe('matchFieldToModel', () => {
  it('matches field readings to model node results', () => {
    const fieldReadings: FieldReading[] = [
      { nodeId: 'N1', measuredPressure: 18.5 },
      { nodeId: 'N2', measuredPressure: 12.3 },
    ];
    const modelResults = new Map<string, NodeResult>([
      ['N1', { pressure: 20, head: 40, demand: 0.05, tankLevel: 0 }],
      ['N2', { pressure: 14, head: 34, demand: 0.08, tankLevel: 0 }],
    ]);

    const result = matchFieldToModel(fieldReadings, modelResults);
    expect(result.matched).toHaveLength(2);
    expect(result.matched[0].nodeId).toBe('N1');
    expect(result.matched[0].modelled).toBe(20);
    expect(result.matched[0].measured).toBe(18.5);
    expect(result.matched[0].error).toBeCloseTo(1.5, 1);
  });

  it('reports unmatched field readings', () => {
    const fieldReadings: FieldReading[] = [
      { nodeId: 'N1', measuredPressure: 18.5 },
      { nodeId: 'UNKNOWN', measuredPressure: 15 },
    ];
    const modelResults = new Map<string, NodeResult>([
      ['N1', { pressure: 20, head: 40, demand: 0.05, tankLevel: 0 }],
    ]);

    const result = matchFieldToModel(fieldReadings, modelResults);
    expect(result.matched).toHaveLength(1);
    expect(result.unmatched).toEqual(['UNKNOWN']);
  });

  it('handles empty field readings', () => {
    const result = matchFieldToModel([], new Map());
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });
});

describe('computeCalibrationStats', () => {
  it('computes RMSE correctly', () => {
    const matched = [
      { nodeId: 'N1', modelled: 20, measured: 18, error: 2 },
      { nodeId: 'N2', modelled: 15, measured: 12, error: 3 },
    ];
    const stats = computeCalibrationStats(matched);
    // RMSE = sqrt((4 + 9) / 2) = sqrt(6.5) ≈ 2.55
    expect(stats.rmse).toBeCloseTo(Math.sqrt(6.5), 2);
  });

  it('computes mean absolute error', () => {
    const matched = [
      { nodeId: 'N1', modelled: 20, measured: 18, error: 2 },
      { nodeId: 'N2', modelled: 15, measured: 12, error: 3 },
    ];
    const stats = computeCalibrationStats(matched);
    expect(stats.mae).toBeCloseTo(2.5, 2);
  });

  it('computes max error', () => {
    const matched = [
      { nodeId: 'N1', modelled: 20, measured: 18, error: 2 },
      { nodeId: 'N2', modelled: 15, measured: 12, error: 3 },
      { nodeId: 'N3', modelled: 10, measured: 10, error: 0 },
    ];
    const stats = computeCalibrationStats(matched);
    expect(stats.maxError).toBe(3);
    expect(stats.maxErrorNode).toBe('N2');
  });

  it('computes R² (coefficient of determination)', () => {
    // Perfect correlation: R² = 1
    const perfect = [
      { nodeId: 'N1', modelled: 10, measured: 10, error: 0 },
      { nodeId: 'N2', modelled: 20, measured: 20, error: 0 },
    ];
    expect(computeCalibrationStats(perfect).r2).toBeCloseTo(1, 5);
  });

  it('returns zeros for empty input', () => {
    const stats = computeCalibrationStats([]);
    expect(stats.rmse).toBe(0);
    expect(stats.mae).toBe(0);
    expect(stats.r2).toBe(0);
  });

  it('computes count', () => {
    const matched = [
      { nodeId: 'N1', modelled: 20, measured: 18, error: 2 },
    ];
    const stats = computeCalibrationStats(matched);
    expect(stats.count).toBe(1);
  });
});
