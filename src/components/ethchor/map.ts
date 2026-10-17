/**
 * The method's survey map: contour lines over country with a hill raised under each waypoint, drawn
 * on a canvas the size of the map, and again whenever that changes. Every fifth contour is an index
 * line, drawn heavier, as on a printed map.
 */
import { createNoise } from './noise';

export interface Peak {
  /** Where it stands, in CSS pixels within the canvas, how high and how broad (pixels). */
  x: number;
  y: number;
  height: number;
  spread: number;
}

export interface MapOptions {
  canvas: HTMLCanvasElement;
  peaks: () => Peak[];
  color: string;
  index: string;
}

export function createMap(o: MapOptions) {
  const ctx = o.canvas.getContext('2d')!;
  const noise = createNoise(31);
  const LEVELS = 22;

  function render() {
    const w = o.canvas.clientWidth || 1;
    const h = o.canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    o.canvas.width = Math.round(w * dpr);
    o.canvas.height = Math.round(h * dpr);
    const peaks = o.peaks();
    const cell = w < 600 ? 4 : 5;
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const f = new Float32Array(cols * rows);
    let lo = Infinity;
    let hi = -Infinity;
    // Rolling country, measured in map widths so it looks the same at any size, and the hills.
    const s = 1 / Math.max(w, 1);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * cell;
        const y = j * cell;
        let v = 0.3 * noise.n2(x * s * 2.6, y * s * 2.6) + 0.13 * noise.n2(x * s * 6 + 7, y * s * 6) + 0.05 * noise.n2(x * s * 14, y * s * 14 + 3);
        for (const p of peaks) {
          const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
          v += p.height * Math.exp(-d2 / (2 * p.spread * p.spread));
        }
        f[j * cols + i] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let L = 1; L < LEVELS; L++) {
      const lv = lo + ((hi - lo) * L) / LEVELS;
      const index = L % 5 === 0;
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = f[j * cols + i];
          const b = f[j * cols + i + 1];
          const c = f[(j + 1) * cols + i + 1];
          const d = f[(j + 1) * cols + i];
          const code = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const x = i * cell;
          const y = j * cell;
          const tx = x + ((lv - a) / (b - a)) * cell;
          const ry = y + ((lv - b) / (c - b)) * cell;
          const bx = x + ((lv - d) / (c - d)) * cell;
          const ly = y + ((lv - a) / (d - a)) * cell;
          const seg = (x1: number, y1: number, x2: number, y2: number) => {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          };
          switch (code) {
            case 1:
            case 14:
              seg(x, ly, bx, y + cell);
              break;
            case 2:
            case 13:
              seg(bx, y + cell, x + cell, ry);
              break;
            case 3:
            case 12:
              seg(x, ly, x + cell, ry);
              break;
            case 4:
            case 11:
              seg(tx, y, x + cell, ry);
              break;
            case 5:
              seg(x, ly, tx, y);
              seg(bx, y + cell, x + cell, ry);
              break;
            case 6:
            case 9:
              seg(tx, y, bx, y + cell);
              break;
            case 7:
            case 8:
              seg(x, ly, tx, y);
              break;
            case 10:
              seg(tx, y, x + cell, ry);
              seg(x, ly, bx, y + cell);
              break;
          }
        }
      }
      ctx.strokeStyle = index ? o.index : o.color;
      ctx.globalAlpha = index ? 0.9 : 0.6;
      ctx.lineWidth = index ? 1.4 : 0.8;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  render();
  return { render };
}
