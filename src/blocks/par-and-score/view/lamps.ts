// PAR-03 on the board: one lamp per par the order has, WIRES then TIME, lit once that par is met (ui/board.md).
import type { Order } from "../../orders/api";
import { lamp, type Lamp } from "../../../platform/pieces";
import type { Best } from "../api";
import { parLamps } from "../logic/score";

export type ParLamp = { readonly par: "wire" | "time"; readonly label: "WIRES" | "TIME"; readonly lamp: Lamp; lit(best: Best | null): boolean };

export function parLampUnits(order: Order, best: Best | null): ParLamp[] {
  const now = parLamps(order, best);
  const out: ParLamp[] = [];
  for (const [par, label] of [
    ["wire", "WIRES"],
    ["time", "TIME"],
  ] as const) {
    if (now[par] === "none") continue;
    const l = lamp({ label, state: now[par] === "lit" ? "steady" : "off" });
    l.el.setAttribute("data-lamp", label);
    out.push({ par, label, lamp: l, lit: (b) => parLamps(order, b)[par] === "lit" });
  }
  return out;
}
