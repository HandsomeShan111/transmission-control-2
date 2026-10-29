// Incident archive, the rules (ARCHIVE-01 to ARCHIVE-03): filing a printed report under its order with the run's wiring,
// results found, and the rows an order shows. Pure: state in, state out.
import type { Order } from "../../orders/api";
import { order as orderOf, orders } from "../../orders/api";
import type { Report } from "../../reports/api";
import { report as reportOf, reportId } from "../../reports/api";
import { movesLine, moves } from "../../repair-orders/api";
import { run } from "../../run/api";
import type { Trace } from "../../run/api";
import type { Wiring } from "../../wires/api";
import type { ArchiveRow, ArchiveState, Filed, FileResult } from "../api";

/** HandResults (orders.md parameters): the hand-written results each order of the data holds. */
export const HAND_RESULTS = orders()[0]!.results.length;

export const EMPTY_ARCHIVE: ArchiveState = { filed: [], found: {} };

/** FNV-1a, 32 bits, as 7 base-36 digits: a stable id of a text. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

/** ARCHIVE-01: two reports are the same when every line is the same. The id: the order number and every line (Reports' id). */
export function reportIdOf(order: number, lines: readonly string[]): string {
  return reportId({ order, lines });
}

type Replay = { readonly order: Order; readonly trace: Trace; readonly report: Report; readonly id: string };
/** Replays kept by order and wiring, the newest REPLAYS_KEPT: the same wiring, the same run, so a filed report runs once. */
const REPLAYS_KEPT = 1024;
const replays = new Map<string, Replay>();

/**
 * The run of a wiring and its report, as a filed report reprints from (ARCHIVE-03). A repair order's win prints its moves line.
 * Run without beat snapshots: a filed report needs its items' ends, not each beat's.
 */
export function replay(n: number, wiring: Wiring): Replay {
  const key = `${n}:${JSON.stringify(wiring.map((w) => [w.from, w.to]))}`;
  const kept = replays.get(key);
  if (kept) return kept;
  const order = orderOf(n);
  const trace = run(order, wiring, { snapshots: false });
  const slots = order.repair && trace.win ? { movesLine: movesLine(order, moves(order, wiring)) } : {};
  const report = reportOf(order, trace, slots);
  const r: Replay = { order, trace, report, id: reportIdOf(n, report.lines) };
  if (replays.size >= REPLAYS_KEPT) replays.delete(replays.keys().next().value!);
  replays.set(key, r);
  return r;
}

export function foundOf(state: ArchiveState, n: number): readonly number[] {
  return state.found[n] ?? [];
}

/**
 * ARCHIVE-01: files a report printed for the first time, with the run's wiring. A report already filed files nothing. A lead that
 * is a hand-written result not yet found finds it.
 */
export function fileReport(state: ArchiveState, n: number, report: Report, wiring: Wiring): { state: ArchiveState; result: FileResult } {
  const id = reportIdOf(n, report.lines);
  const isNew = !state.filed.some((f) => f.order === n && f.id === id);
  const filed = isNew ? [...state.filed, { order: n, wiring: [...wiring], id }] : state.filed;
  const had = foundOf(state, n);
  const r = report.handWritten;
  const foundNew = r !== null && !had.includes(r);
  const found = foundNew ? { ...state.found, [n]: [...had, r].sort((a, b) => a - b) } : state.found;
  const count = (found[n] ?? []).length;
  return { state: { filed, found }, result: { id, isNew, foundResult: foundNew ? r : null, foundCount: count } };
}

/** "FILED: <found> of <HandResults>." (ARCHIVE-01), for a result found by this report. */
export function filedLine(found: number): string {
  return `FILED: ${found} of ${HAND_RESULTS}.`;
}

/** "Results <found> of <HandResults>" (ARCHIVE-02). */
export function resultsLine(found: number): string {
  return `Results ${found} of ${HAND_RESULTS}`;
}

/** A filed report's row note (ARCHIVE-02): a mission report's wires and beats, or its moves. */
export function missionNote(order: Order, trace: Trace): string | null {
  if (!trace.win) return null;
  if (order.repair) return `${moves(order, trace.wires)} moves`;
  return `${trace.wireCount} wires, ${trace.time} beats`;
}

/**
 * ARCHIVE-02: an order's rows. Reports led by hand-written results first, in result order, each result's newest first; a result
 * found whose report was dropped stands by its line alone in its place. Then the rest, newest first. `litBy`: the id of the report
 * of the win that lit the second-wiring lamp, as the save keeps it, or null.
 */
export function orderRows(state: ArchiveState, n: number, litBy: string | null): ArchiveRow[] {
  const o = orderOf(n);
  const mine = state.filed
    .map((f, seq) => ({ f, seq }))
    .filter(({ f }) => f.order === n)
    .map(({ f, seq }) => ({ f, seq, ...replay(n, f.wiring) }))
    .sort((a, b) => b.seq - a.seq);
  const rows: ArchiveRow[] = [];
  const row = (x: (typeof mine)[number]): ArchiveRow => ({
    kind: "report",
    filed: x.f,
    report: x.report,
    result: x.report.handWritten,
    note: missionNote(o, x.trace),
    secondWiring: litBy !== null && x.id === litBy,
  });
  const found = foundOf(state, n);
  o.results.forEach((r, index) => {
    const led = mine.filter((x) => x.report.handWritten === index);
    if (led.length) rows.push(...led.map(row));
    else if (found.includes(index)) rows.push({ kind: "result", result: index, text: r.text });
  });
  rows.push(...mine.filter((x) => x.report.handWritten === null).map(row));
  return rows;
}
