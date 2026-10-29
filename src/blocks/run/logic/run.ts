import type { Applied, Lamp, OutJackKind, Role } from "../../agents/api";
import { agent, apply, lampAfter } from "../../agents/api";
import type { Item } from "../../items/api";
import { enter, markNames, matches } from "../../items/api";
import type { AgentPlace, ItemEnding, Order, Wire } from "../../orders/api";
import { inEnds, outJacks } from "../../wires/api";
import type { Beat, End, ItemSnapshot, PathStep, RunEvent, RunOptions, Trace, TraceItem, Where } from "../api";
import { RUN_LIMIT } from "../api";

type Placed = AgentPlace & { readonly role: Role };

type Meta = {
  path: PathStep[];
  end: End | null;
  endBeat: number;
  copiedFrom: string | null;
};

function jackName(a: Placed, j: OutJackKind): string {
  return j === "out" ? a.label : `${a.label} ${j}`;
}

function deepFreeze<T>(v: T): T {
  if (v !== null && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k]);
  }
  return v;
}

/** Item order (REPORT-01, RUN-02 step 3): batch order, each copy right behind its original, copies by number. */
function byItemOrder(a: { place: number; copy: number }, b: { place: number; copy: number }): number {
  return a.place - b.place || a.copy - b.copy;
}

