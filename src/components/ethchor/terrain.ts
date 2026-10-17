/**
 * The hero's ground: contour lines over rugged country, the way a hard problem looks on a survey
 * map. As the page scrolls they relax, hill by hill, into evenly spaced parallel lines: the same
 * ground, untangled. The cursor raises a hill wherever it goes, and the lines part around it.
 *
 * Drawn by a fragment shader, which finds each contour per pixel (antialiased by its own slope), so
 * a frame costs the GPU next to nothing at any size. Where WebGL is missing, the same ground is
 * traced with marching squares on a 2D canvas. Either way it draws only when something changes.
 */
import { traceContours } from './contour';
import { createNoise } from './noise';

export interface TerrainOptions {
  canvas: HTMLCanvasElement;
  /** Where the pointer raises the hill. */
  surface: HTMLElement;
  /** Contour colours, as hex. */
  colors: { line: string; index: string };
  /** No hill, and no drawing but on request. */
  reduce: boolean;
}

/** Contours across the ground's range (about -0.9 to 0.9), every fifth an index line. */
const LEVELS = 24;
const RANGE = 1.8;
/** The hill under the cursor: its height (in the ground's units) and spread (pixels). */
const LIFT = 0.5;
const SPREAD = 130;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const rgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
// Simplex noise after Ashima Arts and Stefan Gustavson (MIT licence).
const FRAG = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uDpr, uCalm;
uniform vec3 uHill, uLine, uIndex;
vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
  vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}
