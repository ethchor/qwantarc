/**
 * The site guide: a small orb of dots that answers questions about Qwantarc and QIG.
 * Engines, best first: on-device (the browser's built-in model), cloud (qwantarc.com/api/ask), search only.
 * Answers point to pages with "Go to" chips; the guide never navigates on its own.
 */
import { search, type Entry } from '../../lib/search';

type Engine = 'device' | 'cloud' | 'search';
type Link = { path: string; title: string; href: string };
type Message = { role: 'user' | 'assistant'; content: string; links?: Link[] };
type OrbState = 'idle' | 'thinking' | 'listening' | 'speaking';

const SYSTEM = `You are the guide on Qwantarc's websites: qwantarc.com (the company) and developer.qwantarc.com (Qwantarc Interface Guidelines, QIG, Qwantarc's design system).
Help people find their way and answer questions about Qwantarc and QIG.
- Answer in one to three short sentences of plain text. No headings, no lists, no Markdown.
- Answer from the context you are given; it is the site's own content, so use it confidently. Only if it truly doesn't cover the question, say so and point to the closest page.
- When a page would help, add up to three lines at the very end, each exactly: GO: <path> using paths from the context. Never invent paths.
- For getting in touch, point to /contact (an enquiry form) or vimu@qwantarc.com.
- Don't ask for personal details. Be calm, specific and brief.`;

const STORE = 'qw-guide';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isLocal = !/qwantarc\.com$/.test(location.hostname);
const onDeveloper = location.pathname.startsWith('/design');

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const root = $<HTMLElement>('[data-guide]');
const orbBtn = $<HTMLButtonElement>('[data-guide-orb]', root);
const panel = $<HTMLElement>('[data-guide-panel]', root);
const log = $<HTMLElement>('[data-guide-log]', root);
const form = $<HTMLFormElement>('[data-guide-form]', root);
const input = $<HTMLTextAreaElement>('[data-guide-input]', root);
const micBtn = $<HTMLButtonElement>('[data-guide-mic]', root);
const sendBtn = $<HTMLButtonElement>('[data-guide-send]', root);
const speakBtn = $<HTMLButtonElement>('[data-guide-speak]', root);
const clearBtn = $<HTMLButtonElement>('[data-guide-clear]', root);
const engineLabel = $<HTMLElement>('[data-guide-engine]', root);
const note = $<HTMLElement>('[data-guide-note]', root);
const engineSwitch = $<HTMLElement>('[data-guide-switch]', root);
const engineButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-engine-choice]')];

/* ---------------------------------------------------------------------------------------------- */
/* Orb                                                                                             */
/* ---------------------------------------------------------------------------------------------- */

const orbState = { mode: 'idle' as OrbState, near: 0, level: 0 };
/** The pointer in page coordinates; particles part around it like the arc journey on the landing page. */
const ptr = { x: -9999, y: -9999 };
const canvases = [...root.querySelectorAll<HTMLCanvasElement>('[data-guide-dots]')];

/**
 * The orb is the landing page's "Comfort" particles closed into a ring: ember particles breathing
 * over a warm glow. Thinking makes them flow around the ring, listening deepens the breath,
 * speaking runs a wave through it, and a nearby pointer draws them toward it.
 */
let pseed = 11;
const prand = () => ((pseed = (pseed * 16807) % 2147483647) - 1) / 2147483646;
const pgauss = () => Math.sqrt(-2 * Math.log(prand() + 1e-9)) * Math.cos(2 * Math.PI * prand());
const SPAN_FROM = -Math.PI / 2;
const SPAN = Math.PI * 2;
const PARTICLES = Array.from({ length: 92 }, (_, i) => ({
  u: (i + prand() * 0.6) / 92,
  jitter: pgauss() * 0.9,
  size: 0.75 + prand() * 0.75,
  phase: prand() * Math.PI * 2,
}));
const glowLevel = { v: 0 };

