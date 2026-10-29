// ART-07 terminals: a GraphiteLight panel with a Cream outline and an Ink
// header bar with a Cream label. Item slots are Ink squares. Sizes: ui/board.md
// (input terminal 100 wide, header 32, slots 44 square 4 apart; output terminal
// TerminalWidth wide, result rows 96 high, the foot row 62 only when used).
// Jacks stand outside the edge by half of JackMinSize and 3 more.
import { art, boardLayout as B, colours, shared, terminalWidth, typeStacks } from "../tokens";
import { n, s, type Point } from "./dom";
import { jack } from "./jack";

/** "landscape": the flow runs left to right; "portrait": top to bottom (BOARD-02). */
export type Flow = "landscape" | "portrait";

/** Header label size, board units (design silent; the previews use 12, bold). */
export const HEADER_LABEL_SIZE = 12;

export interface Terminal {
  el: SVGGElement;
  width: number;
  height: number;
  /** Centre of each item slot (input), or of each result row's required and result slots (output). */
  slots: Point[];
  required: Point[];
  /** The foot row's centre line, when shown. */
  foot: Point | null;
  /** Centre of the terminal's jack. */
  jackAt: Point;
}

function panel(x: number, y: number, w: number, hgt: number, label: string): SVGElement[] {
  const ow = art.OutlineWeight;
  return [
    s("rect", { x: n(x), y: n(y), width: n(w), height: n(hgt), rx: 4, fill: colours.GraphiteLight, stroke: colours.Cream, "stroke-width": ow, "data-part": "panel" }),
    s("rect", { x: n(x + ow / 2), y: n(y + ow / 2), width: n(w - ow), height: n(B.HeaderHeight - ow / 2), fill: colours.Ink, "data-part": "header" }),
    s(
      "text",
      {
        x: n(x + 8),
        y: n(y + B.HeaderHeight / 2),
        "dominant-baseline": "central",
        fill: colours.Cream,
        "font-family": typeStacks.SansStack,
        "font-weight": 700,
        "font-size": HEADER_LABEL_SIZE,
        "data-part": "label",
      },
      label,
    ),
  ];
}

const slotRect = (c: Point) =>
  s("rect", { x: n(c.x - B.SlotSize / 2), y: n(c.y - B.SlotSize / 2), width: B.SlotSize, height: B.SlotSize, fill: colours.Ink, "data-part": "slot" });

const jackOut = shared.JackMinSize / 2 + B.JackOut;

export interface InputTerminalOptions {
  label: string;
  items: number;
  flow: Flow;
  /** Top-left corner. */
  x?: number;
  y?: number;
}

export function inputTerminal(o: InputTerminalOptions): Terminal {
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  const w = B.InputTerminalWidth;
  const hgt = B.HeaderHeight + 4 + o.items * B.SlotSize + Math.max(0, o.items - 1) * B.SlotGap + 4;
  const slots = Array.from({ length: o.items }, (_, i) => ({
    x: x + 8 + B.SlotSize / 2,
    y: y + B.HeaderHeight + 4 + i * (B.SlotSize + B.SlotGap) + B.SlotSize / 2,
  }));
  const jackAt = o.flow === "landscape" ? { x: x + w + jackOut, y: y + hgt / 2 } : { x: x + w / 2, y: y + hgt + jackOut };
  const el = s("g", { "data-piece": "terminal", "data-kind": "input" }, ...panel(x, y, w, hgt, o.label), ...slots.map(slotRect));
  el.append(jack({ kind: "output", label: "OUT", cx: jackAt.x, cy: jackAt.y }));
  return { el, width: w, height: hgt, slots, required: [], foot: null, jackAt };
}

export interface OutputTerminalOptions {
  /** The destination, printed as its owner writes it (ART-03). */
  label: string;
  rows: number;
  /** The foot row of ITEM-04, only when used. */
  foot?: boolean;
  flow: Flow;
  x?: number;
  y?: number;
}

export function outputTerminal(o: OutputTerminalOptions): Terminal {
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  const w = terminalWidth();
  const body = B.HeaderHeight + o.rows * B.ResultRowHeight;
  const hgt = body + (o.foot ? B.FootRowHeight : 0);
  const pad = (B.ResultRowHeight - 2 * B.ResultPartHeight) / 2;
  const cx = x + 8 + B.RowBodySize / 2;
  const required = Array.from({ length: o.rows }, (_, i) => ({ x: cx, y: y + B.HeaderHeight + i * B.ResultRowHeight + pad + B.ResultPartHeight / 2 }));
  const slots = required.map((p) => ({ x: p.x, y: p.y + B.ResultPartHeight }));
  // Its input jack sits at the middle of its upstream edge without the foot row, and stays there when the foot row shows.
  const jackAt = o.flow === "landscape" ? { x: x - jackOut, y: y + body / 2 } : { x: x + w / 2, y: y - jackOut };
  const foot = o.foot ? { x: cx, y: y + body + B.FootRowHeight / 2 } : null;
  const el = s(
    "g",
    { "data-piece": "terminal", "data-kind": "output" },
    ...panel(x, y, w, hgt, o.label),
    ...required.map(slotRect),
    ...slots.map(slotRect),
  );
  if (foot) el.append(slotRect(foot));
  el.append(jack({ kind: "input", label: "IN", cx: jackAt.x, cy: jackAt.y }));
  return { el, width: w, height: hgt, slots, required, foot, jackAt };
}
