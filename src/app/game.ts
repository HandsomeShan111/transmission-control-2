// Assembly (system architecture, Assembly): one shell, one sound system and one store for the page; every block started in layer
// order, each slot filled; the save restored; then the game opens on its title screen, and past it the opening misfire for a new
// game, else the order list.
import { createShell, type Shell } from "../platform/shell";
import { createSound, type SoundSystem } from "../platform/sound";
import { createStore, type Store } from "../platform/store";
import { pageEvents } from "../platform/events";
import { BUILD, CANNOT_STORE, startOfflinePlay, type OfflinePlay } from "../blocks/offline-play/api";
import { board as makeBoard, type Board } from "../blocks/wiring-board/api";
import { best, setBest } from "../blocks/par-and-score/api";
import { best as repairBest, repairBoard, setBest as setRepairBest } from "../blocks/repair-orders/api";
import { startArchive, type Archive } from "../blocks/incident-archive/api";
import { startCampaign, type Bests, type Campaign } from "../blocks/campaign/api";
import { startAchievements, type Achievements } from "../blocks/achievements/api";
import { startReportSharing } from "../blocks/report-sharing/api";
import { startSaving, type Saving } from "../blocks/saving/api";
import { startSettings } from "../blocks/settings/api";
import { startMeasures } from "../blocks/product-measures/api";

/** What the test build passes (acceptance.md, Test build). The release passes nothing. */
export type GameOptions = {
  readonly anyOrder?: boolean;
  readonly hold?: (point: string) => Promise<void>;
  readonly persist?: () => Promise<boolean>;
  readonly clipboard?: (text: string) => Promise<void>;
  readonly countAddress?: string;
};

export type Game = {
  readonly shell: Shell;
  readonly sound: SoundSystem;
  readonly store: Store;
  readonly offline: OfflinePlay;
  readonly board: Board;
  readonly archive: Archive;
  readonly campaign: Campaign;
  readonly achievements: Achievements;
  readonly saving: Saving;
  readonly sharing: ReturnType<typeof startReportSharing>;
  readonly measures: ReturnType<typeof startMeasures>;
  readonly opened: Promise<void>;
};

export function startGame(o: GameOptions = {}): Game {
  const shell = createShell();
  const sound = createSound();
  sound.unlock(document);
  // Owner's change: every real press of a plate or a row clicks; AUDIO off keeps it silent as every sound.
  pageEvents.on("keyPressed", () => void sound.play("key"));
  const store = createStore({ prefix: "tc2." });
  // Layer 0
  const offline = startOfflinePlay({ shell });
  // Layers 1 and 2: the Board, with Repair orders' MOVES lamp and moves line.
  const board = makeBoard(shell, { sound });
  repairBoard(board);
  // Layer 3
  const bests: Bests = { best, setBest, repairBest, setRepairBest };
  const archive = startArchive({ shell, sound });
  const campaign = startCampaign({ shell, sound, board, archive, bests, ...(o.anyOrder ? { anyOrder: true } : {}) });
  // Layer 4
  const achievements = startAchievements({ shell, campaign, archive, bests });
  const sharing = startReportSharing({ shell, board, archive, campaign, ...(o.clipboard ? { clipboard: o.clipboard } : {}) });
  // Layer 5
  const saving = startSaving({
    store,
    campaign,
    archive,
    achievements,
    offline,
    ...(o.hold ? { hold: o.hold } : {}),
    ...(o.persist ? { persist: o.persist } : {}),
    ...(o.clipboard ? { clipboard: o.clipboard } : {}),
  });
  let measures: ReturnType<typeof startMeasures> | null = null;
  const opened = (async () => {
    await saving.restore();
    startSettings({ sound, saving, campaign, archive, achievements });
    // Layer 6
    // The test build counts at its own server's test receiver (acceptance.md, Test build).
    const countAddress = o.countAddress ?? (BUILD.countAddress === "local" ? new URL("/__count", location.href).href : BUILD.countAddress);
    measures = startMeasures({ store, campaign, countAddress, ...(o.hold ? { hold: o.hold } : {}) });
    const { cannotStore } = await offline.ready;
    // The title screen first; the game opens past it on START or CONTINUE (owner's change).
    const begun = campaign.start();
    // OFFLINE-01: the cannot-store line prints once the game opens, on the screen it opens on. A new game opens in the opening
    // misfire's standby, where every tap but AUDIO is the first tap (CAMPAIGN-01): there it prints once order 1 opens after the
    // memo (design silent on when; decided so the line never takes the misfire's first tap).
    if (cannotStore)
      void begun.then(() => {
        const say = () => void campaign.print({ lines: [{ text: CANNOT_STORE }] });
        if (!campaign.standingBy()) say();
        else {
          const off = pageEvents.on("orderOpened", () => {
            if (campaign.standingBy() || campaign.inMisfire()) return;
            off();
            say();
          });
        }
      });
  })();
  return {
    shell,
    sound,
    store,
    offline,
    board,
    archive,
    campaign,
    achievements,
    saving,
    sharing,
    get measures() {
      if (!measures) throw new Error("measures start once the save is restored");
      return measures;
    },
    opened,
  };
}
