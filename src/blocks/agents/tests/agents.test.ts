// AGENT- rules on the agents block, with items only. The acceptance tests on an order: src/testbuild/tests.
import { describe, expect, test } from "bun:test";
import { enter, markNames } from "../../items/api";
import { agent, agents, apply, families, lampAfter, numberTwins, outJacks } from "../api";

const cake = enter(1, "Cake", [], { destination: "Canteen", kind: "Cake", marks: ["sliced"] });

describe("AGENT-01 Face", () => {
  test("18 agents in 6 families; jacks by role; twins numbered from 1 in column order, then lane order", () => {
    expect([agents().length, families().length]).toEqual([18, 6]);
    expect([outJacks("worker"), outJacks("checker"), outJacks("copier")]).toEqual([["out"], ["plus", "minus"], ["item", "copy"]]);
    expect(
      numberTwins([
        { name: "SLICER", col: 3, lane: 1 },
        { name: "TASTER", col: 1, lane: 1 },
        { name: "SLICER", col: 2, lane: 0 },
        { name: "STAMPER", col: 2, lane: 2 },
        { name: "STAMPER", col: 2, lane: 0 },
      ]),
    ).toEqual(["SLICER 2", "TASTER", "SLICER 1", "STAMPER 2", "STAMPER 1"]);
    for (const a of agents()) expect(a.rule.split(" ").length, a.name).toBeLessThanOrEqual(5);
  });
});

describe("AGENT-03 Check", () => {
  test("each test reads as data.md says: attribute, mark, count, as ordered", () => {
    const check = (name: string, it = cake) => {
      const r = apply({ name, label: name, passLimit: 2 }, it);
      return r.action === "check" ? r.verdict : r.action;
    };
    expect([check("TASTER"), check("INSPECTOR"), check("GAUGE")]).toEqual(["plus", "minus", "minus"]);
    const latin = { ...cake, marks: [{ name: "translated", by: null }] };
    expect([check("CENSOR", latin), check("CENSOR")]).toEqual(["plus", "minus"]);
    const three = { ...cake, marks: ["a", "b", "c"].map((name) => ({ name, by: null })) };
    expect([check("TALLY", three), check("TALLY", latin)]).toEqual(["plus", "minus"]);
    const sliced = { ...cake, marks: [{ name: "sliced", by: "SLICER" }] };
    expect([check("VERIFIER", sliced), check("VERIFIER"), check("VERIFIER", { ...sliced, required: null })]).toEqual(["plus", "minus", "minus"]);
  });
});

describe("AGENT-02 Work", () => {
  test("a kind change into the kind the item has keeps the kind and adds the mark", () => {
    const r = apply({ name: "BAKER", label: "BAKER", passLimit: null }, cake);
    expect(r.action === "work" && [r.item.kind, markNames(r.item.marks), r.kindFrom, r.kindTo]).toEqual(["Cake", ["baked"], "Cake", "Cake"]);
    expect(agent("RESTORER").toKind).toBe("first kind");
  });
});

describe("AGENT-06 Idle", () => {
  test("a worker or copier with no item: lamp off; a checker keeps its last verdict until its next check", () => {
    expect([lampAfter("worker", "steady", null), lampAfter("copier", "steady", null), lampAfter("checker", "plus", null)]).toEqual(["off", "off", "plus"]);
  });
});
