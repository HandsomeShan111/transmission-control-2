# Board contract

Between the Board build step and the Campaign and keeping build step (plan steps 4 and 5).


The Board worker writes this first into `src/blocks/wiring-board/api.ts` and commits it before anything else; the Campaign worker codes against it. Names stay; the Board worker may add fields, never rename.

```ts
export type OpenOptions = {
  /** Wiring to open with. Default: Wires' current wiring for the order, else its opening wiring (BOARD-01). */
  readonly wiring?: Wiring;
  /** Standby for the opening misfire (CAMPAIGN-01, FEEL-12): board dimmed; a tap on any control but AUDIO calls onStandbyTap. */
  readonly standby?: { readonly onStandbyTap: () => void };
};
export type LastRun = { readonly order: number; readonly wiring: Wiring; readonly trace: Trace; readonly report: Report; readonly score: Score | null; readonly moves: number | null };
export interface Board {
  /** Mounts the Board screen into the shell if needed, shows it, opens order n (BOARD-01). Emits orderOpened. */
  openOrder(n: number, opts?: OpenOptions): void;
  currentOrder(): number | null;
  /** Flips the run switch as the player would (BOARD-04): plays the run, prints the report. Resolves once the report closes. */
  run(): Promise<LastRun>;
  lastRun(): LastRun | null;
  /** Mounts a printout (memo, debrief, save code) over the window, on top of any other; returns its remover. */
  overlay(node: Node): () => void;
  locked(): boolean;
}
export function board(shell: Shell): Board;
/** Slot names on the Board. Each slot takes one filler (platform slots). Fillers get ids only and read what they need through APIs. */
export const BOARD_SLOTS = {
  secondWiringLamp: "board.lamp.secondWiring", // 2ND WIRING lamp in the order bar (Campaign)
  ordersControl: "board.control.orders",       // ORDERS plate: opens the order list (Campaign)
  audioSwitch: "board.control.audio",          // AUDIO switch (Settings)
  afterReport: "report.afterLines",            // lines printed after the report: filed, second wiring, route on file (Campaign, CAMPAIGN-06)
  commendation: "report.commendation",         // commendation line (Achievements, ACHIEVE-02)
  share: "report.share",                       // SHARE control on a printed report (Report sharing)
} as const;
```

Page events (platform `pageEvents`): `orderOpened {order}` and `runEnded {order, win, reportId}` from the Board; `wiringChanged {order}` from Wires; `reportClosed {order, reportId}` from Reports' printout; `winKept {order}` from Saving. `reportId` is a stable id of the report text (a hash of order number and the report's lines), the same for every run that prints the same report.

In-memory state lives in the block that owns it, with get and set APIs, so Saving (above) can read it all and restore it on start: Wires holds each order's current wiring (exists); Par and score holds each order's best (the Board worker adds `best(n)` and `setBest(n, best)` there, plus `bests()` for all); Repair orders holds each repair order's best moves (same pattern). Saving never reaches into another block's internals.

Screens: platform `createShell()`; screen ids `loading`, `board`, `orderList`, `archive`. Pieces: `src/platform/pieces/index.ts`. Sounds: platform `createSound()`. One shell, one sound system and one store per page, created by `src/app/main.ts` and passed in.

Pages in `src/app/`: `scripts/build.ts` bundles every `<name>.html` with its `<name>.ts` (`index.html` with `main.ts`) into `dist/`. The Board worker makes `sandbox.html` + `sandbox.ts` (test sandbox, layers 0 and 1: any order by number from `?order=n`). The Campaign worker makes `index.html` + `main.ts` (the game).
