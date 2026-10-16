/**
 * The ground: topographic contour lines behind the page, the map the red thread is a trail on.
 * The map is far bigger than the page and pans more slowly than the content as you scroll. The
 * canvas holds a band taller than the screen and only redraws when the band runs out, so scrolling
 * costs a transform, not a redraw. Every fifth contour is an index line, drawn heavier, as on a
 * survey map.
 */
import { createNoise } from './noise';

export interface TopoOptions {
  canvas: HTMLCanvasElement;
  color: string;
  /** How fast the map pans against the page scroll. */
  parallax?: number;
}

export function createTopo(o: TopoOptions) {
  const ctx = o.canvas.getContext('2d')!;
  const noise = createNoise(23);
  const parallax = o.parallax ?? 0.35;
  const LEVELS = 22;
  let w = 1;
  let vh = 1;
  let dpr = 1;
  let cell = 14;
  /** The map's y at the top of the band currently drawn, and the band's height. */
  let bandTop = Number.NaN;
  let band = 1;

  const height = (x: number, y: number) => {
    const s = 1 / 760;
    return noise.n2(x * s, y * s) * 0.62 + noise.n2(x * s * 2.3 + 40, y * s * 2.3) * 0.26 + noise.n2(x * s * 5.1, y * s * 5.1 + 90) * 0.12;
  };

  function resize() {
    // A phone's toolbar coming and going changes the height a little: the band has room for that.
    if (!Number.isNaN(bandTop) && window.innerWidth === w && Math.abs(window.innerHeight - vh) < 120) return update();
    w = window.innerWidth;
    vh = window.innerHeight;
    // Faint lines don't need every device pixel, and the band is tall.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    band = vh * 1.6;
    cell = w < 700 ? 12 : 14;
    o.canvas.style.height = `${band}px`;
    o.canvas.width = Math.round(w * dpr);
    o.canvas.height = Math.round(band * dpr);
    bandTop = Number.NaN;
    update();
  }

  /** Draws the contours of the map between top and top + band (map coordinates). */
  function render(top: number) {
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(band / cell) + 1;
    const f = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[j * cols + i] = height(i * cell, top + j * cell);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, band);
    ctx.strokeStyle = o.color;
    ctx.lineCap = 'round';
    for (let L = 0; L < LEVELS; L++) {
      const lv = -1 + (2 * (L + 0.5)) / LEVELS;
      const index = L % 5 === 2;
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
      ctx.globalAlpha = index ? 0.5 : 0.28;
      ctx.lineWidth = index ? 1.3 : 0.8;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    bandTop = top;
  }

  /** Follow the scroll: shift the band, and redraw it when the screen nears its edge. */
  function update() {
    const view = window.scrollY * parallax;
    // Most scrolling is downward, so most of the spare band goes below the screen.
    if (Number.isNaN(bandTop) || view < bandTop + vh * 0.04 || view + vh > bandTop + band - vh * 0.04) render(view - vh * 0.14);
    o.canvas.style.transform = `translate3d(0, ${(bandTop - view).toFixed(1)}px, 0)`;
  }

  resize();
  return { update, resize };
}
