// ART-06 master alarm lamp: the largest lamp on the screen at every zoom. Its
// lens is AlarmLampSize of JackMinSize across, with an outline. Off: Graphite.
// Lit: Alarm, with two flat Alarm rings round it, each OutlineWeight wide, a
// gap of OutlineWeight between them; they stand, and carry no Ink edge. Alarm
// colours nothing else (ART-01). It sits on the Graphite frame or the Ink
// ground, never on GraphiteLight: its caller places it.
import { art, colours, feelRun, shared } from "../tokens";
import { n, s } from "./dom";

export interface AlarmLamp {
  el: SVGGElement;
  set(lit: boolean): void;
  readonly lit: boolean;
  /** Radius of the lit lamp's outer ring edge, for framing (ui/board.md last framing). */
  readonly outerRadius: number;
}

export function alarmLamp(o: { lit?: boolean; cx?: number; cy?: number } = {}): AlarmLamp {
  const ow = art.OutlineWeight;
  const R = (art.AlarmLampSize * shared.JackMinSize) / 2;
  const ringAt = (k: number) =>
    s("circle", { r: n(R + ow + k * 2 * ow + ow / 2), fill: "none", stroke: colours.Alarm, "stroke-width": ow, "data-part": "alarm-ring" });
  const rings = s("g", { "data-part": "alarm-rings" }, ringAt(0), ringAt(1));
  const lens = s("circle", { r: n(R - ow / 2), "stroke-width": ow, "data-part": "lens" });
  const el = s("g", { "data-piece": "alarm-lamp", transform: `translate(${n(o.cx ?? 0)} ${n(o.cy ?? 0)})` }, rings, lens);
  let lit = false;
  const lamp: AlarmLamp = {
    el,
    set(on) {
      lit = on;
      lens.style.transition = `fill ${feelRun.LampRiseTime}s linear`;
      lens.style.fill = on ? colours.Alarm : colours.Graphite;
      lens.style.stroke = on ? colours.Ink : colours.Cream;
      rings.style.display = on ? "" : "none";
      el.setAttribute("data-state", on ? "lit" : "off");
    },
    get lit() {
      return lit;
    },
    outerRadius: R + 4 * ow,
  };
  lamp.set(!!o.lit);
  return lamp;
}
