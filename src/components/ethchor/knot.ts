/**
 * The hero's red thread: one thread wound into a tangle, the way a hard problem looks before anyone
 * has found where it starts. Grab it with the mouse and pull, or tap to pluck it. As the page
 * scrolls, it unwinds from its loose end into a straight line. The loose end never moves: it is
 * where the thread down the rest of the page begins (see thread.ts).
 *
 * The thread is a chain of points with a little physics: each point springs back to where the
 * tangle (or the straightened line) wants it, neighbours keep their distance while you pull, and
 * a pluck sends a wobble along it. It is drawn as screen-space fat lines with a soft glow.
 */
import { AdditiveBlending, Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

export interface KnotLayout {
  /** The tangle's centre and radius, in CSS pixels within the canvas. */
  cx: number;
  cy: number;
  r: number;
  /** The loose end, in CSS pixels within the canvas. */
  ex: number;
  ey: number;
  /** Where on the tangle the loose end leaves it: an angle, 0 to the right, -π/2 straight down. */
  exit?: number;
}

export interface KnotOptions {
  canvas: HTMLCanvasElement;
  /** Where the hero receives the pointer (the canvas sits under the copy). */
  surface: HTMLElement;
  layout: (w: number, h: number) => KnotLayout;
  /** The thread, and its far side inside the tangle. */
  color: string;
  shade: string;
  reduce: boolean;
  /** Called the first time someone grabs or plucks it. */
  onTouch?: () => void;
}

/** Points wound into the tangle, and in the loose end. */
const BALL = 1100;
const TAIL = 150;
const N = BALL + TAIL;
/** Points at the end of the winding that settle onto the exit, where the loose end leaves. */
const EXIT = 90;
const FOV = 32;
const CAM_Z = 8;
const TAN = Math.tan((FOV * Math.PI) / 360);

type Rand = () => number;
function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A ball of yarn on the unit sphere: the thread loops around an axis that keeps wandering, so each
 * loop crosses the last at a new angle, and its depth breathes so the ball has volume.
 */
function wind(r: Rand): Float32Array {
  const out = new Float32Array(BALL * 3);
  let a = [0.3, 0.9, 0.3];
  let drift = [0, 0, 0];
  let u = [1, 0, 0];
  let theta = 0;
  const norm = (v: number[]) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  a = norm(a);
  for (let i = 0; i < BALL; i++) {
    // The axis wanders with some persistence, so the loops sweep around rather than jitter.
    drift = drift.map((d) => d * 0.96 + (r() - 0.5) * 0.02);
    a = norm([a[0] + drift[0], a[1] + drift[1], a[2] + drift[2]]);
    // Carry the in-plane direction along with the axis (no flips), then complete the frame.
    const dot = u[0] * a[0] + u[1] * a[1] + u[2] * a[2];
    u = norm([u[0] - a[0] * dot, u[1] - a[1] * dot, u[2] - a[2] * dot]);
    const v = [a[1] * u[2] - a[2] * u[1], a[2] * u[0] - a[0] * u[2], a[0] * u[1] - a[1] * u[0]];
    theta += (Math.PI * 2) / (54 + 10 * Math.sin(i * 0.011));
    const rad = 0.74 + 0.16 * Math.sin(i * 0.037 + 1.3) + 0.1 * Math.sin(i * 0.0071);
    const c = Math.cos(theta) * rad;
    const s = Math.sin(theta) * rad;
    out[i * 3] = u[0] * c + v[0] * s;
    out[i * 3 + 1] = u[1] * c + v[1] * s;
    out[i * 3 + 2] = u[2] * c + v[2] * s;
  }
  return out;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function createKnot(opts: KnotOptions) {
  const { canvas, surface } = opts;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.z = CAM_Z;

  const unit = wind(rng(11));
  const rest = new Float32Array(N * 3);
  const pos = new Float32Array(N * 3);
  const prev = new Float32Array(N * 3);
  const restLen = new Float32Array(N - 1);
  const seg = new Float32Array((N - 1) * 6);
  const col = new Float32Array((N - 1) * 6);
  const pointCol = new Float32Array(N * 3);

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(seg);
  geometry.setColors(col);
  const main = new LineSegments2(geometry, new LineMaterial({ vertexColors: true, linewidth: 2.4, transparent: true }));
  const glow = new LineSegments2(
    geometry,
    new LineMaterial({ vertexColors: true, linewidth: 10, transparent: true, opacity: 0.13, blending: AdditiveBlending, depthWrite: false }),
  );
  main.frustumCulled = false;
  glow.frustumCulled = false;
  scene.add(glow, main);

  const front = new Color(opts.color);
  const back = new Color(opts.shade);

  /* ---------- Layout: CSS pixels to world units ---------- */
  let w = 1;
  let h = 1;
  let F = 1;
  let L: KnotLayout = { cx: 0, cy: 0, r: 1, ex: 0, ey: 0 };
  const world = { cx: 0, cy: 0, r: 1, ex: 0, ey: 0, top: 0 };
  const toWorldX = (px: number, d = CAM_Z) => ((px - w / 2) * d) / F;
  const toWorldY = (py: number, d = CAM_Z) => (-(py - h / 2) * d) / F;

  function resize() {
    w = canvas.clientWidth || 1;
    h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    F = h / 2 / TAN;
    L = opts.layout(w, h);
    world.cx = toWorldX(L.cx);
    world.cy = toWorldY(L.cy);
    world.r = (L.r * CAM_Z) / F;
    world.ex = toWorldX(L.ex);
    world.ey = toWorldY(L.ey);
    world.top = world.cy + world.r * 1.05;
    const thin = w < 700;
    (main.material as LineMaterial).linewidth = thin ? 2 : 2.4;
    (glow.material as LineMaterial).linewidth = thin ? 7 : 10;
  }

  /* ---------- Where every point wants to be ---------- */
  let progress = 0;
  let spin = 0;

  function computeRest(t: number) {
    const P = progress;
    // The tangle turns slowly, and spins off thread as it unwinds.
    const ay = t * 0.16 + P * 7 + spin;
    const ax = 0.42 + Math.sin(t * 0.21) * 0.12;
    const cy = Math.cos(ay);
    const sy = Math.sin(ay);
    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    const R = world.r * (1 - 0.35 * smooth(P));
    // Where the loose end leaves the tangle (low by default, a little to the front). It doesn't
    // turn with the ball, so the end always hangs clear instead of skewering it.
    const ea = L.exit ?? -1.45;
    const xx = world.cx + Math.cos(ea) * R * 0.95;
    const xy = world.cy + Math.sin(ea) * R * 0.95;
    const xz = R * 0.3;
    const settle = BALL - EXIT;
    for (let i = 0; i < BALL; i++) {
      const x = unit[i * 3];
      const y = unit[i * 3 + 1];
      const z = unit[i * 3 + 2];
      // Ry then Rx.
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;
      let px = world.cx + x1 * R;
      let py = world.cy + y2 * R;
      let pz = z2 * R;
      if (i > settle) {
        // The last stretch of the winding makes its way to the exit.
        const b = smooth((i - settle) / EXIT);
        px += (xx - px) * b;
        py += (xy - py) * b;
        pz += (xz - pz) * b;
      }
      rest[i * 3] = px;
      rest[i * 3 + 1] = py;
      rest[i * 3 + 2] = pz;
    }
    // The loose end hangs from the exit down to its fixed point.
    const bx = xx;
    const by = xy;
    const bz = xz;
    const span = Math.hypot(world.ex - bx, world.ey - by);
    // Out of the tangle in the direction it leaves, then down onto the fixed point.
    const c1x = bx + Math.cos(ea) * span * 0.3;
    const c1y = by + Math.sin(ea) * span * 0.3;
    const c2x = world.ex;
    const c2y = world.ey + span * 0.4;
    for (let k = 1; k <= TAIL; k++) {
      const s = k / TAIL;
      const m = 1 - s;
      const i = (BALL - 1 + k) * 3;
      rest[i] = m * m * m * bx + 3 * m * m * s * c1x + 3 * m * s * s * c2x + s * s * s * world.ex;
      rest[i + 1] = m * m * m * by + 3 * m * m * s * c1y + 3 * m * s * s * c2y + s * s * s * world.ey;
      rest[i + 2] = bz * m * m;
    }
    // Unwinding: from the loose end inward, each point leaves the tangle for its place on the line.
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const p = smooth((u - (1 - P * 1.3)) / 0.3);
      if (p <= 0) continue;
      const lx = world.ex;
      const ly = world.top + (world.ey - world.top) * u;
      rest[i * 3] += (lx - rest[i * 3]) * p;
      rest[i * 3 + 1] += (ly - rest[i * 3 + 1]) * p;
      rest[i * 3 + 2] += (0 - rest[i * 3 + 2]) * p;
    }
    for (let i = 0; i < N - 1; i++) {
      const j = i * 3;
      restLen[i] = Math.hypot(rest[j + 3] - rest[j], rest[j + 4] - rest[j + 1], rest[j + 5] - rest[j + 2]);
    }
  }

  /* ---------- The pointer: hover to nudge, grab to pull, tap to pluck ---------- */
  const pointer = { x: -1e4, y: -1e4, over: false };
  let grabbed = -1;
  let lastGrab = -1;
  let grabZ = 0;
  let relax = 0;
  let downAt = { x: 0, y: 0, t: 0 };
  let touched = false;

  const screenOf = (i: number) => {
    const d = CAM_Z - pos[i * 3 + 2];
    return [w / 2 + (pos[i * 3] * F) / d, h / 2 - (pos[i * 3 + 1] * F) / d];
  };
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };
  function nearest(px: number, py: number, within: number) {
    let best = -1;
    let bd = within * within;
    for (let i = 0; i < N; i += 2) {
      const [sx, sy] = screenOf(i);
      const d = (sx - px) ** 2 + (sy - py) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }
  const busy = (el: EventTarget | null) => el instanceof Element && !!el.closest('a, button, input, textarea, label, [data-noknot]');

  function pluck(px: number, py: number, strength = 1) {
    const reach = 90;
    for (let i = 0; i < N; i++) {
      const [sx, sy] = screenOf(i);
      const d = Math.hypot(sx - px, sy - py);
      if (d > reach) continue;
      const k = (1 - d / reach) ** 2 * 0.06 * strength * (world.r / 1.2);
      const dx = (sx - px) / (d || 1);
      const dy = (sy - py) / (d || 1);
      prev[i * 3] -= dx * k;
      prev[i * 3 + 1] += dy * k;
      prev[i * 3 + 2] -= k * 1.4;
    }
    lastGrab = -1;
    relax = 1.2;
  }
  const first = () => {
    if (touched) return;
    touched = true;
    opts.onTouch?.();
  };

  if (!opts.reduce) {
    surface.addEventListener('pointermove', (e) => {
      const [x, y] = local(e);
      pointer.x = x;
      pointer.y = y;
      pointer.over = true;
      if (e.pointerType !== 'mouse' || grabbed >= 0) return;
      surface.style.cursor = !busy(e.target) && nearest(x, y, 26) >= 0 ? 'grab' : '';
    });
    surface.addEventListener('pointerleave', () => {
      pointer.over = false;
      if (grabbed < 0) surface.style.cursor = '';
    });
    surface.addEventListener('pointerdown', (e) => {
      if (busy(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const [x, y] = local(e);
      downAt = { x, y, t: performance.now() };
      // Pulling needs a mouse: on touch, a drag has to stay a scroll.
      if (e.pointerType !== 'mouse') return;
      const i = nearest(x, y, 26);
      if (i < 0) return;
      e.preventDefault();
      grabbed = i;
      // Whatever you grab comes toward you, so the strand is in front of the tangle.
      grabZ = Math.max(pos[i * 3 + 2], world.r * 0.55);
      surface.setPointerCapture(e.pointerId);
      surface.style.cursor = 'grabbing';
      first();
    });
    const release = (e: PointerEvent) => {
      const [x, y] = local(e);
      const quick = performance.now() - downAt.t < 280 && Math.hypot(x - downAt.x, y - downAt.y) < 6;
      if (grabbed >= 0) {
        lastGrab = grabbed;
        grabbed = -1;
        relax = 1.4;
        surface.style.cursor = 'grab';
        if (surface.hasPointerCapture(e.pointerId)) surface.releasePointerCapture(e.pointerId);
      }
      if (quick && !busy(e.target) && nearest(x, y, 70) >= 0) {
        pluck(x, y);
        first();
      }
    };
    surface.addEventListener('pointerup', release);
    surface.addEventListener('pointercancel', () => {
      grabbed = -1;
      surface.style.cursor = '';
    });
  }

  /* ---------- The frame ---------- */
  let drawn = opts.reduce ? N - 1 : 0;
  let started = false;

  function step(t: number, dt: number) {
    computeRest(t);
    if (!started) {
      pos.set(rest);
      prev.set(rest);
      started = true;
    }
    const k = 1 - Math.exp(-dt * 7);
    const damp = Math.pow(0.9, dt * 60);
    const nudge = pointer.over && grabbed < 0;
    // Near a pull the thread lets go of the tangle, so a strand comes out with it; the hold
    // returns gradually after release.
    const g = grabbed >= 0 ? grabbed : lastGrab;
    const loosen = grabbed >= 0 ? 1 : Math.max(0, relax / 1.4);
    const rx = toWorldX(pointer.x);
    const ry = toWorldY(pointer.y);
    const reach = (70 * CAM_Z) / F;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const hold = g >= 0 && loosen > 0 ? k * (1 - loosen * (1 - smooth(Math.abs(i - g) / 110)) * 0.96) : k;
      for (let a = 0; a < 3; a++) {
        const p = pos[j + a];
        const v = (p - prev[j + a]) * damp;
        prev[j + a] = p;
        pos[j + a] = p + v + (rest[j + a] - p) * hold;
      }
      if (nudge) {
        // The thread leans away from the cursor, as if breathed on.
        const dx = pos[j] - rx;
        const dy = pos[j + 1] - ry;
        const d = Math.hypot(dx, dy);
        if (d < reach && d > 1e-5) {
          const f = (1 - d / reach) ** 2 * reach * 0.06;
          pos[j] += (dx / d) * f;
          pos[j + 1] += (dy / d) * f;
        }
      }
    }
    if (grabbed >= 0) {
      const d = CAM_Z - grabZ;
      const j = grabbed * 3;
      pos[j] = toWorldX(pointer.x, d);
      pos[j + 1] = toWorldY(pointer.y, d);
      pos[j + 2] = grabZ;
    }
    // While pulled (and for a moment after), neighbours keep their distance, so a pull draws a
    // strand out of the tangle instead of stretching one point.
    if (grabbed >= 0 || relax > 0) {
      relax = Math.max(0, relax - dt);
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < N - 1; i++) {
          const j = i * 3;
          const dx = pos[j + 3] - pos[j];
          const dy = pos[j + 4] - pos[j + 1];
          const dz = pos[j + 5] - pos[j + 2];
          const d = Math.hypot(dx, dy, dz) || 1e-6;
          const diff = (d - restLen[i]) / d;
          if (diff <= 0) continue;
          const wa = i === grabbed ? 0 : i + 1 === grabbed ? 1 : 0.5;
          const wb = 1 - wa;
          pos[j] += dx * diff * wa;
          pos[j + 1] += dy * diff * wa;
          pos[j + 2] += dz * diff * wa;
          pos[j + 3] -= dx * diff * wb;
          pos[j + 4] -= dy * diff * wb;
          pos[j + 5] -= dz * diff * wb;
        }
      }
    }
  }

  function upload() {
    const P = progress;
    const R = world.r || 1;
    for (let i = 0; i < N; i++) {
      // Inside the tangle the far side is darker, which is most of what reads as depth; anything
      // pulled out of it, or already on the line, is fully lit.
      const j = i * 3;
      const z = pos[j + 2];
      const depth = smooth((z / R + 1) / 2);
      const u = i / (N - 1);
      const onLine = smooth((u - (1 - P * 1.3)) / 0.3);
      const out = smooth((Math.hypot(pos[j] - world.cx, pos[j + 1] - world.cy, z) / R - 1.05) / 0.25);
      const m = Math.max(depth, onLine, out, i >= BALL ? 0.85 : 0);
      pointCol[j] = back.r + (front.r - back.r) * m;
      pointCol[j + 1] = back.g + (front.g - back.g) * m;
      pointCol[j + 2] = back.b + (front.b - back.b) * m;
    }
    // Segments at least ~1.5px long: where points crowd together (the straightened line), tiny
    // segments would turn their quads every which way and the line would look frayed.
    const limit = Math.max(0, Math.min(N - 1, Math.round(drawn)));
    const min = ((1.5 * CAM_Z) / F) ** 2;
    let m = 0;
    let a = 0;
    for (let i = 1; i <= limit; i++) {
      const dx = pos[i * 3] - pos[a * 3];
      const dy = pos[i * 3 + 1] - pos[a * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[a * 3 + 2];
      if (i < limit && dx * dx + dy * dy + dz * dz < min) continue;
      seg.set(pos.subarray(a * 3, a * 3 + 3), m * 6);
      seg.set(pos.subarray(i * 3, i * 3 + 3), m * 6 + 3);
      col.set(pointCol.subarray(a * 3, a * 3 + 3), m * 6);
      col.set(pointCol.subarray(i * 3, i * 3 + 3), m * 6 + 3);
      m++;
      a = i;
    }
    const start = geometry.attributes.instanceStart as unknown as { data: { needsUpdate: boolean } };
    const colors = geometry.attributes.instanceColorStart as unknown as { data: { needsUpdate: boolean } };
    start.data.needsUpdate = true;
    colors.data.needsUpdate = true;
    geometry.instanceCount = m;
  }

  resize();

  return {
    /** Advance and draw. In reduced motion, call it once (and on resize) with dt = 0. */
    frame(t: number, dt: number) {
      // Up to 1/12 s a step: stable, and a slow device still settles in real time.
      step(t, Math.min(dt, 1 / 12) || 1 / 60);
      upload();
      renderer.render(scene, camera);
    },
    resize,
    /** How far the thread has unwound, 0 (tangled) to 1 (a straight line). */
    setProgress(p: number) {
      progress = Math.max(0, Math.min(1, p));
    },
    /** Spin it a little, as when the page is flicked past. */
    kick(v: number) {
      spin += v;
    },
    /** How much of the thread is drawn, 0 to 1: the opening winds it in. */
    setDrawn(f: number) {
      drawn = f * (N - 1);
    },
    pluckAt(x: number, y: number) {
      pluck(x, y, 0.7);
    },
    /** The loose end, in CSS pixels within the canvas. */
    end() {
      return { x: L.ex, y: L.ey };
    },
  };
}

export type Knot = ReturnType<typeof createKnot>;
