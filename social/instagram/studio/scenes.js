/* Qwantarc Instagram studio.
 *
 * Each scene builds its page once and can then draw any moment t (in seconds) on request, so every frame
 * is deterministic and a video is just a run of stills. The drawing code is the site's own, moved onto a
 * fixed clock:
 *   the field and the journey   src/pages/index.astro
 *   the guide's orb             src/components/guide/client.ts
 *   the arc artwork             src/components/QigArt.astro
 *   the garden                  src/components/farms/garden.ts (bundled by render.mjs)
 *
 * Open index.html?scene=hero&format=post in a browser to see a scene; render.mjs exports them.
 */

const q = new URLSearchParams(location.search);
const SCENE = q.get('scene') ?? 'hero';
const FORMAT = q.get('format') ?? 'post';
const SIZES = { post: [432, 540], reel: [432, 768], square: [432, 432], grid: [432, 576] };
const [W, H] = SIZES[FORMAT];
const DPR = window.devicePixelRatio || 1;
const BONE = '236 233 227';
const EMBER = '255 112 67';
const TAU = Math.PI * 2;

const stage = document.getElementById('stage');
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;
stage.dataset.format = FORMAT;
if (q.has('grain')) document.documentElement.style.setProperty('--grain', q.get('grain'));

/* ---------- Helpers ---------- */

const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** How far t is through the span from a to b, 0 to 1. */
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const expoOut = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const expoIn = (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10));
const expoInOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2);
const cubicInOut = (v) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
const sineInOut = (v) => -(Math.cos(Math.PI * v) - 1) / 2;
const power2In = (x) => x * x * x;

/** The site's --ease, cubic-bezier(0.16, 1, 0.3, 1), solved for y at x. */
function siteEase(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const [x1, y1, x2, y2] = [0.16, 1, 0.3, 1];
  const bez = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, y1, y2);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** A canvas covering w x h logical pixels, drawn at the capture scale. */
function layer(w = W, h = H, parent = stage) {
  const c = el('canvas', 'layer');
  c.width = Math.round(w * DPR);
  c.height = Math.round(h * DPR);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  parent.append(c);
  const ctx = c.getContext('2d');
  return {
    c,
    ctx,
    clear() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, h);
    },
  };
}

/** The site's bar and footer row, at the corners of the post. */
function folio({ tl = 'Qwantarc', tr = '', bl = '', br = '' } = {}) {
  const f = el('div', 'folio');
  f.innerHTML = `<span class="f-tl">${tl}</span><span class="f-tr">${tr}</span><span class="f-bl">${bl}</span><span class="f-br">${br}</span>`;
  stage.append(f);
  return f;
}

const ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const scenes = {};

/* ---------- 1. The arc: the landing page hero ---------- */

