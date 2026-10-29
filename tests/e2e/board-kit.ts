// Helpers for the Board browser tests: open an order in the test sandbox, find jacks on screen, wire through the real UI.
import { expect, type Locator, type Page } from "@playwright/test";

export type Pt = { x: number; y: number };

export const P = {
  JackMinSize: 44,
  JackMaxSize: 120,
  EdgePanZone: 40,
  EdgePanSpeed: 400,
  BoardMargin: 16,
  BeatTime: 1.0,
  FastFactor: 4,
  AutoFastBeat: 20,
  ViewMoveTime: 0.6,
  ViewHold: 1.0,
  ViewMargin: 80,
  PrintLineTime: 0.15,
  SettleTime: 0.14,
  LitStagger: 0.04,
  CutRetractTime: 0.15,
  RingTime: 0.3,
  PopTime: 0.16,
  JackDip: 0.12,
  SwitchThrowTime: 0.12,
  StopLight: 0.6,
  StopDimTime: 0.5,
  AlarmToneTime: 1.0,
  AlarmSilenceTime: 0.8,
  RoomLight: 0.45,
  RoomDimTime: 0.2,
  TearTime: 0.25,
  ItemLeaveTime: 0.5,
  OpenStagger: 0.08,
  OpenSettleTime: 0.5,
  OpenZoomFrom: 0.92,
  OpenPanFrom: 0.08,
  StandbyLight: 0.25,
  WakeTime: 0.25,
  PaperFeedTime: 0.3,
  RunLimit: 99,
} as const;

export const frameOf = (page: Page) => page.locator('.tc-frame[data-screen="board"]');
export const windowOf = (page: Page) => page.locator('.tc-frame[data-screen="board"] .tc-window');
export const control = (page: Page, name: string) => page.locator(`[data-control="${name}"]`);

export async function openOrder(page: Page, n: number, o: { wiring?: string; layers?: 2 } = {}): Promise<void> {
  const q = new URLSearchParams({ order: String(n) });
  if (o.wiring !== undefined) q.set("wiring", o.wiring);
  if (o.layers) q.set("layers", String(o.layers));
  await page.goto(`/sandbox.html?${q}`);
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  // FEEL-11: the opening settles within OpenSettleTime and its column stagger.
  await page.waitForTimeout(800);
}

export async function windowRect(page: Page) {
  const r = (await windowOf(page).boundingBox())!;
  const b = 3;
  return { x: r.x + b, y: r.y + b, w: r.width - 2 * b, h: r.height - 2 * b };
}

export const jack = (page: Page, id: string, side: "out" | "in") => page.locator(`[data-jack-id="${id}"][data-side="${side}"]`).first();

export async function centre(l: Locator): Promise<Pt> {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export async function zoom(page: Page): Promise<number> {
  return Number(await frameOf(page).getAttribute("data-zoom"));
}

export async function transform(page: Page): Promise<string> {
  return (await page.locator('[data-part="board-root"]').getAttribute("transform")) ?? "";
}

/** Pans with the wheel (BOARD-03) until a screen point of the board lies inside the window, `margin` from its edges. */
export async function bringIntoView(page: Page, l: Locator, margin = 70): Promise<Pt> {
  for (let i = 0; i < 6; i++) {
    const p = await centre(l);
    const w = await windowRect(page);
    const inside = p.x >= w.x + margin && p.x <= w.x + w.w - margin && p.y >= w.y + margin && p.y <= w.y + w.h - margin;
    if (inside) return p;
    const mid = { x: w.x + w.w / 2, y: w.y + w.h / 2 };
    await page.mouse.move(mid.x, mid.y);
    await page.mouse.wheel(p.x - mid.x, p.y - mid.y);
    await page.waitForTimeout(60);
  }
  return centre(l);
}

/** A tap: a click by mouse, or a tap on the touch screen. */
export async function tapAt(page: Page, p: Pt, touch = false): Promise<void> {
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

export async function wiresNow(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as { tc2: { wiring(): string } }).tc2.wiring());
}

export const wireEl = (page: Page, from: string, to?: string) =>
  page.locator(`[data-layer="wires"] [data-piece="wire"][data-from="${from}"]${to ? `[data-to="${to}"]` : ""}`);

