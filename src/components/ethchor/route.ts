/**
 * Where the red thread goes, section by section: the waypoints and how the tip travels them.
 *
 * It runs in the page's margins (the lanes), crossing only where there is room, and draws its
 * figures where the layout leaves room for them: a route across the method's survey map, a knot for
 * each project on the work rail, a ring round the overlap of the range's four plates, a ring round
 * the rising sun at the side quest, and finally a loop around the send button with a knot to
 * finish. Built again whenever the layout changes, since loop sizes and lanes are in pixels.
 */
import type { Run, Way } from './thread';

export interface RouteParts {
  wide: boolean;
  /** Half the page gutter: the lanes run this far in from each edge. */
  lane: number;
  start: Element;
  intro: Element;
  methodFrame: Element;
  methodRange: () => [number, number];
  /** The survey map and its three waypoints (the summit, the cairns, the flag). */
  map: Element;
  ways: Element[];
  workSection: Element;
  workHead: Element;
  /** Wide: the pinned frame, the rail and its stops, and the pin's scroll range. */
  workFrame?: Element;
  rail?: Element;
  stops?: Element[];
  workRange?: () => [number, number];
  /** Narrow: the project cards, one under another. */
  panels: Element[];
  range: Element;
  rangeHead: Element;
  /** The four overprinted plates. */
  venn: Element;
  also: Element;
  quest: Element;
  /** The side quest's sun (it moves as it rises: waypoints are measured every frame) and plant. */
  sun: Element;
  plant: Element;
  questRange: () => [number, number];
  contact: Element;
  send: Element;
  contactRange: () => [number, number];
  onStep?: (i: number, p: number) => void;
  onRail?: (p: number) => void;
}

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

const W = (el: Element, fx: number, fy: number, dx = 0, dy = 0, ey?: Element): Way => ({ el, fx, fy, dx, dy, ey });

interface RingOpts {
  /** Starting angle (0 is to the right, a quarter turn is down), turns, and points per turn. */
  from?: number;
  turns?: number;
  steps?: number;
  /** Vertical squash, for an ellipse. */
  squash?: number;
}
/** A loop of waypoints around a point: x from one element, y from another (or the same). */
function ring(el: Element, fx: number, fy: number, r: number, o: RingOpts = {}, at: { dx?: number; dy?: number; ey?: Element } = {}): Way[] {
  const { from = -Math.PI / 2, turns = 1, steps = 8, squash = 1 } = o;
  const out: Way[] = [];
  const count = Math.round(steps * turns);
  for (let i = 0; i <= count; i++) {
    const a = from + (i / steps) * Math.PI * 2;
    out.push(W(el, fx, fy, (at.dx ?? 0) + Math.cos(a) * r, (at.dy ?? 0) + Math.sin(a) * r * squash, at.ey));
  }
  return out;
}
/** Waypoints spiralling in on the middle of an element, from radius r0 to r1 over some turns. */
function spiral(el: Element, r0: number, r1: number, turns: number, perTurn: number): Way[] {
  const out: Way[] = [];
  const n = Math.round(turns * perTurn);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = -Math.PI / 2 + t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    out.push(W(el, 0.5, 0.5, Math.cos(a) * r, Math.sin(a) * r));
  }
  return out;
}
/**
 * The three cairns round the method's second waypoint, as shares of the map's width (the stylesheet
 * places their markers with the same numbers, in container units).
 */
export const CAIRNS: [number, number][] = [
  [-0.075, 0.045],
  [0.07, 0.035],
  [0.005, -0.07],
];
/** A share of a scroll range. */
const part = (range: () => [number, number], a: number, b: number) => (): [number, number] => {
  const [s0, s1] = range();
  return [s0 + (s1 - s0) * a, s0 + (s1 - s0) * b];
};

