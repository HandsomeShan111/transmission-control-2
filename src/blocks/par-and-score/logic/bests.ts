// PAR-03: each order's best, held in this page's memory. Saving keeps it and sets it back on start.
import type { Best } from "../api";

/** A page-memory store of one value per order number: `best` reads (null for none), `setBest` sets or, given null, clears, `bests` copies all. */
export function orderStore<T>() {
  const held = new Map<number, T>();
  return {
    best: (n: number): T | null => held.get(n) ?? null,
    setBest(n: number, b: T | null): void {
      if (b) held.set(n, b);
      else held.delete(n);
    },
    bests: (): ReadonlyMap<number, T> => new Map(held),
  };
}

export const { best, setBest, bests } = orderStore<Best>();
