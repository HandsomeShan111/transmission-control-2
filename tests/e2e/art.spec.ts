// ART- acceptance tests a browser can check (design/docs/build/acceptance-art.md),
// run on the design system's gallery, every piece in every state, at both
// preview sizes in three engines. Each test is named by its step id.
// Not here: ART-26, the shared picture, which Report sharing draws later.
import { expect, test, type Page } from "@playwright/test";
import { ART_INIT } from "./art-page";

const T = {
  colours: {
    Graphite: "#2b2e2c",
    GraphiteLight: "#454945",
    Cream: "#efe6cc",
    Ink: "#1c1c1a",
    Orange: "#e2692a",
    Mustard: "#e2b03a",
    Teal: "#3a9c92",
    Alarm: "#e32f36",
  },
  SansStack: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  MonoStack: '"Courier New", Courier, monospace',
  OutlineWeight: 3,
  WireWidth: 4,
  WireEdge: 2,
  DashLength: 9,
  DashGap: 6,
  HopRadius: 8,
  LampSize: 0.5,
  AlarmLampSize: 1,
  SignDiscSize: 0.5,
  SignSpan: 0.5,
  ArrowSize: 12,
  TraceWidth: 3,
  TraceLight: 0.55,
  TextContrast: 4.5,
  JackMinSize: 44,
  MarkTileSize: 32,
  MarkCodeWidth: 0.52,
  PaperColumns: 32,
  DoubleStrikeOffset: 0.08,
  StopLight: 0.6,
  LitBlinkTime: 0.8,
  BandHeight: 24,
  sound: {
    LevelQuiet: 0.25,
    LevelMid: 0.5,
    LevelLoud: 0.8,
    ClickMaxTime: 0.15,
    VerdictToneTime: 0.16,
    PlusPitch: 880,
    MinusPitch: 247,
    UnplugPitch: 400,
    UnplugDrop: 0.3,
    AlarmPitch: 440,
    AlarmBeat: 2,
    LineStrikes: 5,
    BellPitch: 1760,
    BellTime: 1.0,
    SwitchThrowTime: 0.12,
    PrintLineTime: 0.15,
    DoubleStrikeGap: 0.03,
    AlarmToneTime: 1.0,
  },
};
const PALETTE = new Set(Object.values(T.colours));
const C = T.colours;

// The page's art helpers (art-page.ts), typed for the tests.
declare global {
  interface Window {
    __art: {
      hex(c: string): { hex: string; a: number } | null;
      SHAPES: string;
      toBoard(el: Element, v: number): number;
      strokeW(el: Element): number;
      fillOf(el: Element): string;
      strokeOf(el: Element): string;
      visible(el: Element): boolean;
      ownText(el: Element): boolean;
      randomCalls(): number;
    };
  }
}

const fontRequests: Map<Page, string[]> = new Map();

test.beforeEach(async ({ page }) => {
  const seen: string[] = [];
  fontRequests.set(page, seen);
  page.on("request", (r) => {
    const t = r.resourceType();
    if (t === "font" || t === "media" || /\.(woff2?|ttf|otf|eot|mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(r.url())) seen.push(`${t} ${r.url()}`);
  });
  await page.addInitScript({ content: ART_INIT });
  await page.goto("/gallery.html");
  await page.waitForFunction(() => window.__tc?.ready === true);
  // Static states: blinking and transitions stand still for the scan.
  await page.addStyleTag({ content: "*{transition:none!important}" });
});

const norm = (f: string) => f.replace(/["']/g, "").replace(/\s*,\s*/g, ",").trim().toLowerCase();

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("ART-01 palette: only the eight colours, no gradient, Alarm only on the master alarm lamp", async ({ page }) => {
  const bad = await page.evaluate((palette) => {
    const A = window.__art;
    const pal = new Set(palette);
    const out: string[] = [];
    const alarm = "#e32f36";
    const check = (el: Element, prop: string, value: string) => {
      if (!value || value === "none" || value.startsWith("url(")) return;
      const c = A.hex(value);
      if (!c) return out.push(`${el.tagName} ${prop} ${value}`);
      if (c.a === 0) return;
      if (!pal.has(c.hex)) out.push(`${el.tagName}.${el.getAttribute("class") ?? ""} ${prop} ${c.hex}`);
      if (c.a < 1) out.push(`${el.tagName} ${prop} alpha ${c.a}`);
      if (c.hex === alarm && !el.closest('[data-piece="alarm-lamp"]')) out.push(`Alarm outside the master alarm lamp: ${el.tagName} ${prop}`);
    };
    for (const el of document.querySelectorAll("body, body *")) {
      if (["STYLE", "SCRIPT", "TITLE"].includes(el.tagName) || !A.visible(el)) continue;
      const cs = getComputedStyle(el);
      const svg = el instanceof SVGElement;
      if (!svg) {
        check(el, "color", cs.color);
        check(el, "background-color", cs.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const)
          if (parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && cs.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none")
            check(el, `border-${side}`, cs.getPropertyValue(`border-${side.toLowerCase()}-color`));
        if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) check(el, "outline", cs.outlineColor);
      } else if (el.matches(A.SHAPES)) {
        check(el, "fill", cs.fill);
        check(el, "stroke", cs.stroke);
      }
      if (cs.backgroundImage !== "none") out.push(`${el.tagName} background-image ${cs.backgroundImage}`);
      // A dim is the one blend: Ink laid over (ART-01).
      const op = Math.min(parseFloat(cs.opacity), svg ? parseFloat(cs.fillOpacity) : 1, svg && cs.stroke !== "none" ? parseFloat(cs.strokeOpacity) : 1);
      if (op > 0 && op < 1) {
        const ink = "#1c1c1a";
        const f = A.fillOf(el);
        const s = A.strokeOf(el);
        if (!((f === ink && (s === "none" || s === ink)) || (f === "none" && s === ink))) out.push(`a blend that is not an Ink dim: ${el.tagName} opacity ${op}`);
      }
    }
    if (document.querySelector("linearGradient, radialGradient, meshgradient")) out.push("an SVG gradient");
    return out;
  }, [...PALETTE]);
  expect(bad).toEqual([]);
});

test("ART-02 shape: hard outlines of OutlineWeight, Cream on Ink, Graphite or GraphiteLight, Ink on other fills; no shadow, gloss or blur", async ({ page }) => {
  const r = await page.evaluate((ow) => {
    const A = window.__art;
    const dark = new Set(["#1c1c1a", "#2b2e2c", "#454945"]);
    const out: string[] = [];
    let svgCount = 0;
    let domCount = 0;
    for (const el of document.querySelectorAll("[data-piece] rect, [data-piece] circle, [data-piece] path, [data-piece] polygon, [data-piece] ellipse")) {
      if (!A.visible(el) || el.closest("clipPath, pattern")) continue;
      const part = el.getAttribute("data-part") ?? "";
      if (["halo", "arrow", "detail", "ring", "ring-edge", "alarm-ring", "edge", "core", "sign"].includes(part)) continue;
      const fill = A.fillOf(el);
      const stroke = A.strokeOf(el);
      if (fill === "none" || stroke === "none" || fill.startsWith("url")) continue;
      svgCount++;
      const w = A.strokeW(el);
      if (Math.abs(w - ow) > 0.02) out.push(`${el.closest("[data-piece]")!.getAttribute("data-piece")} ${part} outline ${w}`);
      const want = dark.has(fill) ? "#efe6cc" : "#1c1c1a";
      if (stroke !== want) out.push(`${el.closest("[data-piece]")!.getAttribute("data-piece")} ${part}: ${fill} fill with ${stroke} outline`);
    }
    for (const el of document.querySelectorAll(".tc-plate, .tc-row, .tc-paper, .tc-field")) {
      if (!A.visible(el)) continue;
      const cs = getComputedStyle(el);
      domCount++;
      const bg = A.hex(cs.backgroundColor)!.hex;
      for (const side of ["top", "right", "bottom", "left"]) {
        const w = parseFloat(cs.getPropertyValue(`border-${side}-width`));
        if (w === 0) continue;
        if (Math.abs(w - ow) > 0.02) out.push(`${el.className} border ${side} ${w}`);
        const want = dark.has(bg) ? "#efe6cc" : "#1c1c1a";
        if (A.hex(cs.getPropertyValue(`border-${side}-color`))!.hex !== want) out.push(`${el.className}: ${bg} with a ${side} border not ${want}`);
      }
    }
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.boxShadow !== "none") out.push(`${el.tagName} box-shadow`);
      if (cs.textShadow !== "none") out.push(`${el.tagName} text-shadow`);
      if (cs.filter !== "none") out.push(`${el.tagName} filter`);
      if (el instanceof SVGElement && el.getAttribute("filter")) out.push(`${el.tagName} SVG filter`);
    }
    if (document.querySelector("filter, feGaussianBlur")) out.push("an SVG filter");
    return { out, svgCount, domCount };
  }, T.OutlineWeight);
  expect(r.out).toEqual([]);
  expect(r.svgCount).toBeGreaterThan(200);
  expect(r.domCount).toBeGreaterThan(40);
});

test("ART-03 type: SansStack for plates and labels, MonoStack for the teletype, capitals on RUN, AUDIO and jacks, no web fonts", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const fams: { font: string; mono: boolean; text: string }[] = [];
    for (const el of document.querySelectorAll("#gallery *")) {
      if (el.tagName === "STYLE" || !A.visible(el) || !A.ownText(el)) continue;
      fams.push({
        font: getComputedStyle(el).fontFamily,
        mono: !!el.closest(".tc-lines, .tc-footlines, .tc-field"),
        text: (el.textContent ?? "").trim().slice(0, 30),
      });
    }
    const caps = [...document.querySelectorAll('[data-piece="switch"] .tc-label, [data-piece="jack"] text')].map((e) => e.textContent ?? "");
    let fontFaces = 0;
    for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) if (rule instanceof CSSFontFaceRule) fontFaces++;
    return { fams, caps, fontFaces, fonts: document.fonts.size };
  });
  const sans = norm(T.SansStack);
  const mono = norm(T.MonoStack);
  const wrong = r.fams.filter((f) => norm(f.font) !== (f.mono ? mono : sans));
  expect(wrong).toEqual([]);
  expect(r.fams.filter((f) => f.mono).length).toBeGreaterThan(10);
  expect(r.fams.length).toBeGreaterThan(200);
  expect(r.caps.length).toBeGreaterThan(30);
  for (const c of r.caps) expect(c).toBe(c.toUpperCase());
  expect(r.caps).toEqual(expect.arrayContaining(["RUN", "AUDIO", "IN", "OUT", "ITEM", "COPY"]));
  expect(r.fontFaces).toBe(0);
  expect(r.fonts).toBe(0);
  expect(fontRequests.get(page)).toEqual([]);
});

