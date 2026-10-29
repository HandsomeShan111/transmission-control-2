// ART-13 signs: a stroke of OutlineWeight, Ink. On a round part a minus is one
// stroke through its centre, SignSpan of its diameter long; a plus adds the same
// stroke upright. Plus is Teal, minus Orange.
import { art, colours, shared } from "../tokens";
import { n, s } from "./dom";

export type Sign = "plus" | "minus";

export const SIGN_COLOUR: Record<Sign, string> = { plus: colours.Teal, minus: colours.Orange };

/** The sign's strokes, centred on 0,0, for a round part of this diameter. */
export function signD(sign: Sign, diameter: number): string {
  const r = (art.SignSpan * diameter) / 2;
  const minus = `M${n(-r)} 0H${n(r)}`;
  return sign === "plus" ? `${minus}M0 ${n(-r)}V${n(r)}` : minus;
}

export function signPath(sign: Sign, diameter: number): SVGPathElement {
  return s("path", {
    d: signD(sign, diameter),
    fill: "none",
    stroke: colours.Ink,
    "stroke-width": art.OutlineWeight,
    "data-part": "sign",
    "data-sign": sign,
  });
}

export interface SignDiscOptions {
  sign: Sign;
  /** "cream": a feedback wire's disc (ART-08); "verdict": an arrival or rejected sign in the plus or minus colour (ui/board.md). */
  ground: "cream" | "verdict";
  cx?: number;
  cy?: number;
  /** Across, board units. Default SignDiscSize of JackMinSize. */
  diameter?: number;
}

/** A sign disc: a round plate with its Ink outline and Ink sign. */
export function signDisc(o: SignDiscOptions): SVGGElement {
  const d = o.diameter ?? art.SignDiscSize * shared.JackMinSize;
  const fill = o.ground === "cream" ? colours.Cream : SIGN_COLOUR[o.sign];
  return s(
    "g",
    { "data-piece": "sign-disc", "data-sign": o.sign, transform: `translate(${n(o.cx ?? 0)} ${n(o.cy ?? 0)})` },
    s("circle", { r: n(d / 2 - art.OutlineWeight / 2), fill, stroke: colours.Ink, "stroke-width": art.OutlineWeight }),
    signPath(o.sign, d),
  );
}
