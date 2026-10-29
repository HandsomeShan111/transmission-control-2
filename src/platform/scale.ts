// UI style scaling (ui/style.md, Style): sizes are set at a short side of 360
// and of 1080; between them a size scales in a straight line with the short
// side; past 1080 it holds; below 360 it scales down with the short side, but a
// plate or a row never goes below JackMinSize.
import { art, shared, ui, type UiRange } from "./tokens";

export const SMALL_SIDE = 360;
export const LARGE_SIDE = 1080;

export type Orientation = "portrait" | "landscape";

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Design silent: a square screen counts as portrait (order bar on top). */
export function orientationOf(width: number, height: number): Orientation {
  return width > height ? "landscape" : "portrait";
}

/** A UI size "a -> b" at a given short side. */
export function scaleValue(range: UiRange, short: number): number {
  const [a, b] = range;
  if (short >= LARGE_SIDE) return b;
  if (short >= SMALL_SIDE) return a + ((b - a) * (short - SMALL_SIDE)) / (LARGE_SIDE - SMALL_SIDE);
  return (a * short) / SMALL_SIDE;
}

/** Line height used for one line of UI text (design silent; the previews use 1.2). */
export const LINE_HEIGHT = 1.2;

export interface UiSizes {
  width: number;
  height: number;
  short: number;
  orientation: Orientation;
  safe: Insets;
  FrameMargin: number;
  OrderBar: number;
  ControlBar: number;
  TextSize: number;
  LabelSize: number;
  PaperTextSize: number;
  PlateSize: number;
  PlateGap: number;
  PerfMargin: number;
  RowHeight: number;
  RowWidth: number;
  /** A UI lamp's lens: LampSize of JackMinSize (ui/style.md, Lamp). */
  LampLens: number;
  OutlineWeight: number;
  JackMinSize: number;
}

export interface Viewport {
  width: number;
  height: number;
  safe?: Insets;
}

/**
 * Sizes for a viewport. Design silent on safe areas: sizes scale with the
 * short side of the room inside the safe-area insets, and the bars and the
 * window keep inside that room; the Graphite frame fills the whole page.
 * `titleOnly` is a screen other than the Board: in portrait its order bar holds
 * its title line and PlateGap each side.
 */
export function uiSizes(view: Viewport, opts: { titleOnly?: boolean } = {}): UiSizes {
  const safe = view.safe ?? NO_INSETS;
  const width = Math.max(0, view.width - safe.left - safe.right);
  const height = Math.max(0, view.height - safe.top - safe.bottom);
  const short = Math.min(width, height);
  const orientation = orientationOf(width, height);
  const v = (r: UiRange) => scaleValue(r, short);
  const TextSize = v(ui.TextSize);
  const PlateGap = v(ui.PlateGap);
  let OrderBar = v(ui.OrderBar[orientation]);
  if (opts.titleOnly && orientation === "portrait") OrderBar = TextSize * LINE_HEIGHT + 2 * PlateGap;
  return {
    width,
    height,
    short,
    orientation,
    safe,
    FrameMargin: v(ui.FrameMargin),
    OrderBar,
    ControlBar: v(ui.ControlBar[orientation]),
    TextSize,
    LabelSize: v(ui.LabelSize),
    PaperTextSize: v(ui.PaperTextSize),
    PlateSize: Math.max(shared.JackMinSize, v(ui.PlateSize)),
    PlateGap,
    PerfMargin: v(ui.PerfMargin),
    RowHeight: Math.max(shared.JackMinSize, v(ui.RowHeight)),
    RowWidth: ui.RowWidth * TextSize,
    LampLens: art.LampSize * shared.JackMinSize,
    OutlineWeight: art.OutlineWeight,
    JackMinSize: shared.JackMinSize,
  };
}

const PX_KEYS = [
  "FrameMargin",
  "OrderBar",
  "ControlBar",
  "TextSize",
  "LabelSize",
  "PaperTextSize",
  "PlateSize",
  "PlateGap",
  "PerfMargin",
  "RowHeight",
  "RowWidth",
  "LampLens",
  "OutlineWeight",
  "JackMinSize",
] as const;

/** CSS custom properties for the sizes, as "--Name": "12px". */
export function cssVars(s: UiSizes): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of PX_KEYS) out[`--${k}`] = `${round(s[k])}px`;
  out["--SafeTop"] = `${s.safe.top}px`;
  out["--SafeRight"] = `${s.safe.right}px`;
  out["--SafeBottom"] = `${s.safe.bottom}px`;
  out["--SafeLeft"] = `${s.safe.left}px`;
  return out;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Reads the safe-area insets the browser reports, through a probe element. */
export function readSafeArea(doc: Document): Insets {
  const probe = doc.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  doc.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}
