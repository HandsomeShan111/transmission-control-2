// Report sharing, the rules (SHARE-01, SHARE-02): the shared text, and the shared picture's bands and rows. Pure: text is measured
// by the caller's measure.
import type { Report } from "../../reports/api";
import { resultLine } from "../../reports/api";
import type { Trace, TraceItem } from "../../run/api";

/** Report sharing parameters (report-sharing.md). */
export const PICTURE = {
  width: 1080,
  height: 1350,
  qr: 240,
  margin: 60,
  header: 50,
  link: 60,
  lineHeight: 55,
  drawingMin: 400,
  textSize: 44,
  textRows: 3,
} as const;

export const COPIED = "COPIED";
export const SELECT_AND_COPY = "SELECT AND COPY";
export const SAVED = "SAVED";
export const PICTURE_ON_SCREEN = "PICTURE ON SCREEN. SAVE BY HAND.";
/** Design silent: the line when the picture cannot be drawn or saved. */
export const PICTURE_FAILED = "PICTURE NOT MADE.";

/** SHARE-01: a first line, "Transmission Control 2, <order name>: <GameLink>", then the report's lines as printed. */
export function shareText(orderName: string, link: string, report: Report): string {
  return [`Transmission Control 2, ${orderName}: ${link}`, ...report.lines].join("\n");
}

export type Measure = (text: string) => number;

/** Rows of `width` at most, wrapped at spaces; a word wider than a row breaks inside it. */
export function wrapRows(text: string, width: number, measure: Measure): string[] {
  const rows: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (measure(next) <= width) {
      cur = next;
      continue;
    }
    if (cur) rows.push(cur);
    cur = word;
    while (measure(cur) > width && cur.length > 1) {
      let k = cur.length - 1;
      while (k > 1 && measure(cur.slice(0, k)) > width) k--;
      rows.push(cur.slice(0, k));
      cur = cur.slice(k);
    }
  }
  if (cur || rows.length === 0) rows.push(cur);
  return rows;
}

/** SHARE-02: PictureTextRows rows at most; a longer text is cut, its last row ending "…". */
export function cutRows(rows: string[], max: number, width: number, measure: Measure): { rows: string[]; cut: boolean } {
  if (rows.length <= max) return { rows, cut: false };
  const kept = rows.slice(0, max);
  let last = kept[max - 1]!;
  while (last.length > 0 && measure(`${last}…`) > width) last = last.slice(0, -1).trimEnd();
  kept[max - 1] = `${last.trimEnd()}…`;
  return { rows: kept, cut: true };
}

/** SHARE-02: the lead item: the item the lead names; a mission report or a lead naming none, the batch's first item. */
export function leadItem(report: Report, trace: Trace): TraceItem {
  return trace.items.find((i) => i.id === report.leadItem) ?? trace.items[0]!;
}

/** SHARE-02: the lead item's result line, none for a stopped or lost item; one that is the lead prints once, as the lead. */
export function pictureResultLine(report: Report, item: TraceItem): string | null {
  const r = resultLine(item);
  return r === null || r === report.lead ? null : r;
}

export type PictureLayout = {
  readonly header: { readonly form: string; readonly name: string; readonly y: number; readonly h: number };
  readonly nameRows: readonly string[];
  readonly leadRows: readonly string[];
  readonly leadCut: boolean;
  readonly resultRows: readonly string[];
  readonly resultCut: boolean;
  /** Top of the first row of the order name; rows are lineHeight apart. */
  readonly textY: number;
  readonly drawing: { readonly y: number; readonly h: number };
  readonly resultY: number;
  readonly link: { readonly y: number; readonly h: number };
  readonly qr: { readonly x: number; readonly y: number; readonly size: number };
};

/**
 * SHARE-02: bands, top to bottom inside PictureMargin: header, order name and lead, drawing, result line, link, code. The drawing
 * takes the height left: PictureHeight − two PictureMargin − the bands − QRSize − PictureLineHeight × the text rows − `quiet`.
 * Design silent on the code's quiet zone: `quiet` (four of its modules), in whole pixels, of Cream between the link band and
 * the code, taken from the drawing, which never goes under PictureDrawingMin for it.
 */
export function pictureLayout(o: { form: "incident" | "mission"; name: string; lead: string; result: string | null; measure: Measure; quiet: number }): PictureLayout {
  const P = PICTURE;
  const width = P.width - 2 * P.margin;
  const nameRows = wrapRows(o.name, width, o.measure);
  const lead = cutRows(wrapRows(o.lead, width, o.measure), P.textRows, width, o.measure);
  const result = o.result === null ? { rows: [] as string[], cut: false } : cutRows(wrapRows(o.result, width, o.measure), P.textRows, width, o.measure);
  const rows = nameRows.length + lead.rows.length + result.rows.length;
  const left = P.height - 2 * P.margin - P.header - P.link - P.qr - P.lineHeight * rows;
  const quiet = Math.max(0, Math.min(Math.ceil(o.quiet), left - P.drawingMin));
  const drawingH = left - quiet;
  let y = P.margin;
  const header = { form: o.form === "incident" ? "INCIDENT REPORT" : "MISSION REPORT", name: "Transmission Control 2", y, h: P.header };
  y += P.header;
  const textY = y;
  y += P.lineHeight * (nameRows.length + lead.rows.length);
  const drawing = { y, h: drawingH };
  y += drawingH;
  const resultY = y;
  y += P.lineHeight * result.rows.length;
  const link = { y, h: P.link };
  y += P.link + quiet;
  const qr = { x: (P.width - P.qr) / 2, y, size: P.qr };
  return { header, nameRows, leadRows: lead.rows, leadCut: lead.cut, resultRows: result.rows, resultCut: result.cut, textY, drawing, resultY, link, qr };
}
