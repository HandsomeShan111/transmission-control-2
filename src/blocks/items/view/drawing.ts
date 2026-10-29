// ITEM-04 drawing: an item as its kind's body with its marks, built from the design system's pieces.
// Moving: the body 36 across with its latest MarksShown marks in a row under it, oldest first.
// In a result row: the body 44 across, then up to RowMarks tiles, 4 apart; more marks: the first, then one count tile.
import { art, boardLayout as B, colours, objects, shared, typeStacks } from "../../../platform/tokens";
import { itemBody, markTile, n, ring, ringRadiusFor, s, signDisc, type CodeMetrics, type ItemKind, type TileShape } from "../../../platform/pieces";

/** How a mark's tile looks: its code and its family's tile shape. The caller knows the mark's family. */
export type MarkLook = (mark: string) => { readonly code: string; readonly shape: TileShape };
export type DrawContext = { readonly look: MarkLook; readonly metrics: CodeMetrics };

const STEP = objects.MarkTileSize + B.TileGap;
/** A tile row's first centre, from the body's centre: half the body, the gap, half a tile. */
const rowStart = (body: number) => body / 2 + B.TileGap + objects.MarkTileSize / 2;

/** The count tile (ITEM-04): design silent on its look; a square tile with "+<count>". */
function countTile(count: number, ctx: DrawContext, cx: number, cy: number): SVGGElement {
  const t = markTile({ code: `+${count}`, shape: "square", metrics: ctx.metrics, cx, cy });
  t.setAttribute("data-count", String(count));
  return t;
}

/** A moving item, centred on 0,0: body 36 across, its latest MarksShown marks under it, oldest first. */
export function movingItem(kind: string, marks: readonly string[], ctx: DrawContext, rejected = false): SVGGElement {
  const size = B.MovingBodySize;
  const g = s("g", { "data-piece": "item", "data-kind": kind, "data-marks": marks.join(",") });
  g.append(itemBody({ kind: kind as ItemKind, size, cx: 0, cy: 0 }));
  const shown = marks.slice(-shared.MarksShown);
  const ty = size / 2 + B.TileGap + objects.MarkTileSize / 2;
  shown.forEach((m, i) => {
    const look = ctx.look(m);
    g.append(markTile({ code: look.code, shape: look.shape, metrics: ctx.metrics, cx: (i - (shown.length - 1) / 2) * STEP, cy: ty }));
  });
  if (rejected) g.append(rejectedSign(size, 2));
  return g;
}

/** ui/board.md: the rejected sign, a minus disc centred `inset` inside the body's top left corner. */
export function rejectedSign(body: number, inset: number): SVGGElement {
  const d = signDisc({ sign: "minus", ground: "verdict", cx: -body / 2 + inset, cy: -body / 2 + inset });
  d.setAttribute("data-part", "rejected-sign");
  return d;
}

/** ui/board.md: the arrival sign, centred on the top right corner of the result's body. */
export function arrivalSign(sign: "plus" | "minus"): SVGGElement {
  const b = B.RowBodySize;
  const d = signDisc({ sign, ground: "verdict", cx: b / 2, cy: -b / 2 });
  d.setAttribute("data-part", "arrival-sign");
  return d;
}

/** Where tile k of a row sits, from the body's centre. */
export function rowTileX(k: number): number {
  return rowStart(B.RowBodySize) + k * STEP;
}

/** One part of a result row, centred on its body: the body 44 across, then its marks (ITEM-04). */
export function rowItem(kind: string, marks: readonly string[], ctx: DrawContext, rejected = false, max: number = B.RowMarks): SVGGElement {
  const g = s("g", { "data-piece": "item", "data-kind": kind, "data-marks": marks.join(",") });
  g.append(itemBody({ kind: kind as ItemKind, size: B.RowBodySize, cx: 0, cy: 0 }));
  const over = marks.length > max;
  const plain = over ? marks.slice(0, max - 1) : marks;
  plain.forEach((m, i) => {
    const look = ctx.look(m);
    g.append(markTile({ code: look.code, shape: look.shape, metrics: ctx.metrics, cx: rowTileX(i), cy: 0 }));
  });
  if (over) g.append(countTile(marks.length - (max - 1), ctx, rowTileX(max - 1), 0));
  if (rejected) g.append(rejectedSign(B.RowBodySize, 4));
  return g;
}

/**
 * ITEM-04, REPORT-05: the tile places a result's first difference rings: the differing mark and the required one above it,
 * an extra mark, or the empty place of a missing mark. Null: marks equal (a wrong destination or a rejection rings nothing).
 * A difference among the marks a count tile stands for rings that tile.
 */
export function firstDifferencePlaces(marks: readonly string[], required: readonly string[]): { result: number; required: number | null } | null {
  const tile = (i: number) => Math.min(i, B.RowMarks - 1);
  for (let i = 0; i < Math.min(marks.length, required.length); i++) if (marks[i] !== required[i]) return { result: tile(i), required: tile(i) };
  if (marks.length > required.length) return { result: tile(required.length), required: null };
  if (marks.length < required.length) return { result: tile(marks.length), required: null };
  return null;
}

/** A Cream ring round a tile place, standing (the caller grows it: FEEL-07 DiffRingTime). */
export function tileRing(k: number): SVGGElement {
  const r = ring({ cx: rowTileX(k), cy: 0, r: ringRadiusFor(objects.MarkTileSize / 2), colour: "cream" });
  r.el.setAttribute("data-part", "difference-ring");
  return r.el;
}

/** ITEM-04 stamp on a row with no result: "STOPPED: <agent, or the input terminal>" or "LOST" (design silent on its look). */
export function rowStamp(text: string, size = 11): SVGGElement {
  const w = Math.ceil(text.length * size * 0.62) + 14;
  const hh = size + 10;
  return s(
    "g",
    { "data-part": "stamp", "data-text": text },
    s("rect", { x: n(-B.RowBodySize / 2), y: n(-hh / 2), width: n(w), height: n(hh), rx: 3, fill: colours.Ink, stroke: colours.Cream, "stroke-width": art.OutlineWeight }),
    s(
      "text",
      { x: n(-B.RowBodySize / 2 + w / 2), y: 0, "text-anchor": "middle", "dominant-baseline": "central", fill: colours.Cream, "font-family": typeStacks.SansStack, "font-weight": 700, "font-size": size },
      text,
    ),
  );
}
