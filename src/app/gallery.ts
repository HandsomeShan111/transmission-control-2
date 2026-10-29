// The design system's one page: every piece in every state (system
// architecture, Design system: one page shows every piece). Sample values are
// plain copies of design/docs/data.md entries; the page imports no block.
import * as tokens from "../platform/tokens";
import { cssVars, uiSizes, type UiSizes } from "../platform/scale";
import { createSound, scheduleVoice, voiceOf, SOUND_NAMES, type SoundName, type VoiceOptions } from "../platform/sound";
import { watchVisibility } from "../platform/motion";
import {
  actHeading,
  agentFace,
  alarmLamp,
  consoleFrame,
  declareKeys,
  h,
  KEY,
  key,
  inputTerminal,
  installStyles,
  ITEM_KINDS,
  itemBody,
  jack,
  lamp,
  lampLens,
  listRow,
  medal,
  medalGrid,
  markCode,
  markCodeMetrics,
  markTile,
  outputTerminal,
  paperField,
  plate,
  printout,
  ring,
  ringRadiusFor,
  s,
  signDisc,
  SILHOUETTES,
  silhouetteSvg,
  switchPiece,
  tileShapeForAct,
  wirePath,
  wireTrace,
  type AgentFace,
  type FrameControl,
  type ItemKind,
  type LampState,
  type Point,
  type PrintLine,
  type Printout,
  type SilhouetteName,
  type TileShape,
  type Flow,
} from "../platform/pieces";

const { art, boardLayout: B, colours, columnGap, shared } = tokens;

// ---------- sample values (design/docs/data.md) ----------

const FAMILIES: { name: string; silhouette: SilhouetteName; act: number }[] = [
  { name: "RECORDS", silhouette: "filing cabinet", act: 1 },
  { name: "COMMS", silhouette: "teletype", act: 2 },
  { name: "GALLEY", silhouette: "oven", act: 3 },
  { name: "WORKSHOP", silhouette: "crane", act: 4 },
  { name: "AUDIT", silhouette: "ledger desk", act: 5 },
  { name: "DISPATCH", silhouette: "launch tube", act: 6 },
];
const MARKS: { mark: string; act: number }[] = [
  { mark: "laminated", act: 1 },
  { mark: "shredded", act: 1 },
  { mark: "translated", act: 2 },
  { mark: "summarized", act: 2 },
  { mark: "baked", act: 3 },
  { mark: "sliced", act: 3 },
  { mark: "crushed", act: 4 },
  { mark: "restored", act: 4 },
  { mark: "approved", act: 5 },
  { mark: "sealed", act: 5 },
  { mark: "wrapped", act: 6 },
  { mark: "labelled", act: 6 },
];
type AgentSample = {
  name: string;
  family: number;
  role: "worker" | "checker" | "copier";
  rule: string;
  mark?: string;
  pass?: number;
};
const AGENTS: Record<string, AgentSample> = {
  LAMINATOR: { name: "LAMINATOR", family: 0, role: "worker", rule: "Laminates it.", mark: "laminated" },
  SHREDDER: { name: "SHREDDER", family: 0, role: "worker", rule: "Shreds it to confetti.", mark: "shredded" },
  INSPECTOR: { name: "INSPECTOR", family: 0, role: "checker", rule: "Is it paper?", pass: 2 },
  TRANSLATOR: { name: "TRANSLATOR", family: 1, role: "worker", rule: "Translates it to Latin.", mark: "translated" },
  BAKER: { name: "BAKER", family: 2, role: "worker", rule: "Bakes it into a cake.", mark: "baked" },
  SLICER: { name: "SLICER", family: 2, role: "copier", rule: "Cuts it in two.", mark: "sliced" },
  COMPACTOR: { name: "COMPACTOR", family: 3, role: "worker", rule: "Crushes it into a cube.", mark: "crushed" },
  RESTORER: { name: "RESTORER", family: 3, role: "worker", rule: "Restores its first kind.", mark: "restored" },
  STAMPER: { name: "STAMPER", family: 4, role: "worker", rule: "Stamps it APPROVED.", mark: "approved" },
  TALLY: { name: "TALLY", family: 4, role: "checker", rule: "Three marks yet?", pass: 3 },
  LABELLER: { name: "LABELLER", family: 5, role: "worker", rule: "Labels it URGENT.", mark: "labelled" },
};

const markShape = (mark: string): TileShape => tileShapeForAct(MARKS.find((m) => m.mark === mark)!.act);

// ---------- page ----------

installStyles(document);
// Every key the game's screens show, so the frames here take the game's one key size (owner's change).
declareKeys(
  ...["ORDERS", "ARCHIVE", "UNDO", "FAST", "RESET", "SKIP", "SAVE CODE", "LOAD SAVE CODE"].map((label) => ({ label })),
  { label: "MEDALS", sub: "18/18" },
  { label: "AUDIO", switch: "lamp" },
  { label: "RUN", switch: "plain" },
);
watchVisibility(document);
document.title = "Transmission Control 2: design system";
const metrics = markCodeMetrics(MARKS.map((m) => markCode(m.mark)));

