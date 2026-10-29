// Printout (ART-12 teletype paper, ui/style.md Printout, FEEL-09, FEEL-13,
// REPORT-04): a Cream paper strip with perforated edges, PaperColumns
// characters wide, Ink MonoStack type. It feeds up from the window's bottom
// edge over PaperFeedTime, prints a line each PrintLineTime, and closes on a
// tap once whole, tearing away over TearTime. A tap while it prints prints the
// rest at once (FEEL-17). Its foot holds the lines after a report and its
// plates, and stays in view while the paper above scrolls.
import { colours, feel, feelCampaign, objects, shared } from "../tokens";
import { easings, popKeyframes, tween, wait, type Motion } from "../motion";
import { h, s } from "./dom";
import { silhouetteSvg, type SilhouetteName } from "./silhouette";

export interface PrintLine {
  /** One authored line, however many rows it wraps to. */
  text: string;
  /** Double strike (ART-12): the lead, the unlock line, a memo's family name. */
  double?: boolean;
  /** A memo's stamp: its family's silhouette beside the family name, solid Ink with Cream lines. */
  stamp?: SilhouetteName;
  /** The teletype's bell rings before this line, and printing waits BellLead (FEEL-09, CAMPAIGN-06). */
  bell?: boolean;
}

/**
 * ART-12 wrap: a line longer than the columns wraps at spaces; a word longer
 * than the columns breaks at the column, as a save code does.
 */
export function wrapPaperLine(text: string, cols: number = objects.PaperColumns): string[] {
  const rows: string[] = [];
  let cur = "";
  const flush = () => {
    rows.push(cur);
    cur = "";
  };
  for (const word of text.split(" ")) {
    let w = word;
    if (cur && cur.length + 1 + w.length <= cols) {
      cur += " " + w;
      continue;
    }
    if (cur) flush();
    while (w.length > cols) {
      rows.push(w.slice(0, cols));
      w = w.slice(cols);
    }
    cur = w;
  }
  if (cur || rows.length === 0) flush();
  return rows;
}

export interface PrintoutOptions {
  lines: PrintLine[];
  /** Lines printed after `lines`, into the paper's foot, one each PrintLineTime: the lines after a report (CAMPAIGN-06). */
  foot?: PrintLine[];
  /** The bell of a line marked `bell` (ART-24); printing at once rings it at once. */
  onBell?: () => void;
  /** Plates and a field on the paper, in its foot, shown once it is whole. */
  controls?: HTMLElement[];
  /** Called as each line prints, for its teletype sound (ART-23); `atOnce` for a printout that prints at once. */
  onLine?: (line: PrintLine, index: number) => void;
  onAtOnce?: (lines: PrintLine[]) => void;
  /** Called once the tear has ended. */
  onClosed?: () => void;
  columns?: number;
}

export interface Printout {
  el: HTMLElement;
  /** Feeds and prints line by line. */
  print(): Promise<void>;
  /** Stands whole at its top at once (a filed report, or a tap while printing). */
  printAtOnce(): void;
  /** Adds a line after the paper's lines: into the foot, as the lines after a report (CAMPAIGN-06). */
  addFootLine(line: PrintLine): void;
  /** REPORT-04: a tap prints the rest at once, or closes it once whole. */
  tap(): void;
  close(): Promise<void>;
  /**
   * Gone at once, with no tear (another order opened): its motions stop and it leaves the screen, which the frame then
   * frees. One already tearing has closed: its close ends there.
   */
  dispose(): void;
  readonly state: "waiting" | "printing" | "whole" | "tearing" | "closed";
  /** Positions it: foot on the window's bottom edge, centred on the window, never past `minX`/`maxX`, its top no higher than `top`. */
  place(g: { centreX: number; bottom: number; top: number; minX: number; maxX: number }): void;
}

function perfEdge(): HTMLElement {
  // Holes one paper line apart (design silent on hole size: a fifth of PerfMargin each side of centre, as the previews).
  const svg = s("svg", { width: "100%", height: "100%", "aria-hidden": "true" });
  const id = `tc-perf-${Math.round(performance.now() * 1000)}-${perfCount++}`;
  const pat = s(
    "pattern",
    { id, width: 10, height: 13, patternUnits: "userSpaceOnUse", "data-part": "perforation" },
    s("circle", { cx: 5, cy: 6.5, r: 2, fill: colours.Ink }),
  );
  svg.append(s("defs", {}, pat), s("rect", { width: "100%", height: "100%", fill: `url(#${id})` }));
  return h("div", { class: "tc-perf" }, svg);
}
let perfCount = 0;