export function run(order: Order, wires: readonly Wire[], options: RunOptions = {}): Trace {
  const snapshots = options.snapshots ?? true;

  // Check the wiring against the board: legal jacks, one wire per output jack (WIRE-03).
  const legalFrom = new Set(outJacks(order));
  const legalTo = new Set(inEnds(order));
  const wireTo = new Map<string, string>();
  for (const w of wires) {
    if (!legalFrom.has(w.from)) throw new Error(`order ${order.n}: no output jack "${w.from}"`);
    if (!legalTo.has(w.to)) throw new Error(`order ${order.n}: no input jack or destination "${w.to}"`);
    if (wireTo.has(w.from)) throw new Error(`order ${order.n}: two wires from "${w.from}"`);
    wireTo.set(w.from, w.to);
  }
  const destinations = new Set(order.destinations);

  const placed: Placed[] = order.agents.map((a) => ({ ...a, role: agent(a.name).role }));
  // RUN-02 step 1: agents in column order, then lane order.
  const workOrder = [...placed].sort((a, b) => a.col - b.col || a.lane - b.lane);

  // RUN-01: every batch item waits at the input terminal; check counts zero; run time zero.
  const items = new Map<string, Item>();
  const meta = new Map<string, Meta>();
  order.batch.forEach((b, i) => {
    const it = enter(i + 1, b.kind, b.marks, b.required);
    items.set(it.id, it);
    meta.set(it.id, { path: [], end: null, endBeat: 0, copiedFrom: null });
  });
  let atIn = [...items.keys()];
  const queues = new Map<string, string[]>(placed.map((a) => [a.label, []]));
  const copiesMade = order.batch.map(() => 0);
  let lamps: Record<string, Lamp> = Object.fromEntries(placed.map((a) => [a.label, "off" as Lamp]));
  const beats: Beat[] = [];
  let time = 0;

  const ended = (id: string, end: End, beat: number) => {
    const m = meta.get(id)!;
    m.end = end;
    m.endBeat = beat;
  };

  const whereOf = (id: string): Where => {
    const e = meta.get(id)!.end;
    if (e) {
      if (e.type === "arrived") return { at: "terminal", destination: e.destination };
      if (e.type === "stopped") return { at: "stopped", jack: e.jack };
      if (e.type === "rejected") return { at: "rejected", agent: e.agent };
      return { at: "lost" };
    }
    const pin = atIn.indexOf(id);
    if (pin >= 0) return { at: "in", pos: pin };
    for (const [label, q] of queues) {
      const p = q.indexOf(id);
      if (p >= 0) return { at: "queue", agent: label, pos: p };
    }
    throw new Error(`item ${id} is nowhere`);
  };

  const snapshot = (): ItemSnapshot[] =>
    [...items.values()].sort(byItemOrder).map((it) => ({
      id: it.id,
      kind: it.kind,
      marks: markNames(it.marks),
      rejected: it.rejectedBy !== null,
      checks: it.checks,
      where: whereOf(it.id),
    }));

  const start = snapshots ? snapshot() : null;

  for (let beat = 1; ; beat++) {
    const events: RunEvent[] = [];
    const arrivals: { id: string; to: string; via: "wire" | "reject" }[] = [];
    const did = new Map<string, Applied>();

    const send = (id: string, jack: string, agentLabel: string | null) => {
      const to = wireTo.get(jack);
      if (to === undefined) {
        // RUN-04: a jack with no wire: the item stays there, at its end.
        events.push({ type: "stop", item: id, jack });
        ended(id, { type: "stopped", jack, agent: agentLabel }, beat);
      } else {
        events.push({ type: "send", item: id, from: jack, to });
        arrivals.push({ id, to, via: "wire" });
      }
    };

    // Step 1: each agent with items waiting works the first one.
    for (const a of workOrder) {
      const q = queues.get(a.label)!;
      const id = q.shift();
      if (id === undefined) continue;
      const it = items.get(id)!;
      const batchItem = order.batch[it.place - 1]!;
      const nextCopy = copiesMade[it.place - 1]! + 1;
      const res = apply(a, it, a.role === "copier" ? { copy: nextCopy, required: batchItem.copies.find((c) => c.n === nextCopy)?.required ?? null } : undefined);
      did.set(a.label, res);
      const m = meta.get(id)!;
      items.set(id, res.item);
      switch (res.action) {
        case "work":
          m.path.push({ agent: a.label, name: a.name, kind: it.kind, verdict: null });
          events.push({ type: "work", agent: a.label, item: id, mark: res.mark, kindFrom: res.kindFrom, kindTo: res.kindTo });
          send(id, jackName(a, "out"), a.label);
          break;
        case "copy": {
          copiesMade[it.place - 1] = nextCopy;
          m.path.push({ agent: a.label, name: a.name, kind: it.kind, verdict: null });
          const cid = res.copy.id;
          items.set(cid, res.copy);
          meta.set(cid, { path: [], end: null, endBeat: 0, copiedFrom: id });
          events.push({ type: "copy", agent: a.label, item: id, mark: res.mark, copy: cid, copyNumber: nextCopy });
          send(id, jackName(a, "item"), a.label);
          send(cid, jackName(a, "copy"), a.label);
          break;
        }
        case "check":
          m.path.push({ agent: a.label, name: a.name, kind: it.kind, verdict: res.verdict });
          events.push({ type: "check", agent: a.label, item: id, verdict: res.verdict, count: res.count });
          send(id, jackName(a, res.jack), a.label);
          break;
        case "reject":
          events.push({ type: "reject", agent: a.label, item: id, checks: res.checks });
          // RUN-05: to its required output's destination, arriving this beat; with none, it stays at the checking agent.
          if (it.required) arrivals.push({ id, to: it.required.destination, via: "reject" });
          else ended(id, { type: "rejected", agent: a.label }, beat);
          break;
      }
    }

    // Step 2: the input terminal sends its first waiting item; with no wire, every item stays there (RUN-04).
    if (atIn.length > 0) {
      if (!wireTo.has("IN")) {
        for (const id of atIn) {
          events.push({ type: "stop", item: id, jack: "IN" });
          ended(id, { type: "stopped", jack: "IN", agent: null }, beat);
        }
        atIn = [];
      } else send(atIn.shift()!, "IN", null);
    }

    // Step 3: arrivals, batch order, each copy right behind its original (sort is stable).
    arrivals.sort((x, y) => byItemOrder(items.get(x.id)!, items.get(y.id)!));
    for (const ar of arrivals) {
      if (destinations.has(ar.to)) {
        ended(ar.id, { type: "arrived", destination: ar.to, rejectedBy: items.get(ar.id)!.rejectedBy }, beat);
        events.push({ type: "arrive", item: ar.id, at: ar.to, terminal: true, pos: null, via: ar.via });
      } else {
        const q = queues.get(ar.to)!;
        q.push(ar.id);
        events.push({ type: "arrive", item: ar.id, at: ar.to, terminal: false, pos: q.length - 1, via: ar.via });
      }
    }

    // Step 4: run time.
    time = beat;
    const next: Record<string, Lamp> = {};
    for (const a of placed) next[a.label] = lampAfter(a.role, lamps[a.label]!, did.get(a.label) ?? null);
    lamps = next;

    // RUN-06: the run ends when nothing waits; at RunLimit, every item not at its end is lost.
    const waiting = atIn.length > 0 || [...queues.values()].some((q) => q.length > 0);
    if (waiting && beat >= RUN_LIMIT) {
      for (const it of [...items.values()].sort(byItemOrder)) {
        if (meta.get(it.id)!.end) continue;
        events.push({ type: "lost", item: it.id });
        ended(it.id, { type: "lost" }, beat);
      }
      for (const q of queues.values()) q.length = 0;
      atIn = [];
    }
    beats.push({ n: beat, events, items: snapshots ? snapshot() : null, lamps, time });
    if (!waiting || beat >= RUN_LIMIT) break;
  }

  // RUN-07, RUN-08.
  const traceItems: TraceItem[] = [...items.values()].sort(byItemOrder).map((it) => {
    const m = meta.get(it.id)!;
    const end = m.end!;
    return {
      id: it.id,
      place: it.place,
      copy: it.copy,
      copiedFrom: m.copiedFrom,
      first: it.first,
      kind: it.kind,
      marks: it.marks,
      required: it.required,
      checks: it.checks,
      rejectedBy: it.rejectedBy,
      end,
      endBeat: m.endBeat,
      matched: matches(it, end.type === "arrived" ? end.destination : null),
      path: m.path,
    };
  });
  const copiesMissing = order.batch.flatMap((b, i) => b.copies.filter((c) => c.n > copiesMade[i]!).map((c) => ({ place: i + 1, copy: c.n })));
  const win = traceItems.every((t) => t.matched) && copiesMissing.length === 0;

  return deepFreeze({
    order: order.n,
    wires: wires.map((w) => ({ from: w.from, to: w.to })),
    wireCount: wires.length,
    start,
    beats,
    items: traceItems,
    copiesMissing,
    win,
    time,
  });
}

/** An item's end in the terms of a hand-written result (REPORT-01). A rejection that stays at its checking agent is a stop there. */
export function endingOf(t: TraceItem): ItemEnding {
  const marks = markNames(t.marks);
  const ref = { item: t.place, copy: t.copy };
  switch (t.end.type) {
    case "arrived":
      return { ...ref, end: "at", destination: t.end.destination, kind: t.kind, marks };
    case "stopped":
      return { ...ref, end: "stopped", at: t.end.agent ?? "IN", kind: t.kind, marks };
    case "rejected":
      return { ...ref, end: "stopped", at: t.end.agent, kind: t.kind, marks };
    case "lost":
      return { ...ref, end: "lost", kind: t.kind };
  }
}
