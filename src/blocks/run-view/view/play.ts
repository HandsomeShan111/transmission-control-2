// Run view: a trace played on the board, beat by beat (VIEW-01 to VIEW-07, FEEL-04 to FEEL-08, FEEL-10, FEEL-15).
// It only plays the trace: every place, mark and verdict comes from it. The board gives the stage: where things sit,
// the wires' routes, the lamps, the camera. Items move by transform only.
import type { Lamp } from "../../agents/api";
import { arrivalSign, firstDifferencePlaces, movingItem, rowItem, rowStamp, tileRing, type DrawContext } from "../../items/api";
import type { Order } from "../../orders/api";
import type { ItemSnapshot, Trace, TraceItem, Where } from "../../run/api";
import { easings, fastSoundTime, popKeyframes, tween, type Motion } from "../../../platform/motion";
import { growRing, s } from "../../../platform/pieces";
import type { SoundSystem } from "../../../platform/sound";
import { art, boardLayout as B, colours, columnGap, feel, feelCampaign, feelRun, objects, shared, typeStacks } from "../../../platform/tokens";

/** Run view parameters at their start values (board/run-view.md). */
export const VIEW_PARAMS = {
  BeatTime: shared.BeatTime,
  FastFactor: shared.FastFactor,
  AutoFastBeat: 20,
  ViewMoveTime: shared.ViewMoveTime,
  ViewHold: 1.0,
  ViewMargin: 80,
} as const;

export type Point = { readonly x: number; readonly y: number };
export type View = { readonly z: number; readonly c: Point };

export interface RunCamera {
  view(): View;
  set(v: View): void;
  /** VIEW-02: the followed point is within ViewMargin of an edge with more board beyond, or out of the window. */
  needsFollow(p: Point): boolean;
  /** The view with p at the window's middle, or the board's end at the window's edge when that comes first. */
  centreOn(p: Point): View;
  /** VIEW-02 last framing, given the terminals whose foot row shows. */
  lastFraming(feet: ReadonlySet<string>): View;
}

export type Stage = {
  readonly order: Order;
  readonly flow: "landscape" | "portrait";
  /** The input terminal's slot of a batch item, by place from 1. */
  readonly slot: (place: number) => Point;
  /** An agent's input jack, or a destination's terminal jack. */
  readonly inJack: (end: string) => Point;
  readonly outJack: (jack: string) => Point;
  /** The result row of an item (ITEM-04): its destination and the result's centre; null: no row for it. */
  readonly row: (id: string) => { readonly destination: string; readonly result: Point; readonly required: Point } | null;
  /** A terminal's foot row: its result centre; `show` draws the foot row on the terminal. */
  readonly foot: (destination: string, show: boolean) => Point;
  readonly route: (from: string, to: string) => Point[];
  /** The dash march of a feedback wire, by its output jack. */
  readonly march: (from: string) => ((units: number) => void) | null;
  /** A face's lamp and its lens centre. */
  readonly lamp: (label: string) => { readonly set: (s: Lamp) => void; readonly at: Point; readonly radius: number } | null;
  readonly alarm: { readonly set: (lit: boolean) => void };
  /** The board's still drawing of a batch item in its input slot (BOARD-01), hidden once the item leaves. */
  readonly slotBody: (place: number) => SVGElement | null;
  readonly layers: {
    /** Moving and waiting items: over the jacks and the output terminals; none moves while the room dims (FEEL-10). */
    readonly items: SVGGElement;
    /** Stopped and lost items: over the room dim (FEEL-10). */
    readonly lit: SVGGElement;
    /** Results, signs and stamps at the output terminals: over the room dim. */
    readonly results: SVGGElement;
    /** Rings of jacks and lamps. */
    readonly rings: SVGGElement;
  };
  /** FEEL-10 room dim: the fraction of light taken, 0 for none. */
  readonly roomDim: (taken: number) => void;
  readonly camera: RunCamera;
  readonly draw: DrawContext;
  readonly sound: SoundSystem | null;
  /** After each beat shows: for the board's test marks. */
  readonly onBeat?: (n: number, speed: "normal" | "fast") => void;
  readonly doc?: Document;
};

