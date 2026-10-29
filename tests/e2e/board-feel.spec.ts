// The Board's feel steps (design/docs/build/acceptance-feel.md), one test each, named by step id, against the test sandbox.
// A person judges how each one looks and sounds; these tests hold its timings, orders and counts to the parameters' start
// values (with room for a loaded test machine) and its Derived parts. FEEL-13 (memo, debrief, save code) is the Campaign's.
import { expect, test, type Page } from "@playwright/test";
import { feel, feelCampaign, feelRun, shared } from "../../src/platform/tokens";
import {
  P,
  bringIntoView,
  centre,
  closeReport,
  control,
  cues,
  cutByDrag,
  dragTo,
  emptyPoint,
  frameOf,
  instrument,
  isPhone,
  jack,
  logged,
  now,
  openOrder,
  paper,
  paperLines,
  plugByTaps,
  runAndRead,
  tapAt,
  tapPaper,
  untilBeat,
  viewOf,
  windowCentre,
  windowOf,
  wirePoint,
  wiresNow,
  type Logged,
} from "./board-kit";

test.describe.configure({ mode: "parallel" });
test.beforeEach(async ({ page }) => instrument(page));

const ms = (s: number) => s * 1000;
/** A measured time near its parameter: within 40% or 60 ms, whichever is more, for a loaded machine. */
const near = (got: number, want: number, what: string) => {
  const room = Math.max(60, want * 0.4);
  expect(got, `${what}: ${got.toFixed(0)} ms for ${want.toFixed(0)}`).toBeGreaterThan(want - room);
  expect(got, `${what}: ${got.toFixed(0)} ms for ${want.toFixed(0)}`).toBeLessThan(want + room);
};
const lowestScale = (frames: string | undefined) => Math.min(...[...(frames ?? "").matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1])));
const dipsOf = (log: Logged[], jackId: string, side?: "in" | "out") =>
  log.filter((e) => e.op === "animate" && e.d.part === "plate" && e.parent?.jackId === jackId && (!side || e.parent?.side === side));
const lifetime = (log: Logged[], match: (d: Record<string, string>) => boolean) => {
  const a = log.find((e) => e.op === "add" && match(e.d));
  const r = a && log.find((e) => e.op === "remove" && e.t >= a.t && match(e.d));
  return a && r ? r.t - a.t : null;
};
const takers = (page: Page) => page.locator('[data-layer="rings"] [data-lit]');

async function press(page: Page, p: { x: number; y: number }, drag = true): Promise<void> {
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  if (drag) await page.mouse.move(p.x + 16, p.y + 14, { steps: 3 });
}

// ---------------------------------------------------------------- Wires

test("FEEL-01: holding a wire dips its plate; rings light nearest first, LitStagger apart; let go, they go out and it retracts", async ({ page }) => {
  await openOrder(page, 3);
  const t0 = await now(page);
  const at = await bringIntoView(page, jack(page, "INSPECTOR plus", "out"), 120);
  await press(page, at);
  await expect(takers(page)).toHaveCount(4 + 1);
  const log = await logged(page, t0);
  // Derived: the plate sinks JackDip of the plate, and returns past rest, within SettleTime.
  const dip = dipsOf(log, "INSPECTOR plus")[0]!;
  expect(dip.duration).toBe(ms(feel.SettleTime));
  expect(lowestScale(dip.frames)).toBeCloseTo(1 - feel.JackDip, 3);
  expect(dip.frames).toContain(`scale(${1 + feel.JackDip * feel.Rebound})`);
  // Derived: nearest the held jack first, the first blinks LitStagger apart; each blinks with LitBlinkTime.
  const rings = await page.evaluate(() =>
    [...document.querySelectorAll('[data-layer="rings"] [data-lit]')].map((r) => {
      const b = r.getBoundingClientRect();
      const cs = getComputedStyle(r);
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, delay: parseFloat(cs.animationDelay), blink: parseFloat(cs.animationDuration) };
    }),
  );
  const j = await centre(jack(page, "INSPECTOR plus", "out"));
  const byDelay = [...rings].sort((a, b) => a.delay - b.delay);
  byDelay.forEach((r, i) => {
    expect(r.delay).toBeCloseTo(i * feel.LitStagger, 3);
    expect(r.blink).toBeCloseTo(feel.LitBlinkTime, 3);
    if (i > 0) expect(Math.hypot(r.x - j.x, r.y - j.y)).toBeGreaterThanOrEqual(Math.hypot(byDelay[i - 1]!.x - j.x, byDelay[i - 1]!.y - j.y) - 0.5);
  });
  // Let go on empty board: the rings go out at once; the wire retracts in CutRetractTime, with no sound.
  const e = await emptyPoint(page);
  await page.mouse.move(e.x, e.y, { steps: 3 });
  const t1 = await now(page);
  await page.mouse.up();
  await expect(takers(page)).toHaveCount(0);
  await page.waitForTimeout(400);
  const after = await logged(page, t1);
  const life = lifetime(after, (d) => d.part === "retracting");
  expect(life).not.toBeNull();
  near(life!, ms(feel.CutRetractTime), "retract");
  expect(await cues(page, t0)).toEqual([]);
});

