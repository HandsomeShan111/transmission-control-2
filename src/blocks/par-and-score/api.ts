// Par and score: a won order's wires and run time against its pars, and the best kept over wins (PAR-02, PAR-03).
// Pure: storage stays out; callers keep the best and pass it back.

/** A won run's score (PAR-02). Pars null where the order has none. */
export type Score = {
  readonly order: number;
  readonly wires: number;
  readonly time: number;
  readonly wirePar: number | null;
  readonly timePar: number | null;
  readonly wireMet: boolean;
  readonly timeMet: boolean;
  /** The order's `par` is split: no one known wiring meets both. */
  readonly split: boolean;
};

/** PAR-03: an order's fewest wires and fewest beats over its wins, each on its own, and whether each par was ever met. */
export type Best = {
  readonly wires: number;
  readonly time: number;
  readonly wireMet: boolean;
  readonly timeMet: boolean;
};

/** PAR-03: one lamp per par the order has: "lit" once met, else "off"; "none" where the order has no such par. */
export type ParLamps = { readonly wire: "none" | "off" | "lit"; readonly time: "none" | "off" | "lit" };

export { keepBest, parLamps, score, scoreLine, scoreLines } from "./logic/score";
export { best, bests, orderStore, setBest } from "./logic/bests";
export type { ParLamp } from "./view/lamps";
export { parLampUnits } from "./view/lamps";
