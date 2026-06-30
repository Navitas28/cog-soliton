/**
 * Calibration module — compare model predictions vs field measurements.
 * Parse field CSV, match to model nodes, compute statistics.
 */
import type { NodeResult } from './engine';

/* ─── Types ─── */

export interface FieldReading {
  nodeId: string;
  measuredPressure: number;
}

export interface MatchedPair {
  nodeId: string;
  modelled: number;
  measured: number;
  error: number; // absolute error (modelled - measured)
}

export interface MatchResult {
  matched: MatchedPair[];
  unmatched: string[]; // field node IDs not found in model
}

export interface CalibrationStats {
  count: number;
  rmse: number;           // root mean square error
  mae: number;            // mean absolute error
  maxError: number;
  maxErrorNode: string;
  r2: number;             // coefficient of determination
  meanError: number;      // mean signed error (bias)
}

/* ─── CSV Parser ─── */

const ID_PATTERNS = [/node_id/i, /^id$/i, /name/i, /junction/i, /node/i];
const PRESSURE_PATTERNS = [/measured_pressure/i, /pressure/i, /^p$/i, /field_pressure/i, /observed/i];

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex(h => pattern.test(h.trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseFieldCsv(csv: string): FieldReading[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const idCol = findColumn(headers, ID_PATTERNS);
  const pCol = findColumn(headers, PRESSURE_PATTERNS);

  if (idCol < 0 || pCol < 0) return [];

  const readings: FieldReading[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    if (cells.length <= Math.max(idCol, pCol)) continue;

    const nodeId = cells[idCol];
    const pressure = parseFloat(cells[pCol]);
    if (!nodeId || isNaN(pressure)) continue;

    readings.push({ nodeId, measuredPressure: pressure });
  }

  return readings;
}

/* ─── Matching ─── */

export function matchFieldToModel(
  fieldReadings: FieldReading[],
  modelResults: Map<string, NodeResult>,
): MatchResult {
  const matched: MatchedPair[] = [];
  const unmatched: string[] = [];

  for (const reading of fieldReadings) {
    const modelNode = modelResults.get(reading.nodeId);
    if (modelNode) {
      const error = Math.abs(modelNode.pressure - reading.measuredPressure);
      matched.push({
        nodeId: reading.nodeId,
        modelled: modelNode.pressure,
        measured: reading.measuredPressure,
        error,
      });
    } else {
      unmatched.push(reading.nodeId);
    }
  }

  return { matched, unmatched };
}

/* ─── Statistics ─── */

export function computeCalibrationStats(matched: MatchedPair[]): CalibrationStats {
  if (matched.length === 0) {
    return { count: 0, rmse: 0, mae: 0, maxError: 0, maxErrorNode: '', r2: 0, meanError: 0 };
  }

  let sumSqError = 0;
  let sumAbsError = 0;
  let sumSignedError = 0;
  let maxError = 0;
  let maxErrorNode = '';

  for (const m of matched) {
    const signedErr = m.modelled - m.measured;
    sumSqError += signedErr * signedErr;
    sumAbsError += m.error;
    sumSignedError += signedErr;
    if (m.error > maxError) {
      maxError = m.error;
      maxErrorNode = m.nodeId;
    }
  }

  const n = matched.length;
  const rmse = Math.sqrt(sumSqError / n);
  const mae = sumAbsError / n;
  const meanError = sumSignedError / n;

  // R² — coefficient of determination
  const measuredMean = matched.reduce((s, m) => s + m.measured, 0) / n;
  const ssTot = matched.reduce((s, m) => s + (m.measured - measuredMean) ** 2, 0);
  const ssRes = matched.reduce((s, m) => s + (m.measured - m.modelled) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : (ssRes === 0 ? 1 : 0);

  return { count: n, rmse, mae, maxError, maxErrorNode, r2, meanError };
}
