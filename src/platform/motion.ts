// Motion: the feel steps' durations and easings as named values, a tween on
// requestAnimationFrame, the input-during-motion rule (FEEL-17), and reduced
// work while the page is hidden. Nothing here varies by chance (ART-25).
import { feel, feelCampaign, feelRun, shared } from "./tokens";

/** Every feel duration, seconds, named as the design names it. */
export const durations = {
  SettleTime: feel.SettleTime,
  RingTime: feel.RingTime,
  PopTime: feel.PopTime,
  LitStagger: feel.LitStagger,
  LitBlinkTime: feel.LitBlinkTime,
  CutRetractTime: feel.CutRetractTime,
  SwitchThrowTime: feelRun.SwitchThrowTime,
  LampRiseTime: feelRun.LampRiseTime,
  LampFallTime: feelRun.LampFallTime,
  KindSwapTime: feelRun.KindSwapTime,
  ArrivalStagger: feelRun.ArrivalStagger,
  DiffRingTime: feelRun.DiffRingTime,
  StopDimTime: feelRun.StopDimTime,
  PaperFeedTime: feelCampaign.PaperFeedTime,
  TearTime: feelCampaign.TearTime,
  ScrollBackTime: feelCampaign.ScrollBackTime,
  DoubleStrikeGap: feelCampaign.DoubleStrikeGap,
  BellLead: feelCampaign.BellLead,
  AlarmToneTime: feelCampaign.AlarmToneTime,
  AlarmSilenceTime: feelCampaign.AlarmSilenceTime,
  RoomDimTime: feelCampaign.RoomDimTime,
  ItemLeaveTime: feelCampaign.ItemLeaveTime,
  OpenStagger: feelCampaign.OpenStagger,
  OpenSettleTime: feelCampaign.OpenSettleTime,
  WakeTime: feelCampaign.WakeTime,
  SelfThrowDelay: feelCampaign.SelfThrowDelay,
  PrintLineTime: shared.PrintLineTime,
  BeatTime: shared.BeatTime,
  ViewMoveTime: shared.ViewMoveTime,
  OpeningGuard: shared.OpeningGuard,
} as const;
export type DurationName = keyof typeof durations;

export type Ease = (p: number) => number;

const clamp01 = (p: number) => (p < 0 ? 0 : p > 1 ? 1 : p);

export const easings = {
  linear: ((p) => clamp01(p)) as Ease,
  /** FEEL-09 scroll back: eased out, fast at the start, slow at the end, no rebound. */
  easeOut: ((p) => 1 - (1 - clamp01(p)) ** 3) as Ease,
  easeIn: ((p) => clamp01(p) ** 3) as Ease,
  smooth: ((p) => {
    const x = clamp01(p);
    return x * x * (3 - 2 * x);
  }) as Ease,
  /** GlideEase: 0 linear to 1 smooth (feel-run.md). */
  glide: glideEase(feelRun.GlideEase),
};

/** A glide: linear mixed with a smooth step by GlideEase. */
export function glideEase(g: number): Ease {
  return (p) => {
    const x = clamp01(p);
    return (1 - g) * x + g * x * x * (3 - 2 * x);
  };
}