const css = document.createElement("style");
css.textContent = `
body{overflow-x:hidden}
.g-demo{position:relative;height:100vh;width:100%}
.g-sec{padding:var(--PlateGap);border-top:var(--OW) solid var(--GraphiteLight)}
.g-head{font-weight:700;font-size:var(--TextSize);line-height:1.2;margin:0 0 var(--PlateGap)}
.g-row{display:flex;flex-wrap:wrap;gap:var(--PlateGap);align-items:flex-start}
.g-card{display:flex;flex-direction:column;gap:4px;max-width:100%}
.g-cap{font-size:var(--LabelSize);line-height:1.2;font-weight:700}
.g-ink{display:block;background:var(--Ink)}
.g-ground{background:var(--Ink);padding:var(--PlateGap)}
.g-paperbox{position:relative;overflow:hidden;background:var(--Ink);width:100%;height:480px}
.g-papercard{flex:1 1 340px;max-width:100%}
.g-scroll{max-width:100%;overflow-x:auto;scrollbar-color:var(--Cream) var(--Ink)}
.g-board{position:absolute;inset:0;width:100%;height:100%}
.g-obarline{display:flex;flex-wrap:wrap;align-items:center;column-gap:var(--PlateGap);row-gap:calc(var(--PlateGap) / 2)}
.g-obar-name{font-weight:700}
.g-obar-text{margin-top:calc(var(--PlateGap) / 2)}
`;
document.head.appendChild(css);

let sizes: UiSizes = uiSizes({ width: window.innerWidth, height: window.innerHeight });
const fitters: ((s: UiSizes) => void)[] = [];
function fitAll(): void {
  sizes = uiSizes({ width: document.documentElement.clientWidth, height: window.innerHeight });
  for (const [k, v] of Object.entries(cssVars(sizes))) document.documentElement.style.setProperty(k, v);
  document.documentElement.dataset.orientation = sizes.orientation;
  for (const f of fitters) f(sizes);
}

const section = (title: string, id: string, ...kids: Node[]) =>
  h("section", { class: "g-sec", id, "data-gallery": id }, h("h2", { class: "g-head" }, title), ...kids);
const row = (...kids: Node[]) => h("div", { class: "g-row" }, ...kids);
const card = (cap: string, el: Node, id?: string) => h("figure", { class: "g-card", style: "margin:0", "data-card": id ?? cap }, h("figcaption", { class: "g-cap" }, cap), el);

