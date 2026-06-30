/**
 * GIS importer — converts GeoJSON FeatureCollection to Soliton NetworkModel elements.
 * Handles LineString (→ pipes) and Point (→ junctions) features.
 * Auto-creates junction nodes at pipe endpoints, deduplicating by proximity.
 */
import { haversineDistance, computePipeLength } from '../model/geodesic';
import type { Junction, Pipe } from '../model/types';

/* ─── Types ─── */

export interface AttributeMapping {
  diameter?: string;
  roughness?: string;
  length?: string;
  material?: string;
  elevation?: string;
  pipeId?: string;
  nodeId?: string;
  demand?: string;
}

export interface ImportSummary {
  pipeCount: number;
  junctionCount: number;
  skippedCount: number;
}

export interface ImportResult {
  junctions: Junction[];
  pipes: Pipe[];
  warnings: string[];
  summary: ImportSummary;
}

interface RawNode {
  x: number;
  y: number;
}

/* ─── Node deduplication ─── */

export function deduplicateNodes(
  nodes: RawNode[],
  toleranceMeters = 1,
): { uniqueNodes: RawNode[]; indexMap: number[] } {
  const uniqueNodes: RawNode[] = [];
  const indexMap: number[] = [];

  for (const node of nodes) {
    let foundIdx = -1;
    for (let i = 0; i < uniqueNodes.length; i++) {
      const dist = haversineDistance(node.y, node.x, uniqueNodes[i].y, uniqueNodes[i].x);
      if (dist <= toleranceMeters) {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx >= 0) {
      indexMap.push(foundIdx);
    } else {
      indexMap.push(uniqueNodes.length);
      uniqueNodes.push(node);
    }
  }

  return { uniqueNodes, indexMap };
}

/* ─── Attribute auto-detection ─── */

const DIAMETER_PATTERNS = [/^dia/i, /diameter/i, /dia_mm/i, /pipe_dia/i, /size/i, /dn$/i];
const ROUGHNESS_PATTERNS = [/rough/i, /^c$/i, /hw_c/i, /hazen/i];
const LENGTH_PATTERNS = [/^length/i, /^len/i, /length_m/i, /pipe_len/i];
const MATERIAL_PATTERNS = [/material/i, /^mat$/i, /pipe_mat/i, /type/i];
const ELEVATION_PATTERNS = [/elev/i, /^z$/i, /height/i, /level/i];
const PIPE_ID_PATTERNS = [/pipe_id/i, /^id$/i, /^fid$/i, /^objectid/i, /^gid$/i, /link_id/i];
const NODE_ID_PATTERNS = [/node_id/i, /^name$/i, /^id$/i, /^label$/i, /junction_id/i];

function matchColumn(columns: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    for (const col of columns) {
      if (pattern.test(col)) return col;
    }
  }
  return undefined;
}

export function autoDetectMapping(properties: Record<string, unknown>): AttributeMapping {
  const cols = Object.keys(properties);
  return {
    diameter: matchColumn(cols, DIAMETER_PATTERNS),
    roughness: matchColumn(cols, ROUGHNESS_PATTERNS),
    length: matchColumn(cols, LENGTH_PATTERNS),
    material: matchColumn(cols, MATERIAL_PATTERNS),
    elevation: matchColumn(cols, ELEVATION_PATTERNS),
    pipeId: matchColumn(cols, PIPE_ID_PATTERNS),
    nodeId: matchColumn(cols, NODE_ID_PATTERNS),
  };
}

/* ─── Main importer ─── */

