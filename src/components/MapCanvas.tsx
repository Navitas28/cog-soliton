/**
 * Interactive network canvas.
 * Uses a simple Canvas2D overlay for drawing/editing network elements.
 * MapLibre integration comes in Phase 5 for the Ayodhya basemap.
 * For now, a clean schematic canvas with pan/zoom.
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import { useNetworkStore } from '../store/networkStore';

// Canvas coordinate system: we use a viewport transform for pan/zoom.
// Node coordinates in the model are in lng/lat for geo or arbitrary for schematic.
// For Phase 3 schematic mode, coordinates are screen-like (x right, y down).

interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

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
  const solveResult = useNetworkStore(s => s.solveResult);
  const pipeDrawingFrom = useNetworkStore(s => s.pipeDrawingFrom);

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
  const [showInp, setShowInp] = useState(false);

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

  // Transform functions
  const toScreen = useCallback((x: number, y: number) => ({
    sx: x * view.scale + view.offsetX,
    sy: y * view.scale + view.offsetY,
  }), [view]);

  const toWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - view.offsetX) / view.scale,
    y: (sy - view.offsetY) / view.scale,
  }), [view]);

  // Find node at screen position
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

  // Find pipe near screen position
  const findPipeAt = useCallback((sx: number, sy: number): string | null => {
    for (const pipe of model.pipes) {
      const fromNode = [...model.junctions, ...model.reservoirs, ...model.tanks].find(n => n.id === pipe.fromNode);
      const toNode = [...model.junctions, ...model.reservoirs, ...model.tanks].find(n => n.id === pipe.toNode);
      if (!fromNode || !toNode) continue;
      const a = toScreen(fromNode.x, fromNode.y);
      const b = toScreen(toNode.x, toNode.y);
      const dist = pointToSegmentDist(sx, sy, a.sx, a.sy, b.sx, b.sy);
      if (dist < 8) return pipe.id;
    }
    return null;
  }, [model, toScreen]);

  // Canvas click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = toWorld(sx, sy);

    if (activeTool === 'junction') {
      const id = addJunction(world.x, world.y);
      selectElement(id, 'junction');
    } else if (activeTool === 'reservoir') {
      const id = addReservoir(world.x, world.y);
      selectElement(id, 'reservoir');
    } else if (activeTool === 'tank') {
      const id = addTank(world.x, world.y);
      selectElement(id, 'tank');
    } else if (activeTool === 'pipe') {
      // Two-click pipe drawing: first click = from node, second = to node
      const hit = findNodeAt(sx, sy);
      if (!hit) return;
      if (!pipeDrawingFrom) {
        setPipeDrawingFrom(hit.id);
      } else if (hit.id !== pipeDrawingFrom) {
        const id = addPipe(pipeDrawingFrom, hit.id);
        selectElement(id, 'pipe');
        setPipeDrawingFrom(null);
      }
    } else if (activeTool === 'select') {
      const nodeHit = findNodeAt(sx, sy);
      if (nodeHit) {
        selectElement(nodeHit.id, nodeHit.type);
        return;
      }
      const pipeHit = findPipeAt(sx, sy);
      if (pipeHit) {
        selectElement(pipeHit, 'pipe');
        return;
      }
      selectElement(null, null);
    }
  }, [activeTool, toWorld, findNodeAt, findPipeAt, pipeDrawingFrom, addJunction, addReservoir, addTank, addPipe, selectElement, setPipeDrawingFrom]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setView(v => ({
        ...v,
        offsetX: v.offsetX + (e.clientX - panStart.x),
        offsetY: v.offsetY + (e.clientY - panStart.y),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;

    setView(v => {
      const newScale = Math.max(0.1, Math.min(10, v.scale * factor));
      return {
        scale: newScale,
        offsetX: mx - (mx - v.offsetX) * (newScale / v.scale),
        offsetY: my - (my - v.offsetY) * (newScale / v.scale),
      };
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

    // Clear
    ctx.fillStyle = '#f8f9fb';
    ctx.fillRect(0, 0, size.w, size.h);

    // Draw grid
    drawGrid(ctx, view, size.w, size.h);

    const allNodes = [
      ...model.junctions.map(n => ({ ...n, type: 'junction' as const })),
      ...model.reservoirs.map(n => ({ ...n, type: 'reservoir' as const })),
      ...model.tanks.map(n => ({ ...n, type: 'tank' as const })),
    ];

    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const pressureFloor = model.designCriteria.residualPressureFloor;

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

      // Color by velocity result if available
      const lr = solveResult?.linkResults.get(pipe.id);
      if (lr) {
        const absV = Math.abs(lr.velocity);
        if (absV < model.designCriteria.velocityMin || absV > model.designCriteria.velocityMax) {
          ctx.strokeStyle = '#e74c3c'; // red — outside permissible
        } else if (absV < model.designCriteria.velocityEconomicMin || absV > model.designCriteria.velocityEconomicMax) {
          ctx.strokeStyle = '#f39c12'; // orange — outside economic
        } else {
          ctx.strokeStyle = '#2ecc71'; // green — in economic band
        }
      } else {
        ctx.strokeStyle = pipe.status === 'Closed' ? '#999' : '#3498db';
      }

      ctx.lineWidth = pipe.id === selectedId ? 4 : 2.5;
      if (pipe.status === 'Closed') {
        ctx.setLineDash([6, 4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Pipe label
      const mx = (a.sx + b.sx) / 2;
      const my = (a.sy + b.sy) / 2;
      ctx.fillStyle = '#666';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(pipe.id, mx, my - 6);

      // Flow label if solved
      if (lr) {
        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px system-ui';
        ctx.fillText(`${lr.flow.toFixed(1)} LPS`, mx, my + 12);
      }
    }

    // Draw nodes
    for (const node of allNodes) {
      const s = toScreen(node.x, node.y);
      const isSelected = node.id === selectedId;
      const isHighlighted = node.id === pipeDrawingFrom;
      const nr = solveResult?.nodeResults.get(node.id);

      ctx.beginPath();
      if (node.type === 'reservoir') {
        // Triangle for reservoir
        const r = NODE_RADIUS + 2;
        ctx.moveTo(s.sx, s.sy - r);
        ctx.lineTo(s.sx - r, s.sy + r * 0.7);
        ctx.lineTo(s.sx + r, s.sy + r * 0.7);
        ctx.closePath();
        ctx.fillStyle = '#2980b9';
      } else if (node.type === 'tank') {
        // Square for tank
        const r = NODE_RADIUS;
        ctx.rect(s.sx - r, s.sy - r, r * 2, r * 2);
        ctx.fillStyle = '#8e44ad';
      } else {
        // Circle for junction
        ctx.arc(s.sx, s.sy, NODE_RADIUS, 0, Math.PI * 2);

        // Color by pressure compliance if results exist
        if (nr) {
          ctx.fillStyle = nr.pressure >= pressureFloor ? '#2ecc71' : '#e74c3c';
        } else {
          ctx.fillStyle = '#34495e';
        }
      }

      ctx.fill();

      // Selection ring
      if (isSelected || isHighlighted) {
        ctx.strokeStyle = isHighlighted ? '#f39c12' : '#3a5fcf';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, s.sx, s.sy - NODE_RADIUS - 4);

      // Pressure label if solved (junctions only)
      if (nr && node.type === 'junction') {
        ctx.fillStyle = nr.pressure >= pressureFloor ? '#155724' : '#721c24';
        ctx.font = '10px system-ui';
        ctx.fillText(`${nr.pressure.toFixed(1)}m`, s.sx, s.sy + NODE_RADIUS + 14);
      }
    }

    // Pipe drawing guide text
    if (activeTool === 'pipe' && pipeDrawingFrom) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Drawing pipe from ${pipeDrawingFrom} — click another node`, 10, size.h - 10);
    }

  }, [model, view, size, selectedId, solveResult, pipeDrawingFrom, activeTool, toScreen]);

  return (
    <div className="map-container" ref={containerRef}>
      {/* Top bar with compute button */}
      <div className="top-bar">
        <button className="compute-btn" onClick={() => solve()} disabled={isSolving}>
          {isSolving ? '⏳ Solving…' : '▶ Compute'}
        </button>
        {solveError && <div className="solve-error" title={solveError}>{solveError}</div>}
        {solveResult && (
          <div className="status-badge">
            Solved — {model.junctions.filter(j => {
              const nr = solveResult.nodeResults.get(j.id);
              return nr && nr.pressure >= model.designCriteria.residualPressureFloor;
            }).length}/{model.junctions.length} junctions pass
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h, cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* INP viewer */}
      <div className="inp-viewer">
        <button className="inp-toggle" onClick={() => setShowInp(!showInp)}>
          {showInp ? 'Hide INP' : 'Show INP'}
        </button>
        {showInp && lastInp && (
          <div className="inp-content">{lastInp}</div>
        )}
      </div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, view: ViewTransform, w: number, h: number) {
  const gridSize = 50 * view.scale;
  if (gridSize < 5) return;

  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 0.5;

  const startX = view.offsetX % gridSize;
  const startY = view.offsetY % gridSize;

  for (let x = startX; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = startY; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