test("ART-04 console frame: Graphite frame, Ink window, Orange rule of OutlineWeight, the RUN switch; the order strip above the window", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const frame = document.querySelector('#demo-board [data-piece="console-frame"]')!;
    const win = frame.querySelector(".tc-window")!;
    const cs = getComputedStyle(win);
    const run = frame.querySelector('[data-piece="switch"][data-label="RUN"]')!;
    const rr = run.getBoundingClientRect();
    const lever = run.querySelector('[data-part="lever"] path')!;
    const ob = frame.querySelector(".tc-obar")!.getBoundingClientRect();
    const cb = frame.querySelector(".tc-cbar")!.getBoundingClientRect();
    const wr = win.getBoundingClientRect();
    return {
      frame: A.hex(getComputedStyle(frame).backgroundColor)!.hex,
      ground: A.hex(cs.backgroundColor)!.hex,
      rule: ["top", "right", "bottom", "left"].map((s) => [parseFloat(cs.getPropertyValue(`border-${s}-width`)), cs.getPropertyValue(`border-${s}-style`), A.hex(cs.getPropertyValue(`border-${s}-color`))!.hex]),
      margin: parseFloat(cs.marginTop),
      run: { w: rr.width, h: rr.height, plate: A.hex(getComputedStyle(run).backgroundColor)!.hex, lever: A.fillOf(lever), label: run.textContent?.trim() },
      landscape: innerWidth > innerHeight,
      ob: [ob.left, ob.top, ob.right, ob.bottom],
      cb: [cb.left, cb.top, cb.right, cb.bottom],
      wr: [wr.left, wr.top, wr.right, wr.bottom],
      far: run.getBoundingClientRect()[innerWidth > innerHeight ? "bottom" : "right"],
    };
  });
  expect(r.frame).toBe(C.Graphite);
  expect(r.ground).toBe(C.Ink);
  for (const [w, style, colour] of r.rule) expect([w, style, colour]).toEqual([T.OutlineWeight, "solid", C.Orange]);
  expect(r.run.w).toBeGreaterThanOrEqual(T.JackMinSize);
  expect(r.run.h).toBeGreaterThanOrEqual(T.JackMinSize);
  expect(r.run.plate).toBe(C.Cream);
  expect(r.run.lever).toBe(C.Orange);
  expect(r.run.label).toBe("RUN");
  // Owner's change: the order bar a strip above the window, as wide as it; the control bar at the bottom (portrait) or the
  // right (landscape), the whole height; FrameMargin round the window.
  expect(r.margin).toBe(r.landscape ? 12 : 6);
  expect(r.ob[3]).toBeLessThanOrEqual(r.wr[1]!);
  expect(r.ob[0]).toBeLessThanOrEqual(r.wr[0]!);
  expect(r.ob[2]).toBeGreaterThanOrEqual(r.wr[2]!);
  if (r.landscape) {
    expect(r.cb[0]).toBeGreaterThanOrEqual(r.wr[2]!);
    expect(r.ob[2]).toBeLessThanOrEqual(r.cb[0]! + 0.5);
    expect(r.cb[1]).toBeLessThanOrEqual(r.ob[1]! + 0.5);
  } else {
    expect(r.cb[1]).toBeGreaterThanOrEqual(r.wr[3]!);
  }
});

test("ART-05 lamps: a lens of LampSize in four states; par, second-wiring and AUDIO lamps off or steady", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const lamps = [...document.querySelectorAll('[data-piece="lamp"]')].filter((e) => A.visible(e));
    return {
      lamps: lamps.map((g) => {
        const lens = g.querySelector('[data-part="lens"]')!;
        const sign = g.querySelector('[data-part="sign"]');
        return {
          state: g.getAttribute("data-state"),
          across: A.toBoard(lens, 2 * parseFloat(lens.getAttribute("r")!)) + A.strokeW(lens),
          fill: A.fillOf(lens),
          outline: A.strokeOf(lens),
          sign: sign && getComputedStyle(sign).display !== "none" ? sign.getAttribute("data-sign") : null,
          signStroke: sign && getComputedStyle(sign).display !== "none" ? [A.strokeOf(sign), A.strokeW(sign)] : null,
        };
      }),
      labelled: [...document.querySelectorAll('[data-piece="lamp-unit"]')].map((u) => ({
        label: u.querySelector(".tc-lamplabel")?.textContent ?? (u.closest(".tc-switchunit") ? "AUDIO" : ""),
        state: u.getAttribute("data-state"),
      })),
    };
  });
  const fill = { off: C.Graphite, steady: C.Mustard, plus: C.Teal, minus: C.Orange } as Record<string, string>;
  const states = new Set(r.lamps.map((l) => l.state));
  expect([...states].sort()).toEqual(["minus", "off", "plus", "steady"]);
  for (const l of r.lamps) {
    expect(l.across).toBeCloseTo(T.LampSize * T.JackMinSize, 1);
    expect(l.fill).toBe(fill[l.state!]);
    expect(l.outline).toBe(l.state === "off" ? C.Cream : C.Ink);
    expect(l.sign).toBe(l.state === "plus" || l.state === "minus" ? l.state : null);
    if (l.signStroke) expect(l.signStroke).toEqual([C.Ink, T.OutlineWeight]);
  }
  for (const u of r.labelled.filter((x) => ["WIRES", "TIME", "MOVES", "2ND WIRING", "AUDIO"].includes(x.label))) expect(["off", "steady"]).toContain(u.state);
});

