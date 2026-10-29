import type { ItemEnding, Order } from "../api";
import { ORDERS } from "../data/orders.gen";

export function orders(): readonly Order[] {
  return ORDERS;
}

export function order(n: number): Order {
  const o = ORDERS[n - 1];
  if (!o || o.n !== n) throw new Error(`no order ${n}`);
  return o;
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Two item endings are one (REPORT-01): same item, same way of ending, same place, kind and marks. */
export function sameEnding(a: ItemEnding, b: ItemEnding): boolean {
  if (a.item !== b.item || a.copy !== b.copy || a.end !== b.end || a.kind !== b.kind) return false;
  if (a.end === "at" && b.end === "at") return a.destination === b.destination && same(a.marks, b.marks);
  if (a.end === "stopped" && b.end === "stopped") return a.at === b.at && same(a.marks, b.marks);
  return a.end === "lost" && b.end === "lost";
}
