// Offline play, the rules a page reads (OFFLINE-01 to OFFLINE-03): the LOADING lines and the names of the kept files. Pure.

/** LoadStep, percent (offline-play.md parameters). */
export const LOAD_STEP = 10;
/** FirstLoadMax, MB of 10^6 bytes, compressed (offline-play.md parameters). */
export const FIRST_LOAD_MAX = 1.0;
/** GameLinkMax, characters (offline-play.md parameters). */
export const GAME_LINK_MAX = 30;

export const LOADING = "LOADING";
export const NO_SIGNAL = "NO SIGNAL";
/** OFFLINE-01: printed once when the files cannot be kept. */
export const CANNOT_STORE = "THIS TERMINAL CANNOT STORE THE GAME. A CONNECTION IS NEEDED TO OPEN IT AGAIN.";

/** OFFLINE-01: the steps of LoadStep reached by `loaded` of `total` bytes, past those already printed: "10%", "20%", … */
export function loadSteps(loaded: number, total: number, printed: number): string[] {
  const pct = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 100;
  const reached = Math.floor(pct / LOAD_STEP) * LOAD_STEP;
  const out: string[] = [];
  for (let p = printed + LOAD_STEP; p <= reached; p += LOAD_STEP) out.push(`${p}%`);
  return out;
}

/** The files the game keeps, in load order (scripts/build.ts lists them with their sizes and digests in files.json and sw.js). */
export const KEPT_FILES = ["index.html", "main.js"] as const;

/** The cache of one version's files: one name per GameVersion and file list (OFFLINE-03). */
export function cacheName(version: number, listId: string): string {
  return `tc2-v${version}-${listId}`;
}

export const isGameCache = (name: string) => name.startsWith("tc2-v");

/** The GameVersion a game cache's name carries, or null for another cache. */
export function cacheVersion(name: string): number | null {
  const m = /^tc2-v(\d+)-/.exec(name);
  return m ? Number(m[1]) : null;
}

/** One file of the build, with its size in bytes and its SHA-256 (hex) as built (files.json). */
export type BuildFile = { readonly path: string; readonly size: number; readonly sha256: string };
