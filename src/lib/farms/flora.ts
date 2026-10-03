/**
 * Qwantarc Farms: every plant in the nursery is drawn by code, from a seed.
 *
 * `grow()` builds a plant as stems, leaves, blooms and fruit in plant space, where the soil
 * centre is (0, 0) and up is negative y. The collection renders that model to SVG at build time
 * (`svg.ts`); the garden canvas renders the same model live and bends every stem toward the light.
 */

export type Vec = [number, number];
export const UP = -Math.PI / 2;
const TAU = Math.PI * 2;

export type StemKind = 'stem' | 'cane' | 'trunk' | 'twig' | 'stake' | 'blade';
/** How a stem's width changes from base to tip. */
export type Profile = 'taper' | 'leaf' | 'caudex';

export interface Stem {
  pts: Vec[];
  w0: number;
  w1: number;
  /** Index of the stem this one grows from, or -1 for the soil. */
  parent: number;
  /** Fractional point index on the parent where this stem starts. */
  at: number;
  /** How far the stem bends toward the light, 0 (rigid) to 1. */
  flex: number;
  kind: StemKind;
  color: string;
  profile?: Profile;
  /** Areca canes: rings where old fronds fell. */
  rings?: string;
  /** Snake plant: pale cross bands and a yellow margin. */
  bands?: string;
  margin?: string;
}

export type LeafShape = 'ovate' | 'elliptic' | 'lance' | 'heart' | 'blade' | 'spoon';

export interface Leaf {
  s: number;
  at: number;
  /** Angle from the stem's heading, radians (positive turns clockwise on screen). */
  a: number;
  len: number;
  /** Half-width as a share of the length. */
  wid: number;
  shape: LeafShape;
  /** Bend of the blade along its length, radians. */
  curl: number;
  color: string;
  vein?: string;
  /** A pale streak down the blade (money plant). */
  streak?: string;
}

export type BloomKind = 'hibiscus' | 'cluster' | 'star' | 'double' | 'bract' | 'trumpet' | 'tube' | 'bud' | 'spathe' | 'sheath';

export interface Bloom {
  s: number;
  at: number;
  /** Facing, from the stem's heading. */
  a: number;
  r: number;
  kind: BloomKind;
  color: string;
  eye?: string;
}

export interface Fruit {
  s: number;
  at: number;
  r: number;
  color: string;
}

export interface Pot {
  top: number;
  bottom: number;
  h: number;
}

export interface Model {
  stems: Stem[];
  leaves: Leaf[];
  blooms: Bloom[];
  fruits: Fruit[];
  pot: Pot;
  /** Extent of the plant: left, right, top and bottom (trailing stems hang below the soil). */
  box: { x0: number; x1: number; y0: number; y1: number };
}

export const POT = { body: '#b65a36', rim: '#c96d43', shade: '#96462a', soil: '#2a201a' };

/* ---------- Geometry shared by the SVG and canvas renderers ---------- */

/** The drawing calls both renderers understand. A canvas Path2D is one already. */
export interface Pen {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  bezierCurveTo(ax: number, ay: number, bx: number, by: number, x: number, y: number): void;
  closePath(): void;
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number): void;
}

export function along(pts: Vec[], at: number): Vec {
  const i = Math.max(0, Math.min(pts.length - 1, at));
  const k = Math.min(Math.floor(i), pts.length - 2);
  const f = i - k;
  const a = pts[k];
  const b = pts[k + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export function heading(pts: Vec[], at: number): number {
  const k = Math.max(0, Math.min(pts.length - 2, Math.floor(at)));
  const a = pts[k];
  const b = pts[k + 1];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

export function widthAt(s: Pick<Stem, 'w0' | 'w1' | 'profile'>, t: number): number {
  if (s.profile === 'leaf') return s.w0 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, 0.14 + t * 0.9))), 0.62);
  const w = s.w0 + (s.w1 - s.w0) * t;
  if (s.profile === 'caudex') return w * (1 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.35)));
  return w;
}

/** A smooth tapered stem: both edges, closed into one shape. */
export function stemShape(pen: Pen, xs: ArrayLike<number>, ys: ArrayLike<number>, n: number, width: (t: number) => number) {
  const lx: number[] = [];
  const ly: number[] = [];
  const rx: number[] = [];
  const ry: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const ang = Math.atan2(ys[b] - ys[a], xs[b] - xs[a]);
    const w = width(i / (n - 1)) / 2;
    const nx = -Math.sin(ang) * w;
    const ny = Math.cos(ang) * w;
    lx.push(xs[i] + nx);
    ly.push(ys[i] + ny);
    rx.push(xs[i] - nx);
    ry.push(ys[i] - ny);
  }
  pen.moveTo(lx[0], ly[0]);
  smooth(pen, lx, ly, false);
  // Round the tip.
  const ta = Math.atan2(ys[n - 1] - ys[n - 2], xs[n - 1] - xs[n - 2]);
  const tw = width(1) / 2;
  pen.quadraticCurveTo(xs[n - 1] + Math.cos(ta) * tw * 1.4, ys[n - 1] + Math.sin(ta) * tw * 1.4, rx[n - 1], ry[n - 1]);
  smooth(pen, rx.reverse(), ry.reverse(), false);
  pen.closePath();
}

/** Continues the current path through points 1..n-1 with quadratic curves via their midpoints. */
function smooth(pen: Pen, xs: number[], ys: number[], move: boolean) {
  const n = xs.length;
  if (move) pen.moveTo(xs[0], ys[0]);
  if (n < 3) {
    pen.lineTo(xs[n - 1], ys[n - 1]);
    return;
  }
  for (let i = 1; i < n - 1; i++) {
    pen.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
  }
  pen.lineTo(xs[n - 1], ys[n - 1]);
}

/** A centre line, for thin stems that are cheaper to stroke than to fill. */
export function stemLine(pen: Pen, xs: ArrayLike<number>, ys: ArrayLike<number>, n: number) {
  smooth(pen, Array.from(xs).slice(0, n), Array.from(ys).slice(0, n), true);
}

/** Control points of the right half of each leaf outline, in leaf space: [u1, v1, u2, v2]. */
const SHAPES: Record<LeafShape, [number, number, number, number]> = {
  ovate: [0.02, 1.3, 0.56, 1.08],
  elliptic: [0.12, 1.32, 0.8, 1.24],
  lance: [0.1, 1.15, 0.62, 0.72],
  heart: [-0.34, 1.5, 0.46, 1.02],
  blade: [0.16, 1.2, 0.72, 0.9],
  spoon: [0.36, 0.42, 0.86, 1.75],
};

function leafMap(x: number, y: number, ang: number, len: number, half: number, curl: number) {
  return (u: number, v: number): Vec => {
    const c = ang + curl * u * 0.5;
    const n = ang + curl * u + Math.PI / 2;
    return [x + Math.cos(c) * len * u + Math.cos(n) * half * v, y + Math.sin(c) * len * u + Math.sin(n) * half * v];
  };
}

