// Saving, the save itself (SAVE-01, SAVE-03, SAVE-05): what it holds, named as the order data names it; the merge of two saves;
// the reading of a save from an earlier GameVersion. Pure.
import { achievements } from "../../achievements/api";
import type { Progress } from "../../campaign/api";
import { hashText } from "../../incident-archive/api";
import type { ArchiveState, Filed } from "../../incident-archive/api";
import type { Order, Wire } from "../../orders/api";
import { order as orderOf, orders } from "../../orders/api";
import type { Best } from "../../par-and-score/api";
import type { RepairBest } from "../../repair-orders/api";
import { canPlug } from "../../wires/api";
import type { Wiring } from "../../wires/api";

/** A filed report as the save keeps it: its order, the run's wiring, its id (order and every line). */
export type SaveFiled = { readonly order: number; readonly wiring: readonly Wire[]; readonly id: string };

/**
 * SAVE-01: the save, GameVersion first. Orders by number, results by place in their order's list, achievements by name, jacks as
 * the order data writes them. `prints`: the fingerprint of each order with a filed report or a lit lamp's report.
 */
export type Save = {
  readonly version: number;
  readonly won: readonly number[];
  readonly bests: Readonly<Record<number, Best>>;
  readonly repairBests: Readonly<Record<number, RepairBest>>;
  readonly lamps: Readonly<Record<number, { readonly wiring: readonly Wire[] | null }>>;
  readonly filed: readonly SaveFiled[];
  readonly found: Readonly<Record<number, readonly number[]>>;
  readonly earned: readonly string[];
  readonly memos: readonly number[];
  readonly debriefs: readonly number[];
  readonly prints: Readonly<Record<number, string>>;
};

/** One order's kept wiring, outside the save code (SAVE-01): its wires, its undo steps, its order's fingerprint, its GameVersion. */
export type KeptWiring = { readonly wiring: readonly Wire[]; readonly past: readonly (readonly Wire[])[]; readonly print: string; readonly version: number };

export const emptySave = (version: number): Save => ({
  version,
  won: [],
  bests: {},
  repairBests: {},
  lamps: {},
  filed: [],
  found: {},
  earned: [],
  memos: [],
  debriefs: [],
  prints: {},
});

/** SAVE-01: an order's fingerprint, of its agents, destinations, batch, opening and par: the data a report reprints from. */
export function fingerprint(o: Order): string {
  return hashText(JSON.stringify([o.agents, o.destinations, o.batch, o.opening, o.par]));
}

const prints = new Map<number, string>();
/** The fingerprint of order n in the version playing. */
export function printOf(n: number): string {
  let p = prints.get(n);
  if (p === undefined) {
    p = fingerprint(orderOf(n));
    prints.set(n, p);
  }
  return p;
}

const nums = (o: Readonly<Record<number, unknown>>) => Object.keys(o).map(Number);
const union = (a: readonly number[], b: readonly number[]) => [...new Set([...a, ...b])].sort((x, y) => x - y);

/** Legal for order n: every wire from one of its output jacks to one of its input ends, at most one wire per output jack. */
export function legalWiring(n: number, w: readonly Wire[]): boolean {
  const o = orderOf(n);
  const from = new Set<string>();
  for (const x of w) {
    if (from.has(x.from) || !canPlug(o, x.from, x.to)) return false;
    from.add(x.from);
  }
  return true;
}

/** PAR-03 over two saves: the better of the two bests. */
function betterBest(a: Best | undefined, b: Best | undefined): Best | undefined {
  if (!a || !b) return a ?? b;
  return { wires: Math.min(a.wires, b.wires), time: Math.min(a.time, b.time), wireMet: a.wireMet || b.wireMet, timeMet: a.timeMet || b.timeMet };
}

function betterRepair(a: RepairBest | undefined, b: RepairBest | undefined): RepairBest | undefined {
  if (!a || !b) return a ?? b;
  return { moves: Math.min(a.moves, b.moves), parMet: a.parMet || b.parMet };
}

/**
 * SAVE-03, and SAVE-01's keeping: `theirs` merges into `mine`. An order won in either is won; each best the better; a par met, a lamp
 * lit, a memo or debrief closed in either is so; a lamp lit in mine keeps its own lit-by report, one lit only in theirs takes
 * theirs. Filed reports, results found and achievements: those of both, each once; filed reports in mine's order, then theirs' new
 * ones in theirs. Both must already be read into the version playing.
 */
