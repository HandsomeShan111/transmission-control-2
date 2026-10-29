// Console frame (ART-04, ui/style.md Console frame): a Graphite frame round a
// recessed window with an Ink ground and an Orange rule of OutlineWeight along
// each inner edge. States: lit; standby (FEEL-12).
// Owner's change, in place of the design's two bars at the ends of the long
// side: the order bar is a strip above the window, as wide as the window, as
// tall as its text; the control bar runs along the bottom (portrait) or the
// right (landscape), the whole height. The control bar holds keys in seven
// fixed slots, the same place on every screen; a slot a screen does not use
// stays empty: 1 AUDIO, 2 ORDERS, 3 MEDALS, 4 ARCHIVE, 5 and 6 the screen's two
// actions, 7 RUN. Every key in the game takes one width and one height: the
// widest any declared key needs, a label wrapped onto up to three lines. One
// line of slots when all seven fit along the bar: 1 to 4 from the start, 5 and
// 6 after a gap, 7 alone at the far end. Otherwise two lines, four places each,
// evenly apart: 1 to 4 by the window; 5 and 6 under 1 and 2, 7 under 4.
import { feelCampaign } from "../tokens";
import type { Orientation, UiSizes } from "../scale";
import { h } from "./dom";
import { plate, type Plate } from "./plate";
import type { Printout } from "./printout";
import { switchPiece } from "./switch";

export type KeySlot = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** The control bar's fixed slots (owner's change). */
export const KEY = { audio: 1, orders: 2, medals: 3, archive: 4, actionA: 5, actionB: 6, run: 7 } as const satisfies Record<string, KeySlot>;

export interface FrameControl {
  el: HTMLElement;
  slot: KeySlot;
  /** A plate's label wrap, onto k lines; absent on switches. */
  wrap?: (lines: number) => boolean;
  readonly label?: string;
  /** Stays live while a printout lies on the screen (the AUDIO switch, REPORT-04). */
  liveUnderPaper?: boolean;
}

/** A plate as a key in its slot; its label read as it stands at each layout. */
export function key(p: Plate, slot: KeySlot): FrameControl {
  return {
    el: p.el,
    slot,
    wrap: (k) => p.wrap(k),
    get label() {
      return p.label;
    },
  };
}

/** A key any screen of the game may show: a plate's label (and its widest line under it), or a switch (with its lamp, AUDIO). */
export type KeyDecl = { label: string; sub?: string; switch?: "plain" | "lamp" };

const declared = new Map<string, KeyDecl>();
const idOf = (k: KeyDecl) => `${k.switch ?? "plate"}:${k.label}`;

/** Declares keys the game shows, so every key takes the size the largest of them needs, on every screen. */
export function declareKeys(...keys: KeyDecl[]): void {
  for (const k of keys) declared.set(idOf(k), { ...k, label: k.label.toUpperCase() });
}

type KeyMetrics = { w: number; h: number; lines: Map<string, number> };
let metricsCache: { id: string; m: KeyMetrics } | null = null;

/**
 * The one key size: as wide as the widest key at its narrowest (a label wrapped at spaces onto up to three lines), PlateSize at
 * least; each label then on the fewest lines that fit that width; as tall as the tallest of them.
 */
function keyMetrics(s: UiSizes, extra: KeyDecl[]): KeyMetrics {
  const all = new Map(declared);
  for (const k of extra) if (!all.has(idOf(k))) all.set(idOf(k), k);
  const id = `${s.width}x${s.height}:${[...all.keys()].sort().join("|")}`;
  if (metricsCache?.id === id) return metricsCache.m;
  const probe = h("div", { "aria-hidden": "true" });
  probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;display:flex;align-items:flex-start";
  const items: { k: KeyDecl; lines: number; el: HTMLElement }[] = [];
  for (const k of all.values()) {
    if (k.switch) {
      const sw = switchPiece({ label: k.label, withLamp: k.switch === "lamp" });
      items.push({ k, lines: 1, el: sw.plate });
      probe.append(sw.el);
      continue;
    }
    for (let n = 1; n <= Math.min(3, k.label.split(" ").length); n++) {
      const p = plate({ label: k.label, ...(k.sub ? { sub: k.sub } : {}) });
      p.wrap(n);
      items.push({ k, lines: n, el: p.el });
      probe.append(p.el);
    }
  }
  document.body.append(probe);
  const sized = items.map((i) => ({ ...i, r: i.el.getBoundingClientRect() }));
  probe.remove();
  let w = s.PlateSize;
  for (const k of all.values()) w = Math.max(w, Math.min(...sized.filter((x) => x.k === k).map((x) => x.r.width)));
  w = Math.ceil(w);
  let hh = s.PlateSize;
  const lines = new Map<string, number>();
  for (const k of all.values()) {
    const fit = sized.filter((x) => x.k === k && x.r.width <= w + 0.01).sort((a, b) => a.lines - b.lines)[0]!;
    if (!k.switch) lines.set(k.label, fit.lines);
    hh = Math.max(hh, fit.r.height);
  }
  const m = { w, h: Math.ceil(hh), lines };
  metricsCache = { id, m };
  return m;
}