export function leafShape(pen: Pen, x: number, y: number, ang: number, len: number, wid: number, shape: LeafShape, curl: number) {
  const [u1, v1, u2, v2] = SHAPES[shape];
  const m = leafMap(x, y, ang, len, wid * len, curl);
  const tip = m(1, 0);
  const a1 = m(u1, v1);
  const a2 = m(u2, v2);
  const b2 = m(u2, -v2);
  const b1 = m(u1, -v1);
  pen.moveTo(x, y);
  pen.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], tip[0], tip[1]);
  pen.bezierCurveTo(b2[0], b2[1], b1[0], b1[1], x, y);
  pen.closePath();
}

/** The midrib, stopping short of the tip. */
export function leafVein(pen: Pen, x: number, y: number, ang: number, len: number, curl: number) {
  const m = leafMap(x, y, ang, len, 0, curl);
  const mid = m(0.45, 0);
  const end = m(0.86, 0);
  pen.moveTo(x, y);
  pen.quadraticCurveTo(2 * mid[0] - (x + end[0]) / 2, 2 * mid[1] - (y + end[1]) / 2, end[0], end[1]);
}

/** A narrow pale streak along the blade, offset to one side. */
export function leafStreak(pen: Pen, x: number, y: number, ang: number, len: number, wid: number, curl: number, side: number) {
  const m = leafMap(x, y, ang, len, wid * len, curl);
  const p0 = m(0.12, 0.25 * side);
  const c1 = m(0.35, 0.75 * side);
  const c2 = m(0.65, 0.65 * side);
  const p1 = m(0.86, 0.12 * side);
  const c3 = m(0.6, 0.25 * side);
  const c4 = m(0.35, 0.3 * side);
  pen.moveTo(p0[0], p0[1]);
  pen.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p1[0], p1[1]);
  pen.bezierCurveTo(c3[0], c3[1], c4[0], c4[1], p0[0], p0[1]);
  pen.closePath();
}

export function oval(pen: Pen, x: number, y: number, rx: number, ry: number, rot = 0) {
  pen.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  pen.ellipse(x, y, rx, ry, rot, 0, TAU);
  pen.closePath();
}

/** Paints a bloom as colour layers: `layer(colour, draw)` is called back to front. */
export function bloomShapes(
  bl: Pick<Bloom, 'kind' | 'r' | 'color' | 'eye'>,
  x: number,
  y: number,
  ang: number,
  layer: (color: string, draw: (pen: Pen) => void) => void,
  seed = 0,
) {
  const r = bl.r;
  const eye = bl.eye ?? bl.color;
  switch (bl.kind) {
    case 'hibiscus': {
      layer(bl.color, (p) => {
        for (let i = 0; i < 5; i++) leafShape(p, x, y, ang + 0.4 + (i * TAU) / 5, r, 0.62, 'spoon', 0.3);
      });
      layer(eye, (p) => oval(p, x, y, r * 0.26, r * 0.26));
      layer('#f6efe2', (p) => leafShape(p, x, y, ang, r * 0.95, 0.06, 'blade', 0));
      layer('#f2c94c', (p) => oval(p, x + Math.cos(ang) * r * 0.95, y + Math.sin(ang) * r * 0.95, r * 0.11, r * 0.11));
      break;
    }
    case 'cluster': {
      // A dome of tiny four-petal flowers, packed on a spiral.
      const n = 15;
      layer(bl.color, (p) => {
        for (let i = 0; i < n; i++) {
          const rr = r * Math.sqrt((i + 0.5) / n) * 0.82;
          const t = i * 2.39996 + seed;
          const fx = x + Math.cos(t) * rr;
          const fy = y + Math.sin(t) * rr * 0.86;
          const s = r * 0.17;
          for (let k = 0; k < 4; k++) {
            const pa = t + (k * Math.PI) / 2;
            oval(p, fx + Math.cos(pa) * s * 0.55, fy + Math.sin(pa) * s * 0.55, s * 0.58, s * 0.36, pa);
          }
        }
      });
      layer(eye, (p) => {
        for (let i = 0; i < n; i += 2) {
          const rr = r * Math.sqrt((i + 0.5) / n) * 0.82;
          const t = i * 2.39996 + seed;
          oval(p, x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.86, r * 0.05, r * 0.05);
        }
      });
      break;
    }
    case 'star':
    case 'double': {
      const petals = bl.kind === 'double' ? 7 : 5;
      layer(bl.color, (p) => {
        for (let i = 0; i < petals; i++) leafShape(p, x, y, ang + (i * TAU) / petals, r, 0.36, 'elliptic', 0);
        if (bl.kind === 'double') {
          for (let i = 0; i < petals; i++) leafShape(p, x, y, ang + ((i + 0.5) * TAU) / petals, r * 0.66, 0.4, 'elliptic', 0);
        }
      });
      layer(eye, (p) => oval(p, x, y, r * 0.2, r * 0.2));
      break;
    }
    case 'bract': {
      layer(bl.color, (p) => {
        for (let i = 0; i < 3; i++) leafShape(p, x, y, ang + (i * TAU) / 3, r, 0.6, 'ovate', 0.1);
      });
      layer('#fff6ea', (p) => oval(p, x, y, r * 0.12, r * 0.12));
      break;
    }
    case 'trumpet': {
      layer(bl.color, (p) => {
        for (let i = 0; i < 5; i++) leafShape(p, x, y, ang + (i * TAU) / 5, r, 0.58, 'spoon', 0.45);
      });
      layer(eye, (p) => oval(p, x, y, r * 0.3, r * 0.3));
      layer(bl.color, (p) => oval(p, x, y, r * 0.09, r * 0.09));
      break;
    }
    case 'tube': {
      const ex = x + Math.cos(ang) * r * 1.3;
      const ey = y + Math.sin(ang) * r * 1.3;
      layer(bl.color, (p) => {
        leafShape(p, x, y, ang, r * 1.35, 0.1, 'blade', 0);
        for (let i = 0; i < 5; i++) leafShape(p, ex, ey, ang + 0.6 + (i * TAU) / 5, r * 0.5, 0.5, 'ovate', 0);
      });
      layer(eye, (p) => oval(p, ex, ey, r * 0.1, r * 0.1));
      break;
    }
    case 'bud':
      layer(bl.color, (p) => oval(p, x, y, r * 1.25, r, ang));
      break;
    case 'spathe': {
      layer(bl.color, (p) => leafShape(p, x, y, ang, r * 2.1, 0.42, 'ovate', 0.3));
      layer(eye, (p) => leafShape(p, x, y, ang - 0.12, r * 1.15, 0.13, 'blade', 0));
      break;
    }
    case 'sheath':
      layer(bl.color, (p) => leafShape(p, x, y, ang, r * 2.2, 0.2, 'lance', 0.1));
      break;
  }
}

/** Wavy pale bands across a sword leaf. */
export function bandLines(p: Pen, s: Pick<Stem, 'pts' | 'w0' | 'w1' | 'profile'>) {
  const n = s.pts.length;
  for (let t = 0.08; t < 0.9; t += 0.075) {
    const at = t * (n - 1);
    const [x, y] = along(s.pts, at);
    const a = heading(s.pts, at) + Math.PI / 2;
    const w = widthAt(s, t) * 0.4;
    const bend = Math.sin(t * 40) * 0.8;
    p.moveTo(x + Math.cos(a) * w, y + Math.sin(a) * w);
    p.quadraticCurveTo(x - Math.sin(a) * bend, y + Math.cos(a) * bend - 0.9, x - Math.cos(a) * w, y - Math.sin(a) * w);
  }
}

