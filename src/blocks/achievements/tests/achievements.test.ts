// ACHIEVE- acceptance tests a logic run can check (design/docs/build/acceptance-campaign.md, Achievements).
import { describe, expect, test } from "bun:test";
import { NEW_PROGRESS, ACTS, ORDERS_PER_ACT } from "../../campaign/api";
import { HAND_RESULTS } from "../../incident-archive/api";
import { actAchievements, achievements, commendationLine, debriefAchievementLines, kindProgress, newlyEarned, type Standing } from "../api";

const none: Standing = { progress: NEW_PROGRESS, found: () => [], best: () => null, repairBest: () => null };
const allFound = (acts: number[]) => (n: number) => (acts.includes(Math.ceil(n / ORDERS_PER_ACT)) ? [0, 1, 2] : []);

describe("ACHIEVE-01 Earn", () => {
  test("three kinds in each act, 18 in all", () => {
    expect(achievements()).toHaveLength(3 * ACTS);
    for (let act = 1; act <= ACTS; act++) expect(actAchievements(act).map((a) => a.kind)).toEqual(["results", "second wirings", "par"]);
  });
  test("results: every hand-written result of the act's orders found, HandResults × OrdersPerAct", () => {
    expect(kindProgress("results", 1, none)).toEqual({ met: 0, of: HAND_RESULTS * ORDERS_PER_ACT });
    const s: Standing = { ...none, found: (n) => (n <= 5 ? (n === 5 ? [0, 1] : [0, 1, 2]) : []) };
    expect(kindProgress("results", 1, s).met).toBe(14);
    expect(newlyEarned([1], new Set(), s)).toEqual([]);
    expect(newlyEarned([1], new Set(), { ...none, found: allFound([1]) }).map((a) => a.name)).toEqual(["Paper Trail"]);
  });
  test("second wirings: each order of the act that counts has its lamp lit; par: every par met, in one run or several", () => {
    const lit: Standing = { ...none, progress: { ...NEW_PROGRESS, lamps: { 3: { wiring: [] }, 4: { wiring: [] }, 5: { wiring: [] } } } };
    expect(kindProgress("second wirings", 1, lit)).toEqual({ met: 3, of: 3 });
    expect(newlyEarned([1], new Set(), lit).map((a) => a.name)).toEqual(["Second Opinion"]);
    const pars = kindProgress("par", 1, none);
    const met: Standing = { ...none, best: () => ({ wires: 1, time: 1, wireMet: true, timeMet: true }) };
    expect(kindProgress("par", 1, met)).toEqual({ met: pars.of, of: pars.of });
    expect(newlyEarned([1], new Set(["Under Budget"]), met)).toEqual([]);
  });
});

describe("ACHIEVE-02 Show", () => {
  test("COMMENDATION: <name>. <line>; a debrief names the earned and counts the rest", () => {
    const a = actAchievements(1)[0]!;
    expect(commendationLine(a)).toEqual({ text: `COMMENDATION: ${a.name}. ${a.line}` });
    const lines = debriefAchievementLines(1, new Set(["Paper Trail"]), none).map((l) => l.text);
    expect(lines[0]).toBe("Paper Trail");
    expect(lines[1]).toBe("Second wirings 0 of 3");
    expect(lines[2]).toMatch(/^Pars 0 of \d+$/);
  });
  test("after a code: in act order, each act's in kind order", () => {
    const s: Standing = { ...none, found: allFound([1, 3]), best: () => ({ wires: 1, time: 1, wireMet: true, timeMet: true }), repairBest: () => ({ moves: 0, parMet: true }) };
    const got = newlyEarned([3, 1, 2], new Set(["Clear Signal"]), s).map((a) => `${a.act} ${a.kind}`);
    expect(got).toEqual(["1 results", "1 par", "3 results", "3 par", "4 par", "5 par", "6 par"].filter((x) => Number(x[0]) <= 3));
  });
});