test("FEEL-02: a plugged or moved wire seats: the taker dips, a seat ring grows over RingTime, the sign disc pops, plug at the dip", async ({ page }) => {
  await openOrder(page, 3);
  let t0 = await now(page);
  await plugByTaps(page, "INSPECTOR minus", "LAMINATOR");
  await page.waitForTimeout(500);
  const seatCheck = async (since: number, jackId: string, what: string) => {
    const log = await logged(page, since);
    const dip = dipsOf(log, jackId).at(-1)!;
    expect(dip, `${what}: the taker's dip`).toBeTruthy();
    expect(dip.duration).toBe(ms(feel.SettleTime));
    const plug = (await cues(page, since)).filter((c) => c.name === "plug");
    expect(plug, `${what}: one plug`).toHaveLength(1);
    expect(Math.abs(plug[0]!.t - dip.t), `${what}: plug at the dip`).toBeLessThan(50);
    // Derived: the seat ring grows past the rim and fades over RingTime.
    const seat = lifetime(log, (d) => d.piece === "ring" && d.colour === "cream");
    expect(seat, `${what}: a seat ring`).not.toBeNull();
    near(seat!, ms(feel.RingTime), `${what}: seat ring`);
    return log;
  };
  let log = await seatCheck(t0, "LAMINATOR", "plug");
  const pop = log.find((e) => e.op === "animate" && e.d.piece === "sign-disc");
  expect(pop?.duration).toBe(ms(feel.PopTime));
  // Move its input end to SHREDDER 1: the rings it may take light (every input end but its own), then it seats there.
  t0 = await now(page);
  await bringIntoView(page, jack(page, "LAMINATOR", "in"), 120);
  await dragTo(page, await wirePoint(page, "INSPECTOR minus", "to", 18), jack(page, "SHREDDER 1", "in"));
  await page.waitForTimeout(500);
  expect(await wiresNow(page)).toContain("INSPECTOR minus → SHREDDER 1");
  log = await seatCheck(t0, "SHREDDER 1", "move");
  expect(new Set(log.filter((e) => e.op === "add" && e.d.lit).map((e) => e.d.lit))).toEqual(new Set(["INSPECTOR", "SHREDDER 1", "SHREDDER 2", "Embassy"]));
  // LAMINATOR's output onto the Embassy terminal: its panel dips JackDip of its input jack's plate.
  t0 = await now(page);
  await plugByTaps(page, "LAMINATOR", "Embassy");
  await page.waitForTimeout(500);
  log = await logged(page, t0);
  const panel = log.find((e) => e.op === "animate" && e.d.part === "panel")!;
  expect(panel).toBeTruthy();
  const width = (await page.locator('[data-layer="outputs"] [data-terminal="Embassy"] [data-part="panel"]').evaluate((e) => (e as SVGRectElement).width.baseVal.value));
  expect(lowestScale(panel.frames)).toBeCloseTo(1 - (feel.JackDip * shared.JackMinSize) / width, 3);
});

test("FEEL-03: a cut wire stretches, retracts to its output jack in CutRetractTime whichever end was dragged; unplug at release", async ({ page }) => {
  await openOrder(page, 3);
  for (const end of ["to", "from"] as const) {
    await bringIntoView(page, end === "to" ? jack(page, "LAMINATOR", "in") : jack(page, "INSPECTOR plus", "out"), 120);
    const a = await wirePoint(page, "INSPECTOR plus", end, 18);
    await press(page, a);
    await expect(page.locator('[data-part="held-wire"][data-from="INSPECTOR plus"]')).toHaveCount(1);
    const e = await emptyPoint(page);
    await page.mouse.move(e.x, e.y, { steps: 3 });
    const t0 = await now(page);
    await page.mouse.up();
    const t1 = await now(page);
    await page.waitForTimeout(500);
    expect(await wiresNow(page)).toBe("");
    const log = await logged(page, t0);
    const life = lifetime(log, (d) => d.part === "retracting");
    expect(life, `${end} end: a retract`).not.toBeNull();
    near(life!, ms(feel.CutRetractTime), `${end} end: retract`);
    const unplug = (await cues(page, t0 - 20)).filter((c) => c.name === "unplug");
    expect(unplug).toHaveLength(1);
    expect(unplug[0]!.t).toBeLessThan(t1 + 50);
    // The output jack's plate dips as the wire reaches it; no seat ring, no rings, no mark.
    const dip = dipsOf(log, "INSPECTOR plus")[0]!;
    expect(dip).toBeTruthy();
    near(dip.t - t0, ms(feel.CutRetractTime), `${end} end: dip at the retract's end`);
    expect(log.some((x) => x.op === "add" && x.d.piece === "ring")).toBe(false);
    await expect(takers(page)).toHaveCount(0);
    await control(page, "undo").click();
    await page.waitForTimeout(500);
    expect(await wiresNow(page)).toBe("INSPECTOR plus → LAMINATOR");
  }
});

