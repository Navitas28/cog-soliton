/**
 * Pure functions for generating GeoJSON from the network model.
 * Extracted from MapCanvas for testability.
 */
import type { NetworkModel } from '../model/types';
import type { NodeResult, LinkResult } from '../engine/engine';

export interface NodeFeatureProps {
  id: string;
  type: 'junction' | 'reservoir' | 'tank';
  selected: boolean;
  highlighted: boolean;
  dragging: boolean;
  monitored: boolean; // has telemetry reading
  // Result-derived
  hasResult: boolean;
  pressure: number;
  passesPressure: boolean;
}

export interface LinkFeatureProps {
  id: string;
  type: 'pipe' | 'pump' | 'valve';
  selected: boolean;
  closed: boolean;
  // Result-derived
  hasResult: boolean;
  flow: number;
  velocity: number;
  velocityStatus: 'optimal' | 'ok' | 'fail' | 'none';
}

/** Generate GeoJSON FeatureCollection for all nodes (junctions, reservoirs, tanks) */
export function buildNodeFeatures(
  model: NetworkModel,
  getNodeResult: (id: string) => NodeResult | undefined,
  selectedId: string | null,
  highlightedId: string | null,
  draggingId: string | null,
  monitoredNodeIds?: Set<string>,
): GeoJSON.FeatureCollection<GeoJSON.Point, NodeFeatureProps> {
  const features: GeoJSON.Feature<GeoJSON.Point, NodeFeatureProps>[] = [];
  const pressureFloor = model.designCriteria.residualPressureFloor;

  const addNode = (id: string, x: number, y: number, type: NodeFeatureProps['type']) => {
    const nr = getNodeResult(id);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [x, y] },
      properties: {
        id,
        type,
        selected: id === selectedId,
        highlighted: id === highlightedId,
        dragging: id === draggingId,
        monitored: monitoredNodeIds?.has(id) ?? false,
        hasResult: !!nr,
        pressure: nr?.pressure ?? 0,
        passesPressure: nr ? nr.pressure >= pressureFloor : false,
      },
    });
  };

  for (const j of model.junctions) addNode(j.id, j.x, j.y, 'junction');
  for (const r of model.reservoirs) addNode(r.id, r.x, r.y, 'reservoir');
  for (const t of model.tanks) addNode(t.id, t.x, t.y, 'tank');

  return { type: 'FeatureCollection', features };
}

/** Generate GeoJSON FeatureCollection for all links (pipes, pumps, valves) */
export function buildLinkFeatures(
  model: NetworkModel,
  getLinkResult: (id: string) => LinkResult | undefined,
  selectedId: string | null,
): GeoJSON.FeatureCollection<GeoJSON.LineString, LinkFeatureProps> {
  const features: GeoJSON.Feature<GeoJSON.LineString, LinkFeatureProps>[] = [];
  const dc = model.designCriteria;

  // Node lookup
  const nodeMap = new Map<string, { x: number; y: number }>();
  for (const j of model.junctions) nodeMap.set(j.id, j);
  for (const r of model.reservoirs) nodeMap.set(r.id, r);
  for (const t of model.tanks) nodeMap.set(t.id, t);

  const velStatus = (v: number): LinkFeatureProps['velocityStatus'] => {
    const absV = Math.abs(v);
    if (absV >= dc.velocityEconomicMin && absV <= dc.velocityEconomicMax) return 'optimal';
    if (absV >= dc.velocityMin && absV <= dc.velocityMax) return 'ok';
    return 'fail';
  };

  const addLink = (id: string, fromId: string, toId: string, type: LinkFeatureProps['type'], closed: boolean) => {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) return;
    const lr = getLinkResult(id);
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[from.x, from.y], [to.x, to.y]] },
      properties: {
        id,
        type,
        selected: id === selectedId,
        closed,
        hasResult: !!lr,
        flow: lr?.flow ?? 0,
        velocity: lr?.velocity ?? 0,
        velocityStatus: lr ? velStatus(lr.velocity) : 'none',
      },
    });
  };

  for (const p of model.pipes) addLink(p.id, p.fromNode, p.toNode, 'pipe', p.status === 'Closed');
  for (const p of model.pumps) addLink(p.id, p.fromNode, p.toNode, 'pump', false);
  for (const v of model.valves) addLink(v.id, v.fromNode, v.toNode, 'valve', false);

  return { type: 'FeatureCollection', features };
}

/** Build label features at midpoints of links */
export function buildLabelFeatures(
  model: NetworkModel,
  getLinkResult: (id: string) => LinkResult | undefined,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

  const nodeMap = new Map<string, { x: number; y: number }>();
  for (const j of model.junctions) nodeMap.set(j.id, j);
  for (const r of model.reservoirs) nodeMap.set(r.id, r);
  for (const t of model.tanks) nodeMap.set(t.id, t);

  const allLinks = [
    ...model.pipes.map(p => ({ id: p.id, from: p.fromNode, to: p.toNode })),
    ...model.pumps.map(p => ({ id: p.id, from: p.fromNode, to: p.toNode })),
    ...model.valves.map(v => ({ id: v.id, from: v.fromNode, to: v.toNode })),
  ];

  for (const link of allLinks) {
    const from = nodeMap.get(link.from);
    const to = nodeMap.get(link.to);
    if (!from || !to) continue;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const lr = getLinkResult(link.id);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [mx, my] },
      properties: {
        id: link.id,
        label: link.id,
        flowLabel: lr ? `${lr.flow.toFixed(1)} LPS` : '',
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/** Blank offline-ready MapLibre style with glyphs for text rendering */
export function offlineBlankStyle(): maplibregl.StyleSpecification {
  return {
    version: 8 as const,
    // Free MapLibre demo glyphs — needed for symbol layers (text-field)
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background' as const,
        paint: { 'background-color': '#f0f2f5' },
      },
    ],
  } as any;
}
