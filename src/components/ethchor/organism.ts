/**
 * The organism: one cloud of particles behind the whole page that takes a new form for each section.
 * It opens as an ECG trace that beats itself into a portrait, then becomes a heart, a network of
 * systems, a double helix, a potted plant and finally a hello, morphing as you scroll.
 *
 * Every form lives on the GPU at once, as vertex attributes, and the shader flies each particle from
 * one form to the next. Each form is fitted to an anchor element on the page, so the layout (and
 * its breakpoints) decides where it sits; this file only follows. The cursor parts the particles,
 * a click sends a ring through them, and holding charges a burst. The page's heartbeat swells them.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import type { Heart } from './heart';
import { ecgLine, heart as heartForm, helix, network, plant, portrait, rng, word, type Shape } from './shapes';

export type Form = 'ecg' | 'portrait' | 'heart' | 'network' | 'helix' | 'plant' | 'hello';
const FORMS: Form[] = ['ecg', 'portrait', 'heart', 'network', 'helix', 'plant', 'hello'];

/** Per form: its palette along the tone, how much the heartbeat swells it, its spin and its sway. */
const LOOK: Record<Form, { ramp: [string, string, string]; beat: number; spin: number; sway: number; fill: number }> = {
  ecg: { ramp: ['#3dff9a', '#3dff9a', '#2ee6ff'], beat: 0, spin: 0, sway: 0, fill: 1 },
  // A thermal camera's palette: cool violet, warming through magenta to amber where the skin is.
  portrait: { ramp: ['#6c5cff', '#ff3d8b', '#ffb547'], beat: 0.012, spin: 0, sway: 0.14, fill: 0.98 },
  heart: { ramp: ['#c8206f', '#ff3d8b', '#ff9a5c'], beat: 0.075, spin: 0.32, sway: 0, fill: 0.88 },
  network: { ramp: ['#2ee6ff', '#3dff9a', '#8b6cff'], beat: 0.02, spin: 0.1, sway: 0, fill: 0.92 },
  helix: { ramp: ['#8b6cff', '#ff3d8b', '#2ee6ff'], beat: 0.015, spin: 0.55, sway: 0, fill: 0.95 },
  plant: { ramp: ['#3dff9a', '#a8f06a', '#ff7a3d'], beat: 0.012, spin: 0, sway: 0.16, fill: 0.95 },
  hello: { ramp: ['#ff3d8b', '#ffd23f', '#2ee6ff'], beat: 0.03, spin: 0, sway: 0.08, fill: 0.95 },
};

export interface Stage {
  form: Form;
  /** The section whose arrival brings this form in. */
  section: HTMLElement;
  /** The element the form is fitted to. Its CSS --form-opacity, if set, dims the form there. */
  anchor: HTMLElement;
}

interface Fit {
  x: number;
  y: number;
  s: number;
}

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPR;
uniform float uSize;
uniform float uCamZ;
uniform int uFrom;
uniform int uTo;
uniform float uMix;
uniform float uSqueeze;
uniform float uBeatFrom;
uniform float uBeatTo;
uniform float uOpacity;
uniform vec3 uPointer;
uniform float uPointerOn;
uniform vec4 uPulses[4];
uniform vec3 uChargeAt;
uniform float uCharge;
uniform vec4 uBurst;
uniform float uBurstAt;
uniform float uScan;
uniform vec3 uRamp[21];

attribute vec3 aS0;
attribute vec3 aS1;
attribute vec3 aS2;
attribute vec3 aS3;
attribute vec3 aS4;
attribute vec3 aS5;
attribute vec3 aS6;
attribute vec3 aT0;
attribute vec3 aT1;
attribute vec3 aT2;
attribute float aSeed;
attribute float aLum;

varying vec3 vColor;
varying float vAlpha;

vec3 formPos(int i) {
  if (i == 0) return aS0;
  if (i == 1) return aS1;
  if (i == 2) return aS2;
  if (i == 3) return aS3;
  if (i == 4) return aS4;
  if (i == 5) return aS5;
  return aS6;
}