test("FEEL-14: undo, reset and a replaced wire move only the wires they change; one unplug and one plug each way", async ({ page }) => {
  test.setTimeout(90_000);
  await openOrder(page, 17);
  await cutByDrag(page, "COMPACTOR");
  await bringIntoView(page, jack(page, "Hangar", "in"), 120);
  await dragTo(page, await wirePoint(page, "SHREDDER", "to", 18), jack(page, "Archive", "in"));
  await page.waitForTimeout(500);
  expect(await wiresNow(page)).toContain("SHREDDER → Archive");
  const moved = (log: Logged[], part: string) => [...new Set(log.filter((e) => e.op === "add" && e.d.part === part).map((e) => e.d.from))].sort();
  const step = async (what: string, act: () => Promise<void>, retracts: string[], drawOuts: string[], sounds?: string[]) => {
    const t0 = await now(page);
    await act();
    await page.waitForTimeout(700);
    const log = await logged(page, t0);
    expect(moved(log, "retracting"), `${what}: wires that retract`).toEqual(retracts.sort());
    expect(moved(log, "drawing-out"), `${what}: wires that draw out`).toEqual(drawOuts.sort());
    const c = (await cues(page, t0)).filter((x) => x.name === "plug" || x.name === "unplug");
    const want = sounds ?? [...(retracts.length ? ["unplug"] : []), ...(drawOuts.length ? ["plug"] : [])];
    expect(c.map((x) => x.name), `${what}: sounds`).toEqual(want);
    return { t0, c, log };
  };
  // Reset: SHREDDER → Archive goes; COMPACTOR → Hangar and SHREDDER → Hangar come back; the rest stay still.
  await step("reset", () => control(page, "reset").click(), ["SHREDDER"], ["COMPACTOR", "SHREDDER"]);
  await step("undo the reset", () => control(page, "undo").click(), ["COMPACTOR", "SHREDDER"], ["SHREDDER"]);
  // A replace: the old wire retracts first; the new seats SettleTime after it has gone.
  const r = await step("replace", () => plugByTaps(page, "INSPECTOR plus", "SHREDDER"), ["INSPECTOR plus"], [], ["unplug", "plug"]);
  const unplug = r.c.find((x) => x.name === "unplug")!;
  const plug = (await cues(page, r.t0)).find((x) => x.name === "plug")!;
  expect(plug.t - unplug.t).toBeGreaterThan(ms(feel.CutRetractTime + feel.SettleTime) - 60);
  // Undo back past the opening: the last undo changes nothing, with no sound and no motion.
  await step("undo the replace", () => control(page, "undo").click(), ["INSPECTOR plus"], ["INSPECTOR plus"]);
  await step("undo the move", () => control(page, "undo").click(), ["SHREDDER"], ["SHREDDER"]);
  await step("undo the cut", () => control(page, "undo").click(), [], ["COMPACTOR"]);
  await step("undo at the opening", () => control(page, "undo").click(), [], []);
});

test("FEEL-17: input is live during motion: dips of two plates play; RUN during a retract and a draw-out; a touch ends the opening", async ({ page }) => {
  test.setTimeout(90_000);
  await openOrder(page, 3);
  // Drop a wire and press another output jack during the first dip: both dips play.
  await bringIntoView(page, jack(page, "LAMINATOR", "in"), 120);
  const minus = await centre(jack(page, "INSPECTOR minus", "out"));
  const lam = await centre(jack(page, "LAMINATOR", "in"));
  const lamOut = await centre(jack(page, "LAMINATOR", "out"));
  await tapAt(page, minus);
  await tapAt(page, lam);
  await page.mouse.move(lamOut.x, lamOut.y);
  await page.mouse.down();
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => {
        const j = ((a.effect as KeyframeEffect).target as Element | null)?.parentElement;
        return `${j?.getAttribute("data-jack-id")}|${j?.getAttribute("data-side")}`;
      }),
  );
  await page.mouse.up();
  expect(running).toContain("LAMINATOR|in");
  expect(running).toContain("LAMINATOR|out");
  // Press the same jack again during its dip: the dip jumps to its end and dips anew (one dip runs on that plate).
  const t0 = await now(page);
  await tapAt(page, lamOut);
  await tapAt(page, lamOut);
  const onPlate = await jack(page, "LAMINATOR", "out").locator('[data-part="plate"]').evaluate((p) => p.getAnimations().filter((a) => a.playState === "running").length);
  expect(onPlate).toBeLessThanOrEqual(1);
  expect(dipsOf(await logged(page, t0), "LAMINATOR", "out").length).toBeGreaterThanOrEqual(2);
  await tapAt(page, await emptyPoint(page));
  // RUN while a wire retracts: the retract plays on beside the toggle's throw.
  await bringIntoView(page, jack(page, "INSPECTOR plus", "out"), 120);
  const cutFrom = await wirePoint(page, "INSPECTOR plus", "from", 18);
  await press(page, cutFrom);
  const e = await emptyPoint(page);
  await page.mouse.move(e.x, e.y, { steps: 2 });
  await page.mouse.up();
  const retractAfterRun = await page.evaluate(() => {
    (document.querySelector('[data-control="run"]') as HTMLElement).click();
    return document.querySelectorAll('[data-part="retracting"]').length;
  });
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
  expect(retractAfterRun).toBe(1);
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  // A tap while the report feeds: the paper's motions jump to their end.
  if ((await paper(page).getAttribute("data-state")) === "printing") await tapPaper(page);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  await closeReport(page);
  // RUN while a wire draws out: the draw-out jumps to its end, and the run rides the whole wire.
  const drawing = await page.evaluate(() => {
    (document.querySelector('[data-control="undo"]') as HTMLElement).click();
    const before = document.querySelectorAll('[data-part="drawing-out"]').length;
    (document.querySelector('[data-control="run"]') as HTMLElement).click();
    return { before, after: document.querySelectorAll('[data-part="drawing-out"]').length };
  });
  expect(drawing).toEqual({ before: 1, after: 0 });
  await expect(page.locator('[data-layer="wires"] [data-piece="wire"][data-from="INSPECTOR plus"]')).toHaveCount(1);
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  await tapPaper(page);
  await closeReport(page);
  // A touch while an order opens ends the opening at once: columns and view at their end state.
  const t1 = await now(page);
  await page.evaluate(() => (window as unknown as { tc2: { board: { openOrder(n: number): void } } }).tc2.board.openOrder(3));
  await page.waitForTimeout(60);
  const c = await windowCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.up();
  const v = await viewOf(page);
  await page.waitForTimeout(700);
  expect(await viewOf(page)).toEqual(v);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-part="board-root"] [data-col]')].filter((e) => (e as SVGElement).style.opacity !== "").length);
  expect(hidden).toBe(0);
  expect((await logged(page, t1)).filter((x) => x.op === "col").length).toBeGreaterThan(0);
});

