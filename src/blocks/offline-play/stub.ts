// Offline play, switched off: the game opens at once from the download and keeps no file.
import type * as Api from "./api";

export const startOfflinePlay: typeof Api.startOfflinePlay = () => ({
  ready: Promise.resolve({ firstLoad: false, cannotStore: false }),
  cannotStoreLine: () => null,
  lookForNewVersion: () => Promise.resolve(false),
});