function drawOrb(canvas: HTMLCanvasElement, t: number) {
  const size = canvas.clientWidth;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const s = size / 56;
  const cx = size / 2;
  const cy = size / 2;
  const R = 17 * s;
  const { mode, near } = orbState;
  const rect = canvas.getBoundingClientRect();
  const lx = ptr.x - rect.left;
  const ly = ptr.y - rect.top;
  const reach = 13 * s;

  // Warm light behind the arc, brighter when active.
  const target = mode === 'idle' ? 0.22 + near * 0.12 : mode === 'thinking' ? 0.34 : 0.42 + Math.sin(t * 0.008) * 0.08;
  glowLevel.v += (target - glowLevel.v) * 0.08;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
  g.addColorStop(0, `rgb(255 112 67 / ${glowLevel.v})`);
  g.addColorStop(1, 'rgb(255 112 67 / 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  if (mode === 'speaking') orbState.level *= 0.94;
  const flow = mode === 'thinking' ? t * 0.00035 : 0;
  const breathAmp = mode === 'listening' ? 1.9 : 0.7;
  const breathSpeed = mode === 'listening' ? 0.006 : 0.0016;
  for (const p of PARTICLES) {
    const u = (p.u + flow) % 1;
    const a = SPAN_FROM + SPAN * u;
    let r = R + p.jitter * s;
    r += Math.sin(t * breathSpeed + a * 3 + p.phase * 0.3) * breathAmp * s;
    if (mode === 'speaking') r += Math.sin(t * 0.012 - u * 14) * (0.6 + orbState.level * 3.2) * s;
    let x = cx + Math.cos(a) * r;
    let y = cy + Math.sin(a) * r;
    if (!reduce) {
      x += Math.sin(t * 0.0009 + p.phase) * 0.35 * s;
      y += Math.cos(t * 0.0008 + p.phase) * 0.35 * s;
    }
    // Particles part around the cursor or finger, with the journey's falloff.
    const dx = x - lx;
    const dy = y - ly;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < reach) {
      const push = (1 - dist / reach) ** 2 * 7 * s;
      x += (dx / dist) * push;
      y += (dy / dist) * push;
    }
    // Brightest across the top of the ring, softer underneath.
    const crown = (1 - Math.sin(a)) / 2;
    const alpha = 0.45 + crown * 0.45 + near * 0.1;
    ctx.fillStyle = `rgb(255 ${118 + Math.round(crown * 10)} 72 / ${Math.min(1, alpha)})`;
    const d = p.size * s * (mode === 'idle' ? 1 : 1.12);
    ctx.fillRect(x - d / 2, y - d / 2, d, d);
  }
}

function orbLoop(t: number) {
  for (const cv of canvases) if (cv.offsetParent !== null) drawOrb(cv, t);
  if (!reduce) requestAnimationFrame(orbLoop);
}
requestAnimationFrame(orbLoop);

// Track the pointer: the glow warms as it approaches and the particles part where it touches.
window.addEventListener(
  'pointermove',
  (e) => {
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    const b = orbBtn.getBoundingClientRect();
    const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
    orbState.near = Math.max(0, 1 - d / 180);
  },
  { passive: true },
);
document.addEventListener('pointerleave', () => {
  ptr.x = ptr.y = -9999;
  orbState.near = 0;
});
window.addEventListener('pointerup', (e) => {
  // A finger lifts: let the ring close again.
  if (e.pointerType !== 'mouse') ptr.x = ptr.y = -9999;
});

const setMode = (mode: OrbState) => {
  orbState.mode = mode;
  root.dataset.mode = mode;
};

