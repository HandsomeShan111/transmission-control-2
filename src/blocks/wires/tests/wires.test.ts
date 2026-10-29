// WIRE- acceptance tests, model parts. Drawing, holding, pressing and blinking need a browser.
import { describe, expect, test } from "bun:test";
import { order } from "../../orders/api";
import { canPlug, cut, endAt, formatWiring, inEnds, moveEnd, openHistory, outJacks, plug, record, reset, setWiring, undo, undoSteps, wireCount, wireKind, wiring } from "../api";

const archive = order(4);
const scrap = order(17);
const opening17 = scrap.opening!;

describe("WIRE-01 Wire kinds", () => {
  test("Archive day: from IN or a worker, data; from a check's plus or minus, feedback with that sign; a worker into its own input; later wires last in the list", () => {
    let w = plug(archive, [], "IN", "INSPECTOR");
    w = plug(archive, w, "INSPECTOR plus", "LAMINATOR 1");
    w = plug(archive, w, "INSPECTOR minus", "SHREDDER");
    w = plug(archive, w, "SHREDDER", "SHREDDER");
    expect(w.map((x) => [x.from, wireKind(archive, x.from)])).toEqual([
      ["IN", { kind: "data" }],
      ["INSPECTOR plus", { kind: "feedback", sign: "plus" }],
      ["INSPECTOR minus", { kind: "feedback", sign: "minus" }],
      ["SHREDDER", { kind: "data" }],
    ]);
    // Every wire ends at an agent's input jack or an output terminal.
    expect(inEnds(archive)).toEqual(["INSPECTOR", "LAMINATOR 1", "LAMINATOR 2", "SHREDDER", "Archive"]);
    expect(outJacks(archive)).toEqual(["IN", "INSPECTOR plus", "INSPECTOR minus", "LAMINATOR 1", "LAMINATOR 2", "SHREDDER"]);
    // The hop: the later wire in the list.
    const a = plug(archive, plug(archive, [], "LAMINATOR 1", "Archive"), "SHREDDER", "LAMINATOR 2");
    expect(a.map((x) => x.from)).toEqual(["LAMINATOR 1", "SHREDDER"]);
  });
});

describe("WIRE-03 Plug", () => {
  test("Archive day: an output jack holds one wire, an input end takes any number; a drop on no jack places nothing", () => {
    let w = plug(archive, [], "LAMINATOR 1", "Archive");
    w = plug(archive, w, "SHREDDER", "Archive");
    expect(formatWiring(w)).toBe("LAMINATOR 1 → Archive; SHREDDER → Archive");
    w = plug(archive, w, "LAMINATOR 1", "SHREDDER");
    expect(formatWiring(w)).toBe("SHREDDER → Archive; LAMINATOR 1 → SHREDDER");
    expect(canPlug(archive, "LAMINATOR 1", "empty board")).toBe(false);
    expect(canPlug(archive, "Archive", "SHREDDER")).toBe(false);
    expect(wireCount(w)).toBe(2);
  });
});

describe("WIRE-04 Move", () => {
  test("Night scrap run: of two ends at GAUGE's input jack, the later moves; an output end onto a jack removes that jack's wire; own jack or other side: no change", () => {
    const g = endAt(opening17, "GAUGE");
    expect(opening17[g]).toEqual({ from: "INSPECTOR minus", to: "GAUGE" });
    let w = moveEnd(scrap, opening17, g, "to", "COMPACTOR");
    expect(w.at(-1)).toEqual({ from: "INSPECTOR minus", to: "COMPACTOR" });
    const lam = w.findIndex((x) => x.from === "LAMINATOR");
    w = moveEnd(scrap, w, lam, "from", "INSPECTOR plus");
    expect(w.filter((x) => x.from === "INSPECTOR plus")).toEqual([{ from: "INSPECTOR plus", to: "Archive" }]);
    expect(w.some((x) => x.from === "LAMINATOR")).toBe(false);
    expect(wireKind(scrap, "INSPECTOR plus")).toEqual({ kind: "feedback", sign: "plus" });
    const i = w.findIndex((x) => x.from === "SHREDDER");
    expect(moveEnd(scrap, w, i, "to", "Hangar")).toBe(w);
    expect(moveEnd(scrap, w, i, "to", "GAUGE plus")).toBe(w);
  });
});

describe("WIRE-05 Cut", () => {
  test("Night scrap run: the SHREDDER wire dropped on no jack is removed", () => {
    const w = cut(opening17, opening17.findIndex((x) => x.from === "SHREDDER"));
    expect(w.length).toBe(opening17.length - 1);
    expect(w.some((x) => x.from === "SHREDDER")).toBe(false);
  });
});

describe("WIRE-06 Undo", () => {
  test("Night scrap run: undo at the opening changes nothing; plug, move, cut and reset undo in turn, back to the opening and no further", () => {
    let h = openHistory(scrap);
    expect(undo(h)).toBe(h);
    const steps = [opening17];
    h = record(h, plug(scrap, h.current, "COMPACTOR", "Archive"));
    steps.push(h.current);
    h = record(h, moveEnd(scrap, h.current, 0, "to", "INSPECTOR"));
    steps.push(h.current);
    h = record(h, cut(h.current, 1));
    steps.push(h.current);
    h = reset(h);
    expect(h.current).toEqual(opening17);
    for (let i = steps.length - 1; i >= 0; i--) {
      h = undo(h);
      expect(h.current).toEqual(steps[i]!);
    }
    expect(undo(h)).toBe(h);
  });
});

describe("WIRE-07 Reset", () => {
  test("Night scrap run: reset returns the opening wiring, never a kept one", () => {
    let h = openHistory(scrap);
    h = record(h, cut(h.current, 0));
    h = record(h, plug(scrap, h.current, "IN", "INSPECTOR"));
    expect(reset(h).current).toEqual(opening17);
    const kept = openHistory(scrap, plug(scrap, opening17, "IN", "INSPECTOR"));
    expect(reset(kept).current).toEqual(opening17);
    // An order with no opening wiring resets to no wires.
    expect(reset(record(openHistory(archive), plug(archive, [], "IN", "INSPECTOR"))).current).toEqual([]);
  });
});

describe("WIRE-06 Undo steps held per order", () => {
  test("an order's wiring is held with its undo steps; a history opened on them undoes back to the opening", () => {
    const h0 = openHistory(archive);
    const h1 = record(h0, plug(archive, h0.current, "IN", "INSPECTOR"));
    const h2 = record(h1, plug(archive, h1.current, "INSPECTOR plus", "LAMINATOR 1"));
    setWiring(4, h2.current, h2.past);
    const h = openHistory(archive, wiring(4), undoSteps(4));
    expect(undo(h).current).toEqual(h1.current);
    expect(undo(undo(h)).current).toEqual(h0.current);
    expect(undo(undo(undo(h))).current).toEqual(h0.current);
    setWiring(4, h0.current);
    expect(undoSteps(4)).toEqual([]);
  });
});
