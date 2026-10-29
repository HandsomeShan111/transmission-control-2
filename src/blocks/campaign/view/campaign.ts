// The campaign in the page (CAMPAIGN-01 to CAMPAIGN-06): the opening misfire, the order list, act memos and debriefs, and the
// lines after each report. A run's outcome is worked out when the run ends and kept when its report starts to print (SAVE-01).
import { pageEvents } from "../../../platform/events";
import { declareKeys, h, KEY, key, lamp, plate, type FrameControl, type KeySlot } from "../../../platform/pieces";
import { pageSlots } from "../../../platform/slots";
import { feelCampaign } from "../../../platform/tokens";
import { replay, resultsLine, filedLine } from "../../incident-archive/api";
import { order as orderOf, orders } from "../../orders/api";
import { keepBest } from "../../par-and-score/api";
import type { Best } from "../../par-and-score/api";
import { keepRepairBest, type RepairBest } from "../../repair-orders/api";
import { BOARD_SLOTS, type LastRun } from "../../wiring-board/api";
import type { Campaign, CampaignDeps, CampaignExtension, PrintSpec, Progress } from "../api";
import type { PrintLine } from "../../../platform/pieces/printout";
import {
  ACTS,
  NEW_PROGRESS,
  OPENING_GUARD,
  actOrders,
  afterReportLines,
  debriefLines,
  hasSecondWiring,
  improves,
  improvesRepair,
  isActDone,
  isActEnd,
  isUnlocked,
  lastOrder,
  memoLines,
  secondWiringLine,
  secondWiringOutcome,
  unlockAfter,
  unlocked,
} from "../logic/campaign";
import { orderListView } from "./order-list";
import { teletype } from "./teletype";
import { titleScreen } from "./title";

declare module "../../../platform/events" {
  interface PageEvents {
    /** From Campaign: a new game's first tap runs the opening misfire (CAMPAIGN-01, MEAS-01). */
    misfireStarted: { order: number };
  }
}

/** A run waiting for its report to print: what it did, worked out at its end. */
type Pending = {
  readonly run: LastRun;
  readonly id: string;
  readonly bestBefore: Best | null;
  readonly repairBefore: RepairBest | null;
  committed: boolean;
  firstWin: boolean;
  lines: PrintLine[];
  commendations: PrintLine[];
};

const lineNode = (l: PrintLine) => {
  const d = h("div", { "data-line": "" }, l.text);
  if (l.double) d.dataset.double = "true";
  return d;
};