/* ---------------------------------------------------------------------------------------------- */
/* Site index                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

let entries: Entry[] | null = null;
async function loadIndex(): Promise<Entry[]> {
  if (entries) return entries;
  try {
    const res = await fetch('/ai/index.json');
    entries = ((await res.json()) as { entries: Entry[] }).entries;
  } catch {
    entries = [];
  }
  return entries;
}

const hrefFor = (e: Entry) => (isLocal ? e.path : e.url);
const titleFor = (e: Entry) => (e.path === '/' ? 'Qwantarc home' : e.path === '/contact' ? 'Contact' : e.title);

function contextFor(all: Entry[], query: string): string {
  const hits = search(all, query, 4);
  const pages = hits.length ? hits.map((h) => h.entry) : all.filter((e) => e.path === '/' || e.path === '/design/qig');
  return pages
    .map((e) => {
      const hit = hits.find((h) => h.entry === e);
      return `[${e.path}] ${e.title}: ${e.summary}\n${(hit?.excerpt ?? e.text).slice(0, 600)}`;
    })
    .join('\n\n');
}

/* ---------------------------------------------------------------------------------------------- */
/* Engines                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

interface LanguageModelSession {
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}
interface LanguageModelStatic {
  availability(options?: unknown): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options?: unknown): Promise<LanguageModelSession>;
}
const LM = (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
const LM_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

let engine: Engine = 'cloud';
let deviceState: 'none' | 'downloadable' | 'available' = 'none';
let session: LanguageModelSession | null = null;
const ENGINE_KEY = 'qw-guide-engine';
const preferred = (): Engine | null => {
  try {
    const v = localStorage.getItem(ENGINE_KEY);
    return v === 'device' || v === 'cloud' ? v : null;
  } catch {
    return null;
  }
};

async function detect() {
  if (LM?.availability) {
    try {
      const a = await LM.availability(LM_OPTIONS);
      deviceState = a === 'available' ? 'available' : a === 'downloadable' || a === 'downloading' ? 'downloadable' : 'none';
    } catch {
      deviceState = 'none';
    }
  }
  // On-device when it's ready and the person hasn't chosen the cloud; otherwise the cloud.
  engine = deviceState === 'available' && preferred() !== 'cloud' ? 'device' : 'cloud';
  renderEngine();
}

const NOTES: Record<Engine, string> = {
  device: 'Runs in your browser. Your questions don’t leave this device.',
  cloud: 'Answers come from Qwantarc’s server on Cloudflare. Don’t share personal details.',
  search: 'AI isn’t available right now, so the guide shows the closest pages.',
};

function renderEngine() {
  root.dataset.engine = engine;
  note.textContent = NOTES[engine];
  // The switch shows only when on-device AI is possible here; otherwise a plain label.
  const canChoose = deviceState !== 'none';
  engineSwitch.hidden = !canChoose;
  engineLabel.parentElement!.hidden = canChoose;
  engineLabel.textContent = engine === 'search' ? 'Search' : 'Cloud AI';
  for (const b of engineButtons) b.setAttribute('aria-pressed', String(b.dataset.engineChoice === engine));
}

async function deviceSession(): Promise<LanguageModelSession> {
  if (session) return session;
  session = await LM!.create({ ...LM_OPTIONS, initialPrompts: [{ role: 'system', content: SYSTEM }] });
  return session;
}

async function useDevice() {
  if (deviceState === 'available') {
    engine = 'device';
    renderEngine();
    return;
  }
  // First use on this device: Chrome downloads its model once.
  for (const b of engineButtons) b.disabled = true;
  note.textContent = 'Downloading the on-device model once. You can keep using the cloud meanwhile…';
  try {
    session = await LM!.create({
      ...LM_OPTIONS,
      initialPrompts: [{ role: 'system', content: SYSTEM }],
      monitor(m: EventTarget) {
        m.addEventListener('downloadprogress', (e) => {
          note.textContent = `Downloading the on-device model… ${Math.round(((e as ProgressEvent).loaded || 0) * 100)}%`;
        });
      },
    });
    deviceState = 'available';
    engine = 'device';
  } catch {
    engine = 'cloud';
    note.textContent = 'Couldn’t set up on-device AI here. The cloud guide still works.';
  }
  for (const b of engineButtons) b.disabled = false;
  renderEngine();
}

for (const b of engineButtons) {
  b.addEventListener('click', () => {
    const choice = b.dataset.engineChoice as Engine;
    try {
      localStorage.setItem(ENGINE_KEY, choice);
    } catch {
      // storage unavailable
    }
    if (choice === 'device') void useDevice();
    else {
      engine = 'cloud';
      renderEngine();
    }
  });
}

async function* streamDevice(question: string, all: Entry[]): AsyncGenerator<string> {
  const s = await deviceSession();
  const prompt = `The person is on: ${location.pathname}\n\nContext:\n${contextFor(all, question)}\n\nQuestion: ${question}`;
  const reader = s.promptStreaming(prompt).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

async function* streamCloud(history: Message[]): AsyncGenerator<string> {
  // PUBLIC_GUIDE_ASK points local development at `wrangler dev`; production uses qwantarc.com.
  const endpoint =
    import.meta.env.PUBLIC_GUIDE_ASK ?? (location.hostname === 'qwantarc.com' ? '/api/ask' : 'https://qwantarc.com/api/ask');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      page: location.pathname,
      messages: history.slice(-6).map(({ role, content }) => ({ role, content })),
    }),
  });
  if (!res.ok || !res.body) throw new Error(`cloud ${res.status}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += value;
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const data = ev.replace(/^data:\s*/, '').trim();
      if (!data || data === '[DONE]') continue;
      try {
        yield (JSON.parse(data) as { t: string }).t;
      } catch {
        // skip
      }
    }
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Conversation                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

let messages: Message[] = [];
try {
  messages = JSON.parse(sessionStorage.getItem(STORE) ?? '[]');
} catch {
  messages = [];
}