test("FEEL-17: RUN while the report tears starts the run; the last run's leave and the view's return jump to their end", async ({ page }) => {
  await openOrder(page, 4, { wiring: ARCHIVE_WIN });
  await runAndRead(page);
  const run = await centre(control(page, "run"));
  const t0 = await now(page);
  await tapPaper(page);
  await page.mouse.click(run.x, run.y);
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
  // Past the tear and the last run's leave: the new run's first item is off its slot, and stays off it.
  await page.waitForTimeout(ms(feelCampaign.ItemLeaveTime + feelCampaign.TearTime) + 300);
  const log = await logged(page, t0);
  const torn = log.find((e) => e.op === "remove" && e.d.piece === "printout");
  const started = log.find((e) => e.op === "attr" && e.attr === "data-run" && e.value === "running");
  expect(torn, "the report tore away").toBeTruthy();
  expect(started, "the run started").toBeTruthy();
  expect(started!.t).toBeLessThan(torn!.t);
  await expect(page.locator('[data-slot-body="1"]')).toHaveCSS("visibility", "hidden");
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  await tapPaper(page);
  await closeReport(page);
});

// ---------------------------------------------------------------- Run

const ARCHIVE_WIN = "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → LAMINATOR 1";

test("FEEL-04: RUN throws over SwitchThrowTime with its sound at the flip; the plates change with no motion; the lock shows", async ({ page }) => {
  await openOrder(page, 4, { wiring: ARCHIVE_WIN });
  const lever = control(page, "run").locator('[data-part="lever"]');
  const throwTime = await lever.evaluate((e) => getComputedStyle(e).transitionDuration);
  expect(throwTime.split(",").map((x) => parseFloat(x))).toContain(feelRun.SwitchThrowTime);
  const t0 = await now(page);
  await control(page, "run").click();
  const t1 = await now(page);
  const thunk = (await cues(page, t0)).find((c) => c.name === "runSwitch")!;
  expect(thunk.t).toBeLessThan(t1 + 20);
  await expect(control(page, "fast")).toHaveText(/FAST/);
  await expect(control(page, "skip")).toHaveText(/SKIP/);
  const plateMotion = await page.evaluate(() => document.querySelectorAll('[data-control="fast"], [data-control="skip"]').length && [...document.querySelectorAll('[data-control="fast"], [data-control="skip"]')].flatMap((e) => e.getAnimations()).length);
  expect(plateMotion).toBe(0);
  await expect(frameOf(page)).toHaveAttribute("data-locked", "true");
  await expect(control(page, "run")).toHaveAttribute("data-state", "down");
  // The first item lifts from the input terminal at the first beat.
  await untilBeat(page, 1);
  await expect(page.locator('[data-layer="items"] [data-item]').first()).toBeAttached();
});

test("FEEL-05: an agent works within the beat; one working tone a beat, even where two agents work", async ({ page }) => {
  test.setTimeout(60_000);
  // Derived: each cue time's greatest value at most BeatTime's least.
  expect(Math.max(feelRun.LampRiseTime, feelRun.LampFallTime, feel.RingTime, feel.PopTime, feel.SettleTime, feelRun.KindSwapTime)).toBeLessThanOrEqual(shared.BeatTime);
  await openOrder(page, 20, { wiring: "IN → COMPACTOR; COMPACTOR → SLICER; SLICER item → Hangar; SLICER copy → Hangar" });
  const t0 = await now(page);
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 30_000 });
  const log = await logged(page, t0);
  const beatsAt = log.filter((e) => e.op === "attr" && e.attr === "data-beat" && Number(e.value) > 0).map((e) => ({ n: Number(e.value), t: e.t }));
  const working = (await cues(page, t0)).filter((c) => c.name === "working");
  expect(working.length).toBeGreaterThan(0);
  // Beat k plays from the end of beat k-1 to its own end: one working tone in each, at its start. (Window edges a little
  // early: the tone at a beat's start and the beat count's change land in the same moment.)
  const ends = [t0 - 50, ...beatsAt.map((b) => b.t - 50)];
  for (let k = 1; k < ends.length; k++) expect(working.filter((c) => c.t >= ends[k - 1]! && c.t < ends[k]!).length, `beat ${k}`).toBeLessThanOrEqual(1);
  // COMPACTOR's lamp lit with its ring; the kind swap and the mark tile within the beat.
  expect(log.some((e) => e.op === "attr" && e.attr === "data-state" && e.d.piece === "lamp" && e.value !== "off")).toBe(true);
});

