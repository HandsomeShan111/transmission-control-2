// Typed page-event bus (system architecture, Assembly: page events, fixed
// fields). A block adds an event by merging into PageEvents:
//   declare module "../../platform/events" { interface PageEvents { myEvent: { order: number } } }

export interface PageEvents {
  /** From Wiring board. */
  orderOpened: { order: number };
  /** From Wires. */
  wiringChanged: { order: number };
  /** From Run view. */
  runEnded: { order: number; win: boolean; reportId: string };
  /** From Reports. */
  reportClosed: { order: number; reportId: string };
  /** From Saving. */
  winKept: { order: number };
  /** From the design system's plates and rows (owner's change): a real press that did something; the key click plays. */
  keyPressed: Record<string, never>;
}

export type Listener<P> = (payload: Readonly<P>) => void;

export interface Bus<E> {
  on<K extends keyof E>(name: K, fn: Listener<E[K]>): () => void;
  once<K extends keyof E>(name: K, fn: Listener<E[K]>): () => void;
  off<K extends keyof E>(name: K, fn: Listener<E[K]>): void;
  /** Calls every listener in the order it subscribed. A listener that throws does not stop the others; the errors are thrown after all ran. */
  emit<K extends keyof E>(name: K, payload: E[K]): void;
  count<K extends keyof E>(name: K): number;
}

export function createBus<E>(): Bus<E> {
  const map = new Map<keyof E, Listener<never>[]>();
  const list = <K extends keyof E>(name: K) => (map.get(name) ?? []) as Listener<E[K]>[];
  const bus: Bus<E> = {
    on(name, fn) {
      map.set(name, [...list(name), fn] as Listener<never>[]);
      return () => bus.off(name, fn);
    },
    once(name, fn) {
      const wrap: typeof fn = (p) => {
        bus.off(name, wrap);
        fn(p);
      };
      return bus.on(name, wrap);
    },
    off(name, fn) {
      map.set(name, list(name).filter((f) => f !== fn) as Listener<never>[]);
    },
    emit(name, payload) {
      const fixed = Object.freeze({ ...payload });
      const errors: unknown[] = [];
      for (const fn of list(name)) {
        try {
          fn(fixed);
        } catch (e) {
          errors.push(e);
        }
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, `${String(name)}: ${errors.length} listeners failed`);
    },
    count(name) {
      return list(name).length;
    },
  };
  return bus;
}

/** The page's one bus. */
export const pageEvents: Bus<PageEvents> = createBus<PageEvents>();