void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;
  float country=snoise(px/560.)*.62+snoise(px/240.+vec2(17.,0.))*.27+snoise(px/110.+vec2(0.,31.))*.11;
  float slope=px.y/(uRes.y/uDpr)*1.8-.9;
  float t=uCalm*uCalm*(3.-2.*uCalm);
  vec2 d=px-uHill.xy;
  float f=mix(country,slope,t)+uHill.z*${LIFT.toFixed(2)}*exp(-dot(d,d)/${(2 * SPREAD * SPREAD).toFixed(1)});
  float k=f*${(LEVELS / RANGE).toFixed(4)};
  float dist=abs(fract(k+.5)-.5)/max(fwidth(k),1e-4);
  bool index=mod(floor(k+.5),5.)<.5;
  float a=clamp((index?1.4:.9)*uDpr*.5+.5-dist,0.,1.)*(index?.85:.6);
  gl_FragColor=vec4((index?uIndex:uLine)*a,a);
}`;

/** A renderer: draws the ground for a calm and a hill. */
interface Painter {
  resize(w: number, h: number, dpr: number): void;
  paint(calm: number, hill: { x: number; y: number; amp: number }): void;
}

function glPainter(canvas: HTMLCanvasElement, colors: TerrainOptions['colors']): Painter | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const uRes = u('uRes');
  const uDpr = u('uDpr');
  const uCalm = u('uCalm');
  const uHill = u('uHill');
  gl.uniform3fv(u('uLine'), rgb(colors.line));
  gl.uniform3fv(u('uIndex'), rgb(colors.index));
  let dpr = 1;
  return {
    resize(w, h, d) {
      dpr = d;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uDpr, dpr);
    },
    paint(calm, hill) {
      gl.uniform1f(uCalm, calm);
      gl.uniform3f(uHill, hill.x, hill.y, hill.amp);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

function canvasPainter(canvas: HTMLCanvasElement, colors: TerrainOptions['colors']): Painter {
  const ctx = canvas.getContext('2d')!;
  const noise = createNoise(7);
  let w = 1;
  let h = 1;
  let dpr = 1;
  let cell = 8;
  let cols = 0;
  let rows = 0;
  let country = new Float32Array(0);
  let field = new Float32Array(0);
  return {
    resize(nw, nh, nd) {
      w = nw;
      h = nh;
      dpr = nd;
      cell = w < 700 ? 7 : 8;
      cols = Math.ceil(w / cell) + 1;
      rows = Math.ceil(h / cell) + 1;
      country = new Float32Array(cols * rows);
      field = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cell;
          const y = j * cell;
          country[j * cols + i] = noise.n2(x / 560, y / 560) * 0.62 + noise.n2(x / 240 + 17, y / 240) * 0.27 + noise.n2(x / 110, y / 110 + 31) * 0.11;
        }
      }
    },
    paint(calm, hill) {
      const e = smooth(calm);
      const lift = hill.amp * LIFT;
      const spread = 2 * SPREAD * SPREAD;
      for (let j = 0; j < rows; j++) {
        const y = j * cell;
        const slope = (y / h) * 1.8 - 0.9;
        for (let i = 0; i < cols; i++) {
          let v = country[j * cols + i] * (1 - e) + slope * e;
          if (lift > 0.002) {
            const dx = i * cell - hill.x;
            const dy = y - hill.y;
            v += lift * Math.exp(-(dx * dx + dy * dy) / spread);
          }
          field[j * cols + i] = v;
        }
      }
      const { normal, index } = traceContours(field, cols, rows, cell, -RANGE / 2, RANGE / LEVELS, LEVELS + 8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 0.9;
      ctx.stroke(normal);
      ctx.strokeStyle = colors.index;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.4;
      ctx.stroke(index);
      ctx.globalAlpha = 1;
    },
  };
}

export function createTerrain(o: TerrainOptions) {
  let canvas = o.canvas;
  let painter: Painter;
  const shaded = glPainter(canvas, o.colors);
  if (shaded) {
    painter = shaded;
    // If the GPU drops the context, build the shader again when it comes back.
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => {
      painter = glPainter(canvas, o.colors) ?? painter;
      painter.resize(w, h, dpr);
      dirty = true;
    });
  } else {
    // A canvas that has tried WebGL can't give a 2D context: trace on a fresh one.
    const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
    canvas.replaceWith(fresh);
    canvas = fresh;
    painter = canvasPainter(canvas, o.colors);
  }
  let w = 0;
  let h = 0;
  let dpr = 1;
  let calm = 0;
  let dirty = true;
  const hill = { x: 0, y: 0, tx: 0, ty: 0, amp: 0, target: 0 };

  function resize() {
    const nw = canvas.clientWidth || 1;
    const nh = canvas.clientHeight || 1;
    const nd = Math.min(window.devicePixelRatio || 1, 2);
    // A phone's toolbar coming and going resizes the window but not the hero: nothing to do.
    if (nw === w && nh === h && nd === dpr) return;
    w = nw;
    h = nh;
    dpr = nd;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    painter.resize(w, h, dpr);
    dirty = true;
  }

  function render() {
    painter.paint(calm, hill);
    dirty = false;
  }

  if (!o.reduce) {
    const local = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    o.surface.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      [hill.tx, hill.ty] = local(e);
      // A hill that has sunk away rises where the cursor is, not where it was.
      if (hill.amp < 0.02) {
        hill.x = hill.tx;
        hill.y = hill.ty;
      }
      hill.target = 1;
    });
    o.surface.addEventListener('pointerleave', () => (hill.target = 0));
  }

  resize();

  return {
    /** Ease the hill toward the cursor and draw, if anything changed. */
    frame(dt: number) {
      const k = 1 - Math.exp(-dt * 9);
      const dx = hill.tx - hill.x;
      const dy = hill.ty - hill.y;
      const da = hill.target - hill.amp;
      if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3 || Math.abs(da) > 0.002) {
        hill.x += dx * k;
        hill.y += dy * k;
        hill.amp += da * (1 - Math.exp(-dt * 3.5));
        dirty = true;
      }
      if (dirty) render();
    },
    resize,
    /** How untangled the ground is, 0 (rugged) to 1 (parallel lines). */
    setCalm(p: number) {
      const v = Math.max(0, Math.min(1, p));
      if (Math.abs(v - calm) > 0.0005) {
        calm = v;
        dirty = true;
      }
    },
    render,
  };
}

export type Terrain = ReturnType<typeof createTerrain>;
