// CAMPAIGN- acceptance tests a logic run can check (design/docs/build/acceptance-campaign.md, Campaign). The browser tests play
// them through the screens: tests/e2e/campaign.spec.ts.
import { describe, expect, test } from "bun:test";
import { families } from "../../agents/api";
import { order, orders } from "../../orders/api";
import { run } from "../../run/api";
import { report } from "../../reports/api";
import { parseWiring } from "../../wires/api";
import { TEST_WIRINGS } from "../../../testbuild/wirings.gen";
import {
  ACTS,
  NEW_PROGRESS,
  ORDERS_PER_ACT,
  SIGN_OFF,
  afterReportLines,
  bestLine,
  debriefLines,
  hasSecondWiring,
  isActEnd,
  memoLines,
  openActs,
  secondWiringOutcome,
  unlockAfter,
  unlockLine,
  unlocked,
  winsDiffer,
  type Progress,
} from "../api";

const wiringOf = (n: number, label?: string) => TEST_WIRINGS.find((x) => x.order === n)!.wirings.find((w) => !label || w.label === label)!.wires;
const won = (...ns: number[]): Progress => ({ ...NEW_PROGRESS, won: ns });

describe("CAMPAIGN-02 Unlock", () => {
  test("order 1 at a new game; each first win unlocks the next; the act's last order unlocks the next act's first", () => {
    expect(unlocked(NEW_PROGRESS)).toEqual([1]);
    expect(unlocked(won(1, 2, 3))).toEqual([1, 2, 3, 4]);
    expect(unlocked(won(1, 2, 3, 4))).toEqual([1, 2, 3, 4, 5]);
    // Derived: the first win of order act × OrdersPerAct unlocks the first order of the next act.
    expect(unlocked(won(1, 2, 3, 4, 5))).toContain(1 * ORDERS_PER_ACT + 1);
    expect(openActs(won(1, 2, 3, 4, 5))).toEqual([1, 2]);
    // A replay unlocks nothing new.
    expect(unlocked(won(1, 2, 3, 4, 5, 1))).toEqual(unlocked(won(1, 2, 3, 4, 5)));
    expect(unlockLine(5)).toEqual({ text: "ORDER 5 UNLOCKED: Museum split.", double: true });
    // Acts is read from the orders data: campaign.md says six.
    expect(ACTS).toBe(6);
    expect(orders().length).toBe(ACTS * ORDERS_PER_ACT);
  });

  test("the unlock line follows a first win, but an act's last order's, whose debrief comes after the report", () => {
    const o4 = order(4);
    expect(afterReportLines({ order: o4, filedLine: null, secondWiring: null, commendations: [], firstWin: true })).toEqual([unlockLine(5)]);
    expect(afterReportLines({ order: order(5), filedLine: null, secondWiring: null, commendations: [], firstWin: true })).toEqual([]);
    expect(afterReportLines({ order: o4, filedLine: null, secondWiring: null, commendations: [], firstWin: false })).toEqual([]);
    expect(isActEnd(5) && isActEnd(30) && !isActEnd(4)).toBe(true);
    // The one rule behind both: unlockAfter.
    expect(unlockAfter(4, true)).toEqual([unlockLine(5)]);
    expect([unlockAfter(5, true), unlockAfter(30, true), unlockAfter(4, false)]).toEqual([[], [], []]);
  });
});

describe("CAMPAIGN-03 Act start", () => {
  test("the memo: the family's memo line, its name with its silhouette in double strike, then each agent with its face rule", () => {
    const m = memoLines(1);
    const f = families()[0]!;
    expect(m[0]).toEqual({ text: f.memo });
    expect(m[1]).toEqual({ text: "RECORDS", double: true, stamp: "filing cabinet" });
    expect(m.slice(2).map((l) => l.text)).toEqual(["LAMINATOR: Laminates it.", "SHREDDER: Shreds it to confetti.", "INSPECTOR: Is it paper?"]);
  });
});

