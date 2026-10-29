// The Board's browser tests against the test sandbox: one test per acceptance test of BOARD-, WIRE-, VIEW-, REPORT-04,
// PAR-03 and the board side of REPAIR- (design/docs/build/acceptance-*.md), named by step id; then order 1 wired by mouse and
// by touch, a wrong wiring's incident report, and FAST and SKIP. Each runs at 360x640 and 1920x1080 unless its acceptance
// test names one screen. Timing assertions take the parameters' start values with room for a loaded test machine.
import { expect, test, type Page } from "@playwright/test";
import { order as orderOf } from "../../src/blocks/orders/api";
import {
  P,
  beats,
  bringIntoView,
  centre,
  closeReport,
  control,
  cues,
  cutByDrag,
  drag,
  dragTo,
  emptyPoint,
  events,
  expectInsideStops,
  extentBox,
  frameOf,
  isPhone,
  jack,
  now,
  openOrder,
  paper,
  paperLines,
  partsBox,
  plugByDrag,
  plugByTaps,
  pointers,
  recordBeats,
  runAndRead,
  tapAt,
  tapPaper,
  viewOf,
  wireEl,
  wireMiddle,
  wirePoint,
  wireUp,
  wiresNow,
  windowCentre,
  windowOf,
  windowRect,
  zoom,
  zoomFloorOf,
  zoomToStop,
  untilBeat,
  type Pt,
  type Wire,
} from "./board-kit";

test.describe.configure({ mode: "parallel" });

const Z_MAX = P.JackMaxSize / P.JackMinSize;
const wires = (s: string): Wire[] =>
  s
    .split("; ")
    .filter(Boolean)
    .map((x) => {
      const [from, to] = x.split(" → ");
      return { from: from!, to: to! };
    });
const fmt = (o: readonly { from: string; to: string }[]) => o.map((w) => `${w.from} → ${w.to}`).join("; ");

/** An order's opening wiring in the data's notation. */
const opening = (n: number) => fmt(orderOf(n).opening ?? []);

async function lastRun(page: Page) {
  return page.evaluate(() => {
    const r = (window as unknown as { tc2: { board: { lastRun(): { moves: number | null; score: unknown; trace: { win: boolean; time: number; wireCount: number; items: { id: string; matched: boolean; end: { type: string; destination?: string } }[] }; report: { form: string; lines: string[] } } | null } } }).tc2.board.lastRun();
    return r ? { moves: r.moves, win: r.trace.win, time: r.trace.time, wireCount: r.trace.wireCount, items: r.trace.items, form: r.report.form, lines: r.report.lines } : null;
  });
}

async function best(page: Page, n: number) {
  return page.evaluate((n) => (window as unknown as { tc2: { best(n: number): unknown } }).tc2.best(n), n);
}

async function repairBest(page: Page, n: number) {
  return page.evaluate((n) => (window as unknown as { tc2: { repairBest(n: number): unknown } }).tc2.repairBest(n), n);
}

/** The lamp unit labelled `label` in the order bar. */
const barLamp = (page: Page, label: string) => page.locator(`[data-part="order-lamps"] [data-lamp="${label}"]`);
const alarmLamp = (page: Page) => page.locator('[data-piece="alarm-lamp"]');
const heldWire = (page: Page) => page.locator('[data-part="held-wire"]');
const litRings = (page: Page) => page.locator('[data-layer="rings"] [data-lit]');

/** Moves a placed wire's end by a drag: from just past its jack to `target`, panning at the window's edge as needed. */
async function moveEnd(page: Page, from: string, end: "from" | "to", target: Parameters<typeof dragTo>[2]): Promise<void> {
  const to = await wireEl(page, from).getAttribute("data-to");
  await bringIntoView(page, end === "from" ? jack(page, from, "out") : jack(page, to!, "in"), 90);
  const a = await wirePoint(page, from, end, 18);
  await dragTo(page, a, target);
  await page.waitForTimeout(350);
}

/** Waits for the board to stand still: the view unchanged over 300 ms. */
async function stillView(page: Page): Promise<void> {
  let a = await viewOf(page);
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(300);
    const b = await viewOf(page);
    if (Math.abs(a.tx - b.tx) < 0.05 && Math.abs(a.ty - b.ty) < 0.05 && Math.abs(a.z - b.z) < 1e-4) return;
    a = b;
  }
  throw new Error("the view never stood still");
}

/** Pretends the archive filed every report run so far (the archive is layer 3; the sandbox has none). */
async function fileReportsSoFar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const t = (window as unknown as { tc2: { board: { setFiled(f: (o: number, id: string) => boolean): void }; events: { name: string; payload: { reportId?: string } }[] } }).tc2;
    const ids = new Set(t.events.filter((e) => e.name === "runEnded").map((e) => e.payload.reportId));
    t.board.setFiled((_o, id) => ids.has(id));
  });
}

/** Hides or shows the page, as a switched tab does. */
async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (h ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

const along = (page: Page, p: Pt) => (isPortrait(page) ? p.y : p.x);
const across = (page: Page, p: Pt) => (isPortrait(page) ? p.x : p.y);
const isPortrait = (page: Page) => {
  const v = page.viewportSize()!;
  return v.height > v.width;
};

// ---------------------------------------------------------------- Wiring board

test("BOARD-01: an order opens framed, with its terminals, agents, opening wiring, and RUN and the alarm off", async ({ page }) => {
  const list = isPhone(page) ? [29] : [13, 14, 17];
  for (const n of list) {
    await openOrder(page, n);
    const o = orderOf(n);
    await expect(frameOf(page)).toHaveAttribute("data-order", String(n));
    // Derived: input terminal slots = BatchItems; each slot shows its item, in batch order.
    await expect(page.locator('[data-terminal="IN"] [data-part="slot"]')).toHaveCount(o.batch.length);
    for (const [i, b] of o.batch.entries()) await expect(page.locator(`[data-slot-body="${i + 1}"]`)).toHaveAttribute("data-kind", b.kind);
    // Derived: output terminals = its destinations, each labelled; one required row per item and named copy it must receive.
    await expect(page.locator('[data-layer="outputs"] [data-terminal]')).toHaveCount(o.destinations.length);
    for (const d of o.destinations) await expect(page.locator(`[data-layer="outputs"] [data-terminal="${d}"] [data-part="label"]`).first()).toHaveText(new RegExp(`^${d}$`, "i"));
    const copies = o.batch.flatMap((b) => b.copies.map((c) => `${b.kind.toUpperCase()} COPY ${c.n}`));
    await expect(page.locator("[data-required]")).toHaveCount(o.batch.length + copies.length);
    for (const c of copies) await expect(page.locator('[data-part="copy-label"]', { hasText: c })).toHaveCount(1);
    // The opening wiring, drawn.
    expect(await wiresNow(page)).toBe(opening(n));
    await expect(page.locator('[data-layer="wires"] [data-piece="wire"]')).toHaveCount(o.opening?.length ?? 0);
    // RUN and the master alarm lamp, off.
    await expect(control(page, "run")).toHaveAttribute("data-state", "up");
    await expect(alarmLamp(page)).toHaveAttribute("data-state", "off");
    // Each agent at its column along the flow and its lane across it.
    const at = new Map<string, Pt>();
    for (const a of o.agents) at.set(a.label, await centre(page.locator(`[data-layer="faceBase"] [data-agent="${a.label}"]`)));
    for (const a of o.agents)
      for (const b of o.agents) {
        if (a.col < b.col) expect(along(page, at.get(a.label)!)).toBeLessThan(along(page, at.get(b.label)!));
        if (a.col === b.col && a.lane < b.lane) expect(across(page, at.get(a.label)!)).toBeLessThan(across(page, at.get(b.label)!));
      }
    // Framing: whole and centred with BoardMargin on its tighter axis; or, wider than the window at JackMinSize, at that zoom on its input terminal.
    const ext = await extentBox(page);
    const parts = await partsBox(page);
    // The extent holds every drawn part.
    // (Firefox's boxes take in half the outline: a few pixels' room.)
    expect(parts.x0).toBeGreaterThanOrEqual(ext.x0 + P.BoardMargin - 5);
    expect(parts.y0).toBeGreaterThanOrEqual(ext.y0 + P.BoardMargin - 5);
    expect(parts.x1).toBeLessThanOrEqual(ext.x1 - P.BoardMargin + 5);
    expect(parts.y1).toBeLessThanOrEqual(ext.y1 - P.BoardMargin + 5);
    const svg = (await page.locator('[data-part="board"]').boundingBox())!;
    const w = { x: svg.x, y: svg.y, w: svg.width, h: svg.height };
    const z = await zoom(page);
    const fits = ext.x0 >= w.x - 0.5 && ext.x1 <= w.x + w.w + 0.5 && ext.y0 >= w.y - 0.5 && ext.y1 <= w.y + w.h + 0.5;
    if (isPhone(page)) {
      expect(fits).toBe(false);
      expect(z).toBeCloseTo(1, 3);
      const tin = (await page.locator('[data-layer="input"] [data-terminal="IN"]').boundingBox())!;
      expect(tin.x).toBeGreaterThanOrEqual(w.x - 1);
      expect(tin.x + tin.width).toBeLessThanOrEqual(w.x + w.w + 1);
      expect(tin.y).toBeGreaterThanOrEqual(w.y - 1);
      expect(tin.y + tin.height).toBeLessThanOrEqual(w.y + w.h + 1);
      await expectInsideStops(page);
    } else {
      expect(fits).toBe(true);
      expect(Math.abs((ext.x0 + ext.x1) / 2 - (w.x + w.w / 2))).toBeLessThan(1);
      expect(Math.abs((ext.y0 + ext.y1) / 2 - (w.y + w.h / 2))).toBeLessThan(1);
      // Fitted: the extent meets the window on one axis, unless the zoom stop came first.
      const gap = Math.min(ext.x0 - w.x, ext.y0 - w.y);
      if (z < Z_MAX - 1e-3) expect(gap).toBeLessThan(1);
    }
  }
});

test("BOARD-02: the screen turns; the flow turns with it, wiring and zoom stay, the view sits inside the pan stops", async ({ page }) => {
  const v = page.viewportSize()!;
  const land = { width: Math.max(v.width, v.height), height: Math.min(v.width, v.height) };
  const port = { width: land.height, height: land.width };
  await page.setViewportSize(land);
  await openOrder(page, 17);
  await expect(frameOf(page)).toHaveAttribute("data-flow", "landscape");
  // Panned and zoomed away from the opening framing.
  const c = await windowCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -120);
  await page.keyboard.up("Control");
  await page.waitForTimeout(50);
  await drag(page, await emptyPoint(page), { x: c.x - 60, y: c.y - 30 });
  const z0 = await zoom(page);
  const w0 = await wiresNow(page);
  const faceSize = async () => (await page.locator('[data-layer="faceBase"] [data-agent="GAUGE"] [data-part="face"]').boundingBox())!;
  const f0 = await faceSize();
  for (const [size, flow] of [
    [port, "portrait"],
    [land, "landscape"],
  ] as const) {
    await page.setViewportSize(size);
    await expect(frameOf(page)).toHaveAttribute("data-flow", flow);
    await page.waitForTimeout(200);
    expect(await zoom(page)).toBeCloseTo(z0, 3);
    expect(await wiresNow(page)).toBe(w0);
    // Faces stay upright: the same box, not turned.
    const f = await faceSize();
    expect(f.width).toBeCloseTo(f0.width, 0);
    expect(f.height).toBeCloseTo(f0.height, 0);
    // Columns along the flow.
    const a = await centre(page.locator('[data-layer="faceBase"] [data-agent="INSPECTOR"]'));
    const b = await centre(page.locator('[data-layer="faceBase"] [data-agent="GAUGE"]'));
    if (flow === "portrait") expect(b.y).toBeGreaterThan(a.y);
    else expect(b.x).toBeGreaterThan(a.x);
    await expectInsideStops(page);
  }
});

