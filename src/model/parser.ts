/**
 * Parse EPANET INP file text into a NetworkModel.
 * Reverse of serializer.ts — together they form the round-trip contract.
 */
import type { NetworkModel, Junction, Reservoir, Tank, Pipe, Pump, Valve, DemandPattern, PipeStatus, ValveType } from './types';
import { defaultOptions, defaultDesignCriteria } from './types';

/**
 * Parse an EPANET INP file string into a NetworkModel.
 * Sets lengthOverride=true on all imported pipes (preserve original lengths).
 * Uses default design criteria (not stored in INP format).
 */
export function parseInpFile(inp: string): NetworkModel {
  const sections = splitSections(inp);

  const junctions: Junction[] = [];
  const reservoirs: Reservoir[] = [];
  const tanks: Tank[] = [];
  const pipes: Pipe[] = [];
  const pumps: Pump[] = [];
  const valves: Valve[] = [];
  const patterns: DemandPattern[] = [];
  const coords = new Map<string, { x: number; y: number }>();
  const vertices = new Map<string, [number, number][]>();

  let title = '';
  const options = defaultOptions();

  // [TITLE]
  if (sections['TITLE']) {
    title = sections['TITLE'].join(' ').trim();
  }

  // [JUNCTIONS]
  for (const line of sections['JUNCTIONS'] || []) {
    const parts = tokenize(line);
    if (parts.length < 2) continue;
    junctions.push({
      id: parts[0],
      x: 0, y: 0, // filled from [COORDINATES]
      elevation: parseFloat(parts[1]),
      baseDemand: parts.length > 2 ? parseFloat(parts[2]) : 0,
      patternId: parts.length > 3 ? parts[3] : '',
    });
  }

  // [RESERVOIRS]
  for (const line of sections['RESERVOIRS'] || []) {
    const parts = tokenize(line);
    if (parts.length < 2) continue;
    reservoirs.push({
      id: parts[0],
      x: 0, y: 0,
      head: parseFloat(parts[1]),
      patternId: parts.length > 2 ? parts[2] : '',
    });
  }

  // [TANKS]
  for (const line of sections['TANKS'] || []) {
    const parts = tokenize(line);
    if (parts.length < 7) continue;
    tanks.push({
      id: parts[0],
      x: 0, y: 0,
      elevation: parseFloat(parts[1]),
      initLevel: parseFloat(parts[2]),
      minLevel: parseFloat(parts[3]),
      maxLevel: parseFloat(parts[4]),
      diameter: parseFloat(parts[5]),
      minVolume: parseFloat(parts[6]),
    });
  }

  // [PIPES]
  for (const line of sections['PIPES'] || []) {
    const parts = tokenize(line);
    if (parts.length < 7) continue;
    pipes.push({
      id: parts[0],
      fromNode: parts[1],
      toNode: parts[2],
      length: parseFloat(parts[3]),
      lengthOverride: true, // imported pipes keep their original length
      diameter: parseFloat(parts[4]),
      roughness: parseFloat(parts[5]),
      minorLoss: parseFloat(parts[6]),
      status: (parts.length > 7 ? parts[7] : 'Open') as PipeStatus,
    });
  }

  // [PUMPS]
  for (const line of sections['PUMPS'] || []) {
    const parts = tokenize(line);
    if (parts.length < 3) continue;
    const pump: Pump = {
      id: parts[0],
      fromNode: parts[1],
      toNode: parts[2],
      power: 0,
      curveId: '',
      speed: 1.0,
      patternId: '',
    };
    // Parse keyword-value pairs after the first 3 fields
    for (let i = 3; i < parts.length - 1; i++) {
      const kw = parts[i].toUpperCase();
      if (kw === 'HEAD') pump.curveId = parts[++i];
      else if (kw === 'POWER') pump.power = parseFloat(parts[++i]);
      else if (kw === 'SPEED') pump.speed = parseFloat(parts[++i]);
      else if (kw === 'PATTERN') pump.patternId = parts[++i];
    }
    pumps.push(pump);
  }

  // [VALVES]
  for (const line of sections['VALVES'] || []) {
    const parts = tokenize(line);
    if (parts.length < 6) continue;
    valves.push({
      id: parts[0],
      fromNode: parts[1],
      toNode: parts[2],
      diameter: parseFloat(parts[3]),
      type: parts[4] as ValveType,
      setting: parseFloat(parts[5]),
      minorLoss: parts.length > 6 ? parseFloat(parts[6]) : 0,
    });
  }

  // [PATTERNS] — multipliers can span multiple lines
  const patternMap = new Map<string, number[]>();
  for (const line of sections['PATTERNS'] || []) {
    const parts = tokenize(line);
    if (parts.length < 2) continue;
    const id = parts[0];
    const mults = parts.slice(1).map(parseFloat).filter(n => !isNaN(n));
    if (!patternMap.has(id)) patternMap.set(id, []);
    patternMap.get(id)!.push(...mults);
  }
  for (const [id, multipliers] of patternMap) {
    patterns.push({ id, multipliers });
  }

  // [COORDINATES]
  for (const line of sections['COORDINATES'] || []) {
    const parts = tokenize(line);
    if (parts.length < 3) continue;
    coords.set(parts[0], { x: parseFloat(parts[1]), y: parseFloat(parts[2]) });
  }

  // [VERTICES]
  for (const line of sections['VERTICES'] || []) {
    const parts = tokenize(line);
    if (parts.length < 3) continue;
    const linkId = parts[0];
    if (!vertices.has(linkId)) vertices.set(linkId, []);
    vertices.get(linkId)!.push([parseFloat(parts[1]), parseFloat(parts[2])]);
  }

  // [OPTIONS]
  for (const line of sections['OPTIONS'] || []) {
    const parts = tokenize(line);
    if (parts.length < 2) continue;
    const key = parts[0].toLowerCase();
    if (key === 'units') options.flowUnits = 'LPS'; // we lock to LPS
    if (key === 'accuracy') options.accuracy = parseFloat(parts[1]);
    if (key === 'demand' && parts[1]?.toLowerCase() === 'multiplier') {
      options.demandMultiplier = parseFloat(parts[2]);
    }
  }

  // [TIMES]
  for (const line of sections['TIMES'] || []) {
    const parts = tokenize(line);
    if (parts.length < 2) continue;
    const key = parts[0].toLowerCase();
    if (key === 'duration') options.duration = parseTime(parts.slice(1).join(' '));
    if (key === 'hydraulic' && parts[1]?.toLowerCase() === 'timestep') options.hydraulicTimestep = parseTime(parts.slice(2).join(' '));
    if (key === 'pattern' && parts[1]?.toLowerCase() === 'timestep') options.patternTimestep = parseTime(parts.slice(2).join(' '));
    if (key === 'report' && parts[1]?.toLowerCase() === 'timestep') options.reportTimestep = parseTime(parts.slice(2).join(' '));
    if (key === 'quality' && parts[1]?.toLowerCase() === 'timestep') options.qualityTimestep = parseTime(parts.slice(2).join(' '));
  }

  // Apply coordinates to nodes
  for (const j of junctions) {
    const c = coords.get(j.id);
    if (c) { j.x = c.x; j.y = c.y; }
  }
  for (const r of reservoirs) {
    const c = coords.get(r.id);
    if (c) { r.x = c.x; r.y = c.y; }
  }
  for (const t of tanks) {
    const c = coords.get(t.id);
    if (c) { t.x = c.x; t.y = c.y; }
  }

  // Apply vertices to pipes
  for (const p of pipes) {
    const v = vertices.get(p.id);
    if (v && v.length > 0) p.vertices = v;
  }

  return {
    title,
    junctions,
    reservoirs,
    tanks,
    pipes,
    pumps,
    valves,
    patterns,
    curves: [],
    options,
    designCriteria: defaultDesignCriteria(),
  };
}

/** Split INP text into named sections */
function splitSections(inp: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let currentSection = '';

  for (const rawLine of inp.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('[') && line.includes(']')) {
      currentSection = line.replace(/[\[\]]/g, '').trim().toUpperCase();
      sections[currentSection] = [];
      continue;
    }
    if (!currentSection || !line || line.startsWith(';')) continue;
    sections[currentSection].push(line);
  }

  return sections;
}

/** Tokenize a line: split on whitespace, strip trailing semicolons and comments */
function tokenize(line: string): string[] {
  // Remove trailing comment (everything after standalone ;)
  const commentIdx = line.indexOf(';');
  const clean = commentIdx >= 0 ? line.substring(0, commentIdx) : line;
  return clean.trim().split(/\s+/).filter(s => s.length > 0);
}

/** Parse time string like "24:00" or "1:00" into hours (number) */
function parseTime(timeStr: string): number {
  const clean = timeStr.trim();
  if (clean.includes(':')) {
    const [h, m] = clean.split(':').map(Number);
    return h + (m || 0) / 60;
  }
  return parseFloat(clean) || 0;
}
