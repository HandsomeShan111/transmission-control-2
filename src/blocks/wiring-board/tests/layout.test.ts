import { describe, expect, test } from "bun:test";
import { order, orders } from "../../orders/api";
import { boardLayout as B, columnGap, shared, terminalWidth } from "../../../platform/tokens";
import { layout, rowsFor } from "../logic/layout";
import { clampView, extentAt, fitZoom, lastFraming, needsFollow, openingFraming, panBy, toBoard, turnView, viewRect, zoomAround, zoomFloor, Z_MAX, Z_MIN } from "../logic/camera";
import { BOARD_PARAMS } from "../logic/params";

describe("BOARD-01 open", () => {
  test("input terminal slots = BatchItems; one output terminal per destination; rows per required item", () => {
    for (const o of orders())
      for (const flow of ["landscape", "portrait"] as const) {
        const l = layout(o, flow);
        expect(l.input.slots.length).toBe(o.batch.length);
        expect(l.outputs.map((t) => t.destination)).toEqual([...o.destinations]);
        const named = o.batch.length + o.batch.reduce((t, b) => t + b.copies.length, 0);
        expect(l.outputs.reduce((t, x) => t + x.rows.length, 0)).toBe(named);
        expect(l.faces.length).toBe(o.agents.length);
      }
  });
  test("a copy's row sits right under its original's when both go there", () => {
    expect(rowsFor(order(14), "Moon Base").map((r) => r.item)).toEqual(["1", "1.1", "2", "2.1"]);
    let pairs = 0;
    for (const o of orders())
      for (const d of o.destinations) {
        const rows = rowsFor(o, d);
        rows.forEach((r, i) => {
          const orig = rows.findIndex((x) => x.place === r.place && x.copy === 0);
          if (r.copy === 0 || orig < 0) return;
          pairs++;
          // Only the original's other copies stand between them.
          for (const x of rows.slice(orig + 1, i)) expect(x.place).toBe(r.place);
          expect(orig).toBeLessThan(i);
        });
      }
    expect(pairs).toBeGreaterThan(0);
  });
  test("ColumnGap between facing jacks; IN jack ColumnGap from the first column; terminals ColumnGap from the last", () => {
    const o = order(4);
    for (const flow of ["landscape", "portrait"] as const) {
      const l = layout(o, flow);
      const along = (p: { x: number; y: number }) => (flow === "landscape" ? p.x : p.y);
      const insp = l.faces.find((f) => f.label === "INSPECTOR")!;
      const lam = l.faces.find((f) => f.label === "LAMINATOR 1")!;
      expect(along(lam.jacks.in!) - along(insp.jacks.plus!)).toBeCloseTo(columnGap());
      expect(along(insp.jacks.in!) - along(l.input.jack)).toBeCloseTo(columnGap());
      const lam2 = l.faces.find((f) => f.label === "LAMINATOR 2")!;
      expect(along(l.outputs[0]!.jack) - along(lam2.jacks.out!)).toBeCloseTo(columnGap());
      expect(l.outputs[0]!.rect.w).toBe(terminalWidth());
    }
  });
  test("master alarm lamp JackMinSize from the first output terminal's edge", () => {
    const land = layout(order(8), "landscape");
    expect(land.outputs[0]!.rect.y - land.alarm.y).toBe(shared.JackMinSize);
    expect(land.alarm.x).toBe(land.outputs[0]!.rect.x + land.outputs[0]!.rect.w / 2);
    const port = layout(order(8), "portrait");
    expect(port.outputs[0]!.rect.x - port.alarm.x).toBe(shared.JackMinSize);
    expect(port.alarm.y).toBe(port.outputs[0]!.rect.y + B.HeaderHeight / 2);
  });
  test("opening framing: whole within the zoom stops, centred; too wide: at JackMinSize on the input terminal", () => {
    const l = layout(order(1), "landscape");
    const v = openingFraming(l, { w: 1340, h: 1050 });
    expect(v.z).toBeGreaterThanOrEqual(Z_MIN);
    expect(v.z).toBeLessThanOrEqual(Z_MAX);
    const p = layout(order(29), "portrait");
    const w = { w: 342, h: 440 };
    const v2 = openingFraming(p, w);
    expect(v2.z).toBe(Z_MIN);
    const e = extentAt(p.bounds, v2.z);
    expect(v2.c.y - w.h / 2).toBeCloseTo(e.y);
  });
});

