#!/usr/bin/env node
/**
 * Renders the Qwantarc Instagram set into ../export.
 *
 *   node social/instagram/studio/render.mjs              everything
 *   node social/instagram/studio/render.mjs hero farms   only these jobs
 *   node social/instagram/studio/render.mjs --stills     skip videos and GIFs
 *
 * Needs ffmpeg on the PATH, Playwright with Chromium, and the repo's own dependencies (npm install),
 * which provide esbuild for bundling the Farms garden straight from src/.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const outDir = path.resolve(here, '../export');
const require = createRequire(path.join(repo, 'package.json'));
const esbuild = require('esbuild');
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}

/** 432 logical pixels export as 1080. */
const SCALE = 2.5;
const GIF_SCALE = 1.25;
const SIZES = { post: [432, 540], reel: [432, 768], square: [432, 432], grid: [432, 576] };

const post = (name, scene, extra = {}) => ({ name, scene, format: 'post', ...extra });
const JOBS = [
  // Profile picture, plus two alternates.
  { name: 'avatar', scene: 'avatar', format: 'square', params: { v: 'mark' }, out: 'profile/profile-picture.png' },
  { name: 'avatar-glow', scene: 'avatar', format: 'square', params: { v: 'glow' }, out: 'profile/alternates/profile-picture-glow.png' },
  { name: 'avatar-ember', scene: 'avatar', format: 'square', params: { v: 'ember' }, out: 'profile/alternates/profile-picture-ember.png' },

  // The launch grid, numbered in posting order (01 goes up first and ends bottom right).
  post('farms', 'farms', { out: 'posts/01-qwantarc-farms.png' }),
  post('orb', 'orb', { video: true, cover: 2.92, out: 'posts/02-ask-qwantarc' }),
  post('qig', 'qig', { out: 'posts/03-interface-guidelines.png' }),
  post('comfort', 'journey', { params: { stage: 2 }, out: 'posts/04-comfort.png' }),
  post('craft', 'journey', { params: { stage: 1 }, out: 'posts/05-craft.png' }),
  post('cognition', 'journey', { params: { stage: 0 }, out: 'posts/06-cognition.png' }),
  post('hello', 'hello', { out: 'posts/07-say-hello.png' }),
  post('manifesto', 'manifesto', { video: true, cover: 6.6, out: 'posts/08-manifesto' }),
  post('hero', 'hero', { video: true, cover: 5.0, out: 'posts/09-the-arc' }),

  // Reels and Stories.
  { name: 'journey-reel', scene: 'journeyReel', format: 'reel', video: true, gif: false, cover: [14.6, 11.2], out: 'reels/the-arc-journey' },
  { name: 'hero-story', scene: 'hero', format: 'reel', video: true, gif: false, cover: 5.0, out: 'stories/the-arc-story' },

  // Story highlight covers, square: Instagram crops them to a circle from the centre.
  ...['arc', 'guide', 'qig', 'farms', 'hello'].map((icon) => ({
    name: `cover-${icon}`,
    scene: 'cover',
    format: 'square',
    params: { icon },
    out: `highlights/${icon}.png`,
  })),

  // The profile grid as Instagram will show it, from the exported posts. Keep it last.
  { name: 'grid', scene: 'grid', format: 'grid', params: { grain: '0' }, out: 'grid-preview.png' },
];

// --set key=value passes a scene parameter, and --suffix -name writes alongside instead of over the export,
// so a variation can be tried without touching the real files.
const args = process.argv.slice(2);
const flag = (name) => args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));
const stillsOnly = args.includes('--stills');
const overrides = Object.fromEntries(flag('--set').map((kv) => kv.split('=')));
const suffix = flag('--suffix')[0] ?? '';
// --at 1.5,3,8.2 renders just those moments of each job into studio/build/preview, to check motion frame by frame.
const at = flag('--at')[0]?.split(',').map(Number);
const valued = new Set(args.flatMap((a, i) => (['--set', '--suffix', '--at'].includes(a) ? [i + 1] : [])));
const wanted = args.filter((a, i) => !a.startsWith('--') && !valued.has(i));
const jobs = (wanted.length ? JOBS.filter((j) => wanted.includes(j.name)) : JOBS).map((j) => ({
  ...j,
  params: { ...j.params, ...overrides },
  out: suffix ? j.out.replace(/(\.png)?$/, `${suffix}$1`) : j.out,
}));
if (wanted.length && jobs.length !== wanted.length) {
  const known = new Set(JOBS.map((j) => j.name));
  throw new Error(`Unknown job: ${wanted.filter((w) => !known.has(w)).join(', ')}`);
}

/* ---------- Bundle the Farms garden from the site's source ---------- */

