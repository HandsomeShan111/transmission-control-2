// Wire geometry on the board, in board units: routes, crossing hops, the ends a press holds (WIRE-01, WIRE-04).
// Pure: the board gives the jack places; nothing here draws.
import { art, boardLayout as B, columnGap } from "../../../platform/tokens";
import type { Wiring } from "../api";
import { endAt } from "../logic/wires";

export type Point = { readonly x: number; readonly y: number };
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type WireGeometry = {
  readonly flow: "landscape" | "portrait";
  /** Output jacks by wire name: "IN", "<agent>", "<agent> plus", ... */
  readonly outJacks: ReadonlyMap<string, Point>;
  /** Input ends by wire name: "<agent>" and "<destination>". */
  readonly inJacks: ReadonlyMap<string, Point>;
  /** Each agent's face, by label. */
  readonly faces: ReadonlyMap<string, Rect>;
  /** Each output terminal's panel, by destination: a drop there plugs into its jack. */
  readonly terminals: ReadonlyMap<string, Rect>;
  /** A jack plate's radius. */
  readonly jackRadius: number;
};

const SUFFIX = / (plus|minus|item|copy)$/;

/** The agent label an output jack belongs to; null for "IN". */
export function agentOf(from: string, g: WireGeometry): string | null {
  if (from === "IN") return null;
  if (g.faces.has(from)) return from;
  const base = from.replace(SUFFIX, "");
  return g.faces.has(base) ? base : null;
}

/** Corner radius of a wire run round its own face, or of a detour (design silent): 10. */
export const LOOP_ROUND = 10;

/** How far a wire's line keeps from a jack's plate or a face (design silent): its half width with its edges. */
const CLEAR = art.WireWidth / 2 + art.WireEdge;

/** Distance from p to segment ab. */
function segDist(a: Point, b: Point, p: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Whether segment ab enters rectangle r grown by pad on each side (Liang-Barsky). */
function segInRect(a: Point, b: Point, r: Rect, pad: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - (r.x - pad)], [dx, r.x + r.w + pad - a.x], [-dy, a.y - (r.y - pad)], [dy, r.y + r.h + pad - a.y]] as const) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 >= t1) return false;
  }
  return true;
}

/** WIRE-01: a route passes a jack the wire does not connect to, or a face: its own agents' faces it may only meet at its jacks. */
function passes(g: WireGeometry, from: string, to: string, pts: readonly Point[]): boolean {
  const jacks = [...[...g.outJacks].filter(([k]) => k !== from), ...[...g.inJacks].filter(([k]) => k !== to)].map(([, p]) => p);
  const own = agentOf(from, g);
  const faces = [...g.faces].map(([k, r]) => ({ r, pad: k === own || k === to ? 0 : CLEAR }));
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1]!;
    const b = pts[k]!;
    if (jacks.some((j) => segDist(a, b, j) < g.jackRadius + CLEAR)) return true;
    if (faces.some((f) => segInRect(a, b, f.r, f.pad))) return true;
  }
  return false;
}

/** Drops repeated points and the middle one of three on one level or upright line. */
function simplify(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (q && Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6) continue;
    const r = out[out.length - 2];
    if (q && r && ((Math.abs(r.x - q.x) < 1e-6 && Math.abs(q.x - p.x) < 1e-6) || (Math.abs(r.y - q.y) < 1e-6 && Math.abs(q.y - p.y) < 1e-6))) out.pop();
    out.push(p);
  }
  return out;
}

/** Whether a route runs along one already taken, closer than two wires' widths. */
function overlaps(pts: readonly Point[], taken: readonly (readonly Point[])[]): boolean {
  for (const other of taken)
    for (let k = 1; k < pts.length; k++)
      for (let j = 1; j < other.length; j++) {
        const a = pts[k - 1]!;
        const b = pts[k]!;
        const c = other[j - 1]!;
        const d = other[j]!;
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        const m = Math.hypot(d.x - c.x, d.y - c.y);
        if (!l || !m) continue;
        const ux = (b.x - a.x) / l;
        const uy = (b.y - a.y) / l;
        if (Math.abs(ux * (d.y - c.y) - uy * (d.x - c.x)) / m > 0.02) continue;
        if (Math.abs((c.x - a.x) * uy - (c.y - a.y) * ux) >= 4 * CLEAR) continue;
        const tc = (c.x - a.x) * ux + (c.y - a.y) * uy;
        const td = (d.x - a.x) * ux + (d.y - a.y) * uy;
        if (Math.min(l, Math.max(tc, td)) - Math.max(0, Math.min(tc, td)) > 1) return true;
      }
  return false;
}

