// Web Audio voices for the design's nine sounds (art-direction-sound.md), and
// the key click of the owner's change, synthesized in the page: no audio files. One mute switch (SETTING-01). Sound
// starts at the first user gesture (ART-17). Noise comes from a fixed sequence
// (ART-25). The game sets no audio session type: the browser's default stays,
// as SETTING-01 says (open question OQ-PLATFORM-05).
import { feelCampaign, feelRun, shared, sound as S } from "./tokens";
import { fastSoundTime } from "./motion";

export const SOUND_NAMES = [
  "plug",
  "unplug",
  "working",
  "plus",
  "minus",
  "runSwitch",
  "alarm",
  "teletype",
  "bell",
  "key",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** A burst of noise through a bandpass filter: a click, clack or thunk (ART-17). */
export interface NoisePart {
  kind: "noise";
  /** Seconds from the voice's start. */
  at: number;
  dur: number;
  /** Bandpass centre, hertz; falls linearly to freqEnd when given (ART-18). */
  freq: number;
  freqEnd?: number;
  q: number;
  /** Relative amplitude inside the voice before it is set to its level. */
  amp: number;
  /** Seed of the part's fixed noise sequence. */
  seed: number;
}

export interface TonePart {
  kind: "tone";
  at: number;
  dur: number;
  wave: "sine" | "triangle";
  freq: number;
  amp: number;
  attack: number;
  /** "hold": steady, then a short release; "ring": struck, rings out exponentially. */
  shape: "hold" | "ring";
}

export type Part = NoisePart | TonePart;

export interface Voice {
  name: SoundName;
  /** Peak of the voice, fraction of full scale. */
  level: number;
  /** A one-shot sound starting again cuts the one still sounding (ART-17). */
  oneShot: boolean;
  parts: Part[];
  /** Scale the parts so the rendered peak meets the level (noise peaks are found by rendering). */
  normalize: boolean;
}

export interface VoiceOptions {
  /** FEEL-15 fast-forward factor: durations and gaps divide by it, never below FastSoundMin. */
  fast?: number;
  /** ART-23 teletype: a double-strike line. */
  double?: boolean;
}

const RELEASE = 0.03;

/** The voice of one sound: pure data, built from the tokens. */
export function voiceOf(name: SoundName, opts: VoiceOptions = {}): Voice {
  const v = build(name, opts);
  if (!opts.fast) return v;
  const f = opts.fast;
  return {
    ...v,
    parts: v.parts.map((p) => ({ ...p, at: fastSoundTime(p.at, f), dur: fastSoundTime(p.dur, f) })),
  };
}

function noise(at: number, dur: number, freq: number, q: number, amp: number, seed: number, freqEnd?: number): NoisePart {
  return freqEnd === undefined
    ? { kind: "noise", at, dur, freq, q, amp, seed }
    : { kind: "noise", at, dur, freq, freqEnd, q, amp, seed };
}

function build(name: SoundName, opts: VoiceOptions): Voice {
  switch (name) {
    // ART-18: a dry relay clack with a contact tick after it.
    case "plug":
      return {
        name,
        level: S.LevelQuiet,
        oneShot: true,
        normalize: true,
        parts: [noise(0, 0.03, 1800, 1.4, 1, 11), noise(0, 0.045, 180, 1, 0.8, 12), noise(0.06, 0.012, 3500, 2, 0.6, 13)],
      };
    // ART-18: one duller clack; its band centre starts at UnplugPitch and falls by UnplugDrop of it.
    case "unplug":
      return {
        name,
        level: S.LevelQuiet,
        oneShot: true,
        normalize: true,
        parts: [noise(0, 0.09, S.UnplugPitch, 1.2, 1, 21, S.UnplugPitch - S.UnplugPitch * S.UnplugDrop)],
      };
    // ART-19: two relay ticks, at most ClickMaxTime in all; every family the same.
    case "working":
      return {
        name,
        level: S.LevelQuiet,
        oneShot: true,
        normalize: true,
        parts: [noise(0, 0.018, 2200, 1.6, 1, 31), noise(0.08, 0.018, 2200, 1.6, 1, 32)],
      };
    // ART-20: one clean tone at PlusPitch; a flat low triangle at MinusPitch, no slide.
    case "plus":
    case "minus":
      return {
        name,
        level: S.LevelMid,
        oneShot: true,
        normalize: false,
        parts: [
          {
            kind: "tone",
            at: 0,
            dur: S.VerdictToneTime,
            wave: name === "plus" ? "sine" : "triangle",
            freq: name === "plus" ? S.PlusPitch : S.MinusPitch,
            amp: S.LevelMid,
            attack: 0.005,
            shape: "hold",
          },
        ],
      };
    // ART-21: a thunk as the toggle starts to move, a click as it seats SwitchThrowTime later.
    case "runSwitch":
      return {
        name,
        level: S.LevelMid,
        oneShot: true,
        normalize: true,
        parts: [
          noise(0, 0.1, 90, 0.9, 1, 41),
          noise(0, 0.03, 600, 1.2, 0.5, 42),
          noise(feelRun.SwitchThrowTime, 0.015, 2200, 1.8, 0.7, 43),
        ],
      };
    // ART-22: two steady sines, AlarmPitch and AlarmBeat above it, each half of LevelLoud. No rise, no repeat.
    case "alarm":
      return {
        name,
        level: S.LevelLoud,
        oneShot: true,
        normalize: false,
        parts: [S.AlarmPitch, S.AlarmPitch + S.AlarmBeat].map(
          (freq): TonePart => ({
            kind: "tone",
            at: 0,
            dur: feelCampaign.AlarmToneTime,
            wave: "sine",
            freq,
            amp: S.LevelLoud / 2,
            attack: 0.02,
            shape: "hold",
          }),
        ),
      };
    // ART-23: LineStrikes key clicks over PrintLineTime, then a carriage thunk at its end.
    // Double strike: each click twice, DoubleStrikeGap apart, over PrintLineTime less DoubleStrikeGap.
    case "teletype": {
      const T = shared.PrintLineTime;
      const G = feelCampaign.DoubleStrikeGap;
      const span = opts.double ? T - G : T;
      const parts: Part[] = [];
      for (let strike = 0; strike < (opts.double ? 2 : 1); strike++)
        for (let i = 0; i < S.LineStrikes; i++)
          parts.push(noise(strike * G + (i * span) / S.LineStrikes, 0.008, 2800, 2, 0.8, 51 + i + strike * 10));
      parts.push(noise(T, 0.04, 350, 1, 1, 71));
      return { name, level: S.LevelQuiet, oneShot: false, normalize: true, parts };
    }
    // ART-24: one struck bell at BellPitch, ringing out over BellTime.
    case "bell":
      return {
        name,
        level: S.LevelMid,
        oneShot: true,
        normalize: true,
        parts: [
          { kind: "tone", at: 0, dur: S.BellTime, wave: "sine", freq: S.BellPitch, amp: 1, attack: 0.002, shape: "ring" },
          { kind: "tone", at: 0, dur: S.BellTime * 0.6, wave: "sine", freq: S.BellPitch * 2.76, amp: 0.35, attack: 0.002, shape: "ring" },
          { kind: "tone", at: 0, dur: S.BellTime * 0.3, wave: "sine", freq: S.BellPitch * 5.4, amp: 0.12, attack: 0.002, shape: "ring" },
        ],
      };
    // Owner's change (design silent): a plate or a row pressed. A short mechanical key click: a bright contact tick with the
    // key's low body under it, then a softer tick as it lets go; half LevelQuiet, under every run sound; 33 ms in all.
    case "key":
      return {
        name,
        level: S.LevelQuiet / 2,
        oneShot: true,
        normalize: true,
        parts: [noise(0, 0.006, 3200, 2.2, 1, 81), noise(0, 0.02, 260, 1.1, 0.6, 82), noise(0.028, 0.005, 4200, 2.4, 0.4, 83)],
      };
  }
}

/** Seconds from the voice's start to its last sample. */
export function voiceLength(v: Voice): number {
  return Math.max(...v.parts.map((p) => p.at + p.dur));
}

// ---------- the fixed noise sequence and an exact render ----------

/** ART-25: xorshift32 from a fixed seed, values in [-1, 1). */
export function noiseSamples(seed: number, length: number): Float32Array {
  const out = new Float32Array(length);
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = 0; i < length; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    out[i] = s / 2147483648 - 1;
  }
  return out;
}