test("ART-06 master alarm: the largest lamp, lens AlarmLampSize, two standing Alarm rings of OutlineWeight a gap of OutlineWeight apart, no Ink edge", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const alarms = [...document.querySelectorAll('[data-piece="alarm-lamp"]')].filter((e) => A.visible(e));
    const lensOf = (g: Element) => g.querySelector('[data-part="lens"]')!;
    const across = (lens: Element) => A.toBoard(lens, 2 * parseFloat(lens.getAttribute("r")!)) + A.strokeW(lens);
    const others = [...document.querySelectorAll('[data-piece="lamp"] [data-part="lens"]')].map(across);
    return {
      alarms: alarms.map((g) => {
        const lens = lensOf(g);
        const rings = [...g.querySelectorAll('[data-part="alarm-ring"]')].filter((e) => A.visible(e));
        return {
          state: g.getAttribute("data-state"),
          across: across(lens),
          outerR: across(lens) / 2,
          fill: A.fillOf(lens),
          rings: rings.map((c) => ({ r: A.toBoard(c, parseFloat(c.getAttribute("r")!)), w: A.strokeW(c), stroke: A.strokeOf(c), fill: A.fillOf(c) })),
          inkCircles: [...g.querySelectorAll("circle")].filter((c) => c !== lens && A.visible(c) && A.strokeOf(c) === "#1c1c1a").length,
          ground: (() => {
            for (let e: Element | null = g.closest("svg"); e; e = e.parentElement) {
              const b = A.hex(getComputedStyle(e).backgroundColor);
              if (b && b.a > 0) return b.hex;
            }
            return null;
          })(),
        };
      }),
      largestOther: Math.max(...others),
    };
  });
  expect(r.alarms.map((a) => a.state).sort()).toEqual(expect.arrayContaining(["lit", "off"]));
  for (const a of r.alarms) {
    expect(a.across).toBeCloseTo(T.AlarmLampSize * T.JackMinSize, 1);
    expect(a.across).toBeGreaterThan(r.largestOther);
    expect(a.inkCircles).toBe(0);
    expect([C.Ink, C.Graphite]).toContain(a.ground);
    if (a.state === "off") {
      expect(a.fill).toBe(C.Graphite);
      expect(a.rings).toEqual([]);
    } else {
      expect(a.fill).toBe(C.Alarm);
      expect(a.rings.length).toBe(2);
      const [r0, r1] = a.rings.map((x) => x.r).sort((x, y) => x - y);
      for (const ring of a.rings) expect([ring.w, ring.stroke, ring.fill]).toEqual([T.OutlineWeight, C.Alarm, "none"]);
      // Gap of OutlineWeight from the lens, and between the rings.
      expect(r0! - T.OutlineWeight / 2 - a.outerR).toBeCloseTo(T.OutlineWeight, 2);
      expect(r1! - r0! - T.OutlineWeight).toBeCloseTo(T.OutlineWeight, 2);
    }
  }
});

test("ART-07 jacks and terminals: plates JackMinSize across, Ink output with Cream label, Cream input with Ink label, signed plus and minus; terminal panels", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const jacks = [...document.querySelectorAll('[data-piece="jack"]')].filter((e) => A.visible(e)).map((g) => {
      const plate = g.querySelector('[data-part="plate"]')!;
      const label = g.querySelector('[data-part="label"]');
      const sign = g.querySelector('[data-part="sign"]');
      return {
        kind: g.getAttribute("data-kind"),
        across: A.toBoard(plate, 2 * parseFloat(plate.getAttribute("r")!)) + A.strokeW(plate),
        plate: A.fillOf(plate),
        label: label ? [label.textContent, A.fillOf(label), label.getAttribute("text-anchor"), label.getAttribute("x")] : null,
        sign: sign ? [sign.getAttribute("data-sign"), A.strokeOf(sign)] : null,
      };
    });
    const terminals = [...document.querySelectorAll('[data-piece="terminal"]')].filter((e) => A.visible(e)).map((g) => {
      const panel = g.querySelector('[data-part="panel"]')!;
      const header = g.querySelector('[data-part="header"]')!;
      const label = g.querySelector(':scope > [data-part="label"]')!;
      const slots = [...g.querySelectorAll('[data-part="slot"]')];
      return {
        panel: [A.fillOf(panel), A.strokeOf(panel)],
        header: A.fillOf(header),
        label: A.fillOf(label),
        slots: slots.map((s) => [A.fillOf(s), s.getAttribute("width") === s.getAttribute("height")]),
      };
    });
    return { jacks, terminals };
  });
  const want = {
    output: [C.Ink, C.Cream],
    input: [C.Cream, C.Ink],
    plus: [C.Teal, null],
    minus: [C.Orange, null],
  } as Record<string, [string, string | null]>;
  expect(new Set(r.jacks.map((j) => j.kind))).toEqual(new Set(["output", "input", "plus", "minus"]));
  for (const j of r.jacks) {
    expect(j.across).toBeCloseTo(T.JackMinSize, 1);
    expect(j.plate).toBe(want[j.kind!]![0]);
    if (j.kind === "plus" || j.kind === "minus") {
      expect(j.sign).toEqual([j.kind, C.Ink]);
      expect(j.label).toBeNull();
    } else {
      expect(j.label![1]).toBe(want[j.kind!]![1]);
      expect(j.label![0]).toBe(j.label![0]!.toUpperCase());
      expect(j.label!.slice(2)).toEqual(["middle", "0"]);
    }
  }
  expect(r.terminals.length).toBeGreaterThanOrEqual(4);
  for (const t of r.terminals) {
    expect(t.panel).toEqual([C.GraphiteLight, C.Cream]);
    expect(t.header).toBe(C.Ink);
    expect(t.label).toBe(C.Cream);
    expect(t.slots.length).toBeGreaterThan(0);
    for (const s of t.slots) expect(s).toEqual([C.Ink, true]);
  }
});

test("ART-08 wires: core, edges, dashes, arrow, sign disc, hop and trace", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const dash = (el: Element) => getComputedStyle(el).strokeDasharray.split(/[\s,]+/).filter((x) => x && x !== "none").map(parseFloat);
    const wires = [...document.querySelectorAll('[data-piece="wire"]')].filter((e) => A.visible(e)).map((g) => {
      const edge = g.querySelector('[data-part="edge"]')! as SVGPathElement;
      const core = g.querySelector('[data-part="core"]')! as SVGPathElement;
      const arrow = g.querySelector('[data-part="arrow"]')! as SVGPathElement;
      const disc = g.querySelector('[data-piece="sign-disc"]');
      const bb = arrow.getBBox();
      const tm = arrow.getCTM()!;
      const gm = (g as SVGGElement).getCTM()!.inverse().multiply(tm);
      const len = core.getTotalLength();
      const start = core.getPointAtLength(0);
      const d = core.getAttribute("d")!;
      const ac = { x: gm.e, y: gm.f };
      const hops = [...d.matchAll(/A([\d.]+) ([\d.]+)/g)].map((m) => [parseFloat(m[1]!), parseFloat(m[2]!)]);
      const end = core.getPointAtLength(len);
      const straight = !/[QA]/.test(d) && d.split("L").length === 2;
      const discCircle = disc?.querySelector("circle");
      return {
        kind: g.getAttribute("data-kind"),
        edge: [A.strokeOf(edge), A.strokeW(edge), dash(edge)],
        core: [A.strokeOf(core), A.strokeW(core), dash(core)],
        arrow: { w: A.toBoard(arrow, bb.width), h: A.toBoard(arrow, bb.height), fill: A.fillOf(arrow), stroke: A.strokeOf(arrow), edge: A.strokeW(arrow) / 2, order: getComputedStyle(arrow).paintOrder },
        arrowAt: straight ? Math.hypot(ac.x - start.x, ac.y - start.y) / Math.hypot(end.x - start.x, end.y - start.y) : null,
        arrowAngle: straight ? Math.abs(((Math.atan2(gm.b, gm.a) - Math.atan2(end.y - start.y, end.x - start.x) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) : null,
        disc: discCircle ? { across: A.toBoard(discCircle, 2 * parseFloat(discCircle.getAttribute("r")!)) + A.strokeW(discCircle), fill: A.fillOf(discCircle), sign: disc!.getAttribute("data-sign") } : null,
        hops,
        held: g.querySelector('[data-part="held-tip"]') ? A.fillOf(g.querySelector('[data-part="held-tip"]')!) : null,
      };
    });
    const traces = [...document.querySelectorAll('[data-piece="trace"]')].map((p) => ({
      kind: p.getAttribute("data-kind"),
      stroke: A.strokeOf(p),
      opacity: parseFloat(getComputedStyle(p).strokeOpacity),
      w: A.strokeW(p),
      dash: dash(p),
      arcs: /A/.test(p.getAttribute("d")!),
      underText: (() => {
        const top = p.closest("svg")!.querySelector('[data-layer="top"]')!;
        return !!(p.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_FOLLOWING);
      })(),
    }));
    return { wires, traces };
  });
  const colour = { data: C.Cream, plus: C.Teal, minus: C.Orange } as Record<string, string>;
  expect(new Set(r.wires.map((w) => w.kind))).toEqual(new Set(["data", "plus", "minus"]));
  for (const w of r.wires) {
    const dashes = w.kind === "data" ? [] : [T.DashLength, T.DashGap];
    expect(w.core).toEqual([colour[w.kind!], T.WireWidth, dashes]);
    expect(w.edge).toEqual([C.Ink, T.WireWidth + 2 * T.WireEdge, dashes]);
    expect(w.arrow.w).toBeCloseTo(T.ArrowSize, 1);
    expect(w.arrow.h).toBeCloseTo(T.ArrowSize, 1);
    expect([w.arrow.fill, w.arrow.stroke]).toEqual([colour[w.kind!], C.Ink]);
    expect(w.arrow.edge).toBeCloseTo(T.WireEdge, 3);
    expect(w.arrow.order.startsWith("stroke")).toBe(true);
    if (w.arrowAt !== null) {
      expect(w.arrowAt).toBeCloseTo(0.75, 2);
      expect(w.arrowAngle!).toBeLessThan(0.01);
    }
    if (w.kind === "data") expect(w.disc).toBeNull();
    else expect(w.disc).toEqual({ across: T.SignDiscSize * T.JackMinSize, fill: C.Cream, sign: w.kind });
    for (const [rx, ry] of w.hops.filter(([rx]) => rx === T.HopRadius)) expect([rx, ry]).toEqual([T.HopRadius, T.HopRadius]);
  }
  expect(r.wires.some((w) => w.hops.some(([rx]) => rx === T.HopRadius))).toBe(true);
  expect(r.wires.some((w) => w.held === C.Mustard)).toBe(true);
  expect(new Set(r.traces.map((t) => t.kind))).toEqual(new Set(["data", "plus"]));
  for (const t of r.traces) {
    expect([t.stroke, t.w]).toEqual([C.Ink, T.TraceWidth]);
    expect(t.opacity).toBeCloseTo(1 - T.TraceLight, 3);
    expect(t.dash).toEqual(t.kind === "data" ? [] : [T.DashLength, T.DashGap]);
    expect(t.arcs).toBe(false);
    expect(t.underText).toBe(true);
  }
});

