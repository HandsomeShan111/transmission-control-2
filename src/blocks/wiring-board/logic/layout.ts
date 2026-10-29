// Where each part of an order sits on the board, in board units (BOARD-01, BOARD-02, ui/board.md Layout).
// One board unit is one CSS pixel at the smallest zoom, where a jack shows at JackMinSize.
// "Along" and "across" are the flow's: landscape, x along and y across; portrait, y along and x across.
// Faces and terminals stay upright, so their width and height are the screen's.
import { agent } from "../../agents/api";
import type { Order } from "../../orders/api";
import type { WireGeometry } from "../../wires/api";
import { art, boardLayout as B, columnGap, shared, terminalWidth } from "../../../platform/tokens";

export type Flow = "landscape" | "portrait";
export type Point = { readonly x: number; readonly y: number };
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type FaceJackName = "in" | "out" | "plus" | "minus" | "item" | "copy";

export type FacePlace = {
  readonly label: string;
  readonly name: string;
  readonly role: "worker" | "checker" | "copier";
  readonly col: number;
  readonly lane: number;
  readonly centre: Point;
  readonly rect: Rect;
  /** Each jack's centre, by the face piece's names. */
  readonly jacks: Readonly<Partial<Record<FaceJackName, Point>>>;
};

/** One result row of an output terminal: the item it must receive (ITEM-04). */
export type ResultRow = {
  /** Item id: "<place>" or "<place>.<copy>". */
  readonly item: string;
  readonly place: number;
  readonly copy: number;
  /** Centre of the required output's body, and of the result's body under it. */
  readonly required: Point;
  readonly result: Point;
};

export type TerminalPlace = {
  readonly destination: string;
  /** The panel without the foot row. */
  readonly rect: Rect;
  readonly jack: Point;
  readonly rows: readonly ResultRow[];
};

export type Layout = {
  readonly order: number;
  readonly flow: Flow;
  readonly input: { readonly rect: Rect; readonly jack: Point; readonly slots: readonly Point[] };
  readonly faces: readonly FacePlace[];
  readonly outputs: readonly TerminalPlace[];
  readonly alarm: Point;
  /** The lit alarm lamp's outer ring radius. */
  readonly alarmRadius: number;
  /** BOARD-01: the smallest rectangle round the terminals, agents and the lit alarm lamp, jacks included. The extent adds
   *  BoardMargin, CSS pixels on screen, beyond it on each side: see camera.ts. */
  readonly bounds: Rect;
  /** Output jacks as wires name them: "IN", "<agent>", "<agent> plus", "<agent> item", ... */
  readonly outJacks: ReadonlyMap<string, Point>;
  /** Input ends as wires name them: "<agent>" (its input jack) and "<destination>" (its terminal's jack). */
  readonly inJacks: ReadonlyMap<string, Point>;
};

const JR = shared.JackMinSize / 2;
/** Jacks outside an edge: half of JackMinSize and 3 more (ui/board.md). */
const JACK_OUT = JR + B.JackOut;
/** Two output jacks: centre to centre, a jack and the 6 between. */
const PAIR = JR + B.OutputJackGap / 2;

/** Lit alarm lamp: its lens, then two rings of OutlineWeight with a gap of OutlineWeight (ART-06). */
export const ALARM_RADIUS = (art.AlarmLampSize * shared.JackMinSize) / 2 + 4 * art.OutlineWeight;

export function colStep(flow: Flow): number {
  return flow === "landscape" ? B.FaceWidth + columnGap() : B.FaceHeight + 2 * JACK_OUT + columnGap();
}

export function laneStep(flow: Flow): number {
  return flow === "landscape" ? B.FaceHeight + B.LaneGapLandscape : B.FaceWidth + B.LaneGapPortrait;
}

export function inputTerminalHeight(items: number): number {
  return B.HeaderHeight + 4 + items * B.SlotSize + Math.max(0, items - 1) * B.SlotGap + 4;
}

