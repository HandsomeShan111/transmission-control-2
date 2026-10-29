import { describe, expect, test } from "bun:test";
import { createBus, pageEvents, type PageEvents } from "../events";

describe("page events", () => {
  test("the five events of the architecture, with their fixed fields", () => {
    const seen: string[] = [];
    const bus = createBus<PageEvents>();
    bus.on("orderOpened", (p) => seen.push(`opened ${p.order}`));
    bus.on("wiringChanged", (p) => seen.push(`wiring ${p.order}`));
    bus.on("runEnded", (p) => seen.push(`ended ${p.order} ${p.win} ${p.reportId}`));
    bus.on("reportClosed", (p) => seen.push(`closed ${p.order} ${p.reportId}`));
    bus.on("winKept", (p) => seen.push(`kept ${p.order}`));
    bus.emit("orderOpened", { order: 3 });
    bus.emit("wiringChanged", { order: 3 });
    bus.emit("runEnded", { order: 3, win: true, reportId: "r1" });
    bus.emit("reportClosed", { order: 3, reportId: "r1" });
    bus.emit("winKept", { order: 3 });
    expect(seen).toEqual(["opened 3", "wiring 3", "ended 3 true r1", "closed 3 r1", "kept 3"]);
  });
  test("listeners run in subscription order and get a frozen copy", () => {
    const bus = createBus<PageEvents>();
    const order: number[] = [];
    const payload = { order: 7 };
    bus.on("winKept", (p) => {
      order.push(1);
      expect(Object.isFrozen(p)).toBe(true);
      expect(p).not.toBe(payload);
    });
    bus.on("winKept", () => order.push(2));
    bus.emit("winKept", payload);
    expect(order).toEqual([1, 2]);
  });
  test("off and the returned unsubscribe stop a listener; once runs once", () => {
    const bus = createBus<PageEvents>();
    let a = 0;
    let b = 0;
    let c = 0;
    const fa = () => a++;
    bus.on("orderOpened", fa);
    const offB = bus.on("orderOpened", () => b++);
    bus.once("orderOpened", () => c++);
    bus.emit("orderOpened", { order: 1 });
    bus.off("orderOpened", fa);
    offB();
    bus.emit("orderOpened", { order: 1 });
    expect([a, b, c]).toEqual([1, 1, 1]);
    expect(bus.count("orderOpened")).toBe(0);
  });
  test("a listener that throws does not stop the others; its error comes out after", () => {
    const bus = createBus<PageEvents>();
    let ran = false;
    bus.on("winKept", () => {
      throw new Error("boom");
    });
    bus.on("winKept", () => (ran = true));
    expect(() => bus.emit("winKept", { order: 1 })).toThrow("boom");
    expect(ran).toBe(true);
  });
  test("several errors come out together", () => {
    const bus = createBus<PageEvents>();
    bus.on("winKept", () => {
      throw new Error("a");
    });
    bus.on("winKept", () => {
      throw new Error("b");
    });
    expect(() => bus.emit("winKept", { order: 1 })).toThrow(AggregateError);
  });
  test("a bus extends to new events by its type", () => {
    type More = PageEvents & { shared: { order: number; how: "text" | "picture" } };
    const bus = createBus<More>();
    let how = "";
    bus.on("shared", (p) => (how = p.how));
    bus.emit("shared", { order: 2, how: "picture" });
    expect(how).toBe("picture");
  });
  test("the page has one bus", () => expect(pageEvents.count("orderOpened")).toBe(0));
});