const frames = (t: number, rate: number) => Math.round(t * rate);

/** Renders a voice's parts as Web Audio plays them, before the level is set. Used to scale noise to its level. */
export function renderParts(parts: Part[], rate: number): Float32Array {
  const len = Math.max(...parts.map((p) => frames(p.at, rate) + frames(p.dur, rate))) + 1;
  const out = new Float32Array(len);
  for (const p of parts) {
    const n0 = frames(p.at, rate);
    const N = Math.max(1, frames(p.dur, rate));
    if (p.kind === "noise") {
      const x = noiseSamples(p.seed, N);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let n = 0; n < N; n++) {
        // The BiquadFilterNode bandpass of the Web Audio spec, its frequency ramped linearly.
        const f = p.freqEnd === undefined ? p.freq : p.freq + ((p.freqEnd - p.freq) * n) / N;
        const w0 = (2 * Math.PI * f) / rate;
        const alpha = Math.sin(w0) / (2 * p.q);
        const a0 = 1 + alpha;
        const xn = x[n]!;
        const y = (alpha * xn - alpha * x2 + 2 * Math.cos(w0) * y1 - (1 - alpha) * y2) / a0;
        x2 = x1;
        x1 = xn;
        y2 = y1;
        y1 = y;
        out[n0 + n]! += y * p.amp * Math.pow(0.001, n / N);
      }
    } else {
      for (let n = 0; n < N; n++) {
        const t = n / rate;
        const ph = p.freq * t;
        const w = p.wave === "sine" ? Math.sin(2 * Math.PI * ph) : 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5);
        out[n0 + n]! += w * p.amp * envelope(p, t);
      }
    }
  }
  return out;
}

