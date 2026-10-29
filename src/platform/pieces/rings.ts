// ART-15 rings: a flat ring of OutlineWeight with an Ink edge of WireEdge on
// each side. A jack or terminal that takes a held wire shows a blinking Mustard
// ring (LitBlinkTime, the first blinks LitStagger apart, FEEL-01); in standby
// the same ring blinks on the run switch (FEEL-12). Every other ring is Cream:
// seat, jack pulse, lamp, par and first-difference rings, which grow RingGrow
// past their part's rim and fade over RingTime (FEEL-02, FEEL-05).
import { art, colours, feel } from "../tokens";
import { n, s } from "./dom";
import { tween, type Motion } from "../motion";

export type RingColour = "cream" | "mustard";

export interface RingOptions {
  cx?: number;
  cy?: number;
  /** Radius to the ring's centre line. */
  r: number;
  colour: RingColour;
  /** Blinks with LitBlinkTime; `delay` seconds before its first blink. */
  blink?: boolean;
  delay?: number;
}

export interface Ring {
  el: SVGGElement;
  setRadius(r: number): void;
}

export function ring(o: RingOptions): Ring {
  const at = { cx: n(o.cx ?? 0), cy: n(o.cy ?? 0), r: n(o.r), fill: "none" };
  const edge = s("circle", { ...at, stroke: colours.Ink, "stroke-width": art.OutlineWeight + 2 * art.WireEdge, "data-part": "ring-edge" });
  const core = s("circle", { ...at, stroke: o.colour === "cream" ? colours.Cream : colours.Mustard, "stroke-width": art.OutlineWeight, "data-part": "ring" });
  const el = s("g", { "data-piece": "ring", "data-colour": o.colour }, edge, core);
  if (o.blink) {
    el.setAttribute("class", "tc-blink");
    el.style.animationDelay = `${o.delay ?? 0}s`;
  }
  return {
    el,
    setRadius(r) {
      edge.setAttribute("r", n(r));
      core.setAttribute("r", n(r));
    },
  };
}

/** The radius a ring stands at round a part of this rim radius: clear of the rim by its edge. */
export function ringRadiusFor(rim: number): number {
  return rim + art.OutlineWeight / 2 + art.WireEdge;
}

/** A Cream ring that grows RingGrow of the part's width past its rim and fades, over RingTime. Removes itself at the end. */
export function growRing(parent: SVGElement, cx: number, cy: number, rim: number, duration: number = feel.RingTime): Motion {
  const r0 = ringRadiusFor(rim);
  const r1 = r0 + feel.RingGrow * 2 * rim;
  const g = ring({ cx, cy, r: r0, colour: "cream" });
  parent.append(g.el);
  return tween({
    duration,
    update: (p) => {
      g.setRadius(r0 + (r1 - r0) * p);
      g.el.setAttribute("opacity", n(1 - p));
    },
    end: () => g.el.remove(),
  });
}
