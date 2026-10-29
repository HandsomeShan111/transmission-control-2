import type { Order } from "../../orders/api";
import { order as orderOf } from "../../orders/api";
import type { Wire, Wiring } from "../../wires/api";
import type { RepairBest } from "../api";

function movePar(order: Order): number {
  if (order.par.kind !== "moves") throw new Error(`order ${order.n} is no repair order`);
  return order.par.moves;
}

/** REPAIR-01: a repair order opens on its faults: its opening wiring. */
export function faultWiring(n: number): Wiring {
  const o = orderOf(n);
  movePar(o);
  return o.opening ?? [];
}

const key = (w: Wire) => `${w.from}\u0000${w.to}`;

/**
 * REPAIR-02: the fewest moves from `opening` to `wiring`. Each opening wire missing and each new wire is one move; a missing and a
 * new wire sharing one end make one move together. The pairs taken are a largest matching of missing to new wires.
 */
export function movesBetween(opening: Wiring, wiring: Wiring): number {
  const had = new Set(opening.map(key));
  const has = new Set(wiring.map(key));
  const missing = opening.filter((w) => !has.has(key(w)));
  const added = wiring.filter((w) => !had.has(key(w)));
  const pairedTo = new Map<number, number>(); // added index → missing index
  const tryPair = (m: number, seen: Set<number>): boolean => {
    for (let a = 0; a < added.length; a++) {
      if (seen.has(a)) continue;
      if (missing[m]!.from !== added[a]!.from && missing[m]!.to !== added[a]!.to) continue;
      seen.add(a);
      const other = pairedTo.get(a);
      if (other === undefined || tryPair(other, seen)) {
        pairedTo.set(a, m);
        return true;
      }
    }
    return false;
  };
  let pairs = 0;
  for (let m = 0; m < missing.length; m++) if (tryPair(m, new Set())) pairs++;
  return missing.length + added.length - pairs;
}

/** REPAIR-02: the moves of a wiring of repair order `order`; one wiring gives one count, however it was reached. */
export function moves(order: Order, wiring: Wiring): number {
  movePar(order);
  return movesBetween(order.opening ?? [], wiring);
}

/** REPAIR-03: "Moves <count>, par <MovePar>.", and " Par met." at or under MovePar. */
export function movesLine(order: Order, count: number): string {
  const par = movePar(order);
  return `Moves ${count}, par ${par}.${count <= par ? " Par met." : ""}`;
}

/** REPAIR-03: the best after one more win. */
export function keepRepairBest(order: Order, prev: RepairBest | null, count: number): RepairBest {
  const met = count <= movePar(order);
  return prev ? { moves: Math.min(prev.moves, count), parMet: prev.parMet || met } : { moves: count, parMet: met };
}

/** REPAIR-03: one par lamp, lit once the par is met. */
export function repairLamp(best: RepairBest | null): "off" | "lit" {
  return best?.parMet ? "lit" : "off";
}
