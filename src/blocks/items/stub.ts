// Items, switched off: kinds have no attribute, items never change and never match.
import type * as Api from "./api";

export const kinds: typeof Api.kinds = () => [];
export const kind: typeof Api.kind = (name) => ({ name, attribute: null, note: null });
export const itemId: typeof Api.itemId = (place, copy) => (copy === 0 ? `${place}` : `${place}.${copy}`);
export const enter: typeof Api.enter = (place, kindName, marks, required) => ({
  id: `${place}`,
  place,
  copy: 0,
  kind: kindName,
  first: kindName,
  marks: marks.map((name) => ({ name, by: null })),
  required,
  checks: {},
  rejectedBy: null,
});
export const addMark: typeof Api.addMark = (item) => item;
export const changeKind: typeof Api.changeKind = (item) => item;
export const copyItem: typeof Api.copyItem = (item) => item;
export const markNames: typeof Api.markNames = (marks) => marks.map((m) => m.name);
export const marksEqual: typeof Api.marksEqual = () => false;
export const matches: typeof Api.matches = () => false;