/**
 * WIRE-01: a wire from its output jack's centre to its input end's centre. Straight where that passes no jack it does not
 * connect to, no other agent's face, and no face of its own agents but at its jacks. Else a detour (design silent on its
 * shape): it leaves its jack along the flow, turns across in the column gap, and enters its input end along the flow. To
 * the next column, one turn in the middle of the gap; else along a lane gap: the one nearest the straight line that is
 * clear, and runs along no wire in `taken`, if one does. Beyond the outer lanes, three tracks a LaneGap apart.
 * A wire from an agent to its own input runs round that agent's face: in landscape over its top, in portrait round its
 * downstream-right side, clear of its jacks, in the middle of the lane gap (design silent on the side).
 */
export function route(g: WireGeometry, from: string, to: string, taken: readonly (readonly Point[])[] = []): Point[] {
  const o = g.outJacks.get(from);
  const i = g.inJacks.get(to);
  if (!o || !i) throw new Error(`no jacks for wire ${from} → ${to}`);
  const a = agentOf(from, g);
  if (a === null || a !== to) return detour(g, from, to, o, i, taken);
  const r = g.faces.get(a)!;
  const clear = g.jackRadius + 8;
  if (g.flow === "landscape") {
    const top = r.y - 15;
    return [o, { x: r.x + r.w + clear, y: o.y }, { x: r.x + r.w + clear, y: top }, { x: r.x - clear, y: top }, { x: r.x - clear, y: i.y }, i];
  }
  const side = r.x + r.w + 22;
  return [o, { x: o.x, y: o.y + clear }, { x: side, y: o.y + clear }, { x: side, y: i.y - clear }, { x: i.x, y: i.y - clear }, i];
}

/** Each wire's route, in wire list order: each detour keeps off the lines of the earlier wires and of every loop, but those into its own end. */
export function routeWiring(g: WireGeometry, wiring: Wiring): Point[][] {
  const loops = wiring.map((w) => (agentOf(w.from, g) === w.to ? route(g, w.from, w.to) : null));
  const out: Point[][] = [];
  wiring.forEach((w, k) => out.push(loops[k] ?? route(g, w.from, w.to, wiring.flatMap((x, j) => (x.to === w.to ? [] : j < k ? [out[j]!] : loops[j] ? [loops[j]!] : [])))));
  return out;
}

function detour(g: WireGeometry, from: string, to: string, o: Point, i: Point, taken: readonly (readonly Point[])[]): Point[] {
  if (!passes(g, from, to, [o, i])) return [o, i];
  const land = g.flow === "landscape";
  const P = (along: number, across: number): Point => (land ? { x: along, y: across } : { x: across, y: along });
  const al = (p: Point) => (land ? p.x : p.y);
  const ac = (p: Point) => (land ? p.y : p.x);
  const cg = columnGap();
  const routes: Point[][] = [];
  if (Math.abs(al(i) - al(o) - cg) < 1) routes.push(simplify([o, P(al(o) + cg / 2, ac(o)), P(al(o) + cg / 2, ac(i)), i]));
  // Lane gaps: LaneGap/2 beyond each face's across edges; beyond the outer lanes, two more tracks.
  const lg = land ? B.LaneGapLandscape : B.LaneGapPortrait;
  const tracks = new Set<number>();
  for (const r of g.faces.values()) {
    const [lo, hi] = land ? [r.y, r.y + r.h] : [r.x, r.x + r.w];
    tracks.add(lo - lg / 2);
    tracks.add(hi + lg / 2);
  }
  const lo = Math.min(...tracks);
  const hi = Math.max(...tracks);
  for (const k of [1, 2]) tracks.add(lo - k * lg).add(hi + k * lg);
  const mid = (ac(o) + ac(i)) / 2;
  // Turns: 7/16 of ColumnGap after the output jack, or 5/16 for a wire back against the flow that does not pass its jack's
  // twin; else the other; 5/16 before the input end.
  const back = al(i) < al(o);
  const f = g.faces.get(agentOf(from, g) ?? "");
  const d = f ? ac(o) - (land ? f.y + f.h / 2 : f.x + f.w / 2) : 0;
  const a2 = al(i) - (5 * cg) / 16;
  for (const t of [...tracks].sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid) || p - q))
    for (const a1 of back && d * (t - ac(o)) >= 0 ? [(5 * cg) / 16, (7 * cg) / 16] : [(7 * cg) / 16, (5 * cg) / 16]) routes.push(simplify([o, P(al(o) + a1, ac(o)), P(al(o) + a1, t), P(a2, t), P(a2, ac(i)), i]));
  const clear = routes.filter((r) => !passes(g, from, to, r));
  return clear.find((r) => !overlaps(r, taken)) ?? clear[0] ?? routes[0]!;
}

function segCross(a: Point, b: Point, c: Point, d: Point): Point | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

const near = (p: Point, q: Point, d: number) => Math.hypot(p.x - q.x, p.y - q.y) < d;