export function fruitShapes(f: Pick<Fruit, 'r' | 'color'>, x: number, y: number, layer: (color: string, draw: (pen: Pen) => void) => void) {
  const r = f.r;
  // The fruit hangs below the twig on a short stalk.
  const fy = y + r * 1.25;
  layer('#5b4a36', (p) => leafShape(p, x, y, Math.PI / 2, r * 0.5, 0.18, 'blade', 0));
  layer(f.color, (p) => oval(p, x, fy, r, r * 1.2, 0.15));
  layer('rgba(255,255,255,0.35)', (p) => oval(p, x - r * 0.35, fy - r * 0.4, r * 0.28, r * 0.18, -0.5));
}

export function potShapes(pot: Pot, layer: (color: string, draw: (pen: Pen) => void) => void) {
  const { top, bottom, h } = pot;
  const rim = h * 0.2;
  const t = top / 2;
  const b = bottom / 2;
  const body = t * 0.94;
  layer(POT.body, (p) => {
    p.moveTo(-body, rim);
    p.lineTo(body, rim);
    p.lineTo(b, h - 1.2);
    p.quadraticCurveTo(b, h, b - 1.2, h);
    p.lineTo(-b + 1.2, h);
    p.quadraticCurveTo(-b, h, -b, h - 1.2);
    p.closePath();
  });
  // The side away from the light, and the shadow under the rim.
  layer(POT.shade, (p) => {
    p.moveTo(body * 0.42, rim);
    p.lineTo(body, rim);
    p.lineTo(b, h - 1.2);
    p.quadraticCurveTo(b, h, b - 1.2, h);
    p.lineTo(b * 0.36, h);
    p.closePath();
    p.moveTo(-body, rim);
    p.lineTo(body, rim);
    p.lineTo(body - 0.3, rim + 1.6);
    p.lineTo(-body + 0.3, rim + 1.6);
    p.closePath();
  });
  layer(POT.rim, (p) => {
    p.moveTo(-t, 0.9);
    p.quadraticCurveTo(-t, 0, -t + 0.9, 0);
    p.lineTo(t - 0.9, 0);
    p.quadraticCurveTo(t, 0, t, 0.9);
    p.lineTo(t, rim - 0.9);
    p.quadraticCurveTo(t, rim, t - 0.9, rim);
    p.lineTo(-t + 0.9, rim);
    p.quadraticCurveTo(-t, rim, -t, rim - 0.9);
    p.closePath();
  });
  layer(POT.soil, (p) => oval(p, 0, 0.7, t - 1.2, 1.3));
}

/* ---------- Growing ---------- */

/** mulberry32: small, fast and the same on every visit for the same seed. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StemOpts {
  from: Vec;
  dir: number;
  len: number;
  n?: number;
  /** Total turn over the stem's length (positive is clockwise on screen). */
  turn?: number;
  wobble?: number;
  w0: number;
  w1: number;
  parent?: number;
  at?: number;
  flex: number;
  kind?: StemKind;
  color: string;
  profile?: Profile;
  rings?: string;
  bands?: string;
  margin?: string;
}

