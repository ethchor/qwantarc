/**
 * Static art made at build time: backgrounds the red thread sketches over in the method, as SVG paths
 * on a 100 by 100 box. A topographic map of the problem, and streamlines speeding up through a
 * narrowing channel. (The system's Bauhaus shapes are drawn in the page itself.)
 */
import { contours, createNoise } from '../../components/ethchor/noise';

const f1 = (n: number) => n.toFixed(1);
const toPath = (line: number[], scale: number, close = false) => {
  let d = `M${f1(line[0] * scale)} ${f1(line[1] * scale)}`;
  for (let i = 2; i < line.length; i += 2) d += `L${f1(line[i] * scale)} ${f1(line[i + 1] * scale)}`;
  return close ? d + 'Z' : d;
};

/** Contour rings round a hill with a lumpy top, like the shape of a problem on a survey map. */
export function topoRings(): { d: string; index: boolean }[] {
  const noise = createNoise(5);
  const N = 61;
  const field = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1) - 0.5;
      const y = j / (N - 1) - 0.5;
      const r = Math.hypot(x, y);
      field[j * N + i] = 1 - r * 2.1 + noise.n2(x * 3.2, y * 3.2) * 0.22 + noise.n2(x * 7 + 9, y * 7) * 0.06;
    }
  }
  const levels = Array.from({ length: 9 }, (_, k) => 0.12 + k * 0.1);
  return contours(field, N, N, levels).flatMap((lines, k) =>
    lines.filter((l) => l.length > 8).map((l) => ({ d: toPath(l, 100 / (N - 1)), index: k % 4 === 1 })),
  );
}

/** Streamlines through a channel that narrows, so the lines bunch and the flow speeds up. */
export function streams(): string[] {
  const out: string[] = [];
  const count = 11;
  for (let k = 0; k < count; k++) {
    const u = (k + 0.5) / count - 0.5;
    let d = '';
    for (let s = 0; s <= 40; s++) {
      const x = 4 + (s / 40) * 92;
      const t = s / 40;
      // Wide on the left, a third as wide on the right, with a little wave as it settles.
      const width = 0.86 - 0.58 * (t * t * (3 - 2 * t));
      const y = 50 + u * width * 100 + Math.sin(t * Math.PI * 2 + k) * 1.4 * (1 - t);
      d += `${s ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
    }
    out.push(d);
  }
  return out;
}
