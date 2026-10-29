// Saving in the page (SAVE-01 to SAVE-05): keeps every change under the store's lock (read again, merge, write once); kept
// wirings beside the save; what still waits on a lock written at once as the page hides or closes; the save code out (SAVE CODE,
// after a debrief) and in (LOAD SAVE CODE); a browser that keeps nothing.
import { pageEvents } from "../../../platform/events";
import { declareKeys, KEY, key, paperField, plate, type PrintLine, type Printout } from "../../../platform/pieces";
import { order as orderOf } from "../../orders/api";
import { bests as allBests, setBest } from "../../par-and-score/api";
import { bests as allRepairBests, setBest as setRepairBest } from "../../repair-orders/api";
import { gameVersion } from "../../offline-play/api";
import { setWiring, undoSteps, wiring as wiringOf } from "../../wires/api";
import type { Saving, SavingDeps, Settings } from "../api";
import { readCode, writeCode } from "../logic/code";
import { fromSave, keptWiringFits, mergeSaves, printOf, readIntoVersion, readKeptWirings, readStoredSave, toSave, type KeptWiring, type Save } from "../logic/save";

export const COPIED = "COPIED";
export const SELECT_AND_COPY = "SELECT AND COPY";
export const SAVE_CODE_READ = "SAVE CODE READ";
export const CODE_NOT_READ = "CODE NOT READ";
export const NEWER_CODE = "CODE FROM A NEWER VERSION. CONNECT, CLOSE EVERY TERMINAL, AND OPEN IT AGAIN.";
export const KEEPS_NO_RECORDS = "THIS TERMINAL KEEPS NO RECORDS. COPY YOUR SAVE CODE.";
export const EARLIER_DROPPED = "SOME RECORDS FROM AN EARLIER VERSION NOT KEPT.";

const K = { save: "save", wirings: "wirings", settings: "settings", persist: "persist" } as const;
/** Undo steps kept per order, the newest (design silent on a bound). */
const STEPS_KEPT = 200;

const recordOf = <T>(m: ReadonlyMap<number, T>): Record<number, T> => Object.fromEntries(m) as Record<number, T>;