test("BOARD-02: the screen turns mid-drag: the held wire lets go; nothing is plugged or cut that the board does not show", async ({ page }) => {
  const v = page.viewportSize()!;
  const land = { width: Math.max(v.width, v.height), height: Math.min(v.width, v.height) };
  const port = { width: land.height, height: land.width };
  await page.setViewportSize(land);
  await openOrder(page, 1, { wiring: "IN → LAMINATOR" });
  const w0 = await wiresNow(page);
  // A new wire held by a drag from LAMINATOR's output jack; the screen turns.
  const out = await bringIntoView(page, jack(page, "LAMINATOR", "out"));
  await page.mouse.move(out.x, out.y);
  await page.mouse.down();
  await page.mouse.move(out.x + 30, out.y + 20, { steps: 4 });
  await expect(heldWire(page)).toHaveCount(1);
  await page.setViewportSize(port);
  await expect(frameOf(page)).toHaveAttribute("data-flow", "portrait");
  // The drag goes on to World Council's jack where it now lies, and lets go: no wire is held, none is placed.
  const dest = await centre(jack(page, "World Council", "in"));
  await page.mouse.move(dest.x, dest.y, { steps: 4 });
  await expect(heldWire(page)).toHaveCount(0);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await wiresNow(page)).toBe(w0);
  await expect(wireEl(page, "LAMINATOR")).toHaveCount(0);
  await expect(page.locator('[data-part="retracting"]')).toHaveCount(0);
  // A wire's end held by a drag; the screen turns back; the drag ends on empty board: the wire stays.
  await bringIntoView(page, jack(page, "IN", "out"), 90);
  const end = await wirePoint(page, "IN", "from", 18);
  await page.mouse.move(end.x, end.y);
  await page.mouse.down();
  await page.mouse.move(end.x + 20, end.y + 20, { steps: 4 });
  await expect(heldWire(page)).toHaveCount(1);
  await page.setViewportSize(land);
  await expect(frameOf(page)).toHaveAttribute("data-flow", "landscape");
  const e = await emptyPoint(page);
  await page.mouse.move(e.x, e.y, { steps: 4 });
  await expect(heldWire(page)).toHaveCount(0);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await wiresNow(page)).toBe(w0);
  await expect(wireEl(page, "IN", "LAMINATOR")).toHaveCount(1);
  // The board still wires as ever.
  await plugByTaps(page, "LAMINATOR", "World Council");
  expect(await wiresNow(page)).toBe("IN → LAMINATOR; LAMINATOR → World Council");
});