function envelope(p: TonePart, t: number): number {
  if (t < p.attack) return t / p.attack;
  if (p.shape === "ring") return Math.pow(0.001, (t - p.attack) / (p.dur - p.attack));
  const rel = Math.min(RELEASE, p.dur / 3);
  if (t > p.dur - rel) return Math.max(0, (p.dur - t) / rel);
  return 1;
}

export function peakOf(samples: Float32Array): number {
  let m = 0;
  for (const s of samples) m = Math.max(m, Math.abs(s));
  return m;
}

const scaleCache = new Map<string, number>();

/** The factor that brings a voice's parts to its level. */
export function voiceScale(v: Voice, rate: number): number {
  if (!v.normalize) return 1;
  const key = `${rate}|${JSON.stringify(v.parts)}`;
  let s = scaleCache.get(key);
  if (s === undefined) {
    s = v.level / peakOf(renderParts(v.parts, rate));
    scaleCache.set(key, s);
  }
  return s;
}

// ---------- scheduling on a context ----------

export interface Scheduled {
  /** Context time the voice ends. */
  end: number;
  /** Cuts the voice at once. */
  stop(): void;
}

const bufferCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

function noiseBuffer(ctx: BaseAudioContext, seed: number, length: number): AudioBuffer {
  let m = bufferCache.get(ctx);
  if (!m) bufferCache.set(ctx, (m = new Map()));
  const key = `${seed}|${length}`;
  let b = m.get(key);
  if (!b) {
    b = ctx.createBuffer(1, length, ctx.sampleRate);
    b.getChannelData(0).set(noiseSamples(seed, length));
    m.set(key, b);
  }
  return b;
}

/** Schedules a voice on any context (an AudioContext, or an OfflineAudioContext in tests), `delay` seconds from now. */
export function scheduleVoice(ctx: BaseAudioContext, dest: AudioNode, v: Voice, delay = 0): Scheduled {
  const rate = ctx.sampleRate;
  const t0 = Math.ceil((ctx.currentTime + delay) * rate) / rate;
  const k = voiceScale(v, rate);
  const out = ctx.createGain();
  out.connect(dest);
  const sources: AudioScheduledSourceNode[] = [];
  // ART-25: parts mix in a chain, two inputs to a node at most. An engine may
  // sum a node's inputs in any order; two floats add the same either way,
  // three may not, so the samples come out the same on every play.
  let into: AudioNode = out;
  v.parts.forEach((p, i) => {
    const start = t0 + frames(p.at, rate) / rate;
    const N = Math.max(1, frames(p.dur, rate));
    const end = start + N / rate;
    const g = ctx.createGain();
    g.connect(into);
    if (i < v.parts.length - 1) {
      const rest = ctx.createGain();
      rest.connect(into);
      into = rest;
    }
    if (p.kind === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, p.seed, N);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = p.q;
      // The intrinsic value too: an engine that sets a filter once a render
      // block reads it at the block's start, before a part that starts inside it.
      f.frequency.value = p.freq;
      f.frequency.setValueAtTime(p.freq, start);
      if (p.freqEnd !== undefined) f.frequency.linearRampToValueAtTime(p.freqEnd, end);
      g.gain.setValueAtTime(p.amp * k, start);
      g.gain.exponentialRampToValueAtTime(p.amp * k * 0.001, end);
      g.gain.setValueAtTime(0, end);
      src.connect(f);
      f.connect(g);
      src.start(start);
      src.stop(end);
      sources.push(src);
    } else {
      const o = ctx.createOscillator();
      o.type = p.wave;
      o.frequency.value = p.freq;
      o.frequency.setValueAtTime(p.freq, start);
      const a = p.amp * k;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(a, start + p.attack);
      if (p.shape === "ring") {
        g.gain.exponentialRampToValueAtTime(a * 0.001, end);
      } else {
        const rel = Math.min(RELEASE, p.dur / 3);
        g.gain.setValueAtTime(a, end - rel);
        g.gain.linearRampToValueAtTime(0, end);
      }
      g.gain.setValueAtTime(0, end);
      o.connect(g);
      o.start(start);
      o.stop(end + 0.01);
      sources.push(o);
    }
  });
  const end = t0 + voiceLength(v);
  return {
    end,
    stop() {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + 0.005);
      for (const s of sources) {
        try {
          s.stop(now + 0.01);
        } catch {
          // already stopped
        }
      }
    },
  };
}

