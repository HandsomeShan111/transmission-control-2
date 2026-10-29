// Offline play: the first load with its LOADING lines, every file kept in the browser, the game opening offline, new versions
// found and installed beside the one playing (OFFLINE-01 to OFFLINE-03). Holds GameVersion and GameLink. Owns the `loading` screen.
import { BUILD } from "./logic/build";

export interface OfflinePlay {
  /** Resolves once the game may open: at once where every file is kept, else after the first load. */
  readonly ready: Promise<{ readonly firstLoad: boolean; readonly cannotStore: boolean }>;
  /** OFFLINE-01: the line printed once the game opens when the files could not be kept, or null. */
  cannotStoreLine(): string | null;
  /** OFFLINE-03: looks for a new version; true when one is downloading or waiting. */
  lookForNewVersion(): Promise<boolean>;
}

/** GameVersion (offline-play.md parameters). */
export function gameVersion(): number {
  return BUILD.version;
}

/** GameLink: the game's address, printed on shared reports, without its scheme. The test build: this page's own server. */
export function gameLink(): string {
  if (BUILD.link !== null) return BUILD.link;
  return `${location.host}/transmission-control-2`;
}

/** GameLink as a web address a phone opens, for the QR code (SHARE-02). */
export function gameUrl(): string {
  return `${BUILD.link !== null ? "https" : location.protocol.replace(":", "")}://${gameLink()}`;
}

export type { BuildValues } from "./logic/build";
export { BUILD, RELEASE, RELEASE_LINK } from "./logic/build";
export { CANNOT_STORE, FIRST_LOAD_MAX, GAME_LINK_MAX, KEPT_FILES, LOADING, LOAD_STEP, NO_SIGNAL, cacheName, cacheVersion, isGameCache, loadSteps } from "./logic/loading";
export type { BuildFile } from "./logic/loading";
export { startOfflinePlay } from "./view/offline";