test("BOARD-03: drags, the wheel and pinches pan and zoom within the stops; a held wire pans at the window's edge", async ({ page }) => {
  test.setTimeout(120_000);
  await openOrder(page, 29);
  const c = await windowCentre(page);
  const ref = () => centre(page.locator('[data-layer="faceBase"] [data-agent="WRAPPER"]'));
  // Zoom stops: out, the smaller of JackMinSize's zoom and the zoom where the whole board fits the window (owner's change);
  // in, a jack shows JackMaxSize wide.
  const plateWidth = async () => (await jack(page, "IN", "out").locator('[data-part="plate"]').boundingBox())!.width;
  const floor = await zoomFloorOf(page);
  expect(floor).toBeLessThan(1);
  expect(await zoomToStop(page, c, "out")).toBeCloseTo(floor, 3);
  expect(Math.abs((await plateWidth()) - P.JackMinSize * floor)).toBeLessThan(3);
  {
    // The whole board in the window: its extent within it on both axes, meeting it on one.
    const e = await extentBox(page);
    const svg = (await page.locator('[data-part="board"]').boundingBox())!;
    expect(e.x0).toBeGreaterThanOrEqual(svg.x - 1);
    expect(e.y0).toBeGreaterThanOrEqual(svg.y - 1);
    expect(e.x1).toBeLessThanOrEqual(svg.x + svg.width + 1);
    expect(e.y1).toBeLessThanOrEqual(svg.y + svg.height + 1);
    expect(Math.min(e.x0 - svg.x, e.y0 - svg.y)).toBeLessThan(1);
  }
  expect(await zoomToStop(page, c, "in")).toBeCloseTo(Z_MAX, 3);
  expect(Math.abs((await plateWidth()) - P.JackMaxSize)).toBeLessThan(6);
  // The wheel with control held zooms round the pointer: the board point under it stays.
  const v0 = await viewOf(page);
  const at = { x: c.x + 50, y: c.y + 20 };
  await page.mouse.move(at.x, at.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 40);
  await page.keyboard.up("Control");
  await page.waitForTimeout(50);
  const v1 = await viewOf(page);
  expect(v1.z).toBeLessThan(v0.z);
  const svg = (await page.locator('[data-part="board"]').boundingBox())!;
  const boardAt = (v: { tx: number; ty: number; z: number }) => ({ x: (at.x - svg.x - v.tx) / v.z, y: (at.y - svg.y - v.ty) / v.z });
  expect(boardAt(v1).x).toBeCloseTo(boardAt(v0).x, 0);
  expect(boardAt(v1).y).toBeCloseTo(boardAt(v0).y, 0);
  // A drag on empty board, from a face, from a terminal and from a wire's middle: each pans by the drag.
  // Each drag goes toward the window's middle, away from any pan stop the view stands at, then back.
  const pans = async (from: Pt, what: string) => {
    const r0 = await ref();
    const w0 = await wiresNow(page);
    const e = await extentBox(page);
    const svg = (await page.locator('[data-part="board"]').boundingBox())!;
    // Room to pan: how far the extent runs past each window edge. A drag moves the board toward the side with room.
    const dx = svg.x - e.x0 >= 40 ? 40 : e.x1 - (svg.x + svg.width) >= 40 ? -40 : 0;
    const dy = svg.y - e.y0 >= 30 ? 30 : e.y1 - (svg.y + svg.height) >= 30 ? -30 : 0;
    expect(dx !== 0 || dy !== 0, `${what}: room to pan`).toBe(true);
    await drag(page, from, { x: from.x + (dx || 40), y: from.y + (dy || 30) });
    const r1 = await ref();
    // An axis with no room does not pan (BOARD-03: pan stops).
    expect(r1.x - r0.x, what).toBeCloseTo(dx, 0);
    expect(r1.y - r0.y, what).toBeCloseTo(dy, 0);
    expect(await wiresNow(page), what).toBe(w0);
    await drag(page, { x: from.x + (dx || 40), y: from.y + (dy || 30) }, from);
    const r2 = await ref();
    expect(r2.x - r0.x, what).toBeCloseTo(0, 0);
    expect(r2.y - r0.y, what).toBeCloseTo(0, 0);
  };
  await zoomToStop(page, c, "in");
  await pans(await emptyPoint(page), "empty board");
  const face = page.locator('[data-layer="faceBase"] [data-agent="TRANSLATOR"] [data-part="face"]');
  await bringIntoView(page, face, 120);
  const fb = (await face.boundingBox())!;
  await pans({ x: fb.x + fb.width / 2, y: fb.y + fb.height * 0.35 }, "a face");
  const slot = page.locator('[data-slot-body="2"]');
  await bringIntoView(page, slot, 120);
  await pans(await centre(slot), "a terminal");
  let mid = await wireMiddle(page);
  for (const wr of wires(opening(29))) {
    if (mid) break;
    // Wheel the middle of this wire to the window's middle, and look again.
    const m = await page.evaluate((from) => {
      const p = document.querySelector(`[data-layer="wires"] [data-piece="wire"][data-from="${from}"] [data-part="core"]`) as SVGPathElement;
      const k = p.getScreenCTM()!;
      const q = p.getPointAtLength(p.getTotalLength() / 2);
      return { x: k.a * q.x + k.c * q.y + k.e, y: k.b * q.x + k.d * q.y + k.f };
    }, wr.from);
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(m.x - c.x, m.y - c.y);
    await page.waitForTimeout(60);
    mid = await wireMiddle(page);
  }
  expect(mid).not.toBeNull();
  await pans(mid!.at, "a wire's middle");
  // The wheel (and two fingers on a trackpad, which the browser sends as the wheel) pans, within the stops.
  {
    const r0 = await ref();
    const e = await extentBox(page);
    const svg = (await page.locator('[data-part="board"]').boundingBox())!;
    const dx = e.x1 - (svg.x + svg.width) >= 30 ? 30 : svg.x - e.x0 >= 30 ? -30 : 0;
    const dy = e.y1 - (svg.y + svg.height) >= 20 ? 20 : svg.y - e.y0 >= 20 ? -20 : 0;
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(dx, dy);
    await page.waitForTimeout(50);
    const r1 = await ref();
    expect(r1.x - r0.x).toBeCloseTo(-dx, 0);
    expect(r1.y - r0.y).toBeCloseTo(-dy, 0);
  }
  // A pinch zooms round its middle: fingers drawn apart zoom in by their distance's ratio, the board under them stays.
  {
    await page.mouse.move(c.x, c.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 80);
    await page.keyboard.up("Control");
    await page.waitForTimeout(50);
    const p0 = await viewOf(page);
    const svg = (await page.locator('[data-part="board"]').boundingBox())!;
    const under = (v: { tx: number; ty: number; z: number }) => ({ x: (c.x - svg.x - v.tx) / v.z, y: (c.y - svg.y - v.ty) / v.z });
    await pointers(page, [
      { type: "pointerdown", id: 1, x: c.x - 40, y: c.y },
      { type: "pointerdown", id: 2, x: c.x + 40, y: c.y },
      { type: "pointermove", id: 1, x: c.x - 60, y: c.y },
      { type: "pointermove", id: 2, x: c.x + 60, y: c.y },
      { type: "pointerup", id: 1, x: c.x - 60, y: c.y },
      { type: "pointerup", id: 2, x: c.x + 60, y: c.y },
    ]);
    const p1 = await viewOf(page);
    expect(p1.z).toBeCloseTo(Math.min(Z_MAX, p0.z * 1.5), 2);
    expect(under(p1).x).toBeCloseTo(under(p0).x, 0);
    expect(under(p1).y).toBeCloseTo(under(p0).y, 0);
  }
  // A held wire from IN within EdgePanZone of each window edge, then past it: the board pans toward it at EdgePanSpeed,
  // until the extent's edge meets the window's edge, BoardMargin past the parts. At the top zoom on the largest screen,
  // at the JackMinSize zoom on the smallest (the order opens there), where the extent runs past the window on both axes.
  if (isPhone(page)) {
    await openOrder(page, 29);
    expect(await zoom(page)).toBeCloseTo(1, 3);
  } else await zoomToStop(page, c, "in");
  const sv = (await page.locator('[data-part="board"]').boundingBox())!;
  const r = { x: sv.x, y: sv.y, w: sv.width, h: sv.height };
  // Past the bottom and top edges, over the control and order bars, staying on the page (a pointer off the page has no place).
  const vp = page.viewportSize()!;
  const edges = [
    { name: "right", at: { x: r.x + r.w - P.EdgePanZone / 2, y: r.y + r.h / 2 }, axis: "x" as const, sign: -1 },
    { name: "bottom", at: { x: r.x + r.w / 2, y: Math.min(r.y + r.h + 20, vp.height - 2) }, axis: "y" as const, sign: -1 },
    { name: "left", at: { x: r.x + P.EdgePanZone / 2, y: r.y + r.h / 2 }, axis: "x" as const, sign: 1 },
    { name: "top", at: { x: r.x + r.w / 2, y: Math.max(r.y - 20, 2) }, axis: "y" as const, sign: 1 },
  ];
  const gapAt = async (edge: string) => {
    const e = await extentBox(page);
    return edge === "right" ? e.x1 - (r.x + r.w) : edge === "left" ? r.x - e.x0 : edge === "bottom" ? e.y1 - (r.y + r.h) : r.y - e.y0;
  };
  for (const e of edges) {
    await bringIntoView(page, jack(page, "IN", "out"), 140);
    const a = await centre(jack(page, "IN", "out"));
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 20, a.y + 20, { steps: 3 });
    await page.mouse.move(e.at.x, e.at.y, { steps: 4 });
    // Speed: measured over half a second, while board runs on past that edge.
    const s0 = await viewOf(page);
    const t0 = await now(page);
    await page.waitForTimeout(500);
    const s1 = await viewOf(page);
    const t1 = await now(page);
    const speed = ((e.axis === "x" ? s1.tx - s0.tx : s1.ty - s0.ty) * e.sign) / ((t1 - t0) / 1000);
    if ((await gapAt(e.name)) > 1) {
      expect(speed, `${e.name} edge pan speed`).toBeGreaterThan(P.EdgePanSpeed * 0.7);
      expect(speed, `${e.name} edge pan speed`).toBeLessThan(P.EdgePanSpeed * 1.15);
    }
    // Held on until the pan stops.
    let last = await viewOf(page);
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(150);
      const v = await viewOf(page);
      if (Math.abs(v.tx - last.tx) < 0.01 && Math.abs(v.ty - last.ty) < 0.01) break;
      last = v;
    }
    expect(Math.abs(await gapAt(e.name)), `${e.name} stop: the extent's edge at the window's edge`).toBeLessThan(1);
    const parts = await partsBox(page);
    const margin = e.name === "right" ? r.x + r.w - parts.x1 : e.name === "left" ? parts.x0 - r.x : e.name === "bottom" ? r.y + r.h - parts.y1 : parts.y0 - r.y;
    expect(margin, `${e.name} stop: BoardMargin of empty board`).toBeGreaterThanOrEqual(P.BoardMargin - 5);
    // Let go on no jack: no wire.
    const w0 = await wiresNow(page);
    await page.mouse.move(c.x, c.y, { steps: 2 });
    const ep = await emptyPoint(page);
    await page.mouse.move(ep.x, ep.y, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    expect(await wiresNow(page)).toBe(w0);
  }
  // Zoomed out to the stop, drags along each axis: an axis where the extent is smaller than the window does not pan and
  // stays centred; the other pans until its stop. At the far stop the whole board fits: no axis pans.
  await zoomToStop(page, c, "out");
  for (const [dx, dy] of [
    [600, 0],
    [-1200, 0],
    [0, 600],
    [0, -1200],
  ] as const) {
    // Drags until the board stops moving.
    for (let i = 0, before = ""; i < 40; i++) {
      const from = await emptyPoint(page).catch(() => c);
      const to = { x: Math.min(Math.max(from.x + Math.sign(dx) * 150, r.x + 5), r.x + r.w - 5), y: Math.min(Math.max(from.y + Math.sign(dy) * 150, r.y + 5), r.y + r.h - 5) };
      await drag(page, from, to, 4);
      const now = JSON.stringify(await viewOf(page));
      if (now === before) break;
      before = now;
    }
    const ex = await extentBox(page);
    const [lo, hi, wlo, wlen] = dx !== 0 ? [ex.x0, ex.x1, r.x, r.w] : [ex.y0, ex.y1, r.y, r.h];
    if (hi - lo <= wlen + 0.5) expect(Math.abs((lo + hi) / 2 - (wlo + wlen / 2))).toBeLessThan(1);
    else if (dx + dy > 0) expect(Math.abs(lo - wlo)).toBeLessThan(1);
    else expect(Math.abs(wlo + wlen - hi)).toBeLessThan(1);
  }
});

test.describe("zoom floor on a touch phone", () => {
  test.use({ hasTouch: true });
  test("Zoom floor: order 30 on a phone zooms out until the whole board shows; wires plug, drag and cut there", async ({ page }) => {
    test.skip(!isPhone(page), "a phone-size window");
    test.setTimeout(90_000);
    await openOrder(page, 30);
    const c = await windowCentre(page);
    // Opened at JackMinSize's zoom: the board runs past the window.
    expect(await zoom(page)).toBeCloseTo(1, 3);
    const floor = await zoomFloorOf(page);
    expect(floor).toBeLessThan(0.5);
    // The wheel with control zooms out to the far stop: the whole board, BoardMargin round it, in the window.
    expect(await zoomToStop(page, c, "out")).toBeCloseTo(floor, 3);
    const svg = (await page.locator('[data-part="board"]').boundingBox())!;
    const parts = await partsBox(page);
    expect(parts.x0).toBeGreaterThanOrEqual(svg.x);
    expect(parts.y0).toBeGreaterThanOrEqual(svg.y);
    expect(parts.x1).toBeLessThanOrEqual(svg.x + svg.width);
    expect(parts.y1).toBeLessThanOrEqual(svg.y + svg.height);
    // A pinch out goes no further; drags do not pan.
    const z0 = await zoom(page);
    await pointers(page, [
      { type: "pointerdown", id: 1, x: c.x - 60, y: c.y },
      { type: "pointerdown", id: 2, x: c.x + 60, y: c.y },
      { type: "pointermove", id: 1, x: c.x - 20, y: c.y },
      { type: "pointermove", id: 2, x: c.x + 20, y: c.y },
      { type: "pointerup", id: 1, x: c.x - 20, y: c.y },
      { type: "pointerup", id: 2, x: c.x + 20, y: c.y },
    ]);
    expect(await zoom(page)).toBeCloseTo(z0, 4);
    const v0 = await viewOf(page);
    await drag(page, await emptyPoint(page).catch(() => c), { x: c.x + 60, y: c.y + 80 });
    expect(await viewOf(page)).toEqual(v0);
    // Wires work at that zoom: tap-tap by touch, a drag by mouse, then a cut by dragging an end off.
    await plugByTaps(page, "IN", "TASTER", true);
    await plugByDrag(page, "TASTER minus", "WRAPPER 1");
    expect(await wiresNow(page)).toBe("IN → TASTER; TASTER minus → WRAPPER 1");
    await cutByDrag(page, "TASTER minus");
    expect(await wiresNow(page)).toBe("IN → TASTER");
    expect(await zoom(page)).toBeCloseTo(floor, 3);
  });
});