// ---------- the page's sound ----------

export interface Playing {
  stop(): void;
  readonly end: number;
}

export interface SoundSystem {
  /** Plays a sound; null while muted or before the first gesture (ART-17: sound starts at the first tap). */
  play(name: SoundName, opts?: VoiceOptions & { delay?: number }): Playing | null;
  /** SETTING-01: off stops every sound at once; on plays again from the next one. */
  setMuted(muted: boolean): void;
  readonly muted: boolean;
  /** Starts sound at the first gesture on the target (pointer, touch or key). */
  unlock(target: EventTarget): void;
  readonly unlocked: boolean;
  stopAll(): void;
  context(): BaseAudioContext | null;
}

export interface SoundSystemOptions {
  makeContext?: () => AudioContext;
  muted?: boolean;
}

function defaultContext(): AudioContext {
  const w = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const C = w.AudioContext ?? w.webkitAudioContext;
  if (!C) throw new Error("this browser has no Web Audio");
  return new C();
}

const GESTURES = ["pointerdown", "touchend", "mousedown", "keydown", "click"] as const;

export function createSound(opts: SoundSystemOptions = {}): SoundSystem {
  const make = opts.makeContext ?? defaultContext;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = !!opts.muted;
  let unlocked = false;
  const oneShots = new Map<SoundName, Scheduled>();
  const all = new Set<Scheduled>();

  const ensure = () => {
    if (!ctx) {
      ctx = make();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    return ctx;
  };
  /** A context not running resumes: suspended, or Safari's "interrupted" (a call, another app's sound). A closed one stays closed. */
  const resume = () => {
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => unlocked && !document.hidden && resume());

  const sys: SoundSystem = {
    play(name, o = {}) {
      if (muted || !unlocked || !ctx || !master) return null;
      resume();
      const v = voiceOf(name, o);
      if (v.oneShot) oneShots.get(name)?.stop();
      const s = scheduleVoice(ctx, master, v, o.delay ?? 0);
      if (v.oneShot) oneShots.set(name, s);
      all.add(s);
      const c = ctx;
      const forget = () => {
        all.delete(s);
        if (oneShots.get(name) === s) oneShots.delete(name);
      };
      setTimeout(forget, Math.max(0, (s.end - c.currentTime) * 1000) + 50);
      return {
        end: s.end,
        stop() {
          s.stop();
          forget();
        },
      };
    },
    setMuted(m) {
      muted = m;
      if (m) sys.stopAll();
    },
    get muted() {
      return muted;
    },
    unlock(target) {
      const handler = () => {
        const c = ensure();
        unlocked = true;
        const done = () => {
          if (c.state === "running") for (const g of GESTURES) target.removeEventListener(g, handler, true);
        };
        if (c.state !== "running") void c.resume().then(done, () => {});
        else done();
      };
      for (const g of GESTURES) target.addEventListener(g, handler, { capture: true, passive: true });
    },
    get unlocked() {
      return unlocked;
    },
    stopAll() {
      for (const s of all) s.stop();
      all.clear();
      oneShots.clear();
    },
    context: () => ctx,
  };
  return sys;
}
