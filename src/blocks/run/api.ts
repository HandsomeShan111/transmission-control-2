// Run: the batch through a wiring, beat by beat, with no chance (RUN-01 to RUN-08).
// `run(order, wires)` is pure: one order and one wiring give one trace, every time (GP-1).
// The trace is the whole contract: the run view plays it and reports read it; neither runs anything again.
// Every value in a trace is frozen.
import type { Lamp } from "../agents/api";
import type { Mark, Required } from "../items/api";
import type { Wire } from "../orders/api";

/** RunLimit at its start value (RUN-06). */
export const RUN_LIMIT = 99;

/**
 * Where an item is once a beat is over. No item is ever on a wire then: a sent item reaches its wire's far end in the beat it
 * leaves (RUN-02, step 3). The beat's `send` and `arrive` events show the wire it travelled.
 * - `in`: waiting at the input terminal; `pos` 0 is sent next.
 * - `queue`: waiting at `agent`'s input jack; `pos` 0 is worked next.
 * - `terminal`: at `destination`'s output terminal, at its end (RUN-03), or rejected there (RUN-05).
 * - `stopped`: at `jack`, an output jack with no wire, at its end (RUN-04); `jack` "IN" for the input terminal.
 * - `rejected`: rejected with no required output, stays at checking `agent`, at its end (RUN-05).
 * - `lost`: still in the wiring when RunLimit beats passed (RUN-06).
 */
export type Where =
  | { readonly at: "in"; readonly pos: number }
  | { readonly at: "queue"; readonly agent: string; readonly pos: number }
  | { readonly at: "terminal"; readonly destination: string }
  | { readonly at: "stopped"; readonly jack: string }
  | { readonly at: "rejected"; readonly agent: string }
  | { readonly at: "lost" };

/** One item as it is once a beat is over. A copy appears from the beat it is made. */
export type ItemSnapshot = {
  /** Stable over the run: "<place>" for a batch item, "<place>.<copy>" for a copy (ITEM-03). */
  readonly id: string;
  readonly kind: string;
  readonly marks: readonly string[];
  /** Rejected, from its rejection on (RUN-05). */
  readonly rejected: boolean;
  /** Checks so far, per checking agent label (AGENT-05). */
  readonly checks: Readonly<Record<string, number>>;
  readonly where: Where;
};

/**
 * One event of a beat, in the order the beat makes them (RUN-02): step 1, each agent with an item waiting, in column then lane
 * order, works it, then sends it (and a copy) on; step 2, the input terminal sends; step 3, every arrival, in batch order with
 * each copy right behind its original. Agents are named by label ("SLICER 1"); items by id.
 * - `work` (AGENT-02): `mark` added; `kindFrom` → `kindTo`, equal when the kind stayed.
 * - `copy` (AGENT-04): `mark` added to `item`, then `copy` made, number `copyNumber` of its batch item (ITEM-03).
 * - `check` (AGENT-03): verdict; `count` is this agent's checks of the item, this one included.
 * - `reject` (AGENT-05): the item had `checks` checks from this agent already; rejected, no mark.
 * - `send`: the item leaves by output jack `from` along its wire to `to`, an input jack (agent label) or a destination.
 * - `stop` (RUN-04): the item was sent by `jack`, which has no wire; it stays there, at its end. "IN" for the input terminal.
 * - `arrive`: the item reaches `at`. `terminal`: a destination's output terminal (its end); else the agent's input jack, at queue
 *   position `pos` (0 is worked next). `via` "reject": a rejected item going straight to its destination (RUN-05).
 * - `lost` (RUN-06): RunLimit beats passed with the item still in the wiring.
 */
