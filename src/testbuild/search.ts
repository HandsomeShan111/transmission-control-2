// Wiring search of the test build (acceptance.md, Test build). It drives the build's own `run` and nothing else.
//
// How it stays small. An item's route (the jacks it leaves by, its marks, its verdicts) depends only on the wiring and the item
// itself: an agent's work and verdict read the item alone, and pass limits count per item (AGENT-02 to AGENT-05). Other items
// change only when things happen (RUN-02). So the search decides wires lazily: it runs a partial wiring, finds the first output jack
// an item is sent by that has no decided wire (the item stops there, RUN-04), and branches on that jack's wire. A wire is only
// ever placed on a jack an item uses, so no listed wiring has a wire that carries nothing, and each wiring is reached once.
// A branch is cut as soon as an item that went only through decided wires can no longer match: it ended unmatched, its marks are
// no longer a prefix of its required marks (marks are only ever added, ITEM-02), or it is a copy the order does not name.
//
// Limits:
// - Every winning wiring with no idle wire is listed. Cost grows with the jacks a win uses and with checking agents an item
//   may pass freely. Measured: all 30 orders, every search, about 1 second (bun 1.4, this repo's test run).
// - Copy numbers and RunLimit depend on timing. A cut on them is sound only while each batch item has at most one named copy,
//   which holds for every order; `assertOneCopy` checks it.
// - fewestMoveFixes searches up to the order's MovePar moves; a fix needing more is not found.
// - wiringFor tries up to MaxHandWires wires.
import { sameEnding } from "../blocks/orders/api";
import type { ItemEnding, Order } from "../blocks/orders/api";
import { endingOf, run } from "../blocks/run/api";
import type { Trace, TraceItem } from "../blocks/run/api";
import { agent } from "../blocks/agents/api";
import { inEnds } from "../blocks/wires/api";
import type { Wire } from "../blocks/wires/api";

/** One wiring the search found, with its run's wires, beats and the agents each item passes, by item id. */
export type Found = {
  readonly wires: readonly Wire[];
  readonly wireCount: number;
  readonly time: number;
  readonly passes: Readonly<Record<string, readonly string[]>>;
};

export const MaxHandWires = 10;

const isPrefix = (a: readonly string[], b: readonly string[]) => a.length <= b.length && a.every((m, i) => m === b[i]);

function assertOneCopy(order: Order): void {
  if (order.batch.some((b) => b.copies.length > 1)) throw new Error(`order ${order.n}: the search's copy cut needs at most one named copy per item`);
}

function found(t: Trace): Found {
  return { wires: t.wires, wireCount: t.wireCount, time: t.time, passes: Object.fromEntries(t.items.map((i) => [i.id, i.path.map((p) => p.agent)])) };
}

/** Each item's uses of output jacks, in event order: the jack, the event's global index, and the item's marks before it. */
type Use = { jack: string; seq: number; marks: readonly string[]; checks: Readonly<Record<string, number>>; kind: string };

function usesOf(t: Trace): Map<string, Use[]> {
  const uses = new Map<string, Use[]>(t.items.map((i) => [i.id, []]));
  // Rebuild each item's marks and checks as the events go, to know its state when it leaves by a jack.
  const state = new Map<string, { marks: string[]; checks: Record<string, number>; kind: string }>();
  for (const it of t.items) {
    if (it.copy === 0) state.set(it.id, { marks: it.marks.filter((m) => m.by === null).map((m) => m.name), checks: {}, kind: it.first });
  }
  let seq = 0;
  for (const b of t.beats) {
    for (const e of b.events) {
      seq++;
      if (e.type === "work") {
        const s = state.get(e.item)!;
        s.marks.push(e.mark);
        s.kind = e.kindTo;
      } else if (e.type === "copy") {
        const s = state.get(e.item)!;
        s.marks.push(e.mark);
        state.set(e.copy, { marks: [...s.marks], checks: {}, kind: s.kind });
      } else if (e.type === "check") {
        state.get(e.item)!.checks[e.agent] = e.count;
      } else if (e.type === "send" || e.type === "stop") {
        const s = state.get(e.item)!;
        uses.get(e.item)!.push({ jack: e.type === "send" ? e.from : e.jack, seq, marks: [...s.marks], checks: { ...s.checks }, kind: s.kind });
      }
    }
  }
  return uses;
}

