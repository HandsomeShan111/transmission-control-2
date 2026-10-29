// Wires, the model only: the wiring, which jack takes which wire, plug, move, cut, undo, reset, wire count (WIRE-01, WIRE-03 to WIRE-07).
// Holding, dragging and drawing wires belong to the view.
import type { Wire } from "../orders/api";

export type { Wire };

/** A wiring: its wires in wire list order (WIRE-01: the opening's wires first, then each wire as placed or moved). At most one wire per output jack. */
export type Wiring = readonly Wire[];

/** WIRE-01: a wire's kind comes from the jack it leaves. */
export type WireKind = { readonly kind: "data" } | { readonly kind: "feedback"; readonly sign: "plus" | "minus" };

/** Undo history of one open order (WIRE-06, WIRE-07): its opening wiring, the wiring now, and the undo steps before it, oldest first. */
export type History = {
  readonly opening: Wiring;
  readonly current: Wiring;
  readonly past: readonly Wiring[];
};

export {
  canPlug,
  cut,
  endAt,
  formatWiring,
  inEnds,
  openHistory,
  outJacks,
  parseWiring,
  plug,
  record,
  reset,
  sameWiring,
  setWiring,
  undo,
  undoSteps,
  wireCount,
  wireKind,
  wiring,
  moveEnd,
} from "./logic/wires";

export type { Point as BoardPoint, Rect as BoardRect, WireGeometry } from "./view/geometry";
export { route, routeWiring } from "./view/geometry";
export type { WireGesture, WiringLayers, WiringView, WiringViewOptions } from "./view/wiring-view";
export { WIRE_PARAMS, wiringView } from "./view/wiring-view";
