/**
 * Where the red line goes. It is one line all the way down, the same weight and colour everywhere,
 * and it keeps to one column: the page's right margin, which every section leaves free for it. It
 * leaves the margin only to draw the figures that belong to a section: out of the red dot in the
 * hero; a route across the method's survey map (casting about for the summit and spiralling in on
 * it, the legs between three cairns, the straight line to the flag); a knot for each project as the
 * work goes by; and at the end a loop around the send button, where it comes to rest.
 *
 * Where a part drawn on a pinned section meets a part drawn on the page, the two meet in the margin,
 * one above the other, so the join stays one straight vertical line while the section is held.
 * Where the line turns out of the margin or back into it, the turn is a corner (a doubled waypoint):
 * a curve would swing wide before turning, out past the edge of a phone. Built again whenever the
 * layout changes, since loop sizes and the margin are in pixels.
 */
import { rng } from './noise';
import type { Run, Way } from './thread';

export interface RouteParts {
  wide: boolean;
  /** How far in from the right edge the margin line runs. */
  lane: number;
  hero: Element;
  /** The red dot in the hero's composition, where the line starts. */
  origin: Element;
  heroRange: () => [number, number];
  intro: Element;
  /** The method section, and the frame inside it that is held while the map is drawn. */
  method: Element;
  methodFrame: Element;
  methodRange: () => [number, number];
  map: Element;
  /** The map's three waypoints: the summit, the cairns, the flag. */
  ways: Element[];
  work: Element;
  workHead: Element;
  /** Wide screens: the frame held while the projects slide past, and its scroll range. */
  workFrame?: Element;
  workRange?: () => [number, number];
  panels: Element[];
  range: Element;
  rangeHead: Element;
  caps: Element;
  also: Element;
  quest: Element;
  contact: Element;
  send: Element;
  onStep?: (i: number, p: number) => void;
  onRail?: (p: number) => void;
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
function spiral(el: Element, r0: number, r1: number, turns: number, perTurn: number, from = -Math.PI / 2): Way[] {
  const out: Way[] = [];
  const n = Math.round(turns * perTurn);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = from + t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    out.push(W(el, 0.5, 0.5, Math.cos(a) * r, Math.sin(a) * r));
  }
  return out;
}
/** A corner: the same waypoint twice, so the line runs straight into it and straight out. */
const corner = (w: Way): Way[] => [w, { ...w }];
/** A share of a scroll range. */
const part = (range: () => [number, number], a: number, b: number) => (): [number, number] => {
  const [s0, s1] = range();
  return [s0 + (s1 - s0) * a, s0 + (s1 - s0) * b];
};

