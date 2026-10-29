// Campaign: six acts of orders, opened by the night staff's misfire; unlocks, the act memo and debrief, the order list and the
// lines after a report (CAMPAIGN-01 to CAMPAIGN-06). Owns the `orderList` screen; fills the Board's ORDERS control, 2ND WIRING
// lamp and after-report lines. Leaves extension points: commendations, the order list's SAVE CODE, LOAD SAVE CODE and AUDIO.
import type { FrameControl } from "../../platform/pieces/frame";
import type { Plate } from "../../platform/pieces/plate";
import type { PrintLine, Printout } from "../../platform/pieces/printout";
import type { Shell } from "../../platform/shell";
import type { SoundSystem } from "../../platform/sound";
import type { Archive } from "../incident-archive/api";
import type { Best } from "../par-and-score/api";
import type { RepairBest } from "../repair-orders/api";
import type { Board } from "../wiring-board/api";
import type { Wiring } from "../wires/api";

/** An order's second-wiring lamp, lit, with the wiring of the win that lit it; null once that report was dropped (SAVE-05). */
export type LampLit = { readonly wiring: Wiring | null };

/** What the campaign holds: orders won, the acts whose memo and debrief were closed, each order's second-wiring lamp. */
export type Progress = {
  readonly won: readonly number[];
  readonly memos: readonly number[];
  readonly debriefs: readonly number[];
  readonly lamps: Readonly<Record<number, LampLit>>;
};

/** The bests the campaign reads and keeps (PAR-03, REPAIR-03). */
export type Bests = {
  best(n: number): Best | null;
  setBest(n: number, b: Best): void;
  repairBest(n: number): RepairBest | null;
  setRepairBest(n: number, b: RepairBest): void;
};

/** What a printout on the teletype takes. */
export type PrintSpec = {
  readonly lines: PrintLine[];
  readonly controls?: HTMLElement[];
  /** Stands whole at once (a printout closed before, CAMPAIGN-03). */
  readonly atOnce?: boolean;
};

/** What the blocks above add. Each takes ids only. */
export type CampaignExtension = {
  /** ACHIEVE-01, ACHIEVE-02: the commendations a report of order n earns, as lines; the bell rings before the first. */
  readonly commendations?: (n: number) => PrintLine[];
  /** CAMPAIGN-04: an act's achievements for its debrief: earned by name, the rest as progress. */
  readonly debriefAchievements?: (act: number) => PrintLine[];
  /** MEDALS on the order list and the Board, with its count; a press opens the commendations when `may` allows (Achievements, owner's change). */
  readonly medalsKey?: (may: () => boolean) => Plate;
  /** The order list's controls after ORDERS, MEDALS and ARCHIVE, each in its slot: SAVE CODE, LOAD SAVE CODE (Saving), AUDIO (Settings). These add up. */
  readonly orderListControls?: () => readonly FrameControl[];
  /** The title screen's control bar: AUDIO (Settings). These add up. */
  readonly titleControls?: () => readonly FrameControl[];
  /** SAVE-02: after an act's debrief is closed for the first time. Resolves once what it prints closes. */
  readonly afterDebrief?: (act: number) => Promise<void>;
  /** Lines the order list prints once when it shows (SAVE-04, SAVE-05). */
  readonly orderListNotice?: () => PrintLine[] | null;
};

export interface Campaign {
  progress(): Progress;
  /** Restores a merged progress (Saving). */
  setProgress(p: Progress): void;
  extend(ext: CampaignExtension): void;
  /**
   * Starts the game: the title screen, START for a new game, else CONTINUE (owner's change). Resolves once it is pressed, the game
   * then open: the opening misfire for a new game, else the order list (CAMPAIGN-01, CAMPAIGN-05).
   */
  start(): Promise<void>;
  /** CAMPAIGN-05: shows the order list. */
  showOrderList(): void;
  /** CAMPAIGN-03 then BOARD-01: opens order n, after its act's memo when one prints. */
  openOrder(n: number): Promise<void>;
  /** A new game: no order won and no result found (CAMPAIGN-01). */
  isNew(): boolean;
  /** Prints on the teletype of the screen showing, queued after any printout already there: once shown, and once closed. */
  print(spec: PrintSpec): { readonly shown: Promise<Printout>; readonly closed: Promise<void> };
  /** The last unlocked order, and the order last opened. */
  lastOpened(): number | null;
  /** Called after every change of the progress, and of the bests it keeps. */
  onChange(cb: () => void): () => void;
  /** A run's outcome is kept: called once the report starts to print, with the order (SAVE-01). */
  onOutcome(cb: (n: number, win: boolean) => void): () => void;
  /** The opening misfire's console waits for its first tap (FEEL-12). */
  standingBy(): boolean;
  /** The opening misfire runs: from its first tap until its report closes. */
  inMisfire(): boolean;
}

export type CampaignDeps = {
  readonly shell: Shell;
  readonly sound: SoundSystem;
  readonly board: Board;
  readonly archive: Archive;
  readonly bests: Bests;
  /** Test build: any order opens from a test list, past the campaign's locks (acceptance.md, Test build). */
  readonly anyOrder?: boolean;
};

export {
  ACTS,
  NEW_PROGRESS,
  OPENING_GUARD,
  ORDERS_PER_ACT,
  SIGN_OFF,
  actFamily,
  actOrders,
  afterReportLines,
  bestLine,
  debriefLines,
  hasSecondWiring,
  improves,
  isActDone,
  isActEnd,
  isUnlocked,
  memoLines,
  openActs,
  secondWiringLine,
  secondWiringOutcome,
  unlockAfter,
  unlockLine,
  unlocked,
  winsDiffer,
} from "./logic/campaign";
export { startCampaign } from "./view/campaign";
