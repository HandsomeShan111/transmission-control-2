// Incident archive, switched off: files nothing, finds nothing, shows nothing.
import type * as Api from "./api";
import { EMPTY_ARCHIVE } from "./logic/archive";

export const startArchive: typeof Api.startArchive = () => ({
  state: () => EMPTY_ARCHIVE,
  setState: () => {},
  file: (_n, _r, _w) => ({ id: "", isNew: false, foundResult: null, foundCount: 0 }),
  isFiled: () => false,
  found: () => [],
  rows: () => [],
  extend: () => {},
  show: () => {},
  reprint: () => {
    throw new Error("the incident archive is switched off");
  },
  print: () => {
    throw new Error("the incident archive is switched off");
  },
  onChange: () => () => {},
});
