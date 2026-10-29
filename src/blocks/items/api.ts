// Items: item kinds, marks, copies and the match against a required output (ITEM-01 to ITEM-03, RUN-07).
// Drawing (ITEM-04) belongs to the view, not here.

/** An item kind's attribute, read by attribute tests (AGENT-03). */
export type Attribute = "paper" | "edible" | "metal" | null;

/** One entry of Item kinds (data.md). */
export type KindData = {
  readonly name: string;
  readonly attribute: Attribute;
  /** The page's remark on the kind, if any. Not printed. */
  readonly note: string | null;
};

/** One mark on an item (ITEM-02). `by`: the label of the agent that added it ("LAMINATOR 2"), or null for a starting mark. */
export type Mark = { readonly name: string; readonly by: string | null };

/** A required output (ITEM-01): a destination, a kind and marks in order. */
export type Required = {
  readonly destination: string;
  readonly kind: string;
  readonly marks: readonly string[];
};

/**
 * One item on the board. Immutable: every change returns a new item.
 * `place`: its batch item's place in the batch, from 1. `copy`: 0 for the batch item, else its copy number (ITEM-03).
 * `id`: stable over a run, `"<place>"` or `"<place>.<copy>"`.
 */
export type Item = {
  readonly id: string;
  readonly place: number;
  readonly copy: number;
  readonly kind: string;
  /** Its kind on entering; a kind change never changes it (ITEM-01). */
  readonly first: string;
  readonly marks: readonly Mark[];
  /** Null: a copy the order does not name (ITEM-03). */
  readonly required: Required | null;
  /** Checks so far, per checking agent label (AGENT-05). */
  readonly checks: Readonly<Record<string, number>>;
  /** The label of the checking agent that rejected it, or null (RUN-05). */
  readonly rejectedBy: string | null;
};

export { addMark, changeKind, copyItem, enter, itemId, kind, kinds, markNames, marksEqual, matches } from "./logic/items";
export type { DrawContext, MarkLook } from "./view/drawing";
export { arrivalSign, firstDifferencePlaces, movingItem, rejectedSign, rowItem, rowStamp, rowTileX, tileRing } from "./view/drawing";
