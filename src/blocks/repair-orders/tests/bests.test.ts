import { afterEach, beforeEach, expect, test } from "bun:test";
import { best, bests, keepRepairBest, setBest } from "../api";
import { order } from "../../orders/api";

// The store is module state: start and leave it empty.
const clear = () => bests().forEach((_, n) => setBest(n, null));
beforeEach(clear);
afterEach(clear);

test("REPAIR-03: best moves per repair order in memory", () => {
  const o = order(17);
  expect(best(17)).toBeNull();
  setBest(17, keepRepairBest(o, best(17), 3));
  setBest(17, keepRepairBest(o, best(17), 2));
  setBest(17, keepRepairBest(o, best(17), 4));
  expect(best(17)).toEqual({ moves: 2, parMet: true });
  expect([...bests().keys()]).toEqual([17]);
});