/** WIRE-01: where two wires cross, the later one in the wire list hops. Crossings at a shared jack are none. */
export function hops(routes: readonly Point[][], index: number, clearance: number): Point[] {
  const mine = routes[index]!;
  const ends = (pts: readonly Point[]) => [pts[0]!, pts[pts.length - 1]!];
  const out: Point[] = [];
  for (let k = 0; k < index; k++) {
    const other = routes[k]!;
    for (let i = 1; i < mine.length; i++)
      for (let j = 1; j < other.length; j++) {
        const p = segCross(mine[i - 1]!, mine[i]!, other[j - 1]!, other[j]!);
        if (!p) continue;
        if ([...ends(mine), ...ends(other)].some((e) => near(p, e, clearance))) continue;
        out.push(p);
      }
  }
  return out;
}

export function length(pts: readonly Point[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return l;
}

/** The polyline from its start up to arc length `len`. */
export function cutAt(pts: readonly Point[], len: number): Point[] {
  const out: Point[] = [pts[0]!];
  let left = Math.max(0, len);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l >= left) {
      const f = l ? left / l : 0;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      return out;
    }
    out.push(b);
    left -= l;
  }
  return out;
}

/** Nearest point of a polyline to p: its distance and its arc length from the start. */
export function project(pts: readonly Point[], p: Point): { dist: number; at: number } {
  let best = { dist: Infinity, at: 0 };
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (l * l))) : 0;
    const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best.dist) best = { dist: d, at: run + t * l };
    run += l;
  }
  return best;
}

/** What a press on the board lands on, for the wires. */
export type Hit =
  | { readonly kind: "out"; readonly jack: string }
  | { readonly kind: "end"; readonly wire: number; readonly end: "from" | "to" }
  | { readonly kind: "none" };

export type Reach = {
  /** EndReach, board units: how far from a wire's line a press holds its end. */
  readonly reach: number;
  /** EndLength, board units: how far along from its jack's edge. */
  readonly length: number;
};

/** The output jack under a point, or null. */
export function outJackAt(g: WireGeometry, p: Point): string | null {
  let best: string | null = null;
  let bd = g.jackRadius;
  for (const [name, c] of g.outJacks) {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= bd) {
      bd = d;
      best = name;
    }
  }
  return best;
}

/** The input end under a point: an input jack, or an output terminal's jack or panel (design silent: the whole panel takes a drop). */
export function inEndAt(g: WireGeometry, p: Point, panels = true): string | null {
  let best: string | null = null;
  let bd = g.jackRadius;
  for (const [name, c] of g.inJacks) {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= bd) {
      bd = d;
      best = name;
    }
  }
  if (best || !panels) return best;
  for (const [name, r] of g.terminals) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return name;
  return null;
}

/**
 * WIRE-02, WIRE-04: a press on an output jack holds a new wire. Else an end is held by a press within reach of a wire's
 * line, up to length from its jack's edge, or by a press on an input jack or output terminal's jack where it ends; several
 * ends there, the last in the wire list; both ends of one wire in reach, the nearer; several lines in reach, the nearest.
 */
export function hitAt(g: WireGeometry, wiring: Wiring, routes: readonly Point[][], p: Point, r: Reach): Hit {
  const jack = outJackAt(g, p);
  if (jack) return { kind: "out", jack };
  const at = inEndAt(g, p, false);
  const i = at ? endAt(wiring, at) : -1;
  if (i >= 0) return { kind: "end", wire: i, end: "to" };
  // Design silent: a press in reach of several wires' lines holds the nearest line's end; at equal distance, the last in the list.
  let hit: Hit = { kind: "none" };
  let bd = Infinity;
  for (let i = wiring.length - 1; i >= 0; i--) {
    const pts = routes[i]!;
    const total = length(pts);
    const pr = project(pts, p);
    if (pr.dist > r.reach || pr.dist >= bd) continue;
    const fromStart = pr.at;
    const fromEnd = total - pr.at;
    const inFrom = fromStart >= g.jackRadius && fromStart <= g.jackRadius + r.length;
    const inTo = fromEnd >= g.jackRadius && fromEnd <= g.jackRadius + r.length;
    if (!inFrom && !inTo) continue;
    bd = pr.dist;
    hit = { kind: "end", wire: i, end: inFrom && inTo ? (fromStart <= fromEnd ? "from" : "to") : inFrom ? "from" : "to" };
  }
  return hit;
}

/** FEEL-01: jacks and terminals that take a held wire, nearest the held jack first; ties in column, then lane order. */
export function nearestFirst(from: Point, targets: readonly { name: string; at: Point; order: number }[]): string[] {
  return [...targets]
    .map((t) => ({ ...t, d: Math.hypot(t.at.x - from.x, t.at.y - from.y) }))
    .sort((a, b) => a.d - b.d || a.order - b.order)
    .map((t) => t.name);
}
