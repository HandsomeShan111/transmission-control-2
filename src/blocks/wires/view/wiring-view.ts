// Wires on the board: drawing the wiring and editing it by hand (WIRE-01 to WIRE-07), with its feel (FEEL-01 to FEEL-03,
// FEEL-14, FEEL-17). The board owns the pointer and the view; it hands each press here first, in board units.
import type { Order } from "../../orders/api";
import { pageEvents } from "../../../platform/events";
import { dipKeyframes, popKeyframes, tween, type Motion } from "../../../platform/motion";
import { growRing, ring, ringRadiusFor, s, wirePath, wireTrace, type Wire as WirePiece, type WireKind as PieceKind } from "../../../platform/pieces";
import type { SoundSystem } from "../../../platform/sound";
import { art, feel } from "../../../platform/tokens";
import type { History, Wiring } from "../api";
import { cut as cutWire, moveEnd, openHistory, plug, record, reset as resetHistory, setWiring, undo as undoHistory, wireKind } from "../logic/wires";
import { cutAt, hitAt, hops, inEndAt, length, LOOP_ROUND, nearestFirst, outJackAt, routeWiring, type Point, type WireGeometry } from "./geometry";

/** Wires parameters at their start values (board/wires.md): fractions of JackMinSize. */
export const WIRE_PARAMS = { EndReach: 0.5, EndLength: 1 } as const;

export type WiringLayers = {
  /** Over the faces' base, under their label plates. */
  readonly wires: SVGGElement;
  /** Over the label plates, under their text: each wire's trace, clipped to a plate. */
  readonly traces: SVGGElement;
  /** Over the jacks: lit, seat and draw rings. */
  readonly rings: SVGGElement;
  /** On top: the held wire. */
  readonly held: SVGGElement;
};

export type WiringViewOptions = {
  readonly order: Order;
  readonly geometry: WireGeometry;
  readonly layers: WiringLayers;
  /** The clipPath id of an agent's label plate, by label. */
  readonly plateClip: (label: string) => string;
  /** A jack's plate, for its dip: output jacks and input jacks by wire name. */
  readonly plateOf: (jack: string, side: "out" | "in") => SVGElement | null;
  /** An output terminal's panel, for its dip, and its size. */
  readonly panelOf: (destination: string) => { el: SVGElement; size: number } | null;
  /** Ties in ring order: column then lane order, output terminals after the last column (FEEL-01). */
  readonly rank: (end: string) => number;
  readonly start: Wiring;
  /** An undo history to carry on with (the board turned with the screen); its current wiring wins over `start`. */
  readonly history?: History;
  readonly sound: SoundSystem | null;
  /** CSS pixels per board unit now. */
  readonly zoom: () => number;
  readonly jackMinSize: number;
  /** After every change of the wiring. */
  readonly onChange?: (wiring: Wiring) => void;
};

/** A press the wires took: the board moves it and ends it. */
export interface WireGesture {
  move(p: Point): void;
  /** `moved`: the press travelled past the tap slop. */
  end(p: Point, moved: boolean): void;
  cancel(): void;
  /** Where the held end is now, for edge pan; null while nothing is dragged. */
  readonly dragging: boolean;
}

export interface WiringView {
  readonly wiring: Wiring;
  readonly history: History;
  /** A wire held by a tap, waiting for its second tap. */
  readonly holding: boolean;
  /** WIRE-02 to WIRE-05: a press at a board point. Null: the wires take no part in it; the board pans. */
  press(p: Point): WireGesture | null;
  /** A tap the board saw on empty board, a face or a wire's middle: a held wire lets go (WIRE-02). */
  tapElsewhere(): void;
  /** The pointer over the board with no button down: a wire held by a tap follows it. */
  hover(p: Point): void;
  /** WIRE-06; false when nothing was left to undo (the key then clicks not). */
  undo(): boolean;
  /** WIRE-07; false when the wiring was the opening already. */
  reset(): boolean;
  /** FEEL-17, RUN: draw-outs jump to their end; retracts play on. */
  settleDrawOuts(): void;
  /** A held wire lets go, at once, no sound (the lock). */
  letGo(): void;
  /** A wire's route by its output jack, for the run view; null when that jack has no wire. */
  routeOf(from: string): Point[] | null;
  /** The drawn wire from an output jack, for its dash march (FEEL-06). */
  marchOf(from: string): ((units: number) => void) | null;
  destroy(): void;
}

const keyOf = (w: { from: string; to: string }) => `${w.from}\u0000${w.to}`;