test("FEEL-06: verdict lamps light with their sign; a feedback wire's dashes march at DashMarchSpeed while an item rides it", async ({ page }) => {
  test.setTimeout(60_000);
  await openOrder(page, 11, { wiring: "IN → INSPECTOR; INSPECTOR plus → TASTER; INSPECTOR minus → Canteen; TASTER minus → INSPECTOR" });
  const t0 = await now(page);
  await page.evaluate(() => {
    const out: { t: number; off: number; trace: number | null }[] = [];
    (window as unknown as { __march: typeof out }).__march = out;
    const step = () => {
      const w = document.querySelector('[data-layer="wires"] [data-piece="wire"][data-from="INSPECTOR plus"] [data-part="core"]');
      const tr = document.querySelector('[data-layer="traces"] [data-piece="trace"][data-kind="plus"]');
      if (w) out.push({ t: performance.now(), off: parseFloat(w.getAttribute("stroke-dashoffset") ?? "0"), trace: tr ? parseFloat(tr.getAttribute("stroke-dashoffset") ?? "0") : null });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 30_000 });
  const log = await logged(page, t0);
  const signs = new Set(log.filter((e) => e.op === "attr" && e.attr === "data-state" && e.d.piece === "lamp").map((e) => e.value));
  expect(signs.has("plus") || signs.has("minus")).toBe(true);
  const march = await page.evaluate(() => (window as unknown as { __march: { t: number; off: number; trace: number | null }[] }).__march);
  // The fastest stretch of marching over a quarter second: DashMarchSpeed.
  let best = 0;
  for (let i = 0; i < march.length; i++) {
    const j = march.findIndex((m, k) => k > i && m.t - march[i]!.t >= 250);
    if (j < 0) break;
    best = Math.max(best, Math.abs(march[j]!.off - march[i]!.off) / ((march[j]!.t - march[i]!.t) / 1000));
  }
  expect(best).toBeGreaterThan(feelRun.DashMarchSpeed * 0.6);
  expect(best).toBeLessThan(feelRun.DashMarchSpeed * 1.4);
  // Where the wire runs under a label plate, its trace marches in step.
  const withTrace = march.filter((m) => m.trace !== null);
  for (const m of withTrace) expect(Math.abs(m.trace! - m.off)).toBeLessThan(0.01);
  // One minus tone in a beat where two items get minus.
  const beatsAt = log.filter((e) => e.op === "attr" && e.attr === "data-beat" && Number(e.value) > 0).map((e) => e.t);
  const minus = (await cues(page, t0)).filter((c) => c.name === "minus");
  // The verdict tones sound as a beat starts; arrival tones come ArrivalStagger and more after it.
  const starts = [t0, ...beatsAt];
  for (const [k, b] of starts.entries()) {
    const atStart = minus.filter((c) => c.t >= b - 50 && c.t < b + ms(feelRun.ArrivalStagger) / 2);
    expect(atStart.length, `beat ${k + 1}: verdict minus tones`).toBeLessThanOrEqual(1);
  }
});

test("FEEL-07: items settle into their slots; arrival tones follow each other by ArrivalStagger", async ({ page }) => {
  test.setTimeout(60_000);
  await openOrder(page, 20, { wiring: "IN → COMPACTOR; COMPACTOR → SLICER; SLICER item → Hangar; SLICER copy → Hangar" });
  const t0 = await now(page);
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 30_000 });
  const log = await logged(page, t0);
  const arrivals = log.filter((e) => e.op === "add" && e.d.result !== undefined);
  expect(arrivals.length).toBeGreaterThan(1);
  // A copy right behind its original, in the same beat; its tone ArrivalStagger after the original's.
  const tones = (await cues(page, t0)).filter((c) => c.name === "plus" || c.name === "minus");
  const groups: number[][] = [];
  for (const a of arrivals) {
    const g = groups.find((x) => Math.abs(x[0]! - a.t) < 50);
    if (g) g.push(a.t);
    else groups.push([a.t]);
  }
  const multi = groups.filter((g) => g.length > 1);
  expect(multi.length).toBeGreaterThan(0);
  for (const g of multi) {
    const ts = tones.filter((c) => c.t >= g[0]! - 20 && c.t < g[0]! + ms(feelRun.ArrivalStagger) * (g.length + 1)).map((c) => c.t);
    for (let i = 1; i < Math.min(ts.length, g.length); i++) near(ts[i]! - ts[i - 1]!, ms(feelRun.ArrivalStagger), "arrival stagger");
  }
  // Each result's sign pops; its body settles (SettleTime).
  expect(log.some((e) => e.op === "animate" && e.duration === ms(feel.PopTime))).toBe(true);
  expect(log.some((e) => e.op === "animate" && e.duration === ms(feel.SettleTime) && e.frames?.includes("translate"))).toBe(true);
});