export interface ConsoleFrame {
  el: HTMLElement;
  orderBar: HTMLElement;
  window: HTMLElement;
  controlBar: HTMLElement;
  /** Printouts lie here: over the frame, clipped at the window's bottom edge. */
  paperLayer: HTMLElement;
  setTitle(text: string): void;
  setControls(controls: FrameControl[]): void;
  /** Lays out bars, controls and any printout for these sizes. */
  fit(sizes: UiSizes): void;
  showPaper(p: Printout): void;
  /** FEEL-12 standby: the console at StandbyLight, but for the parts given. */
  setStandby(on: boolean, undimmed?: HTMLElement[]): void;
  readonly orientation: Orientation;
}

export function consoleFrame(o: { id?: string; title?: string } = {}): ConsoleFrame {
  const orderBar = h("header", { class: "tc-obar", "data-part": "order-bar" });
  const win = h("main", { class: "tc-window", "data-piece": "window" });
  const controlBar = h("nav", { class: "tc-cbar", "data-part": "control-bar" });
  const paperLayer = h("div", { class: "tc-paperlayer" });
  const catcher = h("div", { class: "tc-catcher" });
  const el = h("div", { class: "tc-frame tc-portrait", "data-piece": "console-frame" }, orderBar, win, controlBar, catcher, paperLayer);
  if (o.id) el.dataset.screen = o.id;
  let controls: FrameControl[] = [];
  let orientation: Orientation = "portrait";
  let sizes: UiSizes | null = null;
  let paper: Printout | null = null;
  let standby: HTMLElement | null = null;

  catcher.addEventListener("click", () => paper?.tap());

  const placePaper = () => {
    if (!paper || !sizes) return;
    const fr = el.getBoundingClientRect();
    const wr = win.getBoundingClientRect();
    const cs = getComputedStyle(win);
    const bt = parseFloat(cs.borderTopWidth);
    const bb = parseFloat(cs.borderBottomWidth);
    const cb = controlBar.getBoundingClientRect();
    const bottom = wr.bottom - bb - fr.top;
    paperLayer.style.height = `${bottom}px`;
    paper.place({
      centreX: (wr.left + wr.right) / 2 - fr.left,
      bottom,
      top: wr.top + bt - fr.top,
      minX: 0,
      maxX: orientation === "landscape" ? cb.left - fr.left : fr.width,
    });
  };

  /** A control's plate: the control itself, or the one plate it holds (a slot's host, a switch with its lamp). */
  const plateOf = (c: FrameControl): HTMLElement | null => (c.el.matches(".tc-plate") ? c.el : c.el.querySelector<HTMLElement>(".tc-plate"));

  // While a printout lies on the screen only the controls live under paper answer (AUDIO, REPORT-04): the others' plates are
  // inert, out of reach by key as the catcher puts them out of reach by pointer. The plates, not the controls: a slot's host
  // keeps its own inert (BOARD-04's lock), and a plate a host takes while the paper lies is made inert at the layout it brings.
  const deadened = new Set<HTMLElement>();
  const deaden = () => {
    for (const e of deadened) e.inert = false;
    deadened.clear();
    if (!paper) return;
    for (const c of controls) {
      c.el.classList.toggle("tc-abovepaper", !!c.liveUnderPaper);
      if (c.liveUnderPaper) continue;
      const plates = c.el.matches(".tc-plate") ? [c.el] : [...c.el.querySelectorAll<HTMLElement>(".tc-plate")];
      for (const e of plates.length ? plates : [c.el]) {
        e.inert = true;
        deadened.add(e);
      }
    }
  };
  const declOf = (c: FrameControl): KeyDecl | null => {
    const p = plateOf(c);
    const label = c.label ?? p?.dataset.label;
    if (!p || !label) return null;
    return p.classList.contains("tc-switch") ? { label, switch: p.querySelector(".tc-lens") ? "lamp" : "plain" } : { label };
  };

  const layout = () => {
    if (!sizes) return;
    const s = sizes;
    const m = keyMetrics(
      s,
      controls.map(declOf).filter((d): d is KeyDecl => d !== null),
    );
    const g = s.PlateGap;
    const portrait = orientation === "portrait";
    const along = portrait ? m.w : m.h;
    const across = portrait ? m.h : m.w;
    // Along the bar, PlateGap from each end and between keys, twice that before slot 5, PlateGap at least before slot 7.
    const one = 7 * along + 9 * g <= (portrait ? s.width : s.height) + 0.5;
    const K = `${along}px`;
    const G = `${g}px`;
    const F = `minmax(${g}px,1fr)`;
    const alongTracks = one ? [K, G, K, G, K, G, K, `${2 * g}px`, K, G, K, F, K] : [K, F, K, F, K, F, K];
    const acrossTracks = one ? [`${across}px`] : [`${across}px`, G, `${across}px`];
    const at: Record<KeySlot, [line: number, track: number]> = one
      ? { 1: [1, 1], 2: [1, 3], 3: [1, 5], 4: [1, 7], 5: [1, 9], 6: [1, 11], 7: [1, 13] }
      : { 1: [1, 1], 2: [1, 3], 3: [1, 5], 4: [1, 7], 5: [3, 1], 6: [3, 3], 7: [3, 7] };
    controlBar.style.gridTemplateColumns = (portrait ? alongTracks : acrossTracks).join(" ");
    controlBar.style.gridTemplateRows = (portrait ? acrossTracks : alongTracks).join(" ");
    for (const c of controls) {
      const label = c.label;
      if (c.wrap && label) c.wrap(m.lines.get(label.toUpperCase()) ?? 1);
      const p = plateOf(c);
      if (p) {
        p.style.width = `${m.w}px`;
        p.style.height = `${m.h}px`;
      }
      const [line, track] = at[c.slot];
      c.el.style.gridRow = String(portrait ? line : track);
      c.el.style.gridColumn = String(portrait ? track : line);
      c.el.dataset.key = String(c.slot);
    }
    // In slot order, so focus and a screen reader go through the keys as they stand. Moved only when that order changes, and
    // the focused key keeps focus: a key taken out and put back loses it (a run's start relays out the Board's keys).
    const order = [...controls].sort((a, b) => a.slot - b.slot).map((c) => c.el);
    if (order.length !== controlBar.children.length || order.some((e, i) => controlBar.children[i] !== e)) {
      const focused = document.activeElement instanceof HTMLElement && controlBar.contains(document.activeElement) ? document.activeElement : null;
      controlBar.replaceChildren(...order);
      if (focused?.isConnected) focused.focus({ preventScroll: true });
    }
    const lines = one ? 1 : 2;
    el.style.setProperty("--Bar", `${Math.max(s.ControlBar, lines * across + lines * g)}px`);
    el.dataset.keys = one ? "one line" : "two lines";
    deaden();
  };

  const frame: ConsoleFrame = {
    el,
    orderBar,
    window: win,
    controlBar,
    paperLayer,
    setTitle(text) {
      orderBar.replaceChildren(h("h1", { class: "tc-title" }, text));
    },
    setControls(list) {
      controls = list;
      layout();
      deaden();
    },
    fit(next) {
      sizes = next;
      orientation = next.orientation;
      el.classList.toggle("tc-portrait", orientation === "portrait");
      el.classList.toggle("tc-landscape", orientation === "landscape");
      layout();
      placePaper();
    },
    showPaper(p) {
      paper = p;
      paperLayer.append(p.el);
      el.classList.add("tc-paperup");
      deaden();
      placePaper();
      // FEEL-17: the screen is free from the paper's close, as its tear starts (REPORT-04, VIEW-05), or once it is gone.
      const done = () => {
        if (p.state !== "tearing" && p.state !== "closed") return;
        if (paper === p) {
          paper = null;
          el.classList.remove("tc-paperup");
          deaden();
        }
      };
      const obs = new MutationObserver(() => {
        done();
        if (!p.el.isConnected) obs.disconnect();
      });
      obs.observe(paperLayer, { childList: true });
      obs.observe(p.el, { attributes: true, attributeFilter: ["class"] });
    },
    setStandby(on, undimmed = []) {
      for (const e of el.querySelectorAll(".tc-undimmed")) e.classList.remove("tc-undimmed");
      standby?.remove();
      standby = null;
      if (!on) return;
      standby = h("div", { class: "tc-standby", "data-part": "standby-dim" });
      standby.style.opacity = String(1 - feelCampaign.StandbyLight);
      el.append(standby);
      for (const e of undimmed) e.classList.add("tc-undimmed");
    },
    get orientation() {
      return orientation;
    },
  };
  if (o.title) frame.setTitle(o.title);
  return frame;
}
