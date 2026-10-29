// List row (ui/style.md List row): a Cream row across the window, at most
// RowWidth, centred; RowHeight at least, growing with its lines; Ink text of
// TextSize, PlateGap from its sides. An act heading: an Ink row with the
// family's silhouette at its start, then "ACT <number>" and the family name in
// Cream. Pressed: a row turns Ink with Cream text; an act heading GraphiteLight.
// archive.md: an achievement row is GraphiteLight with Cream text; a filed
// report's row is indented by PlateGap.
import { pageEvents } from "../events";
import { h } from "./dom";
import { silhouetteSvg, type SilhouetteName } from "./silhouette";

export type RowState = "normal" | "pressed";

export interface RowOptions {
  /** First line: number and name, as the caller words it. */
  first: string;
  /** The first line's far end: a plus sign or a lamp, or a short text. */
  far?: Node | string;
  /** A lead of two lines at most, then an ellipsis (archive.md report row). */
  lead?: string;
  /** Second line, in LabelSize: results found, lamps (ui/order-list.md). */
  second?: (Node | string)[];
  variant?: "order" | "report" | "achievement";
  state?: RowState;
  /** A row that takes no tap (archive.md: a dropped report). */
  inactive?: boolean;
  /** A tap. Returns false when it did nothing: then no key click. */
  onPress?: () => unknown;
}

/** A row's tap: a real one that did something clicks, as a plate does (owner's change). */
function onTap(el: HTMLElement, press: () => unknown): void {
  el.addEventListener("click", (e) => {
    if (press() !== false && e.isTrusted) pageEvents.emit("keyPressed", {});
  });
}

export interface Row {
  el: HTMLElement;
  setState(state: RowState): void;
}

function setRowState(el: HTMLElement, st: RowState): void {
  el.classList.toggle("tc-pressed", st === "pressed");
  el.setAttribute("data-state", st);
}

export function listRow(o: RowOptions): Row {
  const variant = o.variant ?? "order";
  const tappable = variant !== "achievement" && !o.inactive;
  const cls = ["tc-row"];
  if (variant === "report") cls.push("tc-indent");
  if (variant === "achievement") cls.push("tc-ach");
  if (!tappable) cls.push("tc-inactive");
  const el = h(tappable ? "button" : "div", { class: cls.join(" "), "data-piece": "list-row", "data-variant": variant });
  if (el instanceof HTMLButtonElement) el.type = "button";
  el.append(h("span", { class: "tc-r1" }, h("span", {}, o.first), o.far ?? null));
  if (o.lead) el.append(h("span", { class: "tc-lead" }, o.lead));
  if (o.second?.length) el.append(h("span", { class: "tc-r2" }, ...o.second.map((x) => (typeof x === "string" ? h("span", {}, x) : x))));
  if (tappable && o.onPress) onTap(el, o.onPress);
  setRowState(el, o.state ?? "normal");
  return { el, setState: (st) => setRowState(el, st) };
}

export interface ActHeadingOptions {
  act: number;
  family: string;
  silhouette: SilhouetteName;
  state?: RowState;
  inactive?: boolean;
  /** A tap. Returns false when it did nothing: then no key click. */
  onPress?: () => unknown;
}

export function actHeading(o: ActHeadingOptions): Row {
  const tappable = !o.inactive;
  const el = h(tappable ? "button" : "div", {
    class: "tc-row tc-head" + (tappable ? "" : " tc-inactive"),
    "data-piece": "list-row",
    "data-variant": "head",
  });
  if (el instanceof HTMLButtonElement) el.type = "button";
  // The silhouette: solid Cream with Ink detail lines, as on a face's band (ART-09).
  const sil = silhouetteSvg({ name: o.silhouette, size: 0, solid: "cream" });
  sil.setAttribute("class", "tc-sil");
  sil.style.width = sil.style.height = "calc(var(--TextSize) * 1.6)";
  el.append(sil, h("span", {}, `ACT ${o.act} ${o.family}`));
  if (tappable && o.onPress) onTap(el, o.onPress);
  setRowState(el, o.state ?? "normal");
  return { el, setState: (st) => setRowState(el, st) };
}
