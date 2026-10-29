// Medal (owner's change; design silent): an achievement drawn flat, in the art's line style (ART-02): a ribbon of two tails
// above a disc, an Ink outline of OutlineWeight round each part, a family silhouette on the disc; its name under it, then a
// line in LabelSize. Earned: in full colour, on a GraphiteLight tile. Not earned: a dim GraphiteLight outline only, on an Ink tile
// with a dashed outline; its name and line stay Cream at full contrast. No opacity: the palette's colours only (ART-01).
// Medals stand in a grid as wide as a list row, as many to a row as fit.
import { art, colours } from "../tokens";
import { h, n, s } from "./dom";
import { silhouetteSvg, type SilhouetteName } from "./silhouette";

export type RibbonColour = "Orange" | "Teal" | "Cream";

export interface MedalOptions {
  name: string;
  /** Under the name, in LabelSize. */
  text: string;
  earned: boolean;
  silhouette: SilhouetteName;
  /** The ribbon's colour, earned. */
  ribbon: RibbonColour;
}

const W = 60;
const H = 76;
const DISC = { x: 30, y: 50, r: 23 };

/** The drawing: 60 by 76 units, the disc's centre 50 down. */
export function medalSvg(o: Pick<MedalOptions, "earned" | "silhouette" | "ribbon">): SVGSVGElement {
  const ow = art.OutlineWeight;
  const line = o.earned ? colours.Ink : colours.GraphiteLight;
  const paint = (fill: string) => ({
    fill: o.earned ? fill : "none",
    stroke: line,
    "stroke-width": n(ow),
    "stroke-linejoin": "round",
    "vector-effect": "non-scaling-stroke",
  });
  const g = s("g");
  // The ribbon's two tails cross behind the disc, its folds at the top.
  const ribbon = colours[o.ribbon];
  g.append(
    s("path", { d: "M12 2H26L40 40H26Z", ...paint(ribbon), "data-part": "ribbon" }),
    s("path", { d: "M48 2H34L20 40H34Z", ...paint(ribbon), "data-part": "ribbon" }),
    s("circle", { cx: DISC.x, cy: DISC.y, r: DISC.r, ...paint(colours.Mustard), "data-part": "disc" }),
    s("circle", { cx: DISC.x, cy: DISC.y, r: DISC.r - 6, ...paint(colours.Cream), "data-part": "face" }),
  );
  const size = 22;
  const sil = silhouetteSvg({ name: o.silhouette, size, solid: "ink", x: DISC.x - size / 2, y: DISC.y - size / 2 });
  if (!o.earned)
    for (const p of sil.querySelectorAll("path")) {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", colours.GraphiteLight);
      p.setAttribute("stroke-width", "2");
    }
  g.append(sil);
  return s("svg", { class: "tc-medalart", viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true", "data-part": "medal-art", overflow: "visible" }, g);
}

/** One medal: its drawing, its name, its line; its label names it and says whether it is earned. */
export function medal(o: MedalOptions): HTMLElement {
  const status = o.earned ? "earned" : "not earned";
  return h(
    "li",
    {
      class: `tc-medal${o.earned ? " tc-earned" : ""}`,
      "data-piece": "medal",
      "data-earned": String(o.earned),
      "aria-label": `${o.name}, ${status}. ${o.text}`,
    },
    medalSvg(o),
    h("span", { class: "tc-mname", "data-part": "medal-name" }, o.name),
    h("span", { class: "tc-sr" }, `, ${status}. `),
    h("span", { class: "tc-mtext", "data-part": "medal-text" }, o.text),
  );
}

/** Medals in a grid, as a list. */
export function medalGrid(medals: readonly HTMLElement[], label?: string): HTMLElement {
  return h("ul", { class: "tc-medals", "data-part": "medals", ...(label ? { "aria-label": label } : {}) }, ...medals);
}