/** ITEM-04 rows of a destination: batch order, each named copy right under its original when both go there. */
export function rowsFor(order: Order, destination: string): { item: string; place: number; copy: number }[] {
  const rows: { item: string; place: number; copy: number }[] = [];
  order.batch.forEach((b, i) => {
    const place = i + 1;
    if (b.required.destination === destination) rows.push({ item: `${place}`, place, copy: 0 });
    for (const c of b.copies) if (c.required.destination === destination) rows.push({ item: `${place}.${c.n}`, place, copy: c.n });
  });
  return rows;
}

function faceJacks(role: FacePlace["role"], flow: Flow, c: Point): Partial<Record<FaceJackName, Point>> {
  const land = flow === "landscape";
  const FW = B.FaceWidth;
  const FH = B.FaceHeight;
  const out = (k: number): Point => (land ? { x: c.x + FW / 2, y: c.y + k * PAIR } : { x: c.x + k * PAIR, y: c.y + FH / 2 + JACK_OUT });
  const j: Partial<Record<FaceJackName, Point>> = { in: land ? { x: c.x - FW / 2, y: c.y } : { x: c.x, y: c.y - FH / 2 - JACK_OUT } };
  if (role === "worker") j.out = out(0);
  if (role === "checker") Object.assign(j, { plus: out(-1), minus: out(1) });
  if (role === "copier") Object.assign(j, { item: out(-1), copy: out(1) });
  return j;
}