test("BOARD-04: the run switch starts the run and locks the board until the report closes", async ({ page }) => {
  await openOrder(page, 1, { wiring: "IN → LAMINATOR; LAMINATOR → LAMINATOR" });
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "running");
  await expect(frameOf(page)).toHaveAttribute("data-locked", "true");
  await expect(control(page, "run")).toHaveAttribute("data-state", "down");
  await page.waitForTimeout(2500);
  await stillView(page);
  const w0 = await wiresNow(page);
  const v0 = await viewOf(page);
  // Plug: a press on an output jack holds nothing.
  const out = await centre(jack(page, "LAMINATOR", "out"));
  const dest = await centre(jack(page, "World Council", "in"));
  await page.mouse.move(out.x, out.y);
  await page.mouse.down();
  await page.mouse.move(dest.x, dest.y, { steps: 6 });
  await expect(heldWire(page)).toHaveCount(0);
  await expect(litRings(page)).toHaveCount(0);
  await page.mouse.up();
  await tapAt(page, out);
  await expect(heldWire(page)).toHaveCount(0);
  // Pan and zoom: nothing moves.
  // The drag and the wheel would pan the same way, 120 and 100 pixels in all.
  const from = await emptyPoint(page);
  await drag(page, from, { x: from.x + 80, y: from.y + 60 });
  await page.mouse.wheel(-40, -40);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Control");
  // ORDERS: no leaving for the order list, by pointer or by key.
  expect(await control(page, "orders").evaluate((e) => !!e.closest("[inert]"))).toBe(true);
  await control(page, "orders").click({ force: true });
  await page.waitForTimeout(100);
  // The view stays, but for the run's own following, which on a small screen moves it a little as the item loops.
  const v1 = await viewOf(page);
  expect(v1.z).toBe(v0.z);
  expect(Math.abs(v1.tx - v0.tx)).toBeLessThan(isPhone(page) ? 30 : 0.01);
  expect(Math.abs(v1.ty - v0.ty)).toBeLessThan(isPhone(page) ? 30 : 0.01);
  expect(await wiresNow(page)).toBe(w0);
  await expect(frameOf(page)).toHaveAttribute("data-order", "1");
  // The report closes: the lock ends.
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible();
  await tapPaper(page);
  await closeReport(page);
  await expect(frameOf(page)).toHaveAttribute("data-locked", "false");
  await expect(control(page, "run")).toHaveAttribute("data-state", "up");
  expect(await control(page, "orders").evaluate((e) => !!e.closest("[inert]"))).toBe(false);
  await tapAt(page, await bringIntoView(page, jack(page, "LAMINATOR", "out")));
  await expect(heldWire(page)).toHaveCount(1);
  await tapAt(page, await emptyPoint(page));
  await expect(heldWire(page)).toHaveCount(0);
});

test("BOARD-01: another order opened mid-run ends the run, its alarm and its report; nothing of them plays or prints on it", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const open = (n: number) => page.evaluate((n) => (window as unknown as { tc2: { board: { openOrder(n: number): void } } }).tc2.board.openOrder(n), n);
  const idle = async (n: number) => {
    await expect(frameOf(page)).toHaveAttribute("data-order", String(n));
    await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
    await expect(frameOf(page)).toHaveAttribute("data-locked", "false");
    await expect(paper(page)).toHaveCount(0);
    await expect(frameOf(page)).not.toHaveClass(/tc-paperup/);
    await expect(page.locator('[data-layer="items"] [data-item]')).toHaveCount(0);
    expect(Number(await page.locator('[data-part="room-dim"]').getAttribute("opacity"))).toBe(0);
  };
  // Mid-run: the run stops; it never ends, never prints.
  await openOrder(page, 1, { wiring: "IN → LAMINATOR; LAMINATOR → World Council" });
  await control(page, "run").click();
  await untilBeat(page, 1, 10_000);
  await open(2);
  await idle(2);
  await page.waitForTimeout(4000);
  await idle(2);
  expect(await events(page, "runEnded")).toHaveLength(0);
  // During the full alarm: the alarm stops and nothing prints.
  await open(1);
  await page.waitForTimeout(800);
  await cutByDrag(page, "LAMINATOR");
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "alarm", { timeout: 10_000 });
  await open(2);
  await idle(2);
  await page.waitForTimeout(P.AlarmToneTime * 1000 + P.AlarmSilenceTime * 1000 + 800);
  await idle(2);
  // While the report prints: it goes at once, and the board is free under it.
  await open(1);
  await page.waitForTimeout(800);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  await open(3);
  await idle(3);
  await page.waitForTimeout(800);
  await tapAt(page, await bringIntoView(page, jack(page, "IN", "out")));
  await expect(heldWire(page)).toHaveCount(1);
  await tapAt(page, await emptyPoint(page));
  await expect(heldWire(page)).toHaveCount(0);
  expect(await events(page, "reportClosed")).toHaveLength(0);
  // Its own run plays and prints as ever.
  await runAndRead(page);
  await closeReport(page);
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------- Wires

test("WIRE-01: wire kinds, feedback signs, a loop round its face, a wire round a face it would pass, the hop on the later wire", async ({ page }) => {
  await openOrder(page, 4);
  expect(await wiresNow(page)).toBe("");
  for (const [from, to] of [
    ["IN", "INSPECTOR"],
    ["INSPECTOR plus", "LAMINATOR 1"],
    ["INSPECTOR minus", "LAMINATOR 2"],
    ["SHREDDER", "SHREDDER"],
  ] as const) {
    await plugByTaps(page, from, to);
    await page.waitForTimeout(300);
  }
  const core = (from: string) => wireEl(page, from).locator('[data-part="core"]');
  // A data wire, solid; a feedback wire, dashed and marked with its jack's sign.
  await expect(wireEl(page, "IN")).toHaveAttribute("data-kind", "data");
  expect(await core("IN").getAttribute("stroke-dasharray")).toBeNull();
  for (const [from, sign] of [
    ["INSPECTOR plus", "plus"],
    ["INSPECTOR minus", "minus"],
  ] as const) {
    await expect(wireEl(page, from)).toHaveAttribute("data-kind", sign);
    expect(await core(from).getAttribute("stroke-dasharray")).toBeTruthy();
    await expect(wireEl(page, from).locator(`[data-piece="sign-disc"][data-sign="${sign}"]`)).toHaveCount(1);
  }
  // Layers: wires over faces and terminals, under label plates; traces over plates, under their text; jacks over wires.
  const layers = await page.evaluate(() => [...document.querySelectorAll('[data-part="board-root"] > [data-layer]')].map((e) => e.getAttribute("data-layer")));
  const idx = (k: string) => layers.indexOf(k);
  expect(idx("faceBase")).toBeLessThan(idx("wires"));
  expect(idx("input")).toBeLessThan(idx("wires"));
  expect(idx("wires")).toBeLessThan(idx("facePlate"));
  expect(idx("facePlate")).toBeLessThan(idx("traces"));
  expect(idx("traces")).toBeLessThan(idx("faceTop"));
  expect(idx("wires")).toBeLessThan(idx("jacks"));
  // Points of a wire's line inside an agent's face.
  const inside = (from: string, agent: string) =>
    page.evaluate(([from, agent]) => {
      const p = document.querySelector(`[data-layer="wires"] [data-piece="wire"][data-from="${from}"] [data-part="core"]`) as SVGPathElement;
      const f = document.querySelector(`[data-layer="faceBase"] [data-agent="${agent}"] [data-part="face"]`) as SVGRectElement;
      const pm = p.getScreenCTM()!;
      const r = f.getBoundingClientRect();
      let hits = 0;
      const n = p.getTotalLength();
      for (let s = 30; s < n - 30; s += 4) {
        const q = p.getPointAtLength(s);
        const x = pm.a * q.x + pm.c * q.y + pm.e;
        const y = pm.b * q.x + pm.d * q.y + pm.f;
        if (x > r.left + 2 && x < r.right - 2 && y > r.top + 2 && y < r.bottom - 2) hits++;
      }
      return hits;
    }, [from, agent] as const);
  // The loop runs round SHREDDER's face; INSPECTOR minus → LAMINATOR 2, which would pass SHREDDER, runs round it too.
  expect(await inside("SHREDDER", "SHREDDER")).toBe(0);
  expect(await inside("INSPECTOR minus", "SHREDDER")).toBe(0);
  // Cross two wires, one after the other: the hop is on the later one.
  const arcs = async (from: string) => ((await core(from).getAttribute("d")) ?? "").split("A").length - 1;
  await plugByTaps(page, "LAMINATOR 1", "Archive");
  await page.waitForTimeout(300);
  const before = await arcs("LAMINATOR 1");
  await plugByTaps(page, "LAMINATOR 2", "LAMINATOR 1");
  await page.waitForTimeout(300);
  expect(await arcs("LAMINATOR 1")).toBe(before);
  expect(await arcs("LAMINATOR 2")).toBeGreaterThanOrEqual(1);
  // Undo restores the list: the hop goes with the wire.
  await control(page, "undo").click();
  await page.waitForTimeout(400);
  await expect(wireEl(page, "LAMINATOR 2")).toHaveCount(0);
  expect(await arcs("LAMINATOR 1")).toBe(before);
});