export interface Playback {
  /** Resolves once the view holds the last framing (VIEW-02, VIEW-03). */
  readonly done: Promise<void>;
  readonly fast: boolean;
  readonly skipped: boolean;
  /** Where the run stands, to carry it on after the board is drawn again (BOARD-02: the screen turned mid-run). */
  readonly at: Resume;
  /** VIEW-03: fast-forward, or back to normal speed. */
  toggleFast(): void;
  /** VIEW-03: every remaining beat at once; the last framing in one move of ViewMoveTime / FastFactor. */
  skip(): void;
  /** VIEW-04, FEEL-10: the full alarm. Resolves when the report should print; `true` when a tap cut it short. */
  alarm(): Promise<boolean>;
  /** A tap during the alarm. */
  tap(): void;
  /** VIEW-05, FEEL-16: items fade out where they stand over ItemLeaveTime; lamps fall. */
  leave(): Motion;
  /** Everything at once: no item, no lamp (a new order opens). */
  destroy(): void;
}

type Visual = { id: string; g: SVGGElement; inner: SVGGElement; kind: string; marks: readonly string[]; rejected: boolean; at: Point };

type Step = {
  id: string;
  path: Point[];
  lengths: number[];
  total: number;
  /** Leaves a jack this beat: lifts as its glide starts (FEEL-04). */
  lifts: boolean;
  from: string | null;
  arrive: { destination: string } | null;
  stop: string | null;
  lost: boolean;
  newCopyOf: string | null;
};

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function polyline(path: Point[]): { lengths: number[]; total: number } {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1]! + dist(path[i - 1]!, path[i]!));
  return { lengths, total: lengths[lengths.length - 1]! };
}

