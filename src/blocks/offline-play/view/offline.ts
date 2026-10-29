// Offline play in the page (OFFLINE-01 to OFFLINE-03, ui/loading.md): the first load's LOADING lines while the service worker
// keeps the files, then the game opens; a browser that keeps every file opens at once; a new version is looked for online.
import { printout, type Printout } from "../../../platform/pieces/printout";
import type { Shell } from "../../../platform/shell";
import { shared } from "../../../platform/tokens";
import { wait } from "../../../platform/motion";
import type { OfflinePlay } from "../api";
import { BUILD } from "../logic/build";
import { CANNOT_STORE, KEPT_FILES, LOAD_STEP, LOADING, NO_SIGNAL, cacheVersion, loadSteps } from "../logic/loading";

type FromWorker = { type: string; version: number; loaded?: number; total?: number };

/** The loading screen: the title, an empty control bar, and the teletype over the window (ui/loading.md). */
function loadingScreen(shell: Shell) {
  const lines: string[] = [];
  let paper: Printout | null = null;
  let printing = Promise.resolve();
  const frame = shell.frame("loading") ?? shell.define("loading", { title: "TRANSMISSION CONTROL 2", mount: (f) => f.setControls([]) });
  // The paper grows by a line each PrintLineTime; it prints silent, before the first tap (ART-17).
  const add = (text: string) => {
    printing = printing.then(async () => {
      lines.push(text);
      const next = printout({ lines: lines.map((t) => ({ text: t })) });
      const old = paper;
      paper = next;
      frame.showPaper(next);
      if (old) {
        next.printAtOnce();
        old.el.remove();
      } else void next.print();
      await wait(shared.PrintLineTime).done;
    });
  };
  return {
    show: () => shell.show("loading"),
    add,
    done: () => printing,
    get lines() {
      return [...lines];
    },
  };
}

/** OFFLINE-02: every file of the list kept, in a cache of this page's GameVersion. */
async function hasKeptFiles(): Promise<boolean> {
  try {
    for (const name of (await caches.keys()).filter((k) => cacheVersion(k) === BUILD.version)) {
      const cache = await caches.open(name);
      if ((await Promise.all(KEPT_FILES.map((p) => cache.match(p)))).every(Boolean)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function startOfflinePlay(o: { shell: Shell; scriptUrl?: string }): OfflinePlay {
  let cannotStore = false;
  let firstLoad = false;
  const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;

  const lookForNewVersion = async (): Promise<boolean> => {
    if (!sw) return false;
    try {
      const reg = await sw.getRegistration("./");
      if (!reg) return false;
      await reg.update();
      return !!(reg.installing || reg.waiting);
    } catch {
      return false;
    }
  };

  const ready = (async () => {
    if (!sw) {
      cannotStore = true;
      return;
    }
    // OFFLINE-02: a browser that keeps every file runs from them; OFFLINE-03: opened online, it looks for a new version, once.
    const active = sw.controller ?? (await sw.getRegistration("./").catch(() => undefined))?.active;
    if (active && (await hasKeptFiles())) {
      if (navigator.onLine) void lookForNewVersion();
      return;
    }
    // OFFLINE-01: the first load.
    firstLoad = true;
    const screen = loadingScreen(o.shell);
    screen.show();
    screen.add(LOADING);
    let printed = 0;
    let lost = false;
    const outcome = new Promise<boolean>((resolve) => {
      sw.addEventListener("message", (e: MessageEvent<FromWorker>) => {
        const m = e.data;
        if (!m || m.version !== BUILD.version) return;
        if (m.type === "tc2-progress" && m.loaded !== undefined && m.total !== undefined) {
          const steps = loadSteps(m.loaded, m.total, printed);
          if (steps.length) lost = false;
          for (const s of steps) screen.add(s);
          printed += steps.length * LOAD_STEP;
        } else if (m.type === "tc2-nosignal" && !lost) {
          lost = true;
          screen.add(NO_SIGNAL);
        } else if (m.type === "tc2-kept") resolve(true);
        else if (m.type === "tc2-failed") resolve(false);
      });
      sw.startMessages();
      sw.register(o.scriptUrl ?? "./sw.js", { scope: "./" }).then(
        async (reg) => {
          const w = reg.installing ?? reg.waiting ?? reg.active;
          if (!w) return resolve(false);
          if (w.state === "installed") return resolve(true);
          if (w.state === "activated") {
            // The worker active but its files gone (cleared or evicted): it keeps them again, and this page waits as at a first load.
            if (await hasKeptFiles()) resolve(true);
            else w.postMessage({ type: "tc2-keep", version: BUILD.version });
            return;
          }
          w.addEventListener("statechange", () => {
            if (w.state === "installed" || w.state === "activated") resolve(true);
            else if (w.state === "redundant") resolve(false);
          });
        },
        () => resolve(false),
      );
    });
    const kept = (await outcome) && (await hasKeptFiles());
    if (kept) for (const s of loadSteps(1, 1, printed)) screen.add(s);
    cannotStore = !kept;
    await screen.done();
  })();

  if (typeof window !== "undefined") {
    // OFFLINE-03: back online while open, look for a new version.
    window.addEventListener("online", () => void lookForNewVersion());
  }

  return {
    ready: ready.then(() => ({ firstLoad, cannotStore })),
    cannotStoreLine: () => (cannotStore ? CANNOT_STORE : null),
    lookForNewVersion,
  };
}