test("FEEL-08: a stopped item dims over StopDimTime to StopLight; its jack pulses; lost items dim where they stand", async ({ page }) => {
  test.setTimeout(60_000);
  await openOrder(page, 1);
  await cutByDrag(page, "IN");
  const t0 = await now(page);
  await page.evaluate(() => {
    const out: { t: number; id: string; op: number }[] = [];
    (window as unknown as { __dim: typeof out }).__dim = out;
    const step = () => {
      for (const g of document.querySelectorAll('[data-item][data-dimmed="true"]')) out.push({ t: performance.now(), id: g.getAttribute("data-item")!, op: Number((g as SVGElement).style.opacity || "1") });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 30_000 });
  const dim = await page.evaluate(() => (window as unknown as { __dim: { t: number; id: string; op: number }[] }).__dim);
  const ids = [...new Set(dim.map((d) => d.id))];
  expect(ids.length).toBe(3);
  for (const id of ids) {
    const mine = dim.filter((d) => d.id === id);
    // Derived: dims over StopDimTime to StopLight.
    expect(mine.at(-1)!.op).toBeCloseTo(feelRun.StopLight, 2);
    const reached = mine.find((d) => d.op <= feelRun.StopLight + 1e-3)!;
    near(reached.t - mine[0]!.t, ms(feelRun.StopDimTime), `item ${id} dims`);
  }
  const log = await logged(page, t0);
  expect(log.some((e) => e.op === "add" && e.d.piece === "ring" && e.d.colour === "cream")).toBe(true);
  const unplugs = (await cues(page, t0)).filter((c) => c.name === "unplug");
  expect(unplugs.length).toBe(3);
  for (let i = 1; i < unplugs.length; i++) near(unplugs[i]!.t - unplugs[i - 1]!.t, ms(feelRun.ArrivalStagger), "stop tones");
  await page.waitForTimeout(2500);
  if ((await paper(page).getAttribute("data-state")) === "printing") await tapPaper(page);
  await closeReport(page);
  // Lost at RunLimit: every item dims where it stands, stamped LOST.
  await plugByTaps(page, "IN", "LAMINATOR");
  await page.waitForTimeout(300);
  await plugByTaps(page, "LAMINATOR", "LAMINATOR");
  await page.waitForTimeout(300);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  for (const op of await page.locator('[data-item][data-dimmed="true"]').evaluateAll((l) => l.map((e) => Number((e as SVGElement).style.opacity)))) expect(op).toBeCloseTo(feelRun.StopLight, 2);
  await expect(page.locator('[data-stamp]')).toHaveCount(3);
});

test("FEEL-15: FAST divides every motion and sound by FastFactor; SKIP and a hidden page leave no sound; auto fast past AutoFastBeat", async ({ page }) => {
  test.setTimeout(120_000);
  await openOrder(page, 4, { wiring: ARCHIVE_WIN });
  // Normal speed: no cue played fast.
  let t0 = await now(page);
  await runAndRead(page, { skip: false });
  expect((await cues(page, t0)).filter((c) => c.fast !== undefined)).toEqual([]);
  await closeReport(page);
  // FAST after the first beat: beats in BeatTime / FastFactor; every run sound after it played fast.
  t0 = await now(page);
  await control(page, "run").click();
  await untilBeat(page, 1);
  await control(page, "fast").click();
  const tf = await now(page);
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 30_000 });
  const beatsAt = (await logged(page, tf)).filter((e) => e.op === "attr" && e.attr === "data-beat" && Number(e.value) > 1).map((e) => e.t);
  for (let i = 1; i < beatsAt.length; i++) near(beatsAt[i]! - beatsAt[i - 1]!, ms(shared.BeatTime / shared.FastFactor), "fast beat");
  const fastCues = (await cues(page, tf + 30)).filter((c) => ["working", "plus", "minus", "unplug"].includes(c.name));
  expect(fastCues.length).toBeGreaterThan(0);
  for (const c of fastCues) expect(c.fast).toBe(shared.FastFactor);
  // No gap under FastSoundMin between two tones of a sequence (tones of one cue moment start together).
  for (let i = 1; i < fastCues.length; i++) {
    const gap = fastCues[i]!.t - fastCues[i - 1]!.t;
    if (gap > 5) expect(gap).toBeGreaterThan(ms(feelRun.FastSoundMin) - 15);
  }
  await expect(paper(page)).toBeVisible();
  await tapPaper(page);
  await closeReport(page);
  // SKIP: no run sound after it.
  await control(page, "run").click();
  await untilBeat(page, 1);
  await control(page, "skip").click();
  const ts = await now(page);
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  expect((await cues(page, ts + 30)).filter((c) => ["working", "plus", "minus", "unplug", "alarm"].includes(c.name))).toEqual([]);
  await tapPaper(page);
  await closeReport(page);
  // Hidden mid-run: no sound while hidden.
  await control(page, "run").click();
  await untilBeat(page, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const th = await now(page);
  await page.waitForTimeout(800);
  expect((await cues(page, th + 30)).filter((c) => ["working", "plus", "minus", "unplug", "teletype"].includes(c.name))).toEqual([]);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
});

test("FEEL-15: a run past AutoFastBeat plays fast on its own, its sounds with it", async ({ page }) => {
  test.setTimeout(90_000);
  await openOrder(page, 1, { wiring: "IN → LAMINATOR; LAMINATOR → LAMINATOR" });
  await control(page, "run").click();
  await untilBeat(page, P.AutoFastBeat + 1, 40_000);
  await expect(frameOf(page)).toHaveAttribute("data-speed", "fast");
  const t = await now(page);
  await untilBeat(page, P.AutoFastBeat + 6);
  const c = (await cues(page, t)).filter((x) => x.name === "working");
  expect(c.length).toBeGreaterThan(0);
  for (const x of c) expect(x.fast).toBe(shared.FastFactor);
});

// ---------------------------------------------------------------- Campaign-side feel the board owns

