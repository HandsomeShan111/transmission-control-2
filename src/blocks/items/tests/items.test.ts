// ITEM- rules on the items block alone. The acceptance tests with an order and its agents: src/testbuild/tests.
import { describe, expect, test } from "bun:test";
import { addMark, changeKind, copyItem, enter, kind, kinds, markNames, matches } from "../api";

const treaty = enter(1, "Treaty", [], { destination: "Archive", kind: "Treaty", marks: ["laminated"] });

describe("ITEM-01 Enter", () => {
  test("an item's first kind is its kind on entering; a kind change never changes it", () => {
    const it = changeKind(addMark(treaty, "shredded", "SHREDDER"), "Confetti");
    expect([it.kind, it.first]).toEqual(["Confetti", "Treaty"]);
    expect(kinds().length).toBe(12);
    expect(kind("Satellite").attribute).toBe("metal");
  });
});

describe("ITEM-02 Marks", () => {
  test("a mark goes at the end; a mark already carried is added again", () => {
    const it = addMark(addMark(treaty, "laminated", "LAMINATOR 1"), "laminated", "LAMINATOR 2");
    expect(markNames(it.marks)).toEqual(["laminated", "laminated"]);
    expect(it.marks.map((m) => m.by)).toEqual(["LAMINATOR 1", "LAMINATOR 2"]);
  });
});

describe("ITEM-03 Copies", () => {
  test("a copy has the original's kind, first kind and marks, its own number and required output, and no checks", () => {
    const orig = { ...changeKind(addMark(treaty, "baked", "BAKER"), "Cake"), checks: { TASTER: 1 } };
    const c = copyItem(orig, 1, null);
    expect([c.id, c.copy, c.kind, c.first, markNames(c.marks), c.required, c.checks]).toEqual(["1.1", 1, "Cake", "Treaty", ["baked"], null, {}]);
  });
});

describe("RUN-07 Match", () => {
  test("required destination, kind and marks in order; not when rejected; never without a required output", () => {
    const done = addMark(treaty, "laminated", "LAMINATOR");
    expect(matches(done, "Archive")).toBe(true);
    expect(matches(done, "Embassy")).toBe(false);
    expect(matches(treaty, "Archive")).toBe(false);
    expect(matches({ ...done, rejectedBy: "INSPECTOR" }, "Archive")).toBe(false);
    expect(matches(copyItem(done, 1, null), "Archive")).toBe(false);
  });
});