test("WIRE-02: a press and drag or a tap holds a wire; a tap elsewhere lets it go", async ({ page }) => {
  await openOrder(page, 4);
  const o = orderOf(4);
  const takers = o.agents.length + o.destinations.length;
  // Press INSPECTOR plus and drag: held, with a lit ring on every input jack and output terminal.
  const plus = await bringIntoView(page, jack(page, "INSPECTOR plus", "out"));
  await page.mouse.move(plus.x, plus.y);
  await page.mouse.down();
  await page.mouse.move(plus.x + 30, plus.y + 25, { steps: 4 });
  await expect(heldWire(page)).toHaveCount(1);
  await expect(heldWire(page)).toHaveAttribute("data-from", "INSPECTOR plus");
  await expect(litRings(page)).toHaveCount(takers);
  await page.mouse.move(plus.x + 30, plus.y + 45, { steps: 2 });
  await page.mouse.up();
  await expect(heldWire(page)).toHaveCount(0);
  await expect(litRings(page)).toHaveCount(0);
  // Tap it: held. Tap it again: let go.
  await tapAt(page, plus);
  await expect(heldWire(page)).toHaveCount(1);
  await expect(litRings(page)).toHaveCount(takers);
  await tapAt(page, plus);
  await expect(heldWire(page)).toHaveCount(0);
  await expect(litRings(page)).toHaveCount(0);
  // Tap INSPECTOR minus, then empty board: let go.
  const minus = await centre(jack(page, "INSPECTOR minus", "out"));
  await tapAt(page, minus);
  await expect(heldWire(page)).toHaveAttribute("data-from", "INSPECTOR minus");
  await tapAt(page, await emptyPoint(page));
  await expect(heldWire(page)).toHaveCount(0);
  // Tap INSPECTOR minus, then LAMINATOR 1's face: let go.
  await tapAt(page, minus);
  await expect(heldWire(page)).toHaveCount(1);
  const face = page.locator('[data-layer="faceBase"] [data-agent="LAMINATOR 1"] [data-part="face"]');
  const fb = (await face.boundingBox())!;
  await tapAt(page, { x: fb.x + fb.width / 2, y: fb.y + fb.height * 0.3 });
  await expect(heldWire(page)).toHaveCount(0);
  await expect(litRings(page)).toHaveCount(0);
  expect(await wiresNow(page)).toBe("");
});

test("WIRE-03: a held wire plugs into an input jack or terminal; an output jack holds one wire; dropped elsewhere, none", async ({ page }) => {
  await openOrder(page, 4);
  const plugs = async (since: number) => (await cues(page, since)).filter((c) => c.name === "plug").length;
  let t = await now(page);
  if (isPhone(page)) await plugByTaps(page, "LAMINATOR 1", "Archive");
  else await plugByDrag(page, "LAMINATOR 1", "Archive");
  await page.waitForTimeout(400);
  expect(await plugs(t)).toBe(1);
  t = await now(page);
  await plugByTaps(page, "SHREDDER", "Archive");
  await page.waitForTimeout(400);
  expect(await plugs(t)).toBe(1);
  expect(await wiresNow(page)).toBe("LAMINATOR 1 → Archive; SHREDDER → Archive");
  await plugByTaps(page, "LAMINATOR 1", "SHREDDER");
  await page.waitForTimeout(500);
  expect(await wiresNow(page)).toBe("SHREDDER → Archive; LAMINATOR 1 → SHREDDER");
  await expect(wireEl(page, "LAMINATOR 1")).toHaveCount(1);
  // Dropped on empty board: no wire.
  const a = await bringIntoView(page, jack(page, "INSPECTOR plus", "out"));
  t = await now(page);
  await dragTo(page, a, "empty");
  await page.waitForTimeout(400);
  expect(await wiresNow(page)).toBe("SHREDDER → Archive; LAMINATOR 1 → SHREDDER");
  expect(await plugs(t)).toBe(0);
});

test("WIRE-04: a wire's end moves by a drag to a jack of its side; its reach, the last wire at a jack, the nearer end", async ({ page }) => {
  await openOrder(page, 17);
  expect(await wiresNow(page)).toBe(opening(17));
  // GAUGE's input jack, where two wires end: the later in the wire list moves.
  await bringIntoView(page, jack(page, "GAUGE", "in"), 90);
  await dragTo(page, await centre(jack(page, "GAUGE", "in")), jack(page, "COMPACTOR", "in"));
  await page.waitForTimeout(400);
  expect(await wiresNow(page)).toContain("INSPECTOR minus → COMPACTOR");
  expect(await wiresNow(page)).toContain("IN → GAUGE");
  // The LAMINATOR wire's output end onto INSPECTOR plus: INSPECTOR plus's earlier wire goes; the kind follows the new jack.
  await moveEnd(page, "LAMINATOR", "from", jack(page, "INSPECTOR plus", "out"));
  let w = await wiresNow(page);
  expect(w).toContain("INSPECTOR plus → Archive");
  expect(w).not.toContain("INSPECTOR plus → LAMINATOR");
  expect(w).not.toContain("LAMINATOR → Archive");
  await expect(wireEl(page, "INSPECTOR plus")).toHaveAttribute("data-kind", "plus");
  // Reach: a press EndReach from the wire's line and EndLength from its jack's edge holds the end; just past, it pans.
  const reach = 0.5 * P.JackMinSize;
  const len = 1 * P.JackMinSize;
  await bringIntoView(page, jack(page, "SHREDDER", "out"), 120);
  w = await wiresNow(page);
  const inReach = await wirePoint(page, "SHREDDER", "from", len - 3, reach - 3);
  await page.mouse.move(inReach.x, inReach.y);
  await page.mouse.down();
  await page.mouse.move(inReach.x + 20, inReach.y + 30, { steps: 4 });
  await expect(page.locator('[data-layer="held"] [data-from="SHREDDER"], [data-part="held-wire"][data-from="SHREDDER"]').first()).toBeVisible();
  // Dropped on its own jack: back, nothing changes.
  const own = await centre(jack(page, "SHREDDER", "out"));
  await page.mouse.move(own.x, own.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await wiresNow(page)).toBe(w);
  const outOfReach = await wirePoint(page, "SHREDDER", "from", len - 3, reach + 6);
  await page.mouse.move(outOfReach.x, outOfReach.y);
  await page.mouse.down();
  await page.mouse.move(outOfReach.x + 20, outOfReach.y + 30, { steps: 4 });
  await expect(heldWire(page)).toHaveCount(0);
  await page.mouse.up();
  expect(await wiresNow(page)).toBe(w);
  // A tap on a wire's end does nothing.
  const end = await wirePoint(page, "SHREDDER", "from", 18);
  await tapAt(page, end);
  await expect(heldWire(page)).toHaveCount(0);
  expect(await wiresNow(page)).toBe(w);
  // An input end dropped on its own jack, then on an output jack: back, nothing changes.
  const plugs0 = (await cues(page)).filter((c) => c.name === "plug").length;
  await moveEnd(page, "SHREDDER", "to", jack(page, "Hangar", "in"));
  expect(await wiresNow(page)).toBe(w);
  await moveEnd(page, "SHREDDER", "to", jack(page, "COMPACTOR", "out"));
  expect(await wiresNow(page)).toBe(w);
  expect((await cues(page)).filter((c) => c.name === "plug").length).toBe(plugs0);
  // Where the end bands of one short wire overlap (IN → INSPECTOR, at the JackMinSize zoom), the nearer end. Order 17 fits
  // the largest window at that zoom, which is then its far stop; it opens at that zoom on the smallest.
  await plugByTaps(page, "IN", "INSPECTOR");
  await page.waitForTimeout(400);
  if ((await zoom(page)) > 1 + 1e-6) await zoomToStop(page, await windowCentre(page), "out");
  expect(await zoom(page)).toBeCloseTo(1, 3);
  await bringIntoView(page, jack(page, "IN", "out"), 120);
  const total = await page.evaluate(() => (document.querySelector('[data-layer="wires"] [data-piece="wire"][data-from="IN"] [data-part="core"]') as SVGPathElement).getTotalLength());
  expect(total).toBeLessThan(2 * (P.JackMinSize / 2 + len));
  const nearFrom = await wirePoint(page, "IN", "from", total / 2 - 22 - 1);
  await dragTo(page, nearFrom, jack(page, "SHREDDER", "out"));
  await page.waitForTimeout(400);
  expect(await wiresNow(page)).toContain("SHREDDER → INSPECTOR");
  await control(page, "undo").click();
  await page.waitForTimeout(500);
  expect(await wiresNow(page)).toContain("IN → INSPECTOR");
  await bringIntoView(page, jack(page, "INSPECTOR", "in"), 120);
  const nearTo = await wirePoint(page, "IN", "to", total / 2 - 22 - 1);
  await dragTo(page, nearTo, jack(page, "GAUGE", "in"));
  await page.waitForTimeout(400);
  expect(await wiresNow(page)).toContain("IN → GAUGE");
});