test("ART-09 agent faces: Cream face, Ink band with Cream silhouette and family name, Ink name and rule, bottom row, jacks in order", async ({ page }) => {
  const r = await page.evaluate((band) => {
    const A = window.__art;
    const tops = [...document.querySelectorAll('[data-layer="top"]')].filter((e) => A.visible(e));
    const faces = tops.map((top) => {
      const svg = top.closest("svg")!;
      const base = [...svg.querySelectorAll('[data-layer="base"]')].find((b) => b.getAttribute("transform") === top.getAttribute("transform"))!;
      const face = base.querySelector('[data-part="face"]')!;
      const bandEl = base.querySelector('[data-part="band"]')! as SVGGraphicsElement;
      const sil = top.querySelector('[data-piece="silhouette"]')!;
      const fam = top.querySelector('[data-part="family"]')!;
      const name = top.querySelector('[data-part="name"]')!;
      const rules = [...top.querySelectorAll('[data-part="rule"]')];
      const lampG = top.querySelector('[data-piece="lamp"]') as SVGGraphicsElement;
      const tile = top.querySelector('[data-piece="mark-tile"]') as SVGGraphicsElement | null;
      const pass = top.querySelector('[data-part="pass-limit"]');
      const role = base.getAttribute("data-role");
      const halo = sil.querySelector('[data-part="halo"]')!;
      const fh = parseFloat(face.getAttribute("height")!);
      const bottom = (el: SVGGraphicsElement) => {
        const b = el.getBBox();
        const t = (el.transform.baseVal.consolidate()?.matrix) ?? { f: 0 };
        return b.y + t.f + b.height / 2;
      };
      return {
        role,
        face: [A.fillOf(face), A.strokeOf(face)],
        band: [A.fillOf(bandEl), bandEl.getBBox().height],
        sil: { solid: [...sil.querySelectorAll('[data-part="solid"]')].map((e) => A.fillOf(e)), detail: [...sil.querySelectorAll('[data-part="detail"]')].map((e) => A.strokeOf(e)), halo: [A.fillOf(halo), A.strokeOf(halo), A.strokeW(halo) / 2], name: sil.getAttribute("data-silhouette") },
        fam: [A.fillOf(fam), A.strokeOf(fam), A.strokeW(fam) / 2, getComputedStyle(fam).paintOrder],
        name: A.fillOf(name),
        rule: rules.map((e) => A.fillOf(e)),
        rowY: [bottom(lampG), tile ? bottom(tile) : null, pass ? parseFloat(pass.getAttribute("y")!) : null],
        faceH: fh,
        hasTile: !!tile,
        hasPass: !!pass,
      };
    });
    const jackOrder = [...document.querySelectorAll('[data-layer="jacks"]')].map((g) => {
      const at = (n: string) => {
        const j = g.querySelector(`[data-jack="${n}"]`) as SVGGraphicsElement | null;
        if (!j) return null;
        const m = j.transform.baseVal.consolidate()!.matrix;
        return { x: m.e, y: m.f };
      };
      return { in: at("in"), out: at("out"), plus: at("plus"), minus: at("minus"), item: at("item"), copy: at("copy") };
    });
    return { faces, jackOrder, band };
  }, T.BandHeight);
  expect(r.faces.length).toBeGreaterThanOrEqual(15);
  for (const f of r.faces) {
    expect(f.face).toEqual([C.Cream, C.Ink]);
    expect(f.band[0]).toBe(C.Ink);
    // ui/board.md: the band, 24 high, from the face's top edge; the outline's Ink lies over its edge.
    expect(f.band[1]).toBeCloseTo(r.band, 0);
    expect(new Set(f.sil.solid)).toEqual(new Set([C.Cream]));
    expect(new Set(f.sil.detail)).toEqual(new Set([C.Ink]));
    expect(f.sil.halo[0]).toBe(C.Ink);
    expect(f.sil.halo[1]).toBe(C.Ink);
    expect(f.sil.halo[2]).toBeCloseTo(T.WireEdge, 2);
    expect(f.fam.slice(0, 2)).toEqual([C.Cream, C.Ink]);
    expect(f.fam[2]).toBeCloseTo(T.WireEdge, 2);
    expect(String(f.fam[3]).startsWith("stroke")).toBe(true);
    expect(f.name).toBe(C.Ink);
    expect(f.rule.length).toBeGreaterThanOrEqual(1);
    expect(f.rule.length).toBeLessThanOrEqual(2);
    for (const c of f.rule) expect(c).toBe(C.Ink);
    // Bottom row: the lamp, then the mark tile or the PassLimit label, in the face's last 40.
    expect(f.rowY[0]!).toBeGreaterThan(f.faceH - 40);
    if (f.role === "checker") expect(f.hasPass && !f.hasTile).toBe(true);
    else expect(f.hasTile && !f.hasPass).toBe(true);
  }
  expect(new Set(r.faces.map((f) => f.sil.name)).size).toBe(6);
  // Jacks: input upstream, outputs downstream; plus before minus, item before copy, in lane order.
  for (const j of r.jackOrder) {
    const outs = [j.out, j.plus, j.minus, j.item, j.copy].filter(Boolean) as { x: number; y: number }[];
    const landscape = Math.abs(outs[0]!.y - j.in!.y) < Math.abs(outs[0]!.x - j.in!.x);
    for (const o of outs) expect(landscape ? o.x > j.in!.x : o.y > j.in!.y).toBe(true);
    if (j.plus) expect(landscape ? j.plus.y < j.minus!.y : j.plus.x < j.minus!.x).toBe(true);
    if (j.item) expect(landscape ? j.item.y < j.copy!.y : j.item.x < j.copy!.x).toBe(true);
  }
});

