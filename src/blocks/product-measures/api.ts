// Product measures: one order_start and one order_finish event per order per browser, queued, sent as a GoatCounter pixel while
// online (MEAS-01 to MEAS-04). Sends nothing while CountAddress is empty. No API: it listens to page events.
import type { Store } from "../../platform/store";
import type { Campaign } from "../campaign/api";

export type MeasuresDeps = {
  readonly store: Store;
  readonly campaign: Campaign;
  /** CountAddress; empty sends nothing. */
  readonly countAddress: string;
  /** A point a test build may hold a page at: "event lock taken, write not made" (acceptance.md, Test build). */
  readonly hold?: (point: string) => Promise<void>;
  /** The count request; resolves once the pixel loads. Default: a GET with no cookie, from the page. */
  readonly request?: (url: string, signal: AbortSignal) => Promise<void>;
};

export type { EventName, EventStore, QueuedEvent } from "./logic/measures";
export { EMPTY_EVENTS, SEND_WAIT, countUrl, flagOf, readEvents, removeSent, trigger } from "./logic/measures";
export { startMeasures } from "./view/measures";
