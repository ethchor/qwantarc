/**
 * The forms the portfolio's particles take, one per section. Each is a cloud of N points in
 * normalised units (about -1 to 1), with a tone per point (0 to 1) that picks its colour from the
 * section's palette, and its width and height so it can be fitted to the space the page leaves for it.
 */
export interface Shape {
  pos: Float32Array;
  tone: Float32Array;
  w: number;
  h: number;
}

export type Rand = () => number;

/** A small seeded random, so every visit sees the same forms. */
export function rng(seed: number): Rand {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const gauss = (r: Rand) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());

function make(n: number) {
  return { pos: new Float32Array(n * 3), tone: new Float32Array(n) };
}

/** One heartbeat as an ECG trace, with the QRS spike at phase 0.5. */
export function ecgWave(phase: number): number {
  const g = (mu: number, s: number, a: number) => a * Math.exp(-((phase - mu) ** 2) / (2 * s * s));
  return g(0.32, 0.028, 0.12) + g(0.465, 0.009, -0.14) + g(0.5, 0.011, 1) + g(0.535, 0.01, -0.26) + g(0.72, 0.045, 0.22);
}

/** Spread points evenly along a polyline, so the steep spikes get their share. */
function alongPolyline(path: [number, number][], n: number, r: Rand, jitter: number, out: ReturnType<typeof make>) {
  const len = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = len[len.length - 1];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const at = ((k + r()) / n) * total;
    while (j < len.length - 1 && len[j] < at) j++;
    const f = (at - len[j - 1]) / (len[j] - len[j - 1] || 1);
    const x = path[j - 1][0] + (path[j][0] - path[j - 1][0]) * f;
    const y = path[j - 1][1] + (path[j][1] - path[j - 1][1]) * f;
    out.pos.set([x + gauss(r) * jitter, y + gauss(r) * jitter, gauss(r) * jitter * 2], k * 3);
    out.tone[k] = (x + 1) / 2;
  }
}

/** The intro: a monitor's trace, three beats across the screen. */
export function ecgLine(n: number, r: Rand): Shape {
  const out = make(n);
  const path: [number, number][] = [];
  for (let i = 0; i <= 900; i++) {
    const x = (i / 900) * 2 - 1;
    path.push([x, ecgWave((((x + 1) / 2) * 3 + 0.1) % 1) * 0.16]);
  }
  alongPolyline(path, n, r, 0.004, out);
  return { ...out, w: 2, h: 0.4 };
}

/** A sea of points: a rolling surface tilted toward you (the shader rolls it, and calms it). */
export function wave(n: number, r: Rand): Shape {
  const out = make(n);
  const W = 1.35;
  const D = 0.95;
  const ROWS = 26;
  // Particles sit on evenly spaced lines across the sea, so it reads as a surface of ridgelines
  // rather than a cloud. Each picks its line at random, so any prefix of them (when a slow device
  // draws fewer) still covers the whole sea.
  for (let k = 0; k < n; k++) {
    const x = (r() * 2 - 1) * W;
    const z = ((Math.floor(r() * ROWS) + 0.5) / ROWS) * 2 * D - D;
    out.pos.set([x, Math.sin(x * 2.2) * 0.05 + Math.cos(z * 3.1 + x) * 0.04, z], k * 3);
    out.tone[k] = (z / D + 1) / 2;
  }
  // Seen from above at an angle, it is wide and not very tall.
  return { ...out, w: 2.7, h: 1.6 };
}

/** Taubin's heart surface, (x² + 9/4 y² + z² − 1)³ − x² z³ − 9/80 y² z³ = 0, mostly as a shell. */
export function heart(n: number, r: Rand): Shape {
  const out = make(n);
  let k = 0;
  while (k < n) {
    const x = (r() * 2 - 1) * 1.2;
    const y = (r() * 2 - 1) * 0.8;
    const z = r() * 2.5 - 1.25;
    const a = x * x + 2.25 * y * y + z * z - 1;
    const f = a * a * a - x * x * z * z * z - 0.1125 * y * y * z * z * z;
    if (f > 0 || (f < -0.04 && r() > 0.05)) continue;
    // The surface's z is up; on screen that is y, and its y is depth.
    out.pos.set([x * 0.86, z * 0.86 + 0.05, y * 0.86], k * 3);
    out.tone[k] = Math.min(1, Math.max(0, (z + 1.1) / 2.3));
    k++;
  }
  return { ...out, w: 2.05, h: 2.05 };
}