export function startCampaign(d: CampaignDeps): Campaign {
  const { shell, board, archive, bests } = d;
  declareKeys({ label: "ORDERS" }, { label: "ARCHIVE" });
  let progress: Progress = NEW_PROGRESS;
  let ext: CampaignExtension = {};
  const controlSources: (() => readonly FrameControl[])[] = [];
  const titleSources: (() => readonly FrameControl[])[] = [];
  let lastOpened: number | null = null;
  let pending: Pending | null = null;
  let debriefDue: number | null = null;
  let misfire: { guardOver: boolean } | null = null;
  let standingBy = false;
  /** NEXT pressed on order `from`'s report: order `to` opens once every paper after it has closed. `runs`: runEnded count then. */
  let nextAfter: { from: number; to: number; runs: number } | null = null;
  let runs = 0;
  const changed = new Set<() => void>();
  const outcomes = new Set<(n: number, win: boolean) => void>();
  const tty = teletype(shell, () => board, d.sound);
  const notify = () => {
    for (const cb of changed) cb();
  };
  const set = (p: Partial<Progress>) => {
    progress = { ...progress, ...p };
    notify();
  };
  const addTo = (xs: readonly number[], x: number) => (xs.includes(x) ? xs : [...xs, x].sort((a, b) => a - b));

  // ---------- the order list ----------

  const title = titleScreen(shell);
  const titleLabel = () => (api.isNew() ? "START" : "CONTINUE");

  let listView: ReturnType<typeof orderListView> | null = null;
  const frame = shell.define("orderList", {
    title: "ORDER LIST",
    mount: () => {},
    onShow: () => renderList(),
  });

  /** `keepScroll`: a change of the progress under a list being read leaves it where it is, not on the order last opened. */
  const renderList = (keepScroll = false) => {
    const top = keepScroll ? listView?.el.scrollTop : undefined;
    listView = orderListView({
      progress,
      bests,
      found: (n) => archive.found(n),
      resultsLine,
      onOrder: (n) => {
        if (tty.busy()) return false;
        void api.openOrder(n);
        return true;
      },
      onHeading: (act) => {
        if (tty.busy()) return false;
        // CAMPAIGN-03: a heading prints its act's memo at once; closing it counts as the memo closed.
        void tty.print({ lines: memoLines(act), atOnce: true }).closed.then(() => set({ memos: addTo(progress.memos, act) }));
        return true;
      },
    });
    frame.window.replaceChildren(listView.el);
    // Owner's change: ORDERS held down, MEDALS, ARCHIVE (here only); then the other blocks' keys in their slots.
    const free = () => !tty.busy();
    const controls: FrameControl[] = [
      navKey("ORDERS", KEY.orders, null),
      ...(ext.medalsKey ? [key(ext.medalsKey(free), KEY.medals)] : []),
      navKey("ARCHIVE", KEY.archive, () => free() && archive.show()),
      ...controlSources.flatMap((c) => c()),
    ];
    frame.setControls(controls);
    if (top !== undefined) {
      listView.el.scrollTop = top;
      return;
    }
    const open = unlocked(progress);
    const target = listView.rowOf(lastOpened ?? open[open.length - 1]!);
    target?.scrollIntoView({ block: "center" });
  };

  /** A key that leaves for another screen; held down (`to` null) on its own screen. */
  function navKey(label: string, slot: KeySlot, to: (() => void) | null): FrameControl {
    const p = plate({ label, ...(to ? { onPress: to } : { held: true }) });
    p.el.dataset.control = label.toLowerCase();
    return key(p, slot);
  }

  // ---------- the Board's slots ----------

  /** ORDERS and MEDALS on the Board: neither leaves it while it is locked or waits in the misfire's standby (BOARD-04). */
  const boardFree = () => !board.locked() && !standingBy;
  pageSlots.fill(BOARD_SLOTS.ordersControl, () => {
    const p = plate({ label: "ORDERS", state: board.locked() ? "disabled" : "normal", onPress: () => boardFree() && api.showOrderList() });
    p.el.dataset.control = "orders";
    return p.el;
  });
  pageSlots.fill(BOARD_SLOTS.medalsControl, () => {
    const p = ext.medalsKey?.(boardFree);
    if (p && board.locked()) p.setState("disabled");
    return p?.el ?? null;
  });
  // FEEL-09: a lamp the printing report lights stays dark until the Board refreshes the slot at its line; my own refreshes wait.
  let lampHeld = false;
  const refreshLamp = () => !lampHeld && pageSlots.refresh(BOARD_SLOTS.secondWiringLamp);
  pageSlots.fill(BOARD_SLOTS.secondWiringLamp, () => {
    const n = board.currentOrder();
    lampHeld = false;
    if (n === null || !hasSecondWiring(orderOf(n))) return null;
    const l = lamp({ label: "2ND WIRING", state: progress.lamps[n] ? "steady" : "off" });
    l.el.dataset.lamp = "2ND WIRING";
    return l.el;
  });
  // CAMPAIGN-06: FILED, the second-wiring line, then the commendations with their bell, then the unlock line. The Board prints
  // its commendation slot after this one and rings the bell before it; the unlock line goes after the commendations.
  pageSlots.fill(BOARD_SLOTS.afterReport, () => {
    const p = commit();
    if (!p) return null;
    return [...p.lines, ...(p.commendations.length ? [] : unlockAfter(p.run.order, p.firstWin))].map(lineNode);
  });
  pageSlots.fill(BOARD_SLOTS.commendation, () => {
    const p = commit();
    if (!p || !p.commendations.length) return null;
    return [...p.commendations, ...unlockAfter(p.run.order, p.firstWin)].map(lineNode);
  });
  // NEXT on a won report's foot, beside SHARE, when order n+1 exists: closes the report as a tap does; every paper that follows
  // it prints and closes as ever (the debrief and the save code at an act's end); then order n+1 opens, after its act's memo when
  // that prints (owner's change; design silent).
  pageSlots.fill(BOARD_SLOTS.next, () => {
    const p = commit();
    if (!p || !p.run.trace.win || misfire) return null;
    const from = p.run.order;
    const to = from + 1;
    if (to > lastOrder() || (!isUnlocked(progress, to) && !d.anyOrder)) return null;
    const next = plate({
      label: "NEXT",
      onPaper: true,
      onPress: () => {
        const paper = board.reportPaper();
        if (!paper || paper.state !== "whole") return false;
        nextAfter = { from, to, runs };
        paper.tap();
        return true;
      },
    });
    next.el.dataset.control = "next";
    return next.el;
  });
  /** NEXT's order opens: the teletype empty, and the board still on the order NEXT was pressed on, run no more since; asked
   * again after its act's memo closes, since the board answers as the memo tears (FEEL-17). */
  async function openNext(nx: { from: number; to: number; runs: number }) {
    const stays = () => shell.current === "board" && board.currentOrder() === nx.from && !board.locked() && runs === nx.runs;
    await tty.idle();
    if (!stays() || (!isUnlocked(progress, nx.to) && !d.anyOrder)) return;
    await memoThen(nx.to, () => stays() && board.openOrder(nx.to));
  }
  // The Board asks before runEnded, so a report just run is never in `pending` yet.
  board.setFiled((n, id) => archive.isFiled(n, id));

  // ---------- a run's outcome ----------

  // CAMPAIGN-06: "sets no new best" compares with the best before the run. The Board keeps a run's best as its playback starts,
  // before runEnded, so the bests are read when the order opens and again after each outcome or merge.
  let snap: { order: number; best: Best | null; repair: RepairBest | null } | null = null;
  const takeSnap = (order: number) => {
    snap = { order, best: bests.best(order), repair: bests.repairBest(order) };
  };

  pageEvents.on("orderOpened", ({ order }) => {
    lastOpened = order;
    takeSnap(order);
  });

  pageEvents.on("runEnded", ({ order, reportId }) => {
    runs++;
    const run = board.lastRun();
    if (!run || run.order !== order) return;
    pending = {
      run,
      id: reportId,
      bestBefore: snap?.order === order ? snap.best : bests.best(order),
      repairBefore: snap?.order === order ? snap.repair : bests.repairBest(order),
      committed: false,
      firstWin: false,
      lines: [],
      commendations: [],
    };
  });

  /** SAVE-01: the outcome is kept whole when the report starts to print: the win, scores, lamp, filing and achievements. */
  function commit(): Pending | null {
    const p = pending;
    if (!p) return null;
    if (p.committed) return p;
    p.committed = true;
    const { order: n, wiring, trace, report } = p.run;
    const o = orderOf(n);
    // Second wirings against the mission reports on file before this one.
    const onFile = archive
      .state()
      .filed.filter((f) => f.order === n)
      .map((f) => replay(n, f.wiring).trace)
      .filter((t) => t.win);
    const filed = archive.file(n, report, wiring);
    p.firstWin = trace.win && !progress.won.includes(n);
    let outcome: "lit" | "route" | null = null;
    if (trace.win) {
      let improved = false;
      if (o.par.kind === "score" && p.run.score) {
        improved = improves(p.bestBefore, p.run.score);
        bests.setBest(n, keepBest(p.bestBefore, p.run.score));
      } else if (o.par.kind === "moves" && p.run.moves !== null) {
        improved = improvesRepair(p.repairBefore, p.run.moves, o.par.moves);
        bests.setRepairBest(n, keepRepairBest(o, p.repairBefore, p.run.moves));
      }
      outcome = secondWiringOutcome(o, trace, onFile, progress.lamps[n] !== undefined, improved);
      const lamps = outcome === "lit" ? { ...progress.lamps, [n]: { wiring: [...wiring] } } : progress.lamps;
      progress = { ...progress, won: addTo(progress.won, n), lamps };
      lampHeld = outcome === "lit";
      if (p.firstWin && isActEnd(n)) debriefDue = o.act;
    }
    takeSnap(n);
    p.commendations = ext.commendations?.(n) ?? [];
    p.lines = afterReportLines({
      order: o,
      filedLine: filed.foundResult !== null ? { text: filedLine(filed.foundCount) } : null,
      secondWiring: outcome ? secondWiringLine(outcome, o) : null,
      commendations: [],
      firstWin: false,
    });
    notify();
    for (const cb of outcomes) cb(n, trace.win);
    return p;
  }

  pageEvents.on("reportClosed", ({ order }) => {
    if (pending && pending.run.order === order) {
      commit();
      pending = null;
      if (lampHeld) {
        lampHeld = false;
        pageSlots.refresh(BOARD_SLOTS.secondWiringLamp);
      }
    }
    const next = nextAfter?.from === order ? nextAfter : null;
    nextAfter = null;
    if (misfire) {
      misfire = null;
      // CAMPAIGN-01: the misfire's report closed: act 1's memo, then order 1 opens on that wiring, as its opening.
      void memoThen(1, () => board.openOrder(1));
      return;
    }
    const act = debriefDue;
    if (act !== null) {
      debriefDue = null;
      void debrief(act).then(() => next && openNext(next));
    } else if (next) void openNext(next);
  });

  // ---------- memos and debriefs ----------

  /** CAMPAIGN-03: an act's first order opens after its memo, when the memo was never closed. */
  async function memoThen(n: number, open: () => void) {
    const o = orderOf(n);
    const first = actOrders(o.act)[0]!.n === n;
    if (first && !progress.memos.includes(o.act)) {
      await tty.print({ lines: memoLines(o.act) }).closed;
      set({ memos: addTo(progress.memos, o.act) });
    }
    open();
  }

  const debriefSpec = (act: number, atOnce: boolean): PrintSpec => ({
    lines: debriefLines({
      act,
      found: (n) => archive.found(n),
      filed: archive.state().filed.map((f) => ({ order: f.order, report: replay(f.order, f.wiring).report })),
      best: (n) => bests.best(n),
      repairBest: (n) => bests.repairBest(n),
      achievements: ext.debriefAchievements?.(act) ?? [],
    }),
    atOnce,
  });

  /** CAMPAIGN-04: the debrief, then on its first close the save code (SAVE-02). */
  async function debrief(act: number) {
    const first = !progress.debriefs.includes(act);
    await tty.print(debriefSpec(act, !first)).closed;
    if (!first) return;
    set({ debriefs: addTo(progress.debriefs, act) });
    await ext.afterDebrief?.(act);
  }

  // ARCHIVE-02: the archive lists what the order list shows; a done act's heading prints its debrief as it stands then.
  archive.extend({
    listed: () => unlocked(progress),
    litBy: (n) => {
      const l = progress.lamps[n];
      return l?.wiring ? replay(n, l.wiring).id : null;
    },
    headingTap: (act) => (isActDone(progress, act) ? () => void debrief(act) : null),
    orders: () => api.showOrderList(),
  });

  // ---------- the opening misfire ----------

  /**
   * CAMPAIGN-01, FEEL-12: order 1 on the night staff's wiring, the console on standby until the first tap. The Board wakes the
   * console over WakeTime at that tap; the run switch throws itself SelfThrowDelay after it. Taps in the OpeningGuard seconds
   * from the first tap do nothing; after them, a tap anywhere but the AUDIO switch skips the run as SKIP does.
   */
  function startMisfire() {
    standingBy = true;
    const night = orderOf(1).opening ?? [];
    board.openOrder(1, {
      wiring: night,
      standby: {
        onStandbyTap: () => {
          if (misfire) return;
          standingBy = false;
          misfire = { guardOver: false };
          setTimeout(() => misfire && (misfire.guardOver = true), OPENING_GUARD * 1000);
          pageEvents.emit("misfireStarted", { order: 1 });
          setTimeout(() => void board.run(), feelCampaign.SelfThrowDelay * 1000);
        },
      },
    });
    const el = shell.frame("board")!.el;
    const inAudio = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-control="audio"]');
    const onTap = (e: Event) => {
      if (!misfire || inAudio(e.target) || el.classList.contains("tc-paperup")) return;
      if (!misfire.guardOver) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (el.dataset.run !== "running" || e.type !== "pointerdown") return;
      const skip = el.querySelector<HTMLElement>('[data-control="skip"]');
      if (skip && !skip.contains(e.target as Node)) {
        e.stopPropagation();
        skip.click();
      }
    };
    el.addEventListener("pointerdown", onTap, true);
    el.addEventListener("click", onTap, true);
  }

  const api: Campaign = {
    progress: () => progress,
    setProgress(p) {
      progress = p;
      if (snap && !pending && !board.locked()) takeSnap(snap.order);
      if (shell.current === "orderList") renderList(true);
      if (shell.current === "title") title.setLabel(titleLabel());
      refreshLamp();
    },
    extend(e) {
      // Controls add up, in the order the blocks start; every other part has one filler.
      if (e.orderListControls) controlSources.push(e.orderListControls);
      if (e.titleControls) titleSources.push(e.titleControls);
      ext = { ...ext, ...e };
      if (e.medalsKey) pageSlots.refresh(BOARD_SLOTS.medalsControl);
    },
    isNew: () => progress.won.length === 0 && orders().every((o) => archive.found(o.n).length === 0),
    start() {
      return new Promise<void>((begun) => {
        title.show({
          label: titleLabel(),
          controls: titleSources.flatMap((c) => c()),
          onPress: () => {
            // START or CONTINUE: what a new game, or a kept one, opened on before the title.
            if (api.isNew()) startMisfire();
            else {
              api.showOrderList();
              // CAMPAIGN-04: a debrief left open when the game closed prints now, before the order list, then the save code.
              void (async () => {
                for (let act = 1; act <= ACTS; act++) if (isActDone(progress, act) && !progress.debriefs.includes(act)) await debrief(act);
              })();
            }
            begun();
          },
        });
      });
    },
    showOrderList() {
      shell.show("orderList");
      renderList();
      const notice = ext.orderListNotice?.();
      if (notice?.length) void tty.print({ lines: notice });
    },
    async openOrder(n) {
      if (!isUnlocked(progress, n) && !d.anyOrder) return;
      await memoThen(n, () => board.openOrder(n));
    },
    print: (spec) => tty.print(spec),
    lastOpened: () => lastOpened,
    onChange(cb) {
      changed.add(cb);
      return () => changed.delete(cb);
    },
    onOutcome(cb) {
      outcomes.add(cb);
      return () => outcomes.delete(cb);
    },
    standingBy: () => standingBy,
    inMisfire: () => misfire !== null,
  };
  return api;
}
