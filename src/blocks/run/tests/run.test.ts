// RUN- acceptance tests, and ITEM-01, on the build's own run.
import { describe, expect, test } from "bun:test";
import { order } from "../../orders/api";
import type { Order } from "../../orders/api";
import { parseWiring } from "../../wires/api";
import type { Beat, RunEvent, Trace } from "../api";
import { RUN_LIMIT as CODE_RUN_LIMIT, run } from "../api";

// The design's start value (board/run.md, Parameters), written here so a wrong constant in the code fails.
const RUN_LIMIT = 99;

const runOf = (o: Order, text: string) => run(o, parseWiring(o, text));

/** One event as a short line, for reading beats. */
function ev(e: RunEvent): string {
  switch (e.type) {
    case "work":
      return `${e.agent} works ${e.item}`;
    case "copy":
      return `${e.agent} copies ${e.item} as ${e.copy}`;
    case "check":
      return `${e.agent} checks ${e.item} ${e.verdict} ${e.count}`;
    case "reject":
      return `${e.agent} rejects ${e.item}`;
    case "send":
      return `${e.item} ${e.from} → ${e.to}`;
    case "stop":
      return `${e.item} stops at ${e.jack}`;
    case "arrive":
      return e.terminal ? `${e.item} at ${e.at}` : `${e.item} queues at ${e.at} ${e.pos}`;
    case "lost":
      return `${e.item} lost`;
  }
}
const beat = (b: Beat) => b.events.map(ev);
const ends = (t: Trace) => Object.fromEntries(t.items.map((i) => [i.id, i.end]));

describe("RUN-01 Start", () => {
  test("Diplomatic pouch: beat 0 has every batch item at the input terminal, check counts zero, run time zero; again on a second run", () => {
    const o = order(3);
    const a = runOf(o, "IN → INSPECTOR");
    const startOf = (t: Trace) => t.start!.map((s) => [s.id, s.where, s.checks]);
    expect(startOf(a)).toEqual([
      ["1", { at: "in", pos: 0 }, {}],
      ["2", { at: "in", pos: 1 }, {}],
      ["3", { at: "in", pos: 2 }, {}],
    ]);
    expect(a.beats[0]!.n).toBe(1);
    expect(a.beats.at(-1)!.time).toBe(a.time);
    // INSPECTOR checked items in the first run; the second run starts at zero again, and gives the same trace (GP-1).
    expect(a.items.some((i) => (i.checks["INSPECTOR"] ?? 0) > 0)).toBe(true);
    const b = runOf(o, "IN → INSPECTOR");
    expect(startOf(b)).toEqual(startOf(a));
    expect(b).toEqual(a);
    expect(Object.isFrozen(b.beats[0]!.events)).toBe(true);
  });
});