test("ART-10 item bodies: Cream and Ink with at most one accent; no two share an outline", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const seen = new Map<string, { colours: string[]; outline: string }>();
    for (const g of document.querySelectorAll('[data-piece="item-body"]')) {
      const kind = g.getAttribute("data-kind")!;
      if (seen.has(kind)) continue;
      const colours = new Set<string>();
      for (const e of g.querySelectorAll("*")) for (const c of [A.fillOf(e), A.strokeOf(e)]) if (c && c !== "none") colours.add(c);
      const outline = [...g.querySelectorAll('[data-part="outline"]')]
        .map((e) => [e.tagName, ...["d", "x", "y", "width", "height", "r", "cx", "cy", "rx", "transform"].map((a) => e.getAttribute(a) ?? "")].join(" "))
        .join("|");
      seen.set(kind, { colours: [...colours], outline });
    }
    return [...seen.entries()];
  });
  expect(r.map(([k]) => k).sort()).toEqual(["Address", "Cake", "Coffee", "Confetti", "Cube", "Flag", "Moon rock", "Sandwich", "Satellite", "Spacesuit", "Star chart", "Treaty"]);
  for (const [kind, b] of r) {
    const accents = b.colours.filter((c) => c !== C.Cream && c !== C.Ink);
    expect(accents.length, kind).toBeLessThanOrEqual(1);
    expect(accents, kind).not.toContain(C.Alarm);
    expect(b.colours, kind).toEqual(expect.arrayContaining([C.Cream, C.Ink]));
  }
  expect(new Set(r.map(([, b]) => b.outline)).size).toBe(12);
});

test("ART-11 mark tiles: MarkTileSize across in the family's shape, Ink fill, Cream outline inside, one code size, codes centred", async ({ page }) => {
  const info = await page.evaluate(() => {
    const A = window.__art;
    const card = document.querySelector('[data-board="Mark tiles"]')!;
    const tiles = [...card.querySelectorAll('[data-piece="mark-tile"]')].map((g) => {
      const path = g.querySelector('[data-part="tile"]')! as SVGPathElement;
      const text = g.querySelector('[data-part="code"]')! as SVGTextElement;
      const cs = getComputedStyle(text);
      const ctx = document.createElement("canvas").getContext("2d")!;
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const nums = (path.getAttribute("d")!.match(/-?[\d.]+/g) ?? []).map(Number);
      const ys = nums.filter((_, i) => i % 2 === 1);
      const shape = g.getAttribute("data-shape")!;
      const r = path.getBoundingClientRect();
      return {
        code: g.getAttribute("data-code"),
        shape,
        fill: A.fillOf(path),
        stroke: [A.strokeOf(path), A.strokeW(path)],
        text: [A.fillOf(text), text.textContent, cs.fontFamily, cs.fontSize],
        width: text.getComputedTextLength(),
        baseline: parseFloat(text.getAttribute("y")!),
        cap: ctx.measureText("H").actualBoundingBoxAscent,
        centre: shape === "pentagon" ? ys.reduce((a, b) => a + b, 0) / ys.length : 0,
        box: [r.left + r.width / 2, r.top + r.height / 2],
      };
    });
    const c = card.getBoundingClientRect();
    return { tiles, card: [c.left, c.top] };
  });
  const shapes: Record<string, string> = { LA: "circle", SH: "circle", TR: "square", SU: "square", BA: "hexagon", SL: "hexagon", CR: "pentagon", RE: "pentagon", AP: "octagon", SE: "octagon", WR: "arch", LB: "arch" };
  expect(info.tiles.map((t) => t.code).sort()).toEqual(Object.keys(shapes).sort());
  const sizes = new Set(info.tiles.map((t) => t.text[3]));
  expect(sizes.size).toBe(1);
  const widest = Math.max(...info.tiles.map((t) => t.width));
  expect(widest).toBeCloseTo(T.MarkCodeWidth * T.MarkTileSize, 0);
  for (const t of info.tiles) {
    expect(t.shape).toBe(shapes[t.code!]);
    expect(t.fill).toBe(C.Ink);
    expect(t.stroke).toEqual([C.Cream, T.OutlineWeight]);
    expect(t.text[0]).toBe(C.Cream);
    expect(t.text[1]).toBe(String(t.text[1]).toUpperCase());
    expect(norm(String(t.text[2]))).toBe(norm(T.SansStack));
    // The cap block, baseline to cap height, centred on the shape's centre.
    expect(t.baseline - t.cap / 2).toBeCloseTo(t.centre, 1);
  }
  // Tile across: the Cream outline's extent, from the rendered pixels.
  const png = await page.locator('[data-board="Mark tiles"]').screenshot();
  const across = await page.evaluate(
    async ({ b64, tiles, card }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const cx = cv.getContext("2d")!;
      cx.drawImage(img, 0, 0);
      return tiles.map(([x, y]) => {
        const x0 = Math.round(x! - card[0]! - 24);
        const y0 = Math.round(y! - card[1]! - 24);
        const d = cx.getImageData(x0, y0, 48, 48).data;
        let minX = 99;
        let maxX = -1;
        for (let j = 0; j < 48; j++)
          for (let i = 0; i < 48; i++) {
            const k = (j * 48 + i) * 4;
            // Any pixel with a share of the Cream outline: lighter than the Ink ground by a fifth of the step.
            if (d[k]! > 28 + (239 - 28) * 0.5) {
              minX = Math.min(minX, i);
              maxX = Math.max(maxX, i);
            }
          }
        return maxX - minX + 1;
      });
    },
    { b64: png.toString("base64"), tiles: info.tiles.map((t) => t.box), card: info.card },
  );
  for (const a of across) expect(Math.abs(a - T.MarkTileSize)).toBeLessThanOrEqual(1.5);
});

test("ART-12 teletype paper: Cream strip, perforated edges, PaperColumns wide, wraps, double strike, Ink mono, pressed plate", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    const papers = [...document.querySelectorAll('[data-piece="printout"]')].filter((e) => A.visible(e));
    return papers.map((p) => {
      const cs = getComputedStyle(p);
      const lines = p.querySelector(".tc-lines")!;
      const probe = document.createElement("span");
      probe.textContent = "M".repeat(40);
      probe.style.whiteSpace = "pre";
      lines.appendChild(probe);
      const cw = probe.getBoundingClientRect().width / 40;
      probe.remove();
      const rows = [...p.querySelectorAll('[data-part="strike1"]')].flatMap((s) => (s.textContent ?? "").split("\n"));
      const doubles = [...p.querySelectorAll('[data-part="strike2"]')].map((s2) => {
        const s1 = s2.parentElement!.querySelector('[data-part="strike1"]')!;
        return { dx: s2.getBoundingClientRect().left - s1.getBoundingClientRect().left, same: s1.textContent === s2.textContent };
      });
      const stamp = p.querySelector('[data-piece="silhouette"]');
      const pressed = p.querySelector(".tc-plate.tc-pressed");
      const pcs = pressed ? getComputedStyle(pressed) : null;
      const colours = new Set<string>();
      for (const e of p.querySelectorAll("*")) {
        if (e instanceof SVGElement && e.matches(A.SHAPES)) for (const c of [A.fillOf(e), A.strokeOf(e)]) if (c && c !== "none" && !c.startsWith("url")) colours.add(c);
        if (!(e instanceof SVGElement) && A.ownText(e)) colours.add(A.hex(getComputedStyle(e).color)!.hex);
      }
      return {
        bg: A.hex(cs.backgroundColor)!.hex,
        border: [parseFloat(cs.borderTopWidth), A.hex(cs.borderTopColor)!.hex],
        font: cs.fontFamily,
        color: A.hex(cs.color)!.hex,
        perf: p.querySelectorAll(".tc-perf pattern circle").length,
        perfFill: [...p.querySelectorAll(".tc-perf pattern circle")].map((c) => A.fillOf(c)),
        linesWidth: lines.getBoundingClientRect().width,
        cw,
        rows,
        doubles,
        stamp: stamp ? { solid: [...stamp.querySelectorAll('[data-part="solid"]')].map((e) => A.fillOf(e)), detail: [...stamp.querySelectorAll('[data-part="detail"]')].map((e) => A.strokeOf(e)) } : null,
        pressed: pcs ? { bg: A.hex(pcs.backgroundColor)!.hex, color: A.hex(pcs.color)!.hex, outline: [parseFloat(pcs.outlineWidth), pcs.outlineStyle, A.hex(pcs.outlineColor)!.hex, parseFloat(pcs.outlineOffset)] } : null,
        colours: [...colours],
      };
    });
  });
  expect(r.length).toBeGreaterThanOrEqual(5);
  for (const p of r) {
    expect(p.bg).toBe(C.Cream);
    expect(p.border).toEqual([T.OutlineWeight, C.Ink]);
    expect(norm(p.font)).toBe(norm(T.MonoStack));
    expect(p.color).toBe(C.Ink);
    expect(p.perf).toBe(2);
    expect(new Set(p.perfFill)).toEqual(new Set([C.Ink]));
    expect(p.linesWidth).toBeCloseTo(T.PaperColumns * p.cw, 0);
    for (const row of p.rows) expect(row.length).toBeLessThanOrEqual(T.PaperColumns);
    for (const d of p.doubles) {
      expect(d.same).toBe(true);
      expect(d.dx).toBeCloseTo(T.DoubleStrikeOffset * p.cw, 0);
    }
    if (p.stamp) {
      expect(new Set(p.stamp.solid)).toEqual(new Set([C.Ink]));
      expect(new Set(p.stamp.detail)).toEqual(new Set([C.Cream]));
    }
    if (p.pressed) expect(p.pressed).toEqual({ bg: C.Cream, color: C.Ink, outline: [T.OutlineWeight, "solid", C.Ink, T.OutlineWeight] });
    for (const c of p.colours) expect([C.Ink, C.Cream]).toContain(c);
  }
  const all = r.flatMap((p) => p.rows);
  // A line longer than PaperColumns wraps at spaces; a word longer breaks at the column, as a save code does.
  expect(all).toContain("everything on file, nothing ever");
  expect(all.some((x) => x.length === T.PaperColumns && !x.includes(" "))).toBe(true);
  expect(r.some((p) => p.doubles.length > 0)).toBe(true);
  expect(r.some((p) => p.stamp)).toBe(true);
  expect(r.some((p) => p.pressed)).toBe(true);
});

