/**
 * The hero: a flow field, printed in two risograph inks. Hundreds of streamlines follow a field
 * that starts out turbulent, the way a hard problem looks, and calms into a steady downward flow as
 * the page scrolls. The cursor is a stone in the stream (the lines part around it) and a click
 * leaves a whirl that slowly dies away.
 *
 * The red thread runs from a fixed loose end at the foot of the hero up and out of the top: a line
 * bent into loops and wanders by noise, tangled while the flow is turbulent and drawn straight as it
 * calms, when it stands as the line the rest of the page continues (see thread.ts). Every point of
 * it is worked out directly from where it is along the thread and the time, never integrated step
 * by step, so it writhes slowly instead of whipping about. The cursor pushes it aside and a whirl
 * twists it.
 *
 * The lines are drawn in two inks on two canvases, and the thread on a third, so the lines can fade
 * away behind the hero's copy while the thread only lightens.
 */
import { createNoise } from './noise';

export interface FlowOptions {
  blue: HTMLCanvasElement;
  red: HTMLCanvasElement;
  thread: HTMLCanvasElement;
  /** Where the hero receives the pointer. */
  surface: HTMLElement;
  /** The thread's loose end, in CSS pixels within the canvas. */
  end: (w: number, h: number) => { x: number; y: number };
  reduce: boolean;
  /** The two inks of the lines, and the thread's. */
  colors: { a: string; b: string; thread: string };
  onTouch?: () => void;
}