test("WIRE-05: a wire's end dropped on no jack cuts the wire, with the unplug sound", async ({ page }) => {
  await openOrder(page, 17);
  const t = await now(page);
  await cutByDrag(page, "SHREDDER");
  await page.waitForTimeout(300);
  expect(await wiresNow(page)).toBe(fmt(wires(opening(17)).filter((w) => w.from !== "SHREDDER")));
  expect((await cues(page, t)).map((c) => c.name)).toEqual(["unplug"]);
});

test("WIRE-06: undo reverses the last plug, move, cut or reset, back to the opening wiring and no further", async ({ page }) => {
  await openOrder(page, 17);
  const open = opening(17);
  let t = await now(page);
  await control(page, "undo").click();
  await page.waitForTimeout(300);
  expect(await wiresNow(page)).toBe(open);
  expect(await cues(page, t)).toEqual([]);
  const states: string[] = [open];
  await plugByTaps(page, "SHREDDER", "Archive");
  await page.waitForTimeout(400);
  states.push(await wiresNow(page));
  await moveEnd(page, "GAUGE minus", "to", jack(page, "COMPACTOR", "in"));
  states.push(await wiresNow(page));
  expect(states[2]).toContain("GAUGE minus → COMPACTOR");
  await cutByDrag(page, "COMPACTOR");
  await page.waitForTimeout(300);
  states.push(await wiresNow(page));
  await control(page, "reset").click();
  await page.waitForTimeout(500);
  expect(await wiresNow(page)).toBe(open);
  for (let i = states.length - 1; i >= 0; i--) {
    await control(page, "undo").click();
    await page.waitForTimeout(500);
    expect(await wiresNow(page)).toBe(states[i === states.length - 1 ? i : i]);
    if (i === 0) break;
  }
  t = await now(page);
  await control(page, "undo").click();
  await page.waitForTimeout(400);
  expect(await wiresNow(page)).toBe(open);
  expect(await cues(page, t)).toEqual([]);
});

test("WIRE-07: reset returns the opening wiring of the order's data, never a kept wiring", async ({ page }) => {
  const kept = "IN → INSPECTOR; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive";
  await openOrder(page, 17, { wiring: kept });
  expect(await wiresNow(page)).toBe(kept);
  await cutByDrag(page, "LAMINATOR");
  await plugByTaps(page, "SHREDDER", "Archive");
  await page.waitForTimeout(400);
  await control(page, "reset").click();
  await page.waitForTimeout(600);
  expect(await wiresNow(page)).toBe(opening(17));
  await expect(page.locator('[data-layer="wires"] [data-piece="wire"]')).toHaveCount(wires(opening(17)).length);
});

// ---------------------------------------------------------------- Run view

test("VIEW-01: the run plays one beat each BeatTime; lamps show; rejected items cross the board straight", async ({ page }) => {
  test.setTimeout(90_000);
  await openOrder(page, 13, { wiring: "IN → SLICER; SLICER item → Embassy; SLICER copy → INSPECTOR; INSPECTOR minus → INSPECTOR; INSPECTOR plus → TASTER; TASTER minus → TASTER" });
  await recordBeats(page);
  // Lamps and rejected items, sampled each frame.
  await page.evaluate(() => {
    const seen: Record<string, string[]> = {};
    const straight: { id: string; ok: boolean }[] = [];
    (window as unknown as { __seen: typeof seen; __straight: typeof straight }).__seen = seen;
    (window as unknown as { __straight: typeof straight }).__straight = straight;
    const track = new Map<string, { x: number; y: number }[]>();
    const step = () => {
      for (const l of document.querySelectorAll('[data-layer="faceTop"] [data-agent]')) {
        const st = l.querySelector('[data-piece="lamp"]')?.getAttribute("data-state") ?? "off";
        const a = l.getAttribute("data-agent")!;
        (seen[a] ??= []).includes(st) || seen[a]!.push(st);
      }
      for (const g of document.querySelectorAll('[data-layer="items"] [data-item]')) {
        if (!g.querySelector('[data-part="rejected-sign"]')) continue;
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute("transform") ?? "");
        if (!m) continue;
        const id = g.getAttribute("data-item")!;
        const list = track.get(id) ?? [];
        list.push({ x: Number(m[1]), y: Number(m[2]) });
        track.set(id, list);
      }
      (window as unknown as { __track: typeof track }).__track = track;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const t0 = await now(page);
  await control(page, "run").click();
  expect((await cues(page, t0 - 1)).map((c) => c.name)[0]).toBe("runSwitch");
  await expect(control(page, "run")).toHaveAttribute("data-state", "down");
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 60_000 });
  const r = (await lastRun(page))!;
  const b = await beats(page);
  const first = b.find((x) => x.n === 1)!;
  const lastBeat = b.filter((x) => x.n === r.time).pop()!;
  // Derived: the run's beats play in the run time times BeatTime (from the first beat's start to the last beat's start, one fewer).
  const ms = lastBeat.t - first.t;
  expect(ms).toBeGreaterThan((r.time - 1) * P.BeatTime * 1000 * 0.9);
  expect(ms).toBeLessThan((r.time - 1) * P.BeatTime * 1000 * 1.15);
  expect(r.time).toBeLessThan(P.AutoFastBeat);
  // Each agent's lamp showed its state: SLICER worked, INSPECTOR and TASTER gave verdicts.
  const seen = await page.evaluate(() => (window as unknown as { __seen: Record<string, string[]> }).__seen);
  expect(seen["SLICER"]!.some((s) => s !== "off")).toBe(true);
  expect(seen["INSPECTOR"]!.some((s) => s !== "off")).toBe(true);
  expect(seen["TASTER"]!.some((s) => s !== "off")).toBe(true);
  // A rejected item ends at its output terminal (RUN-05), and its path there is one straight line.
  const rejected = r.items.filter((i) => i.end.type === "rejected" || (i.end.type === "arrived" && (i.end as { rejectedBy?: string | null }).rejectedBy));
  expect(rejected.length).toBeGreaterThan(0);
  const tracks = await page.evaluate(() => [...((window as unknown as { __track?: Map<string, { x: number; y: number }[]> }).__track ?? new Map<string, { x: number; y: number }[]>()).entries()]);
  expect(tracks.length).toBeGreaterThan(0);
  for (const [, pts] of tracks) {
    if (pts.length < 5) continue;
    const a = pts[0]!;
    const z = pts[pts.length - 1]!;
    const L = Math.hypot(z.x - a.x, z.y - a.y) || 1;
    const off = Math.max(...pts.map((p) => Math.abs((p.x - a.x) * (z.y - a.y) - (p.y - a.y) * (z.x - a.x)) / L));
    expect(off).toBeLessThan(2);
  }
});

test("VIEW-07: an item at its output terminal takes the plus sign when it matches, else the minus", async ({ page }) => {
  await openOrder(page, 8, { wiring: "IN → TRANSLATOR; TRANSLATOR → LAMINATOR; LAMINATOR → Senate" });
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 60_000 });
  const r = (await lastRun(page))!;
  const atSenate = r.items.filter((i) => i.end.type === "arrived" && i.end.destination === "Senate");
  expect(atSenate.length).toBeGreaterThan(0);
  for (const it of atSenate) await expect(page.locator(`[data-layer="results"] [data-result="${it.id}"]`)).toHaveAttribute("data-sign", it.matched ? "plus" : "minus");
});

