/**
 * The red thread down the page. It starts at the hero's loose end and runs all the way to the send
 * button, drawn as you scroll, with a pixel tip leading the way and a second print of it (the
 * [data-echo] path) a hair off register.
 *
 * It passes through waypoints placed relative to elements and measured afresh every frame, so it
 * follows the layout, the pinned sections and anything GSAP moves. Each run of waypoints says how
 * the tip travels through it: following the reader's eye line as the page scrolls, or spread across
 * a pinned section's scroll (so a pinned figure draws itself while the page holds still).
 *
 * The curve is a centripetal Catmull-Rom spline through the waypoints, which never overshoots into
 * cusps or loops it wasn't asked for, turned into cubic Béziers for SVG.
 */

export interface Way {
  el: Element;
  /** Position within the element's box, as fractions, plus a pixel offset. */
  fx: number;
  fy: number;
  dx?: number;
  dy?: number;
  /** Take the height from another element (fy and dy then apply to it). */
  ey?: Element;
}

export interface Run {
  ways: Way[];
  /**
   * For a pinned run: the scroll range over which the tip travels it. Without one, the tip follows
   * the eye line, reaching each waypoint as it scrolls up past it.
   */
  span?: () => [number, number];
  /** This run's progress, 0 to 1, whenever it changes. */
  onProgress?: (p: number) => void;
}

export interface ThreadOptions {
  svg: SVGSVGElement;
  runs: Run[];
  /** Scroll position at which the tip leaves the first waypoint. */
  start: () => number;
  /** The eye line the tip follows, as a share of the viewport height. */
  eye?: number;
  /** Draw it all at once and keep it still. */
  still?: boolean;
}

type P = [number, number];

/** A point on a cubic Bézier, and the first part of it up to t (de Casteljau). */
function splitCubic(p0: P, p1: P, p2: P, p3: P, t: number): [P, P, P, P] {
  const l = (a: P, b: P): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = l(p0, p1);
  const b = l(p1, p2);
  const c = l(p2, p3);
  const d = l(a, b);
  const e = l(b, c);
  return [p0, a, d, l(d, e)];
}

/** Bézier control points for the centripetal Catmull-Rom segment from p1 to p2. */
function controls(p0: P, p1: P, p2: P, p3: P): [P, P] {
  const d1 = Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
  const d2 = Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
  const d3 = Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]));
  const b1: P =
    d1 < 1e-3 || d2 < 1e-3
      ? p1
      : [
          (d1 * d1 * p2[0] - d2 * d2 * p0[0] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[0]) / (3 * d1 * (d1 + d2)),
          (d1 * d1 * p2[1] - d2 * d2 * p0[1] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[1]) / (3 * d1 * (d1 + d2)),
        ];
  const b2: P =
    d3 < 1e-3 || d2 < 1e-3
      ? p2
      : [
          (d3 * d3 * p1[0] - d2 * d2 * p3[0] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[0]) / (3 * d3 * (d3 + d2)),
          (d3 * d3 * p1[1] - d2 * d2 * p3[1] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[1]) / (3 * d3 * (d3 + d2)),
        ];
  return [b1, b2];
}

const f1 = (n: number) => n.toFixed(1);

