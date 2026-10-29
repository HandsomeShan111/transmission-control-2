import { describe, expect, test } from "bun:test";
import { noiseSamples, peakOf, renderParts, SOUND_NAMES, voiceLength, voiceOf, voiceScale, type NoisePart, type TonePart } from "../sound";
import { feelCampaign, feelRun, shared, sound as S } from "../tokens";

const noise = (name: Parameters<typeof voiceOf>[0], o = {}) => voiceOf(name, o).parts.filter((p): p is NoisePart => p.kind === "noise");
const tones = (name: Parameters<typeof voiceOf>[0]) => voiceOf(name).parts.filter((p): p is TonePart => p.kind === "tone");

describe("the nine voices (art-direction-sound.md)", () => {
  // The design's nine, and the key click of the owner's change.
  test("ten sounds", () => expect(SOUND_NAMES.length).toBe(10));
  test("the key click: half LevelQuiet, three noise ticks, within ClickMaxTime, one-shot", () => {
    const v = voiceOf("key");
    expect(v.level).toBe(S.LevelQuiet / 2);
    expect(v.parts.every((p) => p.kind === "noise")).toBe(true);
    expect(voiceLength(v)).toBeLessThanOrEqual(S.ClickMaxTime);
    expect(v.oneShot).toBe(true);
  });
  test("ART-17 levels", () => {
    for (const n of ["plug", "unplug", "working", "teletype"] as const) expect(voiceOf(n).level).toBe(S.LevelQuiet);
    for (const n of ["plus", "minus", "runSwitch", "bell"] as const) expect(voiceOf(n).level).toBe(S.LevelMid);
    expect(voiceOf("alarm").level).toBe(S.LevelLoud);
  });
  test("ART-17 a click, clack or thunk lasts ClickMaxTime at most; one-shots and the teletype", () => {
    for (const n of SOUND_NAMES) for (const p of noise(n)) expect(p.dur).toBeLessThanOrEqual(S.ClickMaxTime);
    expect(voiceOf("teletype").oneShot).toBe(false);
    for (const n of SOUND_NAMES.filter((x) => x !== "teletype")) expect(voiceOf(n).oneShot).toBe(true);
  });
  test("ART-17 waves: a tone is a sine, but the minus tone, a triangle", () => {
    for (const n of SOUND_NAMES) for (const t of tones(n)) expect(t.wave).toBe(n === "minus" ? "triangle" : "sine");
  });
  test("ART-18 unplug: its band falls from UnplugPitch by UnplugDrop of it", () => {
    const [p] = noise("unplug");
    expect(p!.freq).toBe(S.UnplugPitch);
    expect(p!.freqEnd).toBe(S.UnplugPitch - S.UnplugPitch * S.UnplugDrop);
    expect(noise("plug").length).toBeGreaterThan(1);
  });
  test("ART-19 working: two ticks, ClickMaxTime in all", () => {
    expect(noise("working").length).toBe(2);
    expect(voiceLength(voiceOf("working"))).toBeLessThanOrEqual(S.ClickMaxTime);
  });
  test("ART-20 verdicts: PlusPitch and MinusPitch, VerdictToneTime, no slide", () => {
    expect(tones("plus").map((t) => [t.freq, t.dur])).toEqual([[S.PlusPitch, S.VerdictToneTime]]);
    expect(tones("minus").map((t) => [t.freq, t.dur])).toEqual([[S.MinusPitch, S.VerdictToneTime]]);
  });
  test("ART-21 run switch: a thunk at once, a click SwitchThrowTime later", () => {
    const at = noise("runSwitch").map((p) => p.at);
    expect(Math.min(...at)).toBe(0);
    expect(Math.max(...at)).toBe(feelRun.SwitchThrowTime);
  });
  test("ART-22 alarm: AlarmPitch and AlarmBeat above it, each half LevelLoud, over AlarmToneTime", () => {
    const t = tones("alarm");
    expect(t.map((x) => x.freq)).toEqual([S.AlarmPitch, S.AlarmPitch + S.AlarmBeat]);
    expect(t.map((x) => x.amp)).toEqual([S.LevelLoud / 2, S.LevelLoud / 2]);
    expect(t.every((x) => x.dur === feelCampaign.AlarmToneTime && x.shape === "hold")).toBe(true);
  });
  test("ART-23 teletype: LineStrikes clicks over PrintLineTime, then a thunk at its end", () => {
    const plain = noise("teletype");
    expect(plain.length).toBe(S.LineStrikes + 1);
    const thunk = plain[plain.length - 1]!;
    expect(thunk.at).toBe(shared.PrintLineTime);
    for (const c of plain.slice(0, -1)) expect(c.at + c.dur).toBeLessThanOrEqual(shared.PrintLineTime);
  });
  test("ART-23 double strike: each click twice, DoubleStrikeGap apart, inside the line", () => {
    const d = noise("teletype", { double: true });
    const clicks = d.slice(0, -1);
    expect(clicks.length).toBe(2 * S.LineStrikes);
    const first = clicks.slice(0, S.LineStrikes);
    const second = clicks.slice(S.LineStrikes);
    second.forEach((c, i) => expect(c.at - first[i]!.at).toBeCloseTo(feelCampaign.DoubleStrikeGap, 10));
    for (const c of clicks) expect(c.at + c.dur).toBeLessThanOrEqual(shared.PrintLineTime);
    expect(first[S.LineStrikes - 1]!.at).toBeLessThan(shared.PrintLineTime - feelCampaign.DoubleStrikeGap);
  });
  test("ART-24 bell: struck at BellPitch, ringing out over BellTime", () => {
    const [b] = tones("bell");
    expect([b!.freq, b!.dur, b!.shape]).toEqual([S.BellPitch, S.BellTime, "ring"]);
  });
  test("FEEL-15 fast: durations and gaps divide, never below FastSoundMin", () => {
    const fast = voiceOf("runSwitch", { fast: 4 });
    const click = fast.parts.find((p) => p.at > 0)!;
    expect(click.at).toBe(feelRun.FastSoundMin);
    const tone = voiceOf("plus", { fast: 4 }).parts[0]!;
    expect(tone.dur).toBe(feelRun.FastSoundMin);
    expect((tone as TonePart).freq).toBe(S.PlusPitch);
  });
});

describe("ART-25 no chance", () => {
  test("noise is a fixed sequence", () => {
    expect(Array.from(noiseSamples(7, 64))).toEqual(Array.from(noiseSamples(7, 64)));
    expect(Array.from(noiseSamples(7, 8))).not.toEqual(Array.from(noiseSamples(8, 8)));
    for (const v of noiseSamples(3, 1000)) expect(Math.abs(v)).toBeLessThanOrEqual(1);
  });
  test("a voice renders the same twice, and its scale brings the peak to its level", () => {
    for (const n of SOUND_NAMES) {
      const v = voiceOf(n);
      const a = renderParts(v.parts, 48000);
      expect(Array.from(a)).toEqual(Array.from(renderParts(v.parts, 48000)));
      expect(peakOf(a) * voiceScale(v, 48000)).toBeCloseTo(v.normalize ? v.level : peakOf(a), 6);
    }
  });
});