export function wiringView(o: WiringViewOptions): WiringView {
  const g = o.geometry;
  let hist: History = o.history ?? openHistory(o.order, o.start);
  // The order's current wiring is the one on the board from the moment it opens (BOARD-01: a kept wiring in its place).
  setWiring(o.order.n, hist.current, hist.past);
  let routes: Point[][] = [];
  /** Wires drawn by a motion, not by draw(): keys of from + to. */
  const animated = new Set<string>();
  const motions = new Set<Motion>();
  const drawOuts = new Set<Motion>();
  const pieces = new Map<string, { piece: WirePiece; traces: (SVGPathElement & { setDashOffset(u: number): void })[] }>();
  let heldTap: string | null = null;
  let litRings: SVGGElement[] = [];
  let heldEl: SVGGElement | null = null;

  const kindOf = (from: string): PieceKind => {
    const k = wireKind(o.order, from);
    return k.kind === "data" ? "data" : k.sign;
  };

  const boxOf = (pts: readonly Point[]) => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };

  const tracesFor = (kind: PieceKind, pts: Point[], round: number) => {
    const b = boxOf(pts);
    const out: (SVGPathElement & { setDashOffset(u: number): void })[] = [];
    for (const [label, r] of g.faces) {
      if (b.x1 < r.x || b.x0 > r.x + r.w || b.y1 < r.y || b.y0 > r.y + r.h) continue;
      out.push(wireTrace({ kind, points: pts, round, clipId: o.plateClip(label) }));
    }
    return out;
  };

  /** A wire's route among the wires of its wiring (WIRE-01). */
  const routeIn = (wiring: Wiring, w: { from: string; to: string }) => routeWiring(g, wiring)[wiring.findIndex((x) => x.from === w.from && x.to === w.to)]!;

  const draw = () => {
    const w = hist.current;
    routes = routeWiring(g, w);
    o.layers.wires.replaceChildren();
    o.layers.traces.replaceChildren();
    pieces.clear();
    w.forEach((x, i) => {
      if (animated.has(keyOf(x))) return;
      const kind = kindOf(x.from);
      const pts = routes[i]!;
      const round = pts.length > 2 ? LOOP_ROUND : 0;
      const piece = wirePath({ kind, points: pts, hops: hops(routes, i, art.HopRadius * 2), round });
      piece.el.setAttribute("data-from", x.from);
      piece.el.setAttribute("data-to", x.to);
      piece.el.setAttribute("data-index", String(i));
      o.layers.wires.append(piece.el);
      const traces = tracesFor(kind, pts, round);
      o.layers.traces.append(...traces);
      pieces.set(x.from, { piece, traces });
    });
  };

  const changed = () => {
    setWiring(o.order.n, hist.current, hist.past);
    o.onChange?.(hist.current);
    pageEvents.emit("wiringChanged", { order: o.order.n });
  };

  // ---------- motions ----------

  const track = (m: Motion, set?: Set<Motion>) => {
    motions.add(m);
    set?.add(m);
    void m.done.then(() => {
      motions.delete(m);
      set?.delete(m);
    });
    return m;
  };

  const plateDips = new Map<Element, Animation>();
  /** FEEL-01 dip: a plate sinks JackDip and returns past rest by Rebound, within SettleTime; a dip anew ends the last (FEEL-17). */
  const dip = (el: Element | null, depth: number = feel.JackDip) => {
    if (!el) return;
    plateDips.get(el)?.finish();
    (el as SVGElement).style.transformBox = "fill-box";
    (el as SVGElement).style.transformOrigin = "center";
    const a = el.animate(dipKeyframes(depth), { duration: feel.SettleTime * 1000, easing: "linear" });
    plateDips.set(el, a);
  };
  const dipOut = (jack: string) => dip(o.plateOf(jack, "out"));
  const dipIn = (end: string) => {
    const panel = o.panelOf(end);
    // FEEL-01: a terminal's panel dips JackDip of its input jack's plate, not of its own size.
    if (panel) dip(panel.el, (feel.JackDip * o.jackMinSize) / panel.size);
    else dip(o.plateOf(end, "in"));
  };

  const play = (name: "plug" | "unplug") => o.sound?.play(name);

  /** FEEL-03: a wire retracts to its output jack over CutRetractTime; that plate dips. */
  const retract = (from: string, pts: Point[], onEnd?: () => void) => {
    const kind = kindOf(from);
    const total = length(pts);
    const el = s("g", { "data-part": "retracting", "data-from": from });
    o.layers.wires.append(el);
    const m = tween({
      duration: feel.CutRetractTime,
      update: (p) => {
        const left = total * (1 - p);
        el.replaceChildren(...(left > 0.5 ? [wirePath({ kind, points: cutAt(pts, left) }).el] : []));
      },
      end: () => {
        el.remove();
        dipOut(from);
        onEnd?.();
      },
    });
    return track(m);
  };

  /** FEEL-14: a wire draws out from its output jack over CutRetractTime, then seats as in FEEL-02. */
  const drawOut = (w: { from: string; to: string }, delay: number, sound: boolean) => {
    const k = keyOf(w);
    animated.add(k);
    const pts = routeIn(hist.current, w);
    const kind = kindOf(w.from);
    const total = length(pts);
    const el = s("g", { "data-part": "drawing-out", "data-from": w.from });
    o.layers.wires.append(el);
    const m = tween({
      duration: feel.CutRetractTime,
      delay,
      update: (p) => el.replaceChildren(...(p > 0 ? [wirePath({ kind, points: cutAt(pts, Math.max(1, total * p)) }).el] : [])),
      end: () => {
        el.remove();
        animated.delete(k);
        draw();
        seat(w, sound);
      },
    });
    return track(m, drawOuts);
  };

  /** FEEL-02 impact: the taking plate or panel dips, a seat ring grows and fades; a feedback wire's sign disc pops in; plug sound. */
  const seat = (w: { from: string; to: string }, sound: boolean) => {
    dipIn(w.to);
    const at = g.inJacks.get(w.to)!;
    track(growRing(o.layers.rings, at.x, at.y, g.jackRadius));
    const disc = pieces.get(w.from)?.piece.el.querySelector('[data-piece="sign-disc"]');
    if (disc) {
      (disc as SVGElement).style.transformBox = "fill-box";
      (disc as SVGElement).style.transformOrigin = "center";
      disc.animate(popKeyframes(), { duration: feel.PopTime * 1000, easing: "ease-out" });
    }
    if (sound) play("plug");
  };

  const settleAll = () => {
    for (const m of [...motions]) m.finish();
  };

  // ---------- rings ----------

  /** FEEL-01: every jack and terminal that takes the wire shows its ring, nearest the held jack first, LitStagger apart. */
  const light = (from: Point, ends: { name: string; at: Point }[]) => {
    unlight();
    const order = nearestFirst(
      from,
      ends.map((e) => ({ ...e, order: o.rank(e.name) })),
    );
    const byName = new Map(ends.map((e) => [e.name, e.at]));
    litRings = order.map((name, i) => {
      const at = byName.get(name)!;
      const r = ring({ cx: at.x, cy: at.y, r: ringRadiusFor(g.jackRadius), colour: "mustard", blink: true, delay: i * feel.LitStagger });
      r.el.setAttribute("data-lit", name);
      o.layers.rings.append(r.el);
      return r.el;
    });
  };
  const unlight = () => {
    for (const r of litRings) r.remove();
    litRings = [];
  };
  const inEnds = () => [...g.inJacks].map(([name, at]) => ({ name, at }));
  const outEnds = (except: string) => [...g.outJacks].filter(([n]) => n !== except).map(([name, at]) => ({ name, at }));

  // ---------- the held wire ----------

  const drawHeld = (from: string, tip: Point, anchor?: Point) => {
    heldEl?.remove();
    const start = anchor ?? g.outJacks.get(from)!;
    const piece = wirePath({ kind: kindOf(from), points: [start, tip], held: true });
    heldEl = piece.el;
    heldEl.setAttribute("data-part", "held-wire");
    heldEl.setAttribute("data-from", from);
    o.layers.held.append(heldEl);
  };
  const clearHeld = () => {
    heldEl?.remove();
    heldEl = null;
  };
  /** A tap-held wire with no pointer over the board: its tip a jack's width along the flow from its jack. */
  const stubTip = (from: string): Point => {
    const j = g.outJacks.get(from)!;
    const d = 3 * g.jackRadius;
    return g.flow === "landscape" ? { x: j.x + d, y: j.y } : { x: j.x, y: j.y + d };
  };

  const letGo = (retractFrom?: { from: string; tip: Point }) => {
    heldTap = null;
    unlight();
    clearHeld();
    // FEEL-01: a wire let go over no jack retracts as in FEEL-03, with no sound.
    if (retractFrom) retract(retractFrom.from, [g.outJacks.get(retractFrom.from)!, retractFrom.tip]);
  };

  const apply = (next: Wiring, removedFirst: { from: string; to: string } | null, placed: { from: string; to: string }) => {
    settleAll();
    const before = hist.current;
    hist = record(hist, next);
    if (removedFirst) {
      // FEEL-14: a replace retracts the old wire first; the new wire seats SettleTime after the old has gone.
      animated.add(keyOf(placed));
      draw();
      const oldPts = routeIn(before, removedFirst);
      play("unplug");
      retract(removedFirst.from, oldPts);
      const newPts = routeIn(next, placed);
      const kind = kindOf(placed.from);
      const el = s("g", { "data-part": "waiting-seat" }, wirePath({ kind, points: newPts }).el);
      o.layers.wires.append(el);
      track(
        tween({
          duration: 0,
          delay: feel.CutRetractTime + feel.SettleTime,
          update: () => {},
          end: () => {
            el.remove();
            animated.delete(keyOf(placed));
            draw();
            seat(placed, true);
          },
        }),
        drawOuts,
      );
    } else {
      draw();
      seat(placed, true);
    }
    changed();
  };

  /** WIRE-03: a held wire placed on an input end. */
  const plugTo = (from: string, to: string) => {
    const old = hist.current.find((w) => w.from === from) ?? null;
    const next = plug(o.order, hist.current, from, to);
    letGo();
    if (old && old.to === to) {
      // The same wire again: the wiring stands (record ignores it); it seats again.
      apply(next, null, { from, to });
      return;
    }
    apply(next, old, { from, to });
  };

  /** A press on an output jack: hold a new wire (WIRE-02), by drag or by tap. */
  const holdGesture = (jack: string, wasHeld: boolean): WireGesture => {
    settleAll();
    const j = g.outJacks.get(jack)!;
    dipOut(jack);
    light(j, inEnds());
    let tip = j;
    let dragging = false;
    return {
      get dragging() {
        return dragging;
      },
      move(p) {
        dragging = true;
        heldTap = null;
        tip = p;
        drawHeld(jack, p);
      },
      end(p, moved) {
        if (!moved) {
          // A tap: the wire stays held, waiting for a tap on an input end; a tap on its own held jack lets it go.
          if (wasHeld) {
            letGo();
            return;
          }
          heldTap = jack;
          drawHeld(jack, stubTip(jack));
          return;
        }
        const to = inEndAt(g, p);
        if (to) plugTo(jack, to);
        else letGo({ from: jack, tip });
      },
      cancel() {
        letGo();
      },
    };
  };

  /** A press on an input end or a terminal while a wire is held by a tap: the second tap (WIRE-03). */
  const secondTap = (from: string): WireGesture => {
    let dragging = false;
    return {
      get dragging() {
        return dragging;
      },
      move(p) {
        dragging = true;
        drawHeld(from, p);
      },
      end(p) {
        const to = inEndAt(g, p);
        if (to) plugTo(from, to);
        else letGo({ from, tip: p });
      },
      cancel() {
        letGo();
      },
    };
  };

  /** WIRE-04, WIRE-05: a wire dragged by one of its ends. */
  const endGesture = (index: number, end: "from" | "to"): WireGesture => {
    const w = hist.current[index]!;
    const k = keyOf(w);
    let dragging = false;
    let tip: Point = end === "from" ? g.outJacks.get(w.from)! : g.inJacks.get(w.to)!;
    const restore = () => {
      animated.delete(k);
      unlight();
      clearHeld();
    };
    return {
      get dragging() {
        return dragging;
      },
      move(p) {
        if (!dragging) {
          settleAll();
          dragging = true;
          animated.add(k);
          draw();
          const own = end === "from" ? g.outJacks.get(w.from)! : g.inJacks.get(w.to)!;
          light(own, end === "to" ? inEnds().filter((e) => e.name !== w.to) : outEnds(w.from));
        }
        tip = p;
        // FEEL-02, FEEL-03: the wire stretches to the dragged end.
        if (end === "to") drawHeld(w.from, p);
        else drawHeld(w.from, g.inJacks.get(w.to)!, p);
      },
      end(p) {
        if (!dragging) return; // WIRE-04: with no wire held, a tap on a wire's end does nothing.
        const target = end === "to" ? inEndAt(g, p) : outJackAt(g, p);
        const other = end === "to" ? outJackAt(g, p) : inEndAt(g, p);
        const own = end === "to" ? w.to : w.from;
        if (target && target !== own) {
          const old = end === "from" ? (hist.current.find((x) => x.from === target) ?? null) : null;
          const next = moveEnd(o.order, hist.current, index, end, target);
          const placed = end === "to" ? { from: w.from, to: target } : { from: target, to: w.to };
          restore();
          apply(next, old, placed);
          return;
        }
        if (target === own || other) {
          // WIRE-04: dropped on its own jack, or on a jack of the other side: the end goes back, as a cut wire retracts, no sound.
          const from = tip;
          const home = end === "to" ? g.inJacks.get(w.to)! : g.outJacks.get(w.from)!;
          clearHeld();
          unlight();
          const kind = kindOf(w.from);
          const el = s("g", { "data-part": "returning" });
          o.layers.held.append(el);
          track(
            tween({
              duration: feel.CutRetractTime,
              update: (q) => {
                const at = { x: from.x + (home.x - from.x) * q, y: from.y + (home.y - from.y) * q };
                el.replaceChildren(wirePath({ kind, points: end === "to" ? [g.outJacks.get(w.from)!, at] : [at, g.inJacks.get(w.to)!] }).el);
              },
              end: () => {
                el.remove();
                animated.delete(k);
                draw();
              },
            }),
          );
          return;
        }
        // WIRE-05: dropped on no jack: the wire is removed; it retracts to its output jack; unplug sound at release.
        const pts = end === "to" ? [g.outJacks.get(w.from)!, tip] : routeIn(hist.current, w);
        restore();
        hist = record(hist, cutWire(hist.current, index));
        draw();
        play("unplug");
        retract(w.from, pts);
        changed();
      },
      cancel() {
        restore();
        draw();
      },
    };
  };

  /** FEEL-14: wires removed retract to their output jacks; wires restored draw out after, and seat. One sound each way. */
  const transition = (next: History) => {
    settleAll();
    letGo();
    const before = hist.current;
    hist = next;
    const had = new Set(before.map(keyOf));
    const has = new Set(hist.current.map(keyOf));
    const removed = before.filter((w) => !has.has(keyOf(w)));
    const added = hist.current.filter((w) => !had.has(keyOf(w)));
    if (removed.length === 0 && added.length === 0) {
      draw();
      return;
    }
    for (const w of added) animated.add(keyOf(w));
    draw();
    if (removed.length) play("unplug");
    for (const w of removed) retract(w.from, routeIn(before, w));
    const delay = removed.length ? feel.CutRetractTime : 0;
    added.forEach((w, i) => drawOut(w, delay, i === 0));
    changed();
  };

  draw();

  const view: WiringView = {
    get wiring() {
      return hist.current;
    },
    get history() {
      return hist;
    },
    get holding() {
      return heldTap !== null;
    },
    press(p) {
      if (heldTap) {
        const from = heldTap;
        const jack = outJackAt(g, p);
        if (jack) return holdGesture(jack, jack === from);
        if (inEndAt(g, p)) return secondTap(from);
        return null;
      }
      const z = o.zoom();
      const hit = hitAt(g, hist.current, routes, p, {
        reach: (WIRE_PARAMS.EndReach * o.jackMinSize) / z,
        length: (WIRE_PARAMS.EndLength * o.jackMinSize) / z,
      });
      if (hit.kind === "out") return holdGesture(hit.jack, false);
      if (hit.kind === "end") return endGesture(hit.wire, hit.end);
      return null;
    },
    tapElsewhere() {
      if (heldTap) letGo();
    },
    hover(p) {
      if (heldTap) drawHeld(heldTap, p);
    },
    undo() {
      const next = undoHistory(hist);
      const changed = next !== hist;
      transition(next);
      return changed;
    },
    reset() {
      const next = resetHistory(hist);
      const changed = next !== hist;
      transition(next);
      return changed;
    },
    settleDrawOuts() {
      for (const m of [...drawOuts]) m.finish();
    },
    letGo() {
      letGo();
    },
    routeOf(from) {
      const i = hist.current.findIndex((w) => w.from === from);
      return i < 0 ? null : routes[i]!;
    },
    marchOf(from) {
      const p = pieces.get(from);
      if (!p) return null;
      return (u) => {
        p.piece.setDashOffset(u);
        for (const t of p.traces) t.setDashOffset(u);
      };
    },
    destroy() {
      settleAll();
      letGo();
      o.layers.wires.replaceChildren();
      o.layers.traces.replaceChildren();
      o.layers.rings.replaceChildren();
      o.layers.held.replaceChildren();
    },
  };
  return view;
}
