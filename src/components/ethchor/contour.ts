/**
 * Contour lines of a field sampled on a grid, traced straight into canvas paths: marching squares
 * in one pass over the cells, each cell drawing only the levels that cross it. Every fifth level
 * goes into a second path, to be drawn heavier as an index contour, as on a printed map.
 */
export interface Contours {
  normal: Path2D;
  index: Path2D;
}

/**
 * Levels run from lo + step to lo + (levels - 1) * step. The field is cols by rows samples, cell
 * pixels apart.
 */
export function traceContours(f: Float32Array, cols: number, rows: number, cell: number, lo: number, step: number, levels: number): Contours {
  const normal = new Path2D();
  const index = new Path2D();
  if (!(step > 0)) return { normal, index };
  for (let j = 0; j < rows - 1; j++) {
    const y = j * cell;
    for (let i = 0; i < cols - 1; i++) {
      const a = f[j * cols + i];
      const b = f[j * cols + i + 1];
      const c = f[(j + 1) * cols + i + 1];
      const d = f[(j + 1) * cols + i];
      const mn = Math.min(a, b, c, d);
      const mx = Math.max(a, b, c, d);
      const first = Math.max(1, Math.ceil((mn - lo) / step));
      const last = Math.min(levels - 1, Math.floor((mx - lo) / step));
      if (first > last) continue;
      const x = i * cell;
      for (let L = first; L <= last; L++) {
        const lv = lo + L * step;
        const code = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const p = L % 5 === 0 ? index : normal;
        // Where the level crosses each edge of the cell (only the crossed edges are used).
        const top = x + ((lv - a) / (b - a || 1e-9)) * cell;
        const right = y + ((lv - b) / (c - b || 1e-9)) * cell;
        const bottom = x + ((lv - d) / (c - d || 1e-9)) * cell;
        const left = y + ((lv - a) / (d - a || 1e-9)) * cell;
        const seg = (x1: number, y1: number, x2: number, y2: number) => {
          p.moveTo(x1, y1);
          p.lineTo(x2, y2);
        };
        switch (code) {
          case 1:
          case 14:
            seg(x, left, bottom, y + cell);
            break;
          case 2:
          case 13:
            seg(bottom, y + cell, x + cell, right);
            break;
          case 3:
          case 12:
            seg(x, left, x + cell, right);
            break;
          case 4:
          case 11:
            seg(top, y, x + cell, right);
            break;
          case 5:
            seg(x, left, top, y);
            seg(bottom, y + cell, x + cell, right);
            break;
          case 6:
          case 9:
            seg(top, y, bottom, y + cell);
            break;
          case 7:
          case 8:
            seg(x, left, top, y);
            break;
          case 10:
            seg(top, y, x + cell, right);
            seg(x, left, bottom, y + cell);
            break;
        }
      }
    }
  }
  return { normal, index };
}