/** WIRE-02, WIRE-03 by tap-tap: tap an output jack, then the input end, panning between as needed. */
export async function plugByTaps(page: Page, from: string, to: string, touch = false): Promise<void> {
  const a = await bringIntoView(page, jack(page, from, "out"));
  await tapAt(page, a, touch);
  const b = await bringIntoView(page, jack(page, to, "in"));
  await tapAt(page, b, touch);
  await expect(wireEl(page, from, to)).toHaveCount(1);
}

/** WIRE-02, WIRE-03 by a mouse drag from the output jack to the input end; both must be in view together. */
export async function plugByDrag(page: Page, from: string, to: string): Promise<void> {
  const a = await centre(jack(page, from, "out"));
  const b = await centre(jack(page, to, "in"));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await expect(wireEl(page, from, to)).toHaveCount(1);
}

/** A screen point on empty board: no jack within 40 pixels, no terminal panel, 70 pixels in from the window's edges. */
export async function emptyPoint(page: Page): Promise<Pt> {
  return page.evaluate(() => {
    const win = document.querySelector('.tc-frame[data-screen="board"] .tc-window')!.getBoundingClientRect();
    const jacks = [...document.querySelectorAll("[data-jack-id]")].map((e) => e.getBoundingClientRect());
    const panels = [...document.querySelectorAll('[data-terminal] [data-part="panel"]')].map((e) => e.getBoundingClientRect());
    const faces = [...document.querySelectorAll('[data-layer="faceBase"] [data-part="face"]')].map((e) => e.getBoundingClientRect());
    const wires = [...document.querySelectorAll('[data-layer="wires"] [data-part="core"]')] as SVGPathElement[];
    const nearWire = (x: number, y: number) =>
      wires.some((p) => {
        const m = p.getScreenCTM()!;
        const n = p.getTotalLength();
        for (let s = 0; s <= n; s += 6) {
          const q = p.getPointAtLength(s);
          const X = m.a * q.x + m.c * q.y + m.e;
          const Y = m.b * q.x + m.d * q.y + m.f;
          if (Math.hypot(X - x, Y - y) < 40) return true;
        }
        return false;
      });
    const inside = (r: DOMRect, x: number, y: number, pad = 0) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
    for (let y = win.top + 70; y < win.bottom - 70; y += 20)
      for (let x = win.left + 70; x < win.right - 70; x += 20) {
        if (jacks.some((r) => Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) < 40 + r.width / 2)) continue;
        if (panels.some((r) => inside(r, x, y, 10))) continue;
        if (faces.some((r) => inside(r, x, y, 10))) continue;
        if (nearWire(x, y)) continue;
        return { x, y };
      }
    throw new Error("no empty board in view");
  });
}

/** A point on a wire, `fromStart` CSS pixels past its output jack's edge (inside EndLength): where a press holds its output end. */
export async function wireEndPoint(page: Page, from: string, end: "from" | "to", px = 18): Promise<Pt> {
  return page.evaluate(
    ([from, end, px]) => {
      const g = document.querySelector(`[data-layer="wires"] [data-piece="wire"][data-from="${from}"]`)!;
      const p = g.querySelector('[data-part="core"]') as SVGPathElement;
      const m = p.getScreenCTM()!;
      const z = Math.hypot(m.a, m.b);
      const n = p.getTotalLength();
      const s = 22 + Number(px) / z;
      const q = p.getPointAtLength(end === "from" ? s : n - s);
      return { x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f };
    },
    [from, end, px] as const,
  );
}

