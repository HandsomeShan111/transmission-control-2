// ITEM-04 drawing, on a bare-bones document: the SVG pieces need only createElementNS, setAttribute and append.
// What the acceptance test sees on a board (rows, stamps, rings in a browser) belongs to the wiring board's tests.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { firstDifferencePlaces, movingItem, rowItem, rowStamp, rowTileX, tileRing } from "../api";
import type { DrawContext } from "../api";

class FakeNode {
  attrs = new Map<string, string>();
  kids: FakeNode[] = [];
  constructor(readonly tag: string, readonly text = "") {}
  setAttribute(k: string, v: string) {
    this.attrs.set(k, v);
  }
  getAttribute(k: string) {
    return this.attrs.get(k) ?? null;
  }
  append(...nodes: FakeNode[]) {
    this.kids.push(...nodes);
  }
}

const globals = globalThis as { document?: unknown };
beforeAll(() => {
  globals.document = { createElementNS: (_ns: string, tag: string) => new FakeNode(tag), createTextNode: (text: string) => new FakeNode("#text", text) };
});
afterAll(() => {
  delete globals.document;
});

const all = (n: FakeNode): FakeNode[] => [n, ...n.kids.flatMap(all)];
const parts = (g: unknown, piece: string) => all(g as FakeNode).filter((n) => n.getAttribute("data-piece") === piece);
const codes = (g: unknown) => parts(g, "mark-tile").map((n) => n.getAttribute("data-code"));

// A code is a mark's first two letters; the look is the caller's (the agents block gives it).
const ctx: DrawContext = { look: (m) => ({ code: m.slice(0, 2).toUpperCase(), shape: "circle" }), metrics: { fontSize: 12, capHeight: 9 } };
const marks = ["laminated", "stamped", "sliced", "baked", "shredded", "gauged", "sealed"];

describe("ITEM-04 Drawing", () => {
  test("a moving item is its kind's body with its latest MarksShown (3) marks, the oldest of them first", () => {
    const g = movingItem("Treaty", marks.slice(0, 5), ctx) as unknown as FakeNode;
    expect(g.getAttribute("data-kind")).toBe("Treaty");
    expect(codes(g)).toEqual(["SL", "BA", "SH"]);
    expect(codes(movingItem("Treaty", marks.slice(0, 2), ctx))).toEqual(["LA", "ST"]);
    expect(codes(movingItem("Treaty", [], ctx))).toEqual([]);
  });

  test("a result row holds RowMarks (5) tiles: more marks than that show the first four, then one tile counting the rest", () => {
    expect(codes(rowItem("Treaty", marks.slice(0, 5), ctx))).toEqual(["LA", "ST", "SL", "BA", "SH"]);
    const g = rowItem("Treaty", marks, ctx);
    expect(codes(g)).toEqual(["LA", "ST", "SL", "BA", "+3"]);
    expect(parts(g, "mark-tile").map((n) => n.getAttribute("data-count"))).toEqual([null, null, null, null, "3"]);
    expect(codes(rowItem("Treaty", [], ctx))).toEqual([]);
  });

  test("a rejected item carries the minus sign, moving and in a row", () => {
    for (const g of [movingItem("Treaty", [], ctx, true), rowItem("Treaty", [], ctx, true)]) {
      const sign = all(g as unknown as FakeNode).filter((n) => n.getAttribute("data-part") === "rejected-sign");
      expect(sign.map((n) => n.getAttribute("data-sign"))).toEqual(["minus"]);
    }
    for (const g of [movingItem("Treaty", [], ctx), rowItem("Treaty", [], ctx)]) expect(parts(g, "sign-disc")).toEqual([]);
  });

  test("a row with no result is stamped with its text", () => {
    expect(rowStamp("STOPPED: SHREDDER").getAttribute("data-text")).toBe("STOPPED: SHREDDER");
    expect(rowStamp("LOST").getAttribute("data-text")).toBe("LOST");
  });

  test("a first difference rings the differing mark and the required one, an extra mark, or the empty place of a missing one", () => {
    expect(firstDifferencePlaces(["laminated", "stamped"], ["laminated", "sealed"])).toEqual({ result: 1, required: 1 });
    expect(firstDifferencePlaces(["laminated", "stamped", "sealed"], ["laminated", "stamped"])).toEqual({ result: 2, required: null });
    expect(firstDifferencePlaces(["laminated"], ["laminated", "stamped"])).toEqual({ result: 1, required: null });
    expect(firstDifferencePlaces([], ["laminated"])).toEqual({ result: 0, required: null });
  });

  test("marks equal ring nothing; a difference among the marks the count tile stands for rings that tile (place RowMarks less one)", () => {
    expect(firstDifferencePlaces(marks, marks)).toBeNull();
    expect(firstDifferencePlaces([], [])).toBeNull();
    const other = [...marks.slice(0, 5), "sealed", "gauged"];
    expect(firstDifferencePlaces(marks, other)).toEqual({ result: 4, required: 4 });
    expect(firstDifferencePlaces(marks, marks.slice(0, 6))).toEqual({ result: 4, required: null });
    expect(firstDifferencePlaces(marks.slice(0, 6), marks)).toEqual({ result: 4, required: null });
  });

  test("tiles of a row stand a tile (MarkTileSize 32) and a gap (4) apart, the first past the body (44) and a gap; a ring stands at its tile", () => {
    expect([0, 1, 4].map(rowTileX)).toEqual([42, 78, 186]);
    expect((tileRing(2) as unknown as FakeNode).kids.map((k) => Number(k.getAttribute("cx")))).toEqual([114, 114]);
  });
});
