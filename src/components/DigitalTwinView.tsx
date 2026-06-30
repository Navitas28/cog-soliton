/**
 * Digital Twin view — full-screen satellite map with pressure heatmap overlay,
 * network layers, sensor markers, color legends, layer controls, and EPS time player.
 */
import { useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNetworkStore } from '../store/networkStore';
import { buildNodeFeatures, buildLinkFeatures, buildLabelFeatures } from './mapHelpers';
import { loadNetworkIcons } from './mapIcons';
import { AYODHYA_OUTLINE } from '../data/ayodhyaOutline';
import { LayerControls, useLayerVisibility } from './LayerControls';
import { ColorLegend } from './ColorLegend';
import { TimePlayer } from './TimePlayer';
import type { NodeResult, LinkResult } from '../engine/engine';

const SRC_NODES = 'network-nodes';
const SRC_LINKS = 'network-links';
const SRC_LABELS = 'network-labels';
const SRC_OUTLINE = 'ayodhya-outline';

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function satelliteStyle(): maplibregl.StyleSpecification {
  return {
    version: 8 as const,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Esri World Imagery',
      },
    },
    layers: [
      {
        id: 'satellite-tiles',
        type: 'raster',
        source: 'satellite',
        paint: { 'raster-opacity': 1 },
      },
    ],
  } as any;
}

