import type { Item, KindData, Mark, Required } from "../api";
import { KINDS } from "../data/kinds.gen";

const byName = new Map(KINDS.map((k) => [k.name, k]));

export function kinds(): readonly KindData[] {
  return KINDS;
}

export function kind(name: string): KindData {
  const k = byName.get(name);
  if (!k) throw new Error(`no item kind "${name}"`);
  return k;
}

export function itemId(place: number, copy: number): string {
  return copy === 0 ? `${place}` : `${place}.${copy}`;
}

/** ITEM-01: a batch item entering, with its kind, starting marks and required output. */
export function enter(place: number, kindName: string, startingMarks: readonly string[], required: Required): Item {
  kind(kindName);
  return {
    id: itemId(place, 0),
    place,
    copy: 0,
    kind: kindName,
    first: kindName,
    marks: startingMarks.map((name) => ({ name, by: null })),
    required,
    checks: {},
    rejectedBy: null,
  };
}

/** ITEM-02: the mark goes at the end, repeats included. */
export function addMark(item: Item, mark: string, by: string): Item {
  return { ...item, marks: [...item.marks, { name: mark, by }] };
}

/** AGENT-02: a kind change; a change into the kind it has keeps the kind. */
export function changeKind(item: Item, to: string): Item {
  kind(to);
  return item.kind === to ? item : { ...item, kind: to };
}

/** ITEM-03: a copy has the original's kind, first kind and marks; its check counts start at zero (AGENT-05). */
export function copyItem(item: Item, copy: number, required: Required | null): Item {
  return { ...item, id: itemId(item.place, copy), copy, required, checks: {}, rejectedBy: null };
}

export function markNames(marks: readonly Mark[]): string[] {
  return marks.map((m) => m.name);
}

export function marksEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((m, i) => m === b[i]);
}

/** RUN-07: at its required destination, not rejected, with the required kind and marks in order. */
export function matches(item: Item, at: string | null): boolean {
  const r = item.required;
  if (!r || at === null || item.rejectedBy !== null) return false;
  return at === r.destination && item.kind === r.kind && marksEqual(markNames(item.marks), r.marks);
}