/** Can `it`, in state `u`, leaving by a jack wired to `to`, still match? Only the next step is judged. */
function nextStepCanMatch(order: Order, it: TraceItem, u: Use, to: string): boolean {
  const r = it.required;
  if (!r) return false;
  if (order.destinations.includes(to)) return to === r.destination && u.kind === r.kind && u.marks.length === r.marks.length && isPrefix(u.marks, r.marks);
  const a = order.agents.find((x) => x.label === to)!;
  const def = agent(a.name);
  if (def.role === "checker") return (u.checks[a.label] ?? 0) < a.passLimit!;
  return isPrefix([...u.marks, def.mark!], r.marks);
}

/** Has this item, along decided wires only (before `limitSeq`), already lost every chance to match? */
function doomed(it: TraceItem, uses: readonly Use[], limitSeq: number): boolean {
  if (!it.required) return true;
  const decided = uses.filter((u) => u.seq < limitSeq);
  for (const u of decided) if (!isPrefix(u.marks, it.required.marks)) return true;
  return false;
}

function wiringOf(decided: Map<string, string>, base: readonly Wire[] = []): Wire[] {
  const out: Wire[] = base.filter((w) => !decided.has(w.from));
  for (const [from, to] of decided) out.push({ from, to });
  return out;
}

/** Every winning wiring of `order` with no wire that carries nothing (PAR-01, ORDER-05). */
export function winningWirings(order: Order): Found[] {
  assertOneCopy(order);
  const targets = inEnds(order);
  const wins: Found[] = [];
  const dfs = (decided: Map<string, string>) => {
    const t = run(order, wiringOf(decided), { snapshots: false });
    const uses = usesOf(t);
    let first: { jack: string; seq: number } | null = null;
    for (const it of t.items) {
      const us = uses.get(it.id)!;
      if (it.end.type !== "stopped") {
        if (!it.matched) return;
        continue;
      }
      // Stopped: at a jack with no decided wire. Everything before it was decided.
      const stop = us[us.length - 1]!;
      if (doomed(it, us, stop.seq + 1)) return;
      if (!first || stop.seq < first.seq) first = { jack: stop.jack, seq: stop.seq };
    }
    if (!first) {
      if (t.win) wins.push(found(t));
      return;
    }
    const jack = first.jack;
    const atJack = t.items.filter((i) => i.end.type === "stopped" && i.end.jack === jack);
    for (const to of targets) {
      if (!atJack.every((i) => nextStepCanMatch(order, i, uses.get(i.id)!.at(-1)!, to))) continue;
      dfs(new Map([...decided, [jack, to]]));
    }
  };
  dfs(new Map());
  return wins;
}

/** A repair order's fewest-move fixes (REPAIR-01, REPAIR-02), each as the whole board, searched up to MovePar moves. */
export function fewestMoveFixes(order: Order): { moves: number; fixes: Found[] } | null {
  if (order.par.kind !== "moves" || !order.opening) throw new Error(`order ${order.n} is no repair order`);
  assertOneCopy(order);
  const opening = new Map(order.opening.map((w) => [w.from, w.to]));
  const targets = inEnds(order);
  let budget = order.par.moves;
  let fixes: { cost: number; f: Found }[] = [];
  // `confirmed`: jacks whose wire is settled, to its opening target (cost 0) or another (cost 1). Others keep the opening wire.
  const dfs = (confirmed: Map<string, string>, cost: number) => {
    const t = run(order, wiringOf(confirmed, order.opening!), { snapshots: false });
    const uses = usesOf(t);
    let first: Use | null = null;
    let firstItem: TraceItem | null = null;
    for (const it of t.items) {
      const us = uses.get(it.id)!;
      const open = us.find((u) => !confirmed.has(u.jack));
      if (doomed(it, us, open ? open.seq + 1 : Infinity)) return;
      if (!open) {
        if (!it.matched) return;
        continue;
      }
      if (!first || open.seq < first.seq) (first = open), (firstItem = it);
    }
    if (!first) {
      if (t.win && cost <= budget) {
        if (cost < budget) (fixes = []), (budget = cost);
        fixes.push({ cost, f: found(t) });
      }
      return;
    }
    const jack = first.jack;
    const was = opening.get(jack);
    if (was !== undefined) dfs(new Map([...confirmed, [jack, was]]), cost);
    if (cost + 1 > budget) return;
    for (const to of targets) {
      if (to === was || !nextStepCanMatch(order, firstItem!, first, to)) continue;
      dfs(new Map([...confirmed, [jack, to]]), cost + 1);
    }
  };
  dfs(new Map(), 0);
  if (fixes.length === 0) return null;
  return { moves: budget, fixes: fixes.filter((x) => x.cost === budget).map((x) => x.f) };
}

