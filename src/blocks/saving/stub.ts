// Saving, switched off: keeps nothing; every page opens a new game; no save code.
import type * as Api from "./api";
import { emptySave } from "./logic/save";

export const startSaving: typeof Api.startSaving = () => ({
  kept: () => emptySave(1),
  restore: () => Promise.resolve(),
  keep: () => Promise.resolve(),
  printCode: () => Promise.resolve(),
  readPasted: () => Promise.resolve({ lines: [] }),
  settings: () => ({ muted: false }),
  keepSettings: () => {},
  keptWiring: () => null,
});
