// Switch (ui/style.md Switch, ART-04): an Orange toggle half PlateSize long on
// a Cream plate of PlateSize, its label under the toggle. States: up and down.
// The AUDIO switch adds its lamp; up while sound is on (SETTING-01). Owner's
// change: the lamp sits in the plate, beside the toggle, half PlateGap from
// it, as a key's indicator, so the plate stands on the bar's centre line with
// the others. The run switch's throw takes SwitchThrowTime and seats
// with a rebound (FEEL-04, FEEL-16).
import { art, colours } from "../tokens";
import { h, s } from "./dom";
import { lamp, type Lamp } from "./lamp";

export interface SwitchOptions {
  /** RUN or AUDIO; printed in capitals (ART-03). */
  label: string;
  down?: boolean;
  /** The AUDIO switch's lamp. */
  withLamp?: boolean;
  lampOn?: boolean;
  onFlip?: () => void;
}

export interface Switch {
  /** The plate, with the lamp beside it when it has one. */
  el: HTMLElement;
  plate: HTMLButtonElement;
  lamp: Lamp | null;
  /** Down or up; snap skips the throw's motion. */
  set(down: boolean, snap?: boolean): void;
  readonly down: boolean;
}

/**
 * The toggle as the previews draw it, in a 16 x 24 box half PlateSize tall: an
 * Orange bar with an Ink outline (ART-02), about the box's height long, set a
 * unit high so its leaning foot clears the label. It pivots near its foot: up
 * it leans back, down forward, the throw swinging it across. Design silent on
 * its width: a quarter of PlateSize, wider than the previews', so its Orange
 * reads at 360. Its outline keeps OutlineWeight CSS pixels at any size.
 */
function toggleSvg(): SVGSVGElement {
  const lever = s(
    "g",
    { class: "tc-lever", "data-part": "lever" },
    s("path", {
      d: "M3.5 5A4.5 4.5 0 0 1 12.5 5V17A4.5 4.5 0 0 1 3.5 17Z",
      fill: colours.Orange,
      stroke: colours.Ink,
      "stroke-width": art.OutlineWeight,
      "vector-effect": "non-scaling-stroke",
    }),
  );
  return s(
    "svg",
    { class: "tc-toggle", viewBox: "0 0 16 24", preserveAspectRatio: "xMidYMid meet", "aria-hidden": "true", "data-part": "toggle" },
    lever,
  );
}

export function switchPiece(o: SwitchOptions): Switch {
  const label = o.label.toUpperCase();
  const plateEl = h(
    "button",
    { type: "button", class: "tc-plate tc-switch", "data-piece": "switch", "data-label": label, "aria-label": label },
    toggleSvg(),
    h("span", { class: "tc-label" }, label),
  );
  const lampPiece = o.withLamp ? lamp({ state: o.lampOn ? "steady" : "off" }) : null;
  if (lampPiece) plateEl.prepend(h("span", { class: "tc-keyrow" }, plateEl.querySelector(".tc-toggle")!, lampPiece.el));
  const el = lampPiece ? h("span", { class: "tc-switchunit" }, plateEl) : plateEl;
  let down = false;
  plateEl.addEventListener("click", () => o.onFlip?.());
  const sw: Switch = {
    el,
    plate: plateEl,
    lamp: lampPiece,
    set(d, snap) {
      down = d;
      if (snap) plateEl.classList.add("tc-snap");
      plateEl.classList.toggle("tc-down", d);
      plateEl.setAttribute("aria-pressed", String(d));
      plateEl.setAttribute("data-state", d ? "down" : "up");
      if (snap) {
        void plateEl.offsetWidth;
        plateEl.classList.remove("tc-snap");
      }
    },
    get down() {
      return down;
    },
  };
  sw.set(!!o.down, true);
  return sw;
}
