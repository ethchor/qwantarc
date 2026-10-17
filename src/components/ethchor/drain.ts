/**
 * The contact's flow field: the hero's lines again, calm now, all drawn toward one point (the send
 * button) in a slow spiral, the way water finds a drain. Everything on the page ends up here.
 */
import { createNoise } from './noise';

export interface DrainOptions {
  canvas: HTMLCanvasElement;
  /** The point the lines run to, in CSS pixels within the canvas. */
  target: () => { x: number; y: number };
  colors: { a: string; b: string };
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function createDrain(o: DrainOptions) {
  const a = o.canvas.getContext('2d')!;
  const noise = createNoise(19);
  let w = 1;
  let h = 1;
  let dpr = 1;
  let seeds = new Float32Array(0);
  let warm = new Uint8Array(0);

  function resize() {
    const nw = o.canvas.clientWidth || 1;
    const nh = o.canvas.clientHeight || 1;
    const nd = Math.min(window.devicePixelRatio || 1, 1.5);
    if (seeds.length && nw === w && nh === h && nd === dpr) return;
    w = nw;
    h = nh;
    dpr = nd;
    o.canvas.width = Math.round(w * dpr);
    o.canvas.height = Math.round(h * dpr);
    const gap = w < 700 ? 40 : 50;
    const cols = Math.ceil(w / gap) + 1;
    const rows = Math.ceil(h / gap) + 1;
    const list: number[] = [];
    let s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) list.push((i - 0.5 + r()) * gap, (j - 0.5 + r()) * gap);
    seeds = new Float32Array(list);
    warm = new Uint8Array(list.length / 2).map(() => (r() < 0.22 ? 1 : 0));
  }

  function frame(time: number) {
    const t = o.target();
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    a.clearRect(0, 0, w, h);
    a.lineCap = 'round';
    a.lineWidth = 1;
    const paths = [new Path2D(), new Path2D()];
    const step = 7;
    for (let k = 0; k < seeds.length / 2; k++) {
      let x = seeds[k * 2];
      let y = seeds[k * 2 + 1];
      const p = paths[warm[k]];
      p.moveTo(x, y);
      for (let n = 0; n < 26; n++) {
        const dx = t.x - x;
        const dy = t.y - y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 26) break;
        // Toward the point, turned aside far out (the spiral) and wavering a little with time.
        const turn = 0.75 * smooth(d / 700) + 0.35 * noise.n3(x * 0.003, y * 0.003, time * 0.05);
        const c = Math.cos(turn);
        const sn = Math.sin(turn);
        const ux = dx / d;
        const uy = dy / d;
        x += (ux * c - uy * sn) * step;
        y += (ux * sn + uy * c) * step;
        p.lineTo(x, y);
      }
    }
    a.strokeStyle = o.colors.a;
    a.globalAlpha = 0.55;
    a.stroke(paths[0]);
    a.strokeStyle = o.colors.b;
    a.globalAlpha = 0.4;
    a.stroke(paths[1]);
    a.globalAlpha = 1;
  }

  resize();
  return { frame, resize };
}

export type Drain = ReturnType<typeof createDrain>;