describe("BOARD-03 pan and zoom", () => {
  const l = layout(order(29), "portrait");
  const w = { w: 342, h: 440 };
  test("zoom stops: the whole board's fit when it does not fit at JackMinSize, and JackMaxSize", () => {
    expect(Z_MAX).toBeCloseTo(BOARD_PARAMS.JackMaxSize / BOARD_PARAMS.JackMinSize);
    const v = openingFraming(l, w);
    const out = zoomAround(v, 0.1, { x: 100, y: 100 }, l.bounds, w);
    expect(out.z).toBeLessThan(Z_MIN);
    expect(out.z).toBeCloseTo(fitZoom(l.bounds, w));
    expect(zoomAround(v, 100, { x: 100, y: 100 }, l.bounds, w).z).toBe(Z_MAX);
  });
  test("pan stops where the extent's edge meets the window's edge; BoardMargin shows there", () => {
    const v = openingFraming(l, w);
    const far = panBy(v, -1e5, -1e5, l.bounds, w);
    const e = extentAt(l.bounds, far.z);
    expect(far.c.x + w.w / 2 / far.z).toBeCloseTo(e.x + e.w);
    expect(far.c.y + w.h / 2 / far.z).toBeCloseTo(e.y + e.h);
    expect(e.y + e.h - (l.bounds.y + l.bounds.h)).toBeCloseTo(BOARD_PARAMS.BoardMargin / far.z);
  });
  test("an axis where the extent is smaller than the window does not pan and stays centred", () => {
    const s = layout(order(1), "landscape");
    const big = { w: 3000, h: 3000 };
    const v = clampView({ z: 1, c: { x: 0, y: 0 } }, s.bounds, big);
    const moved = panBy(v, 500, 500, s.bounds, big);
    expect(moved.c).toEqual(v.c);
  });
  test("zoom keeps the board point under the pointer", () => {
    const s = layout(order(17), "landscape");
    const win = { w: 600, h: 300 };
    const v = { z: 1.5, c: { x: 300, y: 120 } };
    expect(clampView(v, s.bounds, win)).toEqual(v);
    // A pointer off the window's middle: the board point under it stays under it.
    const at = { x: 150, y: 80 };
    const z = zoomAround(v, 1.2, at, s.bounds, win);
    expect(z.z).toBeCloseTo(1.8);
    const p0 = toBoard(v, win, at);
    const p1 = toBoard(z, win, at);
    expect(p1.x).toBeCloseTo(p0.x);
    expect(p1.y).toBeCloseTo(p0.y);
  });
});

describe("BOARD-02 and VIEW-02 framings", () => {
  test("a turn keeps the zoom and the centre's share of the extent", () => {
    const a = layout(order(17), "landscape");
    const b = layout(order(17), "portrait");
    const w = { w: 600, h: 600 };
    const v = clampView({ z: 1.2, c: { x: a.bounds.x + a.bounds.w * 0.3, y: a.bounds.y + a.bounds.h * 0.5 } }, a.bounds, w);
    const t = turnView(v, a, b, w);
    expect(t.z).toBe(v.z);
    // Landscape's along (x) and across (y) shares become portrait's along (y) and across (x).
    const ea = extentAt(a.bounds, v.z);
    const eb = extentAt(b.bounds, t.z);
    expect((t.c.y - eb.y) / eb.h).toBeCloseTo((v.c.x - ea.x) / ea.w);
    expect((t.c.x - eb.x) / eb.w).toBeCloseTo((v.c.y - ea.y) / ea.h);
  });
  test("last framing at JackMinSize: the alarm lamp's rings clear the window edge; the first terminal's jack ViewMargin in", () => {
    const w = { w: 342, h: 440 };
    const l = layout(order(20), "portrait");
    const v = lastFraming(l, w, 80);
    expect(v.z).toBe(Z_MIN);
    expect(v.c.x - w.w / 2).toBeCloseTo(l.alarm.x - l.alarmRadius);
    expect(l.outputs[0]!.jack.y - (v.c.y - w.h / 2)).toBeCloseTo(80);
    // A first terminal too long for that: its jack moves nearer the window's edge, never past it.
    const m = layout(order(30), "portrait");
    const u = lastFraming(m, w, 80);
    const t = m.outputs[0]!;
    const top = u.c.y - w.h / 2;
    expect(t.rect.y + t.rect.h).toBeGreaterThan(t.jack.y - 80 + w.h);
    expect(t.jack.y - top).toBeGreaterThanOrEqual(0);
    expect(t.jack.y - top).toBeLessThan(80);
  });
  test("follow: only near an edge with more board beyond", () => {
    const l = layout(order(29), "portrait");
    const w = { w: 342, h: 440 };
    const v = openingFraming(l, w);
    expect(needsFollow(v, v.c, l.bounds, w, 80)).toBe(false);
    expect(needsFollow(v, { x: v.c.x, y: v.c.y + 1000 }, l.bounds, w, 80)).toBe(true);
  });
});