/** A board card: an Ink ground, board units one to one, sized to its content once drawn. */
function boardCard(cap: string, build: (g: SVGGElement, defs: SVGDefsElement) => void, pad = 12): HTMLElement {
  const defs = s("defs");
  const g = s("g");
  const svg = s("svg", { class: "g-ink tc-board", "data-board": cap }, defs, g);
  build(g, defs);
  const c = card(cap, h("div", { class: "g-scroll" }, svg));
  fitters.push(() => {
    if (!svg.isConnected) return;
    const b = g.getBBox();
    const x = Math.floor(b.x - pad);
    const y = Math.floor(b.y - pad);
    const w = Math.ceil(b.width + 2 * pad);
    const hh = Math.ceil(b.height + 2 * pad);
    svg.setAttribute("viewBox", `${x} ${y} ${w} ${hh}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(hh));
  });
  return c;
}

// ---------- board pieces composed ----------

function face(a: AgentSample, flow: Flow, x: number, y: number, lampState: LampState = "off", label = a.name): AgentFace {
  const fam = FAMILIES[a.family]!;
  return agentFace({
    name: label,
    family: fam.name,
    silhouette: fam.silhouette,
    rule: a.rule,
    role: a.role,
    ...(a.mark ? { mark: { code: markCode(a.mark), shape: markShape(a.mark) } } : {}),
    metrics,
    ...(a.pass ? { passLimitLabel: `MAX ${a.pass} CHECKS PER ITEM` } : {}),
    lamp: lampState,
    flow,
    x,
    y,
  });
}

/** An item with its latest marks in a row under it (ITEM-04), at a body size. */
function itemWithMarks(kind: ItemKind, marks: string[], cx: number, cy: number, size: number): SVGGElement {
  const g = s("g", { "data-piece": "item" }, itemBody({ kind, size, cx, cy }));
  const shown = marks.slice(-shared.MarksShown);
  const step = tokens.objects.MarkTileSize + B.TileGap;
  shown.forEach((m, i) =>
    g.append(markTile({ code: markCode(m), shape: markShape(m), metrics, cx: cx + (i - (shown.length - 1) / 2) * step, cy: cy + size / 2 + B.TileGap + 16 })),
  );
  return g;
}

/** The demo board: Diplomatic pouch wired IN -> INSPECTOR; plus -> LAMINATOR; minus -> SHREDDER; both -> Embassy. */
function demoBoard(flow: Flow): SVGGElement {
  const g = s("g", { "data-demo": "board" });
  const land = flow === "landscape";
  g.dataset.focusX = "0";
  const P = (along: number, across: number): Point => (land ? { x: along, y: across } : { x: across, y: along });
  const colStep = land ? B.FaceWidth + columnGap() : B.FaceHeight + 2 * (shared.JackMinSize / 2 + B.JackOut) + columnGap();
  const laneStep = land ? B.FaceHeight + B.LaneGapLandscape : B.FaceWidth + B.LaneGapPortrait;
  const at = (col: number, lane: number) => P(col * colStep, lane * laneStep);
  const insp = face(AGENTS.INSPECTOR!, flow, at(1, 1).x, at(1, 1).y, "plus");
  g.dataset.focusX = String(at(1, 1).x);
  g.dataset.focusY = String(at(1, 1).y);
  const lam = face(AGENTS.LAMINATOR!, flow, at(2, 0).x, at(2, 0).y, "steady");
  const shr = face(AGENTS.SHREDDER!, flow, at(2, 2).x, at(2, 2).y, "off", "SHREDDER 1");
  const faces = [insp, lam, shr];
  const inJ = insp.jackList.find((j) => j.name === "in")!.at;
  const alongOf = (p: Point) => (land ? p.x : p.y);
  const acrossOf = (p: Point) => (land ? p.y : p.x);
  const jackOut = shared.JackMinSize / 2 + B.JackOut;
  // Input terminal: its jack ColumnGap before the first column's input jacks, centred across the lanes.
  const tinH = B.HeaderHeight + 4 + 3 * B.SlotSize + 2 * B.SlotGap + 4;
  const tinJackAlong = alongOf(inJ) - columnGap();
  const tin = land
    ? inputTerminal({ label: "IN", items: 3, flow, x: tinJackAlong - jackOut - B.InputTerminalWidth, y: acrossOf(inJ) - tinH / 2 })
    : inputTerminal({ label: "IN", items: 3, flow, x: acrossOf(inJ) - B.InputTerminalWidth / 2, y: tinJackAlong - jackOut - tinH });
  const lastOut = Math.max(...[lam, shr].map((f) => alongOf(f.jackList.find((j) => j.name === "out")!.at)));
  const toutJackAlong = lastOut + columnGap();
  const tw = tokens.terminalWidth();
  const toutBody = B.HeaderHeight + 3 * B.ResultRowHeight;
  const tout = land
    ? outputTerminal({ label: "Embassy", rows: 3, flow, x: toutJackAlong + jackOut, y: acrossOf(inJ) - toutBody / 2 })
    : outputTerminal({ label: "Embassy", rows: 3, flow, x: acrossOf(inJ) - tw / 2, y: toutJackAlong + jackOut });
  const tx = land ? toutJackAlong + jackOut : acrossOf(inJ) - tw / 2;
  const ty = land ? acrossOf(inJ) - toutBody / 2 : toutJackAlong + jackOut;
  const alarmAt = land ? { x: tx + tw / 2, y: ty - shared.JackMinSize } : { x: tx - shared.JackMinSize, y: ty + B.HeaderHeight / 2 };
  const alarm = alarmLamp({ lit: true, cx: alarmAt.x, cy: alarmAt.y });
  const J = (f: AgentFace, name: string) => f.jackList.find((j) => j.name === name)!.at;
  const wires = [
    wirePath({ kind: "data", points: [tin.jackAt, inJ] }),
    wirePath({ kind: "plus", points: [J(insp, "plus"), J(lam, "in")] }),
    wirePath({ kind: "minus", points: [J(insp, "minus"), J(shr, "in")] }),
    wirePath({ kind: "data", points: [J(lam, "out"), tout.jackAt] }),
    wirePath({ kind: "data", points: [J(shr, "out"), tout.jackAt] }),
  ];
  g.append(tin.el, tout.el, alarm.el, ...faces.map((f) => f.base), ...wires.map((w) => w.el), ...faces.map((f) => f.plate), ...faces.map((f) => f.top));
  // Items in the input terminal; required outputs and results in the output terminal.
  const kinds: ItemKind[] = ["Treaty", "Cake", "Address"];
  tin.slots.forEach((p, i) => g.append(itemBody({ kind: kinds[i]!, size: B.RowBodySize, cx: p.x, cy: p.y })));
  const req: [ItemKind, string[]][] = [
    ["Treaty", ["laminated"]],
    ["Confetti", ["shredded"]],
    ["Address", ["laminated"]],
  ];
  const step = tokens.objects.MarkTileSize + B.TileGap;
  const rowItem = (p: Point, kind: ItemKind, marks: string[]) => {
    g.append(itemBody({ kind, size: B.RowBodySize, cx: p.x, cy: p.y }));
    marks.forEach((m, i) => g.append(markTile({ code: markCode(m), shape: markShape(m), metrics, cx: p.x + B.RowBodySize / 2 + B.TileGap + 16 + i * step, cy: p.y })));
  };
  tout.required.forEach((p, i) => rowItem(p, req[i]![0], req[i]![1]));
  tout.slots.forEach((p, i) => {
    const [kind, marks] = i === 1 ? (["Cake", ["laminated"]] as [ItemKind, string[]]) : req[i]!;
    rowItem(p, kind, marks);
    g.append(signDisc({ sign: i === 1 ? "minus" : "plus", ground: "verdict", cx: p.x + B.RowBodySize / 2, cy: p.y - B.RowBodySize / 2 }));
  });
  g.append(tin.el.querySelector('[data-piece="jack"]')!, tout.el.querySelector('[data-piece="jack"]')!, ...faces.map((f) => f.jacks));
  return g;
}

// ---------- frame demos ----------

function boardFrame(): HTMLElement {
  const host = h("div", { class: "g-demo", id: "demo-board" });
  const frame = consoleFrame({ id: "board" });
  host.append(frame.el);
  // Owner's change: the order's name and lamps on one line of the strip above the window, its text under them.
  frame.orderBar.append(
    h(
      "div",
      { class: "g-obarline" },
      h("span", { class: "g-obar-name" }, "3 Diplomatic pouch"),
      lamp({ label: "WIRES", state: "steady" }).el,
      lamp({ label: "TIME" }).el,
      lamp({ label: "2ND WIRING" }).el,
    ),
    h("div", { class: "g-obar-text" }, "Diplomatic pouch for the Embassy: every paper laminated. Customs forbids cake: it may enter only as confetti."),
  );
  const audio = switchPiece({ label: "AUDIO", withLamp: true, lampOn: true });
  const run = switchPiece({ label: "RUN", down: true });
  const controls: FrameControl[] = [
    { el: audio.el, slot: KEY.audio, liveUnderPaper: true },
    key(plate({ label: "ORDERS" }), KEY.orders),
    key(plate({ label: "MEDALS", sub: "1/18", aria: "MEDALS, 1 of 18 earned" }), KEY.medals),
    key(plate({ label: "UNDO" }), KEY.actionA),
    key(plate({ label: "RESET" }), KEY.actionB),
    { el: run.el, slot: KEY.run },
  ];
  frame.setControls(controls);
  const svg = s("svg", { class: "g-board tc-board", "data-board": "demo" });
  frame.window.append(svg);
  let flow: Flow | null = null;
  fitters.push((sz) => {
    frame.fit(sz);
    if (flow !== sz.orientation) {
      flow = sz.orientation;
      svg.replaceChildren(demoBoard(flow));
    }
    const g = svg.firstElementChild as SVGGElement;
    const b = g.getBBox();
    const r = svg.getBoundingClientRect();
    // At the smallest zoom or closer: a jack never shows below JackMinSize (BOARD-03).
    const fit = Math.min(r.width / (b.width + 32), r.height / (b.height + 32));
    const z = Math.max(1, fit);
    const w = r.width / z;
    const hh = r.height / z;
    // A board too big for the window at the smallest zoom: the view stands on the checking agent.
    const cx = fit >= 1 ? b.x + b.width / 2 : Number(g.dataset.focusX);
    const cy = fit >= 1 ? b.y + b.height / 2 : Number(g.dataset.focusY);
    svg.setAttribute("viewBox", `${cx - w / 2} ${cy - hh / 2} ${w} ${hh}`);
  });
  return host;
}

function listFrame(): HTMLElement {
  const host = h("div", { class: "g-demo", id: "demo-orderlist" });
  const frame = consoleFrame({ id: "orderList", title: "ORDER LIST" });
  host.append(frame.el);
  const audio = switchPiece({ label: "AUDIO", withLamp: true, lampOn: false, down: true });
  frame.setControls([
    { el: audio.el, slot: KEY.audio, liveUnderPaper: true },
    key(plate({ label: "ORDERS", held: true }), KEY.orders),
    key(plate({ label: "MEDALS", sub: "1/18", aria: "MEDALS, 1 of 18 earned" }), KEY.medals),
    key(plate({ label: "ARCHIVE" }), KEY.archive),
    key(plate({ label: "SAVE CODE" }), KEY.actionA),
    key(plate({ label: "LOAD SAVE CODE" }), KEY.actionB),
  ]);
  const list = h("div", { class: "tc-list" });
  list.append(actHeading({ act: 1, family: "RECORDS", silhouette: "filing cabinet" }).el);
  ["1 Signing ceremony", "2 Victory parade", "3 Diplomatic pouch", "4 Archive day", "5 Shredding day"].forEach((t, i) =>
    list.append(
      listRow({
        first: t,
        ...(i < 2 ? { far: plusMark() } : {}),
        second: [`Results ${i < 2 ? 2 : 0} of 3`, lamp({ label: "WIRES", state: i === 0 ? "steady" : "off", onCream: true }).el, lamp({ label: "TIME", onCream: true }).el],
      }).el,
    ),
  );
  frame.window.append(list);
  const memo = printout({ lines: MEMO, controls: [] });
  frame.showPaper(memo);
  memo.printAtOnce();
  fitters.push(() => frame.fit(uiSizes({ width: document.documentElement.clientWidth, height: window.innerHeight }, { titleOnly: true })));
  return host;
}

/** The order list's plus sign, as wide as a lamp lens (ui/order-list.md). */
function plusMark(): SVGSVGElement {
  const d = art.LampSize * shared.JackMinSize;
  return s("svg", { width: d, height: d, viewBox: `${-d / 2} ${-d / 2} ${d} ${d}`, "data-part": "won" }, signDisc({ sign: "plus", ground: "verdict", diameter: d }));
}

// ---------- printouts ----------

const REPORT: PrintLine[] = [
  { text: "The Embassy received a laminated cake. Customs has filed it as a document.", double: true },
  { text: "" },
  { text: "Item 2, Cake:" },
  { text: "INSPECTOR checks the cake. Not paper." },
  { text: "LAMINATOR laminates the cake. It is now waterproof." },
  { text: "At the Embassy: Cake, laminated." },
  { text: "First difference: mark 1, laminated by LAMINATOR; required shredded." },
  { text: "" },
  { text: "Diplomatic pouch unlocked.", double: true },
];
const MEMO: PrintLine[] = [
  { text: "MEMO" },
  { text: "RECORDS", stamp: "filing cabinet", double: true },
  { text: "Department of Records: everything on file, nothing ever found." },
];
const SAVE: PrintLine[] = [{ text: "SAVE CODE" }, { text: "TC2-1-7F3K9Q2M8X4V1B6N5C0Z7L2P9R4T8W3Y6H5J1" }];

function paperBox(id: string, p: Printout): HTMLElement {
  const box = h("div", { class: "g-paperbox", "data-paper": id });
  box.append(p.el);
  p.printAtOnce();
  fitters.push(() => {
    const w = box.clientWidth;
    p.place({ centreX: w / 2, bottom: box.clientHeight, top: 0, minX: 0, maxX: w });
  });
  return box;
}

// ---------- sound ----------

const sound = createSound();
sound.unlock(document);

// ---------- build ----------

function build(): void {
  const root = h("div", { id: "gallery" });
  document.body.append(root);

  root.append(boardFrame(), listFrame());

  // Plates
  root.append(
    section(
      "Plate",
      "plates",
      row(
        card("normal", plate({ label: "ORDERS" }).el),
        card("pressed", plate({ label: "ORDERS", state: "pressed" }).el),
        card("disabled", plate({ label: "ORDERS", state: "disabled" }).el),
        card("on paper", h("div", { class: "g-ground", style: "background:var(--Cream)" }, plate({ label: "SHARE", onPaper: true }).el)),
        card("on paper, pressed", h("div", { class: "g-ground", style: "background:var(--Cream)" }, plate({ label: "SHARE", onPaper: true, state: "pressed" }).el)),
      ),
      h("div", { style: "height:var(--PlateGap)" }),
      row(
        ...["ORDERS", "UNDO", "RESET", "FAST", "SKIP", "ARCHIVE", "SAVE CODE", "READ", "COPY", "SHARE", "TEXT", "PICTURE"].map((l) => plate({ label: l }).el),
        (() => {
          const p = plate({ label: "LOAD SAVE CODE" });
          p.wrap(3);
          return p.el;
        })(),
      ),
    ),
  );

  // Switches
  const audioUp = switchPiece({ label: "AUDIO", withLamp: true, lampOn: true });
  const audioDown = switchPiece({ label: "AUDIO", withLamp: true, lampOn: false, down: true });
  root.append(
    section(
      "Switch",
      "switches",
      row(
        card("RUN up", switchPiece({ label: "RUN" }).el),
        card("RUN down", switchPiece({ label: "RUN", down: true }).el),
        card("AUDIO up, sound on", audioUp.el),
        card("AUDIO down, sound off", audioDown.el),
      ),
    ),
  );

  // Lamps
  const states: LampState[] = ["off", "steady", "plus", "minus"];
  root.append(
    section(
      "Lamp",
      "lamps",
      // Par, second-wiring and AUDIO lamps use off and steady only (ART-05).
      row(...states.map((st) => card(st, lamp({ state: st, ...(st === "off" ? { label: "MOVES" } : st === "steady" ? { label: "2ND WIRING" } : {}) }).el))),
      h("div", { style: "height:var(--PlateGap)" }),
      h(
        "div",
        { class: "g-ground" },
        listRow({ first: "On a Cream row", second: [lamp({ label: "WIRES", onCream: true }).el, lamp({ label: "TIME", state: "steady", onCream: true }).el, lamp({ state: "plus", onCream: true }).el, lamp({ state: "minus", onCream: true }).el] }).el,
      ),
    ),
  );

  // List rows
  const list = h("div", { class: "tc-list g-ground" });
  for (const f of FAMILIES) list.append(actHeading({ act: f.act, family: f.name, silhouette: f.silhouette }).el);
  list.append(actHeading({ act: 1, family: "RECORDS", silhouette: "filing cabinet", state: "pressed" }).el);
  list.append(
    listRow({
      first: "3 Diplomatic pouch",
      far: plusMark(),
      second: ["Results 2 of 3", lamp({ label: "WIRES", state: "steady", onCream: true }).el, lamp({ label: "TIME", onCream: true }).el, lamp({ label: "2ND WIRING", onCream: true }).el],
    }).el,
    listRow({ first: "3 Diplomatic pouch", state: "pressed", second: ["Results 2 of 3", lamp({ label: "WIRES", state: "steady", onCream: true }).el] }).el,
    listRow({
      first: "Mission report",
      variant: "report",
      lead: "The Embassy received the peace treaty as inspected confetti. Talks resume when it is reassembled.",
      second: ["WIRES 4, BEATS 6", "SECOND WIRING"],
    }).el,
    listRow({ first: "Paper Trail", variant: "achievement", lead: "Every RECORDS incident on file. The cabinet no longer closes." }).el,
    listRow({ first: "Second Opinion", variant: "achievement", lead: "second wirings" }).el,
    listRow({ first: "Dropped report", variant: "report", inactive: true }).el,
  );
  root.append(section("List row", "rows", list));

  // Medals: earned in colour, the rest a dim outline (owner's change).
  const medals = h("div", { class: "tc-list g-ground" });
  medals.append(
    medalGrid([
      medal({ name: "Paper Trail", text: "Every RECORDS incident on file. The cabinet no longer closes.", earned: true, silhouette: "filing cabinet", ribbon: "Orange" }),
      medal({ name: "Second Opinion", text: "Second wirings 1 of 3", earned: false, silhouette: "filing cabinet", ribbon: "Teal" }),
      medal({ name: "Under Budget", text: "Fewer wires, less time. Accounting suspects a typo.", earned: true, silhouette: "filing cabinet", ribbon: "Cream" }),
    ]),
    medalGrid(FAMILIES.map((f, i) => medal({ name: f.name, text: `Act ${f.act}`, earned: i % 2 === 0, silhouette: f.silhouette, ribbon: (["Orange", "Teal", "Cream"] as const)[i % 3]! }))),
  );
  root.append(section("Medal", "medals", medals));

  // Printouts
  const report = printout({
    lines: REPORT,
    controls: [plate({ label: "SHARE", onPaper: true, state: "pressed" }).el, plate({ label: "TEXT", onPaper: true }).el, plate({ label: "PICTURE", onPaper: true }).el],
  });
  report.addFootLine({ text: "Filed: Incident archive, Diplomatic pouch." });
  const memo = printout({ lines: MEMO });
  const save = printout({ lines: SAVE, controls: [plate({ label: "COPY", onPaper: true }).el] });
  const load = printout({ lines: [{ text: "LOAD SAVE CODE" }], controls: [paperField({ value: "TC2-1-7F3K9Q2M8X4V1B6N5C0Z7L2P9R4T8W3Y6H5J1" }), plate({ label: "READ", onPaper: true }).el] });
  root.append(
    section(
      "Printout",
      "printouts",
      row(
        ...(
          [
            ["report", report],
            ["memo", memo],
            ["save code", save],
            ["field", load],
          ] as [string, Printout][]
        ).map(([cap, p]) => {
          const c = card(cap, paperBox(cap, p));
          c.classList.add("g-papercard");
          return c;
        }),
      ),
    ),
  );

  // Board pieces
  const boardSec = section("Board pieces, board units at the smallest zoom", "board");
  const cards = row();
  boardSec.append(cards);
  root.append(boardSec);

  cards.append(
    boardCard("Jacks", (g) => {
      const kinds: [string, "output" | "input" | "plus" | "minus", string?][] = [
        ["out", "output", "OUT"],
        ["in", "input", "IN"],
        ["plus", "plus"],
        ["minus", "minus"],
        ["item", "output", "ITEM"],
        ["copy", "output", "COPY"],
      ];
      kinds.forEach(([, kind, label], i) => g.append(jack({ kind, ...(label ? { label } : {}), cx: i * 56, cy: 0 })));
    }),
    boardCard("Sign discs", (g) => {
      g.append(
        signDisc({ sign: "plus", ground: "cream", cx: 0 }),
        signDisc({ sign: "minus", ground: "cream", cx: 36 }),
        signDisc({ sign: "plus", ground: "verdict", cx: 72 }),
        signDisc({ sign: "minus", ground: "verdict", cx: 108 }),
      );
    }),
    boardCard("Lamps on a face: off, steady, plus, minus", (g) => {
      states.forEach((st, i) => g.append(lampLens({ state: st, cx: i * 36 }).el));
    }),
    boardCard("Master alarm lamp: off, lit; a minus lamp", (g) => {
      g.append(alarmLamp({ cx: 0 }).el, alarmLamp({ lit: true, cx: 90 }).el, lampLens({ state: "minus", cx: 160 }).el);
    }),
    boardCard("Wires: data, plus feedback, minus feedback", (g) => {
      (["data", "plus", "minus"] as const).forEach((k, i) => g.append(wirePath({ kind: k, points: [{ x: 0, y: i * 40 }, { x: 220, y: i * 40 }] }).el));
    }),
    boardCard("Crossing hops, held wire", (g) => {
      // The later wire in the list hops (WIRE-01).
      g.append(
        wirePath({ kind: "data", points: [{ x: 0, y: 60 }, { x: 220, y: 60 }] }).el,
        wirePath({ kind: "minus", points: [{ x: 50, y: 0 }, { x: 50, y: 130 }], hops: [{ x: 50, y: 60 }] }).el,
        wirePath({ kind: "plus", points: [{ x: 110, y: 120 }, { x: 210, y: 0 }], hops: [{ x: 160, y: 60 }] }).el,
      );
      g.append(wirePath({ kind: "data", points: [{ x: 260, y: 20 }, { x: 350, y: 110 }], held: true }).el);
    }),
    boardCard("Rings: blinking Mustard, Cream, alarm", (g) => {
      const r = shared.JackMinSize / 2;
      g.append(jack({ kind: "input", cx: 0 }), ring({ cx: 0, r: ringRadiusFor(r), colour: "mustard", blink: true }).el);
      g.append(jack({ kind: "input", cx: 80 }), ring({ cx: 80, r: ringRadiusFor(r), colour: "mustard" }).el);
      g.append(jack({ kind: "input", cx: 160 }), ring({ cx: 160, r: ringRadiusFor(r) + 6, colour: "cream" }).el);
      const lr = (art.LampSize * shared.JackMinSize) / 2;
      g.append(lampLens({ state: "steady", cx: 230 }).el, ring({ cx: 230, r: ringRadiusFor(lr) + 4, colour: "cream" }).el);
      g.append(alarmLamp({ lit: true, cx: 310 }).el);
    }),
  );

  const facesCard = (cap: string, flow: Flow, list: [AgentSample, LampState, string?][]) =>
    boardCard(cap, (g) => {
      const step = flow === "landscape" ? B.FaceWidth + 70 : B.FaceWidth + 30;
      const fs = list.map(([a, st, label], i) => face(a, flow, i * step, 0, st, label ?? a.name));
      g.append(...fs.map((f) => f.base), ...fs.map((f) => f.plate), ...fs.map((f) => f.top), ...fs.map((f) => f.jacks));
    });
  cards.append(
    facesCard("Faces, flow left to right: worker, checker, copier", "landscape", [
      [AGENTS.LAMINATOR!, "off"],
      [AGENTS.INSPECTOR!, "plus"],
      [AGENTS.SLICER!, "steady"],
    ]),
    facesCard("Faces, flow top to bottom", "portrait", [
      [AGENTS.TRANSLATOR!, "off"],
      [AGENTS.TALLY!, "minus"],
      [AGENTS.SLICER!, "off"],
    ]),
    facesCard("Six families", "landscape", [
      [AGENTS.SHREDDER!, "off", "SHREDDER 1"],
      [AGENTS.TRANSLATOR!, "off"],
      [AGENTS.BAKER!, "off"],
      [AGENTS.COMPACTOR!, "off"],
      [AGENTS.STAMPER!, "off"],
      [AGENTS.LABELLER!, "off"],
    ]),
    boardCard("Wires under a label plate: traces", (g, defs) => {
      const f = face(AGENTS.RESTORER!, "landscape", 0, 0, "steady");
      const clip = s("clipPath", { id: "g-plate-clip" }, s("path", { d: f.plateD, transform: `translate(${f.origin.x} ${f.origin.y})` }));
      defs.append(clip);
      const a = [{ x: -120, y: 20 }, { x: 120, y: 20 }];
      const b = [{ x: -120, y: 42 }, { x: 120, y: -10 }];
      g.append(f.base, wirePath({ kind: "data", points: a }).el, wirePath({ kind: "plus", points: b }).el, f.plate);
      g.append(wireTrace({ kind: "data", points: a, clipId: "g-plate-clip" }), wireTrace({ kind: "plus", points: b, clipId: "g-plate-clip" }), f.top, f.jacks);
    }),
    boardCard("A wire round its own face", (g) => {
      const f = face(AGENTS.INSPECTOR!, "landscape", 0, 0, "minus");
      const plus = f.jackList.find((j) => j.name === "plus")!.at;
      const inn = f.jackList.find((j) => j.name === "in")!.at;
      const yE = f.origin.y - 16;
      const pts = [plus, { x: plus.x + 34, y: plus.y }, { x: plus.x + 34, y: yE }, { x: inn.x - 34, y: yE }, { x: inn.x - 34, y: inn.y }, inn];
      g.append(f.base, wirePath({ kind: "plus", points: pts, round: 14 }).el, f.plate, f.top, f.jacks);
    }),
    boardCard("Terminals: input, output with foot row", (g) => {
      const tin = inputTerminal({ label: "IN", items: 3, flow: "landscape", x: 0, y: 0 });
      g.append(tin.el);
      (["Treaty", "Cake", "Address"] as ItemKind[]).forEach((k, i) => g.append(itemBody({ kind: k, size: B.RowBodySize, cx: tin.slots[i]!.x, cy: tin.slots[i]!.y })));
      g.append(markTile({ code: "TR", shape: "square", metrics, cx: tin.slots[1]!.x + B.RowBodySize / 2 + B.TileGap + 16, cy: tin.slots[1]!.y }));
      const tout = outputTerminal({ label: "Senate Archive", rows: 1, foot: true, flow: "landscape", x: 200, y: 0 });
      g.append(tout.el);
      const step = tokens.objects.MarkTileSize + B.TileGap;
      const put = (p: Point, kind: ItemKind, marks: string[]) => {
        g.append(itemBody({ kind, size: B.RowBodySize, cx: p.x, cy: p.y }));
        marks.forEach((m, i) => g.append(markTile({ code: markCode(m), shape: markShape(m), metrics, cx: p.x + B.RowBodySize / 2 + B.TileGap + 16 + i * step, cy: p.y })));
      };
      put(tout.required[0]!, "Treaty", ["translated"]);
      put(tout.slots[0]!, "Treaty", ["translated", "translated"]);
      g.append(ring({ cx: tout.slots[0]!.x + B.RowBodySize / 2 + B.TileGap + 16 + step, cy: tout.slots[0]!.y, r: 20, colour: "cream" }).el);
      g.append(signDisc({ sign: "minus", ground: "verdict", cx: tout.slots[0]!.x + B.RowBodySize / 2, cy: tout.slots[0]!.y - B.RowBodySize / 2 }));
      put(tout.foot!, "Star chart", []);
      g.append(signDisc({ sign: "minus", ground: "verdict", cx: tout.foot!.x - B.RowBodySize / 2 + 4, cy: tout.foot!.y - B.RowBodySize / 2 + 4 }));
    }),
    boardCard("Item bodies, 44 across", (g) => {
      ITEM_KINDS.forEach((k, i) => g.append(itemBody({ kind: k, size: B.RowBodySize, cx: (i % 6) * 56, cy: Math.floor(i / 6) * 56 })));
    }),
    boardCard("Moving items, 36 across, latest marks under", (g) => {
      ITEM_KINDS.forEach((k, i) =>
        g.append(itemWithMarks(k, MARKS.slice(i % 4, (i % 4) + (i % 4)).map((m) => m.mark), (i % 4) * 130, Math.floor(i / 4) * 110, B.MovingBodySize)),
      );
    }),
    boardCard("Stopped item, dimmed to StopLight; rejected item", (g) => {
      const it = itemWithMarks("Treaty", ["laminated", "translated"], 0, 0, B.MovingBodySize);
      const dim = s("rect", { x: -60, y: -26, width: 120, height: 96, fill: colours.Ink, opacity: String(1 - tokens.feelRun.StopLight), "data-part": "dim" });
      g.append(it, dim);
      g.append(itemWithMarks("Cake", ["baked"], 150, 0, B.MovingBodySize));
      g.append(signDisc({ sign: "minus", ground: "verdict", cx: 150 - B.MovingBodySize / 2 + 2, cy: -B.MovingBodySize / 2 + 2 }));
    }),
    boardCard("Mark tiles", (g) => {
      MARKS.forEach((m, i) => g.append(markTile({ code: markCode(m.mark), shape: markShape(m.mark), metrics, cx: (i % 6) * 44, cy: Math.floor(i / 6) * 44 })));
    }),
    boardCard("Silhouettes: on a band, on a stamp", (g) => {
      g.append(s("rect", { x: -6, y: -6, width: 6 * 40 + 8, height: 34, fill: colours.Ink }));
      SILHOUETTES.forEach((n, i) => g.append(silhouetteSvg({ name: n, size: B.SilhouetteWidth * 1.2, solid: "cream", x: i * 40, y: 0 })));
      g.append(s("rect", { x: -6, y: 34, width: 6 * 40 + 8, height: 34, fill: colours.Cream, stroke: colours.Ink, "stroke-width": art.OutlineWeight }));
      SILHOUETTES.forEach((n, i) => g.append(silhouetteSvg({ name: n, size: B.SilhouetteWidth * 1.2, solid: "ink", x: i * 40, y: 40 })));
    }),
  );

  // Sound
  const plates = SOUND_NAMES.map((name) => plate({ label: name === "runSwitch" ? "RUN SWITCH" : name.toUpperCase(), onPress: () => sound.play(name) }).el);
  const mute = switchPiece({
    label: "AUDIO",
    withLamp: true,
    lampOn: true,
    onFlip: () => {
      sound.setMuted(!sound.muted);
      mute.set(sound.muted);
      mute.lamp?.set(sound.muted ? "off" : "steady");
    },
  });
  root.append(section("Sound: nine voices, one mute switch", "sound", row(...plates, mute.el)));

  fitAll();
  // Resizes come many a frame: one fit on the next frame.
  let fitFrame = 0;
  window.addEventListener("resize", () => {
    if (!fitFrame)
      fitFrame = requestAnimationFrame(() => {
        fitFrame = 0;
        fitAll();
      });
  });
}

// ---------- test hooks ----------

/** Renders a voice offline: the same graph the page plays, into samples. */
async function renderVoice(name: SoundName, opts: VoiceOptions = {}, rate = 48000): Promise<{ rate: number; samples: number[] }> {
  const v = voiceOf(name, opts);
  const len = Math.ceil((Math.max(...v.parts.map((p) => p.at + p.dur)) + 0.05) * rate);
  const ctx = new OfflineAudioContext(1, len, rate);
  scheduleVoice(ctx, ctx.destination, v, 0);
  const buf = await ctx.startRendering();
  return { rate, samples: Array.from(buf.getChannelData(0)) };
}

declare global {
  interface Window {
    __tc?: {
      ready: boolean;
      tokens: typeof tokens;
      metrics: typeof metrics;
      voiceOf: typeof voiceOf;
      renderVoice: typeof renderVoice;
      createSound: typeof createSound;
    };
  }
}

build();
window.__tc = { ready: true, tokens, metrics, voiceOf, renderVoice, createSound };
