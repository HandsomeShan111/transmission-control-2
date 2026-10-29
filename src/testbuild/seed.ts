// Save seeding from a test file (acceptance.md, Test build): a save and the event store set before the game opens, written in the
// save's own terms. Wins and runs are played through the game's own rules: each files its report, a win counts, keeps its best
// and may light its second-wiring lamp; everything else may be set directly.
import { NEW_PROGRESS, hasSecondWiring, improves, secondWiringOutcome, type Progress } from "../blocks/campaign/api";
import { EMPTY_ARCHIVE, fileReport, replay, type ArchiveState } from "../blocks/incident-archive/api";
import { order as orderOf } from "../blocks/orders/api";
import { keepBest, score, type Best } from "../blocks/par-and-score/api";
import { keepRepairBest, moves, type RepairBest } from "../blocks/repair-orders/api";
import { toSave, printOf, type KeptWiring, type Save } from "../blocks/saving/api";
import { parseWiring } from "../blocks/wires/api";
import type { EventStore } from "../blocks/product-measures/api";

/** A test file: wirings in the order data's notation, "IN → LAMINATOR; LAMINATOR → World Council". */
export type SeedSpec = {
  /** Runs played in this order: each files its report; a win counts as a win. */
  readonly runs?: readonly { readonly order: number; readonly wiring: string }[];
  /** Orders won with their test wiring's first line is not needed: orders marked won with no run (a pasted code's win). */
  readonly won?: readonly number[];
  readonly found?: Readonly<Record<string, readonly number[]>>;
  readonly bests?: Readonly<Record<string, Best>>;
  readonly repairBests?: Readonly<Record<string, RepairBest>>;
  /** A lamp lit with the wiring of the win that lit it, or null for a dropped report. */
  readonly lamps?: Readonly<Record<string, string | null>>;
  readonly memos?: readonly number[];
  readonly debriefs?: readonly number[];
  readonly earned?: readonly string[];
  /** Kept wirings, beside the save. */
  readonly wirings?: Readonly<Record<string, string>>;
  readonly events?: EventStore;
  readonly muted?: boolean;
  /** The GameVersion the save was kept under. */
  readonly version?: number;
  /** Orders whose data differed under that version: their fingerprints differ from the version playing (SAVE-05). */
  readonly staleOrders?: readonly number[];
};

/** A fingerprint no order has. */
export const STALE_PRINT = "0000000";

export type Seeded = { readonly save: Save; readonly wirings: Record<number, KeptWiring>; readonly events: EventStore | null; readonly muted: boolean | null };

export function seedOf(spec: SeedSpec, playing: number): Seeded {
  let progress: Progress = NEW_PROGRESS;
  let archive: ArchiveState = EMPTY_ARCHIVE;
  const bests: Record<number, Best> = {};
  const repairBests: Record<number, RepairBest> = {};
  for (const r of spec.runs ?? []) {
    const o = orderOf(r.order);
    const wiring = parseWiring(o, r.wiring);
    const onFile = archive.filed.filter((f) => f.order === o.n).map((f) => replay(o.n, f.wiring).trace).filter((t) => t.win);
    const { trace, report } = replay(o.n, wiring);
    archive = fileReport(archive, o.n, report, wiring).state;
    if (!trace.win) continue;
    let improved = false;
    if (o.par.kind === "score") {
      const s = score(o, trace)!;
      improved = improves(bests[o.n] ?? null, s);
      bests[o.n] = keepBest(bests[o.n] ?? null, s);
    } else {
      const m = moves(o, wiring);
      repairBests[o.n] = keepRepairBest(o, repairBests[o.n] ?? null, m);
    }
    const lit = hasSecondWiring(o) && secondWiringOutcome(o, trace, onFile, progress.lamps[o.n] !== undefined, improved) === "lit";
    progress = {
      ...progress,
      won: [...new Set([...progress.won, o.n])].sort((a, b) => a - b),
      lamps: lit ? { ...progress.lamps, [o.n]: { wiring } } : progress.lamps,
    };
  }
  const num = <T>(r: Readonly<Record<string, T>> | undefined) => Object.entries(r ?? {}).map(([k, v]) => [Number(k), v] as const);
  const found: Record<number, readonly number[]> = { ...archive.found };
  for (const [n, rs] of num(spec.found)) found[n] = [...new Set([...(found[n] ?? []), ...rs])].sort((a, b) => a - b);
  for (const [n, b] of num(spec.bests)) bests[n] = b;
  for (const [n, b] of num(spec.repairBests)) repairBests[n] = b;
  const lamps: Record<number, { wiring: ReturnType<typeof parseWiring> | null }> = { ...progress.lamps };
  for (const [n, w] of num(spec.lamps)) lamps[n] = { wiring: w === null ? null : parseWiring(orderOf(n), w) };
  progress = {
    won: [...new Set([...progress.won, ...(spec.won ?? [])])].sort((a, b) => a - b),
    memos: [...(spec.memos ?? [])],
    debriefs: [...(spec.debriefs ?? [])],
    lamps,
  };
  archive = { ...archive, found };
  const stale = new Set(spec.staleOrders ?? []);
  const fresh = toSave({ progress, archive, earned: spec.earned ?? [], bests, repairBests }, spec.version ?? playing);
  const prints = Object.fromEntries(Object.entries(fresh.prints).map(([n, p]) => [n, stale.has(Number(n)) ? STALE_PRINT : p]));
  const save: Save = { ...fresh, prints };
  const wirings: Record<number, KeptWiring> = {};
  for (const [n, w] of num(spec.wirings))
    wirings[n] = { wiring: parseWiring(orderOf(n), w), past: [], print: stale.has(n) ? STALE_PRINT : printOf(n), version: spec.version ?? playing };
  return { save, wirings, events: spec.events ?? null, muted: spec.muted ?? null };
}