const TAU = Math.PI * 2;
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function createFlow(o: FlowOptions) {
  const blue = o.blue.getContext('2d')!;
  const red = o.red.getContext('2d')!;
  const line = o.thread.getContext('2d')!;
  const noise = createNoise(11);

  let w = 1;
  let h = 1;
  let dpr = 1;
  let E = { x: 0, y: 0 };
  let seeds = new Float32Array(0);
  let reds = new Uint8Array(0);
  /** Seeds drawn, after the device has shown how fast it is. */
  let drawn = 0;
  let steps = 22;
  let stepLen = 6;

  function resize() {
    const nw = o.blue.clientWidth || 1;
    const nh = o.blue.clientHeight || 1;
    // Three full-screen canvases redrawn every frame: thin, grainy lines don't need every device pixel.
    const nd = Math.min(window.devicePixelRatio || 1, 1.5);
    // A phone's toolbar coming and going resizes the window but not the hero: keep the seeds.
    if (seeds.length && nw === w && nh === h && nd === dpr) {
      E = o.end(w, h);
      return;
    }
    w = nw;
    h = nh;
    dpr = nd;
    for (const c of [o.blue, o.red, o.thread]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    E = o.end(w, h);
    // A jittered grid of seeds, shuffled so a slow device can draw any prefix and still cover it all.
    const gap = w < 700 ? 34 : 42;
    stepLen = w < 700 ? 5 : 6;
    steps = w < 700 ? 20 : 22;
    const cols = Math.ceil(w / gap) + 2;
    const rows = Math.ceil(h / gap) + 2;
    const list: number[] = [];
    let s = 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) list.push((i - 1 + r()) * gap, (j - 1 + r()) * gap);
    const n = list.length / 2;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const k = Math.floor(r() * (i + 1));
      [order[i], order[k]] = [order[k], order[i]];
    }
    seeds = new Float32Array(n * 2);
    reds = new Uint8Array(n);
    order.forEach((from, to) => {
      seeds[to * 2] = list[from * 2];
      seeds[to * 2 + 1] = list[from * 2 + 1];
      reds[to] = r() < 0.2 ? 1 : 0;
    });
    drawn = drawn ? Math.min(drawn, n) : n;
  }

  /* ---------- The field ---------- */
  let progress = 0;
  const pointer = { x: -1e4, y: -1e4, on: 0, target: 0 };
  const whirls: { x: number; y: number; t0: number; dir: number }[] = [];
  let time = 0;
  const v = { x: 0, y: 0 };

  function field(x: number, y: number) {
    const e = smooth(progress);
    // Turbulent: the direction wanders with the noise.
    const a = noise.n3(x * 0.0024, y * 0.0024, time * 0.045) * TAU * 1.15;
    // Calm: straight down, with a slow meander.
    const l = Math.PI / 2 + 0.2 * Math.sin(x * 0.006 + time * 0.3) + 0.12 * noise.n2(x * 0.003, y * 0.003 - time * 0.05);
    let vx = Math.cos(a) * (1 - e) + Math.cos(l) * e;
    let vy = Math.sin(a) * (1 - e) + Math.sin(l) * e;
    // The cursor: lines swing round it, as round a stone.
    if (pointer.on > 0.01) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const d = Math.hypot(dx, dy) || 1;
      const R = 150;
      if (d < R) {
        // Fading out toward the middle too, where the direction would flip from step to step.
        const k = (1 - d / R) ** 2 * smooth(d / 24) * pointer.on * 2.2;
        vx += (-dy / d + (dx / d) * 0.7) * k;
        vy += (dx / d + (dy / d) * 0.7) * k;
      }
    }
    // Whirls left by clicks, dying away.
    for (const q of whirls) {
      const age = time - q.t0;
      if (age > 3.2) continue;
      const dx = x - q.x;
      const dy = y - q.y;
      const d = Math.hypot(dx, dy) || 1;
      const R = 240;
      if (d < R) {
        const k = (1 - age / 3.2) ** 2 * (1 - d / R) * smooth(d / 30) * 3.2 * q.dir;
        vx += (-dy / d) * k;
        vy += (dx / d) * k;
      }
    }
    const len = Math.hypot(vx, vy) || 1;
    v.x = vx / len;
    v.y = vy / len;
  }

  /* ---------- The thread ---------- */
  /** Points along the thread, from the loose end. */
  const THREAD = 640;
  const pts = new Float32Array((THREAD + 1) * 2);
  /** Works out the first n + 1 points of the thread. */
  function tangle(n: number) {
    const e = smooth(progress);
    const loose = 1 - e;
    const phone = w < 700;
    // Up off the top of the hero, to the left of the loose end while it's tangled, straight over it once calm.
    const far = { x: w * (phone ? 0.5 : 0.42) + (E.x - w * (phone ? 0.5 : 0.42)) * e, y: -30 };
    // The line it bends around: a curve that leaves the loose end straight up.
    const cx = E.x;
    const cy = E.y - h * 0.55;
    const span = Math.hypot(far.x - E.x, far.y - E.y) * 1.15;
    const A = Math.min(54, w * 0.04);
    const wander = Math.min(160, w * 0.11);
    for (let i = 0; i <= n; i++) {
      const u = i / THREAD;
      const a = 1 - u;
      const bx = a * a * E.x + 2 * a * u * cx + u * u * far.x;
      const by = a * a * E.y + 2 * a * u * cy + u * u * far.y;
      const dx = 2 * a * (cx - E.x) + 2 * u * (far.x - cx);
      const dy = 2 * a * (cy - E.y) + 2 * u * (far.y - cy);
      const dl = Math.hypot(dx, dy) || 1;
      const tx = dx / dl;
      const ty = dy / dl;
      // Quiet at both ends, so it leaves the loose end cleanly and goes off the top.
      const env = smooth(u / 0.14) * smooth((1 - u) / 0.12) * loose;
      const lat = wander * noise.n2(u * 2.4 + 3.1, time * 0.042) * env;
      // Loops: an offset turning along the thread, with a radius that rises and falls, and a
      // second, faster turn on top so the loops come out uneven, as in a real tangle.
      const R = A * env * Math.max(0, 0.42 + 0.9 * noise.n2(u * 3.1 + 11.7, time * 0.06));
      const th = ((u * span) / 104) * Math.PI * 2 + 1.6 * Math.PI * noise.n2(u * 1.7 + 21.3, time * 0.036);
      const R2 = R * 0.38;
      const th2 = th * 2.2 + 0.7;
      const ox = Math.cos(th) * R - R + Math.cos(th2) * R2 - R2 * Math.cos(0.7);
      const oy = Math.sin(th) * R + Math.sin(th2) * R2 - R2 * Math.sin(0.7);
      let x = bx - ty * lat + ox * tx - oy * ty;
      let y = by + tx * lat + ox * ty + oy * tx;
      // The cursor pushes it aside; whirls twist it round.
      if (pointer.on > 0.01) {
        const px = x - pointer.x;
        const py = y - pointer.y;
        const d = Math.hypot(px, py) || 1;
        if (d < 150) {
          const k = (1 - d / 150) ** 2 * 46 * pointer.on;
          x += (px / d) * k;
          y += (py / d) * k;
        }
      }
      for (const q of whirls) {
        const age = time - q.t0;
        if (age > 3.2) continue;
        const px = x - q.x;
        const py = y - q.y;
        const d = Math.hypot(px, py);
        if (d < 240) {
          const turn = (1 - age / 3.2) ** 2 * (1 - d / 240) * 1.4 * q.dir;
          const c = Math.cos(turn);
          const sn = Math.sin(turn);
          x = q.x + px * c - py * sn;
          y = q.y + px * sn + py * c;
        }
      }
      pts[i * 2] = x;
      pts[i * 2 + 1] = y;
    }
  }

  /* ---------- Drawing ---------- */
  let grow = o.reduce ? 1 : 0;

  function draw() {
    for (const c of [blue, red, line]) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      c.lineCap = 'round';
      c.lineJoin = 'round';
    }
    const n = Math.max(0, Math.floor(steps * grow));
    blue.beginPath();
    red.beginPath();
    for (let s = 0; s < drawn; s++) {
      let x = seeds[s * 2];
      let y = seeds[s * 2 + 1];
      const ctx = reds[s] ? red : blue;
      ctx.moveTo(x, y);
      for (let k = 0; k < n; k++) {
        field(x, y);
        x += v.x * stepLen;
        y += v.y * stepLen;
        ctx.lineTo(x, y);
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) break;
      }
    }
    // As the flow calms the lines thin out.
    const thin = 1 - 0.5 * smooth(progress);
    blue.globalAlpha = thin;
    blue.strokeStyle = o.colors.a;
    blue.lineWidth = 1;
    blue.stroke();
    red.globalAlpha = thin;
    red.strokeStyle = o.colors.b;
    red.lineWidth = 1;
    red.stroke();

    // The thread.
    const count = Math.max(2, Math.round(THREAD * grow));
    tangle(count);
    line.beginPath();
    line.moveTo(pts[0], pts[1]);
    for (let i = 1; i <= count; i++) line.lineTo(pts[i * 2], pts[i * 2 + 1]);
    line.strokeStyle = o.colors.thread;
    line.lineWidth = w < 700 ? 2.2 : 2.6;
    line.stroke();
  }

  /* ---------- The pointer ---------- */
  let touched = false;
  const local = (e: PointerEvent) => {
    const b = o.blue.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };
  const busy = (el: EventTarget | null) => el instanceof Element && !!el.closest('a, button, input, textarea, label');
  if (!o.reduce) {
    o.surface.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      [pointer.x, pointer.y] = local(e);
      pointer.target = 1;
    });
    o.surface.addEventListener('pointerleave', () => (pointer.target = 0));
    o.surface.addEventListener('pointerdown', (e) => {
      if (busy(e.target)) return;
      const [x, y] = local(e);
      whirls.push({ x, y, t0: time, dir: whirls.length % 2 ? -1 : 1 });
      if (whirls.length > 4) whirls.shift();
      if (!touched) {
        touched = true;
        o.onTouch?.();
      }
    });
  }

  resize();

  let frames = 0;
  let slow = 0;
  return {
    /** Advance and draw. In reduced motion, call it once (and on resize). */
    frame(t: number, dt: number) {
      time = t;
      pointer.on += (pointer.target - pointer.on) * (1 - Math.exp(-dt * 5));
      const t0 = performance.now();
      draw();
      // A struggling device draws fewer lines rather than dropping frames.
      if (++frames > 30 && performance.now() - t0 > 9) slow++;
      if (slow > 20 && drawn > seeds.length / 4) {
        drawn = Math.round(drawn * 0.75);
        slow = 0;
      }
    },
    resize,
    /** How calm the flow is, 0 (turbulent) to 1 (a steady downward flow). */
    setProgress(p: number) {
      progress = Math.max(0, Math.min(1, p));
    },
    /** How much of each line is printed, 0 to 1: the opening grows them. */
    setGrow(g: number) {
      grow = Math.max(0, Math.min(1, g));
    },
    /** The loose end, in CSS pixels within the canvas. */
    end() {
      return E;
    },
  };
}

export type Flow = ReturnType<typeof createFlow>;
