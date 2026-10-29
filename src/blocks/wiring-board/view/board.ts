// The Board screen (ui/board.md): order bar, window with the console, control bar. Opens an order (BOARD-01), turns with the
// screen (BOARD-02), pans and zooms like a map (BOARD-03), runs and locks (BOARD-04), plays the run and prints the report.
import { agent, family, markLook, markMetrics } from "../../agents/api";
import { rowItem } from "../../items/api";
import { order as orderOf, type Order } from "../../orders/api";
import { best, keepBest, parLampUnits, score as scoreOf, setBest, type ParLamp } from "../../par-and-score/api";
import { printReport, report as reportOf, reportId as idOf, type PrintedReport } from "../../reports/api";
import { run as runOrder, type Trace } from "../../run/api";
import { play, VIEW_PARAMS, type Playback, type Stage } from "../../run-view/api";
import { openHistory, route, undoSteps, wiring as heldWiring, wiringView, type History, type WireGesture, type WireGeometry, type Wiring, type WiringView } from "../../wires/api";
import { pageEvents } from "../../../platform/events";
import { easings, tween, type Motion } from "../../../platform/motion";
import {
  agentFace,
  alarmLamp,
  growRing,
  h,
  inputTerminal,
  KEY,
  key,
  declareKeys,
  lamp,
  outputTerminal,
  plate,
  s,
  switchPiece,
  type AgentFace,
  type AlarmLamp,
  type ConsoleFrame,
  type FrameControl,
  type Lamp,
  type Plate,
  type PrintLine,
  type Printout,
  type SilhouetteName,
} from "../../../platform/pieces";
import type { Shell } from "../../../platform/shell";
import { pageSlots, type SlotHost } from "../../../platform/slots";
import { art, boardLayout as B, colours, feelCampaign, shared, typeStacks } from "../../../platform/tokens";
import type { Board, BoardAddOn, BoardOptions, LastRun, OpenOptions } from "../api";
import { BOARD_SLOTS } from "../api";
import { clampView, edgePanVelocity, lastFraming, needsFollow, openingFraming, panBy, turnView, zoomAround, Z_MIN, type Size, type View } from "../logic/camera";
import { layout, wireGeometry, type Flow, type Layout, type Point } from "../logic/layout";

/** Design silent: a press that travels this far, CSS pixels, is a drag, not a tap. */
const TAP_SLOP = 8;

const STYLE = `
.tcb-head{display:flex;flex-wrap:wrap;align-items:center;column-gap:var(--PlateGap);row-gap:calc(var(--PlateGap) / 2)}
.tcb-name{font-weight:700}
.tcb-lamps{display:flex;flex-wrap:wrap;align-items:center;column-gap:var(--PlateGap);row-gap:calc(var(--PlateGap) / 2)}
.tcb-lamps:empty{display:none}
.tcb-text{margin-top:calc(var(--PlateGap) / 2)}
.tcb-slot{display:inline-flex;flex:none}
.tcb-slot:empty{display:none}
.tcb-svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none}
.tcb-locked .tcb-svg{cursor:default}
.tcb-svg [data-layer="held"],.tcb-svg [data-layer="rings"],.tcb-svg [data-layer="dim"]{pointer-events:none}
.tcb-locked .tcb-ctl-lock{pointer-events:none}
.tcb-locked .tcb-ctl-lock .tc-plate{background:var(--GraphiteLight);color:var(--Cream);border-color:var(--Cream)}
.tcb-runwrap{position:relative;display:inline-flex}
.tcb-standbyring{position:absolute;pointer-events:none;overflow:visible}
.tcb-overlay{position:absolute;inset:0;z-index:30}
`;

type Built = {
  order: Order;
  layout: Layout;
  faces: Map<string, AgentFace>;
  slotBodies: Map<number, SVGGElement>;
  terminals: Map<string, { el: SVGGElement; foot: boolean }>;
  alarm: AlarmLamp;
  wires: WiringView;
  geometry: WireGeometry;
};

