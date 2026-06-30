/**
 * TDD tests for time series data extraction from EPSResults.
 * Written FIRST — implementation follows.
 */
import { describe, it, expect } from 'vitest';
import {
  extractNodeSeries,
  extractLinkSeries,
  computeSeriesStats,
  type TimeSeriesPoint,
} from './timeSeries';
import type { EPSResults, NodeResult, LinkResult } from '../engine/engine';

/** Helper: build a minimal EPSResults with controlled data */
function makeEPS(
  timestamps: number[],
  nodeData: Record<string, NodeResult[]>,
  linkData: Record<string, LinkResult[]>,
): EPSResults {
  const nodeResults = new Map<number, Map<string, NodeResult>>();
  const linkResults = new Map<number, Map<string, LinkResult>>();

  timestamps.forEach((ts, i) => {
    const nMap = new Map<string, NodeResult>();
    for (const [id, vals] of Object.entries(nodeData)) {
      if (vals[i]) nMap.set(id, vals[i]);
    }
    nodeResults.set(ts, nMap);

    const lMap = new Map<string, LinkResult>();
    for (const [id, vals] of Object.entries(linkData)) {
      if (vals[i]) lMap.set(id, vals[i]);
    }
    linkResults.set(ts, lMap);
  });

  return { timestamps, nodeResults, linkResults };
}

const nr = (p: number, h = 0, d = 0, tl = 0): NodeResult => ({
  pressure: p, head: h, demand: d, tankLevel: tl,
});

const lr = (f: number, v = 0, hl = 0): LinkResult => ({
  flow: f, velocity: v, headloss: hl,
});

describe('extractNodeSeries', () => {
  it('extracts pressure series for a node across all timesteps', () => {
    const eps = makeEPS(
      [0, 3600, 7200],
      { N1: [nr(20), nr(18), nr(15)] },
      {},
    );
    const series = extractNodeSeries(eps, 'N1', 'pressure');
    expect(series).toHaveLength(3);
    expect(series[0]).toEqual({ time: 0, value: 20 });
    expect(series[1]).toEqual({ time: 3600, value: 18 });
    expect(series[2]).toEqual({ time: 7200, value: 15 });
  });

  it('extracts head series for a node', () => {
    const eps = makeEPS(
      [0, 3600],
      { N1: [nr(20, 45), nr(18, 43)] },
      {},
    );
    const series = extractNodeSeries(eps, 'N1', 'head');
    expect(series[0].value).toBe(45);
    expect(series[1].value).toBe(43);
  });

  it('extracts demand series for a node', () => {
    const eps = makeEPS(
      [0, 3600],
      { N1: [nr(20, 45, 0.05), nr(18, 43, 0.12)] },
      {},
    );
    const series = extractNodeSeries(eps, 'N1', 'demand');
    expect(series[0].value).toBe(0.05);
    expect(series[1].value).toBe(0.12);
  });

  it('extracts tankLevel series for a tank', () => {
    const eps = makeEPS(
      [0, 3600],
      { T1: [nr(5, 30, 0, 3.5), nr(4, 29, 0, 2.8)] },
      {},
    );
    const series = extractNodeSeries(eps, 'T1', 'tankLevel');
    expect(series[0].value).toBe(3.5);
    expect(series[1].value).toBe(2.8);
  });

  it('returns empty array for unknown node', () => {
    const eps = makeEPS([0], { N1: [nr(20)] }, {});
    const series = extractNodeSeries(eps, 'UNKNOWN', 'pressure');
    expect(series).toEqual([]);
  });

  it('handles missing node at some timesteps gracefully', () => {
    const nodeResults = new Map<number, Map<string, NodeResult>>();
    nodeResults.set(0, new Map([['N1', nr(20)]]));
    nodeResults.set(3600, new Map()); // N1 missing at this step
    nodeResults.set(7200, new Map([['N1', nr(15)]]));
    const eps: EPSResults = {
      timestamps: [0, 3600, 7200],
      nodeResults,
      linkResults: new Map(),
    };
    const series = extractNodeSeries(eps, 'N1', 'pressure');
    // Should skip missing timesteps
    expect(series).toHaveLength(2);
    expect(series[0].time).toBe(0);
    expect(series[1].time).toBe(7200);
  });
});

describe('extractLinkSeries', () => {
  it('extracts flow series for a link across all timesteps', () => {
    const eps = makeEPS(
      [0, 3600, 7200],
      {},
      { P1: [lr(10.5), lr(12.3), lr(8.7)] },
    );
    const series = extractLinkSeries(eps, 'P1', 'flow');
    expect(series).toHaveLength(3);
    expect(series[0]).toEqual({ time: 0, value: 10.5 });
    expect(series[1]).toEqual({ time: 3600, value: 12.3 });
    expect(series[2]).toEqual({ time: 7200, value: 8.7 });
  });

  it('extracts velocity series for a link', () => {
    const eps = makeEPS(
      [0, 3600],
      {},
      { P1: [lr(10, 1.2), lr(12, 1.5)] },
    );
    const series = extractLinkSeries(eps, 'P1', 'velocity');
    expect(series[0].value).toBe(1.2);
    expect(series[1].value).toBe(1.5);
  });

  it('extracts headloss series for a link', () => {
    const eps = makeEPS(
      [0, 3600],
      {},
      { P1: [lr(10, 1.2, 0.5), lr(12, 1.5, 0.8)] },
    );
    const series = extractLinkSeries(eps, 'P1', 'headloss');
    expect(series[0].value).toBe(0.5);
    expect(series[1].value).toBe(0.8);
  });

  it('returns empty array for unknown link', () => {
    const eps = makeEPS([0], {}, { P1: [lr(10)] });
    const series = extractLinkSeries(eps, 'UNKNOWN', 'flow');
    expect(series).toEqual([]);
  });
});

describe('computeSeriesStats', () => {
  it('computes min, max, avg for a series', () => {
    const series: TimeSeriesPoint[] = [
      { time: 0, value: 10 },
      { time: 3600, value: 20 },
      { time: 7200, value: 15 },
    ];
    const stats = computeSeriesStats(series);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(20);
    expect(stats.avg).toBeCloseTo(15, 5);
  });

  it('handles single-point series', () => {
    const series: TimeSeriesPoint[] = [{ time: 0, value: 42 }];
    const stats = computeSeriesStats(series);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.avg).toBe(42);
  });

  it('returns zeros for empty series', () => {
    const stats = computeSeriesStats([]);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.avg).toBe(0);
  });

  it('computes minTime and maxTime', () => {
    const series: TimeSeriesPoint[] = [
      { time: 0, value: 10 },
      { time: 3600, value: 5 },
      { time: 7200, value: 20 },
    ];
    const stats = computeSeriesStats(series);
    expect(stats.minTime).toBe(3600);
    expect(stats.maxTime).toBe(7200);
  });
});
