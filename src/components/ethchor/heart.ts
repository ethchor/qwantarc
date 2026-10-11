/**
 * The page's heartbeat. One clock drives the particles' pulse, the ECG on the monitor and the
 * readout in the bar. It rests at about 62 bpm and quickens when you move fast, click or charge,
 * then settles back over a few seconds.
 */
import { ecgWave } from './shapes';

export interface Heart {
  /** Beats per minute, eased. */
  readonly bpm: number;
  /** Where in the current beat we are, 0 to 1; the QRS spike is at 0.5. */
  readonly phase: number;
  /** Phase at the previous tick, unwrapped, so the monitor can sample between frames. */
  readonly prevPhase: number;
  /** How hard the heart is contracting right now, 0 to 1: the lub, then a softer dub. */
  readonly squeeze: number;
  tick(dt: number): void;
  /** Raise the rate by this many bpm (it settles back on its own). */
  excite(bpm: number): void;
  /** Beat now: a click or a tap. */
  kick(boost?: number): void;
  onBeat(fn: (bpm: number) => void): () => void;
  /** The ECG trace's value at a phase. */
  wave(phase: number): number;
}

export function createHeart(rest = 62, max = 150): Heart {
  let bpm = rest;
  let target = rest;
  let phase = 0.2;
  let prevPhase = 0.2;
  let kicked = 0;
  const subs = new Set<(bpm: number) => void>();
  const fire = () => subs.forEach((fn) => fn(bpm));

  const squeezeAt = (p: number) => {
    const lub = Math.exp(-((p - 0.5) ** 2) / (2 * 0.035 ** 2));
    const dub = Math.exp(-((p - 0.78) ** 2) / (2 * 0.04 ** 2)) * 0.55;
    return Math.min(1, lub + dub);
  };

  return {
    get bpm() {
      return bpm;
    },
    get phase() {
      return phase;
    },
    get prevPhase() {
      return prevPhase;
    },
    get squeeze() {
      return Math.max(squeezeAt(phase), kicked);
    },
    tick(dt) {
      dt = Math.min(dt, 0.1);
      target += (rest - target) * Math.min(1, dt * 0.22);
      bpm += (target - bpm) * Math.min(1, dt * 1.6);
      kicked *= Math.exp(-dt * 9);
      prevPhase = phase;
      phase += (dt * bpm) / 60;
      if (prevPhase < 0.5 && phase >= 0.5) fire();
      if (phase >= 1) {
        phase -= 1;
        prevPhase -= 1;
      }
    },
    excite(v) {
      target = Math.min(max, target + v);
    },
    kick(boost = 7) {
      // A premature beat: jump to just before the spike, so the trace still draws the whole QRS.
      // The squeeze answers at once; the beat itself fires as the phase crosses the spike.
      if (phase < 0.44 || phase > 0.56) phase = prevPhase = 0.44;
      kicked = 1;
      target = Math.min(max, target + boost);
    },
    onBeat(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    wave: ecgWave,
  };
}