test("ART-13 verdict colour and sign: plus Teal, minus Orange, Ink signs of OutlineWeight SignSpan of their part", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    return [...document.querySelectorAll('[data-part="sign"]')]
      .filter((s) => A.visible(s) && getComputedStyle(s).display !== "none")
      .map((s) => {
        const host = s.parentElement!;
        const round = host.querySelector(":scope > circle")!;
        const b = (s as SVGPathElement).getBBox();
        const kind = s.getAttribute("data-sign");
        return {
          kind,
          stroke: [A.strokeOf(s), A.strokeW(s), A.fillOf(s)],
          part: A.fillOf(round),
          span: A.toBoard(s, b.width) / (A.toBoard(round, 2 * parseFloat(round.getAttribute("r")!)) + A.strokeW(round)),
          upright: A.toBoard(s, b.height) / (A.toBoard(round, 2 * parseFloat(round.getAttribute("r")!)) + A.strokeW(round)),
        };
      });
  });
  expect(r.length).toBeGreaterThan(20);
  for (const s of r) {
    expect(s.stroke).toEqual([C.Ink, T.OutlineWeight, "none"]);
    expect([C.Cream, s.kind === "plus" ? C.Teal : C.Orange]).toContain(s.part);
    expect(s.span).toBeCloseTo(T.SignSpan, 2);
    // Told apart without hue: a plus adds the upright stroke.
    expect(s.upright).toBeCloseTo(s.kind === "plus" ? T.SignSpan : 0, 2);
  }
  expect(r.some((s) => s.part === C.Teal)).toBe(true);
  expect(r.some((s) => s.part === C.Orange)).toBe(true);
});

test("ART-14 text contrast: Ink on Cream, Cream on Ink, Graphite or GraphiteLight, at least TextContrast as rendered", async ({ page }) => {
  // Every text's own colour is Ink or Cream: colour never carries text.
  const colours = await page.evaluate(() => {
    const A = window.__art;
    const out: string[] = [];
    for (const el of document.querySelectorAll("#gallery *")) {
      if (el.tagName === "STYLE" || !A.visible(el)) continue;
      const svgText = el instanceof SVGElement && el.tagName === "text";
      if (!svgText && (el instanceof SVGElement || !A.ownText(el))) continue;
      out.push(svgText ? A.fillOf(el) : A.hex(getComputedStyle(el).color)!.hex);
    }
    return out;
  });
  expect(colours.length).toBeGreaterThan(200);
  for (const c of colours) expect([C.Ink, C.Cream]).toContain(c);

  // Rendered pairs: per section, the ground is a text box's commonest colour; the text its colour of most contrast.
  const sections = await page.locator("[data-gallery], .g-demo").all();
  const low: string[] = [];
  let measured = 0;
  for (const sec of sections) {
    const png = await sec.screenshot();
    const res = await page.evaluate(
      async ({ b64, el }) => {
        const A = window.__art;
        const root = el as Element;
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = img.height;
        const cx = cv.getContext("2d")!;
        cx.drawImage(img, 0, 0);
        const rr = root.getBoundingClientRect();
        const papers = [...root.querySelectorAll(".tc-paper")].map((p) => p.getBoundingClientRect());
        const inside = (a: DOMRect, b: DOMRect) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
        const out: { text: string; ground: string; fg: string }[] = [];
        for (const el2 of root.querySelectorAll("*")) {
          const svgText = el2 instanceof SVGElement && el2.tagName === "text";
          if (!svgText && (el2 instanceof SVGElement || !A.ownText(el2))) continue;
          if (!A.visible(el2)) continue;
          const r = el2.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          // Shown: inside every clipping box round it, and under no paper it is not on.
          let shown = true;
          for (let e = el2.parentElement; e && e !== root.parentElement; e = e.parentElement) {
            const o = getComputedStyle(e).overflow;
            if (o !== "visible" && !inside(r, e.getBoundingClientRect())) shown = false;
          }
          const onPaper = el2.closest(".tc-paper");
          if (!onPaper && papers.some((p) => !(r.right < p.left || r.left > p.right || r.bottom < p.top || r.top > p.bottom))) shown = false;
          if (!shown) continue;
          const x0 = Math.max(0, Math.round(r.left - rr.left));
          const y0 = Math.max(0, Math.round(r.top - rr.top));
          const w = Math.min(cv.width - x0, Math.round(r.width));
          const hh = Math.min(cv.height - y0, Math.round(r.height));
          if (w < 2 || hh < 2) continue;
          const d = cx.getImageData(x0, y0, w, hh).data;
          const counts = new Map<number, number>();
          for (let k = 0; k < d.length; k += 4) {
            const v = (d[k]! << 16) | (d[k + 1]! << 8) | d[k + 2]!;
            counts.set(v, (counts.get(v) ?? 0) + 1);
          }
          let ground = 0;
          let best = -1;
          for (const [v, c] of counts) if (c > best) [ground, best] = [v, c];
          const lum = (v: number) => {
            const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => {
              const c = x / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
          };
          const lg = lum(ground);
          let fg = ground;
          let most = 0;
          for (const v of counts.keys()) {
            const l = lum(v);
            const ratio = (Math.max(l, lg) + 0.05) / (Math.min(l, lg) + 0.05);
            if (ratio > most) [most, fg] = [ratio, v];
          }
          const hx = (v: number) => "#" + v.toString(16).padStart(6, "0");
          out.push({ text: (el2.textContent ?? "").trim().slice(0, 24), ground: hx(ground), fg: hx(fg) });
        }
        return out;
      },
      { b64: png.toString("base64"), el: await sec.elementHandle() },
    );
    for (const t of res) {
      measured++;
      const ratio = contrast(t.ground, t.fg);
      if (ratio < T.TextContrast) low.push(`${t.text}: ${t.fg} on ${t.ground} = ${ratio.toFixed(2)}`);
    }
  }
  expect(measured).toBeGreaterThan(150);
  expect(low).toEqual([]);

  // A wire's trace on a label plate: Ink text on the dimmed Cream keeps TextContrast, as drawn.
  const points = await page.evaluate(() => {
    const p = document.querySelector('[data-piece="trace"][data-kind="data"]') as SVGPathElement;
    p.scrollIntoView({ block: "center", inline: "center" });
    const m = p.getScreenCTM()!;
    const len = p.getTotalLength();
    const plate = p.closest("svg")!.querySelector('[data-layer="plate"] path')!.getBoundingClientRect();
    const box = p.closest(".g-scroll")!.getBoundingClientRect();
    const out: { x: number; y: number }[] = [];
    // Points on the trace's line inside the plate and in view.
    for (let s = 0; s <= len; s += 2) {
      const q = p.getPointAtLength(s);
      const x = m.a * q.x + m.c * q.y + m.e;
      const y = m.b * q.x + m.d * q.y + m.f;
      const inPlate = x > plate.left + 4 && x < plate.right - 4 && y > plate.top + 4 && y < plate.bottom - 4;
      const inView = x > Math.max(0, box.left) + 2 && x < Math.min(innerWidth, box.right) - 2 && y > 2 && y < innerHeight - 2;
      if (inPlate && inView) out.push({ x: Math.round(x), y: Math.round(y) });
    }
    return out;
  });
  expect(points.length).toBeGreaterThan(5);
  const view = await page.screenshot();
  const px = await page.evaluate(
    async ({ b64, points }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const cx = cv.getContext("2d")!;
      cx.drawImage(img, 0, 0);
      const counts = new Map<string, number>();
      for (const { x, y } of points) {
        const d = cx.getImageData(x, y, 1, 1).data;
        const h = "#" + [d[0], d[1], d[2]].map((v) => v!.toString(16).padStart(2, "0")).join("");
        counts.set(h, (counts.get(h) ?? 0) + 1);
      }
      // The commonest: the trace over the plate's Cream, where no text crosses it.
      return [...counts].sort((x, y) => y[1] - x[1])[0]![0];
    },
    { b64: view.toString("base64"), points },
  );
  expect(px).not.toBe(C.Cream);
  expect(contrast(px, C.Ink)).toBeGreaterThan(T.TextContrast);
  expect(contrast(px, C.Ink)).toBeLessThan(contrast(C.Cream, C.Ink));
});

test("ART-15 rings: a ring of OutlineWeight with Ink edges of WireEdge; blinking Mustard where a held wire is taken; Cream otherwise", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    return [...document.querySelectorAll('[data-piece="ring"]')].map((g) => {
      const core = g.querySelector('[data-part="ring"]')!;
      const edge = g.querySelector('[data-part="ring-edge"]')!;
      const cs = getComputedStyle(g);
      return {
        colour: g.getAttribute("data-colour"),
        core: [A.strokeOf(core), A.strokeW(core), A.fillOf(core), core.getAttribute("r")],
        edge: [A.strokeOf(edge), A.strokeW(edge), A.fillOf(edge), edge.getAttribute("r")],
        blink: cs.animationName !== "none" ? [cs.animationDuration, cs.animationTimingFunction, cs.animationIterationCount] : null,
      };
    });
  });
  expect(r.length).toBeGreaterThanOrEqual(4);
  for (const ring of r) {
    expect(ring.core.slice(0, 3)).toEqual([ring.colour === "mustard" ? C.Mustard : C.Cream, T.OutlineWeight, "none"]);
    // An Ink edge of WireEdge on each side: the edge circle on the same line, OutlineWeight and twice WireEdge wide.
    expect(ring.edge.slice(0, 3)).toEqual([C.Ink, T.OutlineWeight + 2 * T.WireEdge, "none"]);
    expect(ring.edge[3]).toBe(ring.core[3]);
    if (ring.blink) {
      expect(ring.colour).toBe("mustard");
      expect(parseFloat(ring.blink[0]!)).toBeCloseTo(T.LitBlinkTime, 3);
      expect(ring.blink[1]).toMatch(/steps|step-end/);
      expect(ring.blink[2]).toBe("infinite");
    }
  }
  expect(r.some((x) => x.blink)).toBe(true);
  expect(r.some((x) => x.colour === "cream")).toBe(true);
});

