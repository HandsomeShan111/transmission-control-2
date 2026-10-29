/// <reference lib="webworker" />
// The service worker (OFFLINE-01 to OFFLINE-03), built to sw.js beside the page with this build's file list and GameVersion.
// - Install: fetches every file of the list into this version's cache, and keeps all or none: any failure, or a file whose bytes
//   are not the size and SHA-256 the build recorded, deletes the partial cache and fails the install. The first load's connection lost: "no signal" to the pages, and the load goes on when it
//   returns; a new version's download cut off fails, and the next look starts it over.
//   Every page of the game closed mid-load: the install stops, nothing is kept, and the next open starts over.
// - Keep again: a page finds this version's files gone (cleared or evicted) and asks ("tc2-keep"): the install's keeping runs
//   again into this version's cache, as at a first load, one at a time.
// - A new version installs beside the one playing and waits: it activates only once no page of the game is open (no skipWaiting),
//   so every page opened before then stays on the version playing. On activation the caches of earlier GameVersions are deleted;
//   with no other version installing or waiting, every other game cache too (a rebuild of one GameVersion is a cache of its own).
// - Fetch: the list's files from this version's cache; anything else goes to the network untouched, never fetched by the worker.
import { cacheName, cacheVersion, type BuildFile } from "../logic/loading";

declare const self: ServiceWorkerGlobalScope;
declare const TC2_SW: { readonly version: number; readonly listId: string; readonly files: readonly BuildFile[] };

const CACHE = cacheName(TC2_SW.version, TC2_SW.listId);
const FILES = new Map(TC2_SW.files.map((f) => [f.path, f]));
/** Retry gap while the connection is lost, and the least gap between two progress messages. */
const RETRY_MS = 1000;
const PROGRESS_MS = 100;

type ToPage =
  | { readonly type: "tc2-progress"; readonly version: number; readonly loaded: number; readonly total: number }
  | { readonly type: "tc2-nosignal"; readonly version: number }
  | { readonly type: "tc2-kept"; readonly version: number }
  | { readonly type: "tc2-failed"; readonly version: number };

/** The pages of the game open: windows under this worker's scope, controlled or not (other pages of the site are not the game). */
async function pages(): Promise<readonly Client[]> {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return all.filter((c) => c.url.startsWith(self.registration.scope));
}

async function post(m: ToPage): Promise<void> {
  for (const c of await pages()) c.postMessage(m);
}

class Closed extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One file's bytes, counted as they come. At a first load, a lost connection waits and tries again while a page of the game is open. */
async function fetchFile(f: BuildFile, firstLoad: boolean, onBytes: (n: number) => void, noSignal: () => void): Promise<Response> {
  for (;;) {
    let got = 0;
    try {
      const res = await fetch(new Request(f.path, { cache: "no-cache" }));
      if (!res.ok || !res.body) throw new Error(`${f.path}: ${res.status}`);
      const reader = res.body.getReader();
      const parts: Uint8Array[] = [];
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        parts.push(r.value);
        got += r.value.length;
        onBytes(r.value.length);
      }
      // Another build's file, or a page in its place: not this version's file.
      if (got !== f.size) throw new Error(`${f.path}: ${got} bytes, the build's ${f.size}`);
      const body = new Blob(parts as BlobPart[]);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await body.arrayBuffer()));
      const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
      if (hex !== f.sha256) throw new Error(`${f.path}: SHA-256 ${hex}, the build's ${f.sha256}`);
      const headers = new Headers({ "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream" });
      return new Response(body, { status: 200, headers });
    } catch (e) {
      onBytes(-got);
      // A server's refusal is a file not kept; only a lost connection waits.
      if (e instanceof Error && e.message.startsWith(`${f.path}:`)) throw e;
      // OFFLINE-03: a new version's download cut off is dropped; the next look starts it over.
      if (!firstLoad) throw e;
      if ((await pages()).length === 0) throw new Closed();
      noSignal();
      await sleep(RETRY_MS);
      if ((await pages()).length === 0) throw new Closed();
    }
  }
}

/** Every file of the list into this version's cache, all or none. `firstLoad`: a lost connection says NO SIGNAL and waits. */
async function keepFiles(firstLoad: boolean): Promise<void> {
  const total = TC2_SW.files.reduce((t, f) => t + f.size, 0);
  let loaded = 0;
  let last = 0;
  let lost = false;
  const progress = (force: boolean) => {
    const now = Date.now();
    if (!force && now - last < PROGRESS_MS) return;
    last = now;
    void post({ type: "tc2-progress", version: TC2_SW.version, loaded: Math.min(loaded, total), total });
  };
  try {
    await caches.delete(CACHE);
    const cache = await caches.open(CACHE);
    progress(true);
    for (const f of TC2_SW.files) {
      const res = await fetchFile(
        f,
        firstLoad,
        (n) => {
          loaded += n;
          if (n > 0) lost = false;
          progress(false);
        },
        () => {
          if (lost) return;
          lost = true;
          void post({ type: "tc2-nosignal", version: TC2_SW.version });
        },
      );
      if ((await pages()).length === 0) throw new Closed();
      await cache.put(new Request(f.path), res);
    }
    progress(true);
    await post({ type: "tc2-kept", version: TC2_SW.version });
  } catch (e) {
    await caches.delete(CACHE);
    await post({ type: "tc2-failed", version: TC2_SW.version });
    throw e;
  }
}

// A new version installs beside the one active: its download is no first load.
self.addEventListener("install", (e) => e.waitUntil(keepFiles(!self.registration.active)));

// OFFLINE-01: a page of this version found its files gone: kept again, as at a first load; a second ask waits on the first.
let keeping: Promise<void> | null = null;
self.addEventListener("message", (e) => {
  const m = e.data as { type?: unknown; version?: unknown } | null;
  if (m?.type !== "tc2-keep") return;
  // A page of another version: its files are not this worker's to keep.
  if (m.version !== TC2_SW.version) return void (e.source as Client | null)?.postMessage({ type: "tc2-failed", version: m.version });
  keeping ??= keepFiles(true)
    .catch(() => {})
    .finally(() => (keeping = null));
  e.waitUntil(keeping);
});

// Activation: the caches of earlier GameVersions go, never one a newer version still downloads into; with no other version
// installing or waiting, every other game cache goes. The first version claims the page that loaded it from the network, so that
// page counts as a page of the game open and a later version waits for it (OFFLINE-03); a later version activates with no page
// open, so its claim takes none.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const alone = !self.registration.installing && !self.registration.waiting;
        const old = keys.filter((k) => {
          const v = cacheVersion(k);
          return v !== null && k !== CACHE && (v < TC2_SW.version || alone);
        });
        return Promise.all(old.map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const rel = url.pathname.slice(scope.length) || "index.html";
  if (!FILES.has(rel)) return;
  e.respondWith(
    caches
      .open(CACHE)
      .then((c) => c.match(rel))
      .then((hit) => hit ?? fetch(req)),
  );
});
