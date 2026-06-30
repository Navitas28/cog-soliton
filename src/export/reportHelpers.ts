/**
 * Report data preparation helpers — pure functions for DPR generation.
 * Separated from PDF rendering for testability.
 */
import type { NetworkModel } from '../model/types';
import type { SteadyStateResult } from '../engine/engine';
import { getCostPerMeter } from '../data/pipeCosts';
import type { PipeMaterial } from '../data/pipeCosts';

/* ─── Compliance Summary ─── */

export interface DeficientJunction {
  id: string;
  pressure: number;
  deficit: number;
}

export interface ComplianceSummary {
  pressurePassing: number;
  pressureTotal: number;
  pressurePct: number;
  velocityPassing: number;
  velocityTotal: number;
  deficientJunctions: DeficientJunction[];
}

export function computeComplianceSummary(
  model: NetworkModel,
  results: SteadyStateResult,
  pressureFloor: number,
  velocityMin = 0.6,
  velocityMax = 2.5,
): ComplianceSummary {
  let pressurePassing = 0;
  const deficient: DeficientJunction[] = [];

  for (const j of model.junctions) {
    const nr = results.nodeResults.get(j.id);
    if (!nr) continue;
    if (nr.pressure >= pressureFloor) {
      pressurePassing++;
    } else {
      deficient.push({ id: j.id, pressure: nr.pressure, deficit: pressureFloor - nr.pressure });
    }
  }

  let velocityPassing = 0;
  for (const p of model.pipes) {
    const lr = results.linkResults.get(p.id);
    if (!lr) continue;
    const v = Math.abs(lr.velocity);
    if (v >= velocityMin && v <= velocityMax) velocityPassing++;
  }

  deficient.sort((a, b) => a.pressure - b.pressure);

  return {
    pressurePassing,
    pressureTotal: model.junctions.length,
    pressurePct: model.junctions.length > 0 ? (pressurePassing / model.junctions.length * 100) : 0,
    velocityPassing,
    velocityTotal: model.pipes.length,
    deficientJunctions: deficient,
  };
}

/* ─── NRW / Water Balance ─── */

export interface NRWResult {
  totalInput: number;    // LPS from reservoirs
  totalDemand: number;   // LPS consumed at junctions
  nrwLps: number;        // difference
  nrwPct: number;        // percentage
}

export function computeNRW(
  reservoirIds: string[],
  junctionIds: string[],
  results: SteadyStateResult,
): NRWResult {
  let totalInput = 0;
  for (const id of reservoirIds) {
    const nr = results.nodeResults.get(id);
    if (nr) totalInput += Math.abs(nr.demand);
  }

  let totalDemand = 0;
  for (const id of junctionIds) {
    const nr = results.nodeResults.get(id);
    if (nr) totalDemand += Math.abs(nr.demand);
  }

  const nrwLps = totalInput - totalDemand;
  const nrwPct = totalInput > 0 ? (nrwLps / totalInput * 100) : 0;

  return { totalInput, totalDemand, nrwLps, nrwPct: Math.max(0, nrwPct) };
}

/* ─── Pipe Schedule ─── */

export interface PipeScheduleRow {
  id: string;
  fromNode: string;
  toNode: string;
  diameter: number;
  material: string;
  length: number;
  roughness: number;
  flow: number;
  velocity: number;
  headloss: number;
  costPerMeter: number;
  cost: number;
}

export function buildPipeSchedule(
  model: NetworkModel,
  results: SteadyStateResult,
): PipeScheduleRow[] {
  return model.pipes.map(p => {
    const lr = results.linkResults.get(p.id);
    const mat = (p.material || 'DI') as PipeMaterial;
    const cpm = getCostPerMeter(p.diameter, mat);
    return {
      id: p.id,
      fromNode: p.fromNode,
      toNode: p.toNode,
      diameter: p.diameter,
      material: mat,
      length: p.length,
      roughness: p.roughness,
      flow: lr?.flow ?? 0,
      velocity: lr ? Math.abs(lr.velocity) : 0,
      headloss: lr?.headloss ?? 0,
      costPerMeter: cpm,
      cost: p.length * cpm,
    };
  });
}

/* ─── Node Results Table ─── */

export interface NodeResultRow {
  id: string;
  elevation: number;
  pressure: number;
  head: number;
  demand: number;
  passes: boolean;
}

export function buildNodeResultsTable(
  model: NetworkModel,
  results: SteadyStateResult,
  pressureFloor: number,
): NodeResultRow[] {
  return model.junctions.map(j => {
    const nr = results.nodeResults.get(j.id);
    return {
      id: j.id,
      elevation: j.elevation,
      pressure: nr?.pressure ?? 0,
      head: nr?.head ?? 0,
      demand: nr?.demand ?? 0,
      passes: (nr?.pressure ?? 0) >= pressureFloor,
    };
  });
}

/* ─── Formatting ─── */

export function formatLakhs(n: number): string {
  if (n >= 10000000) return `Rs ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(2)} L`;
  return `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
