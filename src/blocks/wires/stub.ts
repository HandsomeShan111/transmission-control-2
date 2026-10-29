// Wires, switched off: no jacks take a wire; every wiring stays as it is.
import type * as Api from "./api";

export const outJacks: typeof Api.outJacks = () => [];
export const inEnds: typeof Api.inEnds = () => [];
export const canPlug: typeof Api.canPlug = () => false;
export const wireKind: typeof Api.wireKind = () => ({ kind: "data" });
export const plug: typeof Api.plug = (_order, wiring) => wiring;
export const moveEnd: typeof Api.moveEnd = (_order, wiring) => wiring;
export const cut: typeof Api.cut = (wiring) => wiring;
export const endAt: typeof Api.endAt = () => -1;
export const wireCount: typeof Api.wireCount = (wiring) => wiring.length;
export const sameWiring: typeof Api.sameWiring = () => true;
export const parseWiring: typeof Api.parseWiring = () => [];
export const formatWiring: typeof Api.formatWiring = () => "";
export const openHistory: typeof Api.openHistory = (order, start) => {
  const opening = order.opening ?? [];
  return { opening, current: start ?? opening, past: [] };
};
export const record: typeof Api.record = (h) => h;
export const undo: typeof Api.undo = (h) => h;
export const reset: typeof Api.reset = (h) => h;
export const wiring: typeof Api.wiring = () => [];
export const setWiring: typeof Api.setWiring = () => {};
export const undoSteps: typeof Api.undoSteps = () => [];
