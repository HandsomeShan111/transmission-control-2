// ORDER- tests that read the Orders data alone. ORDER-01, ORDER-02 (agents data), ORDER-04 runs and ORDER-05: src/testbuild/tests.
import { describe, expect, test } from "bun:test";
import { order, orders } from "../api";

describe("ORDER-03 Batch", () => {
  test("BatchItems 2 to 6, no two alike, each with a required output; the largest batch with copies under ItemBlocksMax", () => {
    const ItemBlocksMax = 12;
    let largest = 0;
    for (const o of orders()) {
      expect(o.batch.length, `order ${o.n}`).toBeGreaterThanOrEqual(2);
      expect(o.batch.length, `order ${o.n}`).toBeLessThanOrEqual(6);
      const keys = o.batch.map((b) => `${b.kind}[${b.marks.join(",")}]`);
      expect(new Set(keys).size, `order ${o.n}`).toBe(keys.length);
      for (const b of o.batch) expect(o.destinations, `order ${o.n}`).toContain(b.required.destination);
      largest = Math.max(largest, o.batch.reduce((n, b) => n + 1 + b.copies.length, 0));
    }
    expect(largest).toBeLessThan(ItemBlocksMax);
    // Order 1: two or more items, each needing its one agent's mark.
    const o1 = order(1);
    expect(o1.batch.length).toBeGreaterThanOrEqual(2);
    for (const b of o1.batch) expect(b.required.marks).toEqual(["laminated"]);
    // Victory parade and Moon Base birthday, as the test names them.
    expect(order(2).batch.length).toBe(2);
    expect(order(14).batch.map((b) => b.copies.length)).toEqual([1, 1]);
  });
});

describe("ORDER-04 Hand-written results", () => {
  test("HandResults 3 per order", () => {
    for (const o of orders()) expect(o.results.length, `order ${o.n}`).toBe(3);
  });
});
