// Small DOM and SVG builders for the pieces. Nothing here knows the game.

export const SVG_NS = "http://www.w3.org/2000/svg";

type Attrs = Record<string, string | number | boolean | null | undefined>;
type Kid = Node | string | null | undefined | false;

function setAttrs(e: Element, attrs: Attrs): void {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    e.setAttribute(k, v === true ? "" : String(v));
  }
}

function append(e: Element, kids: Kid[]): void {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    e.append(typeof k === "string" ? document.createTextNode(k) : k);
  }
}

/** An HTML element: h("div", {class: "a"}, ...kids). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  setAttrs(e, attrs);
  append(e, kids);
  return e;
}

/** An SVG element. */
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag);
  setAttrs(e, attrs);
  append(e, kids);
  return e;
}

/** Rounds a number for SVG attributes. */
export function n(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}

export interface Point {
  x: number;
  y: number;
}