export async function drag(page: Page, a: Pt, b: Pt, steps = 8): Promise<void> {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + (b.x - a.x) * 0.3, a.y + (b.y - a.y) * 0.3, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

/** WIRE-05: drag a wire by its output end (or its input end) onto empty board. */
export async function cutByDrag(page: Page, from: string, end: "from" | "to" = "from"): Promise<void> {
  const to = await wireEl(page, from).getAttribute("data-to");
  await bringIntoView(page, end === "from" ? jack(page, from, "out") : jack(page, to!, "in"));
  const a = await wireEndPoint(page, from, end);
  const b = await emptyPoint(page);
  await drag(page, a, b);
  await expect(wireEl(page, from)).toHaveCount(0);
}

export type Wire = { from: string; to: string };

/** Makes the board's wiring equal `target` through the UI: plugs by taps, then cuts what the target lacks. */
export async function wireUp(page: Page, target: readonly Wire[], touch = false): Promise<void> {
  const now = async () =>
    (await wiresNow(page))
      .split("; ")
      .filter(Boolean)
      .map((s) => {
        const [from, to] = s.split(" → ");
        return { from: from!, to: to! };
      });
  for (const w of target) {
    if ((await now()).some((x) => x.from === w.from && x.to === w.to)) continue;
    await plugByTaps(page, w.from, w.to, touch);
    await page.waitForTimeout(400);
  }
  for (const w of await now()) if (!target.some((x) => x.from === w.from)) await cutByDrag(page, w.from);
  const final = await now();
  expect(final.map((w) => `${w.from} → ${w.to}`).sort()).toEqual(target.map((w) => `${w.from} → ${w.to}`).sort());
}

export const paper = (page: Page) => page.locator('[data-piece="printout"][data-report]');

/** The lines printed on the report so far: each line's first strike. */
export async function paperLines(page: Page): Promise<string[]> {
  // ART-12: a line wraps onto rows at spaces; the rows join back into the authored line.
  return (await paper(page).locator('[data-part="paper-line"] [data-part="strike1"]').allTextContents()).map((t) => t.replace(/\n/g, " "));
}

/** Flips RUN, skips to the report, prints it whole with a tap, returns its lines and form. */
export async function runAndRead(page: Page, o: { skip?: boolean } = {}): Promise<{ form: string; lines: string[] }> {
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
  if (o.skip !== false) await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 60_000 });
  if ((await paper(page).getAttribute("data-state")) === "printing") await tapPaper(page);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  const form = (await paper(page).getAttribute("data-form"))!;
  return { form, lines: await paperLines(page) };
}

/** A tap on the paper: prints the rest at once, or closes it once whole (REPORT-04). */
export async function tapPaper(page: Page): Promise<void> {
  const b = (await paper(page).boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + Math.min(40, b.height / 2));
}

export async function closeReport(page: Page): Promise<void> {
  await tapPaper(page);
  await expect(paper(page)).toHaveCount(0);
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  // VIEW-05: the view's move back to the opening framing.
  await page.waitForTimeout(P.ViewMoveTime * 1000 + 100);
}

/**
 * Drags from a screen point to a jack (or to empty board), with the button held all the way: where the target lies past the
 * window, the held end waits inside EdgePanZone of that edge while the board pans (BOARD-03), then goes on.
 */
export async function dragTo(page: Page, from: Pt, target: Locator | "empty"): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 3 });
  if (target === "empty") {
    const b = await emptyPoint(page);
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    return;
  }
  for (let i = 0; i < 80; i++) {
    const p = await centre(target);
    const w = await windowRect(page);
    const m = P.EdgePanZone + 20;
    if (p.x >= w.x + m && p.x <= w.x + w.w - m && p.y >= w.y + m && p.y <= w.y + w.h - m) {
      // Straight out of the edge zone onto the target, then onto it again should the last frame of edge pan have moved it.
      let q = p;
      for (let k = 0; k < 5; k++) {
        await page.mouse.move(q.x, q.y);
        await page.waitForTimeout(60);
        const q2 = await centre(target);
        if (Math.hypot(q2.x - q.x, q2.y - q.y) < 1) break;
        q = q2;
      }
      await page.mouse.up();
      return;
    }
    const x = p.x < w.x + m ? w.x + 10 : p.x > w.x + w.w - m ? w.x + w.w - 10 : Math.min(Math.max(p.x, w.x + m), w.x + w.w - m);
    const y = p.y < w.y + m ? w.y + 10 : p.y > w.y + w.h - m ? w.y + w.h - 10 : Math.min(Math.max(p.y, w.y + m), w.y + w.h - m);
    await page.mouse.move(x, y, { steps: 2 });
    await page.waitForTimeout(80);
  }
  const p = await centre(target);
  const w = await windowRect(page);
  await page.mouse.up();
  throw new Error(`the target ${target} never came into view: at ${p.x.toFixed(0)},${p.y.toFixed(0)}; window ${w.x},${w.y} ${w.w}x${w.h}`);
}

