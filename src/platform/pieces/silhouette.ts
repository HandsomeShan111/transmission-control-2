// Family silhouettes (ART-09): one outline per family, from its `silhouette`
// field (data.md, Agent families). On a face's band and an act heading: solid
// Cream with Ink detail lines. On a memo's stamp (ART-12): solid Ink with Cream
// detail lines. Each reads solid at the smallest zoom. No family colour.
import { colours } from "../tokens";
import { n, s } from "./dom";

export const SILHOUETTES = ["filing cabinet", "teletype", "oven", "crane", "ledger desk", "launch tube"] as const;
export type SilhouetteName = (typeof SILHOUETTES)[number];

const BOX = 34;
const DETAIL = 2;

type Shape = { solid: string[]; detail: string[] };

/** Path data in a 34 x 34 box: the solid outline, then the detail lines. */
const SHAPES: Record<SilhouetteName, Shape> = {
  "filing cabinet": {
    solid: ["M6 2h22v30h-22z"],
    detail: ["M6 12h22M6 22h22", "M14 7h6M14 17h6M14 27h6"],
  },
  teletype: {
    solid: ["M10 2h14v12h-14z", "M2 13h30v17h-30z"],
    detail: ["M13 6h8M13 10h8", "M6 19h22M6 24h22"],
  },
  oven: {
    solid: ["M3 3h28v28h-28z"],
    detail: ["M8 14h18v12h-18z", "M3 10h28", "M8 6.5h2M16 6.5h2M24 6.5h2"],
  },
  crane: {
    solid: ["M4 32V2h8v30z", "M4 2H33v7H12z", "M2 28h12v4H2z", "M28 9h2v8h-2z", "M25 17h8v7h-8z"],
    detail: ["M5 9l6 7M11 16l-6 7"],
  },
  "ledger desk": {
    solid: ["M2 13L32 7v7l-3 5H5z", "M7 19h4v13H7z", "M24 19h4v13h-4z"],
    detail: ["M9 13.5l9-1.7M18 11.8l9-1.7", "M17.5 11.8v4"],
  },
  "launch tube": {
    solid: ["M11 10h12v22H11z", "M11 11L17 1l6 10z", "M11 25l-6 7h6zM23 25l6 7h-6z"],
    detail: ["M11 16h12", "M14 22h6"],
  },
};

export interface SilhouetteOptions {
  name: SilhouetteName;
  /** Across, in the parent's units; 0 leaves the size to CSS. */
  size: number;
  /** "cream": solid Cream with Ink lines; "ink": solid Ink with Cream lines. */
  solid: "cream" | "ink";
  x?: number;
  y?: number;
  /** An Ink halo this wide round the silhouette, in the parent's units (ART-09 over a wire). */
  halo?: number;
}

export function silhouetteSvg(o: SilhouetteOptions): SVGSVGElement {
  const shape = SHAPES[o.name];
  if (!shape) throw new Error(`no silhouette ${o.name}`);
  const fill = o.solid === "cream" ? colours.Cream : colours.Ink;
  const line = o.solid === "cream" ? colours.Ink : colours.Cream;
  const svg = s("svg", {
    viewBox: `0 0 ${BOX} ${BOX}`,
    "data-piece": "silhouette",
    "data-silhouette": o.name,
    "aria-hidden": "true",
    overflow: "visible",
  });
  if (o.size) {
    svg.setAttribute("width", n(o.size));
    svg.setAttribute("height", n(o.size));
  }
  if (o.x !== undefined) svg.setAttribute("x", n(o.x));
  if (o.y !== undefined) svg.setAttribute("y", n(o.y));
  if (o.halo && o.size) {
    const w = (2 * o.halo * BOX) / o.size;
    for (const d of shape.solid)
      svg.append(s("path", { d, fill: colours.Ink, stroke: colours.Ink, "stroke-width": n(w), "stroke-linejoin": "round", "data-part": "halo" }));
  }
  for (const d of shape.solid) svg.append(s("path", { d, fill, "data-part": "solid" }));
  for (const d of shape.detail)
    svg.append(s("path", { d, fill: "none", stroke: line, "stroke-width": DETAIL, "stroke-linecap": "square", "data-part": "detail" }));
  return svg;
}
