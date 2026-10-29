// MEAS- acceptance tests a logic run can check (design/docs/build/acceptance-product.md): flags, queue and the count request.
import { describe, expect, test } from "bun:test";
import { pageEvents } from "../../../platform/events";
import { createStore } from "../../../platform/store";
import type { Campaign } from "../../campaign/api";
import { RELEASE } from "../../offline-play/api";
import { EMPTY_EVENTS, countUrl, readEvents, removeSent, startMeasures, trigger } from "../api";

describe("MEAS-04 Event flags", () => {
  test("flag unset: set it and queue the event in one write; flag set: no event", () => {
    const a = trigger(EMPTY_EVENTS, "order_start", 1, 1);
    expect(a.queued).toBe(true);
    expect(a.store).toEqual({ flags: ["order_start-1"], queue: [{ name: "order_start", order: 1, version: 1 }] });
    const b = trigger(a.store, "order_start", 1, 1);
    expect(b.queued).toBe(false);
    expect(b.store).toBe(a.store);
    expect(trigger(a.store, "order_finish", 1, 1).queued).toBe(true);
  });
  test("a stored store is read field by field", () => {
    expect(readEvents(null)).toEqual(EMPTY_EVENTS);
    expect(readEvents({ flags: ["order_start-2", 5, "x"], queue: [{ name: "order_start", order: 2, version: 1 }, { name: "bad" }] })).toEqual({
      flags: ["order_start-2"],
      queue: [{ name: "order_start", order: 2, version: 1 }],
    });
  });
});

describe("MEAS-03 Send", () => {
  test("GET of the pixel at CountAddress with p: name, order and version by dashes; e: true", () => {
    expect(countUrl("https://example.goatcounter.com/count", { name: "order_start", order: 7, version: 1 })).toBe("https://example.goatcounter.com/count?p=order_start-7-1&e=true");
  });
  test("a sent event leaves the queue, only that one; each keeps the version it was made under", () => {
    let s = trigger(EMPTY_EVENTS, "order_start", 1, 1).store;
    s = trigger(s, "order_finish", 1, 2).store;
    s = removeSent(s, { name: "order_start", order: 1, version: 1 });
    expect(s.queue).toEqual([{ name: "order_finish", order: 1, version: 2 }]);
    expect(s.flags).toEqual(["order_start-1", "order_finish-1"]);
  });
});

describe("The release counts nothing", () => {
  test("its CountAddress is empty", () => {
    expect(RELEASE.countAddress).toBe("");
  });
  test("no request at a trigger, a win kept or back online; the events still queue", async () => {
    const g = globalThis as { window?: unknown };
    const w = new EventTarget();
    g.window = w;
    try {
      const requests: string[] = [];
      const store = createStore({ prefix: "t.", storage: null, locks: null });
      const campaign = { standingBy: () => false } as unknown as Campaign;
      const m = startMeasures({ store, campaign, countAddress: RELEASE.countAddress, request: async (url) => void requests.push(url) });
      pageEvents.emit("misfireStarted", { order: 1 });
      pageEvents.emit("orderOpened", { order: 2 });
      pageEvents.emit("winKept", { order: 2 });
      w.dispatchEvent(new Event("online"));
      await m.send();
      await new Promise((r) => setTimeout(r, 10));
      expect(m.events().queue).toEqual([
        { name: "order_start", order: 1, version: 1 },
        { name: "order_start", order: 2, version: 1 },
        { name: "order_finish", order: 2, version: 1 },
      ]);
      expect(requests).toEqual([]);
    } finally {
      delete g.window;
    }
  });
});