export function buildRuns(p: RouteParts): Run[] {
  const L = p.lane;
  const vh = window.innerHeight;
  /** A point in the margin: x from an element's right edge, y from that or another element. */
  const M = (el: Element, ey: Element, fy: number, dy = 0) => W(el, 1, fy, -L, dy, ey);
  const runs: Run[] = [];

  /* The hero. The line hangs from the red dot from the start; scrolling draws it out to the margin
     and down it, while the composition puts itself in order. */
  runs.push({ span: () => [-1, -1], ways: [W(p.origin, 0.5, 0.5)] });
  runs.push({
    span: p.heroRange,
    ways: [W(p.origin, 0.5, 0.5, 24, 46), ...corner(M(p.hero, p.origin, 0.5, 70)), M(p.hero, p.hero, 0.94)],
  });

  /* The intro, down the margin. */
  runs.push({ ways: [M(p.intro, p.intro, 0.2), M(p.intro, p.intro, 0.85)] });

  /* The method, held while the line surveys the map. Offsets inside the frame are measured now: the
     frame and the map move together, held or not. */
  const frameBox = p.methodFrame.getBoundingClientRect();
  const mapBox = p.map.getBoundingClientRect();
  const mw = mapBox.width;
  const above = mapBox.top - frameBox.top - 18;
  const below = mapBox.bottom - frameBox.top + 18;
  const [w0, w1, w2] = p.ways;
  // Down the margin on the page, on into the same margin on the frame, then across above the map.
  runs.push({ ways: [M(p.method, p.method, 0, -40)] });
  runs.push({
    span: part(p.methodRange, 0, 0.07),
    ways: [...corner(W(p.methodFrame, 1, 0, -L, above)), ...corner(W(p.map, 1, 0, -8, -18))],
  });
  // 1. The shape: casting about for the summit, then spiralling in on it.
  const rand = rng(5);
  const cast: Way[] = [-0.3, 0.2, 0.7, 1.15, 1.55].map((t, i) => {
    const a = Math.PI * t + (rand() - 0.5) * 0.3;
    const d = mw * (0.2 - i * 0.025);
    return W(w0, 0.5, 0.5, Math.cos(a) * d, Math.sin(a) * d * 0.7);
  });
  runs.push({
    span: part(p.methodRange, 0.07, 0.36),
    onProgress: (v) => p.onStep?.(0, v),
    ways: [...cast, ...spiral(w0, mw * 0.11, mw * 0.022, 2.25, 10)],
  });
  // 2. The system: the legs between the three cairns, a closed triangle. Doubled points keep the
  // legs straight.
  const cairn = (k: number) => W(w1, 0.5, 0.5, CAIRNS[k][0] * mw, CAIRNS[k][1] * mw);
  runs.push({
    span: part(p.methodRange, 0.36, 0.66),
    onProgress: (v) => p.onStep?.(1, v),
    ways: [cairn(0), cairn(0), cairn(1), cairn(1), cairn(2), cairn(2), cairn(0), cairn(0)],
  });
  // 3. The speed: the straight line to the flag, and a knot there.
  runs.push({
    span: part(p.methodRange, 0.66, 0.92),
    onProgress: (v) => p.onStep?.(2, v),
    ways: [W(w2, 0.5, 0.5), W(w2, 0.5, 0.5), ...ring(w2, 0.5, 0.5, Math.max(8, mw * 0.014), { from: Math.PI / 2, steps: 7 })],
  });
  // Out: due south off the map, then along under it to the margin.
  runs.push({
    span: part(p.methodRange, 0.92, 1),
    ways: [...corner(W(w2, 0.5, 1, 0, 18, p.map)), ...corner(W(p.methodFrame, 1, 0, -L, below))],
  });

  /* The work. */
  runs.push({ ways: [M(p.work, p.work, 0, 30), M(p.work, p.workHead, 0.5)] });
  if (p.wide && p.workFrame && p.workRange) {
    // Held: on down the margin of the frame as the projects slide by, a knot for each.
    const frame = p.workFrame;
    const top = vh * 0.17;
    const bottom = vh * 0.82;
    const knots: Way[] = [];
    p.panels.forEach((_, k) => {
      const y = top + ((bottom - top) * k) / Math.max(1, p.panels.length - 1);
      knots.push(W(frame, 1, 0, -L, y - 16));
      knots.push(...ring(frame, 1, 0, 7, { steps: 7 }, { dx: -L - 7, dy: y }));
      knots.push(W(frame, 1, 0, -L, y + 16));
    });
    runs.push({ span: p.workRange, onProgress: p.onRail, ways: [...knots, W(frame, 1, 0, -L, vh * 0.92)] });
  } else {
    // One under another: a knot by the top of each project.
    const ways: Way[] = [];
    p.panels.forEach((card) => {
      ways.push(M(p.work, card, 0, 20));
      ways.push(...ring(p.work, 1, 0, 7, { steps: 7 }, { dx: -L - 7, dy: 48, ey: card }));
      ways.push(M(p.work, card, 0, 76), M(p.work, card, 1, -12));
    });
    runs.push({ ways });
  }

  /* The range and the side quest, down the margin. */
  runs.push({ ways: [M(p.range, p.range, 0, 30), M(p.range, p.rangeHead, 0.5), M(p.range, p.caps, 0.5), M(p.range, p.also, 1, 24)] });
  runs.push({ ways: [M(p.quest, p.quest, 0.15), M(p.quest, p.quest, 0.85)] });

  /* The contact: down the margin, once round the send button, and there it rests. */
  const b = p.send.getBoundingClientRect();
  const around = b.width / 2 + 16;
  // An ellipse that clears the button by about the same margin all round.
  const squash = (b.height / 2 + 16) / around;
  runs.push({
    ways: [
      M(p.contact, p.contact, 0.04),
      ...corner(M(p.contact, p.send, 0.5, -around - 30)),
      ...ring(p.send, 0.5, 0.5, around, { from: -0.45, turns: 1.06, steps: 16, squash }),
    ],
  });

  return runs;
}
