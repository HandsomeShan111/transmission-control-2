// Campaign, switched off: no acts, no order list; order 1 opens on the Board.
import type * as Api from "./api";
import { NEW_PROGRESS } from "./logic/campaign";

export const startCampaign: typeof Api.startCampaign = (d) => ({
  progress: () => NEW_PROGRESS,
  setProgress: () => {},
  extend: () => {},
  start: async () => d.board.openOrder(1),
  showOrderList: () => {},
  openOrder: async (n) => d.board.openOrder(n),
  isNew: () => true,
  print: () => ({ shown: new Promise(() => {}), closed: Promise.resolve() }),
  lastOpened: () => null,
  onChange: () => () => {},
  onOutcome: () => () => {},
  standingBy: () => false,
  inMisfire: () => false,
});