test("ART-16 stills: lamp, sign, stopped item and rejection each read in one frame, with every motion stopped", async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.__art;
    for (const a of document.getAnimations()) a.cancel();
    const lamps = [...document.querySelectorAll('[data-piece="lamp"]')].map((g) => {
      const sign = g.querySelector('[data-part="sign"]')!;
      return { state: g.getAttribute("data-state"), fill: A.fillOf(g.querySelector('[data-part="lens"]')!), sign: getComputedStyle(sign).display === "none" ? null : sign.getAttribute("d") };
    });
    const dim = document.querySelector('[data-board="Stopped item, dimmed to StopLight; rejected item"] [data-part="dim"]')!;
    const rejected = document.querySelectorAll('[data-board="Stopped item, dimmed to StopLight; rejected item"] [data-piece="sign-disc"][data-sign="minus"]').length;
    return { lamps, dim: [A.fillOf(dim), parseFloat(getComputedStyle(dim).opacity)], rejected, running: document.getAnimations().filter((a) => a.playState === "running").length };
  });
  expect(r.running).toBe(0);
  const byState = new Map<string, Set<string>>();
  for (const l of r.lamps) byState.set(l.state!, (byState.get(l.state!) ?? new Set()).add(`${l.fill} ${l.sign ?? "-"}`));
  for (const set of byState.values()) expect(set.size).toBe(1);
  const looks = [...byState.values()].map((s) => [...s][0]);
  expect(new Set(looks).size).toBe(4);
  expect(r.dim[0]).toBe(C.Ink);
  expect(r.dim[1]).toBeCloseTo(1 - T.StopLight, 3);
  expect(r.rejected).toBeGreaterThanOrEqual(1);
});

// ---------- sound: rendered offline, the same graph the page plays ----------

type Render = { rate: number; samples: number[] };
const render = (page: Page, name: string, opts: object = {}) =>
  page.evaluate(([n, o]) => window.__tc!.renderVoice(n as never, o as never), [name, opts] as const) as Promise<Render>;
const peak = (s: number[]) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
/** First and last sample above a fraction of the peak, seconds. */
function extent(r: Render, frac = 0.01): [number, number] {
  const p = peak(r.samples) * frac;
  let a = -1;
  let b = -1;
  r.samples.forEach((v, i) => {
    if (Math.abs(v) > p) {
      if (a < 0) a = i;
      b = i;
    }
  });
  return [a / r.rate, b / r.rate];
}
/** Zero-crossing frequency over [t0, t1) seconds. */
function zcFreq(r: Render, t0: number, t1: number): number {
  const a = Math.floor(t0 * r.rate);
  const b = Math.floor(t1 * r.rate);
  let n = 0;
  for (let i = a + 1; i < b; i++) if ((r.samples[i - 1]! < 0) !== (r.samples[i]! < 0)) n++;
  return n / 2 / ((b - a) / r.rate);
}
/** Spectral centroid over [t0, t1) seconds, between lo and hi Hz: a Hann-windowed DFT in 10 Hz steps. */
function centroid(r: Render, t0: number, t1: number, lo: number, hi: number): number {
  const a = Math.floor(t0 * r.rate);
  const n = Math.floor((t1 - t0) * r.rate);
  let num = 0;
  let den = 0;
  for (let f = lo; f <= hi; f += 10) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const x = r.samples[a + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
      const ph = (2 * Math.PI * f * i) / r.rate;
      re += x * Math.cos(ph);
      im -= x * Math.sin(ph);
    }
    num += f * (re * re + im * im);
    den += re * re + im * im;
  }
  return num / den;
}
/** RMS in windows of `win` seconds. */
function envelope(r: Render, win = 0.002): number[] {
  const n = Math.floor(win * r.rate);
  const out: number[] = [];
  for (let i = 0; i + n <= r.samples.length; i += n) {
    let s = 0;
    for (let j = i; j < i + n; j++) s += r.samples[j]! ** 2;
    out.push(Math.sqrt(s / n));
  }
  return out;
}
/** Onsets: windows where the envelope climbs past a share of its peak after resting below a smaller share. */
function onsets(env: number[], win = 0.002, hi = 0.25, lo = 0.08): number[] {
  const p = Math.max(...env);
  const out: number[] = [];
  let armed = true;
  env.forEach((v, i) => {
    if (armed && v > p * hi) {
      out.push(i * win);
      armed = false;
    } else if (v < p * lo) armed = true;
  });
  return out;
}

test("ART-17 sound palette: made in the page, levels by kind, the alarm the loudest, clicks within ClickMaxTime, silent before the first tap", async ({ page }) => {
  const S = T.sound;
  const peaks: Record<string, number> = {};
  for (const n of ["plug", "unplug", "working", "plus", "minus", "runSwitch", "alarm", "teletype", "bell"]) peaks[n] = peak((await render(page, n)).samples);
  for (const n of ["plug", "unplug", "working", "teletype"]) expect(peaks[n]!).toBeCloseTo(S.LevelQuiet, 1);
  for (const n of ["plus", "minus", "runSwitch", "bell"]) expect(peaks[n]!).toBeCloseTo(S.LevelMid, 1);
  expect(peaks.alarm!).toBeCloseTo(S.LevelLoud, 1);
  expect(peaks.alarm!).toBeLessThanOrEqual(S.LevelLoud + 0.005);
  for (const [n, p] of Object.entries(peaks)) if (n !== "alarm") expect(p).toBeLessThan(peaks.alarm!);
  for (const n of ["unplug", "working"]) expect(extent(await render(page, n))[1]).toBeLessThanOrEqual(S.ClickMaxTime);
  // No sound file loads.
  expect(fontRequests.get(page)).toEqual([]);
  // Sound starts at the first tap; AUDIO off stops it and keeps it silent.
  const state = await page.evaluate(async () => {
    const snd = window.__tc!.createSound();
    const before = snd.play("plug");
    snd.unlock(document);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const after = snd.play("plug");
    snd.setMuted(true);
    const muted = snd.play("plug");
    snd.setMuted(false);
    const again = snd.play("plug");
    return { before: before === null, unlocked: snd.unlocked, after: after !== null, muted: muted === null, again: again !== null };
  });
  expect(state).toEqual({ before: true, unlocked: true, after: true, muted: true, again: true });
});