scenes.hero = () => {
  const T = 10;
  const reel = FORMAT === 'reel';
  const field = layer();
  const center = el('div', 'hero-center');
  const mark = el('h1', 'mark');
  const chars = [...'Qwantarc'].map((ch) => {
    const clip = el('span', 'mark-clip');
    const c = el('span', 'mark-ch', ch);
    clip.append(c);
    mark.append(clip);
    return c;
  });
  center.append(mark);
  const corner = el('p', 'corner', 'From cognition<br>to comfort');
  stage.append(center, corner);
  if (reel) {
    corner.style.bottom = '196px';
    const url = el('p', 'corner', 'qwantarc.com');
    url.style.cssText = 'bottom:196px;left:auto;right:var(--m)';
    stage.append(url);
  } else {
    folio({ tr: 'qwantarc.com' });
  }

  // Concentric arcs, laid out exactly as on the site.
  const maxR = Math.hypot(W, H) * 1.05;
  const arcs = [];
  for (let r = H * 0.22, gap = 9; r < maxR; r += gap, gap *= 1.045) {
    arcs.push({ r, n: Math.max(48, Math.round((Math.PI * r) / 12)) });
  }

  // An unseen pointer drifts through the field on a loop, sweeping across the wordmark. Two taps send rings out.
  const pointerAt = (t) => ({
    x: W / 2 - W * 0.36 * Math.sin((TAU * t) / T),
    y: H * 0.47 + H * 0.075 * Math.sin((2 * TAU * t) / T + 0.7),
  });
  const TAPS = [4.35, 6.2];
  const introAt = (t) => (t < T / 2 ? expoInOut(seg(t, 0.15, 2.35)) : 1 - expoInOut(seg(t, 8.25, 9.75)));
  const activeAt = (t) => smooth(seg(t, 2.3, 3.2)) * (1 - smooth(seg(t, 7.4, 8.2)));

  function drawField(t) {
    const { ctx } = field;
    const intro = introAt(t);
    const pointer = pointerAt(t);
    const cx = W / 2;
    const cy = H * 1.16;
    const rings = TAPS.filter((t0) => t >= t0 && t - t0 < 1.8).map((t0) => {
      const age = t - t0;
      const at = pointerAt(t0);
      return { x: at.x, y: at.y, R: age * Math.max(W, H) * 0.75, amp: 30 * Math.exp(-age * 2.4) };
    });
    field.clear();
    const sigma = Math.min(W, H) * 0.2;
    const pull = 0.42;
    const pr = Math.hypot(pointer.x - cx, pointer.y - cy);
    const span = (Math.PI / 2) * intro;
    const breathe = (TAU * t) / T;
    for (let i = 0; i < arcs.length; i++) {
      const { r: r0, n } = arcs[i];
      const r = r0 + Math.sin(breathe + i * 0.33) * 1.6;
      const near = Math.exp(-((r - pr) ** 2) / (2 * (sigma * 0.35) ** 2));
      const next = arcs[i + 1]?.r ?? r0 + 20;
      const chosen = pr >= r0 && pr < next;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const a = Math.PI * 1.5 - span + (2 * span * k) / n;
        let x = cx + Math.cos(a) * r;
        let y = cy + Math.sin(a) * r;
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        const f = pull * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        x += dx * f;
        y += dy * f;
        for (const ring of rings) {
          const rx = x - ring.x;
          const ry = y - ring.y;
          const d = Math.hypot(rx, ry) || 1;
          const push = ring.amp * Math.exp(-((d - ring.R) ** 2) / 3200);
          x += (rx / d) * push;
          y += (ry / d) * push;
        }
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (chosen && intro > 0.98) {
        ctx.strokeStyle = `rgb(${EMBER} / 0.95)`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = `rgb(${EMBER} / 0.7)`;
        ctx.shadowBlur = 7 * DPR;
      } else {
        const depth = 1 - i / arcs.length;
        ctx.strokeStyle = `rgb(${BONE} / ${0.07 + depth * 0.1 + near * 0.32})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // The wordmark's weight follows the pointer, eased each 60th of a second as on the site.
  const weights = chars.map(() => 700);
  const reach = Math.min(170, W * 0.24);
  let simT = 0;
  function stepWeights(t) {
    const p = pointerAt(t);
    const a = activeAt(t);
    chars.forEach((c, i) => {
      const b = c.getBoundingClientRect();
      const d = Math.hypot(p.x - (b.left + b.width / 2), p.y - (b.top + b.height / 2));
      const target = 220 + 680 * Math.exp(-(d * d) / (2 * reach * reach));
      weights[i] += (700 + (target - 700) * a - weights[i]) * 0.12;
    });
    chars.forEach((c, i) => (c.style.fontVariationSettings = `'wght' ${weights[i].toFixed(0)}`));
  }

  return {
    duration: T,
    frame(t) {
      if (t < simT) {
        simT = 0;
        weights.fill(700);
      }
      chars.forEach((c, i) => {
        const rise = 110 * (1 - expoOut(seg(t, 0.7 + i * 0.055, 2.0 + i * 0.055)));
        const exit = -110 * expoIn(seg(t, 8.0 + i * 0.045, 8.8 + i * 0.045));
        c.style.transform = `translateY(${t < T / 2 ? rise : exit}%)`;
      });
      while (simT + 1 / 60 <= t + 1e-9) {
        simT += 1 / 60;
        stepWeights(simT);
      }
      const fade = t < T / 2 ? seg(t, 1.65, 2.65) : 1 - seg(t, 8.0, 8.6);
      stage.querySelectorAll('.corner').forEach((c) => (c.style.opacity = fade));
      drawField(t);
    },
  };
};

/* ---------- 2. The manifesto: words light up as you read ---------- */

scenes.manifesto = () => {
  const T = 9;
  const arcs = layer();
  const words = 'Everything we build, from *cognition* to *comfort,* follows the intelligent arc.'.split(' ');
  const box = el('div', 'mf');
  const p = el('p', 'mf-text');
  const spans = words.map((w) => {
    const s = el(w.startsWith('*') ? 'em' : 'span', 'w', w.replace(/\*/g, ''));
    p.append(s, ' ');
    return s;
  });
  box.append(p);
  stage.append(box);
  folio({ tr: 'What we believe', bl: 'Everything follows the arc.', br: 'qwantarc.com' });

  // The site scrubs a 0.12 stagger over 0.5-long tweens; here the same wave runs over 4.6 seconds.
  const start = 0.5;
  const span = 4.6;
  const unit = span / (0.5 + 0.12 * (words.length - 1));
  const still = q.has('still');

  // One ember arc rises under the words and is fully drawn as the last word lights.
  const geo = { cx: W / 2, cy: H * 1.62, R: H * 0.835 };
  function drawArcs(t) {
    const { ctx } = arcs;
    arcs.clear();
    const lit = still ? 1 : siteEase(seg(t, start + 0.2, start + span + 0.4));
    const gone = still ? 0 : seg(t, 7.7, 8.6);
    for (const [k, r] of [geo.R + 34, geo.R + 70].entries()) {
      ctx.strokeStyle = `rgb(${BONE} / ${0.07 - k * 0.02})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(geo.cx, geo.cy, r, Math.PI, TAU);
      ctx.stroke();
    }
    const from = Math.PI + 0.55;
    const to = TAU - 0.55;
    const end = from + (to - from) * lit;
    if (lit > 0.001 && gone < 1) {
      ctx.globalAlpha = 1 - gone;
      ctx.strokeStyle = `rgb(${EMBER})`;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = `rgb(${EMBER} / 0.5)`;
      ctx.shadowBlur = 10 * DPR;
      ctx.beginPath();
      ctx.arc(geo.cx, geo.cy, geo.R, from, end);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  return {
    duration: T,
    frame(t) {
      spans.forEach((s, i) => {
        const on = still ? 1 : seg(t, start + i * 0.12 * unit, start + (i * 0.12 + 0.5) * unit);
        const off = still ? 0 : seg(t, 7.7, 8.6);
        s.style.opacity = 0.12 + 0.88 * on * (1 - off);
      });
      drawArcs(t);
    },
  };
};

/* ---------- 3. Say hello ---------- */

scenes.hello = () => {
  const arcs = layer();
  const box = el('div', 'hello');
  const solid = q.get('cta') === 'solid';
  box.innerHTML = `
    <p class="n">Contact</p>
    <h1 class="hello-title">Say <em>hello.</em></h1>
    <p class="hello-text">Partnerships, products, or just an idea worth building. Write to us and a person reads it.</p>
    <span class="hello-cta${solid ? ' is-solid' : ''}"><span>Start an Enquiry</span>${ARROW}</span>
    <p class="hello-mail">vimu@qwantarc.com</p>`;
  stage.append(box);
  folio({ tr: 'qwantarc.com/contact' });

  // The contact page's arcs: two quiet ones and an ember one, rising from below.
  const { ctx } = arcs;
  arcs.clear();
  const cx = W / 2;
  const cy = H * 1.58;
  const rings = [
    { r: H * 0.66, ember: true },
    { r: H * 0.74, a: 0.08 },
    { r: H * 0.82, a: 0.06 },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, Math.PI, TAU);
    if (ring.ember) {
      ctx.strokeStyle = `rgb(${EMBER})`;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = `rgb(${EMBER} / 0.5)`;
      ctx.shadowBlur = 10 * DPR;
    } else {
      ctx.strokeStyle = `rgb(${BONE} / ${ring.a})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  return { duration: 0, frame() {} };
};

/* ---------- 4. The journey: cognition becomes craft becomes comfort ---------- */

const STAGES = [
  { n: '01', word: 'Cognition', text: 'It begins with understanding. Systems that notice, learn and think a step ahead, so people don’t have to.' },
  { n: '02', word: 'Craft', text: 'Then the making. Every detail considered, every motion earned, nothing added for show.' },
  { n: '03', word: 'Comfort', text: 'And it ends in ease. Technology that feels like it was always there, quiet until it’s needed.' },
];
const STOPS = [0.08, 0.5, 0.92];
const LABELS = ['01 Cognition', '02 Craft', '03 Comfort'];

function journeyParticles(geo, N) {
  // The site's seeded random, so the network is the same one visitors see.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const { cx, cy, R } = geo;
  const clusters = Array.from({ length: 7 }, () => {
    const a = Math.PI + 0.5 + rnd() * (Math.PI - 1);
    const r = R * (0.25 + rnd() * 0.55);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  const RINGS = 6;
  const edge = 0.42;
  return Array.from({ length: N }, (_, i) => {
    const c = clusters[i % clusters.length];
    const ring = i % RINGS;
    const slot = Math.floor(i / RINGS);
    const perRing = Math.ceil(N / RINGS);
    const ba = Math.PI + 0.1 + ((Math.PI - 0.2) * (slot + 0.5)) / perRing;
    const br = R * (0.34 + (ring / (RINGS - 1)) * 0.56);
    const u = i / N;
    return {
      ax: c.x + gauss() * R * 0.11,
      ay: c.y + gauss() * R * 0.09,
      bx: cx + Math.cos(ba) * br,
      by: cy + Math.sin(ba) * br,
      ca: Math.PI + edge + (Math.PI - 2 * edge) * u,
      cr: R * 0.72 + gauss() * 3,
      u,
      size: 0.8 + rnd() * 1.1,
      phase: rnd() * Math.PI * 2,
    };
  });
}

const morph = (p, from, dur, u) => cubicInOut(clamp01((p - from - u * 0.1) / dur));

/** The site's drawJourney for progress p at time t (seconds). */
function drawJourney(ctx, t, p, geo, parts, labelSize = 10) {
  const { cx, cy, R } = geo;
  const tm = t * 1000;
  const network = 1 - clamp01((p - 0.18) / 0.2);
  const craft = Math.exp(-((p - 0.5) ** 2) / 0.012);
  const comfort = clamp01((p - 0.62) / 0.2);

  if (comfort > 0) {
    const g = ctx.createRadialGradient(cx, cy - R * 0.72, 0, cx, cy - R * 0.72, R * 1.1);
    g.addColorStop(0, `rgb(${EMBER} / ${0.22 * comfort})`);
    g.addColorStop(1, `rgb(${EMBER} / 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (craft > 0.02) {
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = `rgb(${BONE} / ${0.06 * craft})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.34 + (k / 5) * 0.56), Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }

  const pts = parts.map((q0) => {
    const ab = morph(p, 0.2, 0.22, q0.u);
    const bc = morph(p, 0.6, 0.22, q0.u);
    const ax = q0.ax + Math.sin(tm * 0.0006 + q0.phase) * 6;
    const ay = q0.ay + Math.cos(tm * 0.0005 + q0.phase) * 5;
    const breath = Math.sin(tm * 0.0012 + q0.ca * 3) * 4;
    const cxp = cx + Math.cos(q0.ca) * (q0.cr + breath);
    const cyp = cy + Math.sin(q0.ca) * (q0.cr + breath);
    let x = ax + (q0.bx - ax) * ab;
    let y = ay + (q0.by - ay) * ab;
    x += (cxp - x) * bc;
    y += (cyp - y) * bc;
    return { x, y, q: q0 };
  });

  if (network > 0.02) {
    const thr = R * 0.13;
    const thr2 = thr * thr;
    ctx.lineWidth = 0.7;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < thr2) {
          ctx.strokeStyle = `rgb(${BONE} / ${(1 - d2 / thr2) * 0.28 * network})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  for (const { x, y, q: q0 } of pts) {
    const warm = comfort * (0.4 + 0.6 * Math.sin(q0.u * Math.PI));
    ctx.fillStyle = warm > 0.05 ? `rgb(${EMBER} / ${0.45 + warm * 0.5})` : `rgb(${BONE} / 0.75)`;
    const s = q0.size * (1 + comfort * 0.3);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }

  // The dial: fine ticks along the outer arc, lit as you travel. End labels sit under the ends, as on phones.
  const TICKS = 96;
  const outer = R * 1.02;
  for (let k = 0; k <= TICKS; k++) {
    const f = k / TICKS;
    const a = Math.PI + 0.05 + (Math.PI - 0.1) * f;
    const stop = STOPS.findIndex((s0) => Math.abs(s0 - f) < 0.5 / TICKS);
    const len = stop >= 0 ? 18 : k % 8 === 0 ? 10 : 5;
    const lit = f <= p;
    ctx.strokeStyle = lit ? `rgb(${EMBER} / ${stop >= 0 ? 1 : 0.85})` : `rgb(${BONE} / ${stop >= 0 ? 0.35 : 0.14})`;
    ctx.lineWidth = stop >= 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.lineTo(cx + Math.cos(a) * (outer + len), cy + Math.sin(a) * (outer + len));
    ctx.stroke();
    if (stop >= 0) {
      // The end labels sit on a baseline under the dial, clear of the particles; the middle one above it.
      const inside = stop !== 1;
      const lx = inside ? cx + (stop === 0 ? -1 : 1) * Math.min(outer, cx - 24) : cx + Math.cos(a) * (outer + 34);
      const ly = inside ? cy + 22 : cy + Math.sin(a) * (outer + 34);
      ctx.font = `400 ${labelSize}px Lexend, system-ui, sans-serif`;
      ctx.letterSpacing = '0.06em';
      ctx.textAlign = inside ? (stop === 0 ? 'left' : 'right') : 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = lit ? `rgb(${EMBER} / 1)` : `rgb(${BONE} / 0.45)`;
      ctx.fillText(LABELS[stop].toUpperCase(), lx, ly);
      ctx.letterSpacing = '0px';
    }
  }
  const ha = Math.PI + 0.05 + (Math.PI - 0.1) * p;
  const hx = cx + Math.cos(ha) * (outer + 9);
  const hy = cy + Math.sin(ha) * (outer + 9);
  ctx.fillStyle = `rgb(${BONE} / 1)`;
  ctx.shadowColor = `rgb(${EMBER} / 0.9)`;
  ctx.shadowBlur = 8 * DPR;
  ctx.beginPath();
  ctx.arc(hx, hy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function stageCards(words = true) {
  const box = el('div', 'stages');
  const cards = STAGES.map((s) => {
    const card = el('article', 'stage-card');
    const n = el('p', 'stage-n', s.n);
    const word = el('h2', 'stage-word');
    const chars = [...s.word].map((ch) => {
      const c = el('span', 'ch', ch);
      word.append(c);
      return c;
    });
    const text = el('p', 'stage-text', s.text);
    card.append(n, word, text);
    if (!words) text.remove();
    box.append(card);
    return { card, n, word, chars, text };
  });
  stage.append(box);
  return { box, cards };
}

function journeyGeo(box, cy, maxShare) {
  const textBottom = box.getBoundingClientRect().bottom;
  const room = (cy - textBottom - 72) / 1.02;
  const R = Math.max(110, Math.min(W * maxShare, room));
  return { cx: W / 2, cy, R };
}

/** One stage of the journey as a still post. */
scenes.journey = () => {
  const i = Number(q.get('stage') ?? 0);
  const canvas = layer();
  const { box, cards } = stageCards();
  box.style.top = '70px';
  cards.forEach((c, k) => {
    c.word.style.fontSize = '64px';
    c.card.style.visibility = k === i ? 'visible' : 'hidden';
  });
  folio({ tr: `<b>${STAGES[i].n}</b> / 03` });
  const geo = journeyGeo(box, H - 54, 0.46);
  const parts = journeyParticles(geo, 260);
  const p = STOPS[i];
  return {
    duration: 0,
    frame(t) {
      canvas.clear();
      drawJourney(canvas.ctx, 2 + t, p, geo, parts);
    },
  };
};

/** The whole journey as a Reel, ending on the wordmark. */
scenes.journeyReel = () => {
  const T = 16;
  const canvas = layer();
  const { box, cards } = stageCards();
  box.style.top = '104px';
  cards.forEach((c) => {
    c.word.style.fontSize = '80px';
    c.text.style.fontSize = '15px';
  });
  // Everything stays above Reels' caption and buttons, and inside the 3:4 crop the profile grid shows.
  const geo = journeyGeo(box, 556, 0.42);
  const parts = journeyParticles(geo, 300);

  // End card: the wordmark rises over the warm arc.
  const end = el('div', 'endcard');
  const mark = el('h1', 'mark');
  const markChars = [...'Qwantarc'].map((ch) => {
    const clip = el('span', 'mark-clip');
    const c = el('span', 'mark-ch', ch);
    clip.append(c);
    mark.append(clip);
    return c;
  });
  const line = el('p', 'endcard-line', 'Everything follows the arc.');
  end.append(mark, line);
  end.style.top = '150px';
  stage.append(end);
  const veil = el('div', 'layer');
  veil.style.background = 'var(--ink)';
  veil.style.zIndex = 40;
  stage.append(veil);

  const pAt = (t) => {
    if (t < 3.2) return 0.02 + 0.08 * (t / 3.2);
    if (t < 6.0) return 0.1 + 0.4 * cubicInOut((t - 3.2) / 2.8);
    if (t < 7.4) return 0.5 + 0.04 * ((t - 6.0) / 1.4);
    if (t < 10.4) return 0.54 + 0.38 * cubicInOut((t - 7.4) / 3.0);
    if (t < 12.0) return 0.92 + 0.04 * ((t - 10.4) / 1.6);
    return Math.min(1, 0.96 + 0.04 * ((t - 12) / 4));
  };
  const crossing = (v) => {
    let t = 0;
    while (pAt(t) < v) t += 0.001;
    return t;
  };
  // When each stage arrives and leaves, as the site's scroll would switch them.
  const enter = [0.35, crossing(0.36), crossing(0.72)];
  const leave = [enter[1], enter[2], 12.2];

  function charState(j, t, k) {
    const d0 = enter[k] + (k > 0 ? 0.15 : 0) + j * 0.04;
    const a = expoOut(seg(t, d0, d0 + 1.0));
    let y = 70 * (1 - a);
    let rot = -80 * (1 - a);
    let op = a;
    let blur = 8 * (1 - a);
    if (t >= leave[k]) {
      const d1 = leave[k] + j * 0.02;
      const b = power2In(seg(t, d1, d1 + 0.45));
      y += (-60 - y) * b;
      rot *= 1 - b;
      op *= 1 - b;
      blur += (6 - blur) * b;
    }
    return { y, rot, op, blur };
  }

  return {
    duration: T,
    frame(t) {
      const p = pAt(t);
      canvas.clear();
      drawJourney(canvas.ctx, t, p, geo, parts, 10.5);
      cards.forEach((c, k) => {
        c.chars.forEach((ch, j) => {
          const s = charState(j, t, k);
          ch.style.transform = `translateY(${s.y}%) rotateX(${s.rot}deg)`;
          ch.style.opacity = s.op;
          ch.style.filter = s.blur > 0.05 ? `blur(${s.blur}px)` : 'none';
        });
        const on = siteEase(seg(t, enter[k] + 0.2, enter[k] + 0.9)) * (1 - siteEase(seg(t, leave[k], leave[k] + 0.7)));
        for (const e of [c.n, c.text]) {
          e.style.opacity = on;
          e.style.transform = `translateY(${14 * (1 - on)}px)`;
        }
      });
      markChars.forEach((c, i) => {
        c.style.transform = `translateY(${110 * (1 - expoOut(seg(t, 12.55 + i * 0.05, 13.75 + i * 0.05)))}%)`;
      });
      const lo = siteEase(seg(t, 13.5, 14.3));
      line.style.opacity = lo;
      line.style.transform = `translateY(${10 * (1 - lo)}px)`;
      veil.style.opacity = Math.max(1 - seg(t, 0, 0.6), seg(t, 15.3, 16));
    },
  };
};

/* ---------- 5. Ask Qwantarc: the guide's orb ---------- */

scenes.orb = () => {
  const T = 8;
  const canvas = layer();
  const head = el('div', 'head is-center');
  head.style.top = '64px';
  head.innerHTML = `
    <h1 class="title">Ask <em>Qwantarc.</em></h1>
    <p class="lede" style="max-width:30ch">An AI guide that answers from our guidelines, and can speak its answers.</p>`;
  stage.append(head);

  const ask = el('div', 'ask');
  ask.style.top = '410px';
  ask.innerHTML = `
    <div class="ask-input"><span class="ask-ph">Ask about Qwantarc or the guidelines</span><span class="ask-typed"></span></div>
    <span class="ask-icon"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7.5" y="3" width="5" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5V17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></span>
    <span class="ask-send"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15.5v-11M5.5 9 10 4.5 14.5 9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>`;
  stage.append(ask);
  const note = el('p', 'ask-note', 'Runs in your browser. Your questions don’t leave this device.');
  note.style.top = '474px';
  stage.append(note);
  folio({ tr: 'The guide', br: 'qwantarc.com' });

  const ph = ask.querySelector('.ask-ph');
  const typed = ask.querySelector('.ask-typed');
  const send = ask.querySelector('.ask-send');
  const QUESTION = 'What is the intelligent arc?';
  const still = q.has('still');

  // The orb's particles, more of them and finer, so the ring keeps its grain at this size.
  let pseed = 11;
  const prand = () => ((pseed = (pseed * 16807) % 2147483647) - 1) / 2147483646;
  const pgauss = () => Math.sqrt(-2 * Math.log(prand() + 1e-9)) * Math.cos(2 * Math.PI * prand());
  const COUNT = 280;
  const PARTICLES = Array.from({ length: COUNT }, (_, i) => ({
    u: (i + prand() * 0.6) / COUNT,
    jitter: pgauss() * 0.9,
    size: 0.75 + prand() * 0.75,
    phase: prand() * Math.PI * 2,
  }));
  const cx = W / 2;
  const cy = 284;
  const R = 64;
  const s = R / 17;
  const WORDS = [4.5, 4.78, 5.0, 5.3, 5.62, 5.86, 6.12, 6.38, 6.6];

  function drawOrb(t) {
    const { ctx } = canvas;
    const tm = t * 1000;
    const think = smooth(seg(t, 3.1, 3.35)) * (1 - smooth(seg(t, 4.3, 4.6)));
    const speak = smooth(seg(t, 4.35, 4.65)) * (1 - smooth(seg(t, 6.7, 7.1)));
    const busy = Math.max(think, speak);
    let level = 0;
    for (const w of WORDS) if (t >= w) level = Math.max(level, 0.8 * Math.exp(-3.71 * (t - w)));
    const flow = sineInOut(seg(t, 3.1, 6.9));
    const glow = 0.22 + 0.12 * think + speak * (0.2 + Math.sin(tm * 0.008) * 0.08);

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
    g.addColorStop(0, `rgb(${EMBER} / ${glow})`);
    g.addColorStop(1, `rgb(${EMBER} / 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);

    const breathSpeed = (TAU * 2) / (T * 1000);
    const drift = TAU / (T * 1000);
    for (const p of PARTICLES) {
      const u = (p.u + flow) % 1;
      const a = -Math.PI / 2 + TAU * u;
      let r = R + p.jitter * s;
      r += Math.sin(tm * breathSpeed + a * 3 + p.phase * 0.3) * 0.7 * s;
      // The site's speaking wave, softened: at this size its full depth reads as a wobble rather than a voice.
      r += speak * Math.sin(tm * 0.012 - u * 14) * (0.6 + level * 3.2) * s * 0.65;
      let x = cx + Math.cos(a) * r;
      let y = cy + Math.sin(a) * r;
      x += Math.sin(tm * drift + p.phase) * 0.35 * s;
      y += Math.cos(tm * drift + p.phase) * 0.35 * s;
      const crown = (1 - Math.sin(a)) / 2;
      const alpha = 0.45 + crown * 0.45;
      ctx.fillStyle = `rgb(255 ${118 + Math.round(crown * 10)} 72 / ${Math.min(1, alpha)})`;
      const d = p.size * 1.45 * (1 + 0.12 * busy);
      ctx.fillRect(x - d / 2, y - d / 2, d, d);
    }
  }

  return {
    duration: T,
    frame(t) {
      canvas.clear();
      drawOrb(t);
      // Type the question, send it, then the orb thinks and speaks.
      const n = still || t >= 3.5 ? 0 : Math.floor(QUESTION.length * seg(t, 1.0, 2.9));
      const sent = seg(t, 3.05, 3.5);
      const caretOn = t > 0.9 && t < 3.05 && (t < 2.9 || Math.floor(t * 2.2) % 2 === 0);
      typed.innerHTML = n > 0 || caretOn ? `${QUESTION.slice(0, n)}${caretOn ? '<span class="caret"></span>' : ''}` : '';
      typed.style.opacity = 1 - sent;
      typed.style.transform = `translateY(${-14 * expoIn(sent)}px)`;
      ph.style.opacity = n > 0 || caretOn ? 0 : t < 3 ? 1 : siteEase(seg(t, 3.6, 4.2));
      if (t > 0.9 && t < 3.05) ask.classList.add('is-focus');
      else ask.classList.remove('is-focus');
      const press = Math.sin(Math.PI * seg(t, 2.95, 3.2));
      send.style.transform = `scale(${1 - 0.12 * press})`;
      send.style.background = press > 0.01 ? `color-mix(in srgb, var(--ember) ${Math.round(press * 100)}%, var(--bone))` : '';
    },
  };
};

/* ---------- 6. Qwantarc Interface Guidelines ---------- */

/** QigArt.astro on a canvas: fine concentric arcs bent around one point, with a single ember arc. */
function qigArt(ctx, w, h, seed) {
  const hash = (text) => {
    let v = 2166136261;
    for (let i = 0; i < text.length; i++) v = Math.imul(v ^ text.charCodeAt(i), 16777619);
    return v >>> 0;
  };
  let state = hash(seed) || 1;
  const rand = () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507) ^ Math.imul(state ^ (state >>> 13), 3266489909);
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
  const VW = 1200;
  const VH = Math.round(VW / (w / h));
  const k = w / VW;
  const cx = VW * (0.3 + rand() * 0.4);
  const cy = VH * (1.05 + rand() * 0.35);
  const px = VW * (0.2 + rand() * 0.6);
  const py = VH * (0.3 + rand() * 0.35);
  const sigma = Math.min(VW, VH) * 0.32;
  const pull = 0.4;
  const maxR = Math.hypot(Math.max(cx, VW - cx), cy) * 1.02;
  const radii = [];
  let r = VH * (0.25 + rand() * 0.2);
  let gap = 10;
  while (r < maxR) {
    radii.push(r);
    r += gap;
    gap *= 1.05;
  }
  const pr = Math.hypot(px - cx, py - cy);
  let ember = radii.findIndex((rr, i) => pr >= rr && pr < (radii[i + 1] ?? rr + gap));
  if (ember < 0) ember = Math.floor(radii.length / 3);
  const paths = radii.map((rad) => {
    const n = Math.max(40, Math.round((Math.PI * rad) / 22));
    const path = new Path2D();
    for (let j = 0; j <= n; j++) {
      const a = Math.PI + (Math.PI * j) / n;
      let x = cx + Math.cos(a) * rad;
      let y = cy + Math.sin(a) * rad;
      const dx = px - x;
      const dy = py - y;
      const f = pull * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      x += dx * f;
      y += dy * f;
      if (j) path.lineTo(x * k, y * k);
      else path.moveTo(x * k, y * k);
    }
    return path;
  });

  ctx.fillStyle = '#0d0d0c';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(px * k, py * k);
  ctx.scale(w * 0.6, h * 0.6);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  glow.addColorStop(0, 'rgb(255 112 67 / 0.16)');
  glow.addColorStop(1, 'rgb(255 112 67 / 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
  ctx.lineWidth = 1;
  paths.forEach((path, i) => {
    if (i === ember) return;
    ctx.strokeStyle = `rgb(${BONE} / ${0.06 + (1 - i / radii.length) * 0.1})`;
    ctx.stroke(path);
  });
  ctx.strokeStyle = `rgb(${EMBER})`;
  ctx.lineWidth = 1.6;
  ctx.shadowColor = `rgb(${EMBER} / 0.6)`;
  ctx.shadowBlur = 9 * DPR;
  ctx.stroke(paths[ember]);
  ctx.shadowBlur = 0;
}

scenes.qig = () => {
  const artH = Number(q.get('artH') ?? 330);
  const art = layer(W, artH);
  art.clear();
  qigArt(art.ctx, W, artH, q.get('seed') ?? 'qwantarc-interface-guidelines');
  const fade = el('div', 'layer');
  fade.style.height = `${artH}px`;
  fade.style.background = 'linear-gradient(180deg, rgb(10 10 9 / 0) 30%, rgb(10 10 9 / 0.9) 100%)';
  stage.append(fade);
  const head = el('div', 'head');
  head.style.top = `${artH - 98}px`;
  head.innerHTML = `
    <p class="eyebrow"><b>QIG</b> Qwantarc</p>
    <h1 class="title-serif">Interface Guidelines</h1>
    <p class="lede" style="max-width:none;text-wrap:balance">How Qwantarc designs software people rely on all day. Written for people, and for AI agents.</p>
    <div class="chips"><span class="chip">91 pages</span><span class="chip">Markdown for every page</span><span class="chip">MCP server</span></div>`;
  stage.append(head);
  folio({ tr: 'developer.qwantarc.com' });
  return { duration: 0, frame() {} };
};

/* ---------- 7. Qwantarc Farms: every plant follows the light ---------- */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

scenes.farms = async () => {
  await loadScript('build/garden.js');
  // The garden runs on its own clock; give it ours, and stop its loop so frames are drawn only on request.
  const realRAF = window.requestAnimationFrame.bind(window);
  let now = 0;
  performance.now = () => now;
  window.requestAnimationFrame = () => 0;

  const host = el('div', 'layer');
  host.style.width = `${W}px`;
  host.style.height = `${H}px`;
  const cv = el('canvas', 'layer');
  cv.style.width = '100%';
  cv.style.height = '100%';
  host.append(cv);
  stage.append(host);
  const head = el('div', 'head');
  head.style.top = '62px';
  head.innerHTML = `
    <p class="n">Plant nursery</p>
    <h1 class="title" style="font-size:47px;letter-spacing:-0.04em;margin-top:12px">Every plant follows the <em>light.</em></h1>
    <p class="lede">Plants for the light you have.</p>`;
  stage.append(head);
  const f = folio({ tl: 'Qwantarc <em style="font-size:1.12em">Farms</em>', tr: 'farms.qwantarc.com' });

  const garden = window.QGarden.createGarden(cv, host, {
    reduce: false,
    onTone: (light) => {
      head.classList.toggle('tone-ink', light);
      f.classList.toggle('tone-ink', light);
    },
  });
  // Let the garden's resize observer settle before the clock starts.
  await new Promise((r) => realRAF(() => realRAF(r)));

  const progress = Number(q.get('progress') ?? 0.54);
  let simT = 0;
  return {
    duration: 0,
    frame(t) {
      // Walk the plants' physics up to t at 60 steps a second, as the site would have.
      const target = 6 + t;
      while (simT < target) {
        simT += 1 / 60;
        now = simT * 1000;
        garden.state.progress = progress;
        garden.draw();
      }
    },
  };
};

/* ---------- 8. Profile picture: the Q from the favicon ---------- */

scenes.avatar = () => {
  const v = q.get('v') ?? 'mark';
  const tail = v === 'ember' ? '#ff7043' : '#ece9e3';
  const glow =
    v === 'glow'
      ? `<radialGradient id="g" cx="15" cy="15" r="15" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff7043" stop-opacity="0.3"/><stop offset="0.55" stop-color="#ff7043" stop-opacity="0.08"/><stop offset="1" stop-color="#ff7043" stop-opacity="0"/></radialGradient>`
      : '';
  // The favicon's geometry, zoomed out so the mark sits well inside Instagram's circle.
  const svg = `
    <svg class="mark-svg" viewBox="-4 -4 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>${glow}</defs>
      <rect x="-4" y="-4" width="40" height="40" fill="#0a0a09"/>
      ${glow ? '<rect x="-4" y="-4" width="40" height="40" fill="url(#g)"/>' : ''}
      <circle cx="15" cy="15" r="8.5" fill="none" stroke="#ece9e3" stroke-width="3"/>
      <path d="M18.5 18.5 24 24" stroke="${tail}" stroke-width="3.4" stroke-linecap="round"/>
    </svg>`;
  stage.insertAdjacentHTML('beforeend', svg);
  return { duration: 0, frame() {} };
};

/* ---------- 9. Story highlight covers ---------- */

/** A point on the dial icon's arc, f from 0 (left end) to 1 (right end). */
const dialAt = (f, r) => [24 + Math.cos(Math.PI * (1 + f)) * r, 34 + Math.sin(Math.PI * (1 + f)) * r].map((v) => v.toFixed(2));
const ICONS = {
  // The journey's dial: travelled in ember up to its head, with ticks at the three stops.
  arc: (() => {
    const [hx, hy] = dialAt(0.62, 15);
    const ticks = STOPS.map((f) => {
      const [x1, y1] = dialAt(f, 18.5);
      const [x2, y2] = dialAt(f, 22);
      return `<path d="M${x1} ${y1} ${x2} ${y2}" stroke="${f <= 0.62 ? '#ff7043' : 'rgb(236 233 227 / 0.45)'}"/>`;
    }).join('');
    return `<path d="M9 34A15 15 0 0 1 39 34" stroke="rgb(236 233 227 / 0.3)"/><path d="M9 34A15 15 0 0 1 ${hx} ${hy}" stroke="#ff7043"/>${ticks}<circle cx="${hx}" cy="${hy}" r="2.9" fill="#ece9e3" stroke="none"/>`;
  })(),
  // The guide's orb: a ring of ember particles over a warm glow, brightest across the top.
  guide: (() => {
    let s = 5;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const dots = Array.from({ length: 44 }, (_, i) => {
      const a = (i / 44) * Math.PI * 2 - Math.PI / 2;
      const r = 14.5 + (rnd() - 0.5) * 1.8;
      const crown = (1 - Math.sin(a)) / 2;
      const d = 1.7 + rnd() * 0.8;
      return `<rect x="${(24 + Math.cos(a) * r - d / 2).toFixed(2)}" y="${(24 + Math.sin(a) * r - d / 2).toFixed(2)}" width="${d.toFixed(2)}" height="${d.toFixed(2)}" fill="#ff7043" opacity="${(0.5 + crown * 0.5).toFixed(2)}" stroke="none"/>`;
    }).join('');
    return `<defs><radialGradient id="orb"><stop offset="0" stop-color="#ff7043" stop-opacity="0.32"/><stop offset="1" stop-color="#ff7043" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="24" r="20" fill="url(#orb)" stroke="none"/>${dots}`;
  })(),
  // Components on a grid: outlined, with one filled, which in QIG means selected.
  qig: `<rect x="10" y="10" width="12" height="12" rx="3.5" stroke="#ece9e3"/><rect x="26" y="10" width="12" height="12" rx="3.5" fill="#ff7043" stroke="#ff7043"/><rect x="10" y="26" width="12" height="12" rx="3.5" stroke="#ece9e3"/><rect x="26" y="26" width="12" height="12" rx="3.5" stroke="#ece9e3"/>`,
  // The Farms icon's sprout, scaled up to sit with the others.
  farms: `<g transform="translate(1.73 3.41) scale(1.35)"><path d="M12 26c-.4-7.4 2.6-12.6 9.4-14.6" stroke="#ece9e3" stroke-width="1.78"/><path d="M21.2 11.6c-.9-4.2 1.5-7 5.3-7.1.5 3.9-1.6 6.9-5.3 7.1z" fill="#ff7043" stroke="none"/><path d="M13.6 18.4c-3.6.4-6.4-1.5-7.1-4.8 3.4-.6 6.2 1.1 7.1 4.8z" fill="#ece9e3" stroke="none"/></g>`,
  // The enquiry arrow in its pill.
  hello: `<circle cx="24" cy="24" r="15" stroke="rgb(236 233 227 / 0.45)"/><path d="M19 29 29 19M21 19h8v8" stroke="#ff7043"/>`,
};

scenes.cover = () => {
  const icon = q.get('icon') ?? 'arc';
  const size = Math.round(W * 0.4);
  const glow = el('div', 'layer');
  glow.style.background = `radial-gradient(circle at 50% 50%, rgb(255 112 67 / 0.1), rgb(255 112 67 / 0) ${size * 1.1}px)`;
  stage.append(glow);
  stage.insertAdjacentHTML(
    'beforeend',
    `<svg viewBox="0 0 48 48" width="${size}" height="${size}" style="position:absolute;left:${(W - size) / 2}px;top:${(H - size) / 2}px" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg>`,
  );
  return { duration: 0, frame() {} };
};

/* ---------- The profile grid, from the exported posts ---------- */

scenes.grid = async () => {
  // Reading order on the profile: the newest post, 09, sits top left.
  const files = [
    'posts/09-the-arc-cover.png',
    'posts/08-manifesto-cover.png',
    'posts/07-say-hello.png',
    'posts/06-cognition.png',
    'posts/05-craft.png',
    'posts/04-comfort.png',
    'posts/03-interface-guidelines.png',
    'posts/02-ask-qwantarc-cover.png',
    'posts/01-qwantarc-farms.png',
  ];
  stage.style.background = '#fff';
  const gap = 1.2;
  const tw = (W - 2 * gap) / 3;
  const th = (tw * 4) / 3;
  await Promise.all(
    files.map(
      (f, i) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Render the posts first: ${f} is missing`));
          // Instagram shows each post cropped to 3:4 from the centre.
          img.style.cssText = `position:absolute;left:${(i % 3) * (tw + gap)}px;top:${Math.floor(i / 3) * (th + gap)}px;width:${tw}px;height:${th}px;object-fit:cover`;
          img.src = `../export/${f}?v=${Date.now()}`;
          stage.append(img);
        }),
    ),
  );
  return { duration: 0, frame() {} };
};

/* ---------- Boot ---------- */

async function main() {
  await Promise.all([
    document.fonts.load('300 40px Lexend'),
    document.fonts.load('700 40px Lexend'),
    document.fonts.load('400 40px "Instrument Serif"'),
    document.fonts.load('italic 400 40px "Instrument Serif"'),
  ]);
  await document.fonts.ready;
  const scene = await scenes[SCENE]();
  stage.append(el('div', 'grain'));
  window.sceneInfo = { duration: scene.duration ?? 0, width: W, height: H };
  window.renderFrame = (t) => scene.frame(t);
  scene.frame(Number(q.get('t') ?? 0));
  window.studioReady = true;
}

main().catch((err) => {
  window.studioError = String(err && err.stack ? err.stack : err);
  console.error(err);
});