test("VIEW-02: the view follows the first item, then the next, moving only when it must, then the last framing", async ({ page }) => {
  test.skip(!isPhone(page), "VIEW-02 runs on the smallest screen");
  test.setTimeout(90_000);
  await openOrder(page, 9, { wiring: "IN → SUMMARIZER; SUMMARIZER → TRANSLATOR; TRANSLATOR → LAMINATOR 2; LAMINATOR 2 → Colonies" });
  expect(await zoom(page)).toBeCloseTo(1, 3);
  await page.evaluate(() => {
    const root = document.querySelector('[data-part="board-root"]')!;
    const log: { t: number; v: string; run: string }[] = [];
    (window as unknown as { __views: typeof log }).__views = log;
    const frame = document.querySelector('.tc-frame[data-screen="board"]')!;
    const step = () => {
      log.push({ t: performance.now(), v: root.getAttribute("transform") ?? "", run: frame.getAttribute("data-run") ?? "" });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 60_000 });
  const log = await page.evaluate(() => (window as unknown as { __views: { t: number; v: string; run: string }[] }).__views);
  // Moves: runs of frames where the view changes. Each takes ViewMoveTime.
  const moves: { t0: number; t1: number }[] = [];
  for (let i = 1; i < log.length; i++) {
    if (log[i]!.run !== "running") continue;
    if (log[i]!.v === log[i - 1]!.v) continue;
    const m = moves[moves.length - 1];
    if (m && log[i]!.t - m.t1 < 120) m.t1 = log[i]!.t;
    else moves.push({ t0: log[i - 1]!.t, t1: log[i]!.t });
  }
  expect(moves.length).toBeGreaterThan(0);
  for (const m of moves) {
    expect(m.t1 - m.t0).toBeGreaterThan(P.ViewMoveTime * 1000 * 0.6);
    expect(m.t1 - m.t0).toBeLessThan(P.ViewMoveTime * 1000 * 1.4);
  }
  // The last framing: every output terminal and the master alarm lamp in the window.
  const w = await windowRect(page);
  for (const l of [page.locator('[data-layer="outputs"] [data-terminal="Colonies"] [data-part="panel"]'), alarmLamp(page)]) {
    const b = (await l.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(w.x - 1);
    expect(b.y).toBeGreaterThanOrEqual(w.y - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(w.x + w.w + 1);
    expect(b.y + b.height).toBeLessThanOrEqual(w.y + w.h + 1);
  }
});

test("VIEW-03: fast-forward divides the beat by FastFactor, auto fast at AutoFastBeat once, skip ends the run in one quick move", async ({ page }) => {
  test.setTimeout(120_000);
  await openOrder(page, 1, { wiring: "IN → LAMINATOR; LAMINATOR → LAMINATOR" });
  await recordBeats(page);
  await control(page, "run").click();
  await expect(windowOf(page)).toHaveAttribute("data-beat", "1");
  await control(page, "fast").click();
  await expect(frameOf(page)).toHaveAttribute("data-speed", "fast");
  await untilBeat(page, 5, 10_000);
  await control(page, "fast").click();
  await expect(frameOf(page)).toHaveAttribute("data-speed", "normal");
  await untilBeat(page, 8, 10_000);
  // Past AutoFastBeat: fast on its own.
  await untilBeat(page, P.AutoFastBeat + 1, 30_000);
  await expect(frameOf(page)).toHaveAttribute("data-speed", "fast");
  await untilBeat(page, P.AutoFastBeat + 3, 10_000);
  await control(page, "fast").click();
  await expect(frameOf(page)).toHaveAttribute("data-speed", "normal");
  const at = Number(await windowOf(page).getAttribute("data-beat"));
  await untilBeat(page, at + 3, 10_000);
  await expect(frameOf(page)).toHaveAttribute("data-speed", "normal");
  const b = await beats(page);
  const gap = (n: number) => b.find((x) => x.n === n + 1)!.t - b.find((x) => x.n === n)!.t;
  // Derived: a beat at fast speed takes BeatTime divided by FastFactor.
  expect(gap(3)).toBeGreaterThan(((P.BeatTime * 1000) / P.FastFactor) * 0.7);
  expect(gap(3)).toBeLessThan(((P.BeatTime * 1000) / P.FastFactor) * 1.5);
  expect(gap(at + 1)).toBeGreaterThan(P.BeatTime * 1000 * 0.85);
  expect(gap(at + 1)).toBeLessThan(P.BeatTime * 1000 * 1.2);
  // Skip: every beat at once, then the last framing in one move of ViewMoveTime / FastFactor, no hold; the report follows.
  const t = await now(page);
  await control(page, "skip").click();
  await untilBeat(page, P.RunLimit, 2000);
  await expect(paper(page)).toBeVisible({ timeout: 5000 });
  // Lost items carry no hand-written result here: no alarm, so the report follows the quick move with no hold.
  expect((await now(page)) - t).toBeLessThan((P.ViewMoveTime / P.FastFactor) * 1000 + 500);
});

test("VIEW-04: a hand-written result not yet filed sounds the full alarm, then prints; filed, or tapped, it prints at once", async ({ page }) => {
  test.setTimeout(90_000);
  await openOrder(page, 1, { wiring: "IN → LAMINATOR" });
  let t = await now(page);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "alarm", { timeout: 10_000 });
  await expect(alarmLamp(page)).toHaveAttribute("data-state", "lit");
  await expect(paper(page)).toHaveCount(0);
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 10_000 });
  const alarmCue = (await cues(page, t)).find((c) => c.name === "alarm");
  expect(alarmCue).toBeTruthy();
  await expect(paper(page)).toHaveAttribute("data-form", "incident");
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 15_000 });
  await closeReport(page);
  // Filed: the same wiring prints at once, no alarm.
  await fileReportsSoFar(page);
  t = await now(page);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 10_000 });
  expect((await cues(page, t)).some((c) => c.name === "alarm")).toBe(false);
  await closeReport(page);
  // Cut the wire: a new hand-written result; tap during the alarm, and it prints at once.
  await cutByDrag(page, "IN");
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "alarm", { timeout: 10_000 });
  await tapAt(page, await windowCentre(page));
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 2000 });
  await expect(paper(page)).toHaveAttribute("data-form", "incident");
});

test("VIEW-05: the report closes; items leave, lamps go off, the wiring stays, the lock ends, the view returns in one move", async ({ page }) => {
  const win = "IN → LAMINATOR; LAMINATOR → World Council";
  await openOrder(page, 1, { wiring: win });
  const v0 = await viewOf(page);
  await runAndRead(page);
  await expect(page.locator('[data-layer="results"] [data-result]')).not.toHaveCount(0);
  const t = await now(page);
  await page.evaluate(() => {
    const root = document.querySelector('[data-part="board-root"]')!;
    const log: { t: number; v: string }[] = [];
    (window as unknown as { __views: typeof log }).__views = log;
    const step = () => {
      log.push({ t: performance.now(), v: root.getAttribute("transform") ?? "" });
      if (log.length < 400) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await closeReport(page);
  await page.waitForTimeout((P.ItemLeaveTime + 0.3) * 1000);
  await expect(page.locator('[data-layer="items"] [data-item]')).toHaveCount(0);
  await expect(page.locator('[data-layer="results"] [data-result]')).toHaveCount(0);
  for (const st of await page.locator('[data-layer="faceTop"] [data-piece="lamp"]').evaluateAll((l) => l.map((e) => e.getAttribute("data-state")))) expect(st).toBe("off");
  expect(await wiresNow(page)).toBe(win);
  await expect(frameOf(page)).toHaveAttribute("data-locked", "false");
  await page.waitForTimeout(P.ViewMoveTime * 1000);
  const v1 = await viewOf(page);
  expect(v1.tx).toBeCloseTo(v0.tx, 0);
  expect(v1.ty).toBeCloseTo(v0.ty, 0);
  expect(v1.z).toBeCloseTo(v0.z, 3);
  const log = (await page.evaluate(() => (window as unknown as { __views: { t: number; v: string }[] }).__views)).filter((e) => e.t >= t);
  const changes = log.filter((e, i) => i > 0 && e.v !== log[i - 1]!.v);
  expect(changes.length, "the view moves back").toBeGreaterThan(0);
  expect(changes[changes.length - 1]!.t - changes[0]!.t).toBeLessThan(P.ViewMoveTime * 1000 * 1.4);
  // A wire moves again.
  await cutByDrag(page, "LAMINATOR");
  expect(await wiresNow(page)).toBe("IN → LAMINATOR");
});

test("VIEW-06: the page hidden mid-run skips to the end; the report waits until it shows", async ({ page }) => {
  test.setTimeout(60_000);
  await openOrder(page, 1, { wiring: "IN → LAMINATOR; LAMINATOR → LAMINATOR" });
  await control(page, "run").click();
  await untilBeat(page, 2, 10_000);
  await setHidden(page, true);
  await untilBeat(page, P.RunLimit, 3000);
  await page.waitForTimeout(1500);
  await expect(paper(page)).toHaveCount(0);
  await setHidden(page, false);
  await expect(paper(page)).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------- Reports

test("REPORT-04: the report prints a line each PrintLineTime; a tap prints the rest; a drag scrolls it; a tap closes it", async ({ page }) => {
  test.skip(!isPhone(page), "REPORT-04 runs on the smallest screen");
  test.setTimeout(90_000);
  await openOrder(page, 13, { wiring: "IN → SLICER; SLICER item → SLICER; SLICER copy → Embassy" });
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 10_000 });
  await expect(paper(page)).toHaveAttribute("data-state", "printing");
  // Lines arrive one each PrintLineTime.
  const times = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const t: number[] = [];
        const body = document.querySelector('[data-piece="printout"] .tc-lines')!;
        const o = new MutationObserver(() => {
          t.push(performance.now());
          if (t.length >= 5) {
            o.disconnect();
            resolve(t);
          }
        });
        o.observe(body, { childList: true });
      }),
  );
  const gaps = times.slice(1).map((x, i) => x - times[i]!);
  for (const g of gaps) {
    expect(g).toBeGreaterThan(P.PrintLineTime * 1000 * 0.7);
    expect(g).toBeLessThan(P.PrintLineTime * 1000 * 1.6);
  }
  // A printing line keeps the newest in view.
  const body = paper(page).locator(".tc-pbody");
  const lines = (await lastRun(page))!.lines;
  // One tap: the rest at once.
  await tapPaper(page);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  expect((await paperLines(page)).length).toBe(lines.length);
  // Once whole it goes back to its top; a drag scrolls it and closes nothing.
  await page.waitForTimeout(600);
  expect(await body.evaluate((e) => e.scrollTop)).toBeLessThan(2);
  const tall = await body.evaluate((e) => e.scrollHeight > e.clientHeight + 1);
  const pb = (await paper(page).boundingBox())!;
  await drag(page, { x: pb.x + pb.width / 2, y: pb.y + pb.height * 0.7 }, { x: pb.x + pb.width / 2, y: pb.y + pb.height * 0.3 });
  await page.waitForTimeout(200);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  if (tall) expect(await body.evaluate((e) => e.scrollTop)).toBeGreaterThan(10);
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.wheel(0, -400);
  await expect(paper(page)).toHaveAttribute("data-state", "whole");
  // A tap closes it; the board returns.
  await closeReport(page);
  // The same wiring again, its report filed: it prints at once.
  await fileReportsSoFar(page);
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 10_000 });
  expect((await paperLines(page)).length).toBe(lines.length);
});

// ---------------------------------------------------------------- Par and score