describe("zoom floor: the whole board fits the window", () => {
  const M = BOARD_PARAMS.BoardMargin;
  const phone = { w: 342, h: 440 };
  test("a board that does not fit at JackMinSize: the floor is the zoom where its bounds and BoardMargin fit", () => {
    const l = layout(order(30), "portrait");
    const f = zoomFloor(l.bounds, phone);
    expect(f).toBeLessThan(Z_MIN);
    expect(f).toBeCloseTo(Math.min((phone.w - 2 * M) / l.bounds.w, (phone.h - 2 * M) / l.bounds.h));
    // At the floor the extent lies inside the window on both axes, and meets it on one.
    const e = extentAt(l.bounds, f);
    expect(e.w * f).toBeLessThanOrEqual(phone.w + 1e-6);
    expect(e.h * f).toBeLessThanOrEqual(phone.h + 1e-6);
    expect(Math.max((e.w * f) / phone.w, (e.h * f) / phone.h)).toBeCloseTo(1);
  });
  test("at the floor the view shows the whole board and every pan keeps it centred", () => {
    const l = layout(order(30), "portrait");
    const v = clampView({ z: 0.01, c: { x: 0, y: 0 } }, l.bounds, phone);
    expect(v.z).toBeCloseTo(zoomFloor(l.bounds, phone));
    const r = viewRect(v, phone);
    expect(r.x).toBeLessThanOrEqual(l.bounds.x);
    expect(r.y).toBeLessThanOrEqual(l.bounds.y);
    expect(r.x + r.w).toBeGreaterThanOrEqual(l.bounds.x + l.bounds.w);
    expect(r.y + r.h).toBeGreaterThanOrEqual(l.bounds.y + l.bounds.h);
    expect(panBy(v, 300, -300, l.bounds, phone).c).toEqual(v.c);
  });
  test("a board that fits at JackMinSize keeps JackMinSize's zoom as its floor", () => {
    const l = layout(order(1), "landscape");
    const big = { w: 1340, h: 1050 };
    expect(fitZoom(l.bounds, big)).toBeGreaterThan(Z_MIN);
    expect(zoomFloor(l.bounds, big)).toBe(Z_MIN);
    expect(zoomAround(openingFraming(l, big), 0.01, { x: 10, y: 10 }, l.bounds, big).z).toBe(Z_MIN);
  });
  test("every order on the phone window: the floor is at most JackMinSize's zoom and fits the whole board", () => {
    for (const o of orders()) {
      const l = layout(o, "portrait");
      const f = zoomFloor(l.bounds, phone);
      expect(f).toBeLessThanOrEqual(Z_MIN);
      if (f < Z_MIN) expect(f).toBeCloseTo(fitZoom(l.bounds, phone));
      // Zoomed out as far as it goes, the window holds the whole board.
      const r = viewRect(clampView({ z: 0.01, c: l.input.jack }, l.bounds, phone), phone);
      expect(r.x).toBeLessThanOrEqual(l.bounds.x + 0.5);
      expect(r.y).toBeLessThanOrEqual(l.bounds.y + 0.5);
      expect(r.x + r.w).toBeGreaterThanOrEqual(l.bounds.x + l.bounds.w - 0.5);
      expect(r.y + r.h).toBeGreaterThanOrEqual(l.bounds.y + l.bounds.h - 0.5);
      // The ceiling stays.
      expect(clampView({ z: 99, c: l.input.jack }, l.bounds, phone).z).toBe(Z_MAX);
    }
  });
  test("a window too small to fit any board keeps JackMinSize's zoom", () => {
    expect(zoomFloor(layout(order(30), "portrait").bounds, { w: 20, h: 20 })).toBe(Z_MIN);
  });
});
