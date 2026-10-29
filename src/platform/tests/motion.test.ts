import { describe, expect, test } from "bun:test";
import { MotionParts, dipAt, durations, easings, fastSoundTime, fastTime, glideEase, popAt, setPageHidden, tween, type Clock } from "../motion";
import { feel, feelRun } from "../tokens";

function fakeClock() {
  let t = 0;
  const q = new Map<number, () => void>();
  let id = 0;
  const clock: Clock = {
    now: () => t,
    frame: (cb) => {
      q.set(++id, cb);
      return id;
    },
    cancel: (i) => q.delete(i),
  };
  const advance = (dt: number) => {
    t += dt;
    const cbs = [...q.values()];
    q.clear();
    for (const cb of cbs) cb();
  };
  return { clock, advance };
}

describe("named values", () => {
  test("durations are the feel tokens", () => {
    expect(durations.SettleTime).toBe(feel.SettleTime);
    expect(durations.SwitchThrowTime).toBe(feelRun.SwitchThrowTime);
    expect(durations.PrintLineTime).toBe(0.15);
  });
  test("easings start at 0 and end at 1", () => {
    for (const e of Object.values(easings)) {
      expect(e(0)).toBe(0);
      expect(e(1)).toBeCloseTo(1, 10);
    }
    expect(glideEase(0)(0.25)).toBe(0.25);
    expect(glideEase(1)(0.25)).toBeCloseTo(0.15625, 10);
  });
  test("a dip sinks JackDip, returns past rest by Rebound once, and rests", () => {
    expect(dipAt(0)).toBe(0);
    expect(dipAt(0.4)).toBeCloseTo(feel.JackDip, 10);
    expect(dipAt(0.75)).toBeCloseTo(-feel.JackDip * feel.Rebound, 10);
    expect(dipAt(1)).toBeCloseTo(0, 10);
    let below = 0;
    for (let p = 0; p <= 1; p += 0.01) if (dipAt(p) < -1e-9) below++;
    expect(below).toBeGreaterThan(0);
  });
  test("a pop goes to 1 + Rebound and rests at 1", () => {
    expect(popAt(0)).toBe(0);
    expect(popAt(0.6)).toBeCloseTo(1 + feel.Rebound, 10);
    expect(popAt(1)).toBeCloseTo(1, 10);
  });
  test("FEEL-15: fast motion divides; a fast sound never divides below FastSoundMin", () => {
    expect(fastTime(1, 4)).toBe(0.25);
    expect(fastSoundTime(0.16, 4)).toBe(feelRun.FastSoundMin);
    expect(fastSoundTime(1, 4)).toBe(0.25);
    expect(fastSoundTime(0.04, 4)).toBe(0.04);
    expect(fastSoundTime(0.25, 4)).toBe(0.0625);
  });
});

describe("tween", () => {
  test("updates on frames and ends at 1", async () => {
    const { clock, advance } = fakeClock();
    const seen: number[] = [];
    let ended = false;
    const m = tween({ duration: 1, update: (p) => seen.push(p), end: () => (ended = true), clock });
    advance(0.5);
    advance(0.6);
    await m.done;
    expect(seen[0]).toBe(0);
    expect(seen).toContain(0.5);
    expect(seen[seen.length - 1]).toBe(1);
    expect(ended).toBe(true);
    expect(m.running).toBe(false);
  });
  test("finish jumps to the end state", () => {
    const { clock } = fakeClock();
    let last = -1;
    const m = tween({ duration: 1, update: (p) => (last = p), clock });
    m.finish();
    expect(last).toBe(1);
  });
  test("a delay holds the start", () => {
    const { clock, advance } = fakeClock();
    const seen: number[] = [];
    tween({ duration: 1, delay: 0.5, update: (p) => seen.push(p), clock });
    advance(0.25);
    expect(seen).toEqual([]);
    advance(0.5);
    expect(seen[0]).toBeCloseTo(0.25, 10);
  });
  test("a hidden page ends running motions and new ones at once", () => {
    const { clock } = fakeClock();
    let a = 0;
    tween({ duration: 1, update: (p) => (a = p), clock });
    try {
      setPageHidden(true);
      expect(a).toBe(1);
      let b = 0;
      tween({ duration: 5, update: (p) => (b = p), clock });
      expect(b).toBe(1);
    } finally {
      setPageHidden(false);
    }
  });
});

describe("FEEL-17 input during motion", () => {
  test("an action replaces a running motion of the same part, which jumps to its end", () => {
    const { clock } = fakeClock();
    const parts = new MotionParts();
    let first = 0;
    parts.start("jack:INSPECTOR.plus", () => tween({ duration: 1, update: (p) => (first = p), clock }));
    expect(parts.isMoving("jack:INSPECTOR.plus")).toBe(true);
    parts.start("jack:INSPECTOR.plus", () => tween({ duration: 1, update: () => {}, clock }));
    expect(first).toBe(1);
  });
  test("other parts' motions play on", () => {
    const { clock } = fakeClock();
    const parts = new MotionParts();
    let other = 0;
    parts.start("jack:a", () => tween({ duration: 1, update: (p) => (other = p), clock }));
    parts.start("jack:b", () => tween({ duration: 1, update: () => {}, clock }));
    expect(other).toBe(0);
    expect(parts.moving().sort()).toEqual(["jack:a", "jack:b"]);
  });
  test("settle jumps the named parts; settleAll every part", () => {
    const { clock } = fakeClock();
    const parts = new MotionParts();
    let v = 0;
    let w = 0;
    parts.start("view", () => tween({ duration: 1, update: (p) => (v = p), clock }));
    parts.track("paper", tween({ duration: 1, update: (p) => (w = p), clock }));
    parts.settle("view");
    expect([v, w]).toEqual([1, 0]);
    parts.settleAll();
    expect(w).toBe(1);
  });
});