test("PAR-03: the order keeps its fewest wires and fewest beats over its wins; each par lamp lights once met", async ({ page }) => {
  test.setTimeout(120_000);
  const A = "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → LAMINATOR 2; LAMINATOR 2 → Archive";
  await openOrder(page, 4);
  const o = orderOf(4);
  const par = o.par as { wires: number; time: number };
  await wireUp(page, wires(A));
  await expect(barLamp(page, "WIRES")).toHaveAttribute("data-state", "off");
  await expect(barLamp(page, "TIME")).toHaveAttribute("data-state", "off");
  const kept: { wires: number; time: number }[] = [];
  const win = async () => {
    const r = await runAndRead(page);
    expect(r.form).toBe("mission");
    const l = (await lastRun(page))!;
    kept.push({ wires: l.wireCount, time: l.time });
    await closeReport(page);
    const fewestWires = Math.min(...kept.map((k) => k.wires));
    const fewestBeats = Math.min(...kept.map((k) => k.time));
    const b = (await best(page, 4)) as { wires: number; time: number; wireMet: boolean; timeMet: boolean };
    expect(b.wires).toBe(fewestWires);
    expect(b.time).toBe(fewestBeats);
    await expect(barLamp(page, "WIRES")).toHaveAttribute("data-state", fewestWires <= par.wires ? "steady" : "off");
    await expect(barLamp(page, "TIME")).toHaveAttribute("data-state", fewestBeats <= par.time ? "steady" : "off");
  };
  await win();
  // B: A with SHREDDER → LAMINATOR 1 and no LAMINATOR 2 wire.
  await moveEnd(page, "SHREDDER", "to", jack(page, "LAMINATOR 1", "in"));
  await cutByDrag(page, "LAMINATOR 2");
  expect(await wiresNow(page)).toContain("SHREDDER → LAMINATOR 1");
  await win();
  await wireUp(page, wires(A));
  await win();
});

// ---------------------------------------------------------------- Repair orders, the board's side

test("REPAIR-01: a repair order opens on its fault wiring; run as it stands, it fails", async ({ page }) => {
  await openOrder(page, 17, { layers: 2 });
  expect(await wiresNow(page)).toBe(opening(17));
  await expect(barLamp(page, "MOVES")).toHaveAttribute("data-state", "off");
  const r = await runAndRead(page);
  expect(r.form).toBe("incident");
  expect((await lastRun(page))!.win).toBe(false);
});

test("REPAIR-02: a won repair order's moves: the fewest that turn the opening into the wiring run, however it was reached", async ({ page }) => {
  test.setTimeout(120_000);
  await openOrder(page, 17, { layers: 2 });
  const movePar = (orderOf(17).par as { moves: number }).moves;
  await moveEnd(page, "IN", "to", jack(page, "INSPECTOR", "in"));
  await moveEnd(page, "GAUGE minus", "to", jack(page, "COMPACTOR", "in"));
  const first = await wiresNow(page);
  expect(first).toContain("IN → INSPECTOR");
  expect(first).toContain("GAUGE minus → COMPACTOR");
  let r = await runAndRead(page);
  expect(r.form).toBe("mission");
  expect((await lastRun(page))!.moves).toBe(movePar);
  await closeReport(page);
  // Reset; cut both wires, add the first wiring's two in their place, move another end and undo it.
  await control(page, "reset").click();
  await page.waitForTimeout(600);
  await cutByDrag(page, "IN");
  // The GAUGE minus wire leaves past GAUGE's plus jack: it is taken by its input end.
  await cutByDrag(page, "GAUGE minus", "to");
  await plugByTaps(page, "IN", "INSPECTOR");
  await page.waitForTimeout(400);
  await plugByTaps(page, "GAUGE minus", "COMPACTOR");
  await page.waitForTimeout(400);
  await moveEnd(page, "SHREDDER", "to", jack(page, "Archive", "in"));
  await control(page, "undo").click();
  await page.waitForTimeout(500);
  expect(wires(await wiresNow(page)).map((w) => `${w.from} → ${w.to}`).sort()).toEqual(wires(first).map((w) => `${w.from} → ${w.to}`).sort());
  r = await runAndRead(page);
  expect(r.form).toBe("mission");
  expect((await lastRun(page))!.moves).toBe(movePar);
});

test("REPAIR-03: the mission report prints the moves and par; the order keeps its fewest moves; its par lamp lights once met", async ({ page }) => {
  test.setTimeout(120_000);
  await openOrder(page, 17, { layers: 2 });
  const movePar = (orderOf(17).par as { moves: number }).moves;
  const fix = async () => {
    await moveEnd(page, "IN", "to", jack(page, "INSPECTOR", "in"));
    await moveEnd(page, "GAUGE minus", "to", jack(page, "COMPACTOR", "in"));
  };
  await fix();
  let r = await runAndRead(page);
  expect(r.form).toBe("mission");
  expect(r.lines).toContain(`Moves ${movePar}, par ${movePar}. Par met.`);
  await closeReport(page);
  await expect(barLamp(page, "MOVES")).toHaveAttribute("data-state", "steady");
  expect(await repairBest(page, 17)).toEqual({ moves: movePar, parMet: true });
  await control(page, "reset").click();
  await page.waitForTimeout(600);
  await fix();
  await cutByDrag(page, "SHREDDER");
  r = await runAndRead(page);
  expect(r.form).toBe("mission");
  expect(r.lines).toContain(`Moves ${movePar + 1}, par ${movePar}.`);
  await closeReport(page);
  await expect(barLamp(page, "MOVES")).toHaveAttribute("data-state", "steady");
  expect(await repairBest(page, 17)).toEqual({ moves: movePar, parMet: true });
});

// ---------------------------------------------------------------- Whole runs

test("order 1 wired by mouse drags wins with a mission report", async ({ page }) => {
  await openOrder(page, 1);
  await cutByDrag(page, "IN");
  if (isPhone(page)) {
    await bringIntoView(page, jack(page, "IN", "out"), 90);
    await dragTo(page, await centre(jack(page, "IN", "out")), jack(page, "LAMINATOR", "in"));
    await page.waitForTimeout(400);
    await bringIntoView(page, jack(page, "LAMINATOR", "out"), 90);
    await dragTo(page, await centre(jack(page, "LAMINATOR", "out")), jack(page, "World Council", "in"));
    await page.waitForTimeout(400);
  } else {
    await plugByDrag(page, "IN", "LAMINATOR");
    await plugByDrag(page, "LAMINATOR", "World Council");
  }
  expect(await wiresNow(page)).toBe("IN → LAMINATOR; LAMINATOR → World Council");
  const r = await runAndRead(page);
  expect(r.form).toBe("mission");
  expect(r.lines[0]).toMatch(/: delivered as ordered\.$/);
  await closeReport(page);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });
  test("order 1 wired by taps on the touch screen wins with a mission report", async ({ page }) => {
    await openOrder(page, 1);
    await plugByTaps(page, "IN", "LAMINATOR", true);
    await page.waitForTimeout(400);
    await plugByTaps(page, "LAMINATOR", "World Council", true);
    await page.waitForTimeout(400);
    expect(await wiresNow(page)).toBe("IN → LAMINATOR; LAMINATOR → World Council");
    await page.touchscreen.tap((await control(page, "run").boundingBox())!.x + 10, (await control(page, "run").boundingBox())!.y + 10);
    await expect(frameOf(page)).toHaveAttribute("data-run", "running");
    const sk = (await control(page, "skip").boundingBox())!;
    await page.touchscreen.tap(sk.x + sk.width / 2, sk.y + sk.height / 2);
    await expect(paper(page)).toBeVisible({ timeout: 10_000 });
    const pb = (await paper(page).boundingBox())!;
    await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + 30);
    await expect(paper(page)).toHaveAttribute("data-state", "whole");
    await expect(paper(page)).toHaveAttribute("data-form", "mission");
    expect((await paperLines(page))[0]).toMatch(/: delivered as ordered\.$/);
    // A second, separate tap: a person's two taps are never as close as two synthetic ones.
    await page.waitForTimeout(400);
    const whole = (await paper(page).boundingBox())!;
    await page.touchscreen.tap(whole.x + whole.width / 2, whole.y + 30);
    await expect(paper(page)).toHaveCount(0);
  });
});

test("a wrong wiring prints an incident report", async ({ page }) => {
  await openOrder(page, 1);
  const r = await runAndRead(page);
  expect(r.form).toBe("incident");
  expect((await lastRun(page))!.win).toBe(false);
  expect(r.lines.length).toBeGreaterThan(1);
  await closeReport(page);
});

test("FAST and SKIP stand in for UNDO and RESET while the run plays", async ({ page }) => {
  await openOrder(page, 4, { wiring: "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → LAMINATOR 1" });
  await expect(control(page, "undo")).toHaveText(/UNDO/);
  await expect(control(page, "reset")).toHaveText(/RESET/);
  await control(page, "run").click();
  await expect(control(page, "fast")).toHaveText(/FAST/);
  await expect(control(page, "skip")).toHaveText(/SKIP/);
  await control(page, "fast").click();
  await expect(frameOf(page)).toHaveAttribute("data-speed", "fast");
  await control(page, "skip").click();
  await expect(paper(page)).toBeVisible({ timeout: 5000 });
  await tapPaper(page);
  await expect(paper(page)).toHaveAttribute("data-form", "mission");
  await closeReport(page);
  await expect(control(page, "undo")).toHaveText(/UNDO/);
  await expect(control(page, "reset")).toHaveText(/RESET/);
  expect(await events(page, "runEnded")).toHaveLength(1);
});
