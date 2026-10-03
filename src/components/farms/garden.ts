/**
 * The garden: potted plants from the nursery, drawn live on a canvas. Every stem bends toward the
 * light. At night the light is your cursor (or finger); as you scroll, the sun rises along an arc,
 * takes over, and the sky turns from night to the bone of the page.
 */
import {
  bandLines,
  bloomShapes,
  fruitShapes,
  grow,
  heading,
  leafShape,
  leafStreak,
  potShapes,
  stemLine,
  stemShape,
  widthAt,
  type Model,
  type Pen,
} from '../../lib/farms/flora';

interface Slot {
  art: string;
  seed: number;
  /** Across the screen, 0 to 1. */
  x: number;
  /** Height including the pot, as a share of the screen height. */
  h: number;
  /** 0 stands at the back, 1 at the front. */
  row: 0 | 1;
}

// The words sit top left, so the garden rises toward the right, where the sun comes up.
const WIDE: Slot[] = [
  { art: 'bougainvillea', seed: 52, x: 0.04, h: 0.27, row: 0 },
  { art: 'rubber-plant', seed: 84, x: 0.49, h: 0.44, row: 0 },
  { art: 'areca', seed: 12, x: 0.63, h: 0.6, row: 0 },
  { art: 'coral-vine', seed: 31, x: 0.79, h: 0.52, row: 0 },
  { art: 'lady-palm', seed: 23, x: 0.96, h: 0.36, row: 0 },
  { art: 'peace-lily', seed: 95, x: 0.14, h: 0.22, row: 1 },
  { art: 'tulsi', seed: 163, x: 0.25, h: 0.2, row: 1 },
  { art: 'hibiscus', seed: 106, x: 0.37, h: 0.3, row: 1 },
  { art: 'snake-plant', seed: 71, x: 0.55, h: 0.28, row: 1 },
  { art: 'adenium', seed: 139, x: 0.71, h: 0.2, row: 1 },
  { art: 'money-plant', seed: 63, x: 0.87, h: 0.28, row: 1 },
];

const NARROW: Slot[] = [
  { art: 'areca', seed: 12, x: 0.16, h: 0.42, row: 0 },
  { art: 'coral-vine', seed: 31, x: 0.52, h: 0.38, row: 0 },
  { art: 'lady-palm', seed: 23, x: 0.9, h: 0.3, row: 0 },
  { art: 'tulsi', seed: 163, x: 0.0, h: 0.17, row: 1 },
  { art: 'snake-plant', seed: 71, x: 0.33, h: 0.22, row: 1 },
  { art: 'hibiscus', seed: 106, x: 0.7, h: 0.24, row: 1 },
  { art: 'money-plant', seed: 63, x: 1.02, h: 0.2, row: 1 },
];

