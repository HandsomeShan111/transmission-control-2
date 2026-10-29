// ART-05 lamps: one round lens of LampSize with an outline, in four states.
// Off: Graphite. Steady: Mustard. Plus: Teal with an Ink plus. Minus: Orange
// with an Ink minus. Outline per ART-02: Cream on Graphite, Ink on the others.
// The lens lights over LampRiseTime and goes off over LampFallTime (FEEL-05).
import { art, colours, feelRun, shared } from "../tokens";
import { h, n, s } from "./dom";
import { signD } from "./sign";

export type LampState = "off" | "steady" | "plus" | "minus";

const FILL: Record<LampState, string> = {
  off: colours.Graphite,
  steady: colours.Mustard,
  plus: colours.Teal,
  minus: colours.Orange,
};

/** The lens's fill and outline for a state (ART-02 outline rule). */
export function lampColours(state: LampState): { fill: string; outline: string } {
  return { fill: FILL[state], outline: state === "off" ? colours.Cream : colours.Ink };
}

export interface LampLens {
  el: SVGGElement;
  set(state: LampState): void;
  readonly state: LampState;
}

/** A lens in board units (on a face), centred on cx, cy. */
export function lampLens(o: { state?: LampState; cx?: number; cy?: number; diameter?: number }): LampLens {
  const d = o.diameter ?? art.LampSize * shared.JackMinSize;
  const circle = s("circle", { r: n(d / 2 - art.OutlineWeight / 2), "stroke-width": art.OutlineWeight, "data-part": "lens" });
  const sign = s("path", { fill: "none", stroke: colours.Ink, "stroke-width": art.OutlineWeight, "data-part": "sign" });
  const el = s("g", { "data-piece": "lamp", transform: `translate(${n(o.cx ?? 0)} ${n(o.cy ?? 0)})` }, circle, sign);
  let state: LampState = "off";
  const lens: LampLens = {
    el,
    set(st) {
      const lit = st !== "off";
      const c = lampColours(st);
      circle.style.transition = lit ? `fill ${feelRun.LampRiseTime}s linear` : `fill ${feelRun.LampFallTime}s ease-out`;
      circle.style.fill = c.fill;
      circle.style.stroke = c.outline;
      if (st === "plus" || st === "minus") {
        sign.setAttribute("d", signD(st, d));
        sign.setAttribute("data-sign", st);
        sign.style.display = "";
      } else {
        sign.removeAttribute("d");
        sign.style.display = "none";
      }
      el.setAttribute("data-state", st);
      state = st;
    },
    get state() {
      return state;
    },
  };
  lens.set(o.state ?? "off");
  return lens;
}

export interface Lamp {
  el: HTMLSpanElement;
  set(state: LampState): void;
  readonly state: LampState;
}

/**
 * A lamp in a bar or a row (ui/style.md Lamp): the lens, then its label of
 * LabelSize, Cream on the frame, Ink on a Cream row. The AUDIO lamp has none.
 */
export function lamp(o: { state?: LampState; label?: string; onCream?: boolean }): Lamp {
  const d = art.LampSize * shared.JackMinSize;
  const lens = lampLens({ cx: d / 2, cy: d / 2, diameter: d });
  const svg = s("svg", { class: "tc-lens", width: d, height: d, viewBox: `0 0 ${d} ${d}`, "aria-hidden": "true" }, lens.el);
  const el = h(
    "span",
    { class: "tc-lampunit" + (o.onCream ? " tc-oncream" : ""), "data-piece": "lamp-unit" },
    svg,
    o.label ? h("span", { class: "tc-lamplabel" }, o.label.toUpperCase()) : null,
  );
  const lamp: Lamp = {
    el,
    set(st) {
      lens.set(st);
      el.setAttribute("data-state", st);
    },
    get state() {
      return lens.state;
    },
  };
  lamp.set(o.state ?? "off");
  return lamp;
}