/** Waits until the run shows beat `n` or a later one. */
export async function untilBeat(page: Page, n: number, timeout = 30_000): Promise<void> {
  await page.waitForFunction((n) => Number(document.querySelector('.tc-frame[data-screen="board"] .tc-window')?.getAttribute("data-beat")) >= n, n, { timeout });
}

/** Records the time each beat shows (the window's data-beat), for timing tests. */
export async function recordBeats(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = document.querySelector('.tc-frame[data-screen="board"] .tc-window')!;
    const log: { n: number; t: number }[] = [];
    (window as unknown as { __beats: typeof log }).__beats = log;
    new MutationObserver(() => log.push({ n: Number(w.getAttribute("data-beat")), t: performance.now() })).observe(w, { attributes: true, attributeFilter: ["data-beat"] });
  });
}

export async function beats(page: Page): Promise<{ n: number; t: number }[]> {
  return page.evaluate(() => (window as unknown as { __beats: { n: number; t: number }[] }).__beats);
}

export async function lastRun(page: Page): Promise<{ moves: number | null; win: boolean; reportId: string; lines: string[] } | null> {
  return page.evaluate(() => {
    const r = (window as unknown as { tc2: { board: { lastRun(): { moves: number | null; trace: { win: boolean }; report: { lines: string[] } } | null } } }).tc2.board.lastRun();
    return r ? { moves: r.moves, win: r.trace.win, reportId: "", lines: r.report.lines } : null;
  });
}

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 800;

export type Logged = {
  t: number;
  op: "add" | "remove" | "attr" | "animate" | "view" | "col";
  d: Record<string, string>;
  parent?: Record<string, string>;
  attr?: string;
  value?: string | null;
  duration?: number;
  delay?: number;
  frames?: string;
};

/**
 * Before the page loads: logs, with their times, every element with data attributes added to or removed from the page, the
 * changes of the state attributes, and every Web Animation started (with its duration and delay), for the timing tests.
 */
export async function instrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: Logged[] = [];
    (window as unknown as { __log: Logged[] }).__log = log;
    const data = (el: Element | null): Record<string, string> => {
      const out: Record<string, string> = {};
      if (!el || !(el instanceof HTMLElement || el instanceof SVGElement)) return out;
      for (const [k, v] of Object.entries(el.dataset)) out[k] = v ?? "";
      if (el.classList.length) out.class = el.getAttribute("class") ?? "";
      return out;
    };
    const anim = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, k: Keyframe[] | PropertyIndexedKeyframes | null, o?: number | KeyframeAnimationOptions) {
      const opts = typeof o === "number" ? { duration: o } : (o ?? {});
      log.push({ t: performance.now(), op: "animate", d: data(this), parent: data(this.parentElement), duration: Number(opts.duration ?? 0), delay: Number(opts.delay ?? 0), frames: JSON.stringify(k) });
      return anim.call(this, k, o);
    } as typeof Element.prototype.animate;
    const watch = () => {
      new MutationObserver((records) => {
        const t = performance.now();
        for (const r of records) {
          if (r.type === "attributes") {
            log.push({ t, op: "attr", d: data(r.target as Element), attr: r.attributeName!, value: (r.target as Element).getAttribute(r.attributeName!) });
            continue;
          }
          for (const n of r.addedNodes) if (n instanceof Element && Object.keys(data(n)).length) log.push({ t, op: "add", d: data(n), parent: data(r.target as Element) });
          for (const n of r.removedNodes) if (n instanceof Element && Object.keys(data(n)).length) log.push({ t, op: "remove", d: data(n), parent: data(r.target as Element) });
        }
      }).observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-state", "data-run", "data-beat", "data-speed", "data-locked", "data-standby", "data-dimmed", "data-sign", "opacity"],
      });
    };
    if (document.documentElement) watch();
    else document.addEventListener("DOMContentLoaded", watch);
    // Each frame: the board's view when it changes, and the first frame each column of the opening shows (FEEL-11).
    let lastView = "";
    const shown = new Set<string>();
    const frame = () => {
      const root = document.querySelector('[data-part="board-root"]');
      const v = root?.getAttribute("transform") ?? "";
      if (v && v !== lastView) {
        lastView = v;
        log.push({ t: performance.now(), op: "view", d: {}, value: v });
      }
      if (root)
        for (const el of root.querySelectorAll("[data-col]")) {
          const c = el.getAttribute("data-col")!;
          const op = (el as SVGElement).style.opacity;
          if (op === "0") {
            shown.delete(c);
            continue;
          }
          if (!shown.has(c)) {
            shown.add(c);
            log.push({ t: performance.now(), op: "col", d: { col: c }, value: op });
          }
        }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

export async function logged(page: Page, since = 0): Promise<Logged[]> {
  return page.evaluate((s) => (window as unknown as { __log: Logged[] }).__log.filter((e) => e.t >= s), since);
}

export async function now(page: Page): Promise<number> {
  return page.evaluate(() => performance.now());
}

export type Cue = { name: string; t: number; fast?: number; double?: boolean };

/** The sound cues the board asked for since `since` (the sandbox's tc2.sounds). */
export async function cues(page: Page, since = 0): Promise<Cue[]> {
  return page.evaluate((s) => (window as unknown as { tc2: { sounds: Cue[] } }).tc2.sounds.filter((c) => c.t >= s), since);
}

export async function events(page: Page, name: string): Promise<Record<string, unknown>[]> {
  return page.evaluate((n) => (window as unknown as { tc2: { events: { name: string; payload: Record<string, unknown> }[] } }).tc2.events.filter((e) => e.name === n).map((e) => e.payload), name);
}

/** The board's view from its root transform: translate (tx, ty), scale z. */
export async function viewOf(page: Page): Promise<{ tx: number; ty: number; z: number }> {
  const t = await transform(page);
  const m = /translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)\s*scale\(([-\d.e]+)\)/.exec(t);
  if (!m) throw new Error(`no view in "${t}"`);
  return { tx: Number(m[1]), ty: Number(m[2]), z: Number(m[3]) };
}

