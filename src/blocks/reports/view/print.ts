// REPORT-04: a report printed on the teletype paper, one line each PrintLineTime with the teletype sound (FEEL-09).
// A tap prints the rest at once; a tap once whole closes it (FEEL-16), and reportClosed goes out.
import { pageEvents } from "../../../platform/events";
import { printout, type ConsoleFrame, type PrintLine, type Printout } from "../../../platform/pieces";
import type { SoundSystem } from "../../../platform/sound";
import type { Report } from "../api";

export type PrintReportOptions = {
  readonly frame: ConsoleFrame;
  readonly report: Report;
  readonly reportId: string;
  /** REPORT-04: a report already filed prints at once (ARCHIVE-01). */
  readonly atOnce: boolean;
  readonly sound: SoundSystem | null;
  /** The lines after the report, in its foot (CAMPAIGN-06); a line marked `bell` rings it first. */
  readonly foot?: readonly PrintLine[];
  /** The paper's plates, shown in its foot once whole (SHARE). */
  readonly controls?: readonly HTMLElement[];
  /** As each line prints (index over the report's lines, then the foot's), and at once for every line when it prints at once. */
  readonly onLine?: (index: number) => void;
  /** As the tear starts: the board returns (VIEW-05). */
  readonly onClose?: () => void;
};

export type PrintedReport = {
  readonly paper: Printout;
  /** Resolves once the paper is whole. */
  readonly whole: Promise<void>;
  /** Resolves once the paper has torn away. */
  readonly closed: Promise<void>;
};

/** ART-12: the lead line prints in double strike. */
export function reportLines(r: Report): PrintLine[] {
  return r.lines.map((text, i) => (i === 0 ? { text, double: true } : { text }));
}

export function printReport(o: PrintReportOptions): PrintedReport {
  const lines = reportLines(o.report);
  const foot = [...(o.foot ?? [])];
  let closing = false;
  let resolveClosed!: () => void;
  const closed = new Promise<void>((r) => (resolveClosed = r));
  const total = lines.length + foot.length;
  const paper = printout({
    lines,
    foot,
    controls: [...(o.controls ?? [])],
    onLine: (line, i) => {
      o.sound?.play("teletype", line.double ? { double: true } : {});
      o.onLine?.(i);
    },
    onAtOnce: () => {
      // ART-23: a report that prints at once sounds as one plain line.
      o.sound?.play("teletype");
      for (let i = 0; i < total; i++) o.onLine?.(i);
    },
    onBell: () => o.sound?.play("bell"),
    onClosed: () => {
      pageEvents.emit("reportClosed", { order: o.report.order, reportId: o.reportId });
      resolveClosed();
    },
  });
  paper.el.setAttribute("data-report", o.reportId);
  paper.el.setAttribute("data-form", o.report.form);
  // The paper's close starts its tear; the board returns with it (FEEL-16).
  const close = paper.close.bind(paper);
  (paper as { close: () => Promise<void> }).close = () => {
    if (!closing && paper.state === "whole") {
      closing = true;
      paper.el.setAttribute("data-state", "tearing");
      o.onClose?.();
    }
    return close();
  };
  o.frame.showPaper(paper);
  paper.el.setAttribute("data-state", "printing");
  let whole: Promise<void>;
  if (o.atOnce) {
    paper.printAtOnce();
    whole = Promise.resolve();
  } else whole = paper.print();
  void whole.then(() => paper.state === "whole" && paper.el.setAttribute("data-state", "whole"));
  void closed.then(() => paper.el.setAttribute("data-state", "closed"));
  return { paper, whole, closed };
}
