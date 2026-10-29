// Campaign, the rules (CAMPAIGN-01 to CAMPAIGN-06): unlocks, second-wiring lamps, the lines after a report, the act memo and the
// act debrief. Pure: progress in, lines out.
import { agents, families } from "../../agents/api";
import type { Order } from "../../orders/api";
import { order as orderOf, orders } from "../../orders/api";
import { scoreLine, type Best, type Score } from "../../par-and-score/api";
import type { PrintLine } from "../../../platform/pieces/printout";
import type { SilhouetteName } from "../../../platform/pieces/silhouette";
import type { RepairBest } from "../../repair-orders/api";
import { movesLine } from "../../repair-orders/api";
import type { Report } from "../../reports/api";
import type { Trace } from "../../run/api";
import type { Progress } from "../api";

/** Acts and OrdersPerAct (campaign.md parameters). The acts are the last act of the orders data. */
export const ACTS = Math.max(...orders().map((o) => o.act));
export const ORDERS_PER_ACT = 5;
/** OpeningGuard, seconds (campaign.md parameters). */
export const OPENING_GUARD = 1.0;

export const NEW_PROGRESS: Progress = { won: [], memos: [], debriefs: [], lamps: {} };

export const lastOrder = () => orders().length;

/** The orders of an act, in order. */
export function actOrders(act: number): readonly Order[] {
  return orders().filter((o) => o.act === act);
}

/** CAMPAIGN-04: an act's last order. */
export function isActEnd(n: number): boolean {
  const o = orderOf(n);
  const act = actOrders(o.act);
  return act[act.length - 1]!.n === n;
}

/** CAMPAIGN-02: order 1 at a new game's first tap, and the next order after each order won; every unlocked order stays so. */
export function unlocked(p: Progress): number[] {
  const s = new Set<number>([1]);
  for (const n of p.won) if (n < lastOrder()) s.add(n + 1);
  return [...s].sort((a, b) => a - b);
}

export function isUnlocked(p: Progress, n: number): boolean {
  return unlocked(p).includes(n);
}

/** The acts that hold an unlocked order (CAMPAIGN-05). */
export function openActs(p: Progress): number[] {
  return [...new Set(unlocked(p).map((n) => orderOf(n).act))].sort((a, b) => a - b);
}

/** A done act: its last order won (CAMPAIGN-04). */
export function isActDone(p: Progress, act: number): boolean {
  const list = actOrders(act);
  return list.length > 0 && p.won.includes(list[list.length - 1]!.n);
}

/** CAMPAIGN-02: "ORDER <number> UNLOCKED: <name>.", in double strike (ART-12). */
export function unlockLine(n: number): PrintLine {
  return { text: `ORDER ${n} UNLOCKED: ${orderOf(n).name}.`, double: true };
}

/** CAMPAIGN-04: after the last act, in the unlock line's place, in double strike (ART-12). */
export const SIGN_OFF: PrintLine = { text: "NO FURTHER ORDERS ON FILE.", double: true };

/** ORDER-05 and ACHIEVE-01: an order of three or more agents, repair orders aside, counts for second wirings and has the lamp. */
export function hasSecondWiring(o: Order): boolean {
  return !o.repair && o.agents.length >= 3;
}

/** The agents each item passes, by item id: labels, or names with numbered twins as one. */
function passes(t: Trace, byName: boolean): Map<string, string> {
  return new Map(t.items.map((i) => [i.id, i.path.map((p) => (byName ? p.name : p.agent)).join("|")]));
}

/**
 * ORDER-05: two wins count as different when some item passes other agents; a wiring that only puts one numbered twin in another's
 * place, with the same wires and run time, does not count.
 */
export function winsDiffer(a: Trace, b: Trace): boolean {
  const same = (byName: boolean) => {
    const pa = passes(a, byName);
    const pb = passes(b, byName);
    const ids = new Set([...pa.keys(), ...pb.keys()]);
    return [...ids].every((id) => pa.get(id) === pb.get(id));
  };
  if (same(false)) return false;
  return !(same(true) && a.wireCount === b.wireCount && a.time === b.time);
}

/** PAR-03: a win sets a new best or meets a par for the first time. */
export function improves(prev: Best | null, s: Score): boolean {
  if (!prev) return true;
  return s.wires < prev.wires || s.time < prev.time || (s.wireMet && !prev.wireMet) || (s.timeMet && !prev.timeMet);
}

export function improvesRepair(prev: RepairBest | null, count: number, par: number): boolean {
  if (!prev) return true;
  return count < prev.moves || (count <= par && !prev.parMet);
}

/**
 * CAMPAIGN-05, CAMPAIGN-06 item 2: a win of an order with the lamp, against the mission reports on file for it (their runs).
 * "lit": it differs from one, and the lamp was dark. "route": the lamp is dark, it counts the same as a win on file, and it sets no
 * new best and meets no par for the first time. Else null.
 */
