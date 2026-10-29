// ART-08 wires: WireWidth wide with a WireEdge Ink edge on each side. Data:
// solid Cream. Plus feedback: dashed Teal. Minus feedback: dashed Orange.
// Dashes DashLength long with DashGap between. A feedback wire carries a Cream
// sign disc of SignDiscSize at its middle. Every wire carries one arrow,
// ArrowSize long and as wide, three quarters along, pointing with the flow, in
// its colour with a WireEdge Ink edge. A crossing hop is a half circle of
// HopRadius. A trace on a label plate: a dim of the plate's Cream, TraceWidth
// wide, keeping TraceLight of the light; a feedback trace keeps its dashes.
import { art, colours, shared } from "../tokens";
import { n, s, type Point } from "./dom";
import { signDisc } from "./sign";

export type WireKind = "data" | "plus" | "minus";

export const WIRE_COLOUR: Record<WireKind, string> = { data: colours.Cream, plus: colours.Teal, minus: colours.Orange };

/** The held tip's radius, board units (design silent): the wire's width with its edges, and 2. */
export const HELD_TIP_RADIUS = art.WireWidth / 2 + art.WireEdge + 2;

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Total length of a polyline. */
export function polylineLength(pts: Point[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1]!, pts[i]!);
  return l;
}

/** The point and direction (radians) a fraction t along a polyline. */
export function along(pts: Point[], t: number): { p: Point; angle: number } {
  const total = polylineLength(pts);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = dist(a, b);
    if (d <= l || i === pts.length - 1) {
      const f = l ? Math.min(1, d / l) : 0;
      return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    d -= l;
  }
  const a = pts[0]!;
  return { p: a, angle: 0 };
}

/**
 * Path data for a wire: straight segments, rounded corners of `round` (a wire
 * around its own face), and a half circle of HopRadius at each hop point that
 * lies on a segment.
 */