describe("CAMPAIGN-04 Act end", () => {
  const filedOf = (n: number, w: string) => {
    const o = order(n);
    const t = run(o, parseWiring(o, w));
    return { order: n, report: report(o, t) };
  };
  test("lead: the act's first result found; then each order's bests, Wires then Time; achievements; the next act's first order", () => {
    const lines = debriefLines({
      act: 1,
      found: (n) => (n === 2 ? [1] : []),
      filed: [],
      best: (n) => (n === 4 ? { wires: 5, time: 6, wireMet: true, timeMet: false } : { wires: 2, time: 4, wireMet: false, timeMet: false }),
      repairBest: () => null,
      achievements: [{ text: "Results 1 of 15" }],
    });
    expect(lines[0]).toEqual({ text: order(2).results[1]!.text, double: true });
    expect(lines[4]!.text).toBe("4 Archive day: Wires 5, par 5. Par met. Time 6, par 5.");
    expect(lines[1]!.text).toBe("1 Signing ceremony: Wires 2. Time 4.");
    expect(lines[6]!.text).toBe("Results 1 of 15");
    expect(lines[7]).toEqual(unlockLine(6));
  });
  test("no result found: the newest incident report's lead; none: the newest mission report's; after the last act, the sign-off", () => {
    const inc = filedOf(1, "IN → LAMINATOR");
    const mis = filedOf(1, "IN → LAMINATOR; LAMINATOR → World Council");
    const base = { act: 1, found: () => [], best: () => null, repairBest: () => null, achievements: [] };
    expect(debriefLines({ ...base, filed: [inc, mis] })[0]!.text).toBe(inc.report.lead);
    expect(debriefLines({ ...base, filed: [mis] })[0]!.text).toBe(mis.report.lead);
    expect(debriefLines({ ...base, filed: [] })[0]!.text).toBe("1 Signing ceremony:");
    const last = debriefLines({ ...base, act: ACTS, filed: [] });
    expect(last[last.length - 1]).toEqual(SIGN_OFF);
    expect(bestLine(order(17), null, { moves: 3, parMet: true })).toMatch(/^17 .+: Moves 3, par \d+\.( Par met\.)?$/);
  });
});

describe("CAMPAIGN-05 Order list: second-wiring lamps", () => {
  test("orders of three or more agents have the lamp, repair orders aside", () => {
    expect([1, 2, 3, 4, 5].map((n) => hasSecondWiring(order(n)))).toEqual([false, false, true, true, true]);
    expect(orders().filter((o) => o.repair).every((o) => !hasSecondWiring(o))).toBe(true);
  });
  test("two wins differ when some item passes other agents; the same wiring, or a numbered twin's swap at the same wires and time, does not", () => {
    const o = order(5);
    const a = run(o, wiringOf(5, "wirePar"));
    const b = run(o, wiringOf(5, "second"));
    expect(a.win && b.win).toBe(true);
    expect(winsDiffer(a, b)).toBe(true);
    expect(winsDiffer(a, run(o, wiringOf(5, "wirePar")))).toBe(false);
    // Order 5's second wiring with LAMINATOR 1 and 2 in each other's places.
    const swap = parseWiring(o, "IN → INSPECTOR; LAMINATOR 2 → Archive; LAMINATOR 1 → Museum; INSPECTOR minus → LAMINATOR 1; INSPECTOR plus → LAMINATOR 2");
    const c = run(o, swap);
    if (c.win && c.time === b.time && c.wireCount === b.wireCount) expect(winsDiffer(b, c)).toBe(false);
  });
});

describe("CAMPAIGN-06 After the report", () => {
  const o = order(5);
  const a = run(o, wiringOf(5, "wirePar"));
  const b = run(o, wiringOf(5, "second"));
  test("a win that differs from one on file lights the lamp; the same route, no new best: ROUTE ALREADY ON FILE; lit: nothing", () => {
    expect(secondWiringOutcome(o, b, [], false, true)).toBeNull();
    expect(secondWiringOutcome(o, a, [b], false, true)).toBe("lit");
    expect(secondWiringOutcome(o, b, [b], false, false)).toBe("route");
    expect(secondWiringOutcome(o, b, [b], false, true)).toBeNull();
    expect(secondWiringOutcome(o, a, [b], true, false)).toBeNull();
  });
  test("lines in order: FILED, the second-wiring line, commendations, the unlock line", () => {
    const lines = afterReportLines({
      order: order(4),
      filedLine: { text: "FILED: 3 of 3." },
      secondWiring: { text: "SECOND WIRING FILED: Archive day." },
      commendations: [{ text: "COMMENDATION: Paper Trail. x", bell: true }],
      firstWin: true,
    });
    expect(lines.map((l) => l.text)).toEqual(["FILED: 3 of 3.", "SECOND WIRING FILED: Archive day.", "COMMENDATION: Paper Trail. x", "ORDER 5 UNLOCKED: Museum split."]);
  });
});