export function printout(o: PrintoutOptions): Printout {
  const cols = o.columns ?? objects.PaperColumns;
  const lines = h("div", { class: "tc-lines" });
  const body = h("div", { class: "tc-pbody" }, lines);
  const footLines = h("div", { class: "tc-footlines" });
  const controls = h("div", { class: "tc-controls" });
  const foot = h("div", { class: "tc-foot" }, footLines, controls);
  const showFoot = () => (foot.style.display = footLines.childElementCount || controls.childElementCount ? "" : "none");
  showFoot();
  const left = perfEdge();
  left.classList.add("tc-l");
  const right = perfEdge();
  right.classList.add("tc-r");
  const el = h("section", { class: "tc-paper", "data-piece": "printout", role: "document" }, left, right, body, foot);
  el.style.setProperty("--PaperColumns", String(cols));
  el.style.visibility = "hidden";
  let state: Printout["state"] = "waiting";
  let running: Motion | null = null;
  let next = 0;
  const footList = o.foot ?? [];
  let footNext = 0;
  let resolvePrint: (() => void) | null = null;

  // The perforation pattern repeats one paper line apart, sized by the paper's type.
  const sizePerf = () => {
    const px = parseFloat(getComputedStyle(el).fontSize) || 14;
    const perf = parseFloat(getComputedStyle(left).width) || 10;
    for (const edge of [left, right])
      for (const p of edge.querySelectorAll("pattern")) {
        p.setAttribute("width", String(perf));
        p.setAttribute("height", String(px * 1.3));
        const c = p.querySelector("circle")!;
        c.setAttribute("cx", String(perf / 2));
        c.setAttribute("cy", String((px * 1.3) / 2));
        c.setAttribute("r", String(perf * 0.2));
      }
  };

  const lineEl = (line: PrintLine, quick: boolean): HTMLElement => {
    const rows = wrapPaperLine(line.text, cols).join("\n");
    const d = h("div", { class: "tc-ln", "data-part": "paper-line" });
    if (line.stamp) {
      const stamp = silhouetteSvg({ name: line.stamp, size: 0, solid: "ink" });
      stamp.setAttribute("class", "tc-stamp");
      d.append(stamp);
      if (!quick) stamp.animate(popKeyframes(), { duration: feel.PopTime * 1000, easing: "ease-out" });
    }
    const txt = h("span", { class: "tc-txt" }, h("span", { "data-part": "strike1" }, rows));
    if (line.double) {
      const second = h("span", { class: "tc-strike2", "aria-hidden": "true", "data-part": "strike2" }, rows);
      if (!quick) {
        second.style.visibility = "hidden";
        setTimeout(() => (second.style.visibility = ""), feelCampaign.DoubleStrikeGap * 1000);
      }
      txt.append(second);
    }
    d.append(txt);
    return d;
  };

  const keepNewest = () => {
    body.scrollTop = body.scrollHeight;
  };

  // A paper taller than its room shows whole rows only (design silent): its body ends at the last row that fits whole,
  // counted from its top, and the paper stands that much lower.
  const fitRows = () => {
    body.style.maxHeight = "";
    if (body.scrollHeight <= body.clientHeight + 1) return;
    const cs = getComputedStyle(body);
    const padTop = parseFloat(cs.paddingTop);
    const padBottom = parseFloat(cs.paddingBottom);
    const room = body.clientHeight - padTop - padBottom;
    const top = body.getBoundingClientRect().top + padTop - body.scrollTop;
    let fit = 0;
    for (const ln of lines.children) {
      const r = ln.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(ln).lineHeight);
      const rows = Math.max(1, Math.round(r.height / lh));
      for (let i = 1; i <= rows; i++) {
        const bottom = r.top - top + (i === rows ? r.height : i * lh);
        if (bottom <= room + 0.5) fit = Math.max(fit, bottom);
      }
    }
    body.style.maxHeight = `${padTop + fit + padBottom}px`;
  };

  const becomeWhole = (quick: boolean) => {
    state = "whole";
    for (const c of o.controls ?? []) controls.append(c);
    showFoot();
    fitRows();
    if (quick) body.scrollTop = 0;
    else if (body.scrollHeight > body.clientHeight + 1) {
      const from = body.scrollTop;
      running = tween({ duration: feelCampaign.ScrollBackTime, ease: easings.easeOut, update: (p) => (body.scrollTop = from * (1 - p)) });
    }
    resolvePrint?.();
    resolvePrint = null;
  };

  const p: Printout = {
    el,
    print() {
      if (state !== "waiting") return Promise.resolve();
      state = "printing";
      el.style.visibility = "";
      sizePerf();
      return new Promise<void>((resolve) => {
        resolvePrint = resolve;
        const h0 = el.offsetHeight;
        running = tween({
          duration: feelCampaign.PaperFeedTime,
          ease: easings.easeOut,
          update: (q) => (el.style.transform = q >= 1 ? "" : `translateY(${(1 - q) * h0}px)`),
        });
        let rung = false;
        const step = () => {
          if (state !== "printing") return;
          if (next >= o.lines.length && footNext >= footList.length) {
            becomeWhole(false);
            return;
          }
          const inFoot = next >= o.lines.length;
          const line = inFoot ? footList[footNext]! : o.lines[next]!;
          if (line.bell && !rung) {
            rung = true;
            o.onBell?.();
            running = wait(feelCampaign.BellLead);
            void running.done.then(step);
            return;
          }
          rung = false;
          if (inFoot) {
            footLines.append(lineEl(line, false));
            showFoot();
            o.onLine?.(line, o.lines.length + footNext);
            footNext++;
          } else {
            lines.append(lineEl(line, false));
            keepNewest();
            o.onLine?.(line, next);
            next++;
          }
          running = wait(shared.PrintLineTime);
          void running.done.then(step);
        };
        void running.done.then(step);
      });
    },
    printAtOnce() {
      if (state === "whole" || state === "tearing" || state === "closed") return;
      running?.cancel();
      el.style.visibility = "";
      el.style.transform = "";
      sizePerf();
      const rest = o.lines.slice(next);
      for (const line of rest) lines.append(lineEl(line, true));
      next = o.lines.length;
      const footRest = footList.slice(footNext);
      for (const line of footRest) footLines.append(lineEl(line, true));
      footNext = footList.length;
      showFoot();
      if (footRest.some((l) => l.bell)) o.onBell?.();
      // ART-23: a report that prints at once sounds as one plain line.
      o.onAtOnce?.([...rest, ...footRest]);
      becomeWhole(true);
    },
    addFootLine(line) {
      footLines.append(lineEl(line, state !== "printing"));
      showFoot();
      if (state === "whole") fitRows();
    },
    tap() {
      if (state === "printing") p.printAtOnce();
      else if (state === "whole") void p.close();
    },
    close() {
      if (state !== "whole" && state !== "printing") return Promise.resolve();
      running?.finish();
      state = "tearing";
      el.classList.add("tc-tearing");
      running = wait(feelCampaign.TearTime);
      return running.done.then(() => {
        if (state === "closed") return;
        state = "closed";
        el.remove();
        o.onClosed?.();
      });
    },
    dispose() {
      if (state === "closed") return;
      const torn = state === "tearing";
      state = "closed";
      running?.cancel();
      running = null;
      el.remove();
      if (torn) o.onClosed?.();
    },
    get state() {
      return state;
    },
    place(g) {
      el.style.fontSize = "";
      const avail = g.maxX - g.minX;
      let w = el.offsetWidth;
      // Wider than the room: PaperTextSize shrinks until it fits.
      if (w > avail && w > 0) {
        const px = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${(px * avail) / w}px`;
        w = el.offsetWidth;
      }
      const leftX = Math.min(Math.max(g.centreX - w / 2, g.minX), g.maxX - w);
      el.style.left = `${leftX}px`;
      el.style.top = "auto";
      el.style.bottom = `calc(100% - ${g.bottom}px)`;
      el.style.maxHeight = `${g.bottom - g.top}px`;
      if (state === "whole") fitRows();
      sizePerf();
    },
  };
  // REPORT-04: once whole, a drag or the wheel on the paper scrolls it and closes nothing. A press that moves past
  // DRAG_SLOP is a drag, not a tap (design silent on the slop: 8 pixels, as the board's).
  const DRAG_SLOP = 8;
  let press: { id: number; y: number; top: number; moved: boolean } | null = null;
  let dragged = false;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest(".tc-plate, .tc-field")) return;
    press = { id: e.pointerId, y: e.clientY, top: body.scrollTop, moved: false };
    dragged = false;
  });
  el.addEventListener("pointermove", (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dy = e.clientY - press.y;
    if (!press.moved && Math.abs(dy) < DRAG_SLOP) return;
    if (!press.moved && state === "whole") running?.cancel();
    press.moved = true;
    if (state === "whole") body.scrollTop = press.top - dy;
  });
  const lift = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;
    dragged = press.moved;
    press = null;
  };
  el.addEventListener("pointerup", lift);
  el.addEventListener("pointercancel", lift);
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (state !== "whole") return;
      running?.cancel();
      body.scrollTop += e.deltaY;
    },
    { passive: false },
  );
  el.addEventListener("click", (e) => {
    const t = e.target as Element;
    if (t.closest(".tc-plate, .tc-field")) return;
    if (dragged) {
      dragged = false;
      return;
    }
    p.tap();
  });
  return p;
}

/** The save code field (ui/style.md Field): a Cream box with an Ink outline on the paper, PaperColumns wide, three rows. */
export function paperField(o: { value?: string; placeholder?: string } = {}): HTMLTextAreaElement {
  const f = h("textarea", { class: "tc-field", rows: 3, spellcheck: "false", autocomplete: "off", "data-piece": "field" });
  f.value = o.value ?? "";
  if (o.placeholder) f.placeholder = o.placeholder;
  // Text with no space in it, as a pasted code, fills each row to its last column (design silent).
  const fill = () => f.classList.toggle("tc-code", f.value.trim() !== "" && !/\s/.test(f.value.trim()));
  f.addEventListener("input", fill);
  fill();
  return f;
}
