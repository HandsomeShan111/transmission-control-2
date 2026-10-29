import { agent, outJacks as roleJacks } from "../../agents/api";
import type { Order, Wire } from "../../orders/api";
import { order as orderOf } from "../../orders/api";
import type { History, WireKind, Wiring } from "../api";

/** Every output jack of an order, as wires name them: "IN", then each agent's in data order (AGENT-01). */
export function outJacks(order: Order): string[] {
  const out = ["IN"];
  for (const a of order.agents) {
    for (const j of roleJacks(agent(a.name).role)) out.push(j === "out" ? a.label : `${a.label} ${j}`);
  }
  return out;
}

/** WIRE-02: every agent's input jack and every output terminal takes a wire. */
export function inEnds(order: Order): string[] {
  return [...order.agents.map((a) => a.label), ...order.destinations];
}

export function canPlug(order: Order, from: string, to: string): boolean {
  return outJacks(order).includes(from) && inEnds(order).includes(to);
}

/** WIRE-01: from IN, a worker or a copier: data; from a checker's plus or minus jack: feedback, with that sign. */
export function wireKind(order: Order, from: string): WireKind {
  if (!outJacks(order).includes(from)) throw new Error(`order ${order.n} has no output jack "${from}"`);
  const m = / (plus|minus)$/.exec(from);
  if (m && order.agents.some((a) => `${a.label} ${m[1]}` === from)) return { kind: "feedback", sign: m[1] as "plus" | "minus" };
  return { kind: "data" };
}

/** WIRE-03: placed at the end of the wire list; the output jack's earlier wire, if any, is removed. */
export function plug(order: Order, wiring: Wiring, from: string, to: string): Wiring {
  if (!canPlug(order, from, to)) throw new Error(`order ${order.n}: no wire ${from} → ${to}`);
  return [...wiring.filter((w) => w.from !== from), { from, to }];
}

/**
 * WIRE-04: one end of wire `index` moves to `jack`. An input end moves to an input jack or output terminal; an output end to an
 * output jack, whose earlier wire is removed. The moved wire goes to the end of the wire list. Its own jack, or a jack of the other
 * side: nothing changes, and the same wiring comes back.
 */
export function moveEnd(order: Order, wiring: Wiring, index: number, end: "from" | "to", jack: string): Wiring {
  const w = wiring[index];
  if (!w) throw new Error(`no wire ${index}`);
  if (w[end] === jack) return wiring;
  const ok = end === "to" ? inEnds(order).includes(jack) : outJacks(order).includes(jack);
  if (!ok) return wiring;
  const moved: Wire = end === "to" ? { from: w.from, to: jack } : { from: jack, to: w.to };
  const rest = wiring.filter((x, i) => i !== index && !(end === "from" && x.from === jack));
  return [...rest, moved];
}

/** WIRE-05. */
export function cut(wiring: Wiring, index: number): Wiring {
  if (!wiring[index]) throw new Error(`no wire ${index}`);
  return wiring.filter((_, i) => i !== index);
}

/** WIRE-04: of several wires ending at one input jack or output terminal, the last in the wire list; -1 for none. */
export function endAt(wiring: Wiring, to: string): number {
  for (let i = wiring.length - 1; i >= 0; i--) if (wiring[i]!.to === to) return i;
  return -1;
}

/** PAR-02: every wire on the board. */
export function wireCount(wiring: Wiring): number {
  return wiring.length;
}

export function sameWiring(a: Wiring, b: Wiring): boolean {
  return a.length === b.length && a.every((w, i) => w.from === b[i]!.from && w.to === b[i]!.to);
}

/** "IN → LAMINATOR; LAMINATOR → World Council", the data's notation. Throws on a wire this order cannot hold. */
export function parseWiring(order: Order, text: string): Wiring {
  if (text.trim() === "") return [];
  let w: Wiring = [];
  for (const part of text.split(";")) {
    const m = /^\s*(.+?)\s*→\s*(.+?)\s*$/.exec(part);
    if (!m) throw new Error(`not a wire: "${part}"`);
    if (w.some((x) => x.from === m[1])) throw new Error(`two wires from ${m[1]}`);
    w = plug(order, w, m[1]!, m[2]!);
  }
  return w;
}

export function formatWiring(wiring: Wiring): string {
  return wiring.map((w) => `${w.from} → ${w.to}`).join("; ");
}

/** WIRE-06, WIRE-07: a history opened on `start` (a kept wiring, or the opening), with its undo steps `past` (SAVE-01). */
export function openHistory(order: Order, start?: Wiring, past: readonly Wiring[] = []): History {
  const opening = order.opening ?? [];
  return { opening, current: start ?? opening, past };
}

/** A plug, move or cut made: `next` becomes the wiring. A step that changes nothing is no step. */
export function record(h: History, next: Wiring): History {
  if (sameWiring(h.current, next)) return h;
  return { ...h, current: next, past: [...h.past, h.current] };
}

/** WIRE-06: the last plug, move, cut or reset reversed; at the start, nothing changes. */
export function undo(h: History): History {
  const prev = h.past[h.past.length - 1];
  if (!prev) return h;
  return { ...h, current: prev, past: h.past.slice(0, -1) };
}

/** WIRE-07: back to the order's opening wiring, never a kept one. Undo reverses it. */
export function reset(h: History): History {
  return record(h, h.opening);
}

// The wiring of each order this page holds, with its undo steps: the wiring the board last set, else the opening (BOARD-01).
// Kept wirings belong to Saving.
const held = new Map<number, Wiring>();
const steps = new Map<number, readonly Wiring[]>();

export function wiring(n: number): Wiring {
  return held.get(n) ?? orderOf(n).opening ?? [];
}

/** WIRE-06, SAVE-01: the undo steps of order n's wiring, oldest first. */
export function undoSteps(n: number): readonly Wiring[] {
  return steps.get(n) ?? [];
}

export function setWiring(n: number, wires: Wiring, past: readonly Wiring[] = []): void {
  held.set(n, [...wires]);
  steps.set(n, past.map((w) => [...w]));
}