/** A hand-written result that leads its report: its index in the order's results, and `of`, the lead (REPORT-01) of a run's report. */
export type Lead = { readonly index: number; readonly of: (t: Trace) => number | null };

/** The report's lead can no longer change: every item that could set it has ended where no later wire reaches it. */
function settled(order: Order, t: Trace, lead: Lead): boolean {
  const ended = (i: TraceItem) => i.end.type !== "stopped";
  if (order.repair) {
    const failing = t.items.findIndex((i) => !i.matched);
    return failing >= 0 && t.items.slice(0, failing + 1).every(ended);
  }
  const led = lead.of(t);
  if (led === null || led >= lead.index) return false;
  const { ending } = order.results[led]!;
  const it = t.items.find((i) => i.place === ending.item && i.copy === ending.copy);
  return it !== undefined && ended(it);
}

/**
 * A wiring whose run gives `ending`, with as few wires as the item's path needs (ORDER-04), or null within MaxHandWires.
 * With `lead`, also one whose report is led by that result: wires of other items are decided too, to keep earlier results out.
 */
export function wiringFor(order: Order, ending: ItemEnding, lead?: Lead): Wire[] | null {
  const targets = inEnds(order);
  const wantMarks = ending.end === "lost" ? null : ending.marks;
  for (let max = 0; max <= MaxHandWires; max++) {
    const dfs = (decided: Map<string, string>, left: ReadonlySet<string>): Wire[] | null => {
      const wires = wiringOf(decided);
      const t = run(order, wires, { snapshots: false });
      const target = t.items.find((i) => i.place === ending.item && i.copy === ending.copy);
      const reached = target !== undefined && sameEnding(endingOf(target), ending);
      if (reached && (!lead || lead.of(t) === lead.index)) return wires;
      if (lead && settled(order, t, lead)) return null;
      // Marks are only ever added: a target past the wanted marks never gets back.
      if (target && wantMarks && !isPrefix(target.marks.map((m) => m.name), wantMarks)) return null;
      // Follow the target, or, before it is made, the items of its batch place; once it ends as wanted, the other items.
      const followed = reached ? t.items.filter((i) => i !== target) : target ? [target] : t.items.filter((i) => i.place === ending.item);
      // A jack the wanted ending stops at, and jacks left unwired, stay as they are.
      const kept = new Set(left);
      if (reached && target.end.type === "stopped") kept.add(target.end.jack);
      const uses = usesOf(t);
      let jack: string | null = null;
      let seq = Infinity;
      for (const i of followed) {
        if (i.end.type !== "stopped" || kept.has(i.end.jack)) continue;
        const u = uses.get(i.id)!.at(-1)!;
        if (u.seq < seq) (seq = u.seq), (jack = u.jack);
      }
      if (jack === null || decided.size >= max) return null;
      for (const to of targets) {
        const r = dfs(new Map([...decided, [jack, to]]), left);
        if (r) return r;
      }
      return lead ? dfs(decided, new Set([...left, jack])) : null;
    };
    const r = dfs(new Map(), new Set());
    if (r) return r;
  }
  return null;
}
