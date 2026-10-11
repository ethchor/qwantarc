/**
 * The bedside monitor in the hero: a sweeping ECG trace drawn the way patient monitors draw it, a
 * write head moving left to right over the previous pass with a short gap erased ahead of it, and
 * readouts for heart rate and SpO₂. The heart rate is the page's own, so it races when you do. Its
 * colours come from the stylesheet (--monitor for the trace, --text for the write head).
 */
import type { Heart } from './heart';

/** A hex colour custom property as 'r g b', so the canvas can add alpha to it. */
function rgbOf(css: CSSStyleDeclaration, name: string, fallback: string) {
  const value = css.getPropertyValue(name).trim();
  let hex = (/^#([0-9a-f]{3}){1,2}$/i.test(value) ? value : fallback).slice(1);
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function createMonitor(root: HTMLElement, heart: Heart, opts: { reduce: boolean }) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-ecg]')!;
  const hr = root.querySelector<HTMLElement>('[data-hr]')!;
  const spo2 = root.querySelector<HTMLElement>('[data-spo2]')!;
  const ctx = canvas.getContext('2d')!;
  const css = getComputedStyle(root);
  const TRACE = rgbOf(css, '--monitor', '#3dff9a');
  const HEAD = rgbOf(css, '--text', '#f5f2ec');
  const glow = parseFloat(css.getPropertyValue('--trace-glow'));
  const GLOW = Number.isFinite(glow) ? glow : 8;
  /** Pixels of trace per second, like a monitor's sweep speed. */
  const SPEED = 96;
  const GAP = 16;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let buf = new Float32Array(0);
  let head = 0;
  let carry = 0;
  let oxygen = 98;
  let beats = 0;

  function size() {
    W = Math.max(1, Math.round(canvas.clientWidth));
    H = Math.max(1, Math.round(canvas.clientHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const old = buf;
    buf = new Float32Array(W).fill(Number.NaN);
    buf.set(old.subarray(0, Math.min(old.length, W)));
    head %= W;
    if (opts.reduce) {
      // A still trace: a few beats across the strip.
      for (let x = 0; x < W; x++) buf[x] = heart.wave(((x / SPEED) * (62 / 60) + 0.1) % 1);
    }
  }

  const yOf = (v: number) => H * 0.66 - v * H * 0.52;

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // The monitor's grid, barely there.
    ctx.strokeStyle = `rgb(${TRACE} / 0.08)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < W; x += 12) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0.5; y < H; y += 12) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    ctx.beginPath();
    let pen = false;
    for (let x = 0; x < W; x++) {
      const v = buf[x];
      const ahead = (x - head + W) % W;
      if (Number.isNaN(v) || (!opts.reduce && ahead < GAP)) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(x, yOf(v));
      else ctx.moveTo(x, yOf(v));
      pen = true;
    }
    ctx.strokeStyle = `rgb(${TRACE})`;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgb(${TRACE} / 0.85)`;
    ctx.shadowBlur = GLOW;
    ctx.stroke();

    if (!opts.reduce) {
      const x = (head - 1 + W) % W;
      const v = buf[x];
      if (!Number.isNaN(v)) {
        ctx.fillStyle = `rgb(${HEAD})`;
        ctx.beginPath();
        ctx.arc(x, yOf(v), 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  const off = heart.onBeat((bpm) => {
    hr.textContent = String(Math.round(bpm));
    root.classList.remove('is-beat');
    void root.offsetWidth;
    root.classList.add('is-beat');
    // SpO₂ wanders a point or so, as it does.
    if (++beats % 4 === 0) {
      oxygen = Math.max(96, Math.min(99, oxygen + (Math.random() < 0.5 ? -1 : 1)));
      spo2.textContent = String(oxygen);
    }
  });

  size();
  draw();
  new ResizeObserver(() => {
    size();
    draw();
  }).observe(canvas);

  return {
    /** Write this frame's stretch of trace; call after heart.tick. */
    frame(dt: number) {
      if (opts.reduce || !W) return;
      carry += dt * SPEED;
      const count = Math.floor(carry);
      carry -= count;
      const p0 = heart.prevPhase;
      const p1 = heart.phase < p0 ? heart.phase + 1 : heart.phase;
      for (let i = 1; i <= count; i++) {
        const p = p0 + ((p1 - p0) * i) / count;
        buf[head] = heart.wave(((p % 1) + 1) % 1);
        head = (head + 1) % W;
      }
      if (count) draw();
    },
    destroy: off,
  };
}