/** The screen box round the board's parts: terminals, faces, jacks and the master alarm lamp with its rings. */
export async function partsBox(page: Page): Promise<{ x0: number; y0: number; x1: number; y1: number }> {
  return page.evaluate(() => {
    const els = document.querySelectorAll('[data-layer="input"] [data-terminal], [data-layer="outputs"] [data-terminal], [data-layer="faceBase"] [data-agent], [data-layer="jacks"] [data-jack-id], [data-piece="alarm-lamp"]');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of els) {
      const r = e.getBoundingClientRect();
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    return { x0, y0, x1, y1 };
  });
}

/** A wire's point `along` CSS pixels past its output jack's edge (or its input end's, for end "to"), `off` pixels to its side. */
export async function wirePoint(page: Page, from: string, end: "from" | "to", along: number, off = 0): Promise<Pt> {
  return page.evaluate(
    ([from, end, along, off]) => {
      const p = document.querySelector(`[data-layer="wires"] [data-piece="wire"][data-from="${from}"] [data-part="core"]`) as SVGPathElement;
      const m = p.getScreenCTM()!;
      const z = Math.hypot(m.a, m.b);
      const n = p.getTotalLength();
      const s = 22 + Number(along) / z;
      const at = end === "from" ? s : n - s;
      const q = p.getPointAtLength(at);
      const q2 = p.getPointAtLength(Math.min(n, at + 1));
      const len = Math.hypot(q2.x - q.x, q2.y - q.y) || 1;
      const nx = -(q2.y - q.y) / len, ny = (q2.x - q.x) / len;
      const X = q.x + (nx * Number(off)) / z, Y = q.y + (ny * Number(off)) / z;
      return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f };
    },
    [from, end, along, off] as const,
  );
}

/** A screen point on a wire's middle, if it lies in the window `margin` from its edges, clear of every jack and end band. */
export async function wireMiddle(page: Page, margin = 60): Promise<{ from: string; at: Pt } | null> {
  return page.evaluate((margin) => {
    const win = document.querySelector('.tc-frame[data-screen="board"] .tc-window')!.getBoundingClientRect();
    const jacks = [...document.querySelectorAll("[data-jack-id]")].map((e) => e.getBoundingClientRect());
    for (const g of document.querySelectorAll('[data-layer="wires"] [data-piece="wire"]')) {
      const p = g.querySelector('[data-part="core"]') as SVGPathElement;
      const m = p.getScreenCTM()!;
      const q = p.getPointAtLength(p.getTotalLength() / 2);
      const x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
      if (x < win.left + margin || x > win.right - margin || y < win.top + margin || y > win.bottom - margin) continue;
      // Clear of every wire's end band (EndLength from a jack's edge, EndReach to the side) and of every jack.
      if (jacks.some((r) => Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) < r.width / 2 + 44 + 22 + 10)) continue;
      return { from: g.getAttribute("data-from")!, at: { x, y } };
    }
    return null;
  }, margin);
}