export function board(shell: Shell, opts: BoardOptions = {}): Board {
  const sound = opts.sound ?? null;
  declareKeys({ label: "UNDO" }, { label: "FAST" }, { label: "RESET" }, { label: "SKIP" }, { label: "RUN", switch: "plain" });
  let frame: ConsoleFrame | null = null;
  let svg: SVGSVGElement;
  let root: SVGGElement;
  const L = {} as Record<
    "defs" | "input" | "faceBase" | "wires" | "facePlate" | "traces" | "faceTop" | "jacks" | "items" | "dim" | "outputs" | "results" | "alarm" | "lit" | "rings" | "held",
    SVGGElement
  >;
  let dimRect: SVGRectElement;
  let nameEl: HTMLElement;
  let lampsEl: HTMLElement;
  let textEl: HTMLElement;
  let secondHost: HTMLElement;
  let ordersHost: HTMLElement;
  let medalsHost: HTMLElement;
  let audioHost: HTMLElement;
  let undoPlate: Plate;
  let resetPlate: Plate;
  let runSwitch: ReturnType<typeof switchPiece>;
  let runWrap: HTMLElement;
  let built: Built | null = null;
  let current: number | null = null;
  let view: View = { z: 1, c: { x: 0, y: 0 } };
  let flow: Flow = "portrait";
  let locked = false;
  let standby: OpenOptions["standby"] | null = null;
  let guarded = false;
  let standbyRing: SVGSVGElement | null = null;
  let last: LastRun | null = null;
  let playback: Playback | null = null;
  let printed: PrintedReport | null = null;
  let isFiled: (order: number, reportId: string) => boolean = () => false;
  const addOns = new Set<BoardAddOn>();
  let parLamps: ParLamp[] = [];
  let addOnLamps: { label: string; lamp: Lamp; lit: boolean }[] = [];
  let viewMotion: Motion | null = null;
  let opening: Motion[] = [];
  let runState: "idle" | "running" | "alarm" | "printing" = "idle";
  /** The last run's items leaving (VIEW-05): it ends before anything else uses the board. */
  let leaving: Motion | null = null;
  /** VIEW-04: cuts the full alarm, on the playback that sounds it (the screen may have turned since). */
  let cutAlarm: (() => void) | null = null;

  // ---------- the window and the view ----------
  // The window's size, read on each fit and each change of the control bar: the only times it changes.
  let winSize: Size = { w: 0, h: 0 };
  const measureWin = () => {
    winSize = { w: frame?.window.clientWidth ?? 0, h: frame?.window.clientHeight ?? 0 };
  };
  const win = (): Size => winSize;
  const apply = () => {
    const w = win();
    root.setAttribute("transform", `translate(${(w.w / 2 - view.c.x * view.z).toFixed(2)} ${(w.h / 2 - view.c.y * view.z).toFixed(2)}) scale(${view.z.toFixed(4)})`);
    frame!.el.dataset.zoom = view.z.toFixed(4);
  };
  const setView = (v: View) => {
    view = built ? clampView(v, built.layout.bounds, win()) : v;
    apply();
  };
  const moveView = (to: View, seconds: number) => {
    viewMotion?.cancel();
    const from = view;
    viewMotion = tween({
      duration: seconds,
      ease: easings.smooth,
      update: (e) => {
        view = { z: from.z + (to.z - from.z) * e, c: { x: from.c.x + (to.c.x - from.c.x) * e, y: from.c.y + (to.c.y - from.c.y) * e } };
        apply();
      },
    });
    return viewMotion;
  };
  const toBoardPoint = (clientX: number, clientY: number): Point => {
    const r = svg.getBoundingClientRect();
    const w = win();
    return { x: view.c.x + (clientX - r.left - w.w / 2) / view.z, y: view.c.y + (clientY - r.top - w.h / 2) / view.z };
  };

  // ---------- mount ----------
  const slotHost = (el: HTMLElement, after: () => void): SlotHost<Node> => ({
    replaceChildren: (...nodes: Node[]) => {
      el.replaceChildren(...nodes);
      after();
    },
  });

  /** The control bar's keys in their slots (owner's change): AUDIO, ORDERS and MEDALS when filled, then the board's own. */
  const controls = (): FrameControl[] => {
    const list: FrameControl[] = [];
    if (audioHost.childNodes.length) list.push({ el: audioHost, slot: KEY.audio, liveUnderPaper: true });
    for (const [el, slot] of [
      [ordersHost, KEY.orders],
      [medalsHost, KEY.medals],
    ] as const)
      if (el.childNodes.length) list.push({ el, slot });
    list.push(key(undoPlate, KEY.actionA), key(resetPlate, KEY.actionB));
    list.push({ el: runWrap, slot: KEY.run });
    return list;
  };
  const relayout = () => {
    if (!frame) return;
    frame.setControls(controls());
    measureWin();
  };

  const mount = (f: ConsoleFrame) => {
    frame = f;
    if (!document.getElementById("tcb-styles")) document.head.append(h("style", { id: "tcb-styles" }, STYLE));
    nameEl = h("div", { class: "tcb-name", "data-part": "order-name" });
    lampsEl = h("div", { class: "tcb-lamps", "data-part": "order-lamps" });
    secondHost = h("span", { class: "tcb-slot", "data-slot": BOARD_SLOTS.secondWiringLamp });
    textEl = h("div", { class: "tcb-text", "data-part": "order-text" });
    // Owner's change: the name and the lamps on one line, the text under them.
    f.orderBar.replaceChildren(h("div", { class: "tcb-head" }, nameEl, lampsEl), textEl);
    ordersHost = h("span", { class: "tcb-slot tcb-ctl-lock", "data-slot": BOARD_SLOTS.ordersControl });
    medalsHost = h("span", { class: "tcb-slot tcb-ctl-lock", "data-slot": BOARD_SLOTS.medalsControl });
    audioHost = h("span", { class: "tcb-slot", "data-slot": BOARD_SLOTS.audioSwitch });
    undoPlate = plate({ label: "UNDO", onPress: () => onUndoFast() });
    resetPlate = plate({ label: "RESET", onPress: () => onResetSkip() });
    undoPlate.el.dataset.control = "undo";
    resetPlate.el.dataset.control = "reset";
    runSwitch = switchPiece({ label: "RUN", onFlip: () => onRunSwitch() });
    runSwitch.plate.dataset.control = "run";
    runWrap = h("span", { class: "tcb-runwrap" }, runSwitch.el);
    pageSlots.define(BOARD_SLOTS.ordersControl, slotHost(ordersHost, relayout), () => null);
    pageSlots.define(BOARD_SLOTS.medalsControl, slotHost(medalsHost, relayout), () => null);
    pageSlots.define(BOARD_SLOTS.audioSwitch, slotHost(audioHost, relayout), () => null);
    pageSlots.define(BOARD_SLOTS.secondWiringLamp, slotHost(secondHost, () => {}), () => null);
    relayout();

    svg = s("svg", { class: "tc-board tcb-svg", "data-part": "board" });
    root = s("g", { "data-part": "board-root" });
    // Moving and waiting items over the jacks and the output terminals; none moves while the room dims (FEEL-10).
    for (const k of Object.keys({ defs: 0, input: 0, faceBase: 0, wires: 0, facePlate: 0, traces: 0, faceTop: 0, jacks: 0, dim: 0, outputs: 0, results: 0, items: 0, alarm: 0, lit: 0, rings: 0, held: 0 }) as (keyof typeof L)[]) {
      L[k] = k === "defs" ? (s("defs") as unknown as SVGGElement) : s("g", { "data-layer": k });
      root.append(L[k]);
    }
    dimRect = s("rect", { x: -1e5, y: -1e5, width: 2e5, height: 2e5, fill: colours.Ink, opacity: 0, "data-part": "room-dim", "pointer-events": "none" });
    L.dim.append(dimRect);
    svg.append(root);
    f.window.append(svg);
    f.window.setAttribute("data-beat", "0");
    wireInput();
    f.el.addEventListener("pointerdown", onStandbyPointer, true);
    f.el.addEventListener("click", onStandbyClick, true);
  };

  // ---------- drawing an order ----------
  const metrics = () => markMetrics();
  const drawCtx = () => ({ look: markLook, metrics: metrics() });

  const footTerminal = (t: Layout["outputs"][number], foot: boolean) => {
    const el = outputTerminal({ label: t.destination, rows: t.rows.length, foot, flow, x: t.rect.x, y: t.rect.y }).el;
    el.setAttribute("data-terminal", t.destination);
    const j = el.querySelector('[data-piece="jack"]');
    j?.setAttribute("data-jack-id", t.destination);
    j?.setAttribute("data-side", "in");
    return el;
  };

  const build = (o: Order, start: Wiring, history?: History) => {
    // Every press belongs to the wiring view about to go: none may draw or save a wire after it.
    dropPresses();
    built?.wires.destroy();
    for (const k of ["defs", "input", "faceBase", "facePlate", "faceTop", "jacks", "items", "outputs", "results", "alarm", "lit", "rings", "held"] as const) L[k].replaceChildren();
    const l = layout(o, flow);
    const ctx = drawCtx();
    // Input terminal with the batch in its slots (BOARD-01).
    const tin = inputTerminal({ label: "INPUT", items: o.batch.length, flow, x: l.input.rect.x, y: l.input.rect.y });
    tin.el.setAttribute("data-terminal", "IN");
    tin.el.setAttribute("data-col", "0");
    const inJackEl = tin.el.querySelector('[data-piece="jack"]')!;
    inJackEl.setAttribute("data-jack-id", "IN");
    inJackEl.setAttribute("data-side", "out");
    inJackEl.setAttribute("data-col", "0");
    L.input.append(tin.el);
    L.jacks.append(inJackEl);
    const slotBodies = new Map<number, SVGGElement>();
    o.batch.forEach((b, i) => {
      const p = l.input.slots[i]!;
      // Design silent: the 100-wide input terminal has room for one tile beside a body; more marks show as the count tile.
      const g = rowItem(b.kind, b.marks, ctx, false, 1);
      g.setAttribute("transform", `translate(${p.x} ${p.y})`);
      g.setAttribute("data-slot-body", String(i + 1));
      g.setAttribute("data-col", "0");
      L.input.append(g);
      slotBodies.set(i + 1, g);
    });
    // Faces (AGENT-01).
    const faces = new Map<string, AgentFace>();
    l.faces.forEach((fp, idx) => {
      const a = agent(fp.name);
      const fam = family(a.family);
      const placed = o.agents.find((x) => x.label === fp.label)!;
      const face = agentFace({
        name: fp.label,
        family: fam.name,
        silhouette: fam.silhouette as SilhouetteName,
        rule: a.rule,
        role: a.role,
        ...(a.mark ? { mark: markLook(a.mark), metrics: metrics() } : {}),
        ...(placed.passLimit !== null ? { passLimitLabel: `MAX ${placed.passLimit} ${placed.passLimit === 1 ? "CHECK" : "CHECKS"} PER ITEM` } : {}),
        flow,
        x: fp.centre.x,
        y: fp.centre.y,
      });
      for (const part of [face.base, face.plate, face.top, face.jacks]) {
        part.setAttribute("data-agent", fp.label);
        part.setAttribute("data-col", String(fp.col));
      }
      for (const j of face.jacks.querySelectorAll("[data-jack]")) {
        const name = j.getAttribute("data-jack")!;
        j.setAttribute("data-jack-id", name === "in" || name === "out" ? fp.label : `${fp.label} ${name}`);
        j.setAttribute("data-side", name === "in" ? "in" : "out");
      }
      L.faceBase.append(face.base);
      L.facePlate.append(face.plate);
      L.faceTop.append(face.top);
      L.jacks.append(face.jacks);
      const clip = s("clipPath", { id: `tcb-plate-${idx}` }, s("path", { d: face.plateD, transform: `translate(${face.origin.x} ${face.origin.y})` }));
      L.defs.append(clip);
      faces.set(fp.label, face);
    });
    // Output terminals with each required output (BOARD-01, ITEM-04).
    const terminals = new Map<string, { el: SVGGElement; foot: boolean }>();
    const lastCol = Math.max(...l.faces.map((f) => f.col)) + 1;
    for (const t of l.outputs) {
      const el = footTerminal(t, false);
      el.setAttribute("data-col", String(lastCol));
      L.outputs.append(el);
      terminals.set(t.destination, { el, foot: false });
      for (const r of t.rows) {
        const b = o.batch[r.place - 1]!;
        const req = r.copy === 0 ? b.required : b.copies.find((c) => c.n === r.copy)!.required;
        const g = rowItem(req.kind, req.marks, ctx);
        g.setAttribute("transform", `translate(${r.required.x} ${r.required.y})`);
        g.setAttribute("data-required", r.item);
        g.setAttribute("data-col", String(lastCol));
        L.outputs.append(g);
        if (r.copy > 0) {
          // BOARD-01: a named copy's row is labelled with its original's kind and its copy number (design silent on where:
          // right-aligned at the row's end, over its required output).
          L.outputs.append(
            s(
              "text",
              {
                x: t.rect.x + t.rect.w - 8,
                y: r.required.y - B.ResultPartHeight / 2 + 12,
                "text-anchor": "end",
                fill: colours.Cream,
                "font-family": typeStacks.SansStack,
                "font-weight": 700,
                "font-size": 10,
                "data-part": "copy-label",
                "data-col": String(lastCol),
              },
              `${b.kind.toUpperCase()} COPY ${r.copy}`,
            ),
          );
        }
      }
    }
    const alarm = alarmLamp({ cx: l.alarm.x, cy: l.alarm.y });
    L.alarm.append(alarm.el);

    const geometry = wireGeometry(l);
    const rankOf = new Map<string, number>();
    [...l.faces].sort((a, b) => a.col - b.col || a.lane - b.lane).forEach((f, i) => rankOf.set(f.label, i));
    l.outputs.forEach((t, i) => rankOf.set(t.destination, 1000 + i));
    const faceIndex = new Map(l.faces.map((f, i) => [f.label, i]));
    const wires = wiringView({
      order: o,
      geometry,
      layers: { wires: L.wires, traces: L.traces, rings: L.rings, held: L.held },
      plateClip: (label) => `tcb-plate-${faceIndex.get(label)}`,
      plateOf: (jack, side) => root.querySelector(`[data-jack-id="${CSS.escape(jack)}"][data-side="${side}"] [data-part="plate"]`),
      panelOf: (d) => {
        const t = built?.terminals.get(d) ?? terminals.get(d);
        const panel = t?.el.querySelector('[data-part="panel"]') as SVGElement | null;
        return panel ? { el: panel, size: l.outputs.find((x) => x.destination === d)!.rect.w } : null;
      },
      rank: (e) => rankOf.get(e) ?? 0,
      start,
      ...(history ? { history } : {}),
      sound,
      zoom: () => view.z,
      jackMinSize: shared.JackMinSize,
    });
    built = { order: o, layout: l, faces, slotBodies, terminals, alarm, wires, geometry };
    frame!.el.dataset.order = String(o.n);
    frame!.el.dataset.flow = flow;
    // For the browser tests: the board's parts' rectangle (BOARD-01), board units, before BoardMargin.
    root.setAttribute("data-bounds", [l.bounds.x, l.bounds.y, l.bounds.w, l.bounds.h].map((v) => v.toFixed(2)).join(" "));
  };

  // ---------- the order bar ----------
  const fillOrderBar = (o: Order) => {
    nameEl.textContent = `${o.n} ${o.name}`;
    textEl.textContent = o.text;
    parLamps = parLampUnits(o, best(o.n));
    addOnLamps = [...addOns].flatMap((a) => a.lamps?.(o.n) ?? []).map((x) => {
      const l = lamp({ label: x.label, state: x.lit ? "steady" : "off" });
      l.el.setAttribute("data-lamp", x.label);
      return { label: x.label, lamp: l, lit: x.lit };
    });
    lampsEl.replaceChildren(...parLamps.map((p) => p.lamp.el), ...addOnLamps.map((p) => p.lamp.el), secondHost);
    pageSlots.refresh(BOARD_SLOTS.secondWiringLamp);
  };

  /** FEEL-09: a lamp not yet lit lights as its line prints, with a ring and the working sound. */
  const lightLamp = (l: Lamp) => {
    if (l.state !== "off") return;
    l.set("steady");
    const lens = l.el.querySelector("svg.tc-lens") as SVGSVGElement | null;
    if (lens) {
      const d = art.LampSize * shared.JackMinSize;
      growRing(lens, d / 2, d / 2, d / 2);
    }
    sound?.play("working");
  };

  // ---------- opening (BOARD-01, FEEL-11) ----------
  const settleOpening = () => {
    for (const m of opening) m.finish();
    opening = [];
  };

  const openFraming = () => (built ? openingFraming(built.layout, win()) : view);

  const animateOpening = () => {
    settleOpening();
    if (!built) return;
    const l = built.layout;
    const framed = openFraming();
    const C = feelCampaign;
    // FEEL-11: the camera starts at OpenZoomFrom of its framed zoom; where a jack would show below JackMinSize, at its framed
    // zoom, OpenPanFrom of the window's length along the flow off its framing, against the flow.
    let startView: View;
    if (framed.z * C.OpenZoomFrom >= Z_MIN) startView = { z: framed.z * C.OpenZoomFrom, c: framed.c };
    else {
      const w = win();
      const off = (C.OpenPanFrom * (flow === "landscape" ? w.w : w.h)) / framed.z;
      startView = { z: framed.z, c: flow === "landscape" ? { x: framed.c.x - off, y: framed.c.y } : { x: framed.c.x, y: framed.c.y - off } };
    }
    view = startView;
    apply();
    const cols = Math.max(...l.faces.map((f) => f.col)) + 1;
    const groups: Element[][] = Array.from({ length: cols + 1 }, () => []);
    for (const el of root.querySelectorAll("[data-col]")) groups[Number(el.getAttribute("data-col"))]?.push(el);
    for (const el of L.wires.querySelectorAll("[data-from]")) {
      const from = el.getAttribute("data-from")!;
      const a = from === "IN" ? null : l.faces.find((f) => from === f.label || from.startsWith(`${f.label} `));
      groups[a ? a.col : 0]!.push(el);
    }
    for (const el of L.traces.children) (el as SVGElement).style.opacity = "0";
    groups.forEach((els, i) => {
      for (const e of els) (e as SVGElement).style.opacity = "0";
      opening.push(
        tween({
          duration: 0.08,
          delay: i * C.OpenStagger,
          update: (q) => {
            for (const e of els) (e as SVGElement).style.opacity = String(q);
          },
          end: () => {
            for (const e of els) (e as SVGElement).style.opacity = "";
            if (i === groups.length - 1) for (const t of L.traces.children) (t as SVGElement).style.opacity = "";
          },
        }),
      );
    });
    const from = startView;
    opening.push(
      tween({
        duration: C.OpenSettleTime,
        ease: easings.smooth,
        update: (e) => {
          view = { z: from.z + (framed.z - from.z) * e, c: { x: from.c.x + (framed.c.x - from.c.x) * e, y: from.c.y + (framed.c.y - from.c.y) * e } };
          apply();
        },
      }),
    );
  };

  // ---------- controls ----------
  const setLockedControls = (on: boolean) => {
    undoPlate.setLabel(on ? "FAST" : "UNDO");
    resetPlate.setLabel(on ? "SKIP" : "RESET");
    undoPlate.el.dataset.control = on ? "fast" : "undo";
    resetPlate.el.dataset.control = on ? "skip" : "reset";
    undoPlate.setState("normal");
    frame!.el.classList.toggle("tcb-locked", on);
    frame!.el.dataset.locked = String(on);
    // BOARD-04: no leaving the board, for the order list or the commendations, by pointer or by key.
    for (const host of [ordersHost, medalsHost]) {
      for (const p of host.querySelectorAll(".tc-plate")) p.setAttribute("aria-disabled", String(on));
      host.inert = on;
    }
    relayout();
  };

  // Each returns false for a press that does nothing, so its plate gives no key click (owner's change). FAST and SKIP click
  // as they are pressed, before the run plays on fast or ends; the click is no run sound (FEEL-15).
  const onUndoFast = () => {
    if (guardedTap()) return false;
    if (locked) {
      if (runState !== "running" || !playback) return false;
      playback.toggleFast();
      undoPlate.setState(playback.fast ? "pressed" : "normal");
      frame!.el.dataset.speed = playback.fast ? "fast" : "normal";
      return true;
    }
    settleOpening();
    return built?.wires.undo() ?? false;
  };
  const onResetSkip = () => {
    if (guardedTap()) return false;
    if (locked) {
      if (runState !== "running" || !playback) return false;
      playback.skip();
      return true;
    }
    settleOpening();
    return built?.wires.reset() ?? false;
  };
  const onRunSwitch = () => {
    if (guardedTap()) return;
    if (locked || !built) return;
    void doRun();
  };

  // ---------- standby (FEEL-12, CAMPAIGN-01) ----------
  const inAudio = (t: EventTarget | null) => t instanceof Node && audioHost.contains(t);
  const guardedTap = () => standby !== null || guarded;
  const onStandbyPointer = (e: Event) => {
    // VIEW-04: a tap anywhere during the full alarm prints the report at once (the AUDIO switch flips as ever).
    if (runState === "alarm" && !inAudio(e.target)) {
      e.stopPropagation();
      e.preventDefault();
      cutAlarm?.();
      return;
    }
    if (!standby && !guarded) return;
    if (inAudio(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
    if (standby) {
      const cb = standby.onStandbyTap;
      wake();
      cb();
    }
  };
  const onStandbyClick = (e: Event) => {
    if ((standby || guarded) && !inAudio(e.target)) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const enterStandby = () => {
    frame!.setStandby(true, [audioHost, runWrap]);
    frame!.el.dataset.standby = "true";
    // ART-15: in standby the blinking Mustard ring stands on the run switch. Design silent on its shape round a square
    // plate: a rounded square of the ring's weight, clear of the plate's rim by its edge as a round ring is, so it holds the
    // whole plate and stands only its own width past it.
    standbyRing?.remove();
    const r = runSwitch.plate.getBoundingClientRect();
    const off = art.WireEdge + art.OutlineWeight / 2;
    const pad = 2 * off;
    standbyRing = s("svg", { class: "tcb-standbyring", width: r.width + 2 * pad, height: r.height + 2 * pad, "data-part": "standby-ring" });
    standbyRing.style.left = `${-pad}px`;
    standbyRing.style.top = `${-pad}px`;
    const box = { x: pad - off, y: pad - off, width: r.width + 2 * off, height: r.height + 2 * off, rx: 4 + off, fill: "none" };
    const g = s(
      "g",
      { "data-piece": "ring", "data-colour": "mustard", class: "tc-blink" },
      s("rect", { ...box, stroke: colours.Ink, "stroke-width": art.OutlineWeight + 2 * art.WireEdge, "data-part": "ring-edge" }),
      s("rect", { ...box, stroke: colours.Mustard, "stroke-width": art.OutlineWeight, "data-part": "ring" }),
    );
    standbyRing.append(g);
    runWrap.append(standbyRing);
  };
  /** FEEL-12: the first tap lights the console over WakeTime; then every tap but AUDIO waits for run() (the opening guard). */
  const wake = () => {
    standby = null;
    guarded = true;
    standbyRing?.remove();
    standbyRing = null;
    frame!.el.dataset.standby = "waking";
    const dim = frame!.el.querySelector('[data-part="standby-dim"]') as HTMLElement | null;
    const from = Number(dim?.style.opacity ?? 0);
    tween({
      duration: feelCampaign.WakeTime,
      update: (q) => dim && (dim.style.opacity = String(from * (1 - q))),
      end: () => {
        frame!.setStandby(false);
        frame!.el.dataset.standby = "false";
      },
    });
  };

  // ---------- pointer: pan, zoom, wires (BOARD-03, WIRE-02 to WIRE-05) ----------
  type Press = { id: number; x0: number; y0: number; x: number; y: number; moved: boolean; gesture: WireGesture | null; pan: boolean };
  const presses = new Map<number, Press>();
  let pinch: { d0: number; z0: number; mid: Point; view0: View } | null = null;
  let edgeRaf = 0;
  let edgeLast = 0;

  const canTouchBoard = () => !!built && !locked && !standby && !guarded && !frame!.el.classList.contains("tc-paperup");

  const edgeLoop = (now: number) => {
    edgeRaf = 0;
    const p = [...presses.values()].find((q) => q.gesture?.dragging);
    if (!p || !built) return;
    const dt = Math.min(0.1, (now - edgeLast) / 1000);
    edgeLast = now;
    const r = svg.getBoundingClientRect();
    // BOARD-03: a held wire within EdgePanZone of a window edge, or past it, pans the board toward it at EdgePanSpeed.
    const v = edgePanVelocity({ x: p.x - r.left, y: p.y - r.top }, win());
    if (v.x || v.y) {
      setView({ z: view.z, c: { x: view.c.x + (v.x * dt) / view.z, y: view.c.y + (v.y * dt) / view.z } });
      p.gesture!.move(toBoardPoint(p.x, p.y));
    }
    edgeRaf = requestAnimationFrame(edgeLoop);
  };
  const startEdge = () => {
    if (edgeRaf) return;
    edgeLast = performance.now();
    edgeRaf = requestAnimationFrame(edgeLoop);
  };
  /** Every press lets go at once, its wire with it: the board locks, or its wiring view is drawn again. */
  const dropPresses = () => {
    for (const p of presses.values()) p.gesture?.cancel();
    presses.clear();
    pinch = null;
    if (edgeRaf) cancelAnimationFrame(edgeRaf);
    edgeRaf = 0;
  };

  const wireInput = () => {
    svg.addEventListener("pointerdown", (e) => {
      // A mouse presses with its main button only.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canTouchBoard()) return;
      // FEEL-17: a touch while an order opens acts on what lay under it when it landed; then the opening jumps to its end.
      const at = toBoardPoint(e.clientX, e.clientY);
      settleOpening();
      // A press of this pointer the browser never ended gives way to the new one.
      const old = presses.get(e.pointerId);
      if (old) {
        old.gesture?.cancel();
        presses.delete(e.pointerId);
      }
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        // A pointer the browser no longer tracks takes no capture; its moves still reach the board.
      }
      const p: Press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, gesture: null, pan: false };
      if (presses.size >= 1) {
        // A second finger: a pinch. Any wire held lets go.
        for (const q of presses.values()) {
          q.gesture?.cancel();
          q.gesture = null;
          q.pan = false;
        }
        presses.set(e.pointerId, p);
        const [a, b] = [...presses.values()];
        pinch = { d0: Math.hypot(a!.x - b!.x, a!.y - b!.y), z0: view.z, mid: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }, view0: view };
        return;
      }
      presses.set(e.pointerId, p);
      p.gesture = built!.wires.press(at);
      p.pan = !p.gesture;
      e.preventDefault();
    });
    svg.addEventListener("pointermove", (e) => {
      const p = presses.get(e.pointerId);
      if (!p) {
        if (e.pointerType === "mouse" && built && !locked) built.wires.hover(toBoardPoint(e.clientX, e.clientY));
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      // Past TAP_SLOP a press is a drag; a pan then catches up the slop, so the board stays under the finger.
      const started = !p.moved && Math.hypot(p.x - p.x0, p.y - p.y0) > TAP_SLOP;
      if (started) p.moved = true;
      if (!canTouchBoard()) return;
      if (pinch && presses.size >= 2) {
        const [a, b] = [...presses.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        const r = svg.getBoundingClientRect();
        const moved = panBy(pinch.view0, mid.x - pinch.mid.x, mid.y - pinch.mid.y, built!.layout.bounds, win());
        setView(zoomAround(moved, (pinch.z0 * d) / Math.max(1, pinch.d0) / moved.z, { x: mid.x - r.left, y: mid.y - r.top }, built!.layout.bounds, win()));
        return;
      }
      if (!p.moved) return;
      if (p.gesture) {
        p.gesture.move(toBoardPoint(p.x, p.y));
        if (p.gesture.dragging) startEdge();
      } else if (p.pan) setView(panBy(view, started ? p.x - p.x0 : dx, started ? p.y - p.y0 : dy, built!.layout.bounds, win()));
    });
    const up = (e: PointerEvent, cancelled: boolean) => {
      const p = presses.get(e.pointerId);
      if (!p) return;
      presses.delete(e.pointerId);
      if (pinch) {
        if (presses.size < 2) pinch = null;
        return;
      }
      if (!built) return;
      if (p.gesture) {
        if (cancelled) p.gesture.cancel();
        else p.gesture.end(toBoardPoint(e.clientX, e.clientY), p.moved);
      } else if (!p.moved && !cancelled) built.wires.tapElsewhere();
    };
    svg.addEventListener("pointerup", (e) => up(e, false));
    svg.addEventListener("pointercancel", (e) => up(e, true));
    // A press whose pointer the board lost (after its up, none is left) ends as a cancelled one.
    svg.addEventListener("lostpointercapture", (e) => up(e, true));
    svg.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (!canTouchBoard()) return;
        settleOpening();
        const r = svg.getBoundingClientRect();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? win().h : 1;
        // BOARD-03: the wheel with the control key held (and a trackpad pinch) zooms round that point; else it pans.
        if (e.ctrlKey) setView(zoomAround(view, Math.exp((-e.deltaY * unit) / 200), { x: e.clientX - r.left, y: e.clientY - r.top }, built!.layout.bounds, win()));
        else setView(panBy(view, -e.deltaX * unit, -e.deltaY * unit, built!.layout.bounds, win()));
      },
      { passive: false },
    );
  };

  // ---------- fit and turn (BOARD-02) ----------
  const onFit = (sizes: { orientation: Flow }) => {
    measureWin();
    if (!built) return;
    const next: Flow = sizes.orientation;
    if (next !== flow) {
      // BOARD-02: wiring and zoom stay; the view keeps its centre, then the pan stops. A run plays on where it stood.
      // The view's motions jump to their end first, and the last items' leave: none may write onto the new layout.
      settleOpening();
      viewMotion?.finish();
      viewMotion = null;
      leaving?.finish();
      leaving = null;
      const before = built.layout;
      const z = view.z;
      const at = playback?.at ?? null;
      const alarmLit = built.alarm.lit;
      playback?.destroy();
      flow = next;
      build(built.order, built.wires.wiring, built.wires.history);
      view = turnView({ z, c: view.c }, before, built.layout, win());
      apply();
      if (runTrace && at) {
        playback = play(runTrace, stageFor(built), at);
        built.alarm.set(alarmLit);
      }
      return;
    }
    setView(view);
  };

  // ---------- run (BOARD-04, VIEW-01 to VIEW-07, REPORT-04) ----------
  const stageFor = (b: Built): Stage => {
    const l = b.layout;
    const rows = new Map(l.outputs.flatMap((t) => t.rows.map((r) => [r.item, { destination: t.destination, result: r.result, required: r.required }] as const)));
    const lens = art.LampSize * shared.JackMinSize;
    return {
      order: b.order,
      flow,
      slot: (place) => l.input.slots[place - 1]!,
      inJack: (end) => l.inJacks.get(end)!,
      outJack: (jack) => l.outJacks.get(jack)!,
      row: (id) => rows.get(id) ?? null,
      foot: (d, show) => {
        const t = l.outputs.find((x) => x.destination === d)!;
        const at = { x: t.rect.x + 8 + B.RowBodySize / 2, y: t.rect.y + t.rect.h + B.FootRowHeight / 2 };
        const cur = b.terminals.get(d)!;
        if (cur.foot !== show) {
          const el = footTerminal(t, show);
          cur.el.replaceWith(el);
          b.terminals.set(d, { el, foot: show });
        }
        return at;
      },
      route: (from, to) => b.wires.routeOf(from) ?? route(b.geometry, from, to),
      march: (from) => b.wires.marchOf(from),
      lamp: (label) => {
        const f = b.faces.get(label);
        if (!f) return null;
        return { set: (st) => f.lamp.set(st), at: { x: f.origin.x + B.TextInset + lens / 2, y: f.origin.y + B.FaceHeight - B.BottomRowHeight / 2 }, radius: lens / 2 };
      },
      alarm: { set: (lit) => b.alarm.set(lit) },
      slotBody: (place) => b.slotBodies.get(place) ?? null,
      layers: { items: L.items, lit: L.lit, results: L.results, rings: L.rings },
      roomDim: (taken) => dimRect.setAttribute("opacity", taken.toFixed(3)),
      camera: {
        view: () => view,
        set: (v) => setView(v),
        needsFollow: (p) => needsFollow(view, p, l.bounds, win(), VIEW_PARAMS.ViewMargin),
        centreOn: (p) => clampView({ z: view.z, c: p }, l.bounds, win()),
        lastFraming: (feet) => lastFraming(l, win(), VIEW_PARAMS.ViewMargin, feet, B.FootRowHeight),
      },
      draw: drawCtx(),
      sound,
      onBeat: (n, speed) => {
        frame!.window.setAttribute("data-beat", String(n));
        frame!.el.dataset.speed = speed;
        // Design silent: FAST shows pressed while the run plays fast.
        if (locked) undoPlate.setState(speed === "fast" ? "pressed" : "normal");
      },
    };
  };

  const setRunState = (st: typeof runState) => {
    runState = st;
    frame!.el.dataset.run = st;
  };

  const visible = () =>
    new Promise<void>((resolve) => {
      if (!document.hidden) return resolve();
      const on = () => {
        if (document.hidden) return;
        document.removeEventListener("visibilitychange", on);
        resolve();
      };
      document.addEventListener("visibilitychange", on);
    });

  /** A report slot's nodes, rendered once as the report starts printing: the slot stands defined only for that render. */
  const slotNodes = (name: string): Node[] => {
    if (!pageSlots.isFilled(name)) return [];
    const got: Node[] = [];
    pageSlots.undefine(name);
    pageSlots.define(name, { replaceChildren: (...n: Node[]) => got.push(...n) }, () => null);
    pageSlots.undefine(name);
    return got;
  };

  let runPromise: Promise<LastRun> | null = null;
  let runTrace: Trace | null = null;
  /** Each order opened starts a new epoch: a run of an earlier one stops at its next await and touches nothing. */
  let epoch = 0;
  /** A run abandoned when another order opens never settles. */
  const abandoned = () => new Promise<never>(() => {});

  /** BOARD-04: one run at a time; RUN again while the report tears starts the next (FEEL-17). */
  const doRun = (): Promise<LastRun> => {
    if (runPromise) return runPromise;
    let p!: Promise<LastRun>;
    const release = () => {
      if (runPromise === p) runPromise = null;
    };
    p = runOnce(release);
    runPromise = p;
    p.then(release, release);
    return p;
  };

  const runOnce = async (release: () => void): Promise<LastRun> => {
    const ep = epoch;
    const stale = () => ep !== epoch;
    const b = built!;
    const o = b.order;
    let mine: PrintedReport | null = null;
    try {
      settleOpening();
      // FEEL-17: the last run's leave and the view's return jump to their end; the new run owns lamps, slots and view.
      leaving?.finish();
      leaving = null;
      viewMotion?.finish();
      viewMotion = null;
      guarded = false;
      locked = true;
      setRunState("running");
      b.wires.letGo();
      b.wires.settleDrawOuts();
      dropPresses();
      setLockedControls(true);
      // FEEL-04: the toggle throws over SwitchThrowTime; the thunk as it starts, the click at its seat (the sound's own).
      runSwitch.set(true);
      sound?.play("runSwitch");
      const wiring = b.wires.wiring;
      const trace = runOrder(o, wiring);
      let movesLine: string | undefined;
      let moves: number | null = null;
      let lampLabel: string | undefined;
      for (const a of addOns) {
        const r = a.scoreRun?.(o.n, wiring, trace);
        if (!r) continue;
        if (r.movesLine !== undefined) movesLine = r.movesLine;
        if (r.moves !== undefined) moves = r.moves;
        if (r.lampLabel !== undefined) lampLabel = r.lampLabel;
      }
      const rep = reportOf(o, trace, movesLine !== undefined ? { movesLine } : {});
      const id = idOf(rep);
      const sc = scoreOf(o, trace);
      const before = best(o.n);
      if (sc) setBest(o.n, keepBest(before, sc));
      frame!.el.dataset.report = id;
      frame!.el.dataset.form = rep.form;

      runTrace = trace;
      playback = play(trace, stageFor(b));
      // The screen may turn mid-run: the playback is drawn again, and the run waits on the newest.
      for (;;) {
        const pb: Playback = playback!;
        await pb.done;
        if (stale()) return abandoned();
        if (pb === playback) break;
      }
      const filed = isFiled(o.n, id);
      const done: LastRun = { order: o.n, wiring, trace, report: rep, score: sc, moves };
      last = done;
      pageEvents.emit("runEnded", { order: o.n, win: trace.win, reportId: id });

      await visible();
      if (stale()) return abandoned();
      // VIEW-04: an incident report led by a hand-written result not yet filed sounds the full alarm, then prints.
      let atOnce = filed;
      if (rep.form === "incident" && rep.handWritten !== null && !filed) {
        setRunState("alarm");
        const pb = playback!;
        cutAlarm = () => pb.tap();
        const cut = await pb.alarm();
        if (stale()) return abandoned();
        cutAlarm = null;
        if (cut) atOnce = true;
      }
      await visible();
      if (stale()) return abandoned();
      setRunState("printing");
      // FEEL-09: each lamp not yet lit lights as its line prints.
      const lampAt = new Map<number, Lamp[]>();
      const lineOf = (text: string) => rep.lines.indexOf(text);
      if (sc) {
        for (const p of parLamps) {
          const k = lineOf(rep.scoreLines[p.par === "wire" ? 0 : 1]!);
          if (p.lit(best(o.n)) && k >= 0) lampAt.set(k, [...(lampAt.get(k) ?? []), p.lamp]);
        }
      }
      if (movesLine !== undefined && lampLabel) {
        const k = lineOf(movesLine);
        const now = [...addOns].flatMap((a) => a.lamps?.(o.n) ?? []).find((x) => x.label === lampLabel);
        const unit = addOnLamps.find((x) => x.label === lampLabel);
        if (k >= 0 && now?.lit && unit) lampAt.set(k, [...(lampAt.get(k) ?? []), unit.lamp]);
      }
      // ART-12: a node marked data-double prints in double strike, in either slot.
      const double = (n: Node) => (n instanceof Element && n.hasAttribute("data-double") ? { double: true } : {});
      const after = slotNodes(BOARD_SLOTS.afterReport).map((n): PrintLine => ({ text: n.textContent ?? "", ...double(n) }));
      const commend = slotNodes(BOARD_SLOTS.commendation).map((n, i): PrintLine => ({ text: n.textContent ?? "", ...double(n), ...(i === 0 ? { bell: true } : {}) }));
      const share = [...slotNodes(BOARD_SLOTS.share), ...slotNodes(BOARD_SLOTS.next)].filter((n): n is HTMLElement => n instanceof HTMLElement);
      const footStart = rep.lines.length;
      let resolveReturn!: () => void;
      const returned = new Promise<void>((r) => (resolveReturn = r));
      mine = printed = printReport({
        frame: frame!,
        report: rep,
        reportId: id,
        atOnce,
        sound,
        foot: [...after, ...commend],
        controls: share,
        onLine: (i) => {
          for (const l of lampAt.get(i) ?? []) lightLamp(l);
          if (i === footStart + after.length - 1 || (after.length === 0 && i === footStart - 1)) pageSlots.refresh(BOARD_SLOTS.secondWiringLamp);
        },
        onClose: () => {
          release();
          returnBoard();
          resolveReturn();
        },
      });
      await returned;
      // The board has returned: what is left is this run's own; a next run may have started.
      await mine.closed;
      if (printed === mine) printed = null;
      return done;
    } catch (e) {
      // Whatever threw, the board unlocks: no run may leave it locked with no report.
      console.error(e);
      if (!stale()) {
        cutAlarm = null;
        if (mine && printed === mine) {
          mine.paper.dispose();
          printed = null;
        }
        if (locked) returnBoard();
      }
      throw e;
    }
  };

  /** VIEW-05, FEEL-16: the board returns as the report tears: unlock, controls back, toggle returns, view to its opening framing. */
  const returnBoard = () => {
    locked = false;
    setRunState("idle");
    setLockedControls(false);
    frame!.el.dataset.speed = "normal";
    runSwitch.set(false);
    sound?.play("runSwitch");
    const pb = playback;
    playback = null;
    runTrace = null;
    if (pb) leaving = pb.leave();
    moveView(openFraming(), VIEW_PARAMS.ViewMoveTime);
    frame!.window.setAttribute("data-beat", "0");
    fillOrderBar(built!.order);
    relayout();
  };

  // ---------- the API ----------
  const ensure = () => {
    if (frame) return;
    shell.define("board", {
      mount,
      onFit: (sz) => onFit(sz),
    });
  };

  const b: Board = {
    openOrder(n, o = {}) {
      ensure();
      const ord = orderOf(n);
      // A new order: any run, report and motion on the board ends at once; a run still going stops at its next await.
      epoch++;
      cutAlarm?.();
      cutAlarm = null;
      leaving?.finish();
      leaving = null;
      playback?.destroy();
      playback = null;
      runTrace = null;
      printed?.paper.dispose();
      printed = null;
      viewMotion?.cancel();
      viewMotion = null;
      locked = false;
      runPromise = null;
      if (runState !== "idle") {
        setRunState("idle");
        runSwitch.set(false, true);
        setLockedControls(false);
      }
      standby = o.standby ?? null;
      guarded = false;
      shell.show("board");
      flow = shell.sizes("board").orientation;
      current = n;
      // The order's current wiring and its undo steps (WIRE-06, SAVE-01); a wiring given here starts with none.
      if (o.wiring) build(ord, o.wiring);
      else build(ord, heldWiring(n), openHistory(ord, heldWiring(n), undoSteps(n)));
      fillOrderBar(ord);
      relayout();
      shell.fit();
      frame!.el.dataset.run = "idle";
      frame!.el.dataset.locked = "false";
      if (standby) {
        view = openFraming();
        apply();
        enterStandby();
      } else {
        frame!.setStandby(false);
        frame!.el.dataset.standby = "false";
        animateOpening();
      }
      pageEvents.emit("orderOpened", { order: n });
    },
    currentOrder: () => current,
    run() {
      if (!built) return Promise.reject(new Error("no order is open"));
      if (runPromise) return runPromise;
      standby = null;
      guarded = false;
      if (frame!.el.dataset.standby !== "false") {
        frame!.setStandby(false);
        frame!.el.dataset.standby = "false";
        standbyRing?.remove();
      }
      return doRun();
    },
    lastRun: () => last,
    reportPaper: () => printed?.paper ?? null,
    overlay(node) {
      ensure();
      if (typeof (node as Printout).place === "function" && (node as Printout).el) {
        const p = node as Printout;
        frame!.showPaper(p);
        return () => p.dispose();
      }
      const wrap = h("div", { class: "tcb-overlay" });
      wrap.append(node as Node);
      frame!.window.append(wrap);
      return () => wrap.remove();
    },
    locked: () => locked,
    setFiled(fn) {
      isFiled = fn;
    },
    addOn(a) {
      addOns.add(a);
      if (built && current !== null) fillOrderBar(built.order);
      return () => {
        addOns.delete(a);
        if (built && current !== null) fillOrderBar(built.order);
      };
    },
  };
  return b;
}
