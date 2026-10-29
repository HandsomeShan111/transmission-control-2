import { describe, expect, test } from "bun:test";
import { cutAt, hitAt, hops, inEndAt, length, nearestFirst, route, type WireGeometry } from "../view/geometry";

// A small landscape board: IN, A (worker) and C (checker), and one terminal T.
const g: WireGeometry = {
  flow: "landscape",
  outJacks: new Map([
    ["IN", { x: 0, y: 0 }],
    ["A", { x: 300, y: 0 }],
    ["C plus", { x: 300, y: 175 }],
    ["C minus", { x: 300, y: 225 }],
  ]),
  inJacks: new Map([
    ["A", { x: 172, y: 0 }],
    ["C", { x: 172, y: 200 }],
    ["T", { x: 600, y: 100 }],
  ]),
  faces: new Map([
    ["A", { x: 172, y: -59, w: 128, h: 118 }],
    ["C", { x: 172, y: 141, w: 128, h: 118 }],
  ]),
  terminals: new Map([["T", { x: 625, y: 0, w: 240, h: 200 }]]),
  jackRadius: 22,
};

describe("WIRE-01 routes", () => {
  test("a wire runs straight from its output jack to its input end", () => {
    expect(route(g, "IN", "A")).toEqual([{ x: 0, y: 0 }, { x: 172, y: 0 }]);
  });
  test("a wire that would pass another agent detours along a lane gap, leaving and entering along the flow", () => {
    expect(route(g, "IN", "T")).toEqual([{ x: 0, y: 0 }, { x: 56, y: 0 }, { x: 56, y: 74 }, { x: 560, y: 74 }, { x: 560, y: 100 }, { x: 600, y: 100 }]);
  });
  test("a wire from an agent to its own input runs round its face, at least half its outline", () => {
    const r = route(g, "C minus", "C");
    expect(r.length).toBeGreaterThan(2);
    expect(length(r)).toBeGreaterThan(128 + 118);
    const ys = r.map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(141);
  });
  test("the later wire of two that cross hops; a shared jack is no crossing", () => {
    const g0 = { ...g, faces: new Map() };
    const routes = [route(g0, "IN", "T"), route(g0, "C plus", "A")];
    expect(hops(routes, 0, 16)).toEqual([]);
    expect(hops(routes, 1, 16).length).toBe(1);
    expect(hops([route(g0, "IN", "A"), route(g0, "C plus", "A")], 1, 16)).toEqual([]);
  });
});

describe("WIRE-02, WIRE-04 hits", () => {
  const wiring = [
    { from: "IN", to: "A" },
    { from: "A", to: "T" },
    { from: "C plus", to: "T" },
  ];
  const routes = wiring.map((w) => route(g, w.from, w.to));
  const reach = { reach: 22, length: 44 };
  test("a press on an output jack holds a new wire", () => {
    expect(hitAt(g, wiring, routes, { x: 300, y: 2 }, reach)).toEqual({ kind: "out", jack: "A" });
  });
  test("a press on an input end where several wires end holds the last in the wire list", () => {
    expect(hitAt(g, wiring, routes, { x: 600, y: 100 }, reach)).toEqual({ kind: "end", wire: 2, end: "to" });
  });
  test("EndReach from the line and EndLength from the jack's edge hold an end; the wire's middle does not", () => {
    expect(hitAt(g, wiring, routes, { x: 60, y: 20 }, reach)).toEqual({ kind: "end", wire: 0, end: "from" });
    expect(hitAt(g, wiring, routes, { x: 60, y: 30 }, reach)).toEqual({ kind: "none" });
    expect(hitAt(g, wiring, routes, { x: 450, y: 50 }, reach)).toEqual({ kind: "none" });
  });
  test("in reach of two wires' lines near an input end: the nearer line's end", () => {
    const two: WireGeometry = { ...g, faces: new Map(), outJacks: new Map([["IN", { x: 0, y: 0 }], ["C plus", { x: 0, y: 40 }]]), inJacks: new Map([["A", { x: 300, y: 20 }]]) };
    const w = [{ from: "IN", to: "A" }, { from: "C plus", to: "A" }];
    const r = w.map((x) => route(two, x.from, x.to));
    // 40 board units short of A's jack: the lines lie 5.3 apart; a press 2 above IN's line holds IN's end, though it is first.
    expect(hitAt(two, w, r, { x: 260, y: 15.3 }, reach)).toEqual({ kind: "end", wire: 0, end: "to" });
    expect(hitAt(two, w, r, { x: 260, y: 24.7 }, reach)).toEqual({ kind: "end", wire: 1, end: "to" });
  });
  test("in reach of both ends of one short wire: the nearer end", () => {
    const short: WireGeometry = { ...g, outJacks: new Map([["IN", { x: 0, y: 0 }]]), inJacks: new Map([["A", { x: 100, y: 0 }]]) };
    const w = [{ from: "IN", to: "A" }];
    const r = w.map((x) => route(short, x.from, x.to));
    expect(hitAt(short, w, r, { x: 40, y: 0 }, reach)).toEqual({ kind: "end", wire: 0, end: "from" });
    expect(hitAt(short, w, r, { x: 60, y: 0 }, reach)).toEqual({ kind: "end", wire: 0, end: "to" });
  });
  test("a terminal's panel takes a drop", () => {
    expect(inEndAt(g, { x: 700, y: 150 })).toBe("T");
    expect(inEndAt(g, { x: 700, y: 150 }, false)).toBeNull();
  });
});

test("FEEL-01: rings nearest the held jack first, ties in rank order", () => {
  expect(nearestFirst({ x: 0, y: 0 }, [
    { name: "far", at: { x: 100, y: 0 }, order: 0 },
    { name: "near", at: { x: 10, y: 0 }, order: 1 },
    { name: "tie", at: { x: 0, y: 100 }, order: 2 },
  ])).toEqual(["near", "far", "tie"]);
  expect(cutAt([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 15)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
});
