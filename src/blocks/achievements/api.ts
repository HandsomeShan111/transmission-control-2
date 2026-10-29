// Achievements: three per act, earned by the wrong and the right solutions found; the commendation line after a report; each
// act's achievements in the archive and its debrief (ACHIEVE-01, ACHIEVE-02); every act's together on the COMMENDATIONS screen
// (owner's change).
import type { Archive } from "../incident-archive/api";
import type { Bests, Campaign } from "../campaign/api";
import type { PrintLine } from "../../platform/pieces/printout";
import type { FrameControl } from "../../platform/pieces/frame";
import type { Shell } from "../../platform/shell";

export type AchievementsExtension = {
  /** The commendations' controls after ORDERS, MEDALS and ARCHIVE, each in its slot: the AUDIO switch (Settings). */
  readonly controls?: () => readonly FrameControl[];
};

export interface Achievements {
  earned(): readonly string[];
  /** Restores a merged set (Saving). */
  setEarned(names: readonly string[]): void;
  /** ACHIEVE-01 after a save code is read: those newly met in every act, earned now, as their lines, in act and kind order. */
  earnAll(): PrintLine[];
  onChange(cb: () => void): () => void;
  extend(ext: AchievementsExtension): void;
  /** MEDALS: the COMMENDATIONS screen, every act's medals (owner's change). */
  show(): void;
}

export type AchievementsDeps = { readonly shell: Shell; readonly campaign: Campaign; readonly archive: Archive; readonly bests: Bests };

export type { AchievementData, Kind, Standing } from "./logic/achievements";
export {
  KINDS,
  achievements,
  actAchievements,
  commendationLine,
  debriefAchievementLines,
  isAchievement,
  isMet,
  kindProgress,
  newlyEarned,
  progressLine,
} from "./logic/achievements";
export { startAchievements } from "./view/achievements";