/* The two sites don't share storage, so a link from one to the other carries the conversation in
   the URL fragment (never sent to a server). It is read here and removed from the address bar. */
const HANDOFF = '#qw-guide=';
const encode = (value: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const decode = (text: string) =>
  JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
let handedOff = false;
if (location.hash.startsWith(HANDOFF)) {
  try {
    const carried = decode(location.hash.slice(HANDOFF.length)) as { m: Message[] };
    if (Array.isArray(carried.m)) {
      messages = carried.m.slice(-12);
      handedOff = true;
    }
  } catch {
    // ignore a damaged fragment
  }
  history.replaceState(history.state, '', location.pathname + location.search);
}
const save = () => {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-20)));
  } catch {
    // storage unavailable
  }
};
if (handedOff) save();

const SUGGESTIONS = onDeveloper
  ? ['What are the rules?', 'How should a delete button work?', 'Use QIG with Claude Code']
  : ['What does Qwantarc do?', 'How do I get in touch?', 'Show me the design guidelines'];

/** Splits a raw answer into what to show and the pages it points to. */
function parseAnswer(raw: string, all: Entry[]): { text: string; links: Link[] } {
  const paths = [...raw.matchAll(/GO:\s*(\S+)/g)].map((m) => m[1].replace(/[.,;)]+$/, ''));
  const lines = raw.split('\n').filter((l) => !/^\s*GO:/.test(l));
  // Hide a "GO:" line that is still arriving.
  if (lines.length && /^\s*G?O?:?\s*$/.test(lines[lines.length - 1]) && lines[lines.length - 1].trim()) lines.pop();
  const byPath = new Map(all.map((e) => [e.path, e]));
  let text = lines.join('\n').trim();
  // Name pages instead of showing their paths.
  text = text.replace(/(\/design\/qig(?:\/[a-z0-9-]+)?|\/contact)\b/g, (p) => {
    const e = byPath.get(p);
    return e ? titleFor(e) : p;
  });
  const links: Link[] = [];
  for (const p of paths) {
    const e = byPath.get(p) ?? byPath.get(p.replace(/^https?:\/\/[^/]+/, ''));
    const here = e?.path === (location.pathname.replace(/\/$/, '') || '/');
    if (e && !here && !links.some((l) => l.path === e.path)) links.push({ path: e.path, title: titleFor(e), href: hrefFor(e) });
  }
  return { text, links: links.slice(0, 3) };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderLinks(links: Link[]) {
  const row = el('div', 'guide-links');
  const here = location.pathname.replace(/\/$/, '') || '/';
  for (const l of links.filter((link) => link.path !== here)) {
    const a = el('a', 'guide-chip');
    a.href = l.href;
    a.append(`Go to ${l.title}`);
    const arrow = el('span', 'guide-chip-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    a.append(arrow);
    row.append(a);
  }
  return row;
}

function render() {
  log.replaceChildren();
  if (!messages.length) {
    const hello = el('div', 'guide-hello');
    hello.append(
      el('p', 'guide-hello-title', 'Hi, I’m the Qwantarc guide.'),
      el('p', 'guide-hello-text', 'Ask about Qwantarc, getting in touch, or anything in the interface guidelines.'),
    );
    const chips = el('div', 'guide-suggest');
    for (const s of SUGGESTIONS) {
      const b = el('button', 'guide-suggestion', s);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (speakReplies) unlockSpeech();
        ask(s);
      });
      chips.append(b);
    }
    hello.append(chips);
    log.append(hello);
  }
  for (const m of messages) log.append(renderMessage(m));
  clearBtn.hidden = !messages.length;
  log.scrollTop = log.scrollHeight;
}

function renderMessage(m: Message) {
  const item = el('div', `guide-msg is-${m.role}`);
  item.append(el('p', 'guide-msg-text', m.content));
  if (m.links?.length) item.append(renderLinks(m.links));
  return item;
}