export function secondWiringOutcome(o: Order, win: Trace, onFile: readonly Trace[], lampLit: boolean, improved: boolean): "lit" | "route" | null {
  if (!hasSecondWiring(o) || !win.win || lampLit) return null;
  if (onFile.some((t) => t.win && winsDiffer(win, t))) return "lit";
  if (onFile.some((t) => t.win && !winsDiffer(win, t)) && !improved) return "route";
  return null;
}

/** CAMPAIGN-06 item 2. */
export function secondWiringLine(outcome: "lit" | "route", o: Order): PrintLine {
  return { text: outcome === "lit" ? `SECOND WIRING FILED: ${o.name}.` : "ROUTE ALREADY ON FILE." };
}

/** CAMPAIGN-06 item 5: a first win's unlock line, unless it is an act's last order (its debrief follows the report's close) or the last. */
export function unlockAfter(n: number, firstWin: boolean): PrintLine[] {
  return firstWin && !isActEnd(n) && n < lastOrder() ? [unlockLine(n + 1)] : [];
}

/**
 * CAMPAIGN-06: the lines after a report, in order: FILED for a result found, the second-wiring line, each commendation (the bell
 * before the first), then on a first win the unlock line, unless it is an act's last order: its debrief follows the report's close.
 */
export function afterReportLines(o: {
  readonly order: Order;
  readonly filedLine: PrintLine | null;
  readonly secondWiring: PrintLine | null;
  readonly commendations: readonly PrintLine[];
  readonly firstWin: boolean;
}): PrintLine[] {
  const out: PrintLine[] = [];
  if (o.filedLine) out.push(o.filedLine);
  if (o.secondWiring) out.push(o.secondWiring);
  out.push(...o.commendations, ...unlockAfter(o.order.n, o.firstWin));
  return out;
}

/** The family that an act brings (Agent families). */
export function actFamily(act: number) {
  const f = families().find((x) => x.act === act);
  if (!f) throw new Error(`no family for act ${act}`);
  return f;
}

/** CAMPAIGN-03: the memo: the family's memo line, its name with its silhouette, then each of its agents with its face rule. */
export function memoLines(act: number): PrintLine[] {
  const f = actFamily(act);
  return [
    { text: f.memo },
    { text: f.name, double: true, stamp: f.silhouette as SilhouetteName },
    ...agents()
      .filter((a) => a.family === f.name)
      .map((a) => ({ text: `${a.name}: ${a.rule}` })),
  ];
}

/** CAMPAIGN-04: a best as the mission report prints a score, Wires then Time ("Wires 5, par 5. Par met. Time 6, par 5."). */
export function bestLine(o: Order, best: Best | null, repairBest: RepairBest | null): string {
  const head = `${o.n} ${o.name}:`;
  if (o.par.kind === "moves") return repairBest ? `${head} ${movesLine(o, repairBest.moves)}` : head;
  if (!best) return head;
  return `${head} ${scoreLine("Wires", best.wires, o.par.wires, best.wireMet)} ${scoreLine("Time", best.time, o.par.time, best.timeMet)}`;
}

/** A filed report's form and lead, in filing order, for a debrief's lead. */
export type FiledLead = { readonly order: number; readonly report: Report };

/**
 * CAMPAIGN-04: an act's debrief. Lead: the act's first hand-written result found, in order and result order; none: the newest
 * incident report's lead; none: the newest mission report's; none: no lead. Then each order's bests; then the act's achievements
 * (from Achievements); last, the next act's first order, or the sign-off after the last act.
 */
export function debriefLines(o: {
  readonly act: number;
  readonly found: (n: number) => readonly number[];
  readonly filed: readonly FiledLead[];
  readonly best: (n: number) => Best | null;
  readonly repairBest: (n: number) => RepairBest | null;
  readonly achievements: readonly PrintLine[];
}): PrintLine[] {
  const list = actOrders(o.act);
  const ns = new Set(list.map((x) => x.n));
  let lead: string | null = null;
  for (const x of list) {
    const first = [...o.found(x.n)].sort((a, b) => a - b)[0];
    if (first !== undefined && x.results[first]) {
      lead = x.results[first]!.text;
      break;
    }
  }
  const mine = o.filed.filter((f) => ns.has(f.order));
  const newest = (form: "incident" | "mission") => [...mine].reverse().find((f) => f.report.form === form)?.report.lead ?? null;
  lead ??= newest("incident") ?? newest("mission");
  const out: PrintLine[] = [];
  if (lead) out.push({ text: lead, double: true });
  for (const x of list) out.push({ text: bestLine(x, o.best(x.n), o.repairBest(x.n)) });
  out.push(...o.achievements);
  const next = actOrders(o.act + 1)[0];
  out.push(next ? unlockLine(next.n) : SIGN_OFF);
  return out;
}
