/**
 * Serialize a NetworkModel to a valid EPANET INP string.
 * This is the single contract between the UI and the solver.
 */
import type { NetworkModel, Junction, Reservoir, Tank, Pipe, Pump, Valve, DemandPattern, SimulationOptions } from './types';

function pad(s: string | number, width: number): string {
  return String(s).padEnd(width);
}

function fmtNum(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function serializeToInp(model: NetworkModel): string {
  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  // [TITLE]
  push('[TITLE]');
  push(model.title);
  push('');

  // [JUNCTIONS]
  push('[JUNCTIONS]');
  push(';ID              Elev            Demand          Pattern');
  for (const j of model.junctions) {
    push(` ${pad(j.id, 16)}${pad(fmtNum(j.elevation, 2), 16)}${pad(fmtNum(j.baseDemand, 4), 16)}${j.patternId}                ;`);
  }
  push('');

  // [RESERVOIRS]
  push('[RESERVOIRS]');
  push(';ID              Head            Pattern');
  for (const r of model.reservoirs) {
    push(` ${pad(r.id, 16)}${pad(fmtNum(r.head, 2), 16)}${r.patternId}                ;`);
  }
  push('');

  // [TANKS]
  push('[TANKS]');
  push(';ID              Elevation       InitLevel       MinLevel        MaxLevel        Diameter        MinVol          VolCurve');
  for (const t of model.tanks) {
    push(` ${pad(t.id, 16)}${pad(fmtNum(t.elevation, 2), 16)}${pad(fmtNum(t.initLevel, 2), 16)}${pad(fmtNum(t.minLevel, 2), 16)}${pad(fmtNum(t.maxLevel, 2), 16)}${pad(fmtNum(t.diameter, 2), 16)}${pad(fmtNum(t.minVolume, 2), 16)}                ;`);
  }
  push('');

  // [PIPES]
  push('[PIPES]');
  push(';ID              Node1           Node2           Length          Diameter        Roughness       MinorLoss       Status');
  for (const p of model.pipes) {
    push(` ${pad(p.id, 16)}${pad(p.fromNode, 16)}${pad(p.toNode, 16)}${pad(fmtNum(p.length, 2), 16)}${pad(fmtNum(p.diameter, 2), 16)}${pad(fmtNum(p.roughness, 1), 16)}${pad(fmtNum(p.minorLoss, 2), 16)}${p.status}  ;`);
  }
  push('');

  // [PUMPS]
  push('[PUMPS]');
  push(';ID              Node1           Node2           Parameters');
  for (const pump of model.pumps) {
    let params = '';
    if (pump.curveId) {
      params = `HEAD ${pump.curveId}`;
    } else if (pump.power > 0) {
      params = `POWER ${fmtNum(pump.power, 2)}`;
    }
    if (pump.speed !== 1.0) {
      params += ` SPEED ${fmtNum(pump.speed, 2)}`;
    }
    if (pump.patternId) {
      params += ` PATTERN ${pump.patternId}`;
    }
    push(` ${pad(pump.id, 16)}${pad(pump.fromNode, 16)}${pad(pump.toNode, 16)}${params}  ;`);
  }
  push('');

  // [VALVES]
  push('[VALVES]');
  push(';ID              Node1           Node2           Diameter        Type    Setting         MinorLoss');
  for (const v of model.valves) {
    push(` ${pad(v.id, 16)}${pad(v.fromNode, 16)}${pad(v.toNode, 16)}${pad(fmtNum(v.diameter, 2), 16)}${pad(v.type, 8)}${pad(fmtNum(v.setting, 2), 16)}${fmtNum(v.minorLoss, 2)}  ;`);
  }
  push('');

  // [PATTERNS]
  push('[PATTERNS]');
  push(';ID              Multipliers');
  for (const pat of model.patterns) {
    // EPANET allows up to 6 multipliers per line
    for (let i = 0; i < pat.multipliers.length; i += 6) {
      const chunk = pat.multipliers.slice(i, i + 6);
      push(` ${pad(pat.id, 16)}${chunk.map(m => fmtNum(m, 4)).join('    ')}`);
    }
  }
  push('');

  // [CURVES]
  push('[CURVES]');
  push(';ID              X-Value         Y-Value');
  for (const c of model.curves) {
    // Type comment
    push(`;${c.type}`);
    for (const pt of c.points) {
      push(` ${pad(c.id, 16)}${pad(fmtNum(pt.x, 4), 16)}${fmtNum(pt.y, 4)}`);
    }
  }
  push('');

  // [ENERGY]
  push('[ENERGY]');
  push(' Global Efficiency  75');
  push(' Global Price       0');
  push(' Demand Charge      0');
  push('');

  // [TIMES]
  push('[TIMES]');
  pushTimes(push, model.options);
  push('');

  // [REPORT]
  push('[REPORT]');
  push(' Status              No');
  push(' Summary             No');
  push(' Page                0');
  push('');

  // [OPTIONS]
  push('[OPTIONS]');
  pushOptions(push, model.options);
  push('');

  // [COORDINATES]
  push('[COORDINATES]');
  push(';Node            X-Coord            Y-Coord');
  const allNodes = [
    ...model.junctions.map(n => ({ id: n.id, x: n.x, y: n.y })),
    ...model.reservoirs.map(n => ({ id: n.id, x: n.x, y: n.y })),
    ...model.tanks.map(n => ({ id: n.id, x: n.x, y: n.y })),
  ];
  for (const n of allNodes) {
    push(` ${pad(n.id, 16)}${pad(fmtNum(n.x, 6), 20)}${fmtNum(n.y, 6)}`);
  }
  push('');

  // Empty sections required by EPANET
  for (const section of ['[VERTICES]', '[LABELS]', '[BACKDROP]', '[EMITTERS]', '[QUALITY]', '[SOURCES]', '[REACTIONS]', '[MIXING]', '[CONTROLS]', '[RULES]']) {
    push(section);
    push('');
  }

  push('[END]');
  push('');

  return lines.join('\n');
}

function pushTimes(push: (s: string) => void, opts: SimulationOptions) {
  push(` Duration            ${formatDuration(opts.duration)}`);
  push(` Hydraulic Timestep  ${formatDuration(opts.hydraulicTimestep)}`);
  push(` Quality Timestep    ${formatDuration(opts.qualityTimestep)}`);
  push(` Pattern Timestep    ${formatDuration(opts.patternTimestep)}`);
  push(` Pattern Start       0:00`);
  push(` Report Timestep     ${formatDuration(opts.reportTimestep)}`);
  push(` Report Start        0:00`);
  push(` Start ClockTime     12 am`);
  push(` Statistic           NONE`);
}

function pushOptions(push: (s: string) => void, opts: SimulationOptions) {
  push(` Units               ${opts.flowUnits}`);
  push(` Headloss            ${opts.headloss}`);
  push(` Specific Gravity    1.0`);
  push(` Viscosity           1.0`);
  push(` Trials              40`);
  push(` Accuracy            ${opts.accuracy}`);
  push(` CHECKFREQ           2`);
  push(` MAXCHECK            10`);
  push(` DAMPLIMIT           0`);
  push(` Unbalanced          ${opts.unbalanced} ${opts.unbalancedN}`);
  push(` Pattern             1`);
  push(` Demand Multiplier   ${opts.demandMultiplier}`);
  push(` Emitter Exponent    0.5`);
  push(` Quality             None mg/L`);
  push(` Diffusivity         1.0`);
  push(` Tolerance           0.01`);
}
