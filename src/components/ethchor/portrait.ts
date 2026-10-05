/**
 * The particle portrait: a halftone of Vimu, made of a few thousand dots. They arrive along the
 * Qwantarc arcs, settle into a face, part around your cursor (or finger) and glow ember where it
 * passes, ripple when you tap, and drift away as you scroll on.
 */
import { PORTRAIT } from '../../lib/ethchor/portrait';

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export interface PortraitState {
  /** 0 assembled, 1 dissolved: driven by scroll. */
  scatter: number;
}

export function createPortrait(canvas: HTMLCanvasElement, host: HTMLElement, opts: { reduce: boolean }) {
  const ctx = canvas.getContext('2d')!;
  const lum = decode(PORTRAIT.lum);
  const warm = decode(PORTRAIT.warm);
  const state: PortraitState = { scatter: 0 };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let n = 0;
  // Per dot: home, live position and velocity, radius, warmth, intro start and delay, drift direction.
  let hx = new Float32Array(0);
  let hy = new Float32Array(0);
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let rad = new Float32Array(0);
  let wm = new Float32Array(0);
  let sx = new Float32Array(0);
  let sy = new Float32Array(0);
  let delay = new Float32Array(0);
  let drift = new Float32Array(0);
  let cell = 6;
  let face = { x: 0, y: 0 };

  const pointer = { x: -9999, y: -9999, active: false };
  const ripples: { x: number; y: number; t0: number }[] = [];
  let intro = opts.reduce ? 1 : 0;
  let introStart = 0;

  function layout() {
    W = host.clientWidth;
    H = host.clientHeight;
    const narrow = W < 735;
    dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.75 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // The portrait sits on the right on wide screens and at the top on phones.
    let boxW: number;
    let boxH: number;
    let left: number;
    let top: number;
    if (narrow) {
      boxW = Math.min(W * 1.02, H * 0.55 * 0.75);
      boxH = boxW / 0.75;
      left = (W - boxW) / 2;
      top = Math.max(48, H * 0.06);
    } else {
      boxH = Math.min(H * 0.96, W * 0.5 / 0.75);
      boxW = boxH * 0.75;
      left = W - boxW - W * 0.04;
      top = H - boxH;
    }
    // Keep dots at least 5 pixels apart.
    const step = Math.max(1, Math.ceil(5.2 / (boxW / PORTRAIT.cols)));
    cell = (boxW / PORTRAIT.cols) * step;
    const cols = Math.floor(PORTRAIT.cols / step);
    const rows = Math.floor(PORTRAIT.rows / step);

    const list: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = lum[r * step * PORTRAIT.cols + c * step];
        if (v) list.push(r * cols + c);
      }
    }
    n = list.length;
    hx = new Float32Array(n);
    hy = new Float32Array(n);
    px = new Float32Array(n);
    py = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    rad = new Float32Array(n);
    wm = new Float32Array(n);
    sx = new Float32Array(n);
    sy = new Float32Array(n);
    delay = new Float32Array(n);
    drift = new Float32Array(n);
    face = { x: left + boxW * 0.5, y: top + boxH * 0.36 };

    // Where the dots start: on concentric arcs rising from below, the Qwantarc field.
    const acx = W / 2;
    const acy = H * 1.18;
    const arcs = 14;
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    list.forEach((k, i) => {
      const r = Math.floor(k / cols);
      const c = k % cols;
      const src = r * step * PORTRAIT.cols + c * step;
      const t = lum[src] / 255;
      hx[i] = left + (c + 0.5) * cell;
      hy[i] = top + (r + 0.5) * cell;
      rad[i] = cell * 0.5 * (0.14 + 0.86 * Math.pow(t, 0.85)) * 0.94;
      wm[i] = warm[src] / 255;
      const ring = i % arcs;
      const R = Math.hypot(W, H) * (0.32 + (ring / arcs) * 0.62);
      const a = Math.PI + 0.25 + rnd() * (Math.PI - 0.5);
      sx[i] = acx + Math.cos(a) * R;
      sy[i] = acy + Math.sin(a) * R;
      // The face arrives first, the shoulders last.
      delay[i] = Math.min(1, Math.hypot(hx[i] - face.x, hy[i] - face.y) / (boxH * 0.8)) * 0.42 + rnd() * 0.08;
      drift[i] = rnd() * Math.PI * 2;
      const p = intro >= 1 ? 1 : 0;
      px[i] = p ? hx[i] : sx[i];
      py[i] = p ? hy[i] : sy[i];
    });
  }

  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const EMBER = 'rgb(255 112 67)';
  const COOL = 'rgb(236 233 227 / 0.9)';
  const WARM = 'rgb(246 214 190)';

  function draw(t: number) {
    if (!introStart) introStart = t;
    if (intro < 1 && !opts.reduce) intro = Math.min(1, (t - introStart) / 2600);
    while (ripples.length && t - ripples[0].t0 > 1600) ripples.shift();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const reach = W < 735 ? 70 : 96;
    const reach2 = reach * reach;
    const glow = reach * 0.9;
    const cool = new Path2D();
    const warmPath = new Path2D();
    const lit = new Path2D();
    const scatter = state.scatter;
    const fade = 1 - scatter;

    for (let i = 0; i < n; i++) {
      let tx = hx[i];
      let ty = hy[i];
      if (intro < 1) {
        const k = ease(Math.max(0, Math.min(1, (intro - delay[i]) / 0.5)));
        tx = sx[i] + (hx[i] - sx[i]) * k;
        ty = sy[i] + (hy[i] - sy[i]) * k;
      }
      // Drift apart, and up, as the page scrolls on.
      if (scatter > 0) {
        const d = scatter * scatter * (120 + (i % 7) * 30);
        tx += Math.cos(drift[i]) * d;
        ty += Math.sin(drift[i]) * d - scatter * 140;
      }
      let e = 0;
      if (pointer.active) {
        const dx = tx - pointer.x;
        const dy = ty - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach2) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / reach) ** 2 * 26;
          tx += (dx / d) * push;
          ty += (dy / d) * push;
        }
        e = Math.exp(-d2 / (2 * glow * glow));
      }
      for (const rp of ripples) {
        const age = (t - rp.t0) / 1600;
        const ring = age * Math.max(W, H) * 0.7;
        const dx = tx - rp.x;
        const dy = ty - rp.y;
        const d = Math.hypot(dx, dy) || 1;
        const push = 18 * (1 - age) * Math.exp(-((d - ring) ** 2) / 1800);
        tx += (dx / d) * push;
        ty += (dy / d) * push;
      }
      if (opts.reduce) {
        px[i] = tx;
        py[i] = ty;
      } else {
        vx[i] = (vx[i] + (tx - px[i]) * 0.1) * 0.8;
        vy[i] = (vy[i] + (ty - py[i]) * 0.1) * 0.8;
        px[i] += vx[i];
        py[i] += vy[i];
      }
      const r = rad[i] * (1 + e * 0.55) * (intro < 1 ? 0.6 + 0.4 * ease(Math.max(0, (intro - delay[i]) / 0.5)) : 1);
      if (r < 0.25) continue;
      const path = e > 0.42 ? lit : wm[i] > 0.38 ? warmPath : cool;
      path.moveTo(px[i] + r, py[i]);
      path.arc(px[i], py[i], r, 0, Math.PI * 2);
    }

    ctx.globalAlpha = fade;
    ctx.fillStyle = COOL;
    ctx.fill(cool);
    ctx.fillStyle = WARM;
    ctx.fill(warmPath);
    ctx.fillStyle = EMBER;
    ctx.fill(lit);
    ctx.globalAlpha = 1;
  }

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

  layout();
  draw(performance.now());
  new ResizeObserver(() => {
    layout();
    if (!running) draw(performance.now());
  }).observe(host);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(host);

  const at = (clientX: number, clientY: number) => {
    const r = host.getBoundingClientRect();
    pointer.x = clientX - r.left;
    pointer.y = clientY - r.top;
    pointer.active = true;
  };
  const ripple = (clientX: number, clientY: number) => {
    if (opts.reduce) return;
    const r = host.getBoundingClientRect();
    ripples.push({ x: clientX - r.left, y: clientY - r.top, t0: performance.now() });
    if (ripples.length > 4) ripples.shift();
  };
  host.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && at(e.clientX, e.clientY));
  host.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && (pointer.active = false));
  host.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && !(e.target as HTMLElement).closest('a, button')) ripple(e.clientX, e.clientY);
  });
  let lift = 0;
  host.addEventListener(
    'touchstart',
    (e) => {
      clearTimeout(lift);
      const t0 = e.touches[0];
      at(t0.clientX, t0.clientY);
      if (!(e.target as HTMLElement).closest('a, button')) ripple(t0.clientX, t0.clientY);
    },
    { passive: true },
  );
  host.addEventListener('touchmove', (e) => at(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  host.addEventListener(
    'touchend',
    () => {
      clearTimeout(lift);
      lift = window.setTimeout(() => (pointer.active = false), 500);
    },
    { passive: true },
  );

  return { state, redraw: () => draw(performance.now()) };
}