async function bundleGarden() {
  await esbuild.build({
    entryPoints: [path.join(repo, 'src/components/farms/garden.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'QGarden',
    outfile: path.join(here, 'build/garden.js'),
    target: 'chrome120',
    logLevel: 'warning',
    plugins: [
      {
        // The site caps the garden at 1.6x on phones to save battery; a post needs the full 2.5x.
        name: 'full-resolution',
        setup(b) {
          b.onLoad({ filter: /garden\.ts$/ }, async (a) => {
            const code = await readFile(a.path, 'utf8');
            const lifted = code.replace(
              'Math.min(window.devicePixelRatio || 1, narrow ? 1.6 : 2)',
              '(window.devicePixelRatio || 1)',
            );
            if (lifted === code) throw new Error('garden.ts changed: update the resolution patch in render.mjs');
            return { contents: lifted, loader: 'ts' };
          });
        },
      },
    ],
  });
}

/* ---------- Serve the studio ---------- */

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
function serve(root) {
  const server = createServer(async (req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://studio').pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* ---------- Capture ---------- */

async function open(browser, base, job, scale, extra = {}) {
  const [width, height] = SIZES[job.format];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => console.error(`  [${job.name}] ${e.message}`));
  const qs = new URLSearchParams({ scene: job.scene, format: job.format, ...job.params, ...extra });
  await page.goto(`${base}/studio/index.html?${qs}`);
  await page.waitForFunction(() => window.studioReady === true || window.studioError, null, { timeout: 60_000 });
  const err = await page.evaluate(() => window.studioError);
  if (err) throw new Error(`${job.name}: ${err}`);
  return page;
}

async function still(page, t, file) {
  await page.evaluate((v) => window.renderFrame(v), t);
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, type: 'png' });
}

function ffmpeg(argv) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...argv], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve())));
  return { ff, done };
}

async function frames(page, duration, fps, write) {
  const count = Math.round(duration * fps);
  for (let i = 0; i < count; i++) {
    await page.evaluate((v) => window.renderFrame(v), i / fps);
    await write(await page.screenshot({ type: 'png' }));
  }
}

const pipeTo = (ff) => (buf) => (ff.stdin.write(buf) ? Promise.resolve() : new Promise((r) => ff.stdin.once('drain', r)));

/** H.264 at Instagram's own settings: 1080 wide, 30 fps, BT.709, yuv420p, faststart. */
async function mp4(page, duration, file) {
  const fps = 30;
  const { ff, done } = ffmpeg([
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-level', '4.2',
    '-g', '60', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', file,
  ]);
  await frames(page, duration, fps, pipeTo(ff));
  ff.stdin.end();
  await done;
}

/** A looping GIF at half size and 15 fps, for anywhere that takes GIFs (Instagram itself needs the MP4). */
async function gif(page, duration, file) {
  const fps = 15;
  const { ff, done } = ffmpeg([
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-vf', 'split[a][b];[a]palettegen=max_colors=192:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a',
    '-loop', '0', file,
  ]);
  await frames(page, duration, fps, pipeTo(ff));
  ff.stdin.end();
  await done;
}

/* ---------- Run ---------- */

if (jobs.some((j) => j.scene === 'farms')) await bundleGarden();
// Serve the folder above the studio, so the grid preview can read the exported posts.
const server = await serve(path.resolve(here, '..'));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({ args: ['--font-render-hinting=none', '--force-color-profile=srgb'] });
const made = [];
try {
  for (const job of jobs) {
    const t0 = Date.now();
    if (at) {
      // Moments are rendered in order on one page, so simulated state carries forward as in a video.
      const page = await open(browser, base, job, SCALE);
      for (const t of [...at].sort((a, b) => a - b)) {
        const file = path.join(here, 'build/preview', `${job.name}@${t}.png`);
        await still(page, t, file);
        made.push(file);
      }
      await page.close();
    } else if (!job.video) {
      const page = await open(browser, base, job, SCALE);
      const file = path.join(outDir, job.out);
      await still(page, 0, file);
      await page.close();
      made.push(file);
    } else {
      const page = await open(browser, base, job, SCALE);
      const duration = await page.evaluate(() => window.sceneInfo.duration);
      // Covers in time order on one page; the first listed is the main one, the rest are alternates.
      const covers = [job.cover].flat().map((t, i) => ({ t, file: path.join(outDir, `${job.out}-cover${i ? `-alt${i}` : ''}.png`) }));
      for (const c of [...covers].sort((a, b) => a.t - b.t)) {
        await still(page, c.t, c.file);
        made.push(c.file);
      }
      await page.close();
      if (!stillsOnly) {
        // A fresh page per pass, so any simulated state starts from zero.
        const vpage = await open(browser, base, job, SCALE, { grain: '0.05' });
        const file = path.join(outDir, `${job.out}.mp4`);
        await mp4(vpage, duration, file);
        await vpage.close();
        made.push(file);
        if (job.gif !== false) {
          const gpage = await open(browser, base, job, GIF_SCALE, { grain: '0' });
          const gfile = path.join(outDir, `${job.out}.gif`);
          await gif(gpage, duration, gfile);
          await gpage.close();
          made.push(gfile);
        }
      }
    }
    console.log(`${job.name.padEnd(14)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally {
  await browser.close();
  server.close();
}
await writeFile(path.join(here, 'build/last-render.txt'), made.map((f) => path.relative(outDir, f)).join('\n') + '\n').catch(() => {});
