// WIRE-01 on the real boards: a wire that passes an agent never reads as one through it.
import { expect, test } from "bun:test";
import { orders } from "../../orders/api";
import { inEnds, outJacks, route, routeWiring, type BoardPoint as Point, type BoardRect as Rect } from "../../wires/api";
import { TEST_WIRINGS } from "../../../testbuild/wirings.gen";
import { boardLayout as B } from "../../../platform/tokens";
import { layout, wireGeometry } from "../logic/layout";

const SUFFIX = / (plus|minus|item|copy)$/;

function segDist(a: Point, b: Point, p: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Whether segment ab enters the inside of r (touching its edge is not entering). */
function enters(a: Point, b: Point, r: Rect): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
  for (let k = 0; k <= n; k++) {
    const x = a.x + ((b.x - a.x) * k) / n;
    const y = a.y + ((b.y - a.y) * k) / n;
    if (x > r.x + 0.5 && x < r.x + r.w - 0.5 && y > r.y + 0.5 && y < r.y + r.h - 0.5) return true;
  }
  return false;
}

/** The faults of one route: jacks it does not connect to within a jack's radius, label plates it crosses. */
function faults(g: ReturnType<typeof wireGeometry>, from: string, to: string, pts: readonly Point[]): string[] {
  const out: string[] = [];
  const jacks = [...[...g.outJacks].filter(([k]) => k !== from), ...[...g.inJacks].filter(([k]) => k !== to)];
  for (const [name, j] of jacks) if (pts.some((p, k) => k > 0 && segDist(pts[k - 1]!, p, j) <= g.jackRadius)) out.push(`jack ${name}`);
  // Every label plate: of an agent it does not connect to, and of its own agents too but where it meets their jacks.
  for (const [label, f] of g.faces) {
    const plate = { x: f.x, y: f.y + B.BandHeight, w: f.w, h: f.h - B.BandHeight };
    if (pts.some((p, k) => k > 0 && enters(pts[k - 1]!, p, plate))) out.push(`plate ${label}${label === from.replace(SUFFIX, "") || label === to ? " (own)" : ""}`);
  }
  return out;
}

test("WIRE-01: every wire on every board keeps off the jacks it does not connect to and off every label plate", () => {
  const bad: string[] = [];
  for (const o of orders())
    for (const flow of ["landscape", "portrait"] as const) {
      const g = wireGeometry(layout(o, flow));
      for (const from of outJacks(o))
        for (const to of inEnds(o)) for (const f of faults(g, from, to, route(g, from, to))) bad.push(`${o.n} ${flow} ${from} → ${to}: ${f}`);
    }
  expect(bad).toEqual([]);
});

test("WIRE-01: in the openings and the test wirings, wires keep off each other's jacks and plates, and no two to different ends run along each other", () => {
  const bad: string[] = [];
  for (const o of orders()) {
    const sets = [o.opening ?? [], ...(TEST_WIRINGS.find((t) => t.order === o.n)?.wirings.map((w) => w.wires) ?? [])];
    for (const flow of ["landscape", "portrait"] as const) {
      const g = wireGeometry(layout(o, flow));
      for (const ws of sets) {
        const rs = routeWiring(g, ws);
        ws.forEach((w, i) => {
          for (const f of faults(g, w.from, w.to, rs[i]!)) bad.push(`${o.n} ${flow} ${w.from} → ${w.to}: ${f}`);
          for (let j = 0; j < i; j++) if (ws[j]!.to !== w.to && alongside(rs[i]!, rs[j]!)) bad.push(`${o.n} ${flow} ${w.from} → ${w.to} runs along ${ws[j]!.from} → ${ws[j]!.to}`);
        });
      }
    }
  }
  expect(bad).toEqual([]);
});

/** Two routes share a stretch: parallel segments within a wire's width (8) of each other, overlapping more than 2. */
function alongside(p: readonly Point[], q: readonly Point[]): boolean {
  for (let k = 1; k < p.length; k++)
    for (let j = 1; j < q.length; j++) {
      const a = p[k - 1]!;
      const b = p[k]!;
      const c = q[j - 1]!;
      const d = q[j]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / l;
      const uy = (b.y - a.y) / l;
      const off = (s: Point) => Math.abs((s.x - a.x) * uy - (s.y - a.y) * ux);
      if (off(c) > 8 || off(d) > 8) continue;
      const tc = (c.x - a.x) * ux + (c.y - a.y) * uy;
      const td = (d.x - a.x) * ux + (d.y - a.y) * uy;
      if (Math.min(l, Math.max(tc, td)) - Math.max(0, Math.min(tc, td)) > 2) return true;
    }
  return false;
}
