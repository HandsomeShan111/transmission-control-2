// The order list's window (ui/order-list.md, CAMPAIGN-05): each act with an unlocked order, its heading, then its unlocked
// orders' rows: number and name, the plus sign once won; results found, par lamps, the second-wiring lamp.
import { actHeading, h, lamp, listRow, s, signDisc, type SilhouetteName } from "../../../platform/pieces";
import { art, shared } from "../../../platform/tokens";
import { order as orderOf } from "../../orders/api";
import { parLamps } from "../../par-and-score/api";
import { repairLamp } from "../../repair-orders/api";
import type { Bests, Progress } from "../api";
import { actFamily, hasSecondWiring, openActs, unlocked } from "../logic/campaign";

/** The plus sign at a won order's far end, as wide as a lamp lens (ui/order-list.md). */
export function wonSign(): SVGSVGElement {
  const d = art.LampSize * shared.JackMinSize;
  return s("svg", { width: d, height: d, viewBox: `${-d / 2} ${-d / 2} ${d} ${d}`, "data-part": "won", "aria-label": "won" }, signDisc({ sign: "plus", ground: "verdict", diameter: d }));
}

/** An order's lamps as the Board labels them (ui/board.md): par lamps first, then 2ND WIRING. */
export function orderLamps(n: number, p: Progress, bests: Bests, onCream: boolean): HTMLElement[] {
  const o = orderOf(n);
  const out: HTMLElement[] = [];
  const add = (label: string, lit: boolean) => {
    const l = lamp({ label, state: lit ? "steady" : "off", onCream });
    l.el.dataset.lamp = label;
    out.push(l.el);
  };
  if (o.par.kind === "moves") add("MOVES", repairLamp(bests.repairBest(n)) === "lit");
  else {
    const pl = parLamps(o, bests.best(n));
    if (pl.wire !== "none") add("WIRES", pl.wire === "lit");
    if (pl.time !== "none") add("TIME", pl.time === "lit");
  }
  if (hasSecondWiring(o)) add("2ND WIRING", p.lamps[n] !== undefined);
  return out;
}

export type ListView = { el: HTMLElement; rowOf: (n: number) => HTMLElement | undefined };

export function orderListView(o: {
  progress: Progress;
  bests: Bests;
  found: (n: number) => readonly number[];
  resultsLine: (found: number) => string;
  /** Each returns false when the tap did nothing (no key click). */
  onOrder: (n: number) => unknown;
  onHeading: (act: number) => unknown;
}): ListView {
  const list = h("div", { class: "tc-list", "data-part": "order-list" });
  list.style.cssText = "height:100%;overflow-y:auto;overscroll-behavior:contain";
  const rows = new Map<number, HTMLElement>();
  const open = unlocked(o.progress);
  for (const act of openActs(o.progress)) {
    const f = actFamily(act);
    const head = actHeading({ act, family: f.name, silhouette: f.silhouette as SilhouetteName, onPress: () => o.onHeading(act) });
    head.el.dataset.act = String(act);
    list.append(head.el);
    for (const n of open.filter((x) => orderOf(x).act === act)) {
      const ord = orderOf(n);
      const won = o.progress.won.includes(n);
      const row = listRow({
        first: `${n} ${ord.name}`,
        ...(won ? { far: wonSign() } : {}),
        second: [o.resultsLine(o.found(n).length), ...orderLamps(n, o.progress, o.bests, true)],
        onPress: () => o.onOrder(n),
      });
      row.el.dataset.order = String(n);
      row.el.dataset.won = String(won);
      rows.set(n, row.el);
      list.append(row.el);
    }
  }
  return { el: list, rowOf: (n) => rows.get(n) };
}