float formTone(int i) {
  if (i == 0) return aT0.x;
  if (i == 1) return aT0.y;
  if (i == 2) return aT0.z;
  if (i == 3) return aT1.x;
  if (i == 4) return aT1.y;
  if (i == 5) return aT1.z;
  return aT2.x;
}

vec3 ramp(int f, float t) {
  vec3 a = uRamp[f * 3];
  vec3 b = uRamp[f * 3 + 1];
  vec3 c = uRamp[f * 3 + 2];
  return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0);
}

void main() {
  float s = aSeed;
  // Particles leave at slightly different moments, so a morph flows rather than snaps.
  float t = clamp((uMix - s * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 a = formPos(uFrom);
  vec3 p = mix(a, formPos(uTo), t);
  vec3 col = mix(ramp(uFrom, formTone(uFrom)), ramp(uTo, formTone(uTo)), t);
  // In the portrait, points are bigger and brighter where the photo is bright, like a halftone.
  float pw = (uFrom == 1 ? 1.0 - t : 0.0) + (uTo == 1 ? t : 0.0);

  // Mid-flight they swirl instead of sliding straight across.
  float flight = sin(t * 3.14159265);
  p += vec3(sin(s * 91.7 + uTime * 0.9), cos(s * 47.3 + uTime * 0.8), sin(s * 13.1 + uTime * 0.7)) * flight * 0.35;
  // And they are never quite still.
  p += 0.01 * vec3(sin(uTime * 0.7 + s * 40.0), cos(uTime * 0.63 + s * 23.0), sin(uTime * 0.51 + s * 17.0));
  // The heartbeat swells the form from its centre.
  p *= 1.0 + uSqueeze * mix(uBeatFrom, uBeatTo, t);

  float glow = 0.0;

  // The intro: a sweep lights the trace as it passes, like a monitor's write head.
  if (uFrom == 0) {
    float d = a.x - uScan;
    glow += exp(-d * d / 0.004) * (1.0 - t) * 1.6;
  }

  // The cursor parts the particles and lifts them toward you.
  if (uPointerOn > 0.001) {
    vec2 d = p.xy - uPointer.xy;
    float dist = length(d);
    float k = smoothstep(0.34, 0.0, dist) * uPointerOn;
    p.xy += d / max(dist, 0.0001) * k * k * 0.16;
    p.z += k * 0.24;
    glow += k * 0.9;
  }

  // A click sends a ring outward.
  for (int i = 0; i < 4; i++) {
    vec4 pu = uPulses[i];
    float age = uTime - pu.w;
    if (age < 0.0 || age > 1.8) continue;
    vec2 d = p.xy - pu.xy;
    float dist = length(d);
    float ring = age * 2.4;
    float w = exp(-(dist - ring) * (dist - ring) / 0.018) * (1.0 - age / 1.8);
    p.xy += d / max(dist, 0.0001) * w * 0.14;
    p.z += w * 0.35;
    glow += w * 1.2;
  }

  // Holding gathers them toward the cursor, trembling; letting go bursts them outward.
  if (uCharge > 0.001) {
    vec3 d = p - uChargeAt;
    float k = smoothstep(1.5, 0.0, length(d.xy)) * uCharge;
    p -= d * k * 0.42;
    p += 0.018 * uCharge * vec3(sin(uTime * 71.0 + s * 90.0), cos(uTime * 63.0 + s * 70.0), sin(uTime * 57.0 + s * 30.0));
    glow += k * 1.1;
  }
  float age = uTime - uBurstAt;
  if (uBurst.w > 0.0 && age >= 0.0 && age < 2.6) {
    vec3 d = p - uBurst.xyz;
    float dist = length(d) + 0.15;
    float k = uBurst.w * exp(-age * 2.3) * (1.0 - exp(-age * 16.0));
    p += d / dist * k * (0.75 / dist) * (0.5 + s);
    glow += k * 0.5;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float grain = mix(0.55 + aT2.z * 0.9, 0.36 + aLum * 1.4, pw);
  gl_PointSize = uSize * grain * (1.0 + glow * 0.45 + uSqueeze * 0.18) * uPR * (uCamZ / -mv.z);
  vColor = mix(col * mix(1.0, 0.6 + 0.6 * aLum, pw), vec3(1.0), clamp(glow * 0.35, 0.0, 0.65));
  vAlpha = uOpacity * mix(0.72 + 0.28 * aT2.y, 0.42 + 0.58 * aLum, pw);
}
`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = pow(1.0 - smoothstep(0.0, 0.5, d), 1.5);
  float core = 1.0 - smoothstep(0.0, 0.18, d);
  gl_FragColor = vec4(vColor * (0.75 + 0.7 * core), a * vAlpha);
}
`;

/** The network's nodes as soft halos, the active project's in its colour, and packets on the links. */
const OVERLAY_VERTEX = /* glsl */ `
uniform float uPR;
uniform float uCamZ;
uniform float uTime;
uniform float uActive;
uniform vec3 uActiveColor;
uniform float uOpacity;
attribute vec4 aInfo;
varying vec3 vColor;
varying float vAlpha;
varying float vHalo;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float halo = 1.0 - aInfo.x;
  float on = halo * (1.0 - step(0.5, abs(aInfo.y - uActive)));
  float beat = 0.5 + 0.5 * sin(uTime * 3.2 + aInfo.w);
  float size = mix(mix(8.0, 22.0, halo), 54.0 + beat * 12.0, on);
  gl_PointSize = size * uPR * (uCamZ / -mv.z);
  vColor = mix(mix(vec3(0.92, 1.0, 0.96), vec3(0.18, 0.9, 1.0), halo), uActiveColor, on);
  vAlpha = uOpacity * mix(mix(0.95, 0.32, halo), 1.0, on);
  vHalo = halo;
}
`;

const OVERLAY_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vHalo;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float disc = 1.0 - smoothstep(0.0, 0.5, d);
  float q = (d - 0.3) / 0.05;
  float ring = exp(-q * q) * 0.8 + exp(-d * d / 0.012) * 0.9 + disc * disc * 0.35;
  float a = mix(disc * disc, ring, vHalo);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

export interface OrganismOptions {
  heart: Heart;
  stages: Stage[];
  /** The element the opening trace spans. */
  introAnchor: HTMLElement;
  intro: boolean;
  count: number;
  maxDpr: number;
  /** Font for the closing word. */
  font: string;
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAngle = (a: number, b: number, t: number) => a + wrap(b - a) * t;

export function createOrganism(canvas: HTMLCanvasElement, opts: OrganismOptions) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const CAM_Z = 6;
  const camera = new PerspectiveCamera(35, 1, 0.1, 40);
  camera.position.z = CAM_Z;
  const group = new Group();
  scene.add(group);

  /* ---------- The forms ---------- */
  const N = opts.count;
  const r = rng(7);
  const net = network(N, r);
  const shapes: Record<Form, Shape> = {
    ecg: ecgLine(N, r),
    portrait: portrait(N, r),
    heart: heartForm(N, r),
    network: net,
    helix: helix(N, r),
    plant: plant(N, r),
    hello: word(N, r, 'hello', opts.font),
  };

  const geo = new BufferGeometry();
  FORMS.forEach((f, i) => {
    const attr = new BufferAttribute(shapes[f].pos, 3);
    geo.setAttribute(`aS${i}`, attr);
    if (f === 'portrait') geo.setAttribute('position', attr);
  });
  const tones = [new Float32Array(N * 3), new Float32Array(N * 3), new Float32Array(N * 3)];
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    FORMS.forEach((f, k) => (tones[Math.floor(k / 3)][i * 3 + (k % 3)] = shapes[f].tone[i]));
    // The last vec3 also carries an alpha and a size variation per particle.
    tones[2][i * 3 + 1] = r();
    tones[2][i * 3 + 2] = r() * r();
    seeds[i] = r();
  }
  tones.forEach((t, k) => geo.setAttribute(`aT${k}`, new BufferAttribute(t, 3)));
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geo.setAttribute('aLum', new BufferAttribute(shapes.portrait.lum ?? new Float32Array(N).fill(1), 1));

  const ramp = FORMS.flatMap((f) => LOOK[f].ramp.map((c) => new Color(c)));
  const uniforms = {
    uTime: { value: 0 },
    uPR: { value: 1 },
    uSize: { value: 2.6 },
    uCamZ: { value: CAM_Z },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uMix: { value: 0 },
    uSqueeze: { value: 0 },
    uBeatFrom: { value: 0 },
    uBeatTo: { value: 0 },
    uOpacity: { value: 0 },
    uPointer: { value: new Vector3() },
    uPointerOn: { value: 0 },
    uPulses: { value: Array.from({ length: 4 }, () => new Vector4(0, 0, 0, -99)) },
    uChargeAt: { value: new Vector3() },
    uCharge: { value: 0 },
    uBurst: { value: new Vector4() },
    uBurstAt: { value: -99 },
    uScan: { value: -9 },
    uRamp: { value: ramp },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geo, material);
  points.frustumCulled = false;
  group.add(points);

  /* ---------- Network overlay: halos on the nodes, packets on the links ---------- */
  const K = net.nodes.length;
  const P = 54;
  const ovPos = new Float32Array((K + P) * 3);
  const ovInfo = new Float32Array((K + P) * 4);
  net.nodes.forEach((p, i) => {
    ovPos.set(p, i * 3);
    ovInfo.set([0, i, 1, i * 1.7], i * 4);
  });
  const packets = Array.from({ length: P }, (_, i) => ({
    edge: i % net.edges.length,
    at: r(),
    speed: (0.18 + r() * 0.22) * (i % 2 ? 1 : -1),
  }));
  packets.forEach((_, i) => ovInfo.set([1, -1, 1, 0], (K + i) * 4));
  const ovGeo = new BufferGeometry();
  const ovPosAttr = new BufferAttribute(ovPos, 3);
  ovGeo.setAttribute('position', ovPosAttr);
  ovGeo.setAttribute('aInfo', new BufferAttribute(ovInfo, 4));
  const ovUniforms = {
    uPR: uniforms.uPR,
    uCamZ: uniforms.uCamZ,
    uTime: uniforms.uTime,
    uActive: { value: -1 },
    uActiveColor: { value: new Color('#3dff9a') },
    uOpacity: { value: 0 },
  };
  const overlay = new Points(
    ovGeo,
    new ShaderMaterial({
      uniforms: ovUniforms,
      vertexShader: OVERLAY_VERTEX,
      fragmentShader: OVERLAY_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    }),
  );
  overlay.frustumCulled = false;
  group.add(overlay);

  /** A point on a link, bowed outward the way the network form draws it. */
  const onEdge = (e: number, t: number, out: Float32Array, o: number) => {
    const [a, b] = net.edges[e];
    const p = net.nodes[a];
    const q = net.nodes[b];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const mz = (p[2] + q[2]) / 2;
    const ml = Math.hypot(mx, my, mz) || 1;
    const bow = Math.sin(t * Math.PI) * 0.12;
    out[o] = p[0] + (q[0] - p[0]) * t + (mx / ml) * bow;
    out[o + 1] = p[1] + (q[1] - p[1]) * t + (my / ml) * bow;
    out[o + 2] = p[2] + (q[2] - p[2]) * t + (mz / ml) * bow;
  };

  /* ---------- Sizing ---------- */
  let cw = 1;
  let ch = 1;
  let wpp = 0.01;
  let dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr);
  const opacityOf = new Map<HTMLElement, number>();
  const netAnchor = opts.stages.find((s) => s.form === 'network')?.anchor;

  function resize() {
    cw = canvas.clientWidth || window.innerWidth;
    ch = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    wpp = (2 * CAM_Z * Math.tan((camera.fov * Math.PI) / 360)) / ch;
    uniforms.uPR.value = dpr;
    uniforms.uSize.value = cw < 700 ? 3.3 : 4.1;
    for (const st of opts.stages) {
      const v = parseFloat(getComputedStyle(st.anchor).getPropertyValue('--form-opacity'));
      opacityOf.set(st.anchor, Number.isFinite(v) ? v : 1);
    }
  }
  resize();

  const fit = (form: Form, el: HTMLElement): Fit => {
    const b = el.getBoundingClientRect();
    const sh = shapes[form];
    return {
      x: (b.left + b.width / 2 - cw / 2) * wpp,
      y: -(b.top + b.height / 2 - ch / 2) * wpp,
      s: Math.min((b.width * wpp) / sh.w, (b.height * wpp) / sh.h) * LOOK[form].fill,
    };
  };

  /* ---------- Interaction ---------- */
  const pointer = { x: 0, y: 0, on: 0, target: 0, nx: 0, ny: 0, tx: 0, ty: 0 };
  const toLocal = (x: number, y: number) =>
    group.worldToLocal(new Vector3((x - cw / 2) * wpp, -(y - ch / 2) * wpp, 0));
  let pulseIndex = 0;
  let time = 0;

  /* ---------- The frame ---------- */
  const introStart = opts.intro ? 0 : -99;
  const cur = { x: 0, y: 0, s: 1, ready: false };
  let frames = 0;
  let slow = 0;
  let drawn = N;

  function frame(t: number, dt: number) {
    time = t;
    uniforms.uTime.value = t;

    // Which two forms, and how far between them. A section's form arrives as its top climbs from
    // 86% to 36% of the screen; the opening trace plays first if the page starts at the top.
    let from = 0;
    let to = 0;
    let mix = 0;
    for (let i = 1; i < opts.stages.length; i++) {
      const top = opts.stages[i].section.getBoundingClientRect().top;
      const p = clamp01((ch * 0.86 - top) / (ch * 0.5));
      if (p > 0) {
        from = i - 1;
        to = i;
        mix = p;
      }
    }
    const introT = t - introStart;
    const intro = to === 0 ? smooth(clamp01((introT - 1.1) / 1.7)) : 1;
    const inIntro = intro < 1;

    const fromForm: Form = inIntro ? 'ecg' : opts.stages[from].form;
    const toForm: Form = inIntro ? opts.stages[0].form : opts.stages[to].form;
    const fromEl = inIntro ? opts.introAnchor : opts.stages[from].anchor;
    const toEl = inIntro ? opts.stages[0].anchor : opts.stages[to].anchor;
    const m = inIntro ? intro : mix;
    const e = smooth(m);

    const a = fit(fromForm, fromEl);
    const b = fit(toForm, toEl);
    const tx = a.x + (b.x - a.x) * e;
    const ty = a.y + (b.y - a.y) * e;
    const ts = a.s + (b.s - a.s) * e;
    const follow = cur.ready ? 1 - Math.exp(-dt * 14) : 1;
    cur.x += (tx - cur.x) * follow;
    cur.y += (ty - cur.y) * follow;
    cur.s += (ts - cur.s) * follow;
    cur.ready = true;
    group.position.set(cur.x, cur.y, 0);
    group.scale.setScalar(cur.s);

    // Spin and sway per form, blended the short way round, plus a tilt toward the cursor.
    pointer.nx += (pointer.tx - pointer.nx) * (1 - Math.exp(-dt * 4));
    pointer.ny += (pointer.ty - pointer.ny) * (1 - Math.exp(-dt * 4));
    const angle = (f: Form) => wrap(LOOK[f].spin * t + LOOK[f].sway * Math.sin(t * 0.45));
    group.rotation.y = lerpAngle(angle(fromForm), angle(toForm), e) + pointer.nx * 0.24;
    group.rotation.x = -pointer.ny * 0.14;
    group.updateMatrixWorld();

    const fi = FORMS.indexOf(fromForm);
    const ti = FORMS.indexOf(toForm);
    uniforms.uFrom.value = fi;
    uniforms.uTo.value = ti;
    uniforms.uMix.value = m;
    uniforms.uBeatFrom.value = LOOK[fromForm].beat;
    uniforms.uBeatTo.value = LOOK[toForm].beat;
    uniforms.uSqueeze.value = opts.heart.squeeze;
    uniforms.uScan.value = inIntro ? -1.25 + clamp01(introT / 1.1) * 2.5 : -9;
    const opFrom = inIntro ? 1 : opacityOf.get(fromEl) ?? 1;
    const opTo = opacityOf.get(toEl) ?? 1;
    const fadeIn = opts.intro ? clamp01(introT / 0.5) : 1;
    uniforms.uOpacity.value = (opFrom + (opTo - opFrom) * e) * fadeIn;

    pointer.on += (pointer.target - pointer.on) * (1 - Math.exp(-dt * 6));
    uniforms.uPointerOn.value = pointer.on;
    if (pointer.on > 0.001) uniforms.uPointer.value.copy(toLocal(pointer.x, pointer.y));

    // The overlay only shows once the network has fully formed.
    const netW = (fromForm === 'network' ? 1 - e : 0) + (toForm === 'network' ? e : 0);
    ovUniforms.uOpacity.value = netAnchor ? Math.pow(netW, 3) * (opacityOf.get(netAnchor) ?? 1) * 1.6 : 0;
    if (ovUniforms.uOpacity.value > 0.001) {
      packets.forEach((pk, i) => {
        pk.at = (((pk.at + pk.speed * dt) % 1) + 1) % 1;
        onEdge(pk.edge, pk.at, ovPos, (K + i) * 3);
      });
      ovPosAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);

    // If the device struggles, draw at lower resolution, then fewer particles.
    frames++;
    if (dt > 0.03) slow++;
    if (frames === 120) {
      if (slow > 50) {
        if (dpr > 1.01) {
          dpr = Math.max(1, dpr - 0.5);
          resize();
        } else if (drawn > N * 0.5) {
          drawn = Math.round(drawn * 0.7);
          geo.setDrawRange(0, drawn);
        }
      }
      frames = 0;
      slow = 0;
    }
  }

  return {
    frame,
    resize,
    setPointer(x: number, y: number, on: boolean) {
      pointer.x = x;
      pointer.y = y;
      pointer.target = on ? 1 : 0;
      pointer.tx = (x / cw) * 2 - 1;
      pointer.ty = (y / ch) * 2 - 1;
    },
    pulse(x: number, y: number) {
      const p = toLocal(x, y);
      uniforms.uPulses.value[pulseIndex].set(p.x, p.y, p.z, time);
      pulseIndex = (pulseIndex + 1) % 4;
    },
    charge(level: number, x: number, y: number) {
      uniforms.uCharge.value = level;
      if (level > 0) uniforms.uChargeAt.value.copy(toLocal(x, y));
    },
    burst(x: number, y: number, strength: number) {
      const p = toLocal(x, y);
      uniforms.uBurst.value.set(p.x, p.y, p.z, strength);
      uniforms.uBurstAt.value = time;
      uniforms.uCharge.value = 0;
    },
    /** Light the node for the project on screen, in its colour. */
    setActive(index: number, color: string) {
      ovUniforms.uActive.value = index;
      ovUniforms.uActiveColor.value.set(color);
    },
    dispose() {
      geo.dispose();
      ovGeo.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export type Organism = ReturnType<typeof createOrganism>;
