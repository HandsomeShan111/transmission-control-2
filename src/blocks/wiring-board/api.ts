// Wiring board: the Board screen, one order on the console: order bar, window, control bar; placing, orientation,
// pan and zoom, run switch and lock (BOARD-01 to BOARD-04). Contract with the Campaign and keeping step:
// docs/designs/board-contract.md. Names stay; fields may be added, never renamed.
import type { Printout } from "../../platform/pieces";
import type { SoundSystem } from "../../platform/sound";
import type { Score } from "../par-and-score/api";
import type { Report } from "../reports/api";
import type { Trace } from "../run/api";
import type { Wiring } from "../wires/api";

export type OpenOptions = {
  /** Wiring to open with. Default: Wires' current wiring for the order, else its opening wiring (BOARD-01). */
  readonly wiring?: Wiring;
  /** Standby for the opening misfire (CAMPAIGN-01, FEEL-12): board dimmed; a tap on any control but AUDIO calls onStandbyTap. */
  readonly standby?: { readonly onStandbyTap: () => void };
};

export type LastRun = {
  readonly order: number;
  readonly wiring: Wiring;
  readonly trace: Trace;
  readonly report: Report;
  readonly score: Score | null;
  readonly moves: number | null;
};

/** Added to the contract: what the assembly passes besides the shell. */
export type BoardOptions = {
  /** The page's one sound system (platform createSound). Without it the board makes no sound. */
  readonly sound?: SoundSystem;
};

/**
 * Added to the contract: what a higher layer adds to the Board (Repair orders: the MOVES lamp and the moves line, REPAIR-03).
 * Each part is asked when needed; none is kept.
 */
export type BoardAddOn = {
  /** Lamps after the par lamps in the order bar, as the order's bests stand now. */
  readonly lamps?: (order: number) => readonly { readonly label: string; readonly lit: boolean }[];
  /**
   * A run ended, before its report is written. `movesLine`: a won repair order's moves line, printed as its score line;
   * the lamp of `lamps` with that label lights as it prints (FEEL-09). `moves`: LastRun.moves.
   */
  readonly scoreRun?: (order: number, wiring: Wiring, trace: Trace) => { readonly movesLine?: string; readonly lampLabel?: string; readonly moves?: number } | null;
};

export interface Board {
  /** Mounts the Board screen into the shell if needed, shows it, opens order n (BOARD-01). Emits orderOpened. */
  openOrder(n: number, opts?: OpenOptions): void;
  currentOrder(): number | null;
  /**
   * Flips the run switch as the player would (BOARD-04): plays the run, prints the report. Resolves once the report closes.
   * Another order opened first abandons the run: it never settles. A run that throws rejects, the board unlocked.
   */
  run(): Promise<LastRun>;
  lastRun(): LastRun | null;
  /** Added to the contract: the report printed on the window, until it closes; lines after it go into its foot (SHARE-01). */
  reportPaper(): Printout | null;
  /**
   * Mounts a printout (memo, debrief, save code) over the window, on top of any other; returns its remover. Pass the
   * platform Printout itself to have the frame place it and route its taps (REPORT-04); a bare node lies over the window as it is.
   */
  overlay(node: Node | Printout): () => void;
  locked(): boolean;
  /**
   * Added to the contract: whether a report is already filed (Incident archive, ARCHIVE-01). A filed report prints at once
   * (REPORT-04), and a filed hand-written lead sounds no full alarm (VIEW-04). Default: nothing is filed.
   */
  setFiled(isFiled: (order: number, reportId: string) => boolean): void;
  /** Added to the contract: a higher layer's additions to the board; returns their removal. */
  addOn(a: BoardAddOn): () => void;
}

/**
 * Slot names on the Board. Each slot takes one filler (platform slots). Fillers get ids only and read what they need through
 * APIs (board.lastRun(), board.currentOrder()). The report slots render when the report starts printing, after runEnded:
 * - afterReport: each node returned is one line, its textContent printed in the paper's foot, one each PrintLineTime;
 *   `data-double` on the node prints it in double strike (ART-12).
 * - commendation: each node is one commendation line, printed after them; the bell rings once before the first and printing
 *   waits BellLead (CAMPAIGN-06, FEEL-09).
 * - share: nodes are the paper's controls (plates), shown in its foot once whole.
 * - next: added to the contract: more of the paper's controls, after share's (Campaign's NEXT on a won report).
 * - secondWiringLamp and the controls render again when an order opens and when the report closes. The control bar's keys
 *   stand in fixed slots (owner's change): AUDIO, ORDERS, MEDALS, ARCHIVE's slot empty, UNDO or FAST, RESET or SKIP,
 *   RUN; the two that leave the board are locked with it (BOARD-04).
 */
export const BOARD_SLOTS = {
  secondWiringLamp: "board.lamp.secondWiring", // 2ND WIRING lamp in the order bar (Campaign)
  ordersControl: "board.control.orders", // ORDERS plate: opens the order list (Campaign)
  medalsControl: "board.control.medals", // MEDALS plate with its count: opens the commendations (Campaign, owner's change)
  audioSwitch: "board.control.audio", // AUDIO switch (Settings)
  afterReport: "report.afterLines", // lines printed after the report: filed, second wiring, route on file (Campaign, CAMPAIGN-06)
  commendation: "report.commendation", // commendation line (Achievements, ACHIEVE-02)
  share: "report.share", // SHARE control on a printed report (Report sharing)
  next: "report.next", // NEXT control on a won report, beside SHARE (Campaign)
} as const;

export { board } from "./view/board";
