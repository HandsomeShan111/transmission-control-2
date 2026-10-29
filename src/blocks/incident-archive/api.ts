// Incident archive: files every report printed, by order, with the run's wiring; counts each order's hand-written results found;
// lists and reprints filed reports on its screen (ARCHIVE-01 to ARCHIVE-03). Owns the `archive` screen.
// Leaves extension points for the blocks above: achievement rows and a done act's heading (per act), the SHARE control on a
// reprint, the report that lit an order's second-wiring lamp, and the acts and orders listed.
import type { Shell } from "../../platform/shell";
import type { FrameControl } from "../../platform/pieces/frame";
import type { Plate } from "../../platform/pieces/plate";
import type { PrintLine, Printout } from "../../platform/pieces/printout";
import type { SoundSystem } from "../../platform/sound";
import type { Report } from "../reports/api";
import type { Wiring } from "../wires/api";

/** A filed report: its order, the run's wiring it reprints from, and its id (order and every line, ARCHIVE-01). */
export type Filed = { readonly order: number; readonly wiring: Wiring; readonly id: string };

/** What the archive holds: filed reports in filing order; each order's results found, by place in its list. */
export type ArchiveState = { readonly filed: readonly Filed[]; readonly found: Readonly<Record<number, readonly number[]>> };

/** What filing one printed report did (ARCHIVE-01). `foundResult`: the result it found, or null; `foundCount`: the order's finds now. */
export type FileResult = { readonly id: string; readonly isNew: boolean; readonly foundResult: number | null; readonly foundCount: number };

/** One row under an order (ARCHIVE-02): a filed report, or a result found whose report was dropped (SAVE-05). */
export type ArchiveRow =
  | {
      readonly kind: "report";
      readonly filed: Filed;
      readonly report: Report;
      readonly result: number | null;
      /** A mission report's wires and beats, or its moves. */
      readonly note: string | null;
      readonly secondWiring: boolean;
    }
  | { readonly kind: "result"; readonly result: number; readonly text: string };

/** What the blocks above add to the archive. Each takes ids only. */
export type ArchiveExtension = {
  /** The orders the archive lists: those the order list shows (CAMPAIGN-05). */
  readonly listed?: () => readonly number[];
  /** The id of the report of the win that lit order n's second-wiring lamp, or null (ARCHIVE-02). */
  readonly litBy?: (n: number) => string | null;
  /** A done act's heading tapped: its debrief (CAMPAIGN-04). Null when the act is not done. */
  readonly headingTap?: (act: number) => (() => void) | null;
  /** Rows beside an act: its achievements (ACHIEVE-02). */
  readonly actRows?: (act: number) => readonly Node[];
  /** The SHARE control on a reprinted report (SHARE-01, SHARE-02). */
  readonly share?: (filed: Filed, paper: Printout) => HTMLElement | null;
  /** Controls of the archive's control bar, after ORDERS and MEDALS, each in its slot: the AUDIO switch (SETTING-01). */
  readonly controls?: () => readonly FrameControl[];
  /** ORDERS: the order list (CAMPAIGN-05). */
  readonly orders?: () => void;
  /** MEDALS with its count; a press opens the commendations when `may` allows (Achievements, owner's change). */
  readonly medalsKey?: (may: () => boolean) => Plate;
};

export interface Archive {
  state(): ArchiveState;
  /** Restores a merged state (Saving). */
  setState(s: ArchiveState): void;
  /** ARCHIVE-01: files a printed report with its run's wiring. */
  file(n: number, report: Report, wiring: Wiring): FileResult;
  isFiled(n: number, reportId: string): boolean;
  /** Order n's results found, by place in its list. */
  found(n: number): readonly number[];
  rows(n: number, litBy?: string | null): ArchiveRow[];
  extend(ext: ArchiveExtension): void;
  /** ARCHIVE-02: shows the archive screen. */
  show(): void;
  /** ARCHIVE-03: a filed report prints at once, with its share control, over the archive. */
  reprint(f: Filed): Printout;
  /** Prints lines on the archive screen (a debrief, a share line, the save code). */
  print(lines: PrintLine[], o?: { controls?: HTMLElement[]; atOnce?: boolean }): Printout;
  /** Called after every change of the state. */
  onChange(cb: () => void): () => void;
}

export type ArchiveDeps = { readonly shell: Shell; readonly sound: SoundSystem };

export { EMPTY_ARCHIVE, HAND_RESULTS, fileReport, filedLine, foundOf, hashText, missionNote, orderRows, replay, reportIdOf, resultsLine } from "./logic/archive";
export { startArchive } from "./view/archive";