export function DigitalTwinView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);

  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);
  const telemetryData = useNetworkStore(s => s.telemetryData);
  const scadaReadings = useNetworkStore(s => s.scadaReadings);
  const setActiveView = useNetworkStore(s => s.setActiveView);

  const { visibility, toggle, heatmapOpacity, setHeatmapOpacity } = useLayerVisibility();

  const getNodeResult = useCallback((nodeId: string): NodeResult | undefined => {
    if (solveResult) return solveResult.nodeResults.get(nodeId);
    if (epsResult) {
      const ts = epsResult.timestamps[epsTimeIndex];
      return epsResult.nodeResults.get(ts)?.get(nodeId);
    }
    return undefined;
  }, [solveResult, epsResult, epsTimeIndex]);

  const getLinkResult = useCallback((linkId: string): LinkResult | undefined => {
    if (solveResult) return solveResult.linkResults.get(linkId);
    if (epsResult) {
      const ts = epsResult.timestamps[epsTimeIndex];
      return epsResult.linkResults.get(ts)?.get(linkId);
    }
    return undefined;
  }, [solveResult, epsResult, epsTimeIndex]);

  // Monitored node IDs
  const monitoredNodeIds = new Set<string>();
  if (telemetryData) {
    for (const r of telemetryData.readings) monitoredNodeIds.add(r.nodeId);
  }
  for (const r of scadaReadings) monitoredNodeIds.add(r.nodeId);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: satelliteStyle(),
      center: [82.20, 26.80],
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-left');

    map.on('load', () => {
      // Load icons
      loadNetworkIcons(map);

      // Ayodhya outline
      map.addSource(SRC_OUTLINE, { type: 'geojson', data: AYODHYA_OUTLINE });
      map.addLayer({
        id: 'outline-fill-twin', type: 'fill', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'boundary'],
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.08 },
      });
      map.addLayer({
        id: 'outline-border-twin', type: 'line', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'boundary'],
        paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.6, 'line-dasharray': [4, 2] },
      });
      map.addLayer({
        id: 'outline-river-twin', type: 'line', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'river'],
        paint: { 'line-color': '#5dade2', 'line-width': 3, 'line-opacity': 0.8 },
      });

      // Network sources
      map.addSource(SRC_LINKS, { type: 'geojson', data: EMPTY_FC });
      map.addSource(SRC_NODES, { type: 'geojson', data: EMPTY_FC });
      map.addSource(SRC_LABELS, { type: 'geojson', data: EMPTY_FC });

      // Link layers
      const linkColor: maplibregl.ExpressionSpecification = [
        'case',
        ['==', ['get', 'velocityStatus'], 'optimal'], '#2ecc71',
        ['==', ['get', 'velocityStatus'], 'ok'], '#f39c12',
        ['==', ['get', 'velocityStatus'], 'fail'], '#e74c3c',
        ['==', ['get', 'type'], 'pump'], '#e67e22',
        ['==', ['get', 'type'], 'valve'], '#9b59b6',
        ['boolean', ['get', 'closed'], false], '#666666',
        '#48c9b0',
      ];

      map.addLayer({
        id: 'links-line-twin', type: 'line', source: SRC_LINKS,
        filter: ['!', ['boolean', ['get', 'closed'], false]],
        paint: { 'line-color': linkColor, 'line-width': 3, 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: 'links-line-closed-twin', type: 'line', source: SRC_LINKS,
        filter: ['boolean', ['get', 'closed'], false],
        paint: { 'line-color': linkColor, 'line-width': 3, 'line-opacity': 0.7, 'line-dasharray': [4, 2] },
      });

      // Heatmap layer — low pressure = high heat (red)
      map.addLayer({
        id: 'heatmap-layer', type: 'heatmap', source: SRC_NODES,
        filter: ['all', ['==', ['get', 'type'], 'junction'], ['boolean', ['get', 'hasResult'], false]],
        paint: {
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'pressure'],
            0, 1,    // low pressure → high weight (hot)
            10, 0.7,
            20, 0.4,
            30, 0.15,
            40, 0,   // high pressure → low weight (cool)
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, 30,
            14, 50,
            18, 80,
          ],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            10, 1,
            14, 1.5,
            18, 2,
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.1, 'rgba(46,204,113,0.4)',   // green — good pressure
            0.3, 'rgba(241,196,15,0.6)',   // yellow — marginal
            0.5, 'rgba(230,126,34,0.7)',   // orange — low
            0.7, 'rgba(231,76,60,0.8)',    // red — critical
            1.0, 'rgba(139,0,0,0.9)',      // dark red — failure
          ],
          'heatmap-opacity': 0.6,
        },
      });

      // Node icons (on top of heatmap)
      map.addLayer({
        id: 'nodes-icons-twin', type: 'symbol', source: SRC_NODES,
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'type'], 'reservoir'], 'icon-reservoir',
            ['==', ['get', 'type'], 'tank'], 'icon-tank',
            ['all', ['boolean', ['get', 'hasResult'], false], ['boolean', ['get', 'passesPressure'], false]], 'icon-junction-pass',
            ['boolean', ['get', 'hasResult'], false], 'icon-junction-fail',
            'icon-junction-default',
          ],
          'icon-size': 1.0,
          'icon-allow-overlap': true,
          'icon-pitch-alignment': 'map',
        },
      });

      // Sensor ring for monitored nodes
      map.addLayer({
        id: 'sensor-ring-twin', type: 'circle', source: SRC_NODES,
        filter: ['boolean', ['get', 'monitored'], false],
        paint: {
          'circle-radius': 14,
          'circle-color': 'transparent',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#00bcd4',
          'circle-stroke-opacity': 0.9,
        },
      });

      // Labels
      map.addLayer({
        id: 'node-labels-twin', type: 'symbol', source: SRC_NODES,
        minzoom: 13,
        layout: {
          'text-field': ['get', 'id'],
          'text-size': 11,
          'text-offset': [0, -1.5],
          'text-allow-overlap': false,
          'text-font': ['Open Sans Semibold'],
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.7)', 'text-halo-width': 1.5 },
      });

      map.addLayer({
        id: 'pressure-labels-twin', type: 'symbol', source: SRC_NODES,
        minzoom: 14,
        filter: ['all', ['==', ['get', 'type'], 'junction'], ['boolean', ['get', 'hasResult'], false]],
        layout: {
          'text-field': ['concat', ['to-string', ['round', ['get', 'pressure']]], 'm'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['case', ['boolean', ['get', 'passesPressure'], false], '#2ecc71', '#e74c3c'],
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1,
        },
      });

      map.addLayer({
        id: 'link-labels-twin', type: 'symbol', source: SRC_LABELS,
        minzoom: 14,
        layout: {
          'text-field': ['concat', ['get', 'label'], '\n', ['get', 'flowLabel']],
          'text-size': 10,
          'text-offset': [0, -1],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#ecf0f1', 'text-halo-color': 'rgba(0,0,0,0.7)', 'text-halo-width': 1.5 },
      });

      mapReadyRef.current = true;
      // Trigger initial data update
      updateMapData(map);
      fitToNetwork(map);
    });

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; mapReadyRef.current = false; };
  }, []);

  // Update GeoJSON data
  const updateMapData = useCallback((map: maplibregl.Map) => {
    if (!mapReadyRef.current) return;

    const nodeSrc = map.getSource(SRC_NODES) as maplibregl.GeoJSONSource;
    const linkSrc = map.getSource(SRC_LINKS) as maplibregl.GeoJSONSource;
    const labelSrc = map.getSource(SRC_LABELS) as maplibregl.GeoJSONSource;

    if (nodeSrc) nodeSrc.setData(buildNodeFeatures(model, getNodeResult, null, null, null, monitoredNodeIds));
    if (linkSrc) linkSrc.setData(buildLinkFeatures(model, getLinkResult, null));
    if (labelSrc) labelSrc.setData(buildLabelFeatures(model, getLinkResult));
  }, [model, getNodeResult, getLinkResult, solveResult, epsResult, epsTimeIndex, telemetryData, scadaReadings]);

  const fitToNetwork = useCallback((map: maplibregl.Map) => {
    const allNodes = [...model.junctions, ...model.reservoirs, ...model.tanks];
    if (allNodes.length < 2) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const n of allNodes) bounds.extend([n.x, n.y]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
  }, [model]);

  // Update data when model/results change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    updateMapData(map);
  }, [updateMapData]);

  // Fit bounds on model change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    fitToNetwork(map);
  }, [model.title]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const layerMap: Record<string, string[]> = {
      heatmap: ['heatmap-layer'],
      pipes: ['links-line-twin', 'links-line-closed-twin'],
      junctions: ['nodes-icons-twin'],
      reservoirs: ['nodes-icons-twin'],
      tanks: ['nodes-icons-twin'],
      sensors: ['sensor-ring-twin'],
      labels: ['node-labels-twin', 'pressure-labels-twin', 'link-labels-twin'],
    };

    for (const [key, layers] of Object.entries(layerMap)) {
      const vis = visibility[key as keyof typeof visibility] ? 'visible' : 'none';
      for (const layerId of layers) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', vis);
        }
      }
    }
  }, [visibility]);

  // Heatmap opacity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (map.getLayer('heatmap-layer')) {
      map.setPaintProperty('heatmap-layer', 'heatmap-opacity', heatmapOpacity);
    }
  }, [heatmapOpacity]);

  const hasResults = !!(solveResult || epsResult);

  return (
    <div className="twin-view">
      {/* Back button */}
      <div className="twin-top-bar">
        <button className="twin-back-btn" onClick={() => setActiveView('design')}>
          ← Design
        </button>
        <span className="twin-title">{model.title || 'Digital Twin'}</span>
        {hasResults && (
          <span className="twin-status">
            {model.options.duration > 0 ? 'EPS' : 'Steady-State'} — Live
          </span>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Layer controls */}
      <LayerControls
        visibility={visibility}
        onToggle={toggle}
        heatmapOpacity={heatmapOpacity}
        onHeatmapOpacityChange={setHeatmapOpacity}
      />

      {/* Color legend */}
      <ColorLegend />

      {/* Time player */}
      <TimePlayer />
    </div>
  );
}