export type RunEvent =
  | { readonly type: "work"; readonly agent: string; readonly item: string; readonly mark: string; readonly kindFrom: string; readonly kindTo: string }
  | { readonly type: "copy"; readonly agent: string; readonly item: string; readonly mark: string; readonly copy: string; readonly copyNumber: number }
  | { readonly type: "check"; readonly agent: string; readonly item: string; readonly verdict: "plus" | "minus"; readonly count: number }
  | { readonly type: "reject"; readonly agent: string; readonly item: string; readonly checks: number }
  | { readonly type: "send"; readonly item: string; readonly from: string; readonly to: string }
  | { readonly type: "stop"; readonly item: string; readonly jack: string }
  | { readonly type: "arrive"; readonly item: string; readonly at: string; readonly terminal: boolean; readonly pos: number | null; readonly via: "wire" | "reject" }
  | { readonly type: "lost"; readonly item: string };

/** One beat. `n` from 1; `time` the run time after it (RUN-02, step 4). */
export type Beat = {
  readonly n: number;
  readonly events: readonly RunEvent[];
  /** Every item that exists, once the beat is over, in item order. Null when the run was asked for no snapshots. */
  readonly items: readonly ItemSnapshot[] | null;
  /** Every agent's lamp once the beat is over, by label (AGENT-02 to AGENT-06). */
  readonly lamps: Readonly<Record<string, Lamp>>;
  readonly time: number;
};

/**
 * An item's end.
 * - `arrived`: at `destination`'s output terminal (RUN-03); `rejectedBy` set when a rejection sent it there (RUN-05).
 * - `stopped`: at output jack `jack` with no wire (RUN-04); `agent` its agent's label, null for the input terminal.
 * - `rejected`: rejected by checking `agent` with no required output, and stays there (RUN-05).
 * - `lost`: RunLimit passed (RUN-06).
 */
export type End =
  | { readonly type: "arrived"; readonly destination: string; readonly rejectedBy: string | null }
  | { readonly type: "stopped"; readonly jack: string; readonly agent: string | null }
  | { readonly type: "rejected"; readonly agent: string }
  | { readonly type: "lost" };

/** One agent that worked an item, for its report path (REPORT-02): label, name, the kind the item had on receipt, a check's verdict. */
export type PathStep = {
  readonly agent: string;
  readonly name: string;
  readonly kind: string;
  readonly verdict: "plus" | "minus" | null;
};

/** An item once the run is over. */
export type TraceItem = {
  readonly id: string;
  /** Batch place, from 1. */
  readonly place: number;
  /** 0: the batch item; else its copy number (ITEM-03). */
  readonly copy: number;
  /** For a copy: the id of the item it was copied from. */
  readonly copiedFrom: string | null;
  readonly first: string;
  readonly kind: string;
  /** All marks, in order, each with the agent label that added it, null for a starting mark (REPORT-05). */
  readonly marks: readonly Mark[];
  /** Null: a copy the order does not name. */
  readonly required: Required | null;
  readonly checks: Readonly<Record<string, number>>;
  readonly rejectedBy: string | null;
  readonly end: End;
  /** The beat it reached its end in. */
  readonly endBeat: number;
  /** RUN-07. */
  readonly matched: boolean;
  /** The agents that worked or checked it, in order. A copy's path starts once it is made. */
  readonly path: readonly PathStep[];
};

/** A whole run. */
export type Trace = {
  readonly order: number;
  /** The wiring run, as given. */
  readonly wires: readonly Wire[];
  /** Every wire on the board (PAR-02). */
  readonly wireCount: number;
  /** Beat 0 (RUN-01): every batch item waiting at the input terminal, every check count zero, run time zero. Null without snapshots. */
  readonly start: readonly ItemSnapshot[] | null;
  readonly beats: readonly Beat[];
  /** Every item, batch order, each copy right behind its original, copies by copy number (REPORT-01). */
  readonly items: readonly TraceItem[];
  /** Named copies (place, copy number) never made (RUN-08). */
  readonly copiesMissing: readonly { readonly place: number; readonly copy: number }[];
  /** RUN-08: every item matches and every named copy was made. */
  readonly win: boolean;
  /** Run time, in beats. */
  readonly time: number;
};

export type RunOptions = {
  /** False: beats keep their events and lamps but no item snapshots, and `start` is null. For the test build's search. Default true. */
  readonly snapshots?: boolean;
};

export { endingOf, run } from "./logic/run";