/** A plant on screen, with the live pose of every stem. */
interface Live {
  m: Model;
  x: number;
  y: number;
  /** Pixels per plant unit. */
  s: number;
  row: 0 | 1;
  lean: number;
  vel: number;
  /** Blooms swell for a moment after watering. */
  perk: number;
  phase: number;
  /** Rest segment vectors and live points, rotations, per stem. */
  dx: Float32Array[];
  dy: Float32Array[];
  X: Float32Array[];
  Y: Float32Array[];
  R: Float32Array[];
  /** Rest heading where each leaf and bloom attaches. */
  leafHead: Float32Array;
  bloomHead: Float32Array;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0}${a < 1 ? ` / ${a.toFixed(3)}` : ''})`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Sky colours through the morning: [day, top, horizon]. */
const SKY: [number, RGB, RGB][] = [
  [0, hex('#0a0a09'), hex('#0c0b0a')],
  [0.28, hex('#100e0d'), hex('#3a1f15')],
  [0.48, hex('#2e2420'), hex('#c9693f')],
  [0.7, hex('#b6ada0'), hex('#f2c39b')],
  [0.86, hex('#e2ddd4'), hex('#f1dcc6')],
  [1, hex('#ece9e3'), hex('#ece9e3')],
];
const skyAt = (d: number): [RGB, RGB] => {
  for (let i = 1; i < SKY.length; i++) {
    if (d <= SKY[i][0]) {
      const [a, ta, ha] = SKY[i - 1];
      const [b, tb, hb] = SKY[i];
      const t = (d - a) / (b - a);
      return [mixRGB(ta, tb, t), mixRGB(ha, hb, t)];
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
};
const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const NIGHT = hex('#0b0d0a');
const EMBER: RGB = [255, 112, 67];
const WARM: RGB = [255, 186, 128];

export interface GardenState {
  /** How far through the morning, 0 (night) to 1 (noon). */
  progress: number;
}

export function createGarden(canvas: HTMLCanvasElement, host: HTMLElement, opts: { reduce: boolean; onTone: (light: boolean) => void }) {
  const ctx = canvas.getContext('2d')!;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let plants: Live[] = [];
  let narrow = false;
  const state: GardenState = { progress: 0 };
  const light = { x: 0, y: 0, tx: 0, ty: 0, active: false, touch: false };
  const ripples: { x: number; y: number; t0: number }[] = [];
  const models = new Map<string, Model>();
  let tone = false;

  const colorCache = new Map<string, string>();
  const rgbCache = new Map<string, RGB>();
  const rgbOf = (c: string) => {
    let v = rgbCache.get(c);
    if (!v) rgbCache.set(c, (v = c.startsWith('#') ? hex(c) : [255, 255, 255]));
    return v;
  };
  /** A plant colour under a light level, quantised so a frame needs only a few dozen fills. */
  const lit = (c: string, level: number) => {
    const q = Math.round(level * 20);
    const key = `${c}|${q}`;
    let v = colorCache.get(key);
    if (!v) {
      if (c.startsWith('rgba')) v = c;
      else v = css(mixRGB(NIGHT, rgbOf(c), q / 20));
      colorCache.set(key, v);
    }
    return v;
  };

  function place() {
    const slots = narrow ? NARROW : WIDE;
    const ground = H * (narrow ? 0.985 : 0.975);
    const tallest = Math.min(H, W * (narrow ? 1.5 : 0.62));
    plants = slots.map((sl) => {
      const key = `${sl.art}:${sl.seed}`;
      let m = models.get(key);
      if (!m) models.set(key, (m = grow(sl.art, sl.seed)));
      const tall = m.pot.h - m.box.y0;
      const s = (sl.h * tallest) / tall;
      const baseY = (sl.row === 0 ? ground - H * 0.035 : ground) - m.pot.h * s;
      const n = m.stems.length;
      const live: Live = {
        m,
        x: sl.x * W,
        y: baseY,
        s,
        row: sl.row,
        lean: 0,
        vel: 0,
        perk: 0,
        phase: sl.seed * 0.37,
        dx: [],
        dy: [],
        X: [],
        Y: [],
        R: [],
        leafHead: new Float32Array(m.leaves.length),
        bloomHead: new Float32Array(m.blooms.length),
      };
      for (let i = 0; i < n; i++) {
        const pts = m.stems[i].pts;
        const k = pts.length;
        const dx = new Float32Array(k);
        const dy = new Float32Array(k);
        for (let j = 1; j < k; j++) {
          dx[j] = pts[j][0] - pts[j - 1][0];
          dy[j] = pts[j][1] - pts[j - 1][1];
        }
        live.dx.push(dx);
        live.dy.push(dy);
        live.X.push(new Float32Array(k));
        live.Y.push(new Float32Array(k));
        live.R.push(new Float32Array(k));
      }
      m.leaves.forEach((l, i) => (live.leafHead[i] = heading(m.stems[l.s].pts, l.at)));
      m.blooms.forEach((b, i) => (live.bloomHead[i] = heading(m.stems[b.s].pts, b.at)));
      return live;
    });
  }

  function resize() {
    W = host.clientWidth;
    H = host.clientHeight;
    narrow = W < 735;
    dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.6 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    place();
    if (!light.active) {
      light.x = light.tx = W * 0.62;
      light.y = light.ty = H * 0.34;
    }
  }

  /** Live position and rotation at a fractional point along a stem. */
  const sample = (p: Live, s: number, at: number): [number, number, number] => {
    const X = p.X[s];
    const Y = p.Y[s];
    const n = X.length;
    const i = Math.max(0, Math.min(n - 1, at));
    const k = Math.min(Math.floor(i), n - 2);
    const f = i - k;
    return [X[k] + (X[k + 1] - X[k]) * f, Y[k] + (Y[k + 1] - Y[k]) * f, p.R[s][Math.min(k + 1, n - 1)]];
  };

  function pose(p: Live, t: number, lx: number, ly: number, sunness: number) {
    const m = p.m;
    // Lean toward the light: its direction from the middle of the plant, measured from straight up.
    const midY = p.y + (m.box.y0 * p.s) / 2;
    const ang = Math.atan2(lx - p.x, midY - ly + H * 0.15);
    const near = Math.exp(-((lx - p.x) ** 2 + (ly - midY) ** 2) / (2 * (Math.max(W, H) * 0.42) ** 2));
    const target = Math.max(-1.25, Math.min(1.25, ang)) * (0.34 + 0.22 * near) * (1 - 0.35 * sunness);
    p.vel += (target - p.lean) * 0.035;
    p.vel *= 0.86;
    p.lean += p.vel;
    p.perk *= 0.96;
    const wind = opts.reduce ? 0 : 1;
    for (let i = 0; i < m.stems.length; i++) {
      const st = m.stems[i];
      const X = p.X[i];
      const Y = p.Y[i];
      const R = p.R[i];
      const dx = p.dx[i];
      const dy = p.dy[i];
      const n = X.length;
      let bx: number;
      let by: number;
      let br: number;
      if (st.parent < 0) {
        bx = st.pts[0][0];
        by = st.pts[0][1];
        br = 0;
      } else {
        [bx, by, br] = sample(p, st.parent, st.at);
      }
      const sway = wind * (Math.sin(t * 0.0011 + p.phase + i * 0.73) * 0.035 + Math.sin(t * 0.0023 + i) * 0.012);
      const bend = (p.lean + sway) * st.flex;
      X[0] = bx;
      Y[0] = by;
      R[0] = br;
      for (let k = 1; k < n; k++) {
        const r = br + bend * Math.pow(k / (n - 1), 1.25);
        const c = Math.cos(r);
        const s = Math.sin(r);
        X[k] = X[k - 1] + dx[k] * c - dy[k] * s;
        Y[k] = Y[k - 1] + dx[k] * s + dy[k] * c;
        R[k] = r;
      }
    }
  }

  /** Paths for one plant, batched by colour and drawn back to front in a few fills. */
  class Batch {
    private order: string[] = [];
    private paths = new Map<string, Path2D>();
    pen(color: string): Pen {
      let p = this.paths.get(color);
      if (!p) {
        p = new Path2D();
        this.paths.set(color, p);
        this.order.push(color);
      }
      return p;
    }
    fill() {
      for (const c of this.order) {
        ctx.fillStyle = c;
        ctx.fill(this.paths.get(c)!);
      }
      this.order = [];
      this.paths.clear();
    }
  }
  const batch = new Batch();

  function drawPlant(p: Live, t: number, lx: number, ly: number, ambient: number, sigma: number) {
    const m = p.m;
    const depth = p.row === 0 ? 0.82 : 1;
    const level = (wx: number, wy: number) => {
      const sx = p.x + wx * p.s;
      const sy = p.y + wy * p.s;
      const d2 = (sx - lx) ** 2 + (sy - ly) ** 2;
      const g = Math.exp(-d2 / (2 * sigma * sigma));
      return Math.min(1, ambient + (1 - ambient) * g * 1.08) * depth;
    };
    ctx.setTransform(dpr * p.s, 0, 0, dpr * p.s, dpr * p.x, dpr * p.y);

    // Pot, lit from its rim.
    const potLevel = level(0, m.pot.h * 0.4);
    potShapes(m.pot, (c, draw) => draw(batch.pen(lit(c, potLevel))));
    batch.fill();

    // Stems. Thin ones are stroked, thick ones filled with a taper.
    for (let i = 0; i < m.stems.length; i++) {
      const st = m.stems[i];
      const X = p.X[i];
      const Y = p.Y[i];
      const n = X.length;
      const mid = Math.floor(n / 2);
      const lv = level(X[mid], Y[mid]);
      if (st.w0 * p.s < 1.6 && !st.margin) {
        ctx.strokeStyle = lit(st.color, lv);
        ctx.lineWidth = Math.max(st.w0, 0.9 / p.s);
        ctx.lineCap = 'round';
        const path = new Path2D();
        stemLine(path, X, Y, n);
        ctx.stroke(path);
        continue;
      }
      if (st.margin) {
        const rim = new Path2D();
        stemShape(rim, X, Y, n, (tt) => widthAt(st, tt));
        ctx.fillStyle = lit(st.margin, lv);
        ctx.fill(rim);
      }
      const body = new Path2D();
      stemShape(body, X, Y, n, (tt) => (st.margin ? Math.max(0, widthAt(st, tt) - 1.4) : widthAt(st, tt)));
      ctx.fillStyle = lit(st.color, lv);
      ctx.fill(body);
      if (st.bands) {
        const pts = Array.from(X, (x, k) => [x, Y[k]] as [number, number]);
        const band = new Path2D();
        bandLines(band, { pts, w0: st.w0, w1: st.w1, profile: st.profile });
        ctx.strokeStyle = lit(st.bands, lv);
        ctx.lineWidth = 0.7;
        ctx.stroke(band);
      }
    }

    // Leaves, with a flutter that grows toward the tips.
    const flutter = opts.reduce ? 0 : 1;
    for (let i = 0; i < m.leaves.length; i++) {
      const l = m.leaves[i];
      const [x, y, r] = sample(p, l.s, l.at);
      const a = p.leafHead[i] + r + l.a + flutter * Math.sin(t * 0.0024 + i * 1.7 + p.phase) * 0.06;
      const lv = level(x + Math.cos(a) * l.len * 0.5, y + Math.sin(a) * l.len * 0.5);
      leafShape(batch.pen(lit(l.color, lv)), x, y, a, l.len, l.wid, l.shape, l.curl);
      if (l.streak && lv > 0.25) leafStreak(batch.pen(lit(l.streak, lv * 0.92)), x, y, a, l.len, l.wid, l.curl, l.a > 0 ? 1 : -1);
    }
    batch.fill();

    // Blooms and fruit.
    const swell = 1 + p.perk * 0.35;
    for (let i = 0; i < m.blooms.length; i++) {
      const b = m.blooms[i];
      const [x, y, r] = sample(p, b.s, b.at);
      const lv = level(x, y);
      bloomShapes({ ...b, r: b.r * swell }, x, y, p.bloomHead[i] + r + b.a, (c, draw) => draw(batch.pen(lit(c, lv))), i);
    }
    for (const f of m.fruits) {
      const [x, y] = sample(p, f.s, f.at);
      const lv = level(x, y);
      fruitShapes(f, x, y, (c, draw) => draw(batch.pen(lit(c, lv))));
    }
    batch.fill();
  }

  function draw(t: number) {
    const p = state.progress;
    // The sun rises along the arc from the left horizon to the top.
    const sunT = smooth(0.08, 0.96, p);
    const day = smooth(0.08, 1, p);
    const sunness = smooth(0.04, 0.3, p);
    // East is on the right: the sun climbs from the right horizon to overhead.
    const rx = W * (narrow ? 0.4 : 0.42);
    const ry = H * (narrow ? 0.45 : 0.7);
    const cx = W * 0.5;
    const cy = H * 0.99;
    const arcAt = (f: number) => 0.1 - (Math.PI / 2 + 0.1) * f;
    const sa = arcAt(sunT);
    const sunX = cx + Math.cos(sa) * rx;
    const sunY = cy + Math.sin(sa) * ry;

    if (!light.active) {
      light.tx = W * (0.56 + Math.sin(t * 0.00019) * 0.3);
      light.ty = H * (0.3 + Math.cos(t * 0.00015) * 0.1);
    }
    const e = light.touch ? 0.16 : 0.08;
    light.x += (light.tx - light.x) * e;
    light.y += (light.ty - light.y) * e;
    const lx = light.x + (sunX - light.x) * sunness;
    const ly = light.y + (sunY - light.y) * sunness;

    // Sky.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [top, horizon] = skyAt(day);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, css(top));
    sky.addColorStop(1, css(horizon));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const isLight = luminance(top) > 0.5;
    if (isLight !== tone) {
      tone = isLight;
      opts.onTone(isLight);
    }

    // Your light, at night: a warm glow that fades as the sun comes up.
    const night = 1 - sunness;
    if (night > 0.01) {
      const R = Math.max(W, H) * 0.5;
      const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, R);
      g.addColorStop(0, css(WARM, 0.32 * night));
      g.addColorStop(0.32, css(EMBER, 0.1 * night));
      g.addColorStop(1, css(EMBER, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // The sun's path, ticked like a dial, and the sun itself.
    if (sunness > 0.01) {
      const ticks = 44;
      for (let k = 0; k <= ticks; k++) {
        const f = k / ticks;
        const a = arcAt(f);
        const on = f <= sunT;
        // Ticks stand off the ellipse along its normal.
        const nx = Math.cos(a) / rx;
        const ny = Math.sin(a) / ry;
        const nl = Math.hypot(nx, ny);
        const px = cx + Math.cos(a) * rx + (nx / nl) * 34;
        const py = cy + Math.sin(a) * ry + (ny / nl) * 34;
        const len = k % 11 === 0 ? 12 : 5;
        ctx.strokeStyle = on ? css(EMBER, 0.9 * sunness) : css(isLight ? [10, 10, 9] : [236, 233, 227], 0.18 * sunness);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + (nx / nl) * len, py + (ny / nl) * len);
        ctx.stroke();
      }
      const glowR = Math.min(W, H) * 0.42;
      const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      g.addColorStop(0, css([255, 214, 170], 0.75 * sunness));
      g.addColorStop(0.12, css(EMBER, 0.35 * sunness));
      g.addColorStop(1, css(EMBER, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = css(mixRGB(EMBER, [255, 228, 196], day * 0.6), sunness);
      ctx.beginPath();
      ctx.arc(sunX, sunY, narrow ? 15 : 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadows under the pots, once there is daylight to cast them.
    if (day > 0.4) {
      ctx.fillStyle = css([10, 10, 9], 0.12 * smooth(0.4, 1, day));
      for (const pl of plants) {
        const w = pl.m.pot.bottom * pl.s * 0.7;
        ctx.beginPath();
        ctx.ellipse(pl.x + (pl.x - sunX) * 0.02, pl.y + pl.m.pot.h * pl.s, w, w * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The plants. Watering ripples spread along the bench.
    while (ripples.length && t - ripples[0].t0 > 1600) ripples.shift();
    for (const rp of ripples) {
      const age = (t - rp.t0) / 1600;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = css(isLight ? [10, 10, 9] : WARM, 0.35 * (1 - age));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, 10 + age * W * 0.16, 4 + age * W * 0.04, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const sigma = Math.max(W, H) * (narrow ? 0.36 : 0.3);
    const ambient = 0.06 + 0.94 * day;
    for (const pl of plants) pose(pl, t, lx, ly, sunness);
    for (const pl of plants) drawPlant(pl, t, lx, ly, ambient, sigma);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The time, riding with the sun: 05:45 to 12:30.
    if (sunness > 0.01) {
      const minutes = 5 * 60 + 45 + Math.round(sunT * (6 * 60 + 45));
      const label = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      ctx.font = `400 ${narrow ? 11 : 12}px Lexend, system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = css(isLight ? [10, 10, 9] : [236, 233, 227], 0.75 * sunness);
      ctx.fillText(label, Math.min(sunX - (narrow ? 24 : 34), W - 16), Math.min(sunY, H - 16));
    }

    // A small bright core where your light is.
    if (night > 0.05 && light.active) {
      ctx.fillStyle = css([255, 236, 214], 0.85 * night);
      ctx.shadowColor = css(EMBER, 0.9);
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /** Watering: plants near the drop shake, perk up and their flowers swell. */
  function water(clientX: number, clientY: number) {
    const r = host.getBoundingClientRect();
    const x = clientX - r.left;
    ripples.push({ x, y: H * 0.97, t0: performance.now() });
    if (ripples.length > 4) ripples.shift();
    for (const p of plants) {
      const d = Math.abs(p.x - x) / W;
      const k = Math.exp(-(d * d) / 0.02);
      if (k < 0.05) continue;
      p.vel += (p.x > x ? 1 : -1) * 0.06 * k;
      p.perk = Math.min(1, p.perk + k);
    }
  }

  const follow = (clientX: number, clientY: number) => {
    const r = host.getBoundingClientRect();
    light.active = true;
    light.tx = clientX - r.left;
    light.ty = clientY - r.top;
  };

  let running = false;
  let raf = 0;
  const loop = (t: number) => {
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running || opts.reduce) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  resize();
  draw(0);
  new ResizeObserver(() => {
    resize();
    if (!running) draw(performance.now());
  }).observe(host);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(host);
  document.fonts?.ready.then(() => !running && draw(performance.now()));

  host.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    light.touch = false;
    follow(e.clientX, e.clientY);
  });
  host.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') light.active = false;
  });
  host.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && !(e.target as HTMLElement).closest('a, button')) water(e.clientX, e.clientY);
  });
  let release = 0;
  host.addEventListener(
    'touchstart',
    (e) => {
      const t0 = e.touches[0];
      clearTimeout(release);
      light.touch = true;
      follow(t0.clientX, t0.clientY);
      if (!(e.target as HTMLElement).closest('a, button')) water(t0.clientX, t0.clientY);
    },
    { passive: true },
  );
  host.addEventListener('touchmove', (e) => follow(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  const lift = () => {
    clearTimeout(release);
    release = window.setTimeout(() => (light.active = false), 900);
  };
  host.addEventListener('touchend', lift, { passive: true });
  host.addEventListener('touchcancel', lift, { passive: true });

  return {
    state,
    /** Redraw now, for when the page scrolls while the loop is paused. */
    draw: () => draw(performance.now()),
  };
}