test("FEEL-09: the report feeds from the window's bottom; lines print a PrintLineTime apart; par lamps light with their lines", async ({ page }) => {
  test.skip(!isPhone(page), "FEEL-09 runs on the smallest screen");
  test.setTimeout(60_000);
  await openOrder(page, 4, { wiring: ARCHIVE_WIN });
  await expect(page.locator('[data-part="order-lamps"] [data-lamp="WIRES"]')).toHaveAttribute("data-state", "off");
  const t0 = await now(page);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 30_000 });
  const log = await logged(page, t0);
  const lines = log.filter((e) => e.op === "add" && e.d.part === "paper-line");
  expect(lines.length).toBeGreaterThan(3);
  for (let i = 2; i < lines.length; i++) near(lines[i]!.t - lines[i - 1]!.t, ms(shared.PrintLineTime), `line ${i + 1}`);
  // The paper's bottom sits on the window's bottom edge.
  const pb = (await paper(page).boundingBox())!;
  const wb = (await windowOf(page).boundingBox())!;
  expect(Math.abs(pb.y + pb.height - (wb.y + wb.height))).toBeLessThan(6);
  // The WIRES lamp lights as its score line prints, with the working tone.
  const lit = log.find((e) => e.op === "attr" && e.attr === "data-state" && e.d.lamp === "WIRES" && e.value === "steady")!;
  expect(lit).toBeTruthy();
  const all = await paperLines(page);
  const k = all.findIndex((l) => /^Wires /.test(l));
  expect(k).toBeGreaterThanOrEqual(0);
  expect(Math.abs(lit.t - lines[k]!.t)).toBeLessThan(60);
  const tone = (await cues(page, t0)).find((c) => c.name === "working" && Math.abs(c.t - lit.t) < 60);
  expect(tone).toBeTruthy();
  await closeReport(page);
  // Again: the lamp already lit stays lit, with no ring and no tone.
  const t1 = await now(page);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  await tapPaper(page);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  expect((await logged(page, t1)).some((e) => e.op === "attr" && e.d.lamp === "WIRES")).toBe(false);
});

test("FEEL-10: the full alarm: lamp and tone, the room dims and returns within the silence, then the report; a tap cuts it", async ({ page }) => {
  test.setTimeout(60_000);
  await openOrder(page, 1);
  await cutByDrag(page, "IN");
  const t0 = await now(page);
  await control(page, "run").click();
  await expect(paper(page)).toBeVisible({ timeout: 30_000 });
  const alarm = (await cues(page, t0)).find((c) => c.name === "alarm")!;
  expect(alarm).toBeTruthy();
  const log = await logged(page, t0);
  const dims = log.filter((e) => e.op === "attr" && e.attr === "opacity" && e.d.part === "room-dim").map((e) => ({ t: e.t, v: Number(e.value) }));
  const peak = dims.reduce((a, b) => (b.v > a.v ? b : a), { t: 0, v: 0 });
  // The room dims to RoomLight and returns; dim and return, twice RoomDimTime, fit in AlarmSilenceTime after the tone.
  expect(peak.v).toBeCloseTo(1 - feelCampaign.RoomLight, 2);
  // Dims over RoomDimTime, holds, returns over RoomDimTime: all inside the silence after the tone.
  const first = dims.find((d) => d.v > 0)!;
  const atPeak = dims.filter((d) => d.v >= peak.v - 1e-3);
  const back = dims.filter((d) => d.t > peak.t).find((d) => d.v === 0)!;
  expect(first.t - alarm.t).toBeGreaterThan(ms(feelCampaign.AlarmToneTime) - 80);
  expect(back.t - alarm.t).toBeLessThan(ms(feelCampaign.AlarmToneTime + feelCampaign.AlarmSilenceTime) + 80);
  near(atPeak[0]!.t - first.t, ms(feelCampaign.RoomDimTime), "dim");
  const leaving = dims.find((d) => d.t > atPeak[0]!.t && d.v < peak.v - 1e-3)!;
  near(back.t - leaving.t, ms(feelCampaign.RoomDimTime), "return");
  expect(feelCampaign.RoomDimTime).toBeLessThanOrEqual(feelCampaign.AlarmSilenceTime / 2);
  const fed = log.find((e) => e.op === "add" && e.d.piece === "printout")!;
  expect(fed.t - alarm.t).toBeGreaterThan(ms(feelCampaign.AlarmToneTime + feelCampaign.AlarmSilenceTime) - 80);
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 10_000 });
  await closeReport(page);
  // IN → LAMINATOR, LAMINATOR's output unwired: tap during the alarm, and the report prints at once.
  await plugByTaps(page, "IN", "LAMINATOR");
  await page.waitForTimeout(300);
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "alarm", { timeout: 30_000 });
  await tapAt(page, await windowCentre(page));
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 1000 });
});

