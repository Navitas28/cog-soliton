/**
 * Time series data extraction from EPSResults for charting.
 * Extracts per-node/per-link parameter values across all EPS timesteps.
 */
import type { EPSResults } from '../engine/engine';

export interface TimeSeriesPoint {
  time: number;   // seconds from simulation start
  value: number;
}

export interface SeriesStats {
  min: number;
  max: number;
  avg: number;
  minTime: number;  // timestamp (seconds) of minimum value
  maxTime: number;  // timestamp (seconds) of maximum value
}

export type NodeSeriesParam = 'pressure' | 'head' | 'demand' | 'tankLevel';
export type LinkSeriesParam = 'flow' | 'velocity' | 'headloss';

/**
 * Extract a time series for a specific node parameter across all EPS timesteps.
 * Skips timesteps where the node has no result.
 */
export function extractNodeSeries(
  eps: EPSResults,
  nodeId: string,
  param: NodeSeriesParam,
): TimeSeriesPoint[] {
  const series: TimeSeriesPoint[] = [];
  for (const ts of eps.timestamps) {
    const nodeMap = eps.nodeResults.get(ts);
    if (!nodeMap) continue;
    const result = nodeMap.get(nodeId);
    if (!result) continue;
    series.push({ time: ts, value: result[param] });
  }
  return series;
}

/**
 * Extract a time series for a specific link parameter across all EPS timesteps.
 * Skips timesteps where the link has no result.
 */
export function extractLinkSeries(
  eps: EPSResults,
  linkId: string,
  param: LinkSeriesParam,
): TimeSeriesPoint[] {
  const series: TimeSeriesPoint[] = [];
  for (const ts of eps.timestamps) {
    const linkMap = eps.linkResults.get(ts);
    if (!linkMap) continue;
    const result = linkMap.get(linkId);
    if (!result) continue;
    series.push({ time: ts, value: result[param] });
  }
  return series;
}

/**
 * Compute basic statistics for a time series.
 */
export function computeSeriesStats(series: TimeSeriesPoint[]): SeriesStats {
  if (series.length === 0) {
    return { min: 0, max: 0, avg: 0, minTime: 0, maxTime: 0 };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let minTime = 0;
  let maxTime = 0;

  for (const pt of series) {
    sum += pt.value;
    if (pt.value < min) {
      min = pt.value;
      minTime = pt.time;
    }
    if (pt.value > max) {
      max = pt.value;
      maxTime = pt.time;
    }
  }

  return { min, max, avg: sum / series.length, minTime, maxTime };
}

/**
 * Format seconds to HH:MM string for chart axis labels.
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
