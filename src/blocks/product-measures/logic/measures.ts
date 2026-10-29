// Product measures, the rules (MEAS-01 to MEAS-04): the event store, its flags and queue, and the count request. Pure.

export type EventName = "order_start" | "order_finish";

/** One queued event, with the GameVersion it was made under (MEAS-03). */
export type QueuedEvent = { readonly name: EventName; readonly order: number; readonly version: number };

/** MEAS-04: two flags per order, set by name and order ("order_start-7"), and the queue, oldest first. */
export type EventStore = { readonly flags: readonly string[]; readonly queue: readonly QueuedEvent[] };

export const EMPTY_EVENTS: EventStore = { flags: [], queue: [] };

/** SendWait, seconds (measures.md parameters). */
export const SEND_WAIT = 30;

export const flagOf = (name: EventName, order: number) => `${name}-${order}`;

/** MEAS-04: a trigger fired. Flag unset: set it and queue the event, in one write. Flag set: no event. */
export function trigger(s: EventStore, name: EventName, order: number, version: number): { store: EventStore; queued: boolean } {
  const flag = flagOf(name, order);
  if (s.flags.includes(flag)) return { store: s, queued: false };
  return { store: { flags: [...s.flags, flag], queue: [...s.queue, { name, order, version }] }, queued: true };
}

/** MEAS-03: a sent event leaves the queue; only that one. */
export function removeSent(s: EventStore, e: QueuedEvent): EventStore {
  const i = s.queue.findIndex((q) => q.name === e.name && q.order === e.order && q.version === e.version);
  if (i < 0) return s;
  return { flags: s.flags, queue: [...s.queue.slice(0, i), ...s.queue.slice(i + 1)] };
}

/** MEAS-03: the count pixel: GET at CountAddress, `p` the event name, order and version joined by dashes, `e` true. */
export function countUrl(countAddress: string, e: QueuedEvent): string {
  const u = new URL(countAddress);
  u.searchParams.set("p", `${e.name}-${e.order}-${e.version}`);
  u.searchParams.set("e", "true");
  return u.toString();
}

/** A stored event store, read field by field; anything else is an empty store. */
export function readEvents(v: unknown): EventStore {
  if (typeof v !== "object" || v === null) return EMPTY_EVENTS;
  const o = v as { flags?: unknown; queue?: unknown };
  const flags = Array.isArray(o.flags) ? o.flags.filter((f): f is string => typeof f === "string" && /^order_(start|finish)-\d{1,3}$/.test(f)) : [];
  const queue = Array.isArray(o.queue)
    ? o.queue.filter(
        (q): q is QueuedEvent =>
          typeof q === "object" &&
          q !== null &&
          (q.name === "order_start" || q.name === "order_finish") &&
          Number.isInteger(q.order) &&
          Number.isInteger(q.version),
      )
    : [];
  return { flags: [...new Set(flags)], queue };
}
