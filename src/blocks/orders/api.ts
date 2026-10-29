// Orders: the 30 orders of the design's Orders data, read only (ORDER-01 to ORDER-05).

/**
 * One wire, written as the data writes it.
 * `from`: an output jack: "IN", "<agent>" (a worker's), "<agent> plus" | "<agent> minus" (a checker's), "<agent> item" | "<agent> copy" (a copier's).
 * `to`: an agent's input jack, "<agent>", or a destination's output terminal, "<destination>".
 * "<agent>" is the agent's label: its name, with its number for a numbered twin ("LAMINATOR 2", AGENT-01).
 */
export type Wire = { readonly from: string; readonly to: string };

export type RequiredOutput = {
  readonly destination: string;
  readonly kind: string;
  /** Marks in order; empty for "untouched". */
  readonly marks: readonly string[];
};

/** An agent's place on the board. Columns from 1, lanes from 0. `passLimit`: checking agents only. */
export type AgentPlace = {
  readonly name: string;
  /** AGENT-01: the name, numbered among twins in column order, then lane order. */
  readonly label: string;
  readonly col: number;
  readonly lane: number;
  readonly passLimit: number | null;
};

export type BatchItem = {
  readonly kind: string;
  /** Starting marks. */
  readonly marks: readonly string[];
  readonly required: RequiredOutput;
  /** The copies the order names, by copy number from 1 (ITEM-03). */
  readonly copies: readonly { readonly n: number; readonly required: RequiredOutput }[];
};

/**
 * An item ending a hand-written result answers (REPORT-01). `item`: batch place from 1; `copy`: 0 for the batch item itself.
 * `at`: ended at that destination's output terminal (rejected or not). `stopped`: stayed at that agent (a jack with no wire, or a
 * rejection with no required output) or at "IN". `lost`: still in the wiring at RunLimit.
 */
export type ItemEnding =
  | { readonly item: number; readonly copy: number; readonly end: "at"; readonly destination: string; readonly kind: string; readonly marks: readonly string[] }
  | { readonly item: number; readonly copy: number; readonly end: "stopped"; readonly at: string; readonly kind: string; readonly marks: readonly string[] }
  | { readonly item: number; readonly copy: number; readonly end: "lost"; readonly kind: string };

export type HandResult = { readonly ending: ItemEnding; readonly text: string };

/** PAR-01 pars of an order that is no repair order, or a repair order's MovePar (REPAIR-01). Null: no such par. */
export type Par =
  | { readonly kind: "score"; readonly wires: number | null; readonly time: number | null; readonly split: boolean }
  | { readonly kind: "moves"; readonly moves: number };

export type Order = {
  readonly n: number;
  readonly name: string;
  readonly act: number;
  readonly repair: boolean;
  readonly text: string;
  readonly agents: readonly AgentPlace[];
  /** One output terminal each, in lane order. */
  readonly destinations: readonly string[];
  readonly batch: readonly BatchItem[];
  /** The opening wiring, in the order the data lists it, or null for none. */
  readonly opening: readonly Wire[] | null;
  readonly results: readonly HandResult[];
  readonly par: Par;
};

export { order, orders, sameEnding } from "./logic/orders";