export interface Network extends Shape {
  nodes: [number, number, number][];
  edges: [number, number][];
}

/** Systems talking to each other: seven nodes, and the links between them traced in points. */
export function network(n: number, r: Rand, count = 7): Network {
  const out = make(n);
  const nodes: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2;
    const rad = Math.sqrt(1 - y * y);
    const a = i * golden + 0.6;
    const R = 1.05 + (r() - 0.5) * 0.15;
    nodes.push([Math.cos(a) * rad * R, y * R * 0.9, Math.sin(a) * rad * R]);
  }
  // Each node links to its two nearest, and the chain closes, so the graph is one piece.
  const key = new Set<string>();
  const edges: [number, number][] = [];
  const add = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || key.has(k)) return;
    key.add(k);
    edges.push([a, b]);
  };
  nodes.forEach((p, i) => {
    nodes
      .map((q, j) => ({ j, d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach((e) => add(i, e.j));
    add(i, (i + 1) % count);
  });
  for (let k = 0; k < n; k++) {
    if (k % 10 < 3) {
      const i = k % count;
      const p = nodes[i];
      const s = 0.075;
      out.pos.set([p[0] + gauss(r) * s, p[1] + gauss(r) * s, p[2] + gauss(r) * s], k * 3);
      out.tone[k] = i / (count - 1);
    } else {
      const [a, b] = edges[k % edges.length];
      const t = r();
      const p = nodes[a];
      const q = nodes[b];
      // Links bow outward a little, like cables between racks.
      const bow = Math.sin(t * Math.PI) * 0.12;
      const mx = (p[0] + q[0]) / 2;
      const my = (p[1] + q[1]) / 2;
      const mz = (p[2] + q[2]) / 2;
      const ml = Math.hypot(mx, my, mz) || 1;
      out.pos.set(
        [
          p[0] + (q[0] - p[0]) * t + (mx / ml) * bow + gauss(r) * 0.01,
          p[1] + (q[1] - p[1]) * t + (my / ml) * bow + gauss(r) * 0.01,
          p[2] + (q[2] - p[2]) * t + (mz / ml) * bow + gauss(r) * 0.01,
        ],
        k * 3,
      );
      out.tone[k] = ((a + (b - a) * t) / (count - 1)) * 0.92 + 0.04;
    }
  }
  return { ...out, w: 2.4, h: 2.2, nodes, edges };
}

/** A double helix with its rungs. */
export function helix(n: number, r: Rand): Shape {
  const out = make(n);
  const H = 1.15;
  const R = 0.4;
  const turns = 2.1;
  const strand = (y: number, side: number) => {
    const a = (y / H) * Math.PI * turns + side * Math.PI;
    return [Math.cos(a) * R, y, Math.sin(a) * R];
  };
  const rungs = 22;
  for (let k = 0; k < n; k++) {
    const u = r();
    if (u < 0.78) {
      const side = u < 0.39 ? 0 : 1;
      const y = (r() * 2 - 1) * H;
      const p = strand(y, side);
      out.pos.set([p[0] + gauss(r) * 0.018, p[1] + gauss(r) * 0.01, p[2] + gauss(r) * 0.018], k * 3);
      out.tone[k] = side ? 0.08 : 0.92;
    } else {
      const j = Math.floor(r() * rungs);
      const y = -H + ((j + 0.5) * 2 * H) / rungs;
      const a = strand(y, 0);
      const b = strand(y, 1);
      const t = r();
      out.pos.set([a[0] + (b[0] - a[0]) * t, y + gauss(r) * 0.006, a[2] + (b[2] - a[2]) * t], k * 3);
      out.tone[k] = 0.5;
    }
  }
  return { ...out, w: 1, h: 2.35 };
}

/** A potted sprout for the side quest: terracotta pot, a stem and three leaves. */
export function plant(n: number, r: Rand): Shape {
  const out = make(n);
  type Leaf = { x: number; y: number; a: number; len: number; wid: number };
  const leaves: Leaf[] = [
    { x: -0.02, y: 0.12, a: (152 * Math.PI) / 180, len: 0.78, wid: 0.44 },
    { x: 0.04, y: 0.24, a: (28 * Math.PI) / 180, len: 0.84, wid: 0.46 },
    { x: 0.05, y: 0.4, a: (86 * Math.PI) / 180, len: 0.42, wid: 0.22 },
  ];
  let k = 0;
  while (k < n) {
    const u = r();
    if (u < 0.24) {
      // The pot: a tapered body under a rim.
      const y = -1 + r() * 0.62;
      const top = y > -0.48;
      const half = top ? 0.47 : 0.3 + ((y + 1) / 0.52) * 0.12;
      const x = (r() * 2 - 1) * half;
      const zr = Math.sqrt(Math.max(0, 1 - (x / half) ** 2)) * half * 0.55;
      out.pos.set([x, top ? -0.48 + r() * 0.1 : y, (r() * 2 - 1) * zr], k * 3);
      out.tone[k] = top ? 1 : 0.88;
    } else if (u < 0.31) {
      // The stem, a gentle curve up from the soil.
      const t = r();
      const x = 2 * (1 - t) * t * -0.14 + t * t * 0.05;
      const y = -0.4 + t * 0.8;
      out.pos.set([x + gauss(r) * 0.012, y, gauss(r) * 0.012], k * 3);
      out.tone[k] = 0.5;
    } else {
      // A leaf: points inside a pointed oval along its midrib, curled a little.
      const lf = leaves[u < 0.62 ? 0 : u < 0.93 ? 1 : 2];
      const t = r();
      const half = (lf.wid / 2) * Math.pow(Math.sin(Math.PI * t), 0.85);
      const v = (r() * 2 - 1) * half;
      const along = t * lf.len;
      const x = lf.x + Math.cos(lf.a) * along - Math.sin(lf.a) * v;
      const y = lf.y + Math.sin(lf.a) * along + Math.cos(lf.a) * v;
      const z = (v / (lf.wid / 2 || 1)) ** 2 * 0.1 - t * 0.06 + gauss(r) * 0.008;
      out.pos.set([x, y, z], k * 3);
      out.tone[k] = 0.05 + t * 0.22;
    }
    k++;
  }
  return { ...out, w: 1.75, h: 2.1 };
}

/** A word drawn in points: render it once on a canvas and keep the inked pixels. */
export function word(n: number, r: Rand, text: string, font: string): Shape {
  const out = make(n);
  const cv = document.createElement('canvas');
  const H = 220;
  const ctx = cv.getContext('2d')!;
  ctx.font = `800 ${H}px ${font}`;
  const wPx = Math.ceil(ctx.measureText(text).width) + 40;
  cv.width = wPx;
  cv.height = Math.round(H * 1.3);
  ctx.font = `800 ${H}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 20, cv.height / 2);
  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const inked: number[] = [];
  for (let y = 0; y < cv.height; y += 2) {
    for (let x = 0; x < cv.width; x += 2) if (data[(y * cv.width + x) * 4 + 3] > 140) inked.push(x, y);
  }
  const scale = 2.4 / cv.width;
  const count = inked.length / 2;
  for (let k = 0; k < n; k++) {
    const i = Math.floor(r() * count) * 2;
    const x = (inked[i] + r() * 2 - cv.width / 2) * scale;
    const y = -(inked[i + 1] + r() * 2 - cv.height / 2) * scale;
    out.pos.set([x, y, gauss(r) * 0.03], k * 3);
    out.tone[k] = (x + 1.2) / 2.4;
  }
  return { ...out, w: 2.4, h: cv.height * scale };
}