export function buildRuns(p: RouteParts): Run[] {
  const L = p.lane;
  const left = (el: Element, ey: Element, fy: number, dy = 0) => W(el, 0, fy, L, dy, ey);
  const right = (el: Element, ey: Element, fy: number, dy = 0) => W(el, 1, fy, -L, dy, ey);
  const runs: Run[] = [];

  /* Hero to the method: down the right lane past the intro, then a long swoop under it to the left. */
  runs.push({
    ways: [
      W(p.start, 0.5, 0.5),
      right(p.intro, p.intro, 0.24),
      right(p.intro, p.intro, 0.66),
      W(p.intro, 0.55, 0.95),
      left(p.intro, p.intro, 1, 6),
    ],
  });

  /* The method, pinned: the thread surveys the map while the page holds still. It casts about for
     the summit and spirals in on it (the shape), walks the legs between three cairns (the simplest
     system that holds), then takes the straight line to the flag (fast). Corners are doubled
     waypoints, which keep the legs straight. */
  const [w0, w1, w2] = p.ways;
  const mw = p.map.getBoundingClientRect().width;
  const rand = rng(5);
  runs.push({
    span: part(p.methodRange, 0, 0.06),
    ways: [left(p.methodFrame, p.map, 0.62)],
  });
  const cast: Way[] = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.9 + i * 0.37) + (rand() - 0.5) * 0.6;
    const d = mw * (0.2 - i * 0.025);
    cast.push(W(w0, 0.5, 0.5, Math.cos(a) * d, Math.sin(a) * d * 0.7));
  }
  runs.push({
    span: part(p.methodRange, 0.06, 0.36),
    onProgress: (v) => p.onStep?.(0, v),
    ways: [W(p.map, 0, 0.62), ...cast, ...spiral(w0, mw * 0.11, mw * 0.022, 2.25, 10)],
  });
  const cairn = (k: number) => W(w1, 0.5, 0.5, CAIRNS[k][0] * mw, CAIRNS[k][1] * mw);
  runs.push({
    span: part(p.methodRange, 0.36, 0.66),
    onProgress: (v) => p.onStep?.(1, v),
    ways: [cairn(0), cairn(0), cairn(1), cairn(1), cairn(2), cairn(2), cairn(0), cairn(0)],
  });
  runs.push({
    span: part(p.methodRange, 0.66, 0.92),
    onProgress: (v) => p.onStep?.(2, v),
    ways: [W(w2, 0.5, 0.5), W(w2, 0.5, 0.5), ...ring(w2, 0.5, 0.5, Math.max(8, mw * 0.014), { steps: 7 })],
  });
  // Out of the method. Wide: under the map and back to the left lane. Narrow (the steps sit under
  // the map): out to the right lane and down past the steps.
  runs.push({
    span: part(p.methodRange, 0.92, 1),
    ways: p.wide
      ? [W(p.map, 0.7, 1, 0, 26), left(p.methodFrame, p.methodFrame, 1, -4)]
      : [W(p.map, 1, 0.3, L - 2), right(p.methodFrame, p.map, 1, 24), right(p.methodFrame, p.methodFrame, 1, -4)],
  });

  /* Work. */
  if (p.wide && p.workFrame && p.rail && p.stops && p.workRange) {
    const range = p.workRange;
    runs.push({ ways: [left(p.workSection, p.workHead, 0.5)] });
    runs.push({
      span: () => {
        const [a] = range();
        return [a - window.innerHeight * 0.3, a];
      },
      ways: [W(p.rail, 0, 0.5, -L, -60), W(p.rail, 0, 0.5)],
    });
    // Along the rail, tying a knot at each project as it passes.
    const rail: Way[] = [];
    p.stops.forEach((stop) => {
      rail.push(W(stop, 0.5, 0.5, -26));
      rail.push(...ring(stop, 0.5, 0.5, 8, { from: Math.PI, steps: 7 }));
      rail.push(W(stop, 0.5, 0.5, 26));
    });
    runs.push({ span: range, onProgress: p.onRail, ways: [...rail, W(p.rail, 1, 0.5)] });
    runs.push({
      span: () => {
        const [, b] = range();
        return [b, b + window.innerHeight * 0.25];
      },
      ways: [right(p.workFrame, p.workFrame, 1, -8)],
    });
  } else {
    // Narrow: down the right lane past the heading, across above the first card, then down the
    // left lane with a knot by each project card.
    const first = p.panels[0];
    const ways: Way[] = [right(p.workSection, p.workHead, 0.5), W(p.workSection, 0.5, 0, 0, -26, first), left(p.workSection, first, 0, -10)];
    p.panels.forEach((card) => {
      ways.push(left(p.workSection, card, 0, 10));
      ways.push(...ring(p.workSection, 0, 0, 7, { steps: 7 }, { dx: L, dy: 34, ey: card }));
      ways.push(left(p.workSection, card, 1, -10));
    });
    // Then across to the right lane for what follows.
    const last = p.panels[p.panels.length - 1];
    ways.push(W(p.workSection, 0.5, 1, 0, 0, last), W(p.workSection, 1, 1, -L, 30, last));
    runs.push({ ways });
  }

  /* Range: from the lane over to where all four plates overlap, once round it, and back. */
  const vr = p.venn.getBoundingClientRect().width;
  runs.push({
    ways: [
      right(p.range, p.rangeHead, 0.5),
      W(p.venn, 1, 0.3, 10),
      ...ring(p.venn, 0.5, 0.5, vr * 0.13, { from: -Math.PI / 4, steps: 10 }),
      W(p.venn, 1, 0.75, 14),
      right(p.range, p.venn, 1, 24),
      right(p.range, p.also, 1, 30),
      right(p.range, p.range, 1),
    ],
  });

  /* The side quest: down the right lane to the sun, once round it as it comes up, then down past
     the plant to a knot on the ground beside it, and back to the lane. */
  const sun = p.sun.getBoundingClientRect();
  const sunR = sun.width / 2 + 16;
  runs.push({
    span: p.questRange,
    ways: [
      right(p.quest, p.sun, 0.5),
      ...ring(p.sun, 0.5, 0.5, sunR, { from: 0, steps: 14 }),
      W(p.plant, 1, 0.55, 26),
      ...ring(p.plant, 1, 1, 7, { from: Math.PI, steps: 6 }, { dx: 26, dy: -8 }),
      W(p.plant, 1, 1, 60, 10),
      right(p.quest, p.plant, 1, 26),
      right(p.quest, p.quest, 1),
    ],
  });

  /* Contact: down to the send button, once round it, and a knot to finish. */
  const b = p.send.getBoundingClientRect();
  const around = b.width / 2 + 16;
  // An ellipse that clears the button by about the same margin all round.
  const squash = (b.height / 2 + 16) / around;
  runs.push({
    span: p.contactRange,
    ways: [
      right(p.contact, p.contact, 0.02),
      right(p.contact, p.send, 0.5, -around - 30),
      ...ring(p.send, 0.5, 0.5, around, { from: -0.35, steps: 12, squash }),
      ...ring(p.send, 1, 0.5, 6, { from: Math.PI, steps: 6 }, { dx: 34 }),
      W(p.send, 1, 0.5, 52, 22),
    ],
  });

  return runs;
}