export function createThread(opts: ThreadOptions) {
  const { svg } = opts;
  const eye = opts.eye ?? 0.62;
  const line = svg.querySelector<SVGPathElement>('[data-line]')!;
  const echo = svg.querySelector<SVGPathElement>('[data-echo]');
  const tip = svg.querySelector<SVGGElement>('[data-tip]');

  const ways: Way[] = [];
  const runOf: number[] = [];
  opts.runs.forEach((r, i) =>
    r.ways.forEach((w) => {
      ways.push(w);
      runOf.push(i);
    }),
  );
  const n = ways.length;
  const reach = new Float64Array(n);
  const progressOf = opts.runs.map(() => -1);

  let rects = new Map<Element, DOMRect>();
  const rectOf = (el: Element) => {
    let r = rects.get(el);
    if (!r) {
      r = el.getBoundingClientRect();
      rects.set(el, r);
    }
    return r;
  };
  const at = (k: number): P => {
    const w = ways[Math.max(0, Math.min(n - 1, k))];
    const r = rectOf(w.el);
    const ry = w.ey ? rectOf(w.ey) : r;
    return [r.left + w.fx * r.width + (w.dx ?? 0), ry.top + w.fy * ry.height + (w.dy ?? 0)];
  };

  /** When the tip reaches each waypoint, as a scroll position. Call after layout changes. */
  function measure() {
    rects = new Map();
    const sy = window.scrollY;
    const vh = window.innerHeight;
    const pts = ways.map((_, k) => at(k));
    const len = (k: number) => (k === 0 ? 0 : Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    reach[0] = opts.start();
    let k = 0;
    opts.runs.forEach((run) => {
      const first = k;
      const last = k + run.ways.length - 1;
      if (run.span) {
        const [s0, s1] = run.span();
        let total = 0;
        for (let j = first + 1; j <= last; j++) total += len(j);
        let acc = 0;
        for (let j = first; j <= last; j++) {
          if (j > first) acc += len(j);
          const r = s0 + (s1 - s0) * (total ? acc / total : (j - first) / Math.max(1, last - first));
          reach[j] = j === 0 ? Math.min(reach[0], r) : Math.max(r, reach[j - 1] + 0.01);
        }
      } else {
        for (let j = first; j <= last; j++) {
          if (j === 0) continue;
          // Follow the eye line, but never faster than the thread can be drawn: a loop or a long
          // sideways stretch takes its share of scrolling.
          reach[j] = Math.max(pts[j][1] + sy - vh * eye, reach[j - 1] + len(j) * 0.5, reach[j - 1] + 0.01);
        }
      }
      k = last + 1;
    });
    // The page ends somewhere: the tip has to arrive by the bottom.
    const max = document.documentElement.scrollHeight - vh - 2;
    if (reach[n - 1] > max) {
      let j = n - 1;
      while (j > 0 && reach[j] > max - (n - 1 - j) * 0.5) j--;
      const a = reach[j];
      for (let i = j + 1; i < n; i++) reach[i] = a + ((max - a) * (i - j)) / (n - 1 - j);
    }
  }

  let shown = opts.still ? Number.POSITIVE_INFINITY : 0;
  let lastD = '';

  function head(s: number): [number, number] {
    if (s <= reach[0]) return [0, 0];
    if (s >= reach[n - 1]) return [n - 1, 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (reach[mid] <= s) lo = mid;
      else hi = mid;
    }
    return [lo, (s - reach[lo]) / (reach[lo + 1] - reach[lo])];
  }

  function draw() {
    rects = new Map();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const [k, f] = head(shown);
    const pts: P[] = [];
    const end = Math.min(n - 1, k + 2);
    for (let j = 0; j <= end; j++) pts.push(at(j));
    // The thread arrives from above, out of the hero's straight line.
    const before: P = [pts[0][0], pts[0][1] - 80];
    const get = (j: number): P => (j < 0 ? before : j < pts.length ? pts[j] : pts[pts.length - 1]);
    let d = '';
    let pen = false;
    let tipAt: P | null = null;
    const M = 160;
    const last = f >= 1 ? k : k + 1;
    for (let j = 0; j < last && j < n - 1; j++) {
      const p0 = get(j - 1);
      const p1 = get(j);
      const p2 = get(j + 1);
      const p3 = j + 2 < n ? get(j + 2) : get(j + 1);
      let [b1, b2] = controls(p0, p1, p2, p3);
      let q = p2;
      if (j === k && f < 1) [, b1, b2, q] = splitCubic(p1, b1, b2, p2, f);
      if (j === last - 1) tipAt = q;
      const xs = [p1[0], b1[0], b2[0], q[0]];
      const ys = [p1[1], b1[1], b2[1], q[1]];
      const off =
        Math.max(...ys) < -M || Math.min(...ys) > vh + M || Math.max(...xs) < -M || Math.min(...xs) > vw + M;
      if (off) {
        pen = false;
        continue;
      }
      if (!pen) d += `M${f1(p1[0])} ${f1(p1[1])}`;
      d += `C${f1(b1[0])} ${f1(b1[1])} ${f1(b2[0])} ${f1(b2[1])} ${f1(q[0])} ${f1(q[1])}`;
      pen = true;
    }
    if (d !== lastD) {
      line.setAttribute('d', d);
      echo?.setAttribute('d', d);
      lastD = d;
    }
    if (tip) {
      const on = !!tipAt && !opts.still && shown > reach[0] && shown < reach[n - 1] + 1;
      tip.style.opacity = on ? '1' : '0';
      if (tipAt) tip.setAttribute('transform', `translate(${f1(tipAt[0])} ${f1(tipAt[1])})`);
    }
    // Tell each run how far through it the tip is.
    opts.runs.forEach((run, ri) => {
      if (!run.onProgress) return;
      const first = runOf.indexOf(ri);
      const lastWay = first + run.ways.length - 1;
      const a = reach[first];
      const b = reach[lastWay];
      const p = b > a ? Math.max(0, Math.min(1, (shown - a) / (b - a))) : shown >= b ? 1 : 0;
      if (Math.abs(p - progressOf[ri]) > 0.0005) {
        progressOf[ri] = p;
        run.onProgress(p);
      }
    });
  }

  measure();

  return {
    measure,
    /** Move the tip toward the current scroll, a little behind it, and redraw. */
    frame(dt: number) {
      if (!opts.still) {
        const s = window.scrollY;
        const k = 1 - Math.exp(-dt * 9);
        shown += (s - shown) * k;
        if (Math.abs(s - shown) < 0.5) shown = s;
      }
      draw();
    },
    /** Draw once, now (for still pages and after jumps). */
    draw,
    /** Snap the tip to the current scroll. */
    sync() {
      if (!opts.still) shown = window.scrollY;
    },
  };
}

export type Thread = ReturnType<typeof createThread>;
