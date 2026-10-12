/**
 * Where the red thread goes, section by section: the waypoints and how the tip travels them.
 *
 * It runs in the page's margins (the lanes), crossing only where there is room, and draws its
 * figures inside boxes the layout leaves for them: the method's three sketches, a knot for each
 * project on the work rail, a stitch under each capability, a potted plant at the side quest, and
 * finally a loop around the send button with a knot to finish. Built again whenever the layout
 * changes, since loop sizes and lanes are in pixels.
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
  figs: Element[];
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
  caps: Element[];
  also: Element;
  quest: Element;
  questFig: Element;
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

  /* The method, pinned: the thread sketches each step in its box while the page holds still. */
  const [f0, f1, f2] = p.figs;
  const box = f0.getBoundingClientRect();
  const r0 = box.width;
  const rand = rng(5);
  // 1. The shape: a scribble, then the circle that finally contains it.
  const scribble: Way[] = [];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.2;
    scribble.push(W(f0, 0.5 + Math.cos(a) * d, 0.5 + Math.sin(a) * d));
  }
  runs.push({
    span: part(p.methodRange, 0, 0.06),
    ways: [left(p.methodFrame, f0, 0.5)],
  });
  runs.push({
    span: part(p.methodRange, 0.06, 0.36),
    onProgress: (v) => p.onStep?.(0, v),
    ways: [W(f0, 0.12, 0.5), ...scribble, W(f0, 0.5, 0.1), ...ring(f0, 0.5, 0.5, r0 * 0.4, { steps: 10 }), W(f0, 1, 0.42, 6)],
  });
  // 2. The system: a hub and four services, each with a knot where it sits.
  const nodes: [number, number][] = [
    [0.15, 0.5],
    [0.5, 0.5],
    [0.5, 0.14],
    [0.5, 0.5],
    [0.85, 0.5],
    [0.5, 0.5],
    [0.5, 0.86],
  ];
  const knotR = Math.max(5, r0 * 0.045);
  const system: Way[] = [];
  nodes.forEach(([x, y], i) => {
    const repeat = i > 1 && x === 0.5 && y === 0.5;
    if (repeat) system.push(W(f1, x, y));
    else system.push(...ring(f1, x, y, knotR, { from: Math.PI, steps: 6 }));
  });
  runs.push({
    span: part(p.methodRange, 0.36, 0.66),
    onProgress: (v) => p.onStep?.(1, v),
    ways: [W(f1, 0, 0.5, -4), ...system, W(f1, 1, 0.8, 6)],
  });
  // 3. The speed: a cost curve falling fast, the noise settling, ending in a ring at its minimum.
  const curve: Way[] = [];
  for (let i = 0; i <= 12; i++) {
    const x = 0.06 + (i / 12) * 0.86;
    const jitter = (rand() - 0.5) * 0.16 * Math.exp(-i * 0.35);
    curve.push(W(f2, x, 0.12 + 0.72 * (1 - Math.exp(-5.2 * (x - 0.06))) + jitter));
  }
  runs.push({
    span: part(p.methodRange, 0.66, 0.92),
    onProgress: (v) => p.onStep?.(2, v),
    ways: [...curve, ...ring(f2, 0.92, 0.84, knotR * 1.6, { from: Math.PI })],
  });
  // Out of the method. Wide: under the sketches and back to the left lane. Narrow (the steps sit
  // under the sketches): out to the right lane and down past the steps.
  runs.push({
    span: part(p.methodRange, 0.92, 1),
    ways: p.wide
      ? [W(f2, 0.6, 1.32), left(p.methodFrame, p.methodFrame, 1, -4)]
      : [W(f2, 1, 0.84, L + 4), right(p.methodFrame, f2, 1.3), right(p.methodFrame, p.methodFrame, 1, -4)],
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

  /* Range: a stitch under each capability, crossing the page from lane to lane. */
  const stitch: Way[] = [right(p.range, p.rangeHead, 0.5)];
  let side = 1;
  p.caps.forEach((cap) => {
    // Along the rule under each capability, from one lane to the other.
    stitch.push(side ? right(p.range, cap, 1) : left(p.range, cap, 1));
    for (const f of side ? [0.75, 0.5, 0.25] : [0.25, 0.5, 0.75]) stitch.push(W(p.range, f, 1, 0, 0, cap));
    side = 1 - side;
    stitch.push(side ? right(p.range, cap, 1) : left(p.range, cap, 1));
  });
  stitch.push(side ? right(p.range, p.also, 1, 30) : left(p.range, p.also, 1, 30));
  if (!side) stitch.push(W(p.range, 0.5, 1, 0, 0), right(p.range, p.range, 1));
  runs.push({ ways: stitch });

  /* The side quest: a potted plant, drawn as the sun comes up. The thread arrives along the ground,
     goes round the pot, then rises from the bottom of it as the stem, with two leaves and a bud. */
  const q = p.questFig;
  runs.push({
    span: p.questRange,
    ways: [
      right(p.quest, q, 0.94),
      W(q, 0.64, 0.94),
      W(q, 0.675, 0.79),
      W(q, 0.71, 0.64),
      W(q, 0.29, 0.64),
      W(q, 0.325, 0.79),
      W(q, 0.36, 0.94),
      W(q, 0.5, 0.94),
      W(q, 0.5, 0.78),
      W(q, 0.5, 0.6),
      W(q, 0.5, 0.52),
      W(q, 0.58, 0.47),
      W(q, 0.73, 0.37),
      W(q, 0.61, 0.36),
      W(q, 0.51, 0.43),
      W(q, 0.5, 0.35),
      W(q, 0.41, 0.29),
      W(q, 0.27, 0.2),
      W(q, 0.39, 0.19),
      W(q, 0.49, 0.26),
      W(q, 0.5, 0.15),
      ...ring(q, 0.5, 0.1, Math.max(6, q.getBoundingClientRect().width * 0.03), { from: Math.PI / 2, steps: 7 }),
      W(q, 0.5, 0.04),
      right(p.quest, q, 0, -10),
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
