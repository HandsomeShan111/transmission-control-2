// Agents: the 18 agents and 6 families, their jacks, and what each does to an item (AGENT-01 to AGENT-06).
import type { Item, Required } from "../items/api";

export type Role = "worker" | "checker" | "copier";

/** A checking agent's test (data.md, Agents). */
export type Test =
  | { readonly type: "attribute"; readonly attribute: "paper" | "edible" | "metal" }
  | { readonly type: "mark"; readonly agent: string }
  | { readonly type: "count"; readonly count: number }
  | { readonly type: "asOrdered" };

/** One entry of Agents (data.md). */
export type AgentData = {
  readonly name: string;
  readonly family: string;
  readonly role: Role;
  readonly rule: string;
  /** Workers and copiers: the mark's name. Checkers: null. */
  readonly mark: string | null;
  /** A worker's kind change: a kind name, "first kind", or null for none. */
  readonly toKind: string | null;
  readonly test: Test | null;
  /** Checkers: plus word, then minus word. */
  readonly verdictWords: readonly [string, string] | null;
};

/** One entry of Agent families (data.md). */
export type FamilyData = {
  readonly name: string;
  readonly silhouette: string;
  readonly act: number;
  readonly memo: string;
};

/** An output jack's kind (AGENT-01): a worker's `out`; a checker's `plus` and `minus`; a copier's `item` and `copy`. */
export type OutJackKind = "out" | "plus" | "minus" | "item" | "copy";

/** A lamp (AGENT-02, AGENT-03, AGENT-06): off, steady while working, or the last verdict. */
export type Lamp = "off" | "steady" | "plus" | "minus";

/** An agent placed on a board: its name, its printed label (numbered twins, AGENT-01), and a checker's pass limit. */
export type PlacedAgent = {
  readonly name: string;
  readonly label: string;
  readonly passLimit: number | null;
};

/** What one agent does to the first item at its input jack. Items returned are new values. */
export type Applied =
  /** AGENT-02: mark added, kind changed if its `toKind` says; sent by `out`. */
  | { readonly action: "work"; readonly item: Item; readonly mark: string; readonly kindFrom: string; readonly kindTo: string; readonly jack: "out" }
  /** AGENT-04: mark added, copy made; the item leaves by `item`, the copy by `copy`. */
  | { readonly action: "copy"; readonly item: Item; readonly copy: Item; readonly mark: string }
  /** AGENT-03: a verdict, no mark; sent by the verdict's jack. `count`: this agent's checks of the item, this one included. */
  | { readonly action: "check"; readonly item: Item; readonly verdict: "plus" | "minus"; readonly count: number; readonly jack: "plus" | "minus" }
  /** AGENT-05: the item was checked passLimit times already: rejected, no mark, no check. */
  | { readonly action: "reject"; readonly item: Item; readonly checks: number };

/** The copy a copier makes next: its number within its batch item, and its required output (ITEM-03). */
export type NextCopy = { readonly copy: number; readonly required: Required | null };

export { agent, agents, apply, families, family, lampAfter, numberTwins, outJacks } from "./logic/agents";
export { markLook, markMetrics } from "./view/look";