const union = (rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
const circleRect = (p: Point, r: number): Rect => ({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r });

export function layout(order: Order, flow: Flow): Layout {
  const land = flow === "landscape";
  const P = (along: number, across: number): Point => (land ? { x: along, y: across } : { x: across, y: along });
  const alongOf = (p: Point) => (land ? p.x : p.y);
  const cs = colStep(flow);
  const ls = laneStep(flow);
  const lanes = Math.max(...order.agents.map((a) => a.lane)) + 1;
  const acrossMid = ((lanes - 1) * ls) / 2;

  const faces: FacePlace[] = order.agents.map((a) => {
    const role = agent(a.name).role;
    const centre = P((a.col - 1) * cs, a.lane * ls);
    return {
      label: a.label,
      name: a.name,
      role,
      col: a.col,
      lane: a.lane,
      centre,
      rect: { x: centre.x - B.FaceWidth / 2, y: centre.y - B.FaceHeight / 2, w: B.FaceWidth, h: B.FaceHeight },
      jacks: faceJacks(role, flow, centre),
    };
  });

  // Input terminal: centred across the lanes; its jack ColumnGap along from the first column's input jacks.
  const firstIn = Math.min(...faces.filter((f) => f.col === Math.min(...faces.map((g) => g.col))).map((f) => alongOf(f.jacks.in!)));
  const inJackAlong = firstIn - columnGap();
  const inH = inputTerminalHeight(order.batch.length);
  const inW = B.InputTerminalWidth;
  const inRect: Rect = land
    ? { x: inJackAlong - JACK_OUT - inW, y: acrossMid - inH / 2, w: inW, h: inH }
    : { x: acrossMid - inW / 2, y: inJackAlong - JACK_OUT - inH, w: inW, h: inH };
  const inJack = P(inJackAlong, acrossMid);
  const slots = order.batch.map((_, i) => ({
    x: inRect.x + 8 + B.SlotSize / 2,
    y: inRect.y + B.HeaderHeight + 4 + i * (B.SlotSize + B.SlotGap) + B.SlotSize / 2,
  }));

  // Output terminals: their upstream edges in line, their jacks ColumnGap along from the last column's output jacks;
  // in lane order, TerminalGap apart across, the group centred across the lanes (design silent on the group's place).
  const lastCol = Math.max(...faces.map((f) => f.col));
  const lastOut = Math.max(
    ...faces.filter((f) => f.col === lastCol).flatMap((f) => (["out", "plus", "minus", "item", "copy"] as const).flatMap((k) => (f.jacks[k] ? [alongOf(f.jacks[k]!)] : []))),
  );
  const outJackAlong = lastOut + columnGap();
  const tw = terminalWidth();
  const specs = order.destinations.map((d) => {
    const rows = rowsFor(order, d);
    const bodyH = B.HeaderHeight + rows.length * B.ResultRowHeight;
    return { d, rows, bodyH, across: land ? bodyH : tw };
  });
  const groupAcross = specs.reduce((t, s) => t + s.across, 0) + Math.max(0, specs.length - 1) * B.TerminalGap;
  let at = acrossMid - groupAcross / 2;
  const pad = (B.ResultRowHeight - 2 * B.ResultPartHeight) / 2;
  const outputs: TerminalPlace[] = specs.map((s) => {
    const rect: Rect = land ? { x: outJackAlong + JACK_OUT, y: at, w: tw, h: s.bodyH } : { x: at, y: outJackAlong + JACK_OUT, w: tw, h: s.bodyH };
    at += s.across + B.TerminalGap;
    const jack = land ? { x: rect.x - JACK_OUT, y: rect.y + s.bodyH / 2 } : { x: rect.x + tw / 2, y: rect.y - JACK_OUT };
    const cx = rect.x + 8 + B.RowBodySize / 2;
    const rows = s.rows.map((r, i) => {
      const ry = rect.y + B.HeaderHeight + i * B.ResultRowHeight + pad + B.ResultPartHeight / 2;
      return { ...r, required: { x: cx, y: ry }, result: { x: cx, y: ry + B.ResultPartHeight } };
    });
    return { destination: s.d, rect, jack, rows };
  });

  // Master alarm lamp: before the first output terminal across, its centre JackMinSize from that terminal's edge.
  // Landscape: centred on the terminal's width; portrait: level with its header bar.
  const t0 = outputs[0]!.rect;
  const alarm = land ? { x: t0.x + t0.w / 2, y: t0.y - shared.JackMinSize } : { x: t0.x - shared.JackMinSize, y: t0.y + B.HeaderHeight / 2 };

  const outJacks = new Map<string, Point>([["IN", inJack]]);
  const inJacks = new Map<string, Point>();
  for (const f of faces) {
    inJacks.set(f.label, f.jacks.in!);
    if (f.jacks.out) outJacks.set(f.label, f.jacks.out);
    for (const k of ["plus", "minus", "item", "copy"] as const) if (f.jacks[k]) outJacks.set(`${f.label} ${k}`, f.jacks[k]!);
  }
  for (const t of outputs) inJacks.set(t.destination, t.jack);

  const parts = [
    inRect,
    circleRect(inJack, JR),
    ...faces.flatMap((f) => [f.rect, ...Object.values(f.jacks).map((p) => circleRect(p, JR))]),
    ...outputs.flatMap((t) => [t.rect, circleRect(t.jack, JR)]),
    circleRect(alarm, ALARM_RADIUS),
  ];
  const bounds = union(parts);
  return { order: order.n, flow, input: { rect: inRect, jack: inJack, slots }, faces, outputs, alarm, alarmRadius: ALARM_RADIUS, bounds, outJacks, inJacks };
}

/** What the wires route by (WIRE-01): the jacks, the faces and the output terminals. */
export function wireGeometry(l: Layout): WireGeometry {
  return {
    flow: l.flow,
    outJacks: l.outJacks,
    inJacks: l.inJacks,
    faces: new Map(l.faces.map((f) => [f.label, f.rect])),
    terminals: new Map(l.outputs.map((t) => [t.destination, t.rect])),
    jackRadius: JR,
  };
}

/** The output jack name a face jack carries in the wire list (wires' notation). */
export function jackName(label: string, jack: FaceJackName): string {
  return jack === "out" ? label : jack === "in" ? label : `${label} ${jack}`;
}