export function wireD(pts: Point[], hops: Point[] = [], round = 0): string {
  const R = art.HopRadius;
  const first = pts[0]!;
  let d = `M${n(first.x)} ${n(first.y)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = dist(a, b) || 1;
    const ux = (b.x - a.x) / l;
    const uy = (b.y - a.y) / l;
    // Rounded corner at b toward the next point.
    const c = pts[i + 1];
    let end = b;
    let corner = "";
    if (round > 0 && c) {
      const l2 = dist(b, c) || 1;
      const r = Math.min(round, l / 2, l2 / 2);
      end = { x: b.x - ux * r, y: b.y - uy * r };
      const out = { x: b.x + ((c.x - b.x) / l2) * r, y: b.y + ((c.y - b.y) / l2) * r };
      corner = `Q${n(b.x)} ${n(b.y)} ${n(out.x)} ${n(out.y)}`;
    }
    const onSeg = hops
      .map((h) => ({ h, t: ((h.x - a.x) * ux + (h.y - a.y) * uy) / l, off: Math.abs((h.x - a.x) * uy - (h.y - a.y) * ux) }))
      .filter((o) => o.off < 0.5 && o.t * l > R && o.t * l < dist(a, end) - R)
      .sort((p, q) => p.t - q.t);
    // The hop bulges to the segment's upper side on screen (or its left, on an upright segment).
    const sweep = ux > 1e-6 || (Math.abs(ux) <= 1e-6 && uy < 0) ? 1 : 0;
    for (const { h } of onSeg)
      d += `L${n(h.x - ux * R)} ${n(h.y - uy * R)}A${R} ${R} 0 0 ${sweep} ${n(h.x + ux * R)} ${n(h.y + uy * R)}`;
    d += `L${n(end.x)} ${n(end.y)}${corner}`;
  }
  return d;
}

/** The arrow: a triangle ArrowSize long and as wide, pointing along +x from its centre. */
export function arrowD(): string {
  const A = art.ArrowSize;
  return `M${n(A / 2)} 0L${n(-A / 2)} ${n(-A / 2)}V${n(A / 2)}Z`;
}

export interface WireOptions {
  kind: WireKind;
  /** From the output jack's centre to the input's, through any corners. */
  points: Point[];
  hops?: Point[];
  /** Corner radius for a wire run around its own face. */
  round?: number;
  /** A held wire (ART-15): drawn as its kind with a Mustard tip at its end. */
  held?: boolean;
}

export interface Wire {
  el: SVGGElement;
  /** FEEL-06 dash march: shifts the dashes by this many board units along the flow. */
  setDashOffset(units: number): void;
}

export function wirePath(o: WireOptions): Wire {
  const colour = WIRE_COLOUR[o.kind];
  const d = wireD(o.points, o.hops ?? [], o.round ?? 0);
  const dash = o.kind === "data" ? null : `${art.DashLength} ${art.DashGap}`;
  const line = (stroke: string, width: number, part: string) =>
    s("path", { d, fill: "none", stroke, "stroke-width": width, "stroke-linejoin": "round", "stroke-dasharray": dash, "data-part": part });
  const edge = line(colours.Ink, art.WireWidth + 2 * art.WireEdge, "edge");
  const core = line(colour, art.WireWidth, "core");
  const el = s("g", { "data-piece": "wire", "data-kind": o.kind }, edge, core);
  const at = along(o.points, 0.75);
  el.append(
    s("path", {
      d: arrowD(),
      fill: colour,
      stroke: colours.Ink,
      "stroke-width": 2 * art.WireEdge,
      "stroke-linejoin": "round",
      "paint-order": "stroke",
      transform: `translate(${n(at.p.x)} ${n(at.p.y)}) rotate(${n((at.angle * 180) / Math.PI)})`,
      "data-part": "arrow",
    }),
  );
  if (o.kind !== "data") {
    const mid = along(o.points, 0.5).p;
    el.append(signDisc({ sign: o.kind, ground: "cream", cx: mid.x, cy: mid.y }));
  }
  if (o.held) {
    const tip = o.points[o.points.length - 1]!;
    el.append(
      s("circle", {
        cx: n(tip.x),
        cy: n(tip.y),
        r: n(HELD_TIP_RADIUS - art.OutlineWeight / 2),
        fill: colours.Mustard,
        stroke: colours.Ink,
        "stroke-width": art.OutlineWeight,
        "data-part": "held-tip",
      }),
    );
  }
  return {
    el,
    setDashOffset(u) {
      const v = n(-u);
      edge.setAttribute("stroke-dashoffset", v);
      core.setAttribute("stroke-dashoffset", v);
    },
  };
}

export interface TraceOptions {
  kind: WireKind;
  points: Point[];
  round?: number;
  /** Clip to the label plate, by a clipPath id. */
  clipId?: string;
}

/** ART-08 trace: only the line, under the plate's text, no halo; a hop, arrow or disc stays hidden. */
export function wireTrace(o: TraceOptions): SVGPathElement & { setDashOffset(u: number): void } {
  const p = s("path", {
    d: wireD(o.points, [], o.round ?? 0),
    fill: "none",
    stroke: colours.Ink,
    "stroke-opacity": n(1 - art.TraceLight),
    "stroke-width": art.TraceWidth,
    "stroke-linejoin": "round",
    "stroke-dasharray": o.kind === "data" ? null : `${art.DashLength} ${art.DashGap}`,
    "clip-path": o.clipId ? `url(#${o.clipId})` : null,
    "data-piece": "trace",
    "data-kind": o.kind,
  }) as SVGPathElement & { setDashOffset(u: number): void };
  p.setDashOffset = (u) => p.setAttribute("stroke-dashoffset", n(-u));
  return p;
}

/** The sign disc's size, for callers that place discs alone. */
export const SIGN_DISC = art.SignDiscSize * shared.JackMinSize;
