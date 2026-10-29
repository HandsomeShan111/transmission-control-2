// Repair orders, switched off: no faults, no moves, no moves line.
import type * as Api from "./api";

export const faultWiring: typeof Api.faultWiring = () => [];
export const movesBetween: typeof Api.movesBetween = () => 0;
export const moves: typeof Api.moves = () => 0;
export const movesLine: typeof Api.movesLine = () => "";
export const keepRepairBest: typeof Api.keepRepairBest = (_order, prev, count) => prev ?? { moves: count, parMet: false };
export const repairLamp: typeof Api.repairLamp = () => "off";