describe("RUN-02 Beat", () => {
  test("Embassy dinner: agents in column then lane order, then the input terminal; arrivals in batch order, a copy behind its original", () => {
    const t = runOf(order(13), "IN → SLICER; SLICER item → LAMINATOR; SLICER copy → LAMINATOR; LAMINATOR → Embassy");
    expect(t.beats.map(beat)).toEqual([
      ["1 IN → SLICER", "1 queues at SLICER 0"],
      ["SLICER copies 1 as 1.1", "1 SLICER item → LAMINATOR", "1.1 SLICER copy → LAMINATOR", "2 IN → SLICER", "1 queues at LAMINATOR 0", "1.1 queues at LAMINATOR 1", "2 queues at SLICER 0"],
      ["SLICER copies 2 as 2.1", "2 SLICER item → LAMINATOR", "2.1 SLICER copy → LAMINATOR", "LAMINATOR works 1", "1 LAMINATOR → Embassy", "1 at Embassy", "2 queues at LAMINATOR 1", "2.1 queues at LAMINATOR 2"],
      ["LAMINATOR works 1.1", "1.1 LAMINATOR → Embassy", "1.1 at Embassy"],
      ["LAMINATOR works 2", "2 LAMINATOR → Embassy", "2 at Embassy"],
      ["LAMINATOR works 2.1", "2.1 LAMINATOR → Embassy", "2.1 at Embassy"],
    ]);
    expect(t.beats.map((b) => b.time)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(t.time).toBe(6);
  });

  test("Moon Base birthday: copies take their batch item's next number in the order made; a copy of a copy counts for the same item", () => {
    const t = runOf(order(14), "IN → SLICER 1; SLICER 1 item → SLICER 2; SLICER 1 copy → SLICER 1");
    const made = t.beats.flatMap((b) => b.events.flatMap((e) => (e.type === "copy" ? [`${e.item}>${e.copy}`] : [])));
    expect(made.slice(0, 6)).toEqual(["1>1.1", "1.1>1.2", "1>1.3", "2>2.1", "1.1>1.4", "1.2>1.5"]);
    for (const it of t.items) expect(it.id).toBe(it.copy === 0 ? `${it.place}` : `${it.place}.${it.copy}`);
  });
});

describe("RUN-03 Arrive", () => {
  test("Signing ceremony: each item at World Council stays there, at its end", () => {
    const t = runOf(order(1), "IN → LAMINATOR; LAMINATOR → World Council");
    for (const it of t.items) expect(it.end).toEqual({ type: "arrived", destination: "World Council", rejectedBy: null });
    const first = t.beats.findIndex((b) => b.events.some((e) => e.type === "arrive" && e.item === "1" && e.terminal));
    for (const b of t.beats.slice(first)) expect(b.items!.find((s) => s.id === "1")!.where).toEqual({ at: "terminal", destination: "World Council" });
  });
});

describe("RUN-04 Stop", () => {
  test("Victory parade: an item sent by a jack with no wire stays there; with no wire from IN, every item stays there in the first beat", () => {
    const t = runOf(order(2), "IN → LAMINATOR");
    for (const it of t.items) expect(it.end).toEqual({ type: "stopped", jack: "LAMINATOR", agent: "LAMINATOR" });
    const none = run(order(2), []);
    expect(none.time).toBe(1);
    expect(beat(none.beats[0]!)).toEqual(["1 stops at IN", "2 stops at IN"]);
    for (const it of none.items) expect([it.end, it.endBeat]).toEqual([{ type: "stopped", jack: "IN", agent: null }, 1]);
  });
});

describe("RUN-05 Reject", () => {
  test("Embassy dinner: a rejected copy goes to its required destination; one with no required output stays at its checking agent", () => {
    const t = runOf(order(13), "IN → SLICER; SLICER item → Embassy; SLICER copy → INSPECTOR; INSPECTOR minus → INSPECTOR; INSPECTOR plus → TASTER; TASTER minus → TASTER");
    const e = ends(t);
    expect(e["1.1"]).toEqual({ type: "arrived", destination: "Embassy", rejectedBy: "INSPECTOR" });
    expect(e["2.1"]).toEqual({ type: "rejected", agent: "TASTER" });
    const reject = t.beats.findIndex((b) => b.events.some((x) => x.type === "reject" && x.item === "1.1"));
    expect(beat(t.beats[reject]!)).toContain("1.1 at Embassy");
    expect(t.items.find((i) => i.id === "1.1")!.matched).toBe(false);
  });
});

describe("RUN-06 End", () => {
  test("Signing ceremony: a data loop runs RunLimit beats and its items are lost; moved to World Council, the run ends when nothing waits", () => {
    const t = runOf(order(1), "IN → LAMINATOR; LAMINATOR → LAMINATOR");
    expect(CODE_RUN_LIMIT).toBe(RUN_LIMIT);
    expect(t.time).toBe(RUN_LIMIT);
    for (const it of t.items) expect([it.end, it.endBeat]).toEqual([{ type: "lost" }, RUN_LIMIT]);
    expect(t.beats.at(-1)!.items!.map((s) => s.where)).toEqual([{ at: "lost" }, { at: "lost" }, { at: "lost" }]);
    const fixed = runOf(order(1), "IN → LAMINATOR; LAMINATOR → World Council");
    expect([fixed.time, fixed.win]).toEqual([4, true]);
  });
});

describe("RUN-07 Match", () => {
  test("Treaty ceremony: marks must equal the required marks, in order, repeats included, at the required destination", () => {
    const o = order(8);
    const a = runOf(o, "IN → TRANSLATOR; TRANSLATOR → LAMINATOR; LAMINATOR → Senate");
    expect(a.items.map((i) => [i.id, i.matched])).toEqual([["1", false], ["2", true], ["3", false]]);
    const b = runOf(o, "IN → LAMINATOR; LAMINATOR → TRANSLATOR; TRANSLATOR → Senate");
    expect(b.items.map((i) => i.matched)).toEqual([false, false, false]);
    expect(b.items[1]!.marks.map((m) => m.name)).toEqual(["laminated", "translated"]);
  });
});

describe("RUN-08 Result", () => {
  test("Embassy dinner: every item matching and the named copy made wins; with LAMINATOR's wire cut it fails", () => {
    const o = order(13);
    const w = "IN → INSPECTOR; INSPECTOR plus → LAMINATOR; INSPECTOR minus → SLICER; SLICER item → Canteen; SLICER copy → LAMINATOR";
    const won = runOf(o, `${w}; LAMINATOR → Embassy`);
    expect([won.win, won.copiesMissing]).toEqual([true, []]);
    const lost = runOf(o, w);
    expect(lost.win).toBe(false);
    expect(lost.items.filter((i) => !i.matched).map((i) => i.id)).toEqual(["1.1", "2"]);
  });

  test("a named copy not made: the order fails", () => {
    const t = runOf(order(13), "IN → INSPECTOR; INSPECTOR plus → LAMINATOR; INSPECTOR minus → Canteen; LAMINATOR → Embassy");
    expect(t.copiesMissing).toEqual([{ place: 1, copy: 1 }]);
    expect(t.win).toBe(false);
  });
});

describe("ITEM-01 Enter", () => {
  test("Latin hour: before the first beat, the batch waits at the input terminal in batch order, with starting marks; terminals empty", () => {
    const o = order(6);
    const t = runOf(o, "IN → CENSOR");
    expect(t.start!.map((s) => [s.id, s.kind, s.marks, s.where])).toEqual([
      ["1", "Address", [], { at: "in", pos: 0 }],
      ["2", "Treaty", ["translated"], { at: "in", pos: 1 }],
      ["3", "Star chart", [], { at: "in", pos: 2 }],
    ]);
    expect(t.items.map((i) => [i.first, i.required])).toEqual(o.batch.map((b) => [b.kind, b.required]));
  });
});
