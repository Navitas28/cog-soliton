/**
 * Interactive network map using MapLibre GL.
 * Network elements rendered as GeoJSON layers. Ayodhya outline as basemap overlay.
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNetworkStore } from '../store/networkStore';
import { DemoLoader } from './DemoLoader';
import { ExportPanel } from './ExportPanel';
import { ScadaIndicator } from './ScadaPanel';
import { buildNodeFeatures, buildLinkFeatures, buildLabelFeatures, offlineBlankStyle, countPressurePassing, countVelocityPassing } from './mapHelpers';
import { MapLegend } from './ColorLegend';
import { ComparisonDashboard } from './ComparisonDashboard';
import { ShortcutOverlay } from './ShortcutOverlay';
import { SearchBox } from './SearchBox';
import { CostPanel } from './CostPanel';
import { OptimizerPanel } from './OptimizerPanel';
import { loadNetworkIcons } from './mapIcons';
import { AYODHYA_OUTLINE } from '../data/ayodhyaOutline';
import { BHUBANESWAR_OUTLINE } from '../data/bhubaneswarOutline';
import { RANCHI_OUTLINE } from '../data/ranchiOutline';
import { BAREILLY_OUTLINE } from '../data/bareillyOutline';
import type { NodeResult, LinkResult } from '../engine/engine';
import type { DrawingTool } from '../store/networkStore';

const NODE_LAYER = 'nodes-icons';

const KEY_TO_TOOL: Record<string, DrawingTool> = {
  s: 'select', r: 'reservoir', j: 'junction', t: 'tank', p: 'pipe', u: 'pump', v: 'valve',
};

// Source/layer IDs
const SRC_NODES = 'network-nodes';
const SRC_LINKS = 'network-links';
const SRC_LABELS = 'network-labels';
const SRC_OUTLINE = 'ayodhya-outline';

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export function MapCanvas() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Drag state
  const draggingNodeIdRef = useRef<string | null>(null);
  const draggingVertexRef = useRef<{ pipeId: string; index: number } | null>(null);
  const didDragRef = useRef(false);

  // Store selectors
  const model = useNetworkStore(s => s.model);
  const activeTool = useNetworkStore(s => s.activeTool);
  const selectedId = useNetworkStore(s => s.selectedElementId);
  const selectedType = useNetworkStore(s => s.selectedElementType);
  const pipeDrawingFrom = useNetworkStore(s => s.pipeDrawingFrom);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);

  const selectElement = useNetworkStore(s => s.selectElement);
  const setActiveTool = useNetworkStore(s => s.setActiveTool);
  const setPipeDrawingFrom = useNetworkStore(s => s.setPipeDrawingFrom);
  const deleteElement = useNetworkStore(s => s.deleteElement);
  const solve = useNetworkStore(s => s.solve);
  const isSolving = useNetworkStore(s => s.isSolving);
  const solveError = useNetworkStore(s => s.solveError);
  const lastInp = useNetworkStore(s => s.lastInp);
  const setShowResultsDashboard = useNetworkStore(s => s.setShowResultsDashboard);
  const showResultsDashboard = useNetworkStore(s => s.showResultsDashboard);
  const setShowScenarioPanel = useNetworkStore(s => s.setShowScenarioPanel);
  const showScenarioPanel = useNetworkStore(s => s.showScenarioPanel);
  const setEpsTimeIndex = useNetworkStore(s => s.setEpsTimeIndex);

  const [showInp, setShowInp] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toggleDropdown = (name: string) => setOpenDropdown(prev => prev === name ? null : name);

  // Result helpers
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

  const hasResults = !!(solveResult || epsResult);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      if (KEY_TO_TOOL[key]) { e.preventDefault(); setActiveTool(KEY_TO_TOOL[key]); return; }

      if ((key === 'delete' || key === 'backspace') && selectedId && selectedType) {
        e.preventDefault(); deleteElement(selectedId, selectedType); return;
      }

      if (key === 'escape') { selectElement(null, null); setPipeDrawingFrom(null); setShowSearch(false); return; }

      if (e.key === '?') { e.preventDefault(); setShowShortcuts(v => !v); return; }
      if (key === '/' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setShowSearch(true); return; }

      if (key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault(); (useNetworkStore as any).temporal.getState().undo(); return;
      }
      if ((key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) || (key === 'y' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); (useNetworkStore as any).temporal.getState().redo(); return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, selectedType, setActiveTool, deleteElement, selectElement, setPipeDrawingFrom]);

  // --- Initialize MapLibre ---
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: offlineBlankStyle(),
      center: [82.00, 26.85], // India — will fitBounds when network loads
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      // Load programmatic icons
      loadNetworkIcons(map);

      // Ayodhya outline — subtle on real basemap
      map.addSource(SRC_OUTLINE, { type: 'geojson', data: AYODHYA_OUTLINE });
      map.addLayer({
        id: 'outline-fill', type: 'fill', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'boundary'],
        paint: { 'fill-color': '#3a5fcf', 'fill-opacity': 0.06 },
        layout: { visibility: 'none' },
      });
      map.addLayer({
        id: 'outline-border', type: 'line', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'boundary'],
        paint: { 'line-color': '#3a5fcf', 'line-width': 2, 'line-opacity': 0.4, 'line-dasharray': [6, 3] },
        layout: { visibility: 'none' },
      });

      // Network sources
      map.addSource(SRC_LINKS, { type: 'geojson', data: EMPTY_FC });
      map.addSource(SRC_NODES, { type: 'geojson', data: EMPTY_FC });
      map.addSource(SRC_LABELS, { type: 'geojson', data: EMPTY_FC });
      map.addSource('network-vertices', { type: 'geojson', data: EMPTY_FC });

      // Link color expression
      const linkColor: maplibregl.ExpressionSpecification = [
        'case',
        ['==', ['get', 'velocityStatus'], 'optimal'], '#2ecc71',
        ['==', ['get', 'velocityStatus'], 'ok'], '#f39c12',
        ['==', ['get', 'velocityStatus'], 'fail'], '#e74c3c',
        ['==', ['get', 'type'], 'pump'], '#e67e22',
        ['==', ['get', 'type'], 'valve'], '#9b59b6',
        ['boolean', ['get', 'closed'], false], '#999999',
        '#3498db',
      ];
      const linkWidth: maplibregl.ExpressionSpecification = [
        'case', ['boolean', ['get', 'selected'], false], 6, 4,
      ];

      // Pipe casing (white outline for readability on basemap)
      map.addLayer({
        id: 'links-casing', type: 'line', source: SRC_LINKS,
        paint: {
          'line-color': '#ffffff',
          'line-width': ['case', ['boolean', ['get', 'selected'], false], 10, 7],
          'line-opacity': 0.5,
        },
      });

      // Open links (solid)
      map.addLayer({
        id: 'links-line', type: 'line', source: SRC_LINKS,
        filter: ['!', ['boolean', ['get', 'closed'], false]],
        paint: { 'line-color': linkColor, 'line-width': linkWidth },
      });

      // Closed links (dashed)
      map.addLayer({
        id: 'links-line-closed', type: 'line', source: SRC_LINKS,
        filter: ['boolean', ['get', 'closed'], false],
        paint: { 'line-color': linkColor, 'line-width': linkWidth, 'line-dasharray': [4, 2] },
      });

      // Pump/valve icons at link midpoints
      map.addLayer({
        id: 'link-type-icons', type: 'symbol', source: SRC_LABELS,
        filter: ['in', ['get', 'linkType'], ['literal', ['pump', 'valve']]],
        layout: {
          'icon-image': ['case',
            ['==', ['get', 'linkType'], 'pump'], 'icon-pump',
            'icon-valve',
          ],
          'icon-size': 0.7,
          'icon-allow-overlap': true,
        },
      });

      // Link labels
      map.addLayer({
        id: 'link-labels', type: 'symbol', source: SRC_LABELS,
        minzoom: 13,
        filter: ['!', ['in', ['get', 'linkType'], ['literal', ['pump', 'valve']]]],
        layout: {
          'text-field': ['concat', ['get', 'label'], '\n', ['get', 'flowLabel']],
          'text-size': 10,
          'text-offset': [0, -1],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#333', 'text-halo-color': '#fff', 'text-halo-width': 2 },
      });

      // Node icons (symbol layer replacing circle layer)
      map.addLayer({
        id: NODE_LAYER, type: 'symbol', source: SRC_NODES,
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'type'], 'reservoir'], 'icon-reservoir',
            ['==', ['get', 'type'], 'tank'], 'icon-tank',
            ['all', ['boolean', ['get', 'hasResult'], false], ['boolean', ['get', 'passesPressure'], false]], 'icon-junction-pass',
            ['boolean', ['get', 'hasResult'], false], 'icon-junction-fail',
            'icon-junction-default',
          ],
          'icon-size': [
            'case',
            ['any', ['boolean', ['get', 'selected'], false], ['boolean', ['get', 'highlighted'], false], ['boolean', ['get', 'dragging'], false]], 1.3,
            1.0,
          ],
          'icon-allow-overlap': true,
          'icon-pitch-alignment': 'map',
        },
      });

      // Node labels
      map.addLayer({
        id: 'node-labels', type: 'symbol', source: SRC_NODES,
        minzoom: 12,
        layout: {
          'text-field': ['get', 'id'],
          'text-size': 11,
          'text-offset': [0, -2],
          'text-allow-overlap': false,
          'text-font': ['Open Sans Semibold'],
        },
        paint: { 'text-color': '#1a1a2e', 'text-halo-color': '#fff', 'text-halo-width': 2 },
      });

      // Pressure labels
      map.addLayer({
        id: 'pressure-labels', type: 'symbol', source: SRC_NODES,
        minzoom: 13,
        filter: ['all', ['==', ['get', 'type'], 'junction'], ['boolean', ['get', 'hasResult'], false]],
        layout: {
          'text-field': ['concat', ['to-string', ['round', ['get', 'pressure']]], 'm'],
          'text-size': 10,
          'text-offset': [0, 2],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['case', ['boolean', ['get', 'passesPressure'], false], '#155724', '#c0392b'],
          'text-halo-color': '#fff',
          'text-halo-width': 1.5,
        },
      });

      // Monitored node ring
      map.addLayer({
        id: 'monitored-ring', type: 'circle', source: SRC_NODES,
        filter: ['boolean', ['get', 'monitored'], false],
        paint: {
          'circle-radius': 18,
          'circle-color': 'transparent',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#00bcd4',
          'circle-stroke-opacity': 0.9,
        },
      });

      // Vertex handles — shown when a pipe is selected
      map.addLayer({
        id: 'vertex-handles', type: 'circle', source: 'network-vertices',
        paint: {
          'circle-radius': 6,
          'circle-color': '#fff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3a5fcf',
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // Telemetry state for monitored node highlighting
  const telemetryData = useNetworkStore(s => s.telemetryData);
  const scadaReadings = useNetworkStore(s => s.scadaReadings);

  // Build set of monitored node IDs
  const monitoredNodeIds = new Set<string>();
  if (telemetryData) {
    for (const r of telemetryData.readings) monitoredNodeIds.add(r.nodeId);
  }
  for (const r of scadaReadings) monitoredNodeIds.add(r.nodeId);

  // --- Update GeoJSON sources when model/results/selection changes ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const nodeSrc = map.getSource(SRC_NODES) as maplibregl.GeoJSONSource;
    const linkSrc = map.getSource(SRC_LINKS) as maplibregl.GeoJSONSource;
    const labelSrc = map.getSource(SRC_LABELS) as maplibregl.GeoJSONSource;

    if (nodeSrc) nodeSrc.setData(buildNodeFeatures(model, getNodeResult, selectedId, pipeDrawingFrom, draggingNodeIdRef.current, monitoredNodeIds));
    if (linkSrc) linkSrc.setData(buildLinkFeatures(model, getLinkResult, selectedId));
    if (labelSrc) labelSrc.setData(buildLabelFeatures(model, getLinkResult));

    const vertexSrc = map.getSource('network-vertices') as maplibregl.GeoJSONSource;
    if (vertexSrc) {
      if (selectedType === 'pipe' && selectedId) {
        const pipe = model.pipes.find(p => p.id === selectedId);
        if (pipe && pipe.vertices && pipe.vertices.length > 0) {
          vertexSrc.setData({
            type: 'FeatureCollection',
            features: pipe.vertices.map((v, i) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [v[0], v[1]] },
              properties: { pipeId: pipe.id, vertexIndex: i },
            })),
          });
        } else {
          vertexSrc.setData(EMPTY_FC);
        }
      } else {
        vertexSrc.setData(EMPTY_FC);
      }
    }
  }, [model, selectedId, selectedType, pipeDrawingFrom, mapReady, getNodeResult, getLinkResult, solveResult, epsResult, epsTimeIndex, telemetryData, scadaReadings]);

  // --- Fit to network on model load + toggle Ayodhya overlay ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Update outline data and visibility based on loaded city
    const titleLower = model.title.toLowerCase();
    const cityOutlines: Record<string, GeoJSON.FeatureCollection> = {
      ayodhya: AYODHYA_OUTLINE,
      bhubaneswar: BHUBANESWAR_OUTLINE,
      ranchi: RANCHI_OUTLINE,
      bareilly: BAREILLY_OUTLINE,
    };
    const matchedCity = Object.keys(cityOutlines).find(c => titleLower.includes(c));
    const showOutline = !!matchedCity;

    const outlineSrc = map.getSource(SRC_OUTLINE) as maplibregl.GeoJSONSource;
    if (outlineSrc && matchedCity) {
      outlineSrc.setData(cityOutlines[matchedCity]);
    }

    const outlineLayers = ['outline-fill', 'outline-border'];
    for (const layerId of outlineLayers) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', showOutline ? 'visible' : 'none');
      }
    }

    const allNodes = [...model.junctions, ...model.reservoirs, ...model.tanks];
    if (allNodes.length < 2) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const n of allNodes) bounds.extend([n.x, n.y]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
  }, [model.title, mapReady]);

  // --- Map click handler ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (didDragRef.current) { didDragRef.current = false; return; }

      const lngLat = e.lngLat;
      const tool = useNetworkStore.getState().activeTool;
      const drawFrom = useNetworkStore.getState().pipeDrawingFrom;

      if (tool === 'junction') {
        const id = useNetworkStore.getState().addJunction(lngLat.lng, lngLat.lat);
        useNetworkStore.getState().selectElement(id, 'junction');
        return;
      }
      if (tool === 'reservoir') {
        const id = useNetworkStore.getState().addReservoir(lngLat.lng, lngLat.lat);
        useNetworkStore.getState().selectElement(id, 'reservoir');
        return;
      }
      if (tool === 'tank') {
        const id = useNetworkStore.getState().addTank(lngLat.lng, lngLat.lat);
        useNetworkStore.getState().selectElement(id, 'tank');
        return;
      }

      // Two-click link tools (pipe, pump, valve)
      if (tool === 'pipe' || tool === 'pump' || tool === 'valve') {
        const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: [NODE_LAYER] });
        if (nodeFeatures.length === 0) return;
        const hitId = nodeFeatures[0].properties?.id as string;

        if (!drawFrom) {
          useNetworkStore.getState().setPipeDrawingFrom(hitId);
        } else if (hitId !== drawFrom) {
          let id: string;
          let linkType: 'pipe' | 'pump' | 'valve';
          if (tool === 'pump') { id = useNetworkStore.getState().addPump(drawFrom, hitId); linkType = 'pump'; }
          else if (tool === 'valve') { id = useNetworkStore.getState().addValve(drawFrom, hitId); linkType = 'valve'; }
          else { id = useNetworkStore.getState().addPipe(drawFrom, hitId); linkType = 'pipe'; }
          useNetworkStore.getState().selectElement(id, linkType);
          useNetworkStore.getState().setPipeDrawingFrom(null);
        }
        return;
      }

      // Select tool
      if (tool === 'select') {
        // Check vertex handles (don't propagate click if hit)
        const vertexHits = map.queryRenderedFeatures(e.point, { layers: ['vertex-handles'] });
        if (vertexHits.length > 0) return;

        // Check nodes
        const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: [NODE_LAYER] });
        if (nodeFeatures.length > 0) {
          const id = nodeFeatures[0].properties?.id as string;
          const type = nodeFeatures[0].properties?.type as 'junction' | 'reservoir' | 'tank';
          useNetworkStore.getState().selectElement(id, type);
          return;
        }

        // Insert vertex on selected pipe click
        const currentState = useNetworkStore.getState();
        if (currentState.selectedElementType === 'pipe' && currentState.selectedElementId) {
          const selId = currentState.selectedElementId;
          const linkHits = map.queryRenderedFeatures(e.point, { layers: ['links-line', 'links-line-closed'] });
          const hitPipe = linkHits.find(f => f.properties?.id === selId);
          if (hitPipe) {
            const pipe = currentState.model.pipes.find(p => p.id === selId);
            if (pipe) {
              const allNodes = [...currentState.model.junctions, ...currentState.model.reservoirs, ...currentState.model.tanks];
              const from = allNodes.find(n => n.id === pipe.fromNode);
              const to = allNodes.find(n => n.id === pipe.toNode);
              if (from && to) {
                const coords: [number, number][] = [[from.x, from.y], ...(pipe.vertices || []), [to.x, to.y]];
                let bestIdx = 0;
                let bestDist = Infinity;
                for (let i = 0; i < coords.length - 1; i++) {
                  const d = distToSegment(lngLat.lng, lngLat.lat, coords[i], coords[i + 1]);
                  if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
                useNetworkStore.getState().addPipeVertex(selId, bestIdx, lngLat.lng, lngLat.lat);
              }
            }
            return;
          }
        }

        // Check links
        const linkFeatures = map.queryRenderedFeatures(e.point, { layers: ['links-line', 'links-line-closed'] });
        if (linkFeatures.length > 0) {
          const id = linkFeatures[0].properties?.id as string;
          const type = linkFeatures[0].properties?.type as 'pipe' | 'pump' | 'valve';
          useNetworkStore.getState().selectElement(id, type);
          return;
        }
        // Deselect
        useNetworkStore.getState().selectElement(null, null);
      }
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [mapReady]);

  // --- Node drag ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (useNetworkStore.getState().activeTool !== 'select') return;

      // Check vertex handles first
      const vertexFeatures = map.queryRenderedFeatures(e.point, { layers: ['vertex-handles'] });
      if (vertexFeatures.length > 0) {
        const props = vertexFeatures[0].properties;
        draggingVertexRef.current = { pipeId: props?.pipeId as string, index: props?.vertexIndex as number };
        didDragRef.current = false;
        map.dragPan.disable();
        map.getCanvas().style.cursor = 'grabbing';
        return;
      }

      const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: [NODE_LAYER] });
      if (nodeFeatures.length === 0) return;

      const nodeId = nodeFeatures[0].properties?.id as string;
      draggingNodeIdRef.current = nodeId;
      didDragRef.current = false;
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (draggingVertexRef.current) {
        didDragRef.current = true;
        const lngLat = e.lngLat;
        useNetworkStore.getState().movePipeVertex(
          draggingVertexRef.current.pipeId,
          draggingVertexRef.current.index,
          lngLat.lng,
          lngLat.lat,
        );
        return;
      }
      if (!draggingNodeIdRef.current) return;
      didDragRef.current = true;
      const lngLat = e.lngLat;
      useNetworkStore.getState().moveNode(draggingNodeIdRef.current, lngLat.lng, lngLat.lat);
    };

    const onMouseUp = () => {
      if (draggingVertexRef.current) {
        draggingVertexRef.current = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        return;
      }
      if (draggingNodeIdRef.current) {
        draggingNodeIdRef.current = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mousedown', NODE_LAYER, onMouseDown);
    map.on('mousedown', 'vertex-handles', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    // Cursor style on hover
    map.on('mouseenter', NODE_LAYER, () => {
      if (useNetworkStore.getState().activeTool === 'select') map.getCanvas().style.cursor = 'grab';
    });
    map.on('mouseleave', NODE_LAYER, () => {
      if (!draggingNodeIdRef.current) map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'vertex-handles', () => {
      map.getCanvas().style.cursor = 'grab';
    });
    map.on('mouseleave', 'vertex-handles', () => {
      if (!draggingVertexRef.current) map.getCanvas().style.cursor = '';
    });

    // Double-click to delete vertex
    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      const vertexFeatures = map.queryRenderedFeatures(e.point, { layers: ['vertex-handles'] });
      if (vertexFeatures.length > 0) {
        const props = vertexFeatures[0].properties;
        useNetworkStore.getState().deletePipeVertex(props?.pipeId as string, props?.vertexIndex as number);
        e.preventDefault();
      }
    };
    map.on('dblclick', 'vertex-handles', onDblClick);

    return () => {
      map.off('mousedown', NODE_LAYER, onMouseDown);
      map.off('mousedown', 'vertex-handles', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('dblclick', 'vertex-handles', onDblClick);
    };
  }, [mapReady]);

  // --- Satellite toggle ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (isSatellite) {
      if (!map.getSource('satellite')) {
        map.addSource('satellite', {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 19,
        });
        map.addLayer({
          id: 'satellite-tiles',
          type: 'raster',
          source: 'satellite',
          paint: { 'raster-opacity': 1 },
        }, 'outline-fill'); // Insert below outline layers
      } else {
        map.setLayoutProperty('satellite-tiles', 'visibility', 'visible');
      }
      // Hide CartoDB basemap
      if (map.getLayer('carto-basemap')) {
        map.setLayoutProperty('carto-basemap', 'visibility', 'none');
      }
    } else {
      // Show CartoDB, hide satellite
      if (map.getLayer('carto-basemap')) {
        map.setLayoutProperty('carto-basemap', 'visibility', 'visible');
      }
      if (map.getLayer('satellite-tiles')) {
        map.setLayoutProperty('satellite-tiles', 'visibility', 'none');
      }
    }
  }, [isSatellite, mapReady]);

  // --- Dark basemap toggle ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const applyTheme = (theme: string) => {
      if (theme === 'dark') {
        if (!map.getSource('carto-dark')) {
          map.addSource('carto-dark', {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256,
            maxzoom: 19,
          });
          map.addLayer({
            id: 'carto-dark-basemap',
            type: 'raster',
            source: 'carto-dark',
            paint: { 'raster-opacity': 1 },
          }, 'outline-fill');
        } else {
          map.setLayoutProperty('carto-dark-basemap', 'visibility', 'visible');
        }
        if (map.getLayer('carto-basemap')) map.setLayoutProperty('carto-basemap', 'visibility', 'none');
      } else {
        if (map.getLayer('carto-dark-basemap')) map.setLayoutProperty('carto-dark-basemap', 'visibility', 'none');
        if (map.getLayer('carto-basemap') && !isSatellite) map.setLayoutProperty('carto-basemap', 'visibility', 'visible');
      }
    };

    // Apply on mount
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(currentTheme);

    // Listen for toggles
    const handler = (e: Event) => applyTheme((e as CustomEvent).detail);
    window.addEventListener('soliton-theme-change', handler);
    return () => window.removeEventListener('soliton-theme-change', handler);
  }, [mapReady, isSatellite]);

  // --- Cursor for placement tools ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = activeTool === 'select' ? '' : 'crosshair';
  }, [activeTool]);

  // Compliance counts for status badge
  const pressureStats = hasResults ? countPressurePassing(model, getNodeResult) : null;
  const velocityStats = hasResults ? countVelocityPassing(model, getLinkResult) : null;

  const compliancePct = pressureStats && pressureStats.total > 0
    ? (pressureStats.passing / pressureStats.total) * 100 : 0;
  const badgeClass = compliancePct >= 90 ? 'status-badge--pass'
    : compliancePct >= 70 ? 'status-badge--warn' : 'status-badge--fail';

  return (
    <div className="map-container">
      {/* Top bar — grouped with progressive disclosure */}
      <div className="top-bar">
        <div className="top-bar-row">
          {/* LEFT: Primary actions */}
          <button className="compute-btn" onClick={() => solve()} disabled={isSolving}>
            {isSolving ? '⏳ Solving…' : '▶ Compute'}
          </button>
          <DemoLoader />

          <div className="top-bar-separator" />

          {/* Settings dropdown */}
          <div className="top-bar-dropdown">
            <button className="top-bar-btn" onClick={() => toggleDropdown('settings')}
              data-active={openDropdown === 'settings' || showScenarioPanel || undefined}>
              ⚙ Settings {openDropdown === 'settings' ? '▴' : '▾'}
            </button>
            {openDropdown === 'settings' && (
              <>
                <div className="top-bar-dropdown-backdrop" onClick={() => setOpenDropdown(null)} />
                <div className="top-bar-dropdown-menu">
                  <button className="top-bar-dropdown-item"
                    data-active={showScenarioPanel || undefined}
                    onClick={() => { setShowScenarioPanel(!showScenarioPanel); setOpenDropdown(null); }}>
                    ⚙ Scenario Panel
                  </button>
                  <ScadaIndicator />
                </div>
              </>
            )}
          </div>

          {/* CENTER: Status badge */}
          <div className="top-bar-spacer" />
          {hasResults && pressureStats && velocityStats && (
            <span className={`status-badge-inline ${badgeClass}`}>
              P: {pressureStats.passing}/{pressureStats.total} ({compliancePct.toFixed(0)}%)
              &nbsp;·&nbsp;
              V: {velocityStats.passing}/{velocityStats.total}
              &nbsp;·&nbsp;
              {model.options.duration > 0 ? 'EPS' : 'SS'}
            </span>
          )}
          {epsResult && (
            <>
              <span className="eps-time-badge" style={{ marginLeft: 6 }}>
                {formatTime(epsResult.timestamps[epsTimeIndex])}
              </span>
              <input type="range" className="eps-time-slider" min={0} max={epsResult.timestamps.length - 1}
                value={epsTimeIndex} onChange={e => setEpsTimeIndex(parseInt(e.target.value))} />
            </>
          )}
          <div className="top-bar-spacer" />

          {/* RIGHT: Search, Analysis, View, Export */}
          {showSearch ? (
            <SearchBox mapRef={mapRef} onClose={() => setShowSearch(false)} />
          ) : (
            <button className="top-bar-btn" onClick={() => setShowSearch(true)} title="Search (/)">
              🔍
            </button>
          )}

          {/* Analysis dropdown */}
          <div className="top-bar-dropdown">
            <button className="top-bar-btn" onClick={() => toggleDropdown('analysis')}
              data-active={openDropdown === 'analysis' || showResultsDashboard || showCost || undefined}>
              Analysis {openDropdown === 'analysis' ? '▴' : '▾'}
            </button>
            {openDropdown === 'analysis' && (
              <>
                <div className="top-bar-dropdown-backdrop" onClick={() => setOpenDropdown(null)} />
                <div className="top-bar-dropdown-menu">
                  <button className="top-bar-dropdown-item"
                    data-active={showResultsDashboard || undefined}
                    onClick={() => { setShowResultsDashboard(!showResultsDashboard); setOpenDropdown(null); }}>
                    📊 Results Dashboard
                  </button>
                  <button className="top-bar-dropdown-item"
                    data-active={showCost || undefined}
                    onClick={() => { setShowCost(!showCost); setOpenDropdown(null); }}>
                    💰 Cost Estimate
                  </button>
                  <div className="top-bar-dropdown-divider" />
                  <button className="top-bar-dropdown-item"
                    onClick={() => { setShowOptimizer(true); setOpenDropdown(null); }}>
                    ⚡ Optimize Pipes
                  </button>
                  <button className="top-bar-dropdown-item"
                    onClick={() => { setShowComparison(true); setOpenDropdown(null); }}>
                    📊 Compare Scenarios
                  </button>
                  {hasResults && (
                    <>
                      <div className="top-bar-dropdown-divider" />
                      <button className="top-bar-dropdown-item"
                        onClick={() => { useNetworkStore.getState().setActiveView('twin'); setOpenDropdown(null); }}>
                        🌐 Digital Twin
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* View dropdown */}
          <div className="top-bar-dropdown">
            <button className="top-bar-btn" onClick={() => toggleDropdown('view')}>
              View {openDropdown === 'view' ? '▴' : '▾'}
            </button>
            {openDropdown === 'view' && (
              <>
                <div className="top-bar-dropdown-backdrop" onClick={() => setOpenDropdown(null)} />
                <div className="top-bar-dropdown-menu">
                  <button className="top-bar-dropdown-item"
                    data-active={isSatellite || undefined}
                    onClick={() => { setIsSatellite(!isSatellite); setOpenDropdown(null); }}>
                    🛰 {isSatellite ? 'Switch to Street' : 'Switch to Satellite'}
                  </button>
                  <button className="top-bar-dropdown-item"
                    data-active={showInp || undefined}
                    onClick={() => { setShowInp(!showInp); setOpenDropdown(null); }}>
                    📄 INP Viewer
                  </button>
                </div>
              </>
            )}
          </div>

          <ExportPanel />
        </div>
      </div>

      {/* Toast error notification */}
      {solveError && (
        <div className="toast-error">
          <span className="toast-error-icon">!</span>
          <span className="toast-error-text" title={solveError}>{solveError}</span>
          <button className="toast-error-close" onClick={() => useNetworkStore.getState().clearResults()}>×</button>
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Map legend */}
      <MapLegend />

      {/* INP viewer — slide-up panel */}
      {showInp && lastInp && (
        <div className="inp-panel">
          <div className="inp-panel-header">
            <span className="inp-panel-title">EPANET INP File</span>
            <button className="inp-panel-btn" onClick={() => {
              navigator.clipboard.writeText(lastInp);
            }} title="Copy to clipboard">Copy</button>
            <button className="inp-panel-btn" onClick={() => setShowInp(false)}>×</button>
          </div>
          <pre className="inp-panel-content">{lastInp}</pre>
        </div>
      )}

      {/* INP toggle button (bottom bar) */}
      {lastInp && !showInp && (
        <button className="inp-toggle-btn" onClick={() => setShowInp(true)}>
          INP
        </button>
      )}

      {/* Drawing guide */}
      {(activeTool === 'pipe' || activeTool === 'pump' || activeTool === 'valve') && pipeDrawingFrom && (
        <div className="drawing-guide">
          Drawing {activeTool} from <strong>{pipeDrawingFrom}</strong> — click another node
        </div>
      )}

      {showCost && <CostPanel onClose={() => setShowCost(false)} />}
      {showOptimizer && <OptimizerPanel onClose={() => setShowOptimizer(false)} />}

      {/* Comparison dashboard */}
      {showComparison && <ComparisonDashboard onClose={() => setShowComparison(false)} />}

      {/* Shortcut overlay */}
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Distance from point to line segment (in coordinate units) */
function distToSegment(px: number, py: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / lenSq));
  const cx = a[0] + t * dx, cy = a[1] + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}
