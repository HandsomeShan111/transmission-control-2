// Web shell (system architecture, Web shell: frames every page): one page;
// shows one screen at a time inside the console frame; fits window and
// orientation changes. A screen's owner block defines it by id and fills its
// frame; the shell keeps each screen's frame and shows one.
import { cssVars, readSafeArea, uiSizes, type UiSizes, type Viewport } from "./scale";
import { watchVisibility } from "./motion";
import { consoleFrame, type ConsoleFrame } from "./pieces/frame";
import { installStyles } from "./pieces/styles";

export const SCREEN_IDS = ["loading", "title", "board", "orderList", "archive", "commendations"] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

export interface ScreenSpec {
  /** The order bar's title (loading.md, order-list.md, archive.md); the Board fills its own. */
  title?: string;
  /** Builds the screen inside its frame, once, when first defined. */
  mount(frame: ConsoleFrame): void;
  /** After every fit, with the sizes in force. */
  onFit?(sizes: UiSizes, frame: ConsoleFrame): void;
  onShow?(frame: ConsoleFrame): void;
  onHide?(frame: ConsoleFrame): void;
}

export interface Shell {
  root: HTMLElement;
  define(id: ScreenId, spec: ScreenSpec): ConsoleFrame;
  show(id: ScreenId): void;
  readonly current: ScreenId | null;
  frame(id: ScreenId): ConsoleFrame | undefined;
  /** The sizes in force for a screen (the current one by default). */
  sizes(id?: ScreenId): UiSizes;
  onFit(cb: (sizes: UiSizes) => void): () => void;
  /** Fits again now; resizes and orientation changes call it on the next frame. */
  fit(): void;
}

export interface ShellOptions {
  doc?: Document;
  /** Default: the window's inner size and the safe-area insets. */
  viewport?: () => Viewport;
}

/** The Board's order bar holds the order; every other screen's holds a title line (ui/style.md OrderBar). */
const titleOnly = (id: ScreenId) => id !== "board";

export function createShell(opts: ShellOptions = {}): Shell {
  const doc = opts.doc ?? document;
  installStyles(doc);
  watchVisibility(doc);
  const root = doc.createElement("div");
  root.className = "tc-shell";
  root.style.cssText = "position:fixed;inset:0;overflow:hidden;background:var(--Graphite)";
  doc.body.appendChild(root);
  const viewport =
    opts.viewport ??
    (() => ({ width: doc.documentElement.clientWidth || window.innerWidth, height: doc.documentElement.clientHeight || window.innerHeight, safe: readSafeArea(doc) }));
  const screens = new Map<ScreenId, { spec: ScreenSpec; frame: ConsoleFrame }>();
  const listeners = new Set<(s: UiSizes) => void>();
  let current: ScreenId | null = null;
  let pending = 0;

  const sizesFor = (id: ScreenId) => uiSizes(viewport(), { titleOnly: titleOnly(id) });

  const fitNow = () => {
    pending = 0;
    if (!current) return;
    const s = sizesFor(current);
    for (const [k, v] of Object.entries(cssVars(s))) doc.documentElement.style.setProperty(k, v);
    doc.documentElement.dataset.orientation = s.orientation;
    const entry = screens.get(current)!;
    entry.frame.fit(s);
    entry.spec.onFit?.(s, entry.frame);
    for (const cb of listeners) cb(s);
  };
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(fitNow);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  window.visualViewport?.addEventListener("resize", schedule);

  const shell: Shell = {
    root,
    define(id, spec) {
      if (screens.has(id)) throw new Error(`screen ${id} is already defined`);
      const frame = consoleFrame({ id, ...(spec.title ? { title: spec.title } : {}) });
      frame.el.hidden = true;
      root.appendChild(frame.el);
      screens.set(id, { spec, frame });
      spec.mount(frame);
      return frame;
    },
    show(id) {
      const next = screens.get(id);
      if (!next) throw new Error(`no screen ${id}`);
      if (current === id) return;
      if (current) {
        const prev = screens.get(current)!;
        prev.frame.el.hidden = true;
        prev.spec.onHide?.(prev.frame);
      }
      current = id;
      next.frame.el.hidden = false;
      doc.documentElement.dataset.screen = id;
      fitNow();
      next.spec.onShow?.(next.frame);
    },
    get current() {
      return current;
    },
    frame: (id) => screens.get(id)?.frame,
    sizes: (id) => sizesFor(id ?? current ?? "board"),
    onFit(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    fit: fitNow,
  };
  return shell;
}
