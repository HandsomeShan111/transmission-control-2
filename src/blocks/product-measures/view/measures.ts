// Product measures in the page (MEAS-01 to MEAS-04): triggers set a flag and queue an event in one write under the event lock;
// the page holding the send lock sends the queue oldest first, one request each, and stops until the next start when one fails
// or takes longer than SendWait. Play never waits on a request; the page makes it, never a worker.
import { pageEvents } from "../../../platform/events";
import { gameVersion } from "../../offline-play/api";
import type { MeasuresDeps } from "../api";
import { SEND_WAIT, countUrl, readEvents, removeSent, trigger, type EventName, type EventStore } from "../logic/measures";

const KEY = "events";

/** MEAS-03: a GET of the count pixel that carries no cookie and no referrer. */
async function pixel(url: string, signal: AbortSignal): Promise<void> {
  await fetch(url, { method: "GET", mode: "no-cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal });
}

export function startMeasures(d: MeasuresDeps): { send(): Promise<void>; events(): EventStore } {
  const { store, campaign } = d;
  const version = gameVersion();
  let sending: Promise<void> | null = null;
  const read = () => readEvents(store.get(KEY));

  /** MEAS-04: under the event lock, read the store; flag unset: set it and queue, in one write. */
  const fire = async (name: EventName, order: number) => {
    let queued = false;
    await store.withLock(KEY, async () => {
      const r = trigger(read(), name, order, version);
      if (!r.queued) return;
      // No hold, no wait: without locks, two triggers of one page never read the store before the other writes.
      if (d.hold) await d.hold("event lock taken, write not made");
      store.set(KEY, r.store);
      queued = true;
    });
    if (queued) void send();
  };

  /** MEAS-03: the page holding the send lock sends; another page waits for it, then reads the queue again. A request that fails
   * or outlasts SendWait stops this sending; the next start (an event queued, the next open, back online) sends again. */
  const send = (): Promise<void> => {
    if (!d.countAddress) return Promise.resolve();
    sending ??= store
      .withLock("send", async () => {
        for (;;) {
          const e = read().queue[0];
          if (!e) return;
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), SEND_WAIT * 1000);
          try {
            await (d.request ?? pixel)(countUrl(d.countAddress, e), ctl.signal);
          } catch {
            return;
          } finally {
            clearTimeout(timer);
          }
          await store.withLock(KEY, () => store.set(KEY, removeSent(read(), e)));
        }
      })
      .finally(() => (sending = null));
    return sending;
  };

  pageEvents.on("misfireStarted", ({ order }) => void fire("order_start", order));
  pageEvents.on("orderOpened", ({ order }) => {
    // The opening misfire's order 1 counts at its first tap, not as its standby shows (MEAS-01).
    if (!campaign.standingBy()) void fire("order_start", order);
  });
  pageEvents.on("winKept", ({ order }) => void fire("order_finish", order));
  if (typeof window !== "undefined") window.addEventListener("online", () => void send());
  void send();
  return { send, events: read };
}
