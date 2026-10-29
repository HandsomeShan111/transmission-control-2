// Reports: the mission or incident report of a run, composed as data (REPORT-01 to REPORT-03, REPORT-05, REPORT-06).
// Printing on the teletype (REPORT-04) belongs to the view.

/** One authored line (data.md, Authored lines): what one agent does to one item kind. `{first}` stands for the item's first kind. */
export type AuthoredLine = { readonly agent: string; readonly kind: string; readonly text: string };

/** ItemLinesMax and ItemBlocksMax at their start values (Reports parameters). */
export const ITEM_LINES_MAX = 8;
export const ITEM_BLOCKS_MAX = 12;

/** One item's lines (REPORT-02): heading, path after repeats collapse and any cut, end line (null when the lead took all of it). */
export type ItemBlock = {
  readonly item: string;
  readonly heading: string;
  readonly path: readonly string[];
  readonly end: string | null;
};

/** The line standing for item blocks cut over ItemBlocksMax (REPORT-02). */
export type CutBlock = { readonly cut: string };

export type Report = {
  readonly order: number;
  readonly form: "mission" | "incident";
  /** REPORT-01: one lead line. */
  readonly lead: string;
  /** Incident: the id of the item the lead names. */
  readonly leadItem: string | null;
  /** Incident led by a hand-written result: its index in the order's results. */
  readonly handWritten: number | null;
  /** Incident: the lead item's first difference, when it has one (REPORT-05). */
  readonly second: string | null;
  /** Mission: the score lines (PAR-02), or a repair order's moves line (REPAIR-03). */
  readonly scoreLines: readonly string[];
  readonly blocks: readonly (ItemBlock | CutBlock)[];
  /** Every line, in print order. */
  readonly lines: readonly string[];
};

/** What other blocks put into a report. `movesLine`: a won repair order's moves line, from Repair orders. */
export type ReportSlots = { readonly movesLine?: string };

export { authoredLine, endLine, firstDifference, report, resultLine } from "./logic/report";
export { reportId } from "./logic/id";
export type { PrintedReport, PrintReportOptions } from "./view/print";
export { printReport, reportLines } from "./view/print";
