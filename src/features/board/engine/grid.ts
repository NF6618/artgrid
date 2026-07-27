import { Viewport } from './types';

export function snapToGrid(val: number, gridSize: number = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

export function drawCanvasGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
  gridStyle: 'dots' | 'lines' | 'none' = 'dots',
  isDarkMode: boolean = true
) {
  if (gridStyle === 'none') return;

  const gridSize = 24 * viewport.zoom;
  if (gridSize < 6) return; // Too zoomed out to render clear grid

  ctx.save();

  const startX = (viewport.x % gridSize);
  const startY = (viewport.y % gridSize);

  const dotColor = isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
  const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  if (gridStyle === 'dots') {
    ctx.fillStyle = dotColor;
    const dotRadius = Math.max(1, Math.min(2.5, 1.2 * viewport.zoom));

    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gridStyle === 'lines') {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}