/** Turns `a` toward `b` by `t` (0..1) the short way round. */
function toward(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

class Builder {
  stems: Stem[] = [];
  leaves: Leaf[] = [];
  blooms: Bloom[] = [];
  fruits: Fruit[] = [];
  constructor(readonly r: () => number) {}

  rand(a = 0, b = 1) {
    return a + (b - a) * this.r();
  }
  int(a: number, b: number) {
    return Math.floor(this.rand(a, b + 1 - 1e-9));
  }
  pick<T>(xs: readonly T[]): T {
    return xs[Math.floor(this.r() * xs.length)];
  }
  sign() {
    return this.r() < 0.5 ? -1 : 1;
  }

  stem(o: StemOpts): number {
    const n = o.n ?? Math.max(4, Math.round(o.len / 6));
    const pts: Vec[] = [[o.from[0], o.from[1]]];
    let [x, y] = o.from;
    let d = o.dir;
    const step = o.len / n;
    for (let i = 0; i < n; i++) {
      d += (o.turn ?? 0) / n + (this.r() - 0.5) * (o.wobble ?? 0);
      x += Math.cos(d) * step;
      y += Math.sin(d) * step;
      pts.push([x, y]);
    }
    return this.path(pts, o);
  }

  /** A stem through explicit points, such as a vine winding up its stake. */
  path(pts: Vec[], o: Omit<StemOpts, 'from' | 'dir' | 'len'>): number {
    this.stems.push({
      pts,
      w0: o.w0,
      w1: o.w1,
      parent: o.parent ?? -1,
      at: o.at ?? 0,
      flex: o.flex,
      kind: o.kind ?? 'stem',
      color: o.color,
      profile: o.profile,
      rings: o.rings,
      bands: o.bands,
      margin: o.margin,
    });
    return this.stems.length - 1;
  }

  /** A stem growing from `parent` at `at`. */
  sprout(parent: number, at: number, o: Omit<StemOpts, 'from' | 'parent' | 'at'>): number {
    return this.stem({ ...o, from: this.at(parent, at), parent, at });
  }

  at(s: number, at: number): Vec {
    return along(this.stems[s].pts, at);
  }
  dir(s: number, at: number) {
    return heading(this.stems[s].pts, at);
  }
  end(s: number) {
    return this.stems[s].pts.length - 1;
  }

  /** Leaves along a stem, alternating sides (or in opposite pairs). */
  leavesAlong(
    s: number,
    o: {
      from?: number;
      to?: number;
      every: number;
      pairs?: boolean;
      angle: [number, number];
      len: [number, number];
      wid: number;
      shape: LeafShape;
      colors: readonly string[];
      curl?: number;
      vein?: string;
      /** Leaves shrink toward the tip, where they are youngest. */
      young?: number;
      skip?: number;
      droop?: number;
    },
  ) {
    const last = this.end(s);
    const from = (o.from ?? 0.2) * last;
    const to = (o.to ?? 1) * last;
    let side = this.sign();
    for (let at = from; at <= to + 1e-6; at += o.every * this.rand(0.8, 1.2)) {
      if (o.skip && this.r() < o.skip) continue;
      const t = (at - from) / Math.max(1e-6, to - from);
      const size = 1 - (o.young ?? 0.3) * t * t;
      const sides = o.pairs ? [1, -1] : [(side = -side)];
      for (const sd of sides) {
        const a = sd * this.rand(o.angle[0], o.angle[1]);
        this.leaves.push({
          s,
          at,
          a,
          len: this.rand(o.len[0], o.len[1]) * size,
          wid: o.wid * this.rand(0.9, 1.1),
          shape: o.shape,
          curl: this.droop(s, at, a, o.curl ?? 0.2) + (o.droop ?? 0),
          color: this.pick(o.colors),
          vein: o.vein,
        });
      }
    }
  }

  /** A curl that makes a leaf bend down under its own weight, whichever way it points. */
  droop(s: number, at: number, a: number, amount: number) {
    const abs = this.dir(s, at) + a;
    return Math.sign(Math.cos(abs) || 1) * amount;
  }

  /** Leaves fanned out at the tip of a stem. */
  whorl(s: number, o: { n: number; spread: number; len: [number, number]; wid: number; shape: LeafShape; colors: readonly string[]; curl?: number; vein?: string; at?: number }) {
    const at = o.at ?? this.end(s);
    for (let i = 0; i < o.n; i++) {
      const a = (i / Math.max(1, o.n - 1) - 0.5) * 2 * o.spread + this.rand(-0.12, 0.12);
      this.leaves.push({
        s,
        at,
        a,
        len: this.rand(o.len[0], o.len[1]) * (1 - Math.abs(a) * 0.12),
        wid: o.wid * this.rand(0.9, 1.1),
        shape: o.shape,
        curl: this.droop(s, at, a, o.curl ?? 0.25),
        color: this.pick(o.colors),
        vein: o.vein,
      });
    }
  }

  done(pot: Pot): Model {
    let x0 = -pot.top / 2;
    let x1 = pot.top / 2;
    let y0 = 0;
    let y1 = pot.h;
    const take = (x: number, y: number, pad = 0) => {
      x0 = Math.min(x0, x - pad);
      x1 = Math.max(x1, x + pad);
      y0 = Math.min(y0, y - pad);
      y1 = Math.max(y1, y + pad);
    };
    for (const s of this.stems) for (const [x, y] of s.pts) take(x, y, s.w0 / 2);
    for (const l of this.leaves) {
      const [x, y] = along(this.stems[l.s].pts, l.at);
      const a = heading(this.stems[l.s].pts, l.at) + l.a + l.curl * 0.5;
      take(x + Math.cos(a) * l.len, y + Math.sin(a) * l.len, l.len * l.wid);
    }
    for (const b of this.blooms) {
      const [x, y] = along(this.stems[b.s].pts, b.at);
      const a = heading(this.stems[b.s].pts, b.at) + b.a;
      const reach = b.kind === 'spathe' || b.kind === 'sheath' ? 2.2 : b.kind === 'tube' ? 1.8 : 0;
      take(x + Math.cos(a) * b.r * reach, y + Math.sin(a) * b.r * reach, b.r * 1.6);
    }
    return { stems: this.stems, leaves: this.leaves, blooms: this.blooms, fruits: this.fruits, pot, box: { x0, x1, y0, y1 } };
  }
}

/* ---------- Shrubs and trees: one recursive branching habit, tuned per species ---------- */

interface Habit {
  trunks: number;
  trunkLen: [number, number];
  trunkW: number;
  trunkSpread: number;
  depth: number;
  kids: [number, number];
  spread: number;
  decay: number;
  wobble: number;
  turn: number;
  wood: string;
  /** How strongly new shoots head back up toward the light. */
  rise: number;
  flex: number;
  /** Length of the first branches off the trunk; deeper ones shrink by `decay`. */
  branchLen: [number, number];
  leaves?: (b: Builder, s: number, level: number) => void;
  tip?: (b: Builder, s: number, level: number) => void;
}

function shrub(b: Builder, h: Habit) {
  const branch = (parent: number, at: number, from: Vec, dir: number, len: number, level: number) => {
    const w0 = h.trunkW * Math.pow(0.62, level);
    const s = parent < 0
      ? b.stem({ from, dir, len, turn: b.rand(-h.turn, h.turn), wobble: h.wobble, w0, w1: w0 * 0.62, flex: h.flex + level * 0.16, kind: level === 0 ? 'trunk' : 'stem', color: h.wood })
      : b.sprout(parent, at, { dir, len, turn: b.rand(-h.turn, h.turn), wobble: h.wobble, w0, w1: w0 * 0.62, flex: h.flex + level * 0.16, kind: 'stem', color: h.wood });
    h.leaves?.(b, s, level);
    if (level < h.depth) {
      const kids = b.int(h.kids[0], h.kids[1]);
      const last = b.end(s);
      for (let i = 0; i < kids; i++) {
        const k = kids === 1 ? 1 : i / (kids - 1);
        const cat = last * (0.5 + 0.5 * k);
        const side = i % 2 === 0 ? -1 : 1;
        const base = b.dir(s, Math.min(cat, last - 0.01));
        const cdir = toward(base + side * h.spread * b.rand(0.55, 1.15), UP, h.rise);
        const clen = level === 0 ? b.rand(h.branchLen[0], h.branchLen[1]) : len * h.decay * b.rand(0.8, 1.12);
        branch(s, cat, b.at(s, cat), cdir, clen, level + 1);
      }
    } else {
      h.tip?.(b, s, level);
    }
    return s;
  };
  for (let i = 0; i < h.trunks; i++) {
    const u = h.trunks === 1 ? 0 : i / (h.trunks - 1) - 0.5;
    const dir = UP + u * h.trunkSpread + b.rand(-0.08, 0.08);
    const len = b.rand(h.trunkLen[0], h.trunkLen[1]) * (1 - Math.abs(u) * 0.3);
    branch(-1, 0, [u * 5 + b.rand(-1, 1), 0], dir, len, 0);
  }
}

/* ---------- The species ---------- */

const GREEN = {
  areca: ['#6f9a3c', '#83ab45', '#5f8c35'],
  lady: ['#2f5e2c', '#3a6b33', '#284f26'],
  coral: ['#5f8f3a', '#6c9c41', '#517f33'],
  rangoon: ['#4f8436', '#5c9140', '#477a31'],
  bougain: ['#4d7f35', '#5a8c3c'],
  money: ['#4f8f3a', '#5fa044', '#447f33'],
  rubber: ['#22402a', '#2b4b30', '#1d3825'],
  lily: ['#2c5a2c', '#356634', '#28522a'],
  hibiscus: ['#2f6a2c', '#3a7834', '#2a5f28'],
  ixora: ['#2a5a2a', '#326632', '#2f5f2d'],
  mogra: ['#3f7a35', '#4a8a3d', '#3a7032'],
  adenium: ['#3e7034', '#4a7f3a'],
  lemon: ['#2f6a2e', '#3a7836', '#2c612b'],
  curry: ['#4b7d2f', '#558a35', '#447329'],
  tulsi: ['#4a7a3a', '#55703d', '#4f6a3a'],
  mango: ['#2f5b2a', '#386833', '#2b5527'],
} as const;

const SPECIES: Record<string, { pot: Pot; grow: (b: Builder) => void }> = {
  /* Clumping golden canes, feathery arching fronds. */
  areca: {
    pot: { top: 40, bottom: 30, h: 32 },
    grow(b) {
      const canes = 7;
      for (let i = 0; i < canes; i++) {
        const u = (i + 0.5) / canes - 0.5;
        const len = b.rand(58, 100) * (1 - Math.abs(u) * 0.42);
        const dir = UP + u * 0.7 + b.rand(-0.05, 0.05);
        const cane = b.stem({ from: [u * 18 + b.rand(-1.5, 1.5), 0], dir, len, n: 10, turn: u * 0.25, wobble: 0.015, w0: 2.6, w1: 1.5, flex: 0.2, kind: 'cane', color: '#b79f4a', rings: '#8f7a33' });
        const fronds = len > 70 ? 3 : 2;
        for (let f = 0; f < fronds; f++) {
          const at = b.end(cane) * (fronds === 1 ? 1 : 0.62 + (0.38 * f) / (fronds - 1));
          const side = f === fronds - 1 ? Math.sign(u + b.rand(-0.15, 0.15)) || 1 : f % 2 === 0 ? -1 : 1;
          const fdir = b.dir(cane, at) + side * b.rand(0.25, 0.85) * (f === fronds - 1 ? 0.5 : 1);
          const flen = b.rand(40, 56) * (len / 100 + 0.35);
          const rachis = b.sprout(cane, at, { dir: fdir, len: flen, n: 12, turn: side * b.rand(1.1, 1.7), w0: 1.2, w1: 0.35, flex: 0.62, kind: 'twig', color: '#8aa040' });
          const pairs = 17;
          const last = b.end(rachis);
          for (let k = 0; k < pairs; k++) {
            const t = k / (pairs - 1);
            const at2 = last * (0.12 + 0.86 * t);
            const lenK = flen * 0.34 * (0.35 + 0.65 * Math.sin(Math.PI * (0.18 + 0.8 * t)));
            for (const sd of [-1, 1]) {
              const a = sd * b.rand(0.55, 0.8);
              b.leaves.push({ s: rachis, at: at2, a, len: lenK * b.rand(0.9, 1.08), wid: 0.075, shape: 'blade', curl: b.droop(rachis, at2, a, b.rand(0.25, 0.5)), color: b.pick(GREEN.areca) });
            }
          }
        }
      }
    },
  },

  /* Slim fibrous canes, each leaf a fan of broad fingers. */
  'lady-palm': {
    pot: { top: 32, bottom: 25, h: 28 },
    grow(b) {
      const canes = 6;
      for (let i = 0; i < canes; i++) {
        const u = (i + 0.5) / canes - 0.5;
        const len = b.rand(46, 86) * (1 - Math.abs(u) * 0.3);
        const cane = b.stem({ from: [u * 14, 0], dir: UP + u * 0.45 + b.rand(-0.05, 0.05), len, n: 9, turn: u * 0.2, wobble: 0.02, w0: 2.3, w1: 1.6, flex: 0.18, kind: 'cane', color: '#4b3a2c', rings: '#3a2c20' });
        const leaves = b.int(3, 4);
        for (let j = 0; j < leaves; j++) {
          const at = b.end(cane) * (0.42 + (0.58 * (j + 1)) / leaves);
          const side = j % 2 === 0 ? -1 : 1;
          const pdir = b.dir(cane, at) + side * b.rand(0.35, 1.05) * (j === leaves - 1 ? 0.3 : 1);
          const pet = b.sprout(cane, at, { dir: pdir, len: b.rand(12, 20), n: 5, turn: side * 0.35, w0: 0.9, w1: 0.6, flex: 0.45, kind: 'twig', color: '#3f5a2f' });
          const fingers = b.int(5, 7);
          for (let k = 0; k < fingers; k++) {
            const a = (k / (fingers - 1) - 0.5) * 1.9 + b.rand(-0.06, 0.06);
            b.leaves.push({ s: pet, at: b.end(pet), a, len: b.rand(15, 20) * (1 - Math.abs(a) * 0.14), wid: 0.17, shape: 'elliptic', curl: b.droop(pet, b.end(pet), a, 0.3), color: b.pick(GREEN.lady), vein: '#4e7a45' });
          }
        }
      }
    },
  },

  /* A bamboo stake, heart-shaped leaves and long sprays of pink. */
  'coral-vine': {
    pot: { top: 30, bottom: 23, h: 26 },
    grow(b) {
      const H = 104;
      b.path([[0, 0], [0, -H]], { w0: 1.8, w1: 1.4, flex: 0.05, kind: 'stake', color: '#b89c66' });
      const pinks = ['#ff4f8b', '#ff6f9f', '#f2397a', '#ff86b0'];
      for (let v = 0; v < 2; v++) {
        const ph = v * Math.PI + b.rand(0, 1);
        const pts: Vec[] = [];
        const top = H * b.rand(0.86, 0.98);
        for (let y = 0; y <= top; y += 5) pts.push([Math.sin(y * 0.13 + ph) * 4.2 * (0.6 + y / top), -y]);
        const vine = b.path(pts, { w0: 1.2, w1: 0.6, flex: 0.06, kind: 'stem', color: '#6d7f3a' });
        b.leavesAlong(vine, { from: 0.15, every: 1.6, angle: [0.9, 1.35], len: [6, 9], wid: 0.55, shape: 'heart', colors: GREEN.coral, curl: 0.15, young: 0.2 });
        const last = b.end(vine);
        for (let at = last * 0.3; at < last; at += b.rand(2.4, 3.4)) {
          const side = b.sign();
          const sdir = UP + side * b.rand(0.5, 1.15);
          const shoot = b.sprout(vine, at, { dir: sdir, len: b.rand(18, 34) * (0.6 + at / last * 0.6), n: 8, turn: side * b.rand(0.9, 1.7), wobble: 0.08, w0: 0.8, w1: 0.35, flex: 0.75, kind: 'twig', color: '#6d7f3a' });
          b.leavesAlong(shoot, { from: 0.15, every: 1.3, angle: [0.9, 1.3], len: [5, 8], wid: 0.55, shape: 'heart', colors: GREEN.coral, curl: 0.18, young: 0.35 });
          if (b.r() < 0.78) {
            const end = b.end(shoot);
            const spray = b.sprout(shoot, end, { dir: b.dir(shoot, end - 0.01) + side * 0.4, len: b.rand(14, 22), n: 8, turn: side * b.rand(0.8, 1.4), w0: 0.35, w1: 0.2, flex: 0.95, kind: 'twig', color: '#c76b86' });
            const sl = b.end(spray);
            for (let k = 0.5; k <= sl; k += b.rand(0.55, 0.8)) {
              const t = k / sl;
              const n = b.r() < 0.5 ? 1 : 2;
              for (let j = 0; j < n; j++) {
                b.blooms.push({ s: spray, at: k, a: (j === 0 ? 1 : -1) * b.rand(0.5, 1.4), r: b.rand(1.0, 1.4) * (1 - t * 0.5), kind: 'bud', color: b.pick(pinks) });
              }
            }
          }
        }
      }
    },
  },

  /* Madhumalti: a strong climber whose flowers open white and blush to red. */
  'rangoon-creeper': {
    pot: { top: 32, bottom: 24, h: 27 },
    grow(b) {
      const H = 100;
      b.path([[0, 0], [0, -H]], { w0: 1.8, w1: 1.4, flex: 0.05, kind: 'stake', color: '#b89c66' });
      const shades = ['#fff4ec', '#ff9bb8', '#f2507a', '#d92b54'];
      for (let v = 0; v < 2; v++) {
        const ph = v * Math.PI + b.rand(0, 1);
        const pts: Vec[] = [];
        const top = H * b.rand(0.84, 0.97);
        for (let y = 0; y <= top; y += 5) pts.push([Math.sin(y * 0.12 + ph) * 4.6 * (0.6 + y / top), -y]);
        const vine = b.path(pts, { w0: 1.4, w1: 0.7, flex: 0.06, kind: 'stem', color: '#6a6a38' });
        b.leavesAlong(vine, { from: 0.18, every: 2, pairs: true, angle: [0.8, 1.2], len: [8, 12], wid: 0.34, shape: 'elliptic', colors: GREEN.rangoon, curl: 0.2, vein: '#7aa45a', young: 0.25 });
        const last = b.end(vine);
        for (let at = last * 0.35; at < last; at += b.rand(3, 4.2)) {
          const side = b.sign();
          const shoot = b.sprout(vine, at, { dir: UP + side * b.rand(0.6, 1.2), len: b.rand(16, 30), n: 7, turn: side * b.rand(0.8, 1.5), wobble: 0.06, w0: 0.9, w1: 0.4, flex: 0.72, kind: 'twig', color: '#6a6a38' });
          b.leavesAlong(shoot, { from: 0.2, every: 1.6, pairs: true, angle: [0.8, 1.2], len: [7, 10], wid: 0.34, shape: 'elliptic', colors: GREEN.rangoon, curl: 0.22, vein: '#7aa45a', young: 0.35 });
          if (b.r() < 0.8) {
            const end = b.end(shoot);
            const n = b.int(5, 8);
            for (let k = 0; k < n; k++) {
              b.blooms.push({ s: shoot, at: end, a: (k / (n - 1) - 0.5) * 2.4 + side * 0.9, r: b.rand(3.6, 4.6), kind: 'tube', color: b.pick(shades), eye: '#fff7cf' });
            }
          }
        }
      }
    },
  },

  /* Arching thorny canes covered in papery magenta bracts. */
  bougainvillea: {
    pot: { top: 32, bottom: 25, h: 27 },
    grow(b) {
      const magenta = ['#e8197d', '#d4126f', '#f03a92', '#ff4fa3'];
      const canes = 6;
      for (let i = 0; i < canes; i++) {
        const u = (i + 0.5) / canes - 0.5;
        const side = Math.sign(u) || 1;
        const cane = b.stem({ from: [u * 8, 0], dir: UP + u * 1.5 + b.rand(-0.1, 0.1), len: b.rand(52, 84), n: 13, turn: side * b.rand(0.5, 1.1), wobble: 0.07, w0: 1.9, w1: 0.6, flex: 0.48, kind: 'stem', color: '#6b5a3e' });
        b.leavesAlong(cane, { from: 0.15, every: 0.9, angle: [0.7, 1.2], len: [5, 7.5], wid: 0.46, shape: 'ovate', colors: GREEN.bougain, curl: 0.15, vein: '#79a65e' });
        const last = b.end(cane);
        for (let at = last * 0.35; at <= last; at += b.rand(1.1, 1.8)) {
          const sd = b.sign();
          const twig = b.sprout(cane, at, { dir: b.dir(cane, Math.min(at, last - 0.01)) + sd * b.rand(0.5, 1), len: b.rand(5, 11), n: 4, turn: sd * 0.3, w0: 0.6, w1: 0.35, flex: 0.85, kind: 'twig', color: '#6b5a3e' });
          const tl = b.end(twig);
          b.leaves.push({ s: twig, at: tl * 0.5, a: -sd * 0.9, len: b.rand(4.5, 6), wid: 0.46, shape: 'ovate', curl: 0.1, color: b.pick(GREEN.bougain) });
          const clusters = b.int(1, 3);
          for (let k = 0; k < clusters; k++) {
            b.blooms.push({ s: twig, at: tl * (1 - k * 0.3), a: b.rand(-1.2, 1.2), r: b.rand(3.4, 4.6), kind: 'bract', color: b.pick(magenta) });
          }
        }
      }
    },
  },

  /* Heart-shaped, gold-marbled leaves: up a moss pole and spilling over the rim. */
  'money-plant': {
    pot: { top: 30, bottom: 23, h: 26 },
    grow(b) {
      b.path([[0, 0], [0, -62]], { w0: 4.6, w1: 4, flex: 0.04, kind: 'stake', color: '#5a4632' });
      const leaf = (s: number, every: number, len: [number, number]) => {
        const last = b.end(s);
        let side = 1;
        for (let at = last * 0.1; at <= last; at += every * b.rand(0.85, 1.15)) {
          side = -side;
          const a = side * b.rand(0.9, 1.4);
          const l = b.rand(len[0], len[1]) * (1 - 0.35 * (at / last) ** 2);
          const lf: Leaf = { s, at, a, len: l, wid: 0.62, shape: 'heart', curl: b.droop(s, at, a, 0.18), color: b.pick(GREEN.money), vein: '#8cc062' };
          if (b.r() < 0.55) lf.streak = '#e8dc8e';
          b.leaves.push(lf);
        }
      };
      for (let v = 0; v < 2; v++) {
        const pts: Vec[] = [];
        const top = b.rand(62, 70);
        const sd = v === 0 ? -1 : 1;
        for (let y = 0; y <= top; y += 6) pts.push([sd * (2.6 + Math.sin(y * 0.2 + v) * 0.8), -y]);
        const climb = b.path(pts, { w0: 1, w1: 0.6, flex: 0.06, kind: 'stem', color: '#5f8f3c' });
        leaf(climb, 0.95, [9, 13]);
      }
      for (let k = 0; k < 3; k++) {
        const sd = k === 1 ? 1 : -1;
        const x = sd * b.rand(8, 12);
        const trail = b.stem({ from: [x, 0], dir: UP + sd * b.rand(0.9, 1.2), len: b.rand(48, 66), n: 12, turn: sd * b.rand(2.4, 2.9), wobble: 0.05, w0: 0.9, w1: 0.5, flex: 0.5, kind: 'stem', color: '#5f8f3c' });
        leaf(trail, 1.2, [8, 12]);
      }
    },
  },

  /* Upright banded swords with a yellow margin. */
  'snake-plant': {
    pot: { top: 28, bottom: 22, h: 25 },
    grow(b) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5;
        b.stem({
          from: [u * 13 + b.rand(-1, 1), 0],
          dir: UP + u * 0.5 + b.rand(-0.08, 0.08),
          len: b.rand(52, 78) * (1 - Math.abs(u) * 0.55),
          n: 8,
          turn: b.rand(-0.18, 0.18),
          w0: b.rand(7, 9),
          w1: 0.5,
          profile: 'leaf',
          flex: 0.1,
          kind: 'blade',
          color: b.pick(['#36552f', '#3d5c35', '#314e2c']),
          bands: '#6f9358',
          margin: '#d9c76a',
        });
      }
    },
  },

  /* One or two stems of big, glossy, near-black leaves and a red sheath at the tip. */
  'rubber-plant': {
    pot: { top: 32, bottom: 25, h: 28 },
    grow(b) {
      for (let i = 0; i < 2; i++) {
        const sd = i === 0 ? -1 : 1;
        const len = i === 0 ? b.rand(82, 92) : b.rand(52, 62);
        const st = b.stem({ from: [sd * 3, 0], dir: UP + sd * 0.08, len, n: 12, turn: sd * 0.06, wobble: 0.02, w0: 3, w1: 1.8, flex: 0.12, kind: 'trunk', color: '#6f5a45' });
        const last = b.end(st);
        let side = sd;
        for (let at = last * 0.22; at <= last - 0.4; at += b.rand(1.1, 1.4)) {
          side = -side;
          const t = at / last;
          const a = side * (1.25 - t * 0.55 + b.rand(-0.1, 0.1));
          b.leaves.push({ s: st, at, a, len: b.rand(16, 21) * (1 - t * t * 0.35), wid: 0.42, shape: 'elliptic', curl: b.droop(st, at, a, 0.18), color: b.pick(GREEN.rubber), vein: '#a8b49a' });
        }
        b.blooms.push({ s: st, at: last, a: 0, r: 3.4, kind: 'sheath', color: '#c4404e' });
      }
    },
  },

  /* Deep green leaves on arching stalks, white hooded flowers above. */
  'peace-lily': {
    pot: { top: 30, bottom: 23, h: 26 },
    grow(b) {
      const n = 13;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5;
        const sd = Math.sign(u) || 1;
        const pet = b.stem({ from: [u * 6, 0], dir: UP + u * 2.1 + b.rand(-0.1, 0.1), len: b.rand(16, 30) * (1 - Math.abs(u) * 0.3), n: 6, turn: sd * b.rand(0.25, 0.7), w0: 1, w1: 0.7, flex: 0.38, kind: 'twig', color: '#3f6b3a' });
        const e = b.end(pet);
        b.leaves.push({ s: pet, at: e, a: sd * 0.12, len: b.rand(18, 25), wid: 0.33, shape: 'elliptic', curl: b.droop(pet, e, 0, 0.3), color: b.pick(GREEN.lily), vein: '#5f8c58' });
      }
      for (let k = 0; k < 3; k++) {
        const u = k - 1;
        const stalk = b.stem({ from: [u * 3, 0], dir: UP + u * 0.18 + b.rand(-0.05, 0.05), len: b.rand(44, 56), n: 7, turn: u * 0.1, w0: 0.8, w1: 0.6, flex: 0.3, kind: 'twig', color: '#4a7a44' });
        b.blooms.push({ s: stalk, at: b.end(stalk), a: -0.1 * u, r: 6.6, kind: 'spathe', color: '#f7f5ee', eye: '#eadfae' });
      }
    },
  },

  /* A woody shrub with dinner-plate red flowers. */
  hibiscus: {
    pot: { top: 32, bottom: 25, h: 27 },
    grow(b) {
      shrub(b, {
        trunks: 2, trunkLen: [14, 18], branchLen: [26, 32], trunkW: 2.6, trunkSpread: 0.45, depth: 3, kids: [2, 3], spread: 0.6, decay: 0.74,
        wobble: 0.06, turn: 0.25, wood: '#5b4a36', rise: 0.26, flex: 0.12,
        leaves: (b2, s, level) => level > 0 && b2.leavesAlong(s, { from: 0.25, every: 1.25, angle: [0.7, 1.15], len: [7.5, 10.5], wid: 0.44, shape: 'ovate', colors: GREEN.hibiscus, curl: 0.2, vein: '#4f8a46' }),
        tip: (b2, s) => {
          const e = b2.end(s);
          if (b2.r() < 0.3) b2.blooms.push({ s, at: e, a: b2.rand(-0.5, 0.5), r: b2.rand(6.5, 8), kind: 'hibiscus', color: '#e5263d', eye: '#7d0f1e' });
          else if (b2.r() < 0.35) b2.blooms.push({ s, at: e, a: 0, r: 1.7, kind: 'bud', color: '#c0283a' });
          b2.whorl(s, { n: 3, spread: 0.9, len: [6, 8], wid: 0.44, shape: 'ovate', colors: GREEN.hibiscus, vein: '#4f8a46' });
        },
      });
    },
  },

  /* Dense, glossy and crowned with round clusters of tiny flowers. */
  ixora: {
    pot: { top: 28, bottom: 22, h: 24 },
    grow(b) {
      shrub(b, {
        trunks: 3, trunkLen: [10, 14], branchLen: [20, 26], trunkW: 2, trunkSpread: 0.6, depth: 2, kids: [2, 3], spread: 0.55, decay: 0.8,
        wobble: 0.05, turn: 0.2, wood: '#5a4a38', rise: 0.28, flex: 0.14,
        leaves: (b2, s) => b2.leavesAlong(s, { from: 0.25, every: 1.1, pairs: true, angle: [0.65, 1.0], len: [6, 8.5], wid: 0.3, shape: 'elliptic', colors: GREEN.ixora, curl: 0.15, vein: '#4d7d48' }),
        tip: (b2, s) => {
          const e = b2.end(s);
          b2.whorl(s, { n: 4, spread: 1.2, len: [6, 8], wid: 0.3, shape: 'elliptic', colors: GREEN.ixora, vein: '#4d7d48' });
          if (b2.r() < 0.7) b2.blooms.push({ s, at: e, a: 0, r: b2.rand(6, 7.5), kind: 'cluster', color: b2.pick(['#f2542d', '#ff6a3d', '#e8432a']), eye: '#ffd2a8' });
        },
      });
    },
  },

  /* Mogra: a scrambling shrub with small, double white flowers. */
  mogra: {
    pot: { top: 28, bottom: 22, h: 24 },
    grow(b) {
      shrub(b, {
        trunks: 3, trunkLen: [12, 16], branchLen: [22, 28], trunkW: 1.6, trunkSpread: 0.8, depth: 3, kids: [2, 2], spread: 0.7, decay: 0.75,
        wobble: 0.14, turn: 0.4, wood: '#5f5a3a', rise: 0.22, flex: 0.2,
        leaves: (b2, s) => b2.leavesAlong(s, { from: 0.2, every: 1.05, pairs: true, angle: [0.75, 1.15], len: [5, 7.2], wid: 0.5, shape: 'ovate', colors: GREEN.mogra, curl: 0.15, vein: '#6aa055' }),
        tip: (b2, s) => {
          const e = b2.end(s);
          const n = b2.r() < 0.35 ? 0 : b2.int(1, 2);
          for (let k = 0; k < n; k++) b2.blooms.push({ s, at: e - k * 0.4, a: b2.rand(-1, 1), r: b2.rand(2.8, 3.4), kind: 'double', color: '#fbf8f0', eye: '#efe3bf' });
          if (b2.r() < 0.6) b2.blooms.push({ s, at: e * 0.85, a: b2.rand(-1.2, 1.2), r: 1.1, kind: 'bud', color: '#f4ecd9' });
        },
      });
    },
  },

  /* Desert rose: a swollen sculptural trunk, spoon leaves and pink trumpets. */
  adenium: {
    pot: { top: 30, bottom: 24, h: 18 },
    grow(b) {
      const trunk = b.stem({ from: [0, 0], dir: UP, len: 15, n: 6, turn: b.rand(-0.15, 0.15), w0: 19, w1: 7, profile: 'caudex', flex: 0.02, kind: 'trunk', color: '#a8987c' });
      const n = b.int(4, 5);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5;
        const br = b.sprout(trunk, b.end(trunk) - b.rand(0, 1.2), { dir: UP + u * 1.4 + b.rand(-0.1, 0.1), len: b.rand(20, 34), n: 6, turn: u * 0.5, wobble: 0.05, w0: 4.4, w1: 2.6, flex: 0.1, kind: 'trunk', color: '#a8987c' });
        b.whorl(br, { n: b.int(6, 8), spread: 1.5, len: [9, 12], wid: 0.25, shape: 'spoon', colors: GREEN.adenium, curl: 0.25, vein: '#6c9a5c' });
        const e = b.end(br);
        if (b.r() < 0.75) b.blooms.push({ s: br, at: e, a: b.rand(-0.6, 0.6), r: b.rand(5, 6.2), kind: 'trumpet', color: b.pick(['#ff4f86', '#ff3f78', '#ff6b98']), eye: '#fff0f4' });
      }
    },
  },

  /* A small tree with glossy leaves, white blossom and lemons. */
  lemon: {
    pot: { top: 34, bottom: 26, h: 30 },
    grow(b) {
      shrub(b, {
        trunks: 1, trunkLen: [30, 34], branchLen: [21, 24], trunkW: 3.2, trunkSpread: 0, depth: 3, kids: [2, 3], spread: 0.6, decay: 0.7,
        wobble: 0.08, turn: 0.3, wood: '#6e5a44', rise: 0.15, flex: 0.06,
        leaves: (b2, s, level) => level > 0 && b2.leavesAlong(s, { from: 0.2, every: 1.05, angle: [0.7, 1.2], len: [7.5, 10], wid: 0.36, shape: 'elliptic', colors: GREEN.lemon, curl: 0.18, vein: '#5e9455' }),
        tip: (b2, s) => {
          const e = b2.end(s);
          b2.whorl(s, { n: 3, spread: 0.8, len: [7, 9], wid: 0.36, shape: 'elliptic', colors: GREEN.lemon, vein: '#5e9455' });
          if (b2.r() < 0.5) b2.fruits.push({ s, at: e * b2.rand(0.45, 0.8), r: b2.rand(3.6, 4.6), color: b2.pick(['#f2cf3a', '#ecd245', '#cdd655']) });
          else if (b2.r() < 0.4) b2.blooms.push({ s, at: e, a: 0, r: 2.4, kind: 'star', color: '#fbf8f0', eye: '#f1e3a5' });
        },
      });
    },
  },

  /* Kadipatta: a small tree of feathery compound leaves. */
  'curry-leaf': {
    pot: { top: 30, bottom: 23, h: 26 },
    grow(b) {
      const compound = (s: number) => {
        const last = b.end(s);
        let side = b.sign();
        for (let at = last * 0.25; at <= last; at += b.rand(1.2, 1.7)) {
          side = -side;
          const rach = b.sprout(s, at, { dir: b.dir(s, Math.min(at, last - 0.01)) + side * b.rand(0.6, 1.0), len: b.rand(12, 17), n: 6, turn: side * 0.45, w0: 0.45, w1: 0.3, flex: 0.6, kind: 'twig', color: '#5d7a3a' });
          b.leavesAlong(rach, { from: 0.12, every: 0.55, angle: [0.85, 1.05], len: [3.6, 4.8], wid: 0.38, shape: 'elliptic', colors: GREEN.curry, curl: 0.1, young: 0.4 });
        }
      };
      shrub(b, {
        trunks: 1, trunkLen: [26, 32], branchLen: [24, 28], trunkW: 2.6, trunkSpread: 0, depth: 2, kids: [3, 3], spread: 0.5, decay: 0.85,
        wobble: 0.06, turn: 0.2, wood: '#6a5a44', rise: 0.2, flex: 0.08,
        leaves: (_b, s, level) => level > 0 && compound(s),
      });
    },
  },

  /* Tulsi: a small bushy herb with purple-tinged leaves and flower spikes. */
  tulsi: {
    pot: { top: 26, bottom: 20, h: 22 },
    grow(b) {
      shrub(b, {
        trunks: 4, trunkLen: [20, 28], branchLen: [14, 19], trunkW: 1.5, trunkSpread: 0.8, depth: 2, kids: [2, 2], spread: 0.6, decay: 0.7,
        wobble: 0.06, turn: 0.2, wood: '#5b4a5e', rise: 0.35, flex: 0.22,
        leaves: (b2, s) => b2.leavesAlong(s, { from: 0.2, every: 1.2, pairs: true, angle: [0.7, 1.05], len: [4.5, 6.2], wid: 0.48, shape: 'ovate', colors: GREEN.tulsi, curl: 0.12, vein: '#7a8a5a' }),
        tip: (b2, s) => {
          const e = b2.end(s);
          const spike = b2.sprout(s, e, { dir: toward(b2.dir(s, e - 0.01), UP, 0.6), len: b2.rand(8, 13), n: 6, w0: 0.45, w1: 0.3, flex: 0.4, kind: 'twig', color: '#6b4f6e' });
          const sl = b2.end(spike);
          for (let k = 0.8; k <= sl; k += 0.7) {
            for (const sd of [-1, 1]) b2.blooms.push({ s: spike, at: k, a: sd * 1.3, r: b2.rand(0.8, 1.1), kind: 'bud', color: b2.pick(['#9b6fb0', '#b48ac4', '#8a5fa0']) });
          }
        },
      });
    },
  },

  /* A grafted mango sapling: leaves gathered at the tips, one flush of bronze new growth. */
  mango: {
    pot: { top: 34, bottom: 26, h: 30 },
    grow(b) {
      const trunk = b.stem({ from: [0, 0], dir: UP + b.rand(-0.04, 0.04), len: b.rand(48, 54), n: 9, turn: b.rand(-0.12, 0.12), wobble: 0.03, w0: 3, w1: 2, flex: 0.08, kind: 'trunk', color: '#5e4a3a' });
      const tips = [trunk];
      const n = 4;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5;
        const at = b.end(trunk) * (0.55 + 0.4 * (1 - Math.abs(u)) + b.rand(-0.05, 0.05));
        const br = b.sprout(trunk, at, { dir: UP + u * 2 + b.rand(-0.1, 0.1), len: b.rand(18, 28), n: 5, turn: u * 0.5, wobble: 0.05, w0: 1.6, w1: 0.9, flex: 0.22, kind: 'stem', color: '#5e4a3a' });
        tips.push(br);
        if (b.r() < 0.7) tips.push(b.sprout(br, b.end(br) * 0.6, { dir: toward(b.dir(br, 1) - Math.sign(u || 1) * 0.6, UP, 0.3), len: b.rand(10, 15), n: 4, w0: 0.9, w1: 0.6, flex: 0.3, kind: 'stem', color: '#5e4a3a' }));
      }
      const flush = b.int(1, tips.length - 1);
      tips.forEach((s, i) => {
        const young = i === flush;
        const e = b.end(s);
        const leaves = young ? 6 : 8;
        for (let k = 0; k < leaves; k++) {
          // Mango leaves gather at the tip and hang: point them out and let them droop.
          const a = (k / (leaves - 1) - 0.5) * 3.4 + b.rand(-0.15, 0.15);
          const len = young ? b.rand(11, 14) : b.rand(15, 20);
          b.leaves.push({ s, at: e - b.rand(0, 0.5), a, len, wid: 0.15, shape: 'lance', curl: b.droop(s, e, a, young ? 1.1 : 0.8), color: b.pick(young ? ['#9a3f2e', '#a85a33'] : GREEN.mango), vein: young ? undefined : '#5a8a50' });
        }
      });
    },
  },
};

export function grow(art: string, seed: number): Model {
  const sp = SPECIES[art];
  if (!sp) throw new Error(`No plant called ${art}`);
  const b = new Builder(rng(seed));
  sp.grow(b);
  return b.done(sp.pot);
}

export const ARTS = Object.keys(SPECIES);
