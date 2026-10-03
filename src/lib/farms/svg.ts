/**
 * Renders a plant model to an SVG plate at build time. Leaves, blooms and fruit share one path
 * per colour, so even a lush palm is a few dozen nodes.
 */
import {
  along,
  bandLines,
  bloomShapes,
  fruitShapes,
  heading,
  leafShape,
  leafStreak,
  leafVein,
  potShapes,
  stemShape,
  widthAt,
  type Model,
  type Pen,
  type Stem,
} from './flora';

const f = (n: number) => (Math.round(n * 10) / 10).toString();

class SvgPen implements Pen {
  d = '';
  moveTo(x: number, y: number) {
    this.d += `M${f(x)} ${f(y)}`;
  }
  lineTo(x: number, y: number) {
    this.d += `L${f(x)} ${f(y)}`;
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    this.d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
  }
  bezierCurveTo(ax: number, ay: number, bx: number, by: number, x: number, y: number) {
    this.d += `C${f(ax)} ${f(ay)} ${f(bx)} ${f(by)} ${f(x)} ${f(y)}`;
  }
  closePath() {
    this.d += 'Z';
  }
  /** Whole ellipses only, as two arcs. */
  ellipse(x: number, y: number, rx: number, ry: number, rot: number) {
    const deg = f((rot * 180) / Math.PI);
    const sx = x + Math.cos(rot) * rx;
    const sy = y + Math.sin(rot) * rx;
    const ex = x - Math.cos(rot) * rx;
    const ey = y - Math.sin(rot) * rx;
    this.d += `M${f(sx)} ${f(sy)}A${f(rx)} ${f(ry)} ${deg} 1 1 ${f(ex)} ${f(ey)}A${f(rx)} ${f(ry)} ${deg} 1 1 ${f(sx)} ${f(sy)}`;
  }
}

/** Paths grouped by colour, in the order the colours first appear. */
class Layers {
  private map = new Map<string, SvgPen>();
  pen(color: string) {
    let p = this.map.get(color);
    if (!p) this.map.set(color, (p = new SvgPen()));
    return p;
  }
  layer = (color: string, draw: (pen: Pen) => void) => draw(this.pen(color));
  fills(extra = '') {
    return [...this.map].map(([c, p]) => `<path fill="${c}"${extra} d="${p.d}"/>`).join('');
  }
  strokes(width: number, extra = '') {
    return [...this.map]
      .map(([c, p]) => `<path fill="none" stroke="${c}" stroke-width="${width}" stroke-linecap="round"${extra} d="${p.d}"/>`)
      .join('');
  }
}

const fill = (color: string, draw: (pen: Pen) => void, extra = '') => {
  const p = new SvgPen();
  draw(p);
  return `<path fill="${color}"${extra} d="${p.d}"/>`;
};
const stroke = (color: string, width: number, draw: (pen: Pen) => void, extra = '') => {
  const p = new SvgPen();
  draw(p);
  return `<path fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra} d="${p.d}"/>`;
};

/** One stem, with its margin, rings or bands, in drawing order. */
function stemSvg(s: Stem): string {
  const xs = s.pts.map((p) => p[0]);
  const ys = s.pts.map((p) => p[1]);
  const n = s.pts.length;
  let out = '';
  if (s.margin) {
    out += fill(s.margin, (p) => stemShape(p, xs, ys, n, (t) => widthAt(s, t)));
    out += fill(s.color, (p) => stemShape(p, xs, ys, n, (t) => Math.max(0, widthAt(s, t) - 1.4)));
  } else {
    out += fill(s.color, (p) => stemShape(p, xs, ys, n, (t) => widthAt(s, t)));
  }
  if (s.rings) {
    out += stroke(s.rings, 0.4, (p) => {
      for (let i = 1; i < n - 1; i++) {
        const a = heading(s.pts, i) + Math.PI / 2;
        const w = widthAt(s, i / (n - 1)) * 0.55;
        p.moveTo(xs[i] + Math.cos(a) * w, ys[i] + Math.sin(a) * w);
        p.lineTo(xs[i] - Math.cos(a) * w, ys[i] - Math.sin(a) * w);
      }
    }, ' opacity="0.7"');
  }
  if (s.bands) out += stroke(s.bands, 0.7, (p) => bandLines(p, s), ' opacity="0.8"');
  return out;
}

export interface PlateOptions {
  /** Names the plant group, for the page script. */
  id: string;
  label?: string;
}

export function plantSvg(m: Model, { id, label }: PlateOptions): string {
  const leaves = new Layers();
  const streaks = new Layers();
  const veins = new Layers();
  const blooms = new Layers();
  const fruits = new Layers();
  const pot = new Layers();

  const stakes = m.stems.filter((s) => s.kind === 'stake').map(stemSvg).join('');
  const stems = m.stems.filter((s) => s.kind !== 'stake').map(stemSvg).join('');

  for (const l of m.leaves) {
    const s = m.stems[l.s];
    const [x, y] = along(s.pts, l.at);
    const ang = heading(s.pts, l.at) + l.a;
    leafShape(leaves.pen(l.color), x, y, ang, l.len, l.wid, l.shape, l.curl);
    if (l.streak) leafStreak(streaks.pen(l.streak), x, y, ang, l.len, l.wid, l.curl, l.a > 0 ? 1 : -1);
    if (l.vein) leafVein(veins.pen(l.vein), x, y, ang, l.len, l.curl);
  }
  m.blooms.forEach((bl, i) => {
    const s = m.stems[bl.s];
    const [x, y] = along(s.pts, bl.at);
    bloomShapes(bl, x, y, heading(s.pts, bl.at) + bl.a, blooms.layer, i);
  });
  for (const fr of m.fruits) {
    const [x, y] = along(m.stems[fr.s].pts, fr.at);
    fruitShapes(fr, x, y, fruits.layer);
  }
  potShapes(m.pot, pot.layer);

  // Frame every plate the same way: pot centred at the bottom, 4:5, and never so tight that a
  // small herb looks as big as a palm.
  const pad = 7;
  let half = Math.max(-m.box.x0, m.box.x1, m.pot.top / 2) + pad;
  const y1 = Math.max(m.pot.h + 3, m.box.y1 + 3);
  let y0 = Math.min(m.box.y0 - pad, y1 - 122);
  let h = y1 - y0;
  if ((2 * half) / h < 0.8) half = (h * 0.8) / 2;
  else {
    h = (2 * half) / 0.8;
    y0 = y1 - h;
  }

  return [
    `<svg class="art" viewBox="${f(-half)} ${f(y0)} ${f(2 * half)} ${f(h)}" xmlns="http://www.w3.org/2000/svg"`,
    label ? ` role="img" aria-label="${label}">` : ' aria-hidden="true">',
    // The pot first: trailing stems spill over its rim.
    `<g class="art-pot">${pot.fills()}</g>`,
    `<g class="art-plant" data-art="${id}">`,
    stakes,
    stems,
    leaves.fills(),
    streaks.fills(' opacity="0.7"'),
    veins.strokes(0.32, ' opacity="0.6"'),
    blooms.fills(),
    fruits.fills(),
    `</g>`,
    `</svg>`,
  ].join('');
}
