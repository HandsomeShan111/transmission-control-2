// Repair orders: orders that open wired and failing, scored by the moves of the fix (REPAIR-01 to REPAIR-03).
// Pure: storage stays out; callers keep the best and pass it back.

/** REPAIR-03: a repair order's fewest moves over its wins, and whether its par was ever met. */
export type RepairBest = { readonly moves: number; readonly parMet: boolean };

export { faultWiring, keepRepairBest, moves, movesBetween, movesLine, repairLamp } from "./logic/repair";
export { best, bests, setBest } from "./logic/bests";
export { MOVES_LAMP, repairBoard } from "./view/repair-board";