test("FEEL-11: an order opens: columns in flow order OpenStagger apart, the camera from OpenZoomFrom or OpenPanFrom over OpenSettleTime", async ({ page }) => {
  const n = isPhone(page) ? 29 : 3;
  await page.goto(`/sandbox.html?order=${n}`);
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  await page.waitForTimeout(1000);
  const log = await logged(page, 0);
  const cols = log.filter((e) => e.op === "col").map((e) => ({ col: Number(e.d.col), t: e.t }));
  const firsts = [...new Map(cols.map((c) => [c.col, c.t])).entries()].sort((a, b) => a[0] - b[0]);
  expect(firsts.length).toBeGreaterThan(2);
  for (let i = 1; i < firsts.length; i++) near(firsts[i]![1] - firsts[i - 1]![1], ms(feelCampaign.OpenStagger), `column ${firsts[i]![0]}`);
  const views = log.filter((e) => e.op === "view").map((e) => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(e.value!)!;
    return { t: e.t, tx: Number(m[1]), ty: Number(m[2]), z: Number(m[3]) };
  });
  const a = views[0]!;
  const z = views.at(-1)!;
  near(z.t - a.t, ms(feelCampaign.OpenSettleTime), "camera");
  const w = (await page.locator('[data-part="board"]').boundingBox())!;
  // Where the framed zoom less OpenZoomFrom would show a jack under JackMinSize, the camera pans in instead.
  if (z.z * feelCampaign.OpenZoomFrom < 1) {
    // Too wide for its framed zoom less OpenZoomFrom: Derived: pan start = OpenPanFrom × window length along the flow.
    expect(a.z).toBeCloseTo(z.z, 3);
    const portrait = (await frameOf(page).getAttribute("data-flow")) === "portrait";
    const off = portrait ? a.ty - z.ty : a.tx - z.tx;
    expect(Math.abs(off - feelCampaign.OpenPanFrom * (portrait ? w.height : w.width))).toBeLessThan(2);
  } else {
    // Derived: zoom start = OpenZoomFrom × framed zoom.
    expect(a.z / z.z).toBeCloseTo(feelCampaign.OpenZoomFrom, 2);
  }
  // Touch mid-opening: it ends at once.
  const t1 = await now(page);
  await page.evaluate((n) => (window as unknown as { tc2: { board: { openOrder(n: number): void } } }).tc2.board.openOrder(n), n);
  await page.waitForTimeout(100);
  const c = await windowCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.up();
  const v = await viewOf(page);
  expect(v.z).toBeCloseTo(z.z, 3);
  expect(v.tx).toBeCloseTo(z.tx, 0);
  expect(v.ty).toBeCloseTo(z.ty, 0);
  await page.waitForTimeout(600);
  expect(await viewOf(page)).toEqual(v);
  expect((await logged(page, t1)).length).toBeGreaterThan(0);
});

test("FEEL-12: standby: the console dims but AUDIO and the run switch's ring; the first tap wakes it within WakeTime; then taps wait", async ({ page }) => {
  await openOrder(page, 1);
  await page.evaluate(() => {
    const w = window as unknown as { __taps: number; tc2: { board: { openOrder(n: number, o: unknown): void } } };
    w.__taps = 0;
    w.tc2.board.openOrder(1, { standby: { onStandbyTap: () => w.__taps++ } });
  });
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true");
  await expect(page.locator('[data-part="standby-ring"]')).toHaveCount(1);
  // AUDIO stays live: it flips and wakes nothing.
  const audio = page.locator('[data-control="audio"]');
  const muted0 = await page.evaluate(() => (window as unknown as { tc2: { board: unknown } }).tc2 !== undefined);
  expect(muted0).toBe(true);
  await audio.click();
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true");
  expect(await page.evaluate(() => (window as unknown as { __taps: number }).__taps)).toBe(0);
  await audio.click();
  // The first tap anywhere else: onStandbyTap, and the console lit within WakeTime.
  const t0 = await now(page);
  await tapAt(page, await windowCentre(page));
  expect(await page.evaluate(() => (window as unknown as { __taps: number }).__taps)).toBe(1);
  await expect(frameOf(page)).toHaveAttribute("data-standby", "false");
  const lit = (await logged(page, t0)).find((e) => e.op === "attr" && e.attr === "data-standby" && e.value === "false")!;
  expect(lit.t - t0).toBeLessThan(ms(feelCampaign.WakeTime) + 120);
  // Taps now wait for the run: a tap on an output jack holds nothing; RUN does nothing of its own.
  await tapAt(page, await bringIntoView(page, jack(page, "IN", "out")));
  await expect(page.locator('[data-part="held-wire"]')).toHaveCount(0);
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  expect(await page.evaluate(() => (window as unknown as { __taps: number }).__taps)).toBe(1);
  // The campaign throws the switch (board.run()): the run plays.
  await page.evaluate(() => void (window as unknown as { tc2: { board: { run(): Promise<unknown> } } }).tc2.board.run());
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
});

test("FEEL-16: the report closes: the tear, the toggle's return with its sound, one view move of ViewMoveTime from the tear, items leave", async ({ page }) => {
  await openOrder(page, 4, { wiring: ARCHIVE_WIN });
  await runAndRead(page);
  const t0 = await now(page);
  await tapPaper(page);
  const tTap = await now(page);
  await expect(paper(page)).toHaveAttribute("data-state", "tearing");
  await expect(control(page, "undo")).toHaveText(/UNDO/);
  await page.waitForTimeout(1200);
  const log = await logged(page, t0);
  const torn = log.find((e) => e.op === "remove" && e.d.piece === "printout")!;
  near(torn.t - t0, ms(feelCampaign.TearTime), "tear");
  const thunk = (await cues(page, t0)).find((c) => c.name === "runSwitch")!;
  expect(thunk.t).toBeLessThan(tTap + 30);
  const views = log.filter((e) => e.op === "view");
  expect(views.length).toBeGreaterThan(0);
  // The move starts with the tear: by the time the tap call returns (Firefox's tap call alone can take 60 ms).
  expect(views[0]!.t).toBeLessThan(tTap + 30);
  near(views.at(-1)!.t - views[0]!.t, ms(shared.ViewMoveTime), "view move");
  const leave = log.filter((e) => e.op === "remove" && (e.d.item !== undefined || e.d.result !== undefined));
  expect(leave.length).toBeGreaterThan(0);
  near(leave.at(-1)!.t - t0, ms(feelCampaign.ItemLeaveTime), "items leave");
  await expect(page.locator('[data-layer="results"] [data-result]')).toHaveCount(0);
  // Again, and RUN at once after the close: the run starts.
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  await tapPaper(page);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  await tapPaper(page);
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
});
