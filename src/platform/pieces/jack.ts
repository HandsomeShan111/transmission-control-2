// ART-07 jacks: a round plate JackMinSize across with a centred label.
// Output jack: Ink plate, Cream label. Input jack: Cream plate, Ink label.
// Plus and minus jacks: a plate in the plus or minus colour with its Ink sign.
// Labels print in capitals (ART-03). Outline per ART-02.
import { art, colours, shared, typeStacks } from "../tokens";
import { n, s } from "./dom";
import { SIGN_COLOUR, signPath } from "./sign";

export type JackKind = "output" | "input" | "plus" | "minus";

/** Jack label size, board units (design silent): 11, bold, so COPY and ITEM sit inside the plate. */
export const JACK_LABEL_SIZE = 11;

export interface JackOptions {
  kind: JackKind;
  /** IN, OUT, ITEM, COPY; plus and minus jacks carry their sign instead. */
  label?: string;
  cx?: number;
  cy?: number;
}

export function jackColours(kind: JackKind): { plate: string; outline: string; label: string } {
  switch (kind) {
    case "output":
      return { plate: colours.Ink, outline: colours.Cream, label: colours.Cream };
    case "input":
      return { plate: colours.Cream, outline: colours.Ink, label: colours.Ink };
    case "plus":
    case "minus":
      return { plate: SIGN_COLOUR[kind], outline: colours.Ink, label: colours.Ink };
  }
}

export function jack(o: JackOptions): SVGGElement {
  const d = shared.JackMinSize;
  const c = jackColours(o.kind);
  const g = s("g", {
    "data-piece": "jack",
    "data-kind": o.kind,
    transform: `translate(${n(o.cx ?? 0)} ${n(o.cy ?? 0)})`,
  });
  g.append(s("circle", { r: n(d / 2 - art.OutlineWeight / 2), fill: c.plate, stroke: c.outline, "stroke-width": art.OutlineWeight, "data-part": "plate" }));
  if (o.kind === "plus" || o.kind === "minus") {
    g.append(signPath(o.kind, d));
  } else {
    const label = (o.label ?? (o.kind === "output" ? "OUT" : "IN")).toUpperCase();
    g.append(
      s(
        "text",
        {
          x: 0,
          y: 0,
          "text-anchor": "middle",
          "dominant-baseline": "central",
          fill: c.label,
          "font-family": typeStacks.SansStack,
          "font-weight": 700,
          "font-size": JACK_LABEL_SIZE,
          "data-part": "label",
        },
        label,
      ),
    );
  }
  return g;
}