function pointOn(st: Step, f: number): Point {
  if (st.path.length === 1 || st.total === 0) return st.path[st.path.length - 1]!;
  const d = Math.max(0, Math.min(1, f)) * st.total;
  for (let i = 1; i < st.path.length; i++) {
    if (d <= st.lengths[i]! || i === st.path.length - 1) {
      const seg = st.lengths[i]! - st.lengths[i - 1]!;
      const t = seg ? (d - st.lengths[i - 1]!) / seg : 1;
      const a = st.path[i - 1]!;
      const b = st.path[i]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return st.path[st.path.length - 1]!;
}

/** Design silent: queued items stand 44 apart against the flow, behind the jack. */
const QUEUE_STEP = 44;
/**
 * Design silent on several items stopped at one output jack: each stands in the column gap past its jack, its drawing
 * centred between that jack and the next column's input jack, clear of both. Several fan across the flow in the order
 * they stop, STOP_GAP apart: the first on the jack's line, then one to each side in turn. A jack of a pair (plus and
 * minus, item and copy) fans away from its partner only, its first item half a step out from the face's middle.
 */
const STOP_GAP = 8;

/** A run carried on from a time of it, in run seconds at normal speed. */
export type Resume = { readonly t: number; readonly fast: boolean; readonly autoFastUsed: boolean; readonly skipped: boolean; readonly finished: boolean };

export function play(trace: Trace, stage: Stage, from?: Resume): Playback {
  const P = VIEW_PARAMS;
  const BT = P.BeatTime;
  const doc = stage.doc ?? document;
  const land = stage.flow === "landscape";
  const back = (p: Point, k: number): Point => (land ? { x: p.x - k * QUEUE_STEP, y: p.y } : { x: p.x, y: p.y - k * QUEUE_STEP });
  // Stopped items at an output jack: a place each, kept from the beat it stops (design silent, STOP_GAP below).
  const stopK = new Map<string, number>();
  const stopN = new Map<string, number>();
  const stopPlace = (jack: string, id: string): Point => {
    let k = stopK.get(id);
    if (k === undefined) {
      k = stopN.get(jack) ?? 0;
      stopN.set(jack, k + 1);
      stopK.set(id, k);
    }
    const j = stage.outJack(jack);
    const tiles = shared.MarksShown * (objects.MarkTileSize + B.TileGap) - B.TileGap;
    const below = B.MovingBodySize / 2 + B.TileGap + objects.MarkTileSize;
    // A moving item's whole drawing: across the flow, and the middle of its extent along it, from its centre.
    const across = (land ? B.MovingBodySize / 2 + below : Math.max(B.MovingBodySize, tiles)) + STOP_GAP;
    const mid = land ? 0 : (below - B.MovingBodySize / 2) / 2;
    const side = / (plus|item)$/.test(jack) ? -1 : / (minus|copy)$/.test(jack) ? 1 : 0;
    const pair = shared.JackMinSize / 2 + B.OutputJackGap / 2;
    const off = side ? side * (across / 2 - pair + k * across) : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * across;
    const along = columnGap() / 2 - mid;
    return land ? { x: j.x + along, y: j.y + off } : { x: j.x + off, y: j.y + along };
  };
  const items = new Map<string, TraceItem>(trace.items.map((i) => [i.id, i]));
  const placeOfBatch = (id: string) => Number(id.split(".")[0]);
  const ctx = stage.draw;
  const beats = trace.beats;
  const N = beats.length;

  // ---------- places, per snapshot ----------
  const placesOf = (snap: readonly ItemSnapshot[], prev: Map<string, Point>): Map<string, Point> => {
    const out = new Map<string, Point>();
    const rejects = new Map<string, number>();
    for (const it of snap) {
      const w: Where = it.where;
      let p: Point;
      switch (w.at) {
        case "in":
          p = stage.slot(placeOfBatch(it.id));
          break;
        case "queue":
          p = back(stage.inJack(w.agent), w.pos);
          break;
        case "terminal": {
          const r = stage.row(it.id);
          p = r && r.destination === w.destination ? r.result : stage.foot(w.destination, false);
          break;
        }
        case "stopped": {
          if (w.jack === "IN") p = stage.slot(placeOfBatch(it.id));
          else {
            p = stopPlace(w.jack, it.id);
          }
          break;
        }
        case "rejected": {
          const k = rejects.get(w.agent) ?? 0;
          rejects.set(w.agent, k + 1);
          p = back(stage.inJack(w.agent), k);
          break;
        }
        case "lost":
          p = prev.get(it.id) ?? stage.slot(placeOfBatch(it.id));
          break;
      }
      out.set(it.id, p);
    }
    return out;
  };

  const start = trace.start ?? [];
  const places: Map<string, Point>[] = [placesOf(start, new Map())];
  for (let k = 0; k < N; k++) places.push(placesOf(beats[k]!.items ?? [], places[k]!));

  // ---------- the plan: each item's path in each beat ----------
  const plan: Map<string, Step>[] = [new Map()];
  for (let k = 1; k <= N; k++) {
    const b = beats[k - 1]!;
    const before = places[k - 1]!;
    const after = places[k]!;
    const steps = new Map<string, Step>();
    const copyOf = new Map<string, string>();
    for (const e of b.events) if (e.type === "copy") copyOf.set(e.copy, e.item);
    for (const it of b.items ?? []) {
      const id = it.id;
      const parent = copyOf.get(id);
      const p0 = before.get(id) ?? (parent ? before.get(parent)! : after.get(id)!);
      const p1 = after.get(id)!;
      const send = b.events.find((e) => e.type === "send" && e.item === id) as { from: string; to: string } | undefined;
      const stop = b.events.find((e) => e.type === "stop" && e.item === id) as { jack: string } | undefined;
      const arr = b.events.find((e) => e.type === "arrive" && e.item === id) as { at: string; terminal: boolean } | undefined;
      const lost = b.events.some((e) => e.type === "lost" && e.item === id);
      let path: Point[];
      if (send) {
        const r = stage.route(send.from, send.to);
        path = send.from === "IN" ? [p0, ...r, p1] : [p0, stage.outJack(send.from), ...r.slice(1), p1];
      } else if (stop) path = stop.jack === "IN" ? [p0] : [p0, stage.outJack(stop.jack), p1];
      else path = [p0, p1];
      const { lengths, total } = polyline(path);
      steps.set(id, {
        id,
        path,
        lengths,
        total,
        lifts: !!send || (!!stop && stop.jack !== "IN"),
        from: send?.from ?? null,
        arrive: arr && arr.terminal ? { destination: arr.at } : null,
        stop: stop?.jack ?? null,
        lost,
        newCopyOf: parent ?? null,
      });
    }
    plan.push(steps);
  }

  // ---------- state ----------
  let t = 0; // scaled seconds since the run started
  let done = 0; // beats completed
  let speed: "normal" | "fast" = "normal";
  let autoFastUsed = false;
  let skipped = false;
  let finished = false;
  let destroyed = false;
  let raf = 0;
  let last = 0;
  const visuals = new Map<string, Visual>();
  const results = new Map<string, SVGGElement>();
  /** Items at their output terminal: drawn there as results, no longer as moving items. */
  const arrived = new Set<string>();
  const stamps: SVGGElement[] = [];
  const feet = new Set<string>();
  const footCount = new Map<string, number>();
  const motions = new Set<Motion>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const marches = new Map<string, number>();
  let resolveDone!: () => void;
  const donePromise = new Promise<void>((r) => (resolveDone = r));
  const factor = () => (speed === "fast" ? P.FastFactor : 1);
  const dur = (sec: number) => sec / factor();
  const quiet = () => skipped || doc.hidden;

  const track = (m: Motion) => {
    motions.add(m);
    void m.done.then(() => motions.delete(m));
    return m;
  };
  const later = (sec: number, fn: () => void) => {
    if (sec <= 0) return fn();
    const h = setTimeout(() => {
      timers.delete(h);
      fn();
    }, sec * 1000);
    timers.add(h);
  };
  const tone = (name: "plus" | "minus" | "working" | "unplug", delay = 0) => {
    if (quiet() || !stage.sound) return;
    const f = factor();
    later(f > 1 ? fastSoundTime(delay, f) : delay, () => {
      if (!quiet()) stage.sound?.play(name, f > 1 ? { fast: f } : {});
    });
  };

  // ---------- drawing ----------
  const snapOf = (k: number, id: string): ItemSnapshot | undefined => (k === 0 ? start : (beats[k - 1]!.items ?? [])).find((i) => i.id === id);
  const waitingIn = (k: number, id: string) => {
    const w = snapOf(k, id)?.where;
    return !w || w.at === "in";
  };

  const redraw = (v: Visual) => {
    const inner = movingItem(v.kind, v.marks, ctx, v.rejected);
    v.inner.replaceWith(inner);
    v.inner = inner;
  };
  const place = (v: Visual, p: Point, lift = 0) => {
    v.at = p;
    v.g.setAttribute("transform", `translate(${p.x.toFixed(2)} ${(p.y - lift).toFixed(2)})`);
  };
  const visualFor = (id: string, snap: ItemSnapshot, at: Point): Visual => {
    let v = visuals.get(id);
    if (v) return v;
    const inner = movingItem(snap.kind, snap.marks, ctx, snap.rejected);
    const g = s("g", { "data-item": id }, inner);
    stage.layers.items.append(g);
    v = { id, g, inner, kind: snap.kind, marks: snap.marks, rejected: snap.rejected, at };
    visuals.set(id, v);
    place(v, at);
    return v;
  };

  /** FEEL-05: the mark tile lands; a kind change swaps the old body for the new over KindSwapTime. */
  const workCue = (v: Visual, snap: ItemSnapshot, cues: boolean) => {
    const kindChanged = snap.kind !== v.kind;
    const markAdded = snap.marks.length !== v.marks.length;
    const old = v.inner;
    v.kind = snap.kind;
    v.marks = snap.marks;
    v.rejected = snap.rejected;
    redraw(v);
    if (!cues) return;
    if (kindChanged) {
      const ghost = old.cloneNode(true) as SVGGElement;
      v.g.insertBefore(ghost, v.inner);
      v.inner.style.opacity = "0";
      track(
        tween({
          duration: dur(feelRun.KindSwapTime),
          update: (q) => {
            ghost.style.opacity = String(1 - q);
            v.inner.style.opacity = String(q);
          },
          end: () => {
            ghost.remove();
            v.inner.style.opacity = "";
          },
        }),
      );
    }
    if (markAdded) {
      const tiles = v.inner.querySelectorAll('[data-piece="mark-tile"]');
      const tile = tiles[tiles.length - 1] as SVGGElement | undefined;
      if (tile) {
        tile.style.transformBox = "fill-box";
        tile.style.transformOrigin = "center";
        tile.animate(popKeyframes(), { duration: dur(feel.PopTime) * 1000, easing: "ease-out" });
      }
    }
  };

  const setLamps = (k: number, cues: boolean) => {
    const lamps: Readonly<Record<string, Lamp>> = k === 0 ? {} : beats[k - 1]!.lamps;
    const acting = new Set(k === 0 ? [] : beats[k - 1]!.events.flatMap((e) => ("agent" in e ? [e.agent] : [])));
    for (const a of stage.order.agents) {
      const st = lamps[a.label] ?? "off";
      const lamp = stage.lamp(a.label);
      if (!lamp) continue;
      lamp.set(st);
      // FEEL-05, FEEL-06: an agent's lamp lights with a ring as it works or gives a verdict.
      if (cues && st !== "off" && acting.has(a.label)) track(growRing(stage.layers.rings, lamp.at.x, lamp.at.y, lamp.radius, dur(feel.RingTime)));
    }
  };

  /** A beat starts: lamps, work cues, copies, lifts; the beat's working and verdict sounds. */
  const startBeat = (k: number, cues: boolean) => {
    const b = beats[k - 1]!;
    setLamps(k, cues);
    const steps = plan[k]!;
    for (const st of steps.values()) {
      const snap = snapOf(k, st.id)!;
      // An item waiting at the input terminal is the board's drawing in its slot until it leaves.
      if (arrived.has(st.id)) continue;
      if (!visuals.has(st.id) && !st.from && !st.newCopyOf && waitingIn(k - 1, st.id)) continue;
      const v = visualFor(st.id, snap, st.path[0]!);
      if (st.from === "IN") {
        const body = stage.slotBody(placeOfBatch(st.id));
        if (body) body.style.visibility = "hidden";
      }
      const worked = b.events.some((e) => (e.type === "work" || e.type === "copy" || e.type === "reject") && e.item === st.id);
      if (worked || st.newCopyOf) workCue(v, snap, cues && worked);
    }
    if (!cues) return;
    const working = b.events.some((e) => e.type === "work" || e.type === "copy");
    const plus = b.events.some((e) => e.type === "check" && e.verdict === "plus");
    const minus = b.events.some((e) => (e.type === "check" && e.verdict === "minus") || e.type === "reject");
    if (working) tone("working");
    if (plus) tone("plus");
    if (minus) tone("minus");
  };

  const verdictsAt = (k: number) => k >= 1 && k <= N && beats[k - 1]!.events.some((e) => e.type === "check" || e.type === "reject");

  /** VIEW-07, FEEL-07: an item settles into its result row; its sign stamps; a wrong result rings its first difference. */
  const arriveCue = (id: string, destination: string, cues: boolean) => {
    const it = items.get(id)!;
    const v = visuals.get(id);
    const snap = snapOf(done, id)!;
    arrived.add(id);
    v?.g.remove();
    visuals.delete(id);
    const row = stage.row(id);
    const own = row && row.destination === destination;
    let at: Point;
    if (own) at = row.result;
    else {
      at = stage.foot(destination, true);
      feet.add(destination);
      footCount.set(destination, (footCount.get(destination) ?? 0) + 1);
      results.get(`foot:${destination}`)?.remove();
    }
    const g = s("g", { "data-result": id, "data-destination": destination, transform: `translate(${at.x} ${at.y})` });
    g.append(rowItem(snap.kind, snap.marks, ctx, snap.rejected));
    const sign = arrivalSign(it.matched ? "plus" : "minus");
    g.append(sign);
    g.setAttribute("data-sign", it.matched ? "plus" : "minus");
    if (!own) {
      // ITEM-04: the foot row, labelled "not ordered" or with the destination it was ordered for; more stack with a count.
      // Design silent on the label's place: above the marks, TileGap after the arrival sign's disc.
      const label = it.required ? it.required.destination : "not ordered";
      const n = footCount.get(destination)!;
      const lx = B.RowBodySize / 2 + (art.SignDiscSize * shared.JackMinSize) / 2 + B.TileGap;
      g.append(
        s(
          "text",
          { x: lx, y: -B.RowBodySize / 2 - 4, fill: colours.Cream, "font-family": typeStacks.SansStack, "font-weight": 700, "font-size": 11, "data-part": "foot-label" },
          n > 1 ? `${label} ×${n}` : label,
        ),
      );
    }
    stage.layers.results.append(g);
    results.set(own ? id : `foot:${destination}`, g);
    if (own && it.required) {
      const fd = firstDifferencePlaces(snap.marks, it.required.marks);
      if (fd) {
        const rr = tileRing(fd.result);
        g.append(rr);
        if (fd.required !== null) {
          const up = tileRing(fd.required);
          up.setAttribute("transform", `translate(0 ${-B.ResultPartHeight})`);
          g.append(up);
        }
        if (cues) {
          for (const r of g.querySelectorAll('[data-part="difference-ring"]')) {
            (r as SVGElement).style.transformBox = "fill-box";
            (r as SVGElement).style.transformOrigin = "center";
            r.animate([{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: dur(feelRun.DiffRingTime) * 1000, easing: "ease-out" });
          }
        }
      }
    }
    if (cues) {
      for (const el of [sign]) {
        el.style.transformBox = "fill-box";
        el.style.transformOrigin = "center";
        el.animate(popKeyframes(), { duration: dur(feel.PopTime) * 1000, easing: "ease-out" });
      }
      const body = g.firstElementChild as SVGGElement;
      body.animate(
        [
          { transform: "translate(0,0)" },
          { transform: `translate(0px, ${feelRun.ItemBump * B.RowBodySize}px)`, offset: 0.4 },
          { transform: `translate(0px, ${-feelRun.ItemBump * B.RowBodySize * feel.Rebound}px)`, offset: 0.75 },
          { transform: "translate(0,0)" },
        ],
        { duration: dur(feel.SettleTime) * 1000 },
      );
    }
  };

  /** FEEL-08: a stopped item's jack pulses once; the item dims from its halt over StopDimTime, and stays at StopLight. */
  const dimItem = (v: Visual, cues: boolean) => {
    stage.layers.lit.append(v.g);
    v.g.setAttribute("data-dimmed", "true");
    if (!cues) {
      v.g.style.opacity = String(feelRun.StopLight);
      return;
    }
    track(tween({ duration: dur(feelRun.StopDimTime), update: (q) => (v.g.style.opacity = String(1 - (1 - feelRun.StopLight) * q)) }));
  };

  const stampRow = (id: string, text: string) => {
    const row = stage.row(id);
    if (!row) return;
    const g = s("g", { "data-stamp": id, transform: `translate(${row.result.x} ${row.result.y})` }, rowStamp(text));
    stage.layers.results.append(g);
    stamps.push(g);
  };

  /** A beat is over: every item at its snapshot place; arrivals, stops and losses. */
  const endBeat = (k: number, cues: boolean) => {
    const steps = plan[k]!;
    const arrivals: string[] = [];
    let stopIndex = 0;
    let lostAny = false;
    for (const st of steps.values()) {
      const v = visuals.get(st.id);
      if (v) place(v, st.path[st.path.length - 1]!);
      if (st.arrive && !arrived.has(st.id)) arrivals.push(st.id);
    }
    // RUN-02: arrivals in batch order, each copy right behind its original.
    const orderOf = (id: string) => trace.items.findIndex((i) => i.id === id);
    arrivals.sort((a, b) => orderOf(a) - orderOf(b));
    const firstDelay = verdictsAt(k + 1) ? feelRun.ArrivalStagger : 0;
    arrivals.forEach((id, i) => {
      arriveCue(id, steps.get(id)!.arrive!.destination, cues);
      if (cues) tone(items.get(id)!.matched ? "plus" : "minus", firstDelay + i * feelRun.ArrivalStagger);
    });
    for (const st of [...steps.values()].sort((a, b) => orderOf(a.id) - orderOf(b.id))) {
      if (st.stop) {
        let v = visuals.get(st.id);
        if (!v && st.stop === "IN") {
          // RUN-04: stopped at the input terminal: it stays in its slot, and dims there.
          v = visualFor(st.id, snapOf(k, st.id)!, st.path[0]!);
          const body = stage.slotBody(placeOfBatch(st.id));
          if (body) body.style.visibility = "hidden";
        }
        if (cues) {
          const at = st.stop === "IN" ? stage.outJack("IN") : stage.outJack(st.stop);
          track(growRing(stage.layers.rings, at.x, at.y, shared.JackMinSize / 2, dur(feel.RingTime)));
          tone("unplug", stopIndex * feelRun.ArrivalStagger);
          stopIndex++;
        }
        if (v) dimItem(v, cues);
        const it = items.get(st.id)!;
        if (it.end.type === "stopped") stampRow(st.id, `STOPPED: ${(it.end.agent ?? "input terminal").toUpperCase()}`);
      }
      if (st.lost) {
        lostAny = true;
        let v = visuals.get(st.id);
        if (!v && waitingIn(k - 1, st.id)) {
          v = visualFor(st.id, snapOf(k, st.id)!, st.path[0]!);
          const body = stage.slotBody(placeOfBatch(st.id));
          if (body) body.style.visibility = "hidden";
        }
        if (v) dimItem(v, cues);
        stampRow(st.id, "LOST");
      }
    }
    if (lostAny && cues) tone("unplug");
    stage.onBeat?.(k, speed);
  };

  // ---------- follow (VIEW-02) ----------
  const order = trace.items;
  const endTime = (it: TraceItem) => it.endBeat * BT;
  /** Where an item is at a time of the run; null before it is made. Every snapshot holds every item that exists. */
  const posAt = (id: string, time: number): Point | null => {
    if (time <= 0 || N === 0) return places[0]!.get(id) ?? null;
    const k = Math.min(N, Math.ceil(time / BT));
    const st = plan[k]!.get(id);
    if (!st) return null;
    const f = (time - (k - 1) * BT) / BT;
    return pointOn(st, easings.glide(Math.max(0, Math.min(1, f))));
  };
  let follow = 0;
  let holdUntil = -1;
  let move: { from: View; to: View; t0: number; len: number } | null = null;
  let framing: "none" | "moving" | "held" = "none";
  const allEnd = Math.max(0, ...order.map(endTime));

  const startMove = (to: View, len: number) => {
    move = { from: stage.camera.view(), to, t0: t, len };
  };
  const stepMove = () => {
    if (!move) return;
    const q = move.len <= 0 ? 1 : Math.min(1, (t - move.t0) / move.len);
    const e = easings.smooth(q);
    const a = move.from;
    const b = move.to;
    stage.camera.set({ z: a.z + (b.z - a.z) * e, c: { x: a.c.x + (b.c.x - a.c.x) * e, y: a.c.y + (b.c.y - a.c.y) * e } });
    if (q >= 1) move = null;
  };

  const followStep = () => {
    if (framing !== "none") return;
    if (t >= allEnd && done >= N) {
      // Every item at its end: after ViewHold, the last framing in one move.
      if (holdUntil < 0) holdUntil = t + P.ViewHold;
      if (t >= holdUntil && !move) {
        framing = "moving";
        startMove(stage.camera.lastFraming(feet), P.ViewMoveTime);
      }
      return;
    }
    if (move || t < holdUntil) return;
    if (follow < order.length && endTime(order[follow]!) <= t) {
      // After an item reaches its end, the view stays ViewHold, then follows the next item not yet at its end.
      holdUntil = t + P.ViewHold;
      while (follow < order.length && endTime(order[follow]!) <= t) follow++;
      return;
    }
    const it = order[follow];
    if (!it) return;
    const p = posAt(it.id, t);
    if (!p) return;
    if (stage.camera.needsFollow(p)) {
      const aim = posAt(it.id, t + P.ViewMoveTime) ?? p;
      startMove(stage.camera.centreOn(aim), P.ViewMoveTime);
    }
  };

  // ---------- the loop ----------
  const marchStep = (dt: number) => {
    if (done >= N) return;
    for (const st of plan[done + 1]!.values()) {
      if (!st.from || !/ (plus|minus)$/.test(st.from)) continue;
      const m = stage.march(st.from);
      if (!m) continue;
      const off = (marches.get(st.from) ?? 0) + feelRun.DashMarchSpeed * dt;
      marches.set(st.from, off);
      m(off);
    }
  };

  const moveItems = () => {
    if (done >= N) return;
    const k = done + 1;
    const f = (t - done * BT) / BT;
    for (const st of plan[k]!.values()) {
      const v = visuals.get(st.id);
      if (!v) continue;
      const g = easings.glide(Math.max(0, Math.min(1, f)));
      // FEEL-04: a lift raises it ItemBump of its body and returns it within SettleTime, as its glide starts.
      const ft = f * BT;
      const lift = st.lifts && ft < feel.SettleTime ? Math.sin((Math.PI * ft) / feel.SettleTime) * feelRun.ItemBump * B.MovingBodySize : 0;
      place(v, pointOn(st, g), lift);
    }
  };

  const tick = (now: number) => {
    raf = 0;
    if (destroyed || finished) return;
    // Beats keep real time on a slow machine; a frame longer than a quarter second is a stall, not play.
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    t += dt * factor();
    while (done < N && t >= (done + 1) * BT) {
      done++;
      endBeat(done, true);
      if (done < N) startBeat(done + 1, true);
      // VIEW-03: a run still playing after AutoFastBeat beats plays fast on its own, once per run; one already fast stays fast.
      if (!autoFastUsed && done >= P.AutoFastBeat && done < N) {
        autoFastUsed = true;
        speed = "fast";
      }
    }
    moveItems();
    marchStep(dt * factor());
    stepMove();
    followStep();
    if (framing === "moving" && !move) {
      framing = "held";
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    resolveDone();
  };

  /** VIEW-03 skip, VIEW-06 hidden: every remaining beat resolves at once, with no lamp, ring or tone. */
  const resolveAll = () => {
    while (done < N) {
      if (done + 1 <= N) startBeat(done + 1, false);
      done++;
      endBeat(done, false);
    }
    t = Math.max(t, allEnd);
  };

  const onVisibility = () => {
    if (!doc.hidden || finished) return;
    // VIEW-06: the page hidden mid-run skips to its end, as skip does; the alarm and report wait for the page.
    skipped = true;
    resolveAll();
    move = null;
    stage.camera.set(stage.camera.lastFraming(feet));
    framing = "held";
    finish();
  };
  doc.addEventListener("visibilitychange", onVisibility);

  // Beat 0: every batch item at the input terminal (RUN-01). The first beat starts at once.
  setLamps(0, false);
  if (from) {
    // BOARD-02: the run plays on where it stood; the beats before stand at their end state, with no cue.
    speed = from.fast ? "fast" : "normal";
    autoFastUsed = from.autoFastUsed;
    skipped = from.skipped;
    const upTo = from.finished ? N : Math.min(N, Math.floor(from.t / BT));
    while (done < upTo) {
      startBeat(done + 1, false);
      done++;
      endBeat(done, false);
    }
    t = from.finished ? Math.max(from.t, allEnd) : from.t;
    if (from.finished) {
      stage.camera.set(stage.camera.lastFraming(feet));
      framing = "held";
      finish();
    } else if (done < N) startBeat(done + 1, false);
  } else if (N > 0) startBeat(1, true);
  last = performance.now();
  if (!finished && doc.hidden) onVisibility();
  else if (!finished) raf = requestAnimationFrame(tick);

  let alarmCut: (() => void) | null = null;

  const pb: Playback = {
    done: donePromise,
    get at() {
      return { t, fast: speed === "fast", autoFastUsed, skipped, finished };
    },
    get fast() {
      return speed === "fast";
    },
    get skipped() {
      return skipped;
    },
    toggleFast() {
      if (finished) return;
      // A speed change during a move or a hold scales what is left of it: moves and holds run on the scaled clock.
      // VIEW-03: after the auto fast-forward, a tap returns the run to normal speed for the rest of it: no second auto.
      speed = speed === "fast" ? "normal" : "fast";
    },
    skip() {
      if (finished) return;
      skipped = true;
      for (const h of timers) clearTimeout(h);
      timers.clear();
      resolveAll();
      move = null;
      framing = "moving";
      const from = stage.camera.view();
      const to = stage.camera.lastFraming(feet);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      track(
        tween({
          duration: P.ViewMoveTime / P.FastFactor,
          ease: easings.smooth,
          update: (e) => stage.camera.set({ z: from.z + (to.z - from.z) * e, c: { x: from.c.x + (to.c.x - from.c.x) * e, y: from.c.y + (to.c.y - from.c.y) * e } }),
          end: () => {
            framing = "held";
            finish();
          },
        }),
      );
    },
    alarm() {
      return new Promise<boolean>((resolve) => {
        const begin = () => {
          // FEEL-10: queued arrival and stop tones not yet started do not sound.
          for (const h of timers) clearTimeout(h);
          timers.clear();
          stage.alarm.set(true);
          const tonePlaying = stage.sound?.play("alarm") ?? null;
          let cut = false;
          const parts: Motion[] = [];
          const end = (byTap: boolean) => {
            if (cut) return;
            cut = true;
            alarmCut = null;
            for (const m of parts) m.cancel();
            if (byTap) tonePlaying?.stop();
            stage.roomDim(0);
            resolve(byTap);
          };
          alarmCut = () => end(true);
          const C = feelCampaign;
          const taken = 1 - C.RoomLight;
          parts.push(
            tween({
              duration: C.RoomDimTime,
              delay: C.AlarmToneTime,
              update: (q) => stage.roomDim(taken * q),
            }),
            tween({
              duration: C.RoomDimTime,
              delay: C.AlarmToneTime + C.AlarmSilenceTime - C.RoomDimTime,
              update: (q) => stage.roomDim(taken * (1 - q)),
            }),
            tween({ duration: 0, delay: C.AlarmToneTime + C.AlarmSilenceTime, update: () => {}, end: () => end(false) }),
          );
        };
        if (!doc.hidden) begin();
        else {
          const show = () => {
            if (doc.hidden) return;
            doc.removeEventListener("visibilitychange", show);
            alarmCut = null;
            begin();
          };
          doc.addEventListener("visibilitychange", show);
          // Cut before it sounds (another order opened): it never sounds.
          alarmCut = () => {
            doc.removeEventListener("visibilitychange", show);
            alarmCut = null;
            resolve(true);
          };
        }
      });
    },
    tap() {
      alarmCut?.();
    },
    leave() {
      doc.removeEventListener("visibilitychange", onVisibility);
      for (const m of [...motions]) m.finish();
      const els: SVGElement[] = [...[...visuals.values()].map((v) => v.g), ...results.values(), ...stamps];
      const from = els.map((e) => Number(e.style.opacity || 1));
      for (const a of stage.order.agents) stage.lamp(a.label)?.set("off");
      stage.alarm.set(false);
      return tween({
        duration: feelCampaign.ItemLeaveTime,
        update: (q) => els.forEach((e, i) => (e.style.opacity = String(from[i]! * (1 - q)))),
        end: () => pb.destroy(),
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      doc.removeEventListener("visibilitychange", onVisibility);
      for (const h of timers) clearTimeout(h);
      for (const m of [...motions]) m.finish();
      for (const v of visuals.values()) v.g.remove();
      for (const r of results.values()) r.remove();
      for (const st of stamps) st.remove();
      visuals.clear();
      results.clear();
      for (const d of feet) stage.foot(d, false);
      for (const a of stage.order.agents) stage.lamp(a.label)?.set("off");
      stage.alarm.set(false);
      stage.roomDim(0);
      for (let p = 1; p <= stage.order.batch.length; p++) {
        const body = stage.slotBody(p);
        if (body) body.style.visibility = "";
      }
      for (const [from] of marches) stage.march(from)?.(0);
      resolveDone();
    },
  };
  return pb;
}


