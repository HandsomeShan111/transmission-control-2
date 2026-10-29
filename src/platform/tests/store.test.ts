import { describe, expect, test } from "bun:test";
import { createStore, type LockManagerLike, type StorageLike } from "../store";

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}
class FullStorage extends MemStorage {
  override setItem(): void {
    throw new DOMException("full", "QuotaExceededError");
  }
}
/** A browser that takes writes and keeps none. */
class ForgetfulStorage extends MemStorage {
  override setItem(): void {}
}

describe("store", () => {
  test("JSON by key, under a prefix", () => {
    const st = new MemStorage();
    const s = createStore({ prefix: "tc2.", storage: st, locks: null });
    expect(s.set("save", { won: [1, 2], sound: true })).toBe(true);
    expect(s.get("save")).toEqual({ won: [1, 2], sound: true });
    expect(st.map.has("tc2.save")).toBe(true);
    expect(s.get("missing")).toBeUndefined();
    s.remove("save");
    expect(s.get("save")).toBeUndefined();
    expect(s.check()).toEqual({ keeps: true });
    expect(s.keepsNothing()).toBe(false);
  });
  test("a value that is not JSON reads as nothing", () => {
    const st = new MemStorage();
    st.setItem("p.x", "{not json");
    expect(createStore({ prefix: "p.", storage: st, locks: null }).get("x")).toBeUndefined();
  });
  test("full or refused storage: the write reports false and the value lasts in memory (SAVE-04)", () => {
    const s = createStore({ prefix: "p.", storage: new FullStorage(), locks: null });
    expect(s.set("save", { a: 1 })).toBe(false);
    expect(s.keepsNothing()).toBe(true);
    expect(s.get("save")).toEqual({ a: 1 });
    expect(s.check()).toEqual({ keeps: false, reason: "refused" });
  });
  test("a write that does not read back means the browser keeps nothing", () => {
    const s = createStore({ prefix: "p.", storage: new ForgetfulStorage(), locks: null });
    expect(s.check()).toEqual({ keeps: false, reason: "no read back" });
    expect(s.set("k", 5)).toBe(false);
    expect(s.get("k")).toBe(5);
  });
  test("no storage at all (blocked)", () => {
    const s = createStore({ prefix: "p.", storage: null, locks: null });
    expect(s.check()).toEqual({ keeps: false, reason: "unavailable" });
    expect(s.set("k", "v")).toBe(false);
    expect(s.get("k")).toBe("v");
    s.remove("k");
    expect(s.get("k")).toBeUndefined();
  });
  test("reads still come from the browser's storage after a failed write", () => {
    const st = new MemStorage();
    st.setItem("p.old", JSON.stringify("kept"));
    const s = createStore({ prefix: "p.", storage: st, locks: null });
    st.setItem = () => {
      throw new Error("full");
    };
    expect(s.set("new", 1)).toBe(false);
    expect(s.get("old")).toBe("kept");
    expect(s.get("new")).toBe(1);
  });
  test("storage that throws on read", () => {
    const st = new MemStorage();
    st.getItem = () => {
      throw new Error("blocked");
    };
    const s = createStore({ prefix: "p.", storage: st, locks: null });
    expect(s.get("x")).toBeUndefined();
    expect(s.keepsNothing()).toBe(true);
  });
  test("a lock over the Web Locks API where present", async () => {
    const names: string[] = [];
    const locks: LockManagerLike = {
      async request(name, opts, fn) {
        names.push(`${name}:${opts.mode}`);
        return fn();
      },
    };
    const s = createStore({ prefix: "tc2.", storage: new MemStorage(), locks });
    expect(s.hasLocks()).toBe(true);
    expect(await s.withLock("events", () => 42)).toBe(42);
    expect(names).toEqual(["tc2.events:exclusive"]);
  });
  test("a lock request the browser refuses: fn runs at once, and the store goes on without locks", async () => {
    let asked = 0;
    const locks: LockManagerLike = {
      request() {
        asked++;
        return Promise.reject(new DOMException("The request was denied.", "SecurityError"));
      },
    };
    const s = createStore({ prefix: "p.", storage: new MemStorage(), locks });
    expect(await s.withLock("save", () => 7)).toBe(7);
    expect(s.hasLocks()).toBe(false);
    expect(await s.withLock("save", async () => 8)).toBe(8);
    expect(asked).toBe(1);
  });
  test("fn's own throw under a lock is thrown, and fn runs once", async () => {
    let runs = 0;
    const locks: LockManagerLike = { request: async (_n, _o, fn) => fn() };
    const s = createStore({ prefix: "p.", storage: new MemStorage(), locks });
    const r = s.withLock("save", () => {
      runs++;
      throw new Error("fn failed");
    });
    await expect(r).rejects.toThrow("fn failed");
    expect(runs).toBe(1);
    expect(s.hasLocks()).toBe(true);
  });
  test("another page's change: only this store's own key in its own storage", () => {
    const st = new MemStorage();
    const w = new EventTarget();
    const g = globalThis as { window?: unknown };
    g.window = w;
    try {
      const s = createStore({ prefix: "tc2.", storage: st, locks: null });
      const seen: string[] = [];
      s.onOtherChange("save", () => seen.push("save"));
      const fire = (key: string | null, area: unknown) => w.dispatchEvent(Object.assign(new Event("storage"), { key, storageArea: area }));
      fire("tc2.save", st);
      fire("other.save", st);
      fire("save", st);
      fire("tc2.save", new MemStorage());
      fire(null, st);
      expect(seen).toEqual(["save"]);
    } finally {
      delete g.window;
    }
  });
  test("a plain call where the browser has no locks", async () => {
    const s = createStore({ prefix: "p.", storage: new MemStorage(), locks: null });
    expect(s.hasLocks()).toBe(false);
    expect(await s.withLock("x", async () => "done")).toBe("done");
  });
  test("defaults read the globals inside a try", () => {
    const s = createStore({ prefix: "p." });
    expect(typeof s.check().keeps).toBe("boolean");
  });
});
