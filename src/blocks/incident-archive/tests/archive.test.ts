// ARCHIVE- acceptance tests a logic run can check (design/docs/build/acceptance-campaign.md, Incident archive).
import { describe, expect, test } from "bun:test";
import { order } from "../../orders/api";
import { parseWiring } from "../../wires/api";
import { TEST_WIRINGS } from "../../../testbuild/wirings.gen";
import { EMPTY_ARCHIVE, HAND_RESULTS, fileReport, filedLine, foundOf, orderRows, replay, resultsLine, type ArchiveState } from "../api";

const o1 = order(1);
const W = {
  night: "IN → World Council",
  cut: "",
  stopLam: "IN → LAMINATOR",
  win: "IN → LAMINATOR; LAMINATOR → World Council",
};
const file = (s: ArchiveState, w: string) => {
  const wiring = parseWiring(o1, w);
  return fileReport(s, 1, replay(1, wiring).report, wiring);
};

describe("ARCHIVE-01 File", () => {
  test("a report prints for the first time: filed under its order with the run's wiring; the same report again files nothing", () => {
    const a = file(EMPTY_ARCHIVE, W.night);
    expect(a.result.isNew).toBe(true);
    expect(a.state.filed).toHaveLength(1);
    expect(a.state.filed[0]!.wiring).toEqual(parseWiring(o1, W.night));
    const b = file(a.state, W.cut);
    expect(b.result.isNew).toBe(true);
    const c = file(b.state, W.cut);
    expect(c.result.isNew).toBe(false);
    expect(c.state.filed).toHaveLength(2);
  });

  test("a lead that is a hand-written result not yet found finds it: FILED: <found> of <HandResults>; found again, nothing", () => {
    const a = file(EMPTY_ARCHIVE, W.night);
    expect(a.result.foundResult).toBe(0);
    expect(filedLine(a.result.foundCount)).toBe(`FILED: 1 of ${HAND_RESULTS}.`);
    const b = file(a.state, W.cut);
    expect(b.result.foundResult).toBe(2);
    expect(filedLine(b.result.foundCount)).toBe(`FILED: 2 of ${HAND_RESULTS}.`);
    expect(file(b.state, W.cut).result.foundResult).toBeNull();
    expect(foundOf(b.state, 1)).toEqual([0, 2]);
  });

  test("a mission report is filed as any report, and finds no result", () => {
    const a = file(EMPTY_ARCHIVE, W.win);
    expect(a.result.isNew).toBe(true);
    expect(a.result.foundResult).toBeNull();
  });
});

describe("ARCHIVE-02 Browse", () => {
  test("rows: reports led by results first, in result order, newest first each; then the rest, newest first; notes and the lit-by mark", () => {
    let s = EMPTY_ARCHIVE;
    for (const w of [W.night, W.cut, W.stopLam, W.win]) s = file(s, w).state;
    const winId = replay(1, parseWiring(o1, W.win)).id;
    const rows = orderRows(s, 1, winId);
    expect(rows.map((r) => (r.kind === "report" ? r.result : "dropped"))).toEqual([0, 1, 2, null]);
    const last = rows[3]!;
    expect(last.kind === "report" && last.note).toBe("2 wires, 4 beats");
    expect(last.kind === "report" && last.secondWiring).toBe(true);
    expect(rows.slice(0, 3).every((r) => r.kind === "report" && !r.secondWiring && r.note === null)).toBe(true);
  });

  test("an order with no filed report and no result found: no rows, Results 0 of HandResults", () => {
    expect(orderRows(EMPTY_ARCHIVE, 6, null)).toEqual([]);
    expect(resultsLine(foundOf(EMPTY_ARCHIVE, 6).length)).toBe(`Results 0 of ${HAND_RESULTS}`);
  });

  test("a result found whose report was dropped stands by its line alone, in its result's place", () => {
    const s: ArchiveState = { filed: file(EMPTY_ARCHIVE, W.stopLam).state.filed, found: { 1: [0, 1] } };
    const rows = orderRows(s, 1, null);
    expect(rows[0]).toEqual({ kind: "result", result: 0, text: o1.results[0]!.text });
    expect(rows[1]!.kind === "report" && rows[1]!.result).toBe(1);
  });

  test("a repair order's mission row notes its moves", () => {
    const o = order(17);
    let s = EMPTY_ARCHIVE;
    const fixWires = TEST_WIRINGS.find((x) => x.order === 17)!.wirings[0]!.wires;
    const r = replay(17, fixWires);
    s = fileReport(s, 17, r.report, fixWires).state;
    const row = orderRows(s, 17, null)[0]!;
    expect(r.trace.win).toBe(true);
    expect(row.kind === "report" && row.note).toMatch(/^\d+ moves$/);
    expect(o.repair).toBe(true);
  });
});

describe("ARCHIVE-03 Reprint", () => {
  test("a filed report reprints from its wiring: the same lines and id, every time", () => {
    const a = file(EMPTY_ARCHIVE, W.stopLam);
    const f = a.state.filed[0]!;
    const r1 = replay(1, f.wiring);
    const r2 = replay(1, f.wiring);
    expect(r1.report.lines).toEqual(r2.report.lines);
    expect(r1.id).toBe(f.id);
    expect(r1.report.lead).toBe(o1.results[1]!.text);
  });
});
