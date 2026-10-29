// The view onto the board: zoom stops, pan stops, framings (BOARD-01, BOARD-03, VIEW-02, VIEW-05, ui/board.md Layout).
// A view is a zoom (CSS pixels per board unit) and the board point at the window's middle.
// Zoom 1: a jack shows at JackMinSize. Sizes of the window are CSS pixels.
import type { Layout, Point, Rect } from "./layout";
import { BOARD_PARAMS } from "./params";

export type View = { readonly z: number; readonly c: Point };
export type Size = { readonly w: number; readonly h: number };

/** BOARD-03: zoom stops where a jack shows at JackMinSize and where it shows at JackMaxSize. */
export const Z_MIN = 1;
export const Z_MAX = BOARD_PARAMS.JackMaxSize / BOARD_PARAMS.JackMinSize;

/**
 * The far zoom stop (owner's change to BOARD-03): the smaller of JackMinSize's zoom and the zoom where the whole board, its
 * bounds with BoardMargin round them, fits the window. A window too small to fit any board keeps JackMinSize's zoom.
 */
export function zoomFloor(bounds: Rect, win: Size): number {
  const fit = fitZoom(bounds, win);
  return fit > 0 ? Math.min(Z_MIN, fit) : Z_MIN;
}

export const clampZoom = (z: number, bounds: Rect, win: Size) => Math.min(Z_MAX, Math.max(zoomFloor(bounds, win), z));

/** BOARD-01: the bounds and BoardMargin, CSS pixels on screen, beyond them on each side, at zoom z. */
export function extentAt(bounds: Rect, z: number): Rect {
  const m = BOARD_PARAMS.BoardMargin / z;
  return { x: bounds.x - m, y: bounds.y - m, w: bounds.w + 2 * m, h: bounds.h + 2 * m };
}

function clampAxis(c: number, start: number, length: number, room: number): number {
  if (length <= room) return start + length / 2;
  return Math.min(start + length - room / 2, Math.max(start + room / 2, c));
}

/** BOARD-03 pan stops: on each axis the extent's edge meets the window's edge; an axis where the extent is smaller stays centred. */
export function clampView(v: View, bounds: Rect, win: Size): View {
  const z = clampZoom(v.z, bounds, win);
  const e = extentAt(bounds, z);
  return { z, c: { x: clampAxis(v.c.x, e.x, e.w, win.w / z), y: clampAxis(v.c.y, e.y, e.h, win.h / z) } };
}

/** The zoom that fits a rectangle with BoardMargin round it into the window, before the zoom stops. */
export function fitZoom(r: Rect, win: Size): number {
  const m = 2 * BOARD_PARAMS.BoardMargin;
  return Math.min((win.w - m) / Math.max(1, r.w), (win.h - m) / Math.max(1, r.h));
}

const centreOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * BOARD-01 opening framing: the extent at the zoom that fits it, within the zoom stops, centred. An order wider than the
 * window at JackMinSize: at that zoom on its input terminal. Design silent on "on its input terminal": the input terminal
 * centred across the flow, the extent's upstream edge on the window's upstream edge; both within the pan stops.
 */
export function openingFraming(l: Layout, win: Size): View {
  const fit = fitZoom(l.bounds, win);
  if (fit >= Z_MIN) return clampView({ z: Math.min(Z_MAX, fit), c: centreOf(l.bounds) }, l.bounds, win);
  const z = Z_MIN;
  const e = extentAt(l.bounds, z);
  const t = centreOf(l.input.rect);
  const c = l.flow === "landscape" ? { x: e.x + win.w / (2 * z), y: t.y } : { x: t.x, y: e.y + win.h / (2 * z) };
  return clampView({ z, c }, l.bounds, win);
}

/** The window's rectangle on the board for a view. */
export function viewRect(v: View, win: Size): Rect {
  return { x: v.c.x - win.w / (2 * v.z), y: v.c.y - win.h / (2 * v.z), w: win.w / v.z, h: win.h / v.z };
}

export function toScreen(v: View, win: Size, p: Point): Point {
  return { x: (p.x - v.c.x) * v.z + win.w / 2, y: (p.y - v.c.y) * v.z + win.h / 2 };
}

export function toBoard(v: View, win: Size, s: Point): Point {
  return { x: v.c.x + (s.x - win.w / 2) / v.z, y: v.c.y + (s.y - win.h / 2) / v.z };
}

/** BOARD-03: zoom by a factor around a window point; the board point under it stays under it, then the pan stops apply. */
export function zoomAround(v: View, factor: number, at: Point, bounds: Rect, win: Size): View {
  const z = clampZoom(v.z * factor, bounds, win);
  const p = toBoard(v, win, at);
  return clampView({ z, c: { x: p.x - (at.x - win.w / 2) / z, y: p.y - (at.y - win.h / 2) / z } }, bounds, win);
}

/** BOARD-03: a pan by a drag of (dx, dy) CSS pixels: the board follows the pointer. */
export function panBy(v: View, dx: number, dy: number, bounds: Rect, win: Size): View {
  return clampView({ z: v.z, c: { x: v.c.x - dx / v.z, y: v.c.y - dy / v.z } }, bounds, win);
}

