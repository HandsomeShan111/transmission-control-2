// AGENT- and ITEM- acceptance tests on the test build's bench: an item at an input jack, one agent works it once.
import { describe, expect, test } from "bun:test";
import { agent, lampAfter, outJacks } from "../../blocks/agents/api";
import type { Applied } from "../../blocks/agents/api";
import type { Item } from "../../blocks/items/api";
import { markNames } from "../../blocks/items/api";
import { order } from "../../blocks/orders/api";
import { run } from "../../blocks/run/api";
import { parseWiring } from "../../blocks/wires/api";
import { Bench } from "../bench";

const PassLimit = 2;
const marks = (it: Item) => markNames(it.marks);
function as<A extends Applied["action"]>(r: Applied, action: A): Extract<Applied, { action: A }> {
  expect(r.action).toBe(action);
  return r as Extract<Applied, { action: A }>;
}

describe("AGENT-01 Face", () => {
  test("Moon Base birthday: TASTER, BAKER and each SLICER show name, family, rule, mark, PassLimit and jacks; twins numbered by column", () => {
    const o = order(14);
    const face = (label: string) => {
      const p = o.agents.find((a) => a.label === label)!;
      const d = agent(p.name);
      return { label, family: d.family, rule: d.rule, mark: d.mark, passLimit: p.passLimit, jacks: outJacks(d.role), col: p.col };
    };
    expect(face("TASTER")).toEqual({ label: "TASTER", family: "GALLEY", rule: "Is it edible?", mark: null, passLimit: PassLimit, jacks: ["plus", "minus"], col: 1 });
    expect(face("BAKER")).toEqual({ label: "BAKER", family: "GALLEY", rule: "Bakes it into a cake.", mark: "baked", passLimit: null, jacks: ["out"], col: 2 });
    expect(face("SLICER 1")).toMatchObject({ mark: "sliced", jacks: ["item", "copy"], col: 2 });
    expect(face("SLICER 2")).toMatchObject({ mark: "sliced", jacks: ["item", "copy"], col: 3 });
    // Lamp: off on open.
    const t = run(o, []);
    expect(new Set(Object.values(t.beats[0]!.lamps))).toEqual(new Set(["off"]));
  });
});

describe("AGENT-02 Work", () => {
  test("Moving day: COMPACTOR crushes the flag into a cube, GAUGE checks it, RESTORER restores its first kind", () => {
    const b = new Bench(order(18));
    const w1 = as(b.work("COMPACTOR", b.item(1)), "work");
    expect([w1.item.kind, marks(w1.item), w1.jack, w1.kindFrom, w1.kindTo]).toEqual(["Cube", ["crushed"], "out", "Flag", "Cube"]);
    expect(lampAfter("worker", "off", w1)).toBe("steady");
    const c = as(b.work("GAUGE", w1.item), "check");
    expect([c.verdict, marks(c.item)]).toEqual(["plus", ["crushed"]]);
    const w2 = as(b.work("RESTORER", c.item), "work");
    expect([w2.item.kind, w2.item.first, marks(w2.item)]).toEqual(["Flag", "Flag", ["crushed", "restored"]]);
  });
});

describe("AGENT-03 Check", () => {
  test("Archive day: INSPECTOR passes the treaty by plus, the coffee by minus, adding no mark; its lamp shows the verdict", () => {
    const b = new Bench(order(4));
    const t = as(b.work("INSPECTOR", b.item(1)), "check");
    expect([t.verdict, t.jack, marks(t.item), lampAfter("checker", "off", t)]).toEqual(["plus", "plus", [], "plus"]);
    const c = as(b.work("INSPECTOR", b.item(2)), "check");
    expect([c.verdict, c.jack, marks(c.item), lampAfter("checker", "plus", c)]).toEqual(["minus", "minus", [], "minus"]);
  });
});

describe("AGENT-04 Copy", () => {
  test("Embassy dinner: SLICER marks the cake and copies it; item by its item jack, copy by its copy jack", () => {
    const b = new Bench(order(13));
    const r = as(b.work("SLICER", b.item(1)), "copy");
    expect(marks(r.item)).toEqual(["sliced"]);
    expect([r.copy.id, r.copy.copy, r.copy.kind, r.copy.first, marks(r.copy)]).toEqual(["1.1", 1, "Cake", "Cake", ["sliced"]]);
    expect(r.copy.required).toEqual({ destination: "Embassy", kind: "Cake", marks: ["sliced", "laminated"] });
    expect(lampAfter("copier", "off", r)).toBe("steady");
    expect(outJacks("copier")).toEqual(["item", "copy"]);
  });
});

describe("AGENT-05 Pass limit", () => {
  test("Embassy dinner: the check after PassLimit checks of one item is a rejection; the copy's first check is not", () => {
    const b = new Bench(order(13));
    let cake = b.item(1);
    for (let i = 1; i <= PassLimit; i++) cake = as(b.work("INSPECTOR", cake), "check").item;
    const rej = as(b.work("INSPECTOR", cake), "reject");
    expect([rej.checks, rej.item.rejectedBy, marks(rej.item), lampAfter("checker", "plus", rej)]).toEqual([PassLimit, "INSPECTOR", [], "minus"]);
    const copied = as(b.work("SLICER", cake), "copy");
    const c = as(b.work("INSPECTOR", copied.copy), "check");
    expect(c.count).toBe(1);
  });
});

describe("AGENT-06 Idle", () => {
  test("Embassy dinner: LAMINATOR's lamp is steady while it works, off with no item; SLICER, never reached, off all run", () => {
    const o = order(13);
    const t = run(o, parseWiring(o, "IN → LAMINATOR; LAMINATOR → INSPECTOR; INSPECTOR plus → Embassy; INSPECTOR minus → Canteen"));
    const lam = t.beats.map((b) => b.lamps["LAMINATOR"]);
    expect(lam).toEqual(["off", "steady", "steady", "off"]);
    expect(t.beats.every((b) => b.lamps["SLICER"] === "off")).toBe(true);
  });
});

describe("ITEM-02 Marks", () => {
  test("Latin hour: TRANSLATOR adds its mark again to the translated treaty; marks keep the order they were added in", () => {
    const b = new Bench(order(6));
    const treaty = as(b.work("TRANSLATOR", b.item(2)), "work").item;
    expect(marks(treaty)).toEqual(["translated", "translated"]);
    expect(treaty.marks.map((m) => m.by)).toEqual([null, "TRANSLATOR"]);
    expect(marks(as(b.work("TRANSLATOR", b.item(1)), "work").item)).toEqual(["translated"]);
    expect(marks(as(b.work("SUMMARIZER", treaty), "work").item)).toEqual(["translated", "translated", "summarized"]);
  });
});

describe("ITEM-03 Copies", () => {
  test("Moon Base birthday: a copy of a copy is copy 2 of the same batch item, with no required output", () => {
    const b = new Bench(order(14));
    const first = as(b.work("SLICER 1", b.item(1)), "copy");
    expect([first.copy.id, first.copy.kind, first.copy.first, marks(first.copy)]).toEqual(["1.1", "Flag", "Flag", ["sliced"]]);
    expect(first.copy.required).toEqual(order(14).batch[0]!.copies[0]!.required);
    const second = as(b.work("SLICER 2", first.copy), "copy");
    expect([second.copy.id, second.copy.copy, marks(second.copy), second.copy.required]).toEqual(["1.2", 2, ["sliced", "sliced"], null]);
  });
});