test("ART-18 plug and unplug: a clack and a tick after it; one duller clack falling from UnplugPitch by UnplugDrop", async ({ page }) => {
  const S = T.sound;
  const plug = await render(page, "plug");
  const on = onsets(envelope(plug));
  expect(on.length).toBeGreaterThanOrEqual(2);
  expect(on[on.length - 1]! - on[0]!).toBeGreaterThan(0.02);
  const unplug = await render(page, "unplug");
  expect(onsets(envelope(unplug)).length).toBe(1);
  const v = await page.evaluate(() => window.__tc!.voiceOf("unplug").parts);
  expect(v.length).toBe(1);
  expect((v[0] as { freq: number }).freq).toBe(S.UnplugPitch);
  expect((v[0] as { freqEnd: number }).freqEnd).toBeCloseTo(S.UnplugPitch - S.UnplugPitch * S.UnplugDrop, 6);
  const [a, b] = extent(unplug, 0.02);
  const half = (b - a) / 2;
  // Falls in pitch: the spectrum's centre round the filter drops from the first half to the second.
  expect(centroid(unplug, a + half, b, 50, 1500)).toBeLessThan(0.95 * centroid(unplug, a, a + half, 50, 1500));
  // Duller than the plug's clack: less of its sound high up.
  const [pa] = extent(plug, 0.02);
  expect(centroid(unplug, a, a + 0.02, 50, 8000)).toBeLessThan(0.75 * centroid(plug, pa, pa + 0.02, 50, 8000));
});

test("ART-19 working: two relay ticks within ClickMaxTime", async ({ page }) => {
  const w = await render(page, "working");
  expect(onsets(envelope(w)).length).toBe(2);
  const [a, b] = extent(w);
  expect(b - a).toBeLessThanOrEqual(T.sound.ClickMaxTime);
});

test("ART-20 verdicts: a steady tone at PlusPitch and a flat low tone at MinusPitch, each VerdictToneTime", async ({ page }) => {
  const S = T.sound;
  for (const [name, pitch] of [
    ["plus", S.PlusPitch],
    ["minus", S.MinusPitch],
  ] as const) {
    const r = await render(page, name);
    const [a, b] = extent(r, 0.05);
    expect(b - a).toBeCloseTo(S.VerdictToneTime, 1);
    expect(Math.abs(b - a - S.VerdictToneTime)).toBeLessThan(0.02);
    const f1 = zcFreq(r, a + 0.01, (a + b) / 2);
    const f2 = zcFreq(r, (a + b) / 2, b - 0.03);
    expect(Math.abs(f1 - pitch) / pitch).toBeLessThan(0.05);
    // No slide.
    expect(Math.abs(f1 - f2) / pitch).toBeLessThan(0.05);
  }
});

test("ART-21 run switch: a thunk as it starts, a click SwitchThrowTime later", async ({ page }) => {
  const r = await render(page, "runSwitch");
  const on = onsets(envelope(r), 0.002, 0.2, 0.05);
  expect(on[0]!).toBeLessThan(0.005);
  expect(on.some((t) => Math.abs(t - T.sound.SwitchThrowTime) < 0.006)).toBe(true);
});

test("ART-22 alarm tone: AlarmPitch and AlarmBeat above it, each half LevelLoud, one steady beating tone over AlarmToneTime", async ({ page }) => {
  const S = T.sound;
  const parts = await page.evaluate(() => window.__tc!.voiceOf("alarm").parts as { freq: number; amp: number }[]);
  expect(parts.map((p) => p.freq)).toEqual([S.AlarmPitch, S.AlarmPitch + S.AlarmBeat]);
  expect(parts.map((p) => p.amp)).toEqual([S.LevelLoud / 2, S.LevelLoud / 2]);
  const r = await render(page, "alarm");
  const [a, b] = extent(r, 0.05);
  expect(Math.abs(b - a - S.AlarmToneTime)).toBeLessThan(0.05);
  expect(Math.abs(zcFreq(r, 0.1, 0.9) - (S.AlarmPitch + S.AlarmBeat / 2))).toBeLessThan(3);
  // It beats at AlarmBeat: the envelope's lows fall 1 / AlarmBeat apart; no rise, no repeat.
  const env = envelope(r, 0.01);
  const mid = env.slice(5, 95);
  const lows = mid.map((v, i) => [v, i] as const).filter(([v, i]) => v < 0.25 * Math.max(...mid) && (i === 0 || mid[i - 1]! >= v) && (i === mid.length - 1 || mid[i + 1]! > v));
  expect(lows.length).toBeGreaterThanOrEqual(1);
  expect(peak(r.samples)).toBeCloseTo(S.LevelLoud, 1);
});

test("ART-23 teletype: LineStrikes clicks over PrintLineTime and a thunk at its end; a double strike twice each, inside the line", async ({ page }) => {
  const S = T.sound;
  const plain = await page.evaluate(() => window.__tc!.voiceOf("teletype").parts as { at: number; dur: number }[]);
  const dbl = await page.evaluate(() => window.__tc!.voiceOf("teletype", { double: true }).parts as { at: number; dur: number }[]);
  expect(plain.length).toBe(S.LineStrikes + 1);
  expect(dbl.length).toBe(2 * S.LineStrikes + 1);
  for (const p of dbl.slice(0, -1)) expect(p.at + p.dur).toBeLessThanOrEqual(S.PrintLineTime);
  const r = await render(page, "teletype");
  const on = onsets(envelope(r, 0.002), 0.002, 0.2, 0.05);
  expect(on.length).toBe(S.LineStrikes + 1);
  expect(on[on.length - 1]!).toBeCloseTo(S.PrintLineTime, 2);
  const rd = await render(page, "teletype", { double: true });
  const clicks = onsets(envelope(rd, 0.001), 0.001, 0.2, 0.05).filter((t) => t < S.PrintLineTime - 0.001);
  expect(clicks.length).toBe(2 * S.LineStrikes);
});

test("ART-24 bell: one struck bell at BellPitch ringing out over BellTime", async ({ page }) => {
  const S = T.sound;
  const r = await render(page, "bell");
  const p = peak(r.samples);
  const env = envelope(r, 0.01);
  expect(env.indexOf(Math.max(...env))).toBeLessThan(3);
  const at = (t: number) => env[Math.floor(t / 0.01)]!;
  expect(at(S.BellTime * 0.5)).toBeGreaterThan(at(S.BellTime * 0.9));
  expect(at(S.BellTime * 0.5)).toBeGreaterThan(p * 0.005);
  expect(extent(r, 0.001)[1]).toBeLessThanOrEqual(S.BellTime + 0.02);
  // Its pitch: the strongest partial, past the first instant.
  expect(Math.abs(zcFreq(r, 0.4, 0.8) - S.BellPitch) / S.BellPitch).toBeLessThan(0.05);
});

test("ART-25 no chance: no random numbers; every sound renders the same samples twice", async ({ page }) => {
  const diffs = await page.evaluate(async () => {
    const out: string[] = [];
    for (const n of ["plug", "unplug", "working", "plus", "minus", "runSwitch", "alarm", "teletype", "bell"] as const) {
      const a = await window.__tc!.renderVoice(n);
      const b = await window.__tc!.renderVoice(n);
      let first = -1;
      let most = 0;
      a.samples.forEach((v, i) => {
        const d = Math.abs(v - (b.samples[i] ?? NaN));
        if (d !== 0 && first < 0) first = i;
        if (d > most || Number.isNaN(d)) most = d;
      });
      if (a.samples.length !== b.samples.length || first >= 0) out.push(`${n}: lengths ${a.samples.length}/${b.samples.length}, first difference at ${first}, largest ${most}`);
    }
    return out;
  });
  expect(diffs).toEqual([]);
  expect(await page.evaluate(() => window.__art.randomCalls())).toBe(0);
});