/** BOARD-02: the screen turned; the view keeps its centre, as a share of the extent along and across the flow, then the pan stops. */
export function turnView(v: View, from: Layout, to: Layout, win: Size): View {
  const a = extentAt(from.bounds, v.z);
  const fx = (v.c.x - a.x) / a.w;
  const fy = (v.c.y - a.y) / a.h;
  const [along, across] = from.flow === "landscape" ? [fx, fy] : [fy, fx];
  const b = extentAt(to.bounds, v.z);
  const c = to.flow === "landscape" ? { x: b.x + along * b.w, y: b.y + across * b.h } : { x: b.x + across * b.w, y: b.y + along * b.h };
  return clampView({ z: v.z, c }, to.bounds, win);
}

/**
 * The rectangle of the last framing: every output terminal (its foot row when shown) with its input jack, half outside
 * its panel, so the jack shows whole; and the lit alarm lamp.
 */
export function lastFramingRect(l: Layout, feet: ReadonlySet<string> = new Set(), footH = 0): Rect {
  const rs = l.outputs.map((t) => (feet.has(t.destination) ? { ...t.rect, h: t.rect.h + footH } : t.rect));
  const jr = BOARD_PARAMS.JackMinSize / 2;
  for (const t of l.outputs) rs.push({ x: t.jack.x - jr, y: t.jack.y - jr, w: 2 * jr, h: 2 * jr });
  rs.push({ x: l.alarm.x - l.alarmRadius, y: l.alarm.y - l.alarmRadius, w: 2 * l.alarmRadius, h: 2 * l.alarmRadius });
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  return { x: x0, y: y0, w: Math.max(...rs.map((r) => r.x + r.w)) - x0, h: Math.max(...rs.map((r) => r.y + r.h)) - y0 };
}

/**
 * VIEW-02 last framing: every output terminal and the master alarm lamp, fitted within the zoom stops. Too large at
 * JackMinSize: at that zoom (ui/board.md): across the flow, the window's edge on the alarm lamp's side just clears its lit
 * rings; along it, the first output terminal's input jack sits ViewMargin inside the window's upstream edge; where that puts
 * the lamp's rings or the terminal's far edge past the window, the jack moves nearer that edge, never past it.
 */
export function lastFraming(l: Layout, win: Size, viewMargin: number, feet: ReadonlySet<string> = new Set(), footH = 0): View {
  const r = lastFramingRect(l, feet, footH);
  const fit = fitZoom(r, win);
  if (fit >= Z_MIN) return clampView({ z: Math.min(Z_MAX, fit), c: centreOf(r) }, l.bounds, win);
  const z = Z_MIN;
  const ww = win.w / z;
  const wh = win.h / z;
  const t = l.outputs[0]!;
  const land = l.flow === "landscape";
  const R = l.alarmRadius;
  const vm = viewMargin / z;
  if (land) {
    const top = l.alarm.y - R;
    let left = t.jack.x - vm;
    const far = r.x + r.w;
    if (far > left + ww) left = Math.min(far - ww, t.jack.x);
    return clampView({ z, c: { x: left + ww / 2, y: top + wh / 2 } }, l.bounds, win);
  }
  const left = l.alarm.x - R;
  let top = t.jack.y - vm;
  const far = t.rect.y + t.rect.h + (feet.has(t.destination) ? footH : 0);
  if (far > top + wh) top = Math.min(far - wh, t.jack.y);
  return clampView({ z, c: { x: left + ww / 2, y: top + wh / 2 } }, l.bounds, win);
}

/** VIEW-02: a move that puts a point at the window's middle, or the board's end at the window's edge when that comes first. */
export function centreOn(v: View, p: Point, bounds: Rect, win: Size): View {
  return clampView({ z: v.z, c: p }, bounds, win);
}

/**
 * VIEW-02: the view moves only when the followed point comes within ViewMargin of a window edge with more of the board
 * beyond it, or is out of the window.
 */
export function needsFollow(v: View, p: Point, bounds: Rect, win: Size, viewMargin: number): boolean {
  const s = toScreen(v, win, p);
  if (s.x < 0 || s.y < 0 || s.x > win.w || s.y > win.h) return true;
  const e = extentAt(bounds, v.z);
  const r = viewRect(v, win);
  const eps = 0.5 / v.z;
  const moreLeft = r.x > e.x + eps;
  const moreRight = r.x + r.w < e.x + e.w - eps;
  const moreUp = r.y > e.y + eps;
  const moreDown = r.y + r.h < e.y + e.h - eps;
  return (s.x < viewMargin && moreLeft) || (s.x > win.w - viewMargin && moreRight) || (s.y < viewMargin && moreUp) || (s.y > win.h - viewMargin && moreDown);
}

/** BOARD-03 edge pan: the velocity, CSS pixels per second of the board's motion, for a held wire's end at window point s. */
export function edgePanVelocity(s: Point, win: Size): Point {
  const zone = BOARD_PARAMS.EdgePanZone;
  const sp = BOARD_PARAMS.EdgePanSpeed;
  const vx = s.x < zone ? -sp : s.x > win.w - zone ? sp : 0;
  const vy = s.y < zone ? -sp : s.y > win.h - zone ? sp : 0;
  return { x: vx, y: vy };
}
