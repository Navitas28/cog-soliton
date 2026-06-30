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
import { buildNodeFeatures, buildLinkFeatures, buildLabelFeatures, offlineBlankStyle } from './mapHelpers';
import { AYODHYA_OUTLINE } from '../data/ayodhyaOutline';
import type { NodeResult, LinkResult } from '../engine/engine';
import type { DrawingTool } from '../store/networkStore';

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

      if (key === 'escape') { selectElement(null, null); setPipeDrawingFrom(null); return; }

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
      // Ayodhya outline layers
      map.addSource(SRC_OUTLINE, { type: 'geojson', data: AYODHYA_OUTLINE });

      // Ayodhya outline layers — hidden by default, shown when Ayodhya demo loaded
      map.addLayer({
        id: 'outline-fill', type: 'fill', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'boundary'],
        paint: { 'fill-color': '#e8edf5', 'fill-opacity': 0.4 },
        layout: { visibility: 'none' },
      });
      map.addLayer({
        id: 'outline-border', type: 'line', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'boundary'],
        paint: { 'line-color': '#99aacc', 'line-width': 1.5, 'line-dasharray': [4, 2] },
        layout: { visibility: 'none' },
      });
      map.addLayer({
        id: 'outline-river', type: 'line', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'river'],
        paint: { 'line-color': '#5dade2', 'line-width': 3, 'line-opacity': 0.7 },
        layout: { visibility: 'none' },
      });
      map.addLayer({
        id: 'outline-roads', type: 'line', source: SRC_OUTLINE,
        filter: ['==', ['get', 'type'], 'road'],
        paint: { 'line-color': '#cccccc', 'line-width': 1 },
        layout: { visibility: 'none' },
      });

      // Network sources (empty initially)
      map.addSource(SRC_LINKS, { type: 'geojson', data: EMPTY_FC });
      map.addSource(SRC_NODES, { type: 'geojson', data: EMPTY_FC });
      map.addSource(SRC_LABELS, { type: 'geojson', data: EMPTY_FC });

      // Link color expression (shared)
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
        'case', ['boolean', ['get', 'selected'], false], 5, 3,
      ];

      // Open links (solid line)
      map.addLayer({
        id: 'links-line', type: 'line', source: SRC_LINKS,
        filter: ['!', ['boolean', ['get', 'closed'], false]],
        paint: { 'line-color': linkColor, 'line-width': linkWidth },
      });

      // Closed links (dashed line)
      map.addLayer({
        id: 'links-line-closed', type: 'line', source: SRC_LINKS,
        filter: ['boolean', ['get', 'closed'], false],
        paint: { 'line-color': linkColor, 'line-width': linkWidth, 'line-dasharray': [4, 2] },
      });

      // Pump/valve icons at midpoints (via labels source)
      map.addLayer({
        id: 'labels-bg', type: 'circle', source: SRC_LABELS,
        paint: {
          'circle-radius': 0,
          'circle-color': 'transparent',
        },
      });

      // Link labels — only show when zoomed in
      map.addLayer({
        id: 'link-labels', type: 'symbol', source: SRC_LABELS,
        minzoom: 13,
        layout: {
          'text-field': ['concat', ['get', 'label'], '\n', ['get', 'flowLabel']],
          'text-size': 10,
          'text-offset': [0, -1],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#555', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
      });

      // Node layers — different shapes via circle
      map.addLayer({
        id: 'nodes-circle', type: 'circle', source: SRC_NODES,
        paint: {
          'circle-radius': [
            'case',
            ['any', ['boolean', ['get', 'selected'], false], ['boolean', ['get', 'highlighted'], false], ['boolean', ['get', 'dragging'], false]], 10,
            8,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'type'], 'reservoir'], '#2980b9',
            ['==', ['get', 'type'], 'tank'], '#8e44ad',
            // Junctions: color by result
            ['all', ['boolean', ['get', 'hasResult'], false], ['boolean', ['get', 'passesPressure'], false]], '#2ecc71',
            ['boolean', ['get', 'hasResult'], false], '#e74c3c',
            '#34495e',
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'selected'], false], 3,
            ['boolean', ['get', 'highlighted'], false], 3,
            ['boolean', ['get', 'dragging'], false], 3,
            0,
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['get', 'dragging'], false], '#e67e22',
            ['boolean', ['get', 'highlighted'], false], '#f39c12',
            '#3a5fcf',
          ],
        },
      });

      // Node labels — show at moderate zoom
      map.addLayer({
        id: 'node-labels', type: 'symbol', source: SRC_NODES,
        minzoom: 12,
        layout: {
          'text-field': ['get', 'id'],
          'text-size': 11,
          'text-offset': [0, -1.5],
          'text-allow-overlap': false,
          'text-font': ['Open Sans Semibold'],
        },
        paint: { 'text-color': '#333', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
      });

      // Pressure labels — show when more zoomed in
      map.addLayer({
        id: 'pressure-labels', type: 'symbol', source: SRC_NODES,
        minzoom: 13,
        filter: ['all', ['==', ['get', 'type'], 'junction'], ['boolean', ['get', 'hasResult'], false]],
        layout: {
          'text-field': ['concat', ['to-string', ['round', ['get', 'pressure']]], 'm'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['case', ['boolean', ['get', 'passesPressure'], false], '#155724', '#721c24'],
          'text-halo-color': '#fff',
          'text-halo-width': 1,
        },
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // --- Update GeoJSON sources when model/results/selection changes ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const nodeSrc = map.getSource(SRC_NODES) as maplibregl.GeoJSONSource;
    const linkSrc = map.getSource(SRC_LINKS) as maplibregl.GeoJSONSource;
    const labelSrc = map.getSource(SRC_LABELS) as maplibregl.GeoJSONSource;

    if (nodeSrc) nodeSrc.setData(buildNodeFeatures(model, getNodeResult, selectedId, pipeDrawingFrom, draggingNodeIdRef.current));
    if (linkSrc) linkSrc.setData(buildLinkFeatures(model, getLinkResult, selectedId));
    if (labelSrc) labelSrc.setData(buildLabelFeatures(model, getLinkResult));
  }, [model, selectedId, pipeDrawingFrom, mapReady, getNodeResult, getLinkResult, solveResult, epsResult, epsTimeIndex]);

  // --- Fit to network on model load + toggle Ayodhya overlay ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Show Ayodhya outline only when Ayodhya model is loaded
    const isAyodhya = model.title.toLowerCase().includes('ayodhya');
    const outlineLayers = ['outline-fill', 'outline-border', 'outline-river', 'outline-roads'];
    for (const layerId of outlineLayers) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isAyodhya ? 'visible' : 'none');
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
        const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: ['nodes-circle'] });
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
        // Check nodes
        const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: ['nodes-circle'] });
        if (nodeFeatures.length > 0) {
          const id = nodeFeatures[0].properties?.id as string;
          const type = nodeFeatures[0].properties?.type as 'junction' | 'reservoir' | 'tank';
          useNetworkStore.getState().selectElement(id, type);
          return;
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

      const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: ['nodes-circle'] });
      if (nodeFeatures.length === 0) return;

      const nodeId = nodeFeatures[0].properties?.id as string;
      draggingNodeIdRef.current = nodeId;
      didDragRef.current = false;
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!draggingNodeIdRef.current) return;
      didDragRef.current = true;
      const lngLat = e.lngLat;
      useNetworkStore.getState().moveNode(draggingNodeIdRef.current, lngLat.lng, lngLat.lat);
    };

    const onMouseUp = () => {
      if (draggingNodeIdRef.current) {
        draggingNodeIdRef.current = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mousedown', 'nodes-circle', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    // Cursor style on hover
    map.on('mouseenter', 'nodes-circle', () => {
      if (useNetworkStore.getState().activeTool === 'select') map.getCanvas().style.cursor = 'grab';
    });
    map.on('mouseleave', 'nodes-circle', () => {
      if (!draggingNodeIdRef.current) map.getCanvas().style.cursor = '';
    });

    return () => {
      map.off('mousedown', 'nodes-circle', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [mapReady]);

  // --- Cursor for placement tools ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = activeTool === 'select' ? '' : 'crosshair';
  }, [activeTool]);

  return (
    <div className="map-container">
      <div className="top-bar">
        <button className="compute-btn" onClick={() => solve()} disabled={isSolving}>
          {isSolving ? '⏳ Solving…' : '▶ Compute'}
        </button>

        <DemoLoader />

        <button onClick={() => setShowScenarioPanel(!showScenarioPanel)}
          style={{ padding: '6px 12px', border: '1px solid #3a5fcf', borderRadius: 4, background: showScenarioPanel ? '#3a5fcf' : '#fff', color: showScenarioPanel ? '#fff' : '#3a5fcf', cursor: 'pointer', fontSize: 12 }}>
          ⚙ Scenario
        </button>

        {hasResults && (
          <button onClick={() => setShowResultsDashboard(!showResultsDashboard)}
            style={{ padding: '6px 12px', border: '1px solid #27ae60', borderRadius: 4, background: showResultsDashboard ? '#27ae60' : '#fff', color: showResultsDashboard ? '#fff' : '#27ae60', cursor: 'pointer', fontSize: 12 }}>
            📊 Results
          </button>
        )}

        {solveError && <div className="solve-error" title={solveError}>{solveError}</div>}

        {hasResults && (
          <div className="status-badge">
            {model.options.duration > 0 ? 'EPS' : 'SS'} — {model.junctions.filter(j => {
              const nr = getNodeResult(j.id);
              return nr && nr.pressure >= model.designCriteria.residualPressureFloor;
            }).length}/{model.junctions.length} pass
          </div>
        )}

        <ExportPanel />

        {epsResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 3 }}>
              {formatTime(epsResult.timestamps[epsTimeIndex])}
            </span>
            <input type="range" min={0} max={epsResult.timestamps.length - 1}
              value={epsTimeIndex} onChange={e => setEpsTimeIndex(parseInt(e.target.value))}
              style={{ width: 200 }} />
          </div>
        )}
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      <div className="inp-viewer">
        <button className="inp-toggle" onClick={() => setShowInp(!showInp)}>
          {showInp ? 'Hide INP' : 'Show INP'}
        </button>
        {showInp && lastInp && <div className="inp-content">{lastInp}</div>}
      </div>

      {/* Drawing guide */}
      {(activeTool === 'pipe' || activeTool === 'pump' || activeTool === 'valve') && pipeDrawingFrom && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 12px',
          borderRadius: 4, fontSize: 12, zIndex: 5,
        }}>
          Drawing {activeTool} from {pipeDrawingFrom} — click another node
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
