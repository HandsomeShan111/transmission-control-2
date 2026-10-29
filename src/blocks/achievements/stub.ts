// Achievements, switched off: none earned, no commendation.
import type * as Api from "./api";

export const startAchievements: typeof Api.startAchievements = () => ({
  earned: () => [],
  setEarned: () => {},
  earnAll: () => [],
  onChange: () => () => {},
  extend: () => {},
  show: () => {},
});
