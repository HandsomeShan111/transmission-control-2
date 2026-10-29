// ART-10 item bodies: one flat body per item kind in Cream and Ink with at
// most one palette accent. No two bodies share an outline. Drawn 44 across in a
// result row, 36 on a moving item (ui/board.md); the outline keeps
// OutlineWeight at either size.
import { art, colours } from "../tokens";
import { n, s } from "./dom";

export const ITEM_KINDS = [
  "Address",
  "Treaty",
  "Star chart",
  "Confetti",
  "Cake",
  "Coffee",
  "Sandwich",
  "Satellite",
  "Cube",
  "Flag",
  "Moon rock",
  "Spacesuit",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** The accent each body carries, if any (at most one, ART-10). */
export const BODY_ACCENT: Record<ItemKind, "Orange" | "Mustard" | "Teal" | null> = {
  Address: null,
  Treaty: "Orange",
  "Star chart": "Mustard",
  Confetti: "Mustard",
  Cake: "Orange",
  Coffee: "Teal",
  Sandwich: "Teal",
  Satellite: "Teal",
  Cube: "Mustard",
  Flag: "Orange",
  "Moon rock": null,
  Spacesuit: "Teal",
};

const BOX = 44;
const C = colours.Cream;
const I = colours.Ink;

type Prim = { tag: "path" | "rect" | "circle"; a: Record<string, string | number>; fill: string; detail?: boolean };

const P = (d: string, fill: string = C): Prim => ({ tag: "path", a: { d }, fill });
const R = (x: number, y: number, width: number, height: number, fill: string = C, rx = 0, transform?: string): Prim => ({
  tag: "rect",
  a: { x, y, width, height, ...(rx ? { rx } : {}), ...(transform ? { transform } : {}) },
  fill,
});
const O = (cx: number, cy: number, r: number, fill: string = C): Prim => ({ tag: "circle", a: { cx, cy, r }, fill });
/** An Ink detail line inside a body (not an outline). */
const L = (d: string): Prim => ({ tag: "path", a: { d }, fill: "none", detail: true });

function star(cx: number, cy: number, ro: number, ri: number): string {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i ? "L" : "M"}${n(cx + r * Math.cos(t))} ${n(cy + r * Math.sin(t))}`;
  }
  return d + "Z";
}

/** Each body in a 44 x 44 box centred on 0,0, back to front. */
const BODIES: Record<ItemKind, Prim[]> = {
  // A portrait sheet with a turned corner.
  Address: [P("M-12 -17H5L12 -10V17H-12Z"), L("M5 -17V-10H12"), L("M-7 -4H7M-7 2H7M-7 8H2")],
  // A landscape sheet with an Orange seal and its ribbon tails.
  Treaty: [R(-17, -13, 34, 22), L("M-12 -7H12M-12 -2H4"), P("M4 6L1 17L5.5 14L8 18L9 7Z", colours.Orange), O(6, 5, 5.5, colours.Orange)],
  // A round chart with a Mustard star.
  "Star chart": [O(0, 0, 17), L("M-17 0H-11M11 0H17M0 -17V-11M0 11V17"), P(star(0, 0, 8, 3.4), colours.Mustard)],
  // Scattered squares, two Mustard.
  Confetti: [
    R(-4.5, -4.5, 9, 9, C, 0, "translate(-10 -9) rotate(20)"),
    R(-4.5, -4.5, 9, 9, colours.Mustard, 0, "translate(7 -11) rotate(-25)"),
    R(-4.5, -4.5, 9, 9, C, 0, "translate(-1 1) rotate(10)"),
    R(-4.5, -4.5, 9, 9, C, 0, "translate(10 7) rotate(-15)"),
    R(-4.5, -4.5, 9, 9, colours.Mustard, 0, "translate(-11 11) rotate(30)"),
  ],
  // Two tiers and an Orange candle.
  Cake: [R(-2, -18, 4, 8, colours.Orange), R(-10, -10, 20, 10, C, 2), R(-16, 0, 32, 14, C, 2), L("M-16 6H16")],
  // A mug with a handle and a Teal band, on a saucer.
  Coffee: [
    R(5, -8, 13, 15, C, 6),
    P("M-13 -12H9V6A6 6 0 0 1 3 12H-7A6 6 0 0 1 -13 6Z"),
    R(-13, -3, 22, 5, colours.Teal),
    L("M-13 -8H9"),
    R(-17, 12, 30, 5, C, 2),
  ],
  // A wedge with its Teal filling showing along the cut.
  Sandwich: [P("M-14 15L17 -11L13.8 -14.9L-17.2 11.1Z", colours.Teal), P("M-14 15H17V-11Z"), L("M-6 11H13V-3")],
  // A body between two Teal panels on struts, an antenna.
  Satellite: [
    L("M0 -8V-14M-9 0H-6M6 0H9"),
    O(0, -16, 3),
    R(-20, -8, 11, 16, colours.Teal),
    R(9, -8, 11, 16, colours.Teal),
    R(-6, -8, 12, 16),
  ],
  // An isometric cube with a Mustard top.
  Cube: [P("M0 -17L15 -8.5L0 0L-15 -8.5Z", colours.Mustard), P("M-15 -8.5L0 0V17L-15 8.5Z"), P("M15 -8.5V8.5L0 17V0Z")],
  // A pole, a swallowtail Orange flag, a base.
  Flag: [R(-14, -17, 4, 33), P("M-10 -16H16L11 -9.5L16 -3H-10Z", colours.Orange), R(-18, 14, 12, 4)],
  // An irregular rock with craters.
  "Moon rock": [P("M-17 6L-12 -7L-3 -13L8 -11L16 -3L15 8L6 14L-10 13Z"), L("M-7.5 -2A3.5 3.5 0 1 0 -0.5 -2A3.5 3.5 0 1 0 -7.5 -2"), L("M4.5 5A2.5 2.5 0 1 0 9.5 5A2.5 2.5 0 1 0 4.5 5")],
  // A suit: helmet with a Teal visor, arms, legs.
  Spacesuit: [
    R(-9, 11, 7, 7),
    R(2, 11, 7, 7),
    R(-17, -2, 6, 13, C, 3),
    R(11, -2, 6, 13, C, 3),
    R(-11, -3, 22, 16, C, 3),
    O(0, -10, 8),
    R(-5, -13, 10, 6, colours.Teal, 3),
  ],
};

/** Detail lines inside a body (design silent): 2 board units. */
export const BODY_DETAIL = 2;

export interface ItemBodyOptions {
  kind: ItemKind;
  /** Across: 44 in a result row, 36 moving. */
  size?: number;
  cx?: number;
  cy?: number;
}

export function itemBody(o: ItemBodyOptions): SVGGElement {
  const prims = BODIES[o.kind];
  if (!prims) throw new Error(`no body for item kind ${o.kind}`);
  const size = o.size ?? BOX;
  const k = size / BOX;
  const g = s("g", {
    "data-piece": "item-body",
    "data-kind": o.kind,
    transform: `translate(${n(o.cx ?? 0)} ${n(o.cy ?? 0)}) scale(${n(k)})`,
  });
  for (const p of prims) {
    const el = s(p.tag, { ...p.a, fill: p.fill, stroke: I, "stroke-linejoin": "round" });
    el.setAttribute("stroke-width", n((p.detail ? BODY_DETAIL : art.OutlineWeight) / k));
    el.setAttribute("data-part", p.detail ? "detail" : "outline");
    g.append(el);
  }
  return g;
}
