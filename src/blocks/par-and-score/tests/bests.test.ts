import { afterEach, beforeEach, expect, test } from "bun:test";
import { order } from "../../orders/api";
import { run } from "../../run/api";
import { parseWiring } from "../../wires/api";
import { best, bests, keepBest, parLamps, score, setBest } from "../api";

// The store is module state: start and leave it empty.
const clear = () => bests().forEach((_, n) => setBest(n, null));
beforeEach(clear);
afterEach(clear);

test("PAR-03: bests per order in memory, kept over wins, each on its own", () => {
  const o = order(4);
  const a = parseWiring(o, "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → LAMINATOR 2; LAMINATOR 2 → Archive");
  const b = parseWiring(o, "IN → INSPECTOR; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; INSPECTOR minus → SHREDDER; SHREDDER → LAMINATOR 1");
  expect(best(4)).toBeNull();
  for (const w of [a, b, a]) setBest(4, keepBest(best(4), score(o, run(o, w))!));
  const sa = score(o, run(o, a))!;
  const sb = score(o, run(o, b))!;
  expect(best(4)).toEqual({ wires: Math.min(sa.wires, sb.wires), time: Math.min(sa.time, sb.time), wireMet: sa.wireMet || sb.wireMet, timeMet: sa.timeMet || sb.timeMet });
  expect(bests().get(4)).toEqual(best(4)!);
  expect(parLamps(o, best(4)).wire).toBe(best(4)!.wireMet ? "lit" : "off");
  setBest(4, null);
  expect(best(4)).toBeNull();
});
