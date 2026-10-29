// REPAIR-02 and REPAIR-03 acceptance tests. REPAIR-01 needs the wiring search: src/testbuild/tests.
import { describe, expect, test } from "bun:test";
import { order } from "../../orders/api";
import { report } from "../../reports/api";
import { run } from "../../run/api";
import { cut, endAt, moveEnd, openHistory, plug, record, reset, undo } from "../../wires/api";
import type { RepairBest } from "../api";
import { faultWiring, keepRepairBest, moves, movesBetween, movesLine, repairLamp } from "../api";

const scrap = order(17);
const MovePar = 2;
const at = (w: readonly { from: string }[], from: string) => w.findIndex((x) => x.from === from);

/** The known fix, reached by moving two wire ends. */
function fixByMoves() {
  let w = faultWiring(17);
  w = moveEnd(scrap, w, at(w, "IN"), "to", "INSPECTOR");
  w = moveEnd(scrap, w, at(w, "GAUGE minus"), "to", "COMPACTOR");
  return w;
}

describe("REPAIR-02 Moves", () => {
  test("Night scrap run: two ends moved, or two wires cut and two added with a move undone: MovePar moves either way", () => {
    const a = fixByMoves();
    expect(run(scrap, a).win).toBe(true);
    expect(moves(scrap, a)).toBe(MovePar);
    let h = reset(record(openHistory(scrap), a));
    h = record(h, cut(h.current, at(h.current, "IN")));
    h = record(h, cut(h.current, at(h.current, "GAUGE minus")));
    h = record(h, plug(scrap, h.current, "IN", "INSPECTOR"));
    h = record(h, plug(scrap, h.current, "GAUGE minus", "COMPACTOR"));
    h = undo(record(h, moveEnd(scrap, h.current, endAt(h.current, "Hangar"), "to", "Archive")));
    expect(run(scrap, h.current).win).toBe(true);
    expect(moves(scrap, h.current)).toBe(MovePar);
  });

  test("the count: a missing and a new wire sharing an end make one move; others one each; nothing changed is none", () => {
    const o = scrap.opening!;
    expect(moves(scrap, o)).toBe(0);
    expect(movesBetween(o, cut(o, 0))).toBe(1);
    // Shared output end: SHREDDER's wire moved to Archive.
    expect(movesBetween(o, plug(scrap, o, "SHREDDER", "Archive"))).toBe(1);
    // Shared input end: Night audit's SEALER → Archive cut and TALLY plus → Archive added.
    const audit = order(22);
    const ao = audit.opening!;
    expect(movesBetween(ao, plug(audit, cut(ao, at(ao, "SEALER")), "TALLY plus", "Archive"))).toBe(1);
    // Two missing, two new, each pair sharing an end: 2 moves, not 4.
    expect(movesBetween(o, plug(scrap, plug(scrap, o, "IN", "INSPECTOR"), "SHREDDER", "GAUGE"))).toBe(2);
    // A cut and an unrelated add share no end: 2 moves.
    expect(movesBetween(ao, plug(audit, cut(ao, at(ao, "SEALER")), "SHREDDER", "Canteen"))).toBe(2);
  });
});

describe("REPAIR-03 Score", () => {
  test("Night scrap run: 'Moves <count>, par <MovePar>.' with ' Par met.' at or under par; the best keeps the fewest moves and the lamp stays lit", () => {
    const fix = fixByMoves();
    let best: RepairBest | null = null;
    expect(repairLamp(best)).toBe("off");
    const m1 = moves(scrap, fix);
    expect(report(scrap, run(scrap, fix), { movesLine: movesLine(scrap, m1) }).scoreLines).toEqual(["Moves 2, par 2. Par met."]);
    best = keepRepairBest(scrap, best, m1);
    expect([best, repairLamp(best)]).toEqual([{ moves: 2, parMet: true }, "lit"]);
    const noShredder = cut(fix, at(fix, "SHREDDER"));
    expect(run(scrap, noShredder).win).toBe(true);
    const m2 = moves(scrap, noShredder);
    expect(movesLine(scrap, m2)).toBe("Moves 3, par 2.");
    best = keepRepairBest(scrap, best, m2);
    expect([best, repairLamp(best)]).toEqual([{ moves: 2, parMet: true }, "lit"]);
  });

  test("the opening wiring run unchanged fails: no score", () => {
    expect(run(scrap, faultWiring(17)).win).toBe(false);
    expect(() => faultWiring(1)).toThrow();
  });
});