export function startSaving(d: SavingDeps): Saving {
  const { store, campaign, archive, achievements, offline } = d;
  declareKeys({ label: "SAVE CODE" }, { label: "LOAD SAVE CODE" });
  const version = gameVersion();
  let noticeDropped = false;
  let noKeepShown = false;
  let settings: Settings = { muted: false };
  let scheduled: Promise<void> | null = null;
  let printing: Promise<void> | null = null;
  /** A change to the save not yet written; orders whose wiring changed, not yet written. */
  let saveDue = false;
  const wiringsDue = new Set<number>();

  const parts = () => ({
    progress: campaign.progress(),
    archive: archive.state(),
    earned: achievements.earned(),
    bests: recordOf(allBests()),
    repairBests: recordOf(allRepairBests()),
  });
  const mine = () => toSave(parts(), version);

  /** A save into every block. */
  const apply = (s: Save) => {
    const p = fromSave(s);
    for (const [n, b] of Object.entries(p.bests)) setBest(Number(n), b);
    for (const [n, b] of Object.entries(p.repairBests)) setRepairBest(Number(n), b);
    // The medals last: setEarned draws every medal wall again, and a wall's progress reads the archive and the campaign.
    archive.setState(p.archive);
    campaign.setProgress(p.progress);
    achievements.setEarned(p.earned);
  };

  const readKept = (): Save | null => {
    const s = readStoredSave(store.get(K.save));
    if (!s) return null;
    const r = readIntoVersion(s, version);
    if (r.dropped && s.version <= version) noticeDropped = true;
    return r.save;
  };

  /** A kept save from a later GameVersion: this page never writes it back at its own, and plays from memory (SAVE-05, OFFLINE-03). */
  const newerKept = () => {
    const v = store.get<{ version?: unknown }>(K.save)?.version;
    return typeof v === "number" && v > version;
  };
  const writeSave = (s: Save) => {
    if (!newerKept()) store.set(K.save, s);
  };

  const keptWirings = (): Record<number, KeptWiring> => readKeptWirings(store.get(K.wirings));

  /** SAVE-01: a won repair order keeps no wiring, and opens on its opening wiring. True when one was dropped from `all`. */
  const dropWon = (all: Record<number, KeptWiring>) => {
    let changed = false;
    for (const n of campaign.progress().won)
      if (orderOf(n).repair && all[n]) {
        delete all[n];
        changed = true;
        setWiring(n, orderOf(n).opening ?? []);
      }
    return changed;
  };
  const dropWonRepairs = () =>
    store.withLock(K.wirings, () => {
      const all = keptWirings();
      if (dropWon(all)) store.set(K.wirings, all);
    });

  /** The save read again, merged with this page's and written, at once: no other page's write falls between. */
  const writeMerged = () => {
    const kept = readKept();
    const merged = kept ? mergeSaves(mine(), kept) : mine();
    saveDue = false;
    writeSave(merged);
    return merged;
  };

  const keepNow = async () => {
    await store.withLock(K.save, async () => {
      if (d.hold) await d.hold("save lock taken, write not made");
      apply(writeMerged());
    });
    await dropWonRepairs();
  };

  const keep = (): Promise<void> => {
    saveDue = true;
    // Changes made together (a filing, a win, a commendation) are kept in one write.
    scheduled ??= Promise.resolve().then(async () => {
      scheduled = null;
      await keepNow();
    });
    return scheduled;
  };

  campaign.onChange(() => void keep());
  archive.onChange(() => void keep());
  achievements.onChange(() => void keep());
  campaign.onOutcome((n, win) => {
    if (win) void keep().then(() => pageEvents.emit("winKept", { order: n }));
  });

  /** SAVE-01: order n's wiring as this page holds it, in its place among the kept wirings; a won repair order keeps none. */
  const putWiring = (all: Record<number, KeptWiring>, n: number) => {
    if (orderOf(n).repair && campaign.progress().won.includes(n)) delete all[n];
    else all[n] = { wiring: [...wiringOf(n)], past: undoSteps(n).slice(-STEPS_KEPT).map((p) => [...p]), print: printOf(n), version };
  };

  // SAVE-01: each order's wiring, beside the save; two pages: the later change stands.
  pageEvents.on("wiringChanged", ({ order: n }) => {
    wiringsDue.add(n);
    void store.withLock(K.wirings, () => {
      // Written already, as the page hid.
      if (!wiringsDue.delete(n)) return;
      const all = keptWirings();
      putWiring(all, n);
      store.set(K.wirings, all);
    });
  });

  /**
   * SAVE-01: the page hides or closes: what still waits on a lock (another page holds it, or it is not granted yet) is written at
   * once, without it, as the lock's own writes are: the save read again and merged; each changed wiring in its place; a won repair
   * order's wiring dropped. Local storage writes at once, so this holds while the page unloads.
   */
  const keepAtOnce = () => {
    if (saveDue) writeMerged();
    const all = keptWirings();
    const due = wiringsDue.size > 0;
    for (const n of wiringsDue) putWiring(all, n);
    wiringsDue.clear();
    if (dropWon(all) || due) store.set(K.wirings, all);
  };
  if (typeof window !== "undefined") window.addEventListener("pagehide", keepAtOnce);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && keepAtOnce());

  // Another page of the game kept a change: it merges into this page (SAVE-01).
  store.onOtherChange(K.save, () => {
    const kept = readKept();
    if (kept) apply(mergeSaves(mine(), kept));
  });

  // ---------- printouts ----------

  const copyOut = async (text: string): Promise<boolean> => {
    try {
      await (d.clipboard ?? ((t: string) => navigator.clipboard.writeText(t)))(text);
      return true;
    } catch {
      return false;
    }
  };

  /** SAVE-01: the first save code printed in this browser asks, once, to keep storage as persistent. */
  const askPersist = () => {
    if (store.get<boolean>(K.persist)) return;
    store.set(K.persist, true);
    const ask = d.persist ?? (() => (navigator.storage?.persist ? navigator.storage.persist() : Promise.resolve(false)));
    void ask().catch(() => false);
  };

  /** SAVE-02: one save code printout at a time; a second tap while it prints or shows prints none. */
  const printCode = () => (printing ??= printCodeNow().finally(() => (printing = null)));
  const printCodeNow = async () => {
    const code = await writeCode(mine());
    let paper: Printout | null = null;
    const copy = plate({
      label: "COPY",
      onPaper: true,
      onPress: () =>
        void copyOut(code).then((ok) => {
          if (!paper) return;
          if (!ok) selectLine(paper, 1);
          paper.addFootLine({ text: ok ? COPIED : SELECT_AND_COPY });
        }),
    });
    copy.el.dataset.control = "copy";
    const job = campaign.print({ lines: [{ text: "SAVE CODE" }, { text: code }], controls: [copy.el] });
    paper = await job.shown;
    paper.el.dataset.paper = "save-code";
    askPersist();
    await job.closed;
  };

  /** The code's line, selected for the player to copy (SAVE-02). */
  const selectLine = (p: Printout, index: number) => {
    const line = p.el.querySelectorAll('[data-part="paper-line"]')[index];
    const sel = window.getSelection();
    if (line && sel) sel.selectAllChildren(line);
  };

  /** SAVE-03: what READ prints for a pasted code. */
  const readLines = async (text: string): Promise<PrintLine[]> => {
    const r = await readCode(text, version);
    if (!r.ok) {
      if (r.why === "newer") {
        void offline.lookForNewVersion();
        return [{ text: NEWER_CODE }];
      }
      return [{ text: CODE_NOT_READ }];
    }
    const theirs = readIntoVersion(r.save, version);
    let earned: PrintLine[] = [];
    await store.withLock(K.save, async () => {
      const kept = readKept();
      const base = kept ? mergeSaves(mine(), kept) : mine();
      apply(mergeSaves(base, theirs.save));
      // ACHIEVE-02: the commendations the merge newly earns, after SAVE CODE READ, the bell before the first.
      earned = achievements.earnAll().map((l, i) => (i === 0 ? { ...l, bell: true } : l));
      if (d.hold) await d.hold("save lock taken, write not made");
      writeSave(mine());
    });
    await dropWonRepairs();
    // SAVE-05: a code from an earlier version that drops records says so, once, with what READ prints.
    return [{ text: SAVE_CODE_READ }, ...earned, ...(theirs.dropped ? [{ text: EARLIER_DROPPED }] : [])];
  };
  const readPasted = async (text: string) => ({ lines: (await readLines(text)).map((l) => l.text) });

  const loadCode = async () => {
    const field = paperField({ placeholder: "" });
    field.dataset.control = "code-field";
    let readTapped = false;
    let paper: Printout | null = null;
    const read = plate({
      label: "READ",
      onPaper: true,
      onPress: () => {
        if (readTapped) return false;
        readTapped = true;
        void readLines(field.value)
          .catch((e: unknown): PrintLine[] => {
            // A read that fails on its way reads nothing: CODE NOT READ, and LOAD SAVE CODE tries again.
            console.error(e);
            return [{ text: CODE_NOT_READ }];
          })
          .then(async (out) => {
            await paper?.close();
            const job = campaign.print({ lines: out });
            (await job.shown).el.dataset.paper = "code-read";
          });
        return true;
      },
    });
    read.el.dataset.control = "read";
    const job = campaign.print({ lines: [{ text: "LOAD SAVE CODE" }], controls: [field, read.el] });
    paper = await job.shown;
    paper.el.dataset.paper = "load-code";
    await job.closed;
  };

  // ---------- the order list ----------

  campaign.extend({
    orderListControls: () => {
      // A press while the code prints does nothing, and clicks not (owner's change).
      const save = plate({
        label: "SAVE CODE",
        onPress: () => {
          if (printing) return false;
          void printCode();
          return true;
        },
      });
      const load = plate({ label: "LOAD SAVE CODE", onPress: () => void loadCode() });
      return [key(save, KEY.actionA), key(load, KEY.actionB)];
    },
    afterDebrief: () => printCode(),
    orderListNotice: () => {
      const out: PrintLine[] = [];
      // SAVE-04: once, on the order list, when a write failed or did not read back.
      if (!noKeepShown && store.keepsNothing()) {
        noKeepShown = true;
        out.push({ text: KEEPS_NO_RECORDS });
      }
      if (noticeDropped) {
        noticeDropped = false;
        out.push({ text: EARLIER_DROPPED });
      }
      return out.length ? out : null;
    },
  });

  return {
    kept: mine,
    async restore() {
      // Whatever this browser keeps, the game opens: a part that cannot be read reads as absent.
      try {
        store.check();
        const s = store.get<Settings>(K.settings);
        settings = { muted: s?.muted === true };
        const kept = readKept();
        if (kept) {
          apply(kept);
          // SAVE-05: once read, the kept save takes the GameVersion playing; one from a later version stays as it is.
          if (store.get<{ version?: unknown }>(K.save)?.version !== version && !newerKept()) await keepNow();
        }
        await store.withLock(K.wirings, () => {
          const all = keptWirings();
          let dropped = false;
          for (const [k, w] of Object.entries(all)) {
            const n = Number(k);
            if (keptWiringFits(n, w)) setWiring(n, w.wiring, w.past);
            else if (w.version <= version) {
              dropped = true;
              delete all[n];
            }
          }
          if (dropped) {
            noticeDropped = true;
            store.set(K.wirings, all);
          }
        });
      } catch (e) {
        console.error(e);
      }
    },
    keep,
    printCode,
    readPasted,
    settings: () => settings,
    keepSettings(s) {
      settings = s;
      store.set(K.settings, s);
    },
    keptWiring: (n) => keptWirings()[n] ?? null,
  };
}