/* ---------------------------------------------------------------------------------------------- */
/* Asking                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

let busy = false;
let speakReplies = false;
try {
  speakReplies = localStorage.getItem('qw-guide-speak') === '1';
} catch {
  // storage unavailable
}
speakBtn.setAttribute('aria-pressed', String(speakReplies));

async function ask(question: string) {
  question = question.trim().slice(0, 600);
  if (!question || busy) return;
  busy = true;
  sendBtn.disabled = true;
  input.value = '';
  autosize();
  messages.push({ role: 'user', content: question });
  render();
  const answer: Message = { role: 'assistant', content: '' };
  const node = renderMessage(answer);
  node.classList.add('is-thinking');
  const textNode = node.querySelector('.guide-msg-text')!;
  textNode.textContent = '…';
  log.append(node);
  log.scrollTop = log.scrollHeight;
  log.setAttribute('aria-busy', 'true');
  setMode('thinking');

  const all = await loadIndex();
  let raw = '';
  let spokenTo = 0;
  const voice = speakReplies && 'speechSynthesis' in window;
  if (voice) {
    stopSpeaking();
    answerStreaming = true;
  }
  const pump = async (gen: AsyncGenerator<string>) => {
    for await (const chunk of gen) {
      raw += chunk;
      const { text } = parseAnswer(raw, all);
      textNode.textContent = text || '…';
      if (voice) spokenTo = speakNewSentences(text, spokenTo, false);
      node.classList.remove('is-thinking');
      log.scrollTop = log.scrollHeight;
    }
  };

  try {
    if (engine === 'device') {
      try {
        await pump(streamDevice(question, all));
      } catch {
        engine = 'cloud';
        renderEngine();

        raw = '';
        await pump(streamCloud(messages));
      }
    } else if (engine === 'cloud') {
      await pump(streamCloud(messages));
    } else {
      throw new Error('search only');
    }
  } catch {
    // No AI answer this time (offline, busy or unsupported): show the closest pages instead.
    const hits = search(all, question, 3);
    const lead = engine === 'search' ? '' : 'I couldn’t reach the AI just now. ';
    raw = hits.length
      ? `${lead}Here’s where that’s covered.\n${hits.map((h) => `GO: ${h.entry.path}`).join('\n')}`
      : `${lead}I couldn’t find that on this site. You can browse the guidelines or get in touch.\nGO: /design/qig\nGO: /contact`;
  }

  const { text, links } = parseAnswer(raw, all);
  answer.content = text || 'Here are some pages that might help.';
  answer.links = links.length ? links : search(all, question, 2).map((h) => ({ path: h.entry.path, title: titleFor(h.entry), href: hrefFor(h.entry) }));
  messages.push(answer);
  save();
  render();
  log.setAttribute('aria-busy', 'false');
  busy = false;
  sendBtn.disabled = false;
  if (voice) {
    answerStreaming = false;
    speakNewSentences(answer.content, Math.min(spokenTo, answer.content.length), true);
    if (!pendingUtterances) setMode('idle');
  } else setMode('idle');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (speakReplies) unlockSpeech();
  ask(input.value);
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (speakReplies) unlockSpeech();
    ask(input.value);
  }
});
const autosize = () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
};
input.addEventListener('input', autosize);

clearBtn.addEventListener('click', () => {
  messages = [];
  save();
  session?.destroy();
  session = null;
  render();
  input.focus();
});

/* ---------------------------------------------------------------------------------------------- */
/* Voice                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const SR = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
  .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
let rec: Recognition | null = null;
micBtn.hidden = !SR;

function listen() {
  if (!SR || busy) return;
  if (rec) {
    rec.stop();
    return;
  }
  rec = new SR();
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    input.value = finalText || interim;
    autosize();
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') note.textContent = 'Microphone access is off. Type your question instead.';
  };
  rec.onend = () => {
    rec = null;
    micBtn.setAttribute('aria-pressed', 'false');
    if (orbState.mode === 'listening') setMode('idle');
    if (finalText.trim()) ask(finalText);
  };
  micBtn.setAttribute('aria-pressed', 'true');
  setMode('listening');
  try {
    rec.start();
  } catch {
    rec = null;
    setMode('idle');
  }
}
micBtn.addEventListener('click', () => {
  if (speakReplies) unlockSpeech();
  listen();
});

/* Spoken replies use the device's own voices: free, private and instant. Each sentence is spoken as
   soon as it arrives, so the guide starts talking while the rest of the answer is still streaming.
   The most natural voice available is chosen (Edge's "Natural", Chrome's Google and Apple's
   Premium or Enhanced voices). */
let pendingUtterances = 0;
let answerStreaming = false;

/** Speech must start from a tap on some devices (iOS): speak silence once inside the gesture. */
function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

function stopSpeaking() {
  pendingUtterances = 0;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  orbState.level = 0;
}