export function mergeSaves(mine: Save, theirs: Save): Save {
  const bests: Record<number, Best> = {};
  for (const n of union(nums(mine.bests), nums(theirs.bests))) bests[n] = betterBest(mine.bests[n], theirs.bests[n])!;
  const repairBests: Record<number, RepairBest> = {};
  for (const n of union(nums(mine.repairBests), nums(theirs.repairBests))) repairBests[n] = betterRepair(mine.repairBests[n], theirs.repairBests[n])!;
  const lamps: Record<number, { wiring: readonly Wire[] | null }> = { ...theirs.lamps, ...mine.lamps };
  const seen = new Set<string>();
  const filed = [...mine.filed, ...theirs.filed].filter((f) => {
    const k = `${f.order}:${f.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const found: Record<number, readonly number[]> = {};
  for (const n of union(nums(mine.found), nums(theirs.found))) found[n] = union(mine.found[n] ?? [], theirs.found[n] ?? []);
  const printsOut: Record<number, string> = { ...theirs.prints, ...mine.prints };
  return {
    version: mine.version,
    won: union(mine.won, theirs.won),
    bests,
    repairBests,
    lamps,
    filed,
    found,
    earned: [...new Set([...mine.earned, ...theirs.earned])],
    memos: union(mine.memos, theirs.memos),
    debriefs: union(mine.debriefs, theirs.debriefs),
    prints: printsOut,
  };
}

/**
 * SAVE-05: a save read into the version playing. An order whose fingerprint differs drops its filed reports (its lamp keeps no
 * lit-by report); its win, results found, bests, pars met and lamp stay. `dropped`: anything was dropped.
 */
export function readIntoVersion(s: Save, version: number): { save: Save; dropped: boolean } {
  const stale = new Set(nums(s.prints).filter((n) => s.prints[n] !== printOf(n)));
  let dropped = false;
  const filed = s.filed.filter((f) => {
    if (!stale.has(f.order)) return true;
    dropped = true;
    return false;
  });
  const lamps: Record<number, { wiring: readonly Wire[] | null }> = {};
  for (const n of nums(s.lamps)) {
    const l = s.lamps[n]!;
    if (stale.has(n) && l.wiring !== null) {
      lamps[n] = { wiring: null };
      dropped = true;
    } else lamps[n] = l;
  }
  const kept: Record<number, string> = {};
  for (const f of filed) kept[f.order] = printOf(f.order);
  for (const n of nums(lamps)) if (lamps[n]!.wiring !== null) kept[n] = printOf(n);
  return { save: { ...s, version, filed, lamps, prints: kept }, dropped };
}

/** SAVE-05 for a kept wiring: kept only while its order's fingerprint is the one playing. */
export function keptWiringFits(n: number, k: KeptWiring): boolean {
  return k.print === printOf(n) && legalWiring(n, k.wiring) && k.past.every((w) => legalWiring(n, w));
}

// ---------- reading what this browser keeps ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isWiring = (v: unknown): v is Wire[] => Array.isArray(v) && v.every((w) => isObj(w) && typeof w.from === "string" && typeof w.to === "string");
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isKnown = (n: number) => Number.isInteger(n) && n >= 1 && n <= orders().length;
/** A record by order number: each known order's entry as `f` reads it; null drops it. */
function byOrder<T>(v: unknown, f: (n: number, x: unknown) => T | null): Record<number, T> {
  const out: Record<number, T> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    const n = Number(k);
    const t = isKnown(n) ? f(n, x) : null;
    if (t !== null) out[n] = t;
  }
  return out;
}
/** Integers that pass `ok`, each once, in order. */
const intsOf = (v: unknown, ok: (n: number) => boolean): number[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isInteger(x) && ok(x)))].sort((a, b) => a - b) : [];

/**
 * SAVE-01: the save this browser keeps, read part by part: a malformed part, or an entry the game cannot play, reads as absent.
 * No GameVersion: no save. Each filed report once. A wiring of an order whose fingerprint is the one playing must be legal; one
 * of an order with no fingerprint is not kept (a filed report is dropped, a lamp keeps no lit-by report).
 */
export function readStoredSave(v: unknown): Save | null {
  if (!isObj(v) || !Number.isInteger(v.version) || (v.version as number) < 1) return null;
  const prints = byOrder(v.prints, (_, x) => (typeof x === "string" ? x : null));
  const fits = (n: number, w: readonly Wire[]) => prints[n] !== undefined && (prints[n] !== printOf(n) || legalWiring(n, w));
  const seen = new Set<string>();
  const filed = (Array.isArray(v.filed) ? v.filed : []).flatMap((f): SaveFiled[] => {
    if (!isObj(f) || typeof f.order !== "number" || !isKnown(f.order) || !isWiring(f.wiring) || typeof f.id !== "string") return [];
    const k = `${f.order}:${f.id}`;
    if (seen.has(k) || !fits(f.order, f.wiring)) return [];
    seen.add(k);
    return [{ order: f.order, wiring: f.wiring, id: f.id }];
  });
  const names = new Set(achievements().map((a) => a.name));
  const acts = Math.max(...orders().map((o) => o.act));
  const isAct = (n: number) => n >= 1 && n <= acts;
  return {
    version: v.version as number,
    won: intsOf(v.won, isKnown),
    bests: byOrder(v.bests, (n, b) =>
      isObj(b) && !orderOf(n).repair && isCount(b.wires) && isCount(b.time) && typeof b.wireMet === "boolean" && typeof b.timeMet === "boolean"
        ? { wires: b.wires, time: b.time, wireMet: b.wireMet, timeMet: b.timeMet }
        : null,
    ),
    repairBests: byOrder(v.repairBests, (n, b) => (isObj(b) && orderOf(n).repair && isCount(b.moves) && typeof b.parMet === "boolean" ? { moves: b.moves, parMet: b.parMet } : null)),
    lamps: byOrder(v.lamps, (n, l) => (isObj(l) && (l.wiring === null || isWiring(l.wiring)) ? { wiring: l.wiring !== null && fits(n, l.wiring) ? l.wiring : null } : null)),
    filed,
    found: byOrder(v.found, (n, r) => intsOf(r, (i) => i >= 0 && i < orderOf(n).results.length)),
    earned: Array.isArray(v.earned) ? [...new Set(v.earned.filter((x): x is string => typeof x === "string" && names.has(x)))] : [],
    memos: intsOf(v.memos, isAct),
    debriefs: intsOf(v.debriefs, isAct),
    prints,
  };
}

/** SAVE-01: the kept wirings, read order by order; a malformed one reads as absent. */
export function readKeptWirings(v: unknown): Record<number, KeptWiring> {
  return byOrder(v, (_, w) =>
    isObj(w) && isWiring(w.wiring) && Array.isArray(w.past) && w.past.every(isWiring) && typeof w.print === "string" && Number.isInteger(w.version)
      ? { wiring: w.wiring, past: w.past, print: w.print, version: w.version as number }
      : null,
  );
}

/** The save's parts as the blocks hold them. */
export type Parts = {
  readonly progress: Progress;
  readonly archive: ArchiveState;
  readonly earned: readonly string[];
  readonly bests: Readonly<Record<number, Best>>;
  readonly repairBests: Readonly<Record<number, RepairBest>>;
};

/** The blocks' parts into one save of the version playing. */
export function toSave(p: Parts, version: number): Save {
  const s: Save = {
    version,
    won: [...p.progress.won].sort((a, b) => a - b),
    bests: p.bests,
    repairBests: p.repairBests,
    lamps: p.progress.lamps,
    filed: p.archive.filed.map((f) => ({ order: f.order, wiring: f.wiring, id: f.id })),
    found: p.archive.found,
    earned: [...p.earned],
    memos: [...p.progress.memos],
    debriefs: [...p.progress.debriefs],
    prints: {},
  };
  const pr: Record<number, string> = {};
  for (const f of s.filed) pr[f.order] = printOf(f.order);
  for (const n of nums(s.lamps)) if (s.lamps[n]!.wiring !== null) pr[n] = printOf(n);
  return { ...s, prints: pr };
}

/** A save into the blocks' parts. */
export function fromSave(s: Save): Parts {
  const filed: Filed[] = s.filed.map((f) => ({ order: f.order, wiring: f.wiring as Wiring, id: f.id }));
  return {
    progress: { won: s.won, memos: s.memos, debriefs: s.debriefs, lamps: s.lamps as Progress["lamps"] },
    archive: { filed, found: s.found },
    earned: s.earned,
    bests: s.bests,
    repairBests: s.repairBests,
  };
}