/** Pointer events sent straight to the board, for two-finger gestures. */
export async function pointers(page: Page, steps: { type: "pointerdown" | "pointermove" | "pointerup"; id: number; x: number; y: number }[]): Promise<void> {
  await page.evaluate((steps) => {
    const svg = document.querySelector('[data-part="board"]')!;
    for (const s of steps)
      svg.dispatchEvent(new PointerEvent(s.type, { pointerId: s.id, clientX: s.x, clientY: s.y, pointerType: "touch", isPrimary: s.id === 1, bubbles: true, cancelable: true, buttons: s.type === "pointerup" ? 0 : 1 }));
  }, steps);
}

/**
 * The far zoom stop (owner's change to BOARD-03): the smaller of JackMinSize's zoom (1) and the zoom where the whole board, its
 * bounds with BoardMargin round them, fits the window.
 */
export async function zoomFloorOf(page: Page): Promise<number> {
  const [, , w, h] = ((await page.locator('[data-part="board-root"]').getAttribute("data-bounds")) ?? "").split(" ").map(Number) as [number, number, number, number];
  const win = await page.evaluate(() => {
    const e = document.querySelector('.tc-frame[data-screen="board"] .tc-window')!;
    return { w: e.clientWidth, h: e.clientHeight };
  });
  const m = 2 * P.BoardMargin;
  return Math.min(1, (win.w - m) / Math.max(1, w), (win.h - m) / Math.max(1, h));
}

/** Zooms with control and the wheel at a point until the zoom stops changing. */
export async function zoomToStop(page: Page, at: Pt, dir: "in" | "out"): Promise<number> {
  await page.mouse.move(at.x, at.y);
  await page.keyboard.down("Control");
  let z = await zoom(page);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, dir === "in" ? -240 : 240);
    await page.waitForTimeout(30);
    const z2 = await zoom(page);
    if (Math.abs(z2 - z) < 1e-6) break;
    z = z2;
  }
  await page.keyboard.up("Control");
  return zoom(page);
}

export async function windowCentre(page: Page): Promise<Pt> {
  const w = await windowRect(page);
  return { x: w.x + w.w / 2, y: w.y + w.h / 2 };
}

/** The board's extent on screen (BOARD-01): its parts' rectangle, from the board root's data-bounds, and BoardMargin beyond. */
export async function extentBox(page: Page): Promise<{ x0: number; y0: number; x1: number; y1: number }> {
  const [x, y, w, h] = ((await page.locator('[data-part="board-root"]').getAttribute("data-bounds")) ?? "").split(" ").map(Number) as [number, number, number, number];
  const v = await viewOf(page);
  const svg = (await page.locator('[data-part="board"]').boundingBox())!;
  const m = P.BoardMargin;
  return { x0: svg.x + v.tx + x * v.z - m, y0: svg.y + v.ty + y * v.z - m, x1: svg.x + v.tx + (x + w) * v.z + m, y1: svg.y + v.ty + (y + h) * v.z + m };
}

/** BOARD-03 pan stops: on each axis the extent covers the window, or, smaller than it, sits centred. */
export async function expectInsideStops(page: Page): Promise<void> {
  const e = await extentBox(page);
  const svg = (await page.locator('[data-part="board"]').boundingBox())!;
  for (const [lo, hi, wlo, wlen, axis] of [
    [e.x0, e.x1, svg.x, svg.width, "x"],
    [e.y0, e.y1, svg.y, svg.height, "y"],
  ] as const) {
    if (hi - lo <= wlen + 0.5) expect(Math.abs((lo + hi) / 2 - (wlo + wlen / 2)), `${axis}: centred`).toBeLessThan(1);
    else {
      expect(lo, `${axis}: extent reaches the window's start`).toBeLessThanOrEqual(wlo + 0.5);
      expect(hi, `${axis}: extent reaches the window's end`).toBeGreaterThanOrEqual(wlo + wlen - 0.5);
    }
  }
}