/** Picks the most natural voice the device offers for the reader's language. */
function bestVoice(): SpeechSynthesisVoice | undefined {
  const lang = (navigator.language || 'en-US').toLowerCase();
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang.split('-')[0]));
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural/i.test(v.name) ? 40 : 0) +
    (/premium|enhanced|siri/i.test(v.name) ? 30 : 0) +
    (/google/i.test(v.name) ? 20 : 0) +
    (/ava|samantha|zoe|serena|aria|jenny|emma|andrew|daniel/i.test(v.name) ? 10 : 0) +
    (v.lang.toLowerCase() === lang ? 5 : 0) +
    (v.localService ? 0 : 3);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

/** Queues one piece of text; the orb speaks until the last queued piece ends. */
function say(text: string) {
  if (!('speechSynthesis' in window) || !text.trim()) return;
  const u = new SpeechSynthesisUtterance(text.trim());
  const voice = bestVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? navigator.language ?? 'en-US';
  u.onstart = () => setMode('speaking');
  u.onboundary = () => (orbState.level = 0.8);
  const done = () => {
    pendingUtterances = Math.max(0, pendingUtterances - 1);
    if (!pendingUtterances && !answerStreaming) {
      orbState.level = 0;
      setMode('idle');
    }
  };
  u.onend = done;
  u.onerror = done;
  pendingUtterances++;
  speechSynthesis.speak(u);
}

/** Speaks the finished sentences of a streaming answer that haven't been spoken yet; returns the new offset. */
function speakNewSentences(text: string, spokenTo: number, final: boolean): number {
  if (final) {
    say(text.slice(spokenTo));
    return text.length;
  }
  const rest = text.slice(spokenTo);
  const match = rest.match(/^[\s\S]*[.!?…](?=\s)/);
  if (!match) return spokenTo;
  say(match[0]);
  return spokenTo + match[0].length;
}
// Voices load asynchronously in some browsers.
if ('speechSynthesis' in window) speechSynthesis.getVoices();

speakBtn.hidden = !('speechSynthesis' in window);
speakBtn.addEventListener('click', () => {
  unlockSpeech();
  speakReplies = !speakReplies;
  speakBtn.setAttribute('aria-pressed', String(speakReplies));
  try {
    localStorage.setItem('qw-guide-speak', speakReplies ? '1' : '0');
  } catch {
    // storage unavailable
  }
  if (!speakReplies) stopSpeaking();
});

/* ---------------------------------------------------------------------------------------------- */
/* Open, close, hold to talk                                                                       */
/* ---------------------------------------------------------------------------------------------- */

log.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a.guide-chip');
  if (!a) return;
  rememberOpen(true);
  if (a.origin !== location.origin) a.href = `${a.href.split('#')[0]}${HANDOFF}${encode({ m: messages.slice(-12) })}`;
});

const OPEN_KEY = 'qw-guide-open';
const rememberOpen = (open: boolean) => {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    // storage unavailable
  }
};
window.addEventListener('pagehide', () => rememberOpen(!panel.hidden));

let detected = false;
function open(withVoice = false, restoring = false) {
  panel.hidden = false;
  panel.classList.toggle('is-restored', restoring);
  root.dataset.open = 'true';
  orbBtn.setAttribute('aria-expanded', 'true');
  if (!detected) {
    detected = true;
    detect();
    loadIndex();
  }
  render();
  if (withVoice) {
    if (speakReplies) unlockSpeech();
    listen();
  } else if (!restoring) requestAnimationFrame(() => input.focus());
}
function close() {
  panel.hidden = true;
  root.dataset.open = 'false';
  orbBtn.setAttribute('aria-expanded', 'false');
  rec?.stop();
  stopSpeaking();
  setMode('idle');
  orbBtn.focus();
}

let holdTimer = 0;
let held = false;
orbBtn.addEventListener('pointerdown', () => {
  held = false;
  if (!SR) return;
  holdTimer = window.setTimeout(() => {
    held = true;
    navigator.vibrate?.(10);
    open(true);
  }, 480);
});
const cancelHold = () => clearTimeout(holdTimer);
orbBtn.addEventListener('pointerup', cancelHold);
orbBtn.addEventListener('pointerleave', cancelHold);
orbBtn.addEventListener('contextmenu', (e) => e.preventDefault());
orbBtn.addEventListener('click', () => {
  if (held) return;
  panel.hidden ? open() : close();
});
$<HTMLButtonElement>('[data-guide-close]', root).addEventListener('click', close);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !panel.hidden) close();
});

renderEngine();

// Reopen where the person left off: after a page change on this site, or when arriving from the other one.
let wasOpen = false;
try {
  wasOpen = sessionStorage.getItem(OPEN_KEY) === '1';
} catch {
  // storage unavailable
}
if (handedOff || wasOpen) open(false, true);
