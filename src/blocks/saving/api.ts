// Saving: progress kept in this browser as it happens, and carried to another by a save code (SAVE-01 to SAVE-05). Fills the
// order list's SAVE CODE and LOAD SAVE CODE, and prints the save code after an act's debrief.
import type { Store } from "../../platform/store";
import type { Achievements } from "../achievements/api";
import type { Archive } from "../incident-archive/api";
import type { Campaign } from "../campaign/api";
import type { OfflinePlay } from "../offline-play/api";
import type { KeptWiring, Save } from "./logic/save";

/** Kept beside the save, outside the code (SAVE-01): the sound setting. */
export type Settings = { readonly muted: boolean };

export interface Saving {
  /** The kept save, as this page holds it. */
  kept(): Save;
  /** Reads what this browser keeps into the blocks; once, before the game opens. */
  restore(): Promise<void>;
  /** SAVE-01: keeps every change: under the lock, reads the save again, merges, writes once. */
  keep(): Promise<void>;
  /** SAVE-02: the save code, printed with its COPY control. Resolves once its printout closes. */
  printCode(): Promise<void>;
  /** SAVE-03: reads a pasted code; what it prints. */
  readPasted(text: string): Promise<{ readonly lines: readonly string[] }>;
  settings(): Settings;
  keepSettings(s: Settings): void;
  /** The order's kept wiring, or null. */
  keptWiring(n: number): KeptWiring | null;
}

/** A point a test build may hold a page at (acceptance.md, Test build). */
export type Hold = (point: string) => Promise<void>;

export type SavingDeps = {
  readonly store: Store;
  readonly campaign: Campaign;
  readonly archive: Archive;
  readonly achievements: Achievements;
  readonly offline: OfflinePlay;
  readonly hold?: Hold;
  /** The browser's request to keep storage (navigator.storage.persist); the test build sets its answer. */
  readonly persist?: () => Promise<boolean>;
  readonly clipboard?: (text: string) => Promise<void>;
};

export type { KeptWiring, Parts, Save, SaveFiled } from "./logic/save";
export { emptySave, fingerprint, fromSave, keptWiringFits, legalWiring, mergeSaves, printOf, readIntoVersion, readKeptWirings, readStoredSave, toSave } from "./logic/save";
export type { ReadCode } from "./logic/code";
export { CODE_MAX_LENGTH, crc32, fromBase64Url, readCode, toBase64Url, writeCode } from "./logic/code";
export { CODE_NOT_READ, COPIED, EARLIER_DROPPED, KEEPS_NO_RECORDS, NEWER_CODE, SAVE_CODE_READ, SELECT_AND_COPY, startSaving } from "./view/saving";
