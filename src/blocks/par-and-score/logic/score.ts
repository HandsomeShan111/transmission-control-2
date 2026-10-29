import type { Order } from "../../orders/api";
import type { Trace } from "../../run/api";
import { wireCount } from "../../wires/api";
import type { Best, ParLamps, Score } from "../api";

/** PAR-02: a won run of an order that is no repair order: every wire on the board, and its run time. A failed run: no score. */
export function score(order: Order, trace: Trace): Score | null {
  if (order.par.kind !== "score" || !trace.win) return null;
  const { wires: wirePar, time: timePar, split } = order.par;
  const wires = wireCount(trace.wires);
  return {
    order: order.n,
    wires,
    time: trace.time,
    wirePar,
    timePar,
    wireMet: wirePar !== null && wires <= wirePar,
    timeMet: timePar !== null && trace.time <= timePar,
    split,
  };
}

/** PAR-02: one score part as the mission report prints it: "Wires 5, par 4.", "Time 8, par 8. Par met.", "Time 6.". */
export function scoreLine(label: "Wires" | "Time", value: number, par: number | null, met: boolean): string {
  return `${label} ${value}${par === null ? "" : `, par ${par}`}.${met ? " Par met." : ""}`;
}

/** PAR-02: the score's lines; a split order adds "Best known: one wiring for each par." */
export function scoreLines(s: Score): string[] {
  const out = [scoreLine("Wires", s.wires, s.wirePar, s.wireMet), scoreLine("Time", s.time, s.timePar, s.timeMet)];
  if (s.split) out.push("Best known: one wiring for each par.");
  return out;
}

/** PAR-03: the best after one more win. */
export function keepBest(prev: Best | null, s: Score): Best {
  if (!prev) return { wires: s.wires, time: s.time, wireMet: s.wireMet, timeMet: s.timeMet };
  return {
    wires: Math.min(prev.wires, s.wires),
    time: Math.min(prev.time, s.time),
    wireMet: prev.wireMet || s.wireMet,
    timeMet: prev.timeMet || s.timeMet,
  };
}

/** PAR-03: a lamp for each par the order has, lit once that par is met. */
export function parLamps(order: Order, best: Best | null): ParLamps {
  if (order.par.kind !== "score") return { wire: "none", time: "none" };
  const lamp = (par: number | null, met: boolean) => (par === null ? "none" : met ? "lit" : "off");
  return { wire: lamp(order.par.wires, best?.wireMet ?? false), time: lamp(order.par.time, best?.timeMet ?? false) };
}
