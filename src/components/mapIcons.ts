/**
 * Programmatic canvas icons for network elements.
 * Rendered at 64x64 (2x for retina) then loaded via map.addImage().
 */
import type maplibregl from 'maplibre-gl';

const SIZE = 64; // 2x for retina clarity
const HALF = SIZE / 2;

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  return [canvas, ctx];
}

function drawShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Reservoir — water tower silhouette */
function drawReservoir(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  drawShadow(ctx);

  // Tower body — trapezoid
  ctx.beginPath();
  ctx.moveTo(18, 48); // bottom-left
  ctx.lineTo(46, 48); // bottom-right
  ctx.lineTo(42, 18); // top-right
  ctx.lineTo(22, 18); // top-left
  ctx.closePath();
  ctx.fillStyle = '#2980b9';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  clearShadow(ctx);

  // Water wave inside
  ctx.beginPath();
  ctx.moveTo(24, 34);
  ctx.quadraticCurveTo(28, 30, 32, 34);
  ctx.quadraticCurveTo(36, 38, 40, 34);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top rim
  ctx.beginPath();
  ctx.moveTo(20, 18);
  ctx.lineTo(44, 18);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas;
}

/** Tank — cylindrical elevated storage */
function drawTank(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  drawShadow(ctx);

  // Legs
  ctx.strokeStyle = '#8e44ad';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, 50); ctx.lineTo(26, 34);
  ctx.moveTo(42, 50); ctx.lineTo(38, 34);
  ctx.stroke();

  // Tank body — rounded rect
  const rx = 18, ry = 22, rw = 28, rh = 18, r = 5;
  ctx.beginPath();
  ctx.moveTo(rx + r, ry);
  ctx.lineTo(rx + rw - r, ry);
  ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
  ctx.lineTo(rx + rw, ry + rh - r);
  ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
  ctx.lineTo(rx + r, ry + rh);
  ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
  ctx.lineTo(rx, ry + r);
  ctx.arcTo(rx, ry, rx + r, ry, r);
  ctx.closePath();
  ctx.fillStyle = '#8e44ad';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  clearShadow(ctx);

  // Water level line
  ctx.beginPath();
  ctx.moveTo(21, 30);
  ctx.lineTo(43, 30);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  return canvas;
}

/** Junction — circle with pass/fail/default indicator */
function drawJunction(fill: string, symbol: 'check' | 'cross' | 'dot'): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  drawShadow(ctx);

  // Circle
  ctx.beginPath();
  ctx.arc(HALF, HALF, 14, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  clearShadow(ctx);

  // Inner symbol
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  if (symbol === 'check') {
    ctx.beginPath();
    ctx.moveTo(24, 32);
    ctx.lineTo(30, 38);
    ctx.lineTo(40, 26);
    ctx.stroke();
  } else if (symbol === 'cross') {
    ctx.beginPath();
    ctx.moveTo(25, 25);
    ctx.lineTo(39, 39);
    ctx.moveTo(39, 25);
    ctx.lineTo(25, 39);
    ctx.stroke();
  } else {
    // Dot
    ctx.beginPath();
    ctx.arc(HALF, HALF, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** Pump — circle with rotating arrow */
function drawPump(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  drawShadow(ctx);

  // Circle
  ctx.beginPath();
  ctx.arc(HALF, HALF, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#e67e22';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  clearShadow(ctx);

  // Curved arrow
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(HALF, HALF, 8, -Math.PI * 0.7, Math.PI * 0.5);
  ctx.stroke();

  // Arrow head
  const ax = HALF + 8 * Math.cos(Math.PI * 0.5);
  const ay = HALF + 8 * Math.sin(Math.PI * 0.5);
  ctx.beginPath();
  ctx.moveTo(ax - 4, ay - 3);
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax + 4, ay - 3);
  ctx.stroke();

  return canvas;
}

/** Valve — bowtie/butterfly shape */
function drawValve(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  drawShadow(ctx);

  // Left triangle
  ctx.beginPath();
  ctx.moveTo(HALF, HALF - 10);
  ctx.lineTo(HALF - 14, HALF);
  ctx.lineTo(HALF, HALF + 10);
  ctx.closePath();
  ctx.fillStyle = '#9b59b6';
  ctx.fill();

  // Right triangle
  ctx.beginPath();
  ctx.moveTo(HALF, HALF - 10);
  ctx.lineTo(HALF + 14, HALF);
  ctx.lineTo(HALF, HALF + 10);
  ctx.closePath();
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(HALF, HALF - 10);
  ctx.lineTo(HALF - 14, HALF);
  ctx.lineTo(HALF, HALF + 10);
  ctx.lineTo(HALF + 14, HALF);
  ctx.closePath();
  ctx.stroke();

  clearShadow(ctx);

  // Center line
  ctx.beginPath();
  ctx.moveTo(HALF, HALF - 12);
  ctx.lineTo(HALF, HALF + 12);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas;
}

function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Load all network icons into a MapLibre map instance */
export function loadNetworkIcons(map: maplibregl.Map): void {
  const icons: [string, HTMLCanvasElement][] = [
    ['icon-reservoir', drawReservoir()],
    ['icon-tank', drawTank()],
    ['icon-junction-pass', drawJunction('#2ecc71', 'check')],
    ['icon-junction-fail', drawJunction('#e74c3c', 'cross')],
    ['icon-junction-default', drawJunction('#34495e', 'dot')],
    ['icon-pump', drawPump()],
    ['icon-valve', drawValve()],
  ];

  for (const [name, canvas] of icons) {
    if (!map.hasImage(name)) {
      const imageData = canvasToImageData(canvas);
      map.addImage(name, { width: SIZE, height: SIZE, data: imageData.data }, { pixelRatio: 2 });
    }
  }
}