export function importGeoJSON(
  geojson: GeoJSON.FeatureCollection,
  mapping: AttributeMapping = {},
  defaultRoughness = 140,
  defaultDiameter = 200,
): ImportResult {
  const rawNodes: RawNode[] = [];
  const rawPipes: {
    startNodeIdx: number;
    endNodeIdx: number;
    props: Record<string, unknown>;
    vertices: [number, number][];
    computedLength: number;
  }[] = [];

  const pointJunctions: { x: number; y: number; props: Record<string, unknown> }[] = [];
  const warnings: string[] = [];
  let skippedCount = 0;

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    const props = (feature.properties || {}) as Record<string, unknown>;

    if (geom.type === 'LineString') {
      const coords = geom.coordinates as [number, number][];
      if (coords.length < 2) continue;

      // Start and end nodes
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];

      const startIdx = rawNodes.length;
      rawNodes.push({ x: startCoord[0], y: startCoord[1] });
      const endIdx = rawNodes.length;
      rawNodes.push({ x: endCoord[0], y: endCoord[1] });

      // Intermediate vertices (not endpoints)
      const vertices: [number, number][] = [];
      for (let i = 1; i < coords.length - 1; i++) {
        vertices.push([coords[i][0], coords[i][1]]);
      }

      // Compute length along all segments
      let length = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        length += computePipeLength(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
      }

      rawPipes.push({ startNodeIdx: startIdx, endNodeIdx: endIdx, props, vertices, computedLength: length });
    } else if (geom.type === 'Point') {
      const coord = geom.coordinates as [number, number];
      pointJunctions.push({ x: coord[0], y: coord[1], props });
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    warnings.push(`Skipped ${skippedCount} features with unsupported geometry type`);
  }

  // Add point junctions to raw nodes
  const pointNodeStartIdx = rawNodes.length;
  for (const pj of pointJunctions) {
    rawNodes.push({ x: pj.x, y: pj.y });
  }

  // Deduplicate all nodes
  const { uniqueNodes, indexMap } = deduplicateNodes(rawNodes, 1);

  // Build junctions
  let junctionCounter = 1;
  const junctions: Junction[] = uniqueNodes.map((node, _i) => {
    return {
      id: `IJ${junctionCounter++}`,
      x: node.x,
      y: node.y,
      elevation: 0,
      baseDemand: 0,
      patternId: '',
    };
  });

  // Apply point junction attributes (elevation, ID, demand)
  for (let i = 0; i < pointJunctions.length; i++) {
    const rawIdx = pointNodeStartIdx + i;
    const jIdx = indexMap[rawIdx];
    const props = pointJunctions[i].props;

    if (mapping.elevation && props[mapping.elevation] != null) {
      junctions[jIdx].elevation = Number(props[mapping.elevation]);
    }
    if (mapping.nodeId && props[mapping.nodeId] != null) {
      junctions[jIdx].id = String(props[mapping.nodeId]);
    }
    if (mapping.demand && props[mapping.demand] != null) {
      junctions[jIdx].baseDemand = Number(props[mapping.demand]);
    }
  }

  // Build pipes
  let pipeCounter = 1;
  const pipes: Pipe[] = rawPipes.map(rp => {
    const fromNodeIdx = indexMap[rp.startNodeIdx];
    const toNodeIdx = indexMap[rp.endNodeIdx];

    // Determine ID
    let id = `IP${pipeCounter++}`;
    if (mapping.pipeId && rp.props[mapping.pipeId] != null) {
      id = String(rp.props[mapping.pipeId]);
    }

    // Determine diameter
    let diameter = defaultDiameter;
    if (mapping.diameter && rp.props[mapping.diameter] != null) {
      diameter = Number(rp.props[mapping.diameter]);
    }

    // Determine roughness
    let roughness = defaultRoughness;
    if (mapping.roughness && rp.props[mapping.roughness] != null) {
      roughness = Number(rp.props[mapping.roughness]);
    }

    // Determine length (prefer computed from coordinates)
    let length = rp.computedLength;
    if (mapping.length && rp.props[mapping.length] != null) {
      length = Number(rp.props[mapping.length]);
    }

    // Material
    let material: 'DI' | 'HDPE' | 'PVC' = 'DI';
    if (mapping.material && rp.props[mapping.material] != null) {
      const mat = String(rp.props[mapping.material]).toUpperCase();
      if (mat.includes('HDPE') || mat.includes('PE')) material = 'HDPE';
      else if (mat.includes('PVC')) material = 'PVC';
    }

    return {
      id,
      fromNode: junctions[fromNodeIdx].id,
      toNode: junctions[toNodeIdx].id,
      length: Math.max(1, length),
      lengthOverride: false,
      diameter,
      roughness,
      minorLoss: 0,
      status: 'Open' as const,
      material,
      vertices: rp.vertices.length > 0 ? rp.vertices : undefined,
    };
  });

  return {
    junctions,
    pipes,
    warnings,
    summary: {
      pipeCount: pipes.length,
      junctionCount: junctions.length,
      skippedCount,
    },
  };
}
