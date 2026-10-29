// PAR-02 and PAR-03 acceptance tests. PAR-01 needs the wiring search: src/testbuild/tests.
import { describe, expect, test } from "bun:test";
import { order } from "../../orders/api";
import { run } from "../../run/api";
import { cut, moveEnd, parseWiring } from "../../wires/api";
import type { Best } from "../api";
import { keepBest, parLamps, score, scoreLine, scoreLines } from "../api";

const archive = order(4);
const A = parseWiring(archive, "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → LAMINATOR 2; LAMINATOR 2 → Archive");
const B = cut(moveEnd(archive, A, 4, "to", "LAMINATOR 1"), A.length - 2);
const scored = (w: typeof A) => score(archive, run(archive, w))!;

describe("PAR-02 Score", () => {
  test("Archive day: every wire on the board, run time, each against its own par; a split order adds its line", () => {
    expect(scoreLines(scored(A))).toEqual(["Wires 6, par 5.", "Time 5, par 5. Par met.", "Best known: one wiring for each par."]);
    expect(B.map((w) => `${w.from} → ${w.to}`)).toEqual([
      "IN → INSPECTOR",
      "INSPECTOR plus → LAMINATOR 1",
      "LAMINATOR 1 → Archive",
      "INSPECTOR minus → SHREDDER",
      "SHREDDER → LAMINATOR 1",
    ]);
    expect(scoreLines(scored(B))).toEqual(["Wires 5, par 5. Par met.", "Time 6, par 5.", "Best known: one wiring for each par."]);
  });

  test("Picnic day, both pars, not split: its test wiring meets both", () => {
    const o = order(11);
    const t = run(o, parseWiring(o, "IN → INSPECTOR; INSPECTOR minus → Canteen; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive"));
    expect(scoreLines(score(o, t)!)).toEqual(["Wires 4, par 4. Par met.", "Time 5, par 5. Par met."]);
  });

  test("an order with no par prints the bare count; a wire that carried nothing counts; a failed run has no score", () => {
    const o = order(1);
    const t = run(o, parseWiring(o, "IN → LAMINATOR; LAMINATOR → World Council"));
    expect(scoreLines(score(o, t)!)).toEqual(["Wires 2.", "Time 4."]);
    // The one part formatter the mission report and the debrief's bests share.
    expect([scoreLine("Wires", 5, 4, false), scoreLine("Time", 8, 8, true), scoreLine("Time", 6, null, false)]).toEqual(["Wires 5, par 4.", "Time 8, par 8. Par met.", "Time 6."]);
    const idle = parseWiring(archive, "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → INSPECTOR; LAMINATOR 2 → Archive");
    expect(scored(idle).wires).toBe(6);
    expect(score(archive, run(archive, []))).toBeNull();
    expect(score(order(17), run(order(17), order(17).opening!))).toBeNull();
  });
});

describe("PAR-03 Best", () => {
  test("Archive day: A, then B, then A: fewest wires and fewest beats over the wins, each on its own; lamps lit once met", () => {
    const seen: [Best, ReturnType<typeof parLamps>][] = [];
    let best: Best | null = null;
    expect(parLamps(archive, best)).toEqual({ wire: "off", time: "off" });
    for (const w of [A, B, A]) {
      best = keepBest(best, scored(w));
      seen.push([best, parLamps(archive, best)]);
    }
    expect(seen).toEqual([
      [{ wires: 6, time: 5, wireMet: false, timeMet: true }, { wire: "off", time: "lit" }],
      [{ wires: 5, time: 5, wireMet: true, timeMet: true }, { wire: "lit", time: "lit" }],
      [{ wires: 5, time: 5, wireMet: true, timeMet: true }, { wire: "lit", time: "lit" }],
    ]);
    expect(parLamps(order(1), best)).toEqual({ wire: "none", time: "none" });
  });
});
