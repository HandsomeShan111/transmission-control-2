// Browser local storage wrapper (system architecture, Platform: Store). JSON
// by key; a lock between open pages over the Web Locks API where present; a
// check that reports when the browser keeps nothing. No game rules here.
// SAVE-04: a write that fails or does not read back means the browser keeps
// nothing; values then last in this page's memory until it closes.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LockManagerLike {
  request<T>(name: string, options: { mode?: "exclusive" | "shared" }, fn: () => Promise<T> | T): Promise<T>;
}

export type KeepReport =
  | { keeps: true }
  | { keeps: false; reason: "unavailable" | "refused" | "no read back" };

export interface Store {
  get<T>(key: string): T | undefined;
  /** Writes and reads back. False when the browser kept nothing; the value stays in memory. */
  set(key: string, value: unknown): boolean;
  remove(key: string): void;
  /** Runs fn under a lock shared by every open page of this origin, or at once where the browser has no locks. A lock request
   * the browser refuses (Chromium, with site data blocked) runs fn at once too, and the store goes on without locks. */
  withLock<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
  hasLocks(): boolean;
  /** Calls fn when another page of this origin changes key in this store's storage (its storage event). */
  onOtherChange(key: string, fn: () => void): void;
  /** Probes the storage once with a write, a read back and a removal. */
  check(): KeepReport;
  /** True once any write failed or did not read back. */
  keepsNothing(): boolean;
}

export interface StoreOptions {
  /** Key prefix, so the game's keys never meet another app's. */
  prefix: string;
  /** Default: globalThis.localStorage, read inside a try (it can throw when blocked). */
  storage?: StorageLike | null;
  /** Default: globalThis.navigator.locks. */
  locks?: LockManagerLike | null;
}

function defaultStorage(): StorageLike | null {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

function defaultLocks(): LockManagerLike | null {
  const nav = (globalThis as { navigator?: { locks?: LockManagerLike } }).navigator;
  return nav?.locks ?? null;
}

export function createStore(opts: StoreOptions): Store {
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  let locks = opts.locks === undefined ? defaultLocks() : opts.locks;
  // This page's own writes; null marks a removal. Read first once the browser stops keeping.
  const memory = new Map<string, string | null>();
  let failed = storage === null;
  const k = (key: string) => opts.prefix + key;

  const read = (key: string): string | null => {
    if (failed && memory.has(key)) return memory.get(key) ?? null;
    if (storage) {
      try {
        return storage.getItem(k(key));
      } catch {
        failed = true;
      }
    }
    return memory.get(key) ?? null;
  };

  const write = (key: string, text: string): boolean => {
    memory.set(key, text);
    if (failed || !storage) return false;
    try {
      storage.setItem(k(key), text);
      if (storage.getItem(k(key)) === text) return true;
    } catch {
      // refused or full: falls through to no keeping
    }
    failed = true;
    return false;
  };

  return {
    get<T>(key: string) {
      const text = read(key);
      if (text === null) return undefined;
      try {
        return JSON.parse(text) as T;
      } catch {
        return undefined;
      }
    },
    set(key, value) {
      return write(key, JSON.stringify(value));
    },
    remove(key) {
      memory.set(key, null);
      if (failed || !storage) return;
      try {
        storage.removeItem(k(key));
      } catch {
        failed = true;
      }
    },
    withLock(name, fn) {
      if (!locks) return Promise.resolve().then(fn);
      let ran = false;
      return locks
        .request(opts.prefix + name, { mode: "exclusive" }, () => {
          ran = true;
          return fn();
        })
        .catch((e: unknown) => {
          if (ran) throw e;
          locks = null;
          return fn();
        });
    },
    hasLocks: () => locks !== null,
    onOtherChange(key, fn) {
      if (typeof window === "undefined") return;
      window.addEventListener("storage", (e) => {
        if (storage !== null && e.storageArea === storage && e.key === k(key)) fn();
      });
    },
    check() {
      if (!storage) return { keeps: false, reason: "unavailable" };
      const probe = k("__probe__");
      const text = String(Date.now());
      try {
        storage.setItem(probe, text);
      } catch {
        failed = true;
        return { keeps: false, reason: "refused" };
      }
      let back: string | null = null;
      try {
        back = storage.getItem(probe);
        storage.removeItem(probe);
      } catch {
        back = null;
      }
      if (back !== text) {
        failed = true;
        return { keeps: false, reason: "no read back" };
      }
      return failed ? { keeps: false, reason: "refused" } : { keeps: true };
    },
    keepsNothing: () => failed,
  };
}