/** CSS easings for the same curves (Web Animations). */
export const cssEasings = {
  linear: "linear",
  easeOut: "cubic-bezier(0.33, 1, 0.68, 1)",
  easeIn: "cubic-bezier(0.32, 0, 0.67, 0)",
  smooth: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

/**
 * FEEL-01 dip: a part sinks `depth` and returns past rest by `rebound` of the
 * move, once, all within SettleTime. Returns the sink, 0 at rest, `depth` at
 * the bottom, negative past rest.
 */
export function dipAt(p: number, depth: number = feel.JackDip, rebound: number = feel.Rebound): number {
  const x = clamp01(p);
  // Design silent on the curve's shape: down by 0.4, past rest by 0.75, rest at 1 (as the previews do).
  if (x < 0.4) return depth * easings.smooth(x / 0.4);
  if (x < 0.75) return depth - depth * (1 + rebound) * easings.smooth((x - 0.4) / 0.35);
  return -depth * rebound * (1 - easings.smooth((x - 0.75) / 0.25));
}

/** Keyframes of a dip as scale factors (a plate that sinks reads smaller). */
export function dipKeyframes(depth: number = feel.JackDip, rebound: number = feel.Rebound): Keyframe[] {
  return [
    { transform: "scale(1)", offset: 0 },
    { transform: `scale(${1 - depth})`, offset: 0.4 },
    { transform: `scale(${1 + depth * rebound})`, offset: 0.75 },
    { transform: "scale(1)", offset: 1 },
  ];
}

/** A pop-in (sign disc, mark tile, memo stamp): scale 0 to 1 + Rebound, then rest, over PopTime. */
export function popAt(p: number, rebound: number = feel.Rebound): number {
  const x = clamp01(p);
  if (x < 0.6) return (1 + rebound) * easings.easeOut(x / 0.6);
  return 1 + rebound - rebound * easings.smooth((x - 0.6) / 0.4);
}

export function popKeyframes(rebound: number = feel.Rebound): Keyframe[] {
  return [
    { transform: "scale(0)", offset: 0 },
    { transform: `scale(${1 + rebound})`, offset: 0.6 },
    { transform: "scale(1)", offset: 1 },
  ];
}

/** FEEL-15: a motion's duration in fast-forward. */
export function fastTime(t: number, factor: number = shared.FastFactor): number {
  return t / factor;
}

/** FEEL-15: a sound or gap in fast-forward never divides below FastSoundMin; one already shorter keeps its length. */
export function fastSoundTime(t: number, factor: number = shared.FastFactor, min: number = feelRun.FastSoundMin): number {
  if (t <= min) return t;
  return Math.max(min, t / factor);
}

// ---------- clock and tween ----------

export interface Clock {
  /** Seconds. */
  now(): number;
  frame(cb: () => void): number;
  cancel(id: number): void;
}

export const browserClock: Clock = {
  now: () => performance.now() / 1000,
  frame: (cb) => requestAnimationFrame(() => cb()),
  cancel: (id) => cancelAnimationFrame(id),
};

export interface Motion {
  /** Jumps to the end state and resolves done. */
  finish(): void;
  /** Stops where it is; done resolves. */
  cancel(): void;
  readonly running: boolean;
  readonly done: Promise<void>;
}

export interface TweenOptions {
  /** Seconds. */
  duration: number;
  ease?: Ease;
  /** Seconds before it starts. */
  delay?: number;
  /** Eased progress, 0 to 1. */
  update(p: number): void;
  end?(): void;
  clock?: Clock;
}

const live = new Set<Motion>();
let hiddenNow = false;

/** True while the page is hidden: new motions end at once (FEEL-15 hidden page, reduced work). */
export function pageHidden(): boolean {
  return hiddenNow;
}

/** Sets the hidden state; going hidden ends every running motion at its end state. Wired to visibilitychange by watchVisibility. */
export function setPageHidden(hidden: boolean): void {
  hiddenNow = hidden;
  if (hidden) for (const m of [...live]) m.finish();
}

let watching = false;
export function watchVisibility(doc: Document): void {
  if (watching) return;
  watching = true;
  setPageHidden(doc.hidden);
  doc.addEventListener("visibilitychange", () => setPageHidden(doc.hidden));
}

export function tween(o: TweenOptions): Motion {
  const clock = o.clock ?? browserClock;
  const ease = o.ease ?? easings.linear;
  let running = true;
  let id = 0;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const t0 = clock.now() + (o.delay ?? 0);
  const stop = () => {
    running = false;
    clock.cancel(id);
    live.delete(m);
    resolve();
  };
  const m: Motion = {
    finish() {
      if (!running) return;
      stop();
      o.update(ease(1));
      o.end?.();
    },
    cancel() {
      if (running) stop();
    },
    get running() {
      return running;
    },
    done,
  };
  const step = () => {
    if (!running) return;
    const t = clock.now();
    if (t < t0) {
      id = clock.frame(step);
      return;
    }
    const p = o.duration <= 0 ? 1 : (t - t0) / o.duration;
    if (p >= 1) {
      m.finish();
      return;
    }
    o.update(ease(p));
    id = clock.frame(step);
  };
  live.add(m);
  if (hiddenNow || (o.duration <= 0 && !o.delay)) m.finish();
  else step();
  return m;
}

/** A pause on the clock that ends at once while the page is hidden. */
export function wait(seconds: number, clock: Clock = browserClock): Motion {
  return tween({ duration: seconds, update: () => {}, clock });
}

// ---------- FEEL-17 input during motion ----------

/**
 * FEEL-17: input the rules allow is live from the tap. An action replaces a
 * running motion of the same part, or one its own result voids; each jumps to
 * its end state. Other motions play on. A part is one drawn thing: a jack's
 * plate, a terminal's panel, a wire, a ring, an item, a lamp, the toggle, the
 * paper, the view.
 */
export class MotionParts {
  private parts = new Map<string, Set<Motion>>();

  /** Ends the part's running motions at their end state, then starts the new one. */
  start(part: string, make: () => Motion): Motion {
    this.settle(part);
    const m = make();
    this.track(part, m);
    return m;
  }

  /** Adds a motion beside the part's others (a part with two motions, as a dip and a ring). */
  track(part: string, m: Motion): Motion {
    let set = this.parts.get(part);
    if (!set) this.parts.set(part, (set = new Set()));
    set.add(m);
    void m.done.then(() => {
      set.delete(m);
      if (set.size === 0 && this.parts.get(part) === set) this.parts.delete(part);
    });
    return m;
  }

  /** Jumps the named parts' motions to their end state. */
  settle(...parts: string[]): void {
    for (const p of parts) for (const m of [...(this.parts.get(p) ?? [])]) m.finish();
  }

  settleAll(): void {
    this.settle(...this.parts.keys());
  }

  isMoving(part: string): boolean {
    return [...(this.parts.get(part) ?? [])].some((m) => m.running);
  }

  moving(): string[] {
    return [...this.parts.keys()].filter((p) => this.isMoving(p));
  }
}
