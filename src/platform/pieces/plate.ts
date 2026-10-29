// Plate (ui/style.md Plate): a Cream plate with an Ink outline and an Ink
// label of LabelSize, PlateSize at least each way, a label that wraps at spaces
// onto three lines at most. States: normal, pressed (while held), disabled.
// Owner's change: a screen's own key in the control bar (ORDERS on the order
// list) stays held down: pressed, aria-current="page" and aria-disabled, a
// press does nothing. A key may carry a second line under its label (MEDALS'
// count), its own aria-label.
import { pageEvents } from "../events";
import { h } from "./dom";

export type PlateState = "normal" | "pressed" | "disabled";

export interface PlateOptions {
  label: string;
  state?: PlateState;
  /** A plate on paper (ART-12): pressed, it keeps its Cream fill and gains a second outline. */
  onPaper?: boolean;
  /** The screen's own key: held down for good; a press does nothing. */
  held?: boolean;
  /** A line under the label, never wrapped (MEDALS' count). */
  sub?: string;
  /** What a screen reader says, in place of the label. */
  aria?: string;
  /** A press. Returns false when it did nothing (a guard held it): then no key click. */
  onPress?: () => unknown;
}

export interface Plate {
  el: HTMLButtonElement;
  setState(state: PlateState): void;
  setLabel(label: string): void;
  /** The line under the label, and what a screen reader says. */
  setSub(sub: string, aria: string): void;
  /** Splits the label at spaces onto k lines (1 to 3), the widest line as narrow as it can be. */
  wrap(lines: number): boolean;
  readonly label: string;
}

export function plate(o: PlateOptions): Plate {
  const el = h("button", { type: "button", class: "tc-plate", "data-piece": "plate" });
  if (o.onPaper) el.classList.add("tc-onpaper");
  let label = o.label.toUpperCase();
  let sub = o.sub ?? null;
  let aria = o.aria ?? null;
  let rows = [label];
  let state: PlateState = "normal";
  const draw = (r: string[]) => {
    rows = r;
    el.replaceChildren(...r.map((x) => h("span", { class: "tc-label" }, x)), ...(sub ? [h("span", { class: "tc-label tc-sub", "data-part": "sub" }, sub)] : []));
    el.setAttribute("aria-label", aria ?? label);
    el.dataset.label = label;
  };
  draw([label]);
  // Owner's change: a real press that did something clicks (pageEvents keyPressed); a disabled or held plate, a press a guard
  // held, and a click the page made itself (isTrusted false) stay silent.
  el.addEventListener("click", (e) => {
    if (state === "disabled" || o.held || !o.onPress) return;
    if (o.onPress() !== false && e.isTrusted) pageEvents.emit("keyPressed", {});
  });
  const p: Plate = {
    el,
    setState(st) {
      state = st;
      el.classList.toggle("tc-pressed", st === "pressed");
      el.classList.toggle("tc-disabled", st === "disabled");
      // A held key says where the page is, and that a press does nothing.
      el.setAttribute("aria-disabled", String(st === "disabled" || !!o.held));
    },
    setLabel(l) {
      label = l.toUpperCase();
      draw([label]);
    },
    setSub(s, a) {
      sub = s;
      aria = a;
      draw(rows);
    },
    wrap(k) {
      const words = label.split(" ");
      if (k < 1 || k > 3 || words.length < k) return false;
      draw(k === 1 ? [label] : bestSplit(words, k));
      return true;
    },
    get label() {
      return label;
    },
  };
  p.setState(o.state ?? (o.held ? "pressed" : "normal"));
  if (o.held) {
    el.classList.add("tc-held");
    el.setAttribute("aria-current", "page");
  }
  return p;
}

/** Splits words into k lines so the longest line, counted in characters, is shortest. */
export function bestSplit(words: string[], k: number): string[] {
  let best: string[] = [words.join(" ")];
  let bestW = Infinity;
  const tryCuts = (cuts: number[]) => {
    const rows: string[] = [];
    let a = 0;
    for (const c of [...cuts, words.length]) {
      rows.push(words.slice(a, c).join(" "));
      a = c;
    }
    const w = Math.max(...rows.map((r) => r.length));
    if (w < bestW) {
      bestW = w;
      best = rows;
    }
  };
  if (k === 2) for (let i = 1; i < words.length; i++) tryCuts([i]);
  if (k === 3) for (let i = 1; i < words.length; i++) for (let j = i + 1; j < words.length; j++) tryCuts([i, j]);
  return best;
}
