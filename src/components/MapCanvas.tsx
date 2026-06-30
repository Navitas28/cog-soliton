/**
 * Interactive network canvas with pan/zoom.
 * Results are time-indexed: works with both steady-state and EPS.
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { DemoLoader } from './DemoLoader';
import type { NodeResult, LinkResult } from '../engine/engine';

interface ViewTransform { offsetX: number; offsetY: number; scale: number }

const NODE_RADIUS = 8;
const HIT_RADIUS = 12;

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewTransform>({ offsetX: 400, offsetY: 300, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 600 });

  const model = useNetworkStore(s => s.model);
  const activeTool = useNetworkStore(s => s.activeTool);
  const selectedId = useNetworkStore(s => s.selectedElementId);
  const pipeDrawingFrom = useNetworkStore(s => s.pipeDrawingFrom);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);

  const addJunction = useNetworkStore(s => s.addJunction);
  const addReservoir = useNetworkStore(s => s.addReservoir);
  const addTank = useNetworkStore(s => s.addTank);
  const addPipe = useNetworkStore(s => s.addPipe);
  const selectElement = useNetworkStore(s => s.selectElement);
  const setPipeDrawingFrom = useNetworkStore(s => s.setPipeDrawingFrom);
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
  const [lastModelTitle, setLastModelTitle] = useState('');

  // Auto-fit to network extent when model changes (e.g. demo load)
  useEffect(() => {
    if (model.title === lastModelTitle) return;
    setLastModelTitle(model.title);
    const allNodes = [...model.junctions, ...model.reservoirs, ...model.tanks];
    if (allNodes.length < 2) return;
    const xs = allNodes.map(n => n.x);
    const ys = allNodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 80;
    const scaleX = (size.w - padding * 2) / rangeX;
    const scaleY = (size.h - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({
      scale,
      offsetX: size.w / 2 - cx * scale,
      offsetY: size.h / 2 - cy * scale,
    });
  }, [model.title, model.junctions.length, model.reservoirs.length, model.tanks.length, size]);

  // Get current timestep results
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

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const toScreen = useCallback((x: number, y: number) => ({
    sx: x * view.scale + view.offsetX,
    sy: y * view.scale + view.offsetY,
  }), [view]);

  const toWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - view.offsetX) / view.scale,
    y: (sy - view.offsetY) / view.scale,
  }), [view]);

  const findNodeAt = useCallback((sx: number, sy: number): { id: string; type: 'junction' | 'reservoir' | 'tank' } | null => {
    for (const j of model.junctions) {
      const s = toScreen(j.x, j.y);
      if (Math.hypot(s.sx - sx, s.sy - sy) < HIT_RADIUS) return { id: j.id, type: 'junction' };
    }
    for (const r of model.reservoirs) {
      const s = toScreen(r.x, r.y);
      if (Math.hypot(s.sx - sx, s.sy - sy) < HIT_RADIUS) return { id: r.id, type: 'reservoir' };
    }
    for (const t of model.tanks) {
      const s = toScreen(t.x, t.y);
      if (Math.hypot(s.sx - sx, s.sy - sy) < HIT_RADIUS) return { id: t.id, type: 'tank' };
    }
    return null;
  }, [model, toScreen]);

  const findPipeAt = useCallback((sx: number, sy: number): string | null => {
    const allNodes = [...model.junctions, ...model.reservoirs, ...model.tanks];
    for (const pipe of model.pipes) {
      const fromNode = allNodes.find(n => n.id === pipe.fromNode);
      const toNode = allNodes.find(n => n.id === pipe.toNode);
      if (!fromNode || !toNode) continue;
      const a = toScreen(fromNode.x, fromNode.y);
      const b = toScreen(toNode.x, toNode.y);
      if (pointToSegmentDist(sx, sy, a.sx, a.sy, b.sx, b.sy) < 8) return pipe.id;
    }
    return null;
  }, [model, toScreen]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = toWorld(sx, sy);

    if (activeTool === 'junction') {
      selectElement(addJunction(world.x, world.y), 'junction');
    } else if (activeTool === 'reservoir') {
      selectElement(addReservoir(world.x, world.y), 'reservoir');
    } else if (activeTool === 'tank') {
      selectElement(addTank(world.x, world.y), 'tank');
    } else if (activeTool === 'pipe') {
      const hit = findNodeAt(sx, sy);
      if (!hit) return;
      if (!pipeDrawingFrom) {
        setPipeDrawingFrom(hit.id);
      } else if (hit.id !== pipeDrawingFrom) {
        selectElement(addPipe(pipeDrawingFrom, hit.id), 'pipe');
        setPipeDrawingFrom(null);
      }
    } else if (activeTool === 'select') {
      const nodeHit = findNodeAt(sx, sy);
      if (nodeHit) { selectElement(nodeHit.id, nodeHit.type); return; }
      const pipeHit = findPipeAt(sx, sy);
      if (pipeHit) { selectElement(pipeHit, 'pipe'); return; }
      selectElement(null, null);
    }
  }, [activeTool, toWorld, findNodeAt, findPipeAt, pipeDrawingFrom, addJunction, addReservoir, addTank, addPipe, selectElement, setPipeDrawingFrom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setView(v => ({ ...v, offsetX: v.offsetX + (e.clientX - panStart.x), offsetY: v.offsetY + (e.clientY - panStart.y) }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setView(v => {
      const newScale = Math.max(0.1, Math.min(10, v.scale * factor));
      return { scale: newScale, offsetX: mx - (mx - v.offsetX) * (newScale / v.scale), offsetY: my - (my - v.offsetY) * (newScale / v.scale) };
    });
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size.w * window.devicePixelRatio;
    canvas.height = size.h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#f8f9fb';
    ctx.fillRect(0, 0, size.w, size.h);
    drawGrid(ctx, view, size.w, size.h);

    const allNodes = [
      ...model.junctions.map(n => ({ ...n, type: 'junction' as const })),
      ...model.reservoirs.map(n => ({ ...n, type: 'reservoir' as const })),
      ...model.tanks.map(n => ({ ...n, type: 'tank' as const })),
    ];
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const dc = model.designCriteria;

    // Draw pipes
    for (const pipe of model.pipes) {
      const from = nodeMap.get(pipe.fromNode);
      const to = nodeMap.get(pipe.toNode);
      if (!from || !to) continue;
      const a = toScreen(from.x, from.y);
      const b = toScreen(to.x, to.y);

      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);

      const lr = getLinkResult(pipe.id);
      if (lr) {
        const absV = Math.abs(lr.velocity);
        if (absV < dc.velocityMin || absV > dc.velocityMax) ctx.strokeStyle = '#e74c3c';
        else if (absV < dc.velocityEconomicMin || absV > dc.velocityEconomicMax) ctx.strokeStyle = '#f39c12';
        else ctx.strokeStyle = '#2ecc71';
      } else {
        ctx.strokeStyle = pipe.status === 'Closed' ? '#999' : '#3498db';
      }

      ctx.lineWidth = pipe.id === selectedId ? 4 : 2.5;
      if (pipe.status === 'Closed') ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      const mx = (a.sx + b.sx) / 2, my = (a.sy + b.sy) / 2;
      ctx.fillStyle = '#666'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(pipe.id, mx, my - 6);
      if (lr) {
        ctx.fillStyle = '#333'; ctx.font = 'bold 10px system-ui';
        ctx.fillText(`${lr.flow.toFixed(1)} LPS`, mx, my + 12);
      }
    }

    // Draw nodes
    for (const node of allNodes) {
      const s = toScreen(node.x, node.y);
      const isSelected = node.id === selectedId;
      const isHighlighted = node.id === pipeDrawingFrom;
      const nr = getNodeResult(node.id);

      ctx.beginPath();
      if (node.type === 'reservoir') {
        const r = NODE_RADIUS + 2;
        ctx.moveTo(s.sx, s.sy - r); ctx.lineTo(s.sx - r, s.sy + r * 0.7); ctx.lineTo(s.sx + r, s.sy + r * 0.7);
        ctx.closePath(); ctx.fillStyle = '#2980b9';
      } else if (node.type === 'tank') {
        const r = NODE_RADIUS;
        ctx.rect(s.sx - r, s.sy - r, r * 2, r * 2);
        ctx.fillStyle = '#8e44ad';
      } else {
        ctx.arc(s.sx, s.sy, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = nr ? (nr.pressure >= dc.residualPressureFloor ? '#2ecc71' : '#e74c3c') : '#34495e';
      }
      ctx.fill();

      if (isSelected || isHighlighted) {
        ctx.strokeStyle = isHighlighted ? '#f39c12' : '#3a5fcf';
        ctx.lineWidth = 2.5; ctx.stroke();
      }

      ctx.fillStyle = '#333'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(node.id, s.sx, s.sy - NODE_RADIUS - 4);

      if (nr && node.type === 'junction') {
        ctx.fillStyle = nr.pressure >= dc.residualPressureFloor ? '#155724' : '#721c24';
        ctx.font = '10px system-ui';
        ctx.fillText(`${nr.pressure.toFixed(1)}m`, s.sx, s.sy + NODE_RADIUS + 14);
      }
    }

    if (activeTool === 'pipe' && pipeDrawingFrom) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`Drawing pipe from ${pipeDrawingFrom} — click another node`, 10, size.h - 10);
    }
  }, [model, view, size, selectedId, pipeDrawingFrom, activeTool, toScreen, getNodeResult, getLinkResult]);

  return (
    <div className="map-container" ref={containerRef}>
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
              return nr && nr.pressure >= dc.residualPressureFloor;
            }).length}/{model.junctions.length} pass
          </div>
        )}

        {/* EPS time slider in top bar */}
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

      <canvas ref={canvasRef}
        style={{ width: size.w, height: size.h, cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        onClick={handleClick} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} />

      <div className="inp-viewer">
        <button className="inp-toggle" onClick={() => setShowInp(!showInp)}>
          {showInp ? 'Hide INP' : 'Show INP'}
        </button>
        {showInp && lastInp && <div className="inp-content">{lastInp}</div>}
      </div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, view: ViewTransform, w: number, h: number) {
  const gridSize = 50 * view.scale;
  if (gridSize < 5) return;
  ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 0.5;
  const startX = view.offsetX % gridSize;
  const startY = view.offsetY % gridSize;
  for (let x = startX; x < w; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = startY; y < h; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
