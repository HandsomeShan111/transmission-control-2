// SAVE- acceptance tests a logic run can check (design/docs/build/acceptance-platform.md, Saving): the save code out and in,
// every edited code refused, the merge, an earlier version's save, and the size of a whole campaign's save.
import { describe, expect, test } from "bun:test";
import { pageEvents } from "../../../platform/events";
import { createStore, type LockManagerLike, type StorageLike } from "../../../platform/store";
import { achievements, type Achievements } from "../../achievements/api";
import { NEW_PROGRESS, hasSecondWiring, type Campaign, type Progress } from "../../campaign/api";
import { EMPTY_ARCHIVE, fileReport, replay, type Archive, type ArchiveState } from "../../incident-archive/api";
import type { OfflinePlay } from "../../offline-play/api";
import { orders, order } from "../../orders/api";
import { keepBest, score, type Best } from "../../par-and-score/api";
import { keepRepairBest, moves, type RepairBest } from "../../repair-orders/api";
import { inEnds, outJacks, parseWiring, setWiring } from "../../wires/api";
import { TEST_WIRINGS } from "../../../testbuild/wirings.gen";
import { wiringFor } from "../../../testbuild/search";
import {
  CODE_MAX_LENGTH,
  crc32,
  emptySave,
  fromBase64Url,
  mergeSaves,
  printOf,
  readCode,
  readIntoVersion,
  readKeptWirings,
  readStoredSave,
  startSaving,
  toBase64Url,
  toSave,
  writeCode,
  type Save,
} from "../api";
import { COUNT_MAX, FILED_MAX, JACK_MAX, PAYLOAD_MAX_BYTES, WIRES_MAX } from "../logic/code";

const V = 1;

/** A save of the given runs, played through the game's own rules. */
function saveOf(runs: { order: number; wiring: string }[], extra: Partial<Save> = {}): Save {
  let archive: ArchiveState = EMPTY_ARCHIVE;
  const bests: Record<number, Best> = {};
  const repairBests: Record<number, RepairBest> = {};
  const won = new Set<number>();
  for (const r of runs) {
    const o = order(r.order);
    const w = parseWiring(o, r.wiring);
    const { trace, report } = replay(o.n, w);
    archive = fileReport(archive, o.n, report, w).state;
    if (!trace.win) continue;
    won.add(o.n);
    if (o.par.kind === "score") bests[o.n] = keepBest(bests[o.n] ?? null, score(o, trace)!);
    else repairBests[o.n] = keepRepairBest(o, repairBests[o.n] ?? null, moves(o, w));
  }
  const s = toSave({ progress: { ...NEW_PROGRESS, won: [...won] }, archive, earned: [], bests, repairBests }, V);
  return { ...s, ...extra };
}

const W1 = "IN → LAMINATOR; LAMINATOR → World Council";

/** A code of any payload, or of a payload's JSON text as given, with a good check. */
async function forge(payload: unknown, version = 1): Promise<string> {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  const packed = new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  const head = `TC2-${version}-${toBase64Url(packed)}`;
  const c = crc32(head);
  return `${head}-${toBase64Url(new Uint8Array([c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255]))}`;
}
const GOOD = { w: [1], b: [[1, 2, 4, 0, 0]], r: [], l: [], f: [[1, [["IN", "LAMINATOR"], ["LAMINATOR", "World Council"]]]], o: [], e: [], m: [], d: [], p: [[1, printOf(1)]] };
const readsOk = async (payload: unknown) => (await readCode(await forge(payload), V)).ok;

/** Order 14's two copiers wired in a loop, each copy into the other: the slowest run there is, every item lost at RunLimit.
 * The order's other jacks and the wire list's order vary, so every wiring differs; `skip` the first ones, for wirings not run yet. */
function loopWirings(count: number, skip = 0): { from: string; to: string }[][] {
  const o = order(14);
  const loop = [
    { from: "IN", to: "SLICER 1" },
    { from: "SLICER 1 item", to: "SLICER 1" },
    { from: "SLICER 1 copy", to: "SLICER 2" },
    { from: "SLICER 2 item", to: "SLICER 2" },
    { from: "SLICER 2 copy", to: "SLICER 1" },
  ];
  const free = outJacks(o).filter((j) => !loop.some((w) => w.from === j));
  // Each other jack: a wire to one of the order's input ends, or none.
  const ends = [...inEnds(o), null];
  const out: { from: string; to: string }[][] = [];
  for (let i = skip; out.length < count; i++) {
    const extra = free.map((from, j) => ({ from, to: ends[Math.floor(i / ends.length ** j) % ends.length]! })).filter((w) => w.to !== null);
    const all = [...loop, ...extra];
    const turn = Math.floor(i / ends.length ** free.length) % all.length;
    out.push([...all.slice(turn), ...all.slice(0, turn)]);
  }
  return out;
}

describe("SAVE-02 Copy out, SAVE-03 Paste in: the code", () => {
  test("letters, digits, - and _ only, version first, a check last; read back whole", async () => {
    const s = saveOf([{ order: 1, wiring: "IN → World Council" }, { order: 1, wiring: W1 }], { memos: [1], earned: ["Paper Trail"] });
    const code = await writeCode(s);
    expect(code).toMatch(/^TC2-1-[A-Za-z0-9_-]+-[A-Za-z0-9_-]{6}$/);
    const r = await readCode(code, V);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.save).toEqual(s);
  });

  test("spaces and line breaks in the pasted text are ignored", async () => {
    const code = await writeCode(saveOf([{ order: 1, wiring: W1 }]));
    const spaced = code.replace(/(.{7})/g, "$1 \n ");
    expect((await readCode(`  ${spaced}\n`, V)).ok).toBe(true);
  });

  test("any one character changed: the check fails, not read", async () => {
    const code = await writeCode(saveOf([{ order: 1, wiring: W1 }, { order: 2, wiring: "IN → SHREDDER; SHREDDER → LAMINATOR; LAMINATOR → Parade Control" }]));
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const start = "TC2-1-".length;
    for (let i = start; i < code.length; i++) {
      const c = code[i]!;
      const other = alphabet[(alphabet.indexOf(c) + 7) % alphabet.length]!;
      const edited = code.slice(0, i) + other + code.slice(i + 1);
      const r = await readCode(edited, V);
      expect(r.ok, `position ${i}`).toBe(false);
    }
  });

  test("empty, truncated, oversized, foreign codes: not read", async () => {
    const code = await writeCode(saveOf([{ order: 1, wiring: W1 }]));
    for (const bad of ["", "   ", code.slice(0, -1), code.slice(0, 20), code + "A", "hello", "TC2-1--AAAAAA", "TC3-1-abc-AAAAAA", "x".repeat(CODE_MAX_LENGTH + 1)]) {
      expect((await readCode(bad, V)).ok, bad.slice(0, 30)).toBe(false);
    }
  });

  test("a code whose fields are not the save's, or name unknown orders, illegal wires, unknown results or achievements: not read", async () => {
    const good = GOOD;
    expect((await readCode(await forge(good), V)).ok).toBe(true);
    const bad: unknown[] = [
      { ...good, x: 1 },
      { ...good, w: [31] },
      { ...good, w: [1, 1] },
      { ...good, f: [[1, [["IN", "SHREDDER"]]]] },
      { ...good, f: [[1, [["IN", "LAMINATOR"], ["IN", "World Council"]]]] },
      { ...good, o: [[1, [3]]] },
      { ...good, e: ["Gold Star"] },
      { ...good, m: [7] },
      { ...good, b: [[17, 1, 1, 0, 0]] },
      { ...good, b: [[1, 1, 1, 2, 0]] },
      { ...good, l: [[1, null]] },
      { ...good, p: [] },
      [],
      null,
      "text",
    ];
    for (const p of bad) expect((await readCode(await forge(p), V)).ok, JSON.stringify(p).slice(0, 60)).toBe(false);
  });

  test("a code over a bound: not read; at the bound: read", async () => {
    // An order whose fingerprint differs from the one playing: its wires are read by name alone, so any jack name stands.
    const stale = (f: unknown[]) => ({ ...GOOD, f, p: [...GOOD.p, [2, "0000000"]] });
    expect(printOf(2)).not.toBe("0000000");
    const wiring = (n: number, jack = "J") => Array.from({ length: n }, (_, i) => [`${jack}${i}`, "X"]);
    // The payload's bytes: the good payload with spaces after it, valid JSON.
    expect(await readsOk(JSON.stringify(GOOD) + " ".repeat(PAYLOAD_MAX_BYTES - JSON.stringify(GOOD).length))).toBe(true);
    expect(await readsOk(JSON.stringify(GOOD) + " ".repeat(PAYLOAD_MAX_BYTES))).toBe(false);
    // Filed reports.
    const filed = (n: number) => Array.from({ length: n }, (_, i) => [2, [[`IN${i}`, "X"]]]);
    expect(await readsOk(stale(filed(FILED_MAX)))).toBe(true);
    expect(await readsOk(stale(filed(FILED_MAX + 1)))).toBe(false);
    // A filed report repeated, of an order playing or not.
    expect(await readsOk({ ...GOOD, f: [GOOD.f[0], GOOD.f[0]] })).toBe(false);
    expect(await readsOk(stale([[2, [["IN", "X"]]], [2, [["IN", "X"]]]]))).toBe(false);
    // Wires of one wiring, a jack's name, a count.
    expect(await readsOk(stale([[2, wiring(WIRES_MAX)]]))).toBe(true);
    expect(await readsOk(stale([[2, wiring(WIRES_MAX + 1)]]))).toBe(false);
    expect(await readsOk(stale([[2, [["J".repeat(JACK_MAX), "X".repeat(JACK_MAX)]]]]))).toBe(true);
    expect(await readsOk(stale([[2, [["J".repeat(JACK_MAX + 1), "X"]]]]))).toBe(false);
    expect(await readsOk(stale([[2, [["J", "X".repeat(JACK_MAX + 1)]]]]))).toBe(false);
    expect(await readsOk({ ...GOOD, b: [[1, COUNT_MAX, COUNT_MAX, 0, 0]] })).toBe(true);
    expect(await readsOk({ ...GOOD, b: [[1, COUNT_MAX + 1, 4, 0, 0]] })).toBe(false);
    expect(await readsOk({ ...GOOD, b: [[1, 2, COUNT_MAX + 1, 0, 0]] })).toBe(false);
    expect(await readsOk({ ...GOOD, w: [17], b: [], r: [[17, COUNT_MAX, 0]] })).toBe(true);
    expect(await readsOk({ ...GOOD, w: [17], b: [], r: [[17, COUNT_MAX + 1, 0]] })).toBe(false);
  });

  test("the writer keeps inside the reader's bounds: a save at each bound and over it writes a code that reads", async () => {
    // Every legal wiring fits the bounds: at most one wire per output jack, jack names as the data writes them.
    for (const o of orders()) {
      expect(outJacks(o).length).toBeLessThanOrEqual(WIRES_MAX);
      for (const j of [...outJacks(o), ...inEnds(o)]) expect(j.length).toBeLessThanOrEqual(JACK_MAX);
    }
    // Over FILED_MAX distinct filed reports, each of every output jack wired, one repeated: the first FILED_MAX, each once.
    const ws = loopWirings(FILED_MAX + 20);
    const all = ws.map((w) => ({ order: 14, wiring: w, id: replay(14, w).id }));
    const s: Save = {
      ...emptySave(V),
      won: [1, 17],
      bests: { 1: { wires: COUNT_MAX + 5, time: COUNT_MAX, wireMet: true, timeMet: false } },
      repairBests: { 17: { moves: COUNT_MAX + 1, parMet: false } },
      filed: [all[0]!, ...all],
      prints: { 14: printOf(14) },
    };
    const code = await writeCode(s);
    expect(code.length).toBeLessThan(CODE_MAX_LENGTH);
    const r = await readCode(code, V);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.filed).toEqual(all.slice(0, FILED_MAX));
    expect(r.save.bests[1]).toEqual({ wires: COUNT_MAX, time: COUNT_MAX, wireMet: true, timeMet: false });
    expect(r.save.repairBests[17]).toEqual({ moves: COUNT_MAX, parMet: false });
  });

  test("the slowest code to read: FILED_MAX filed reports, each a different loop run to RunLimit", async () => {
    // Wirings no other test runs, so none is a replay already kept.
    const f = loopWirings(FILED_MAX, FILED_MAX + 20).map((w) => [14, w.map((x) => [x.from, x.to])]);
    const before = new Set(loopWirings(FILED_MAX + 20).map((w) => JSON.stringify(w.map((x) => [x.from, x.to]))));
    expect(new Set(f.map((x) => JSON.stringify(x[1]))).size).toBe(FILED_MAX);
    expect(f.some((x) => before.has(JSON.stringify(x[1])))).toBe(false);
    const code = await forge({ ...GOOD, f, p: [[14, printOf(14)]] });
    const t0 = performance.now();
    const r = await readCode(code, V);
    const ms = performance.now() - t0;
    console.log(`slowest code: ${FILED_MAX} loop runs of order 14 read in ${Math.round(ms)} ms; code ${code.length} characters`);
    expect(r.ok).toBe(true);
    expect(ms).toBeLessThan(3000);
  });

  test("a code from a later GameVersion: read first, and not read here", async () => {
    const code = await writeCode({ ...saveOf([{ order: 1, wiring: W1 }]), version: 2 });
    expect(await readCode(code, V)).toEqual({ ok: false, why: "newer", version: 2 });
  });

  test("base64url round trip", () => {
    for (let n = 0; n < 40; n++) {
      const b = new Uint8Array(n).map((_, i) => (i * 37 + n) & 255);
      expect(fromBase64Url(toBase64Url(b))).toEqual(b);
    }
  });
});

describe("SAVE-03 merge", () => {
  test("wins, bests, lamps, filed reports, finds, achievements, memos: those of both, each once; mine first", () => {
    const mineS = saveOf([{ order: 1, wiring: "IN → World Council" }, { order: 1, wiring: W1 }], { memos: [1] });
    const theirs = saveOf([{ order: 1, wiring: "IN → LAMINATOR" }, { order: 1, wiring: W1 }], { debriefs: [1], earned: ["Under Budget"] });
    const m = mergeSaves(mineS, theirs);
    expect(m.won).toEqual([1]);
    expect(m.filed.map((f) => f.id)).toEqual([...mineS.filed.map((f) => f.id), theirs.filed[0]!.id]);
    expect(m.found[1]).toEqual([0, 1]);
    expect(m.memos).toEqual([1]);
    expect(m.debriefs).toEqual([1]);
    expect(m.earned).toEqual(["Under Budget"]);
    // The same code twice, or into the browser it came from: the save stays the same.
    expect(mergeSaves(m, theirs)).toEqual(m);
    expect(mergeSaves(mineS, mineS)).toEqual(mineS);
    // A filed report twice in one save: once.
    expect(mergeSaves(mineS, { ...theirs, filed: [...theirs.filed, ...theirs.filed] })).toEqual(m);
  });
  test("each best the better of the two; a lamp lit in mine keeps its own lit-by report", () => {
    const a: Save = { ...emptySave(V), bests: { 4: { wires: 5, time: 7, wireMet: true, timeMet: false } }, lamps: { 3: { wiring: [{ from: "IN", to: "INSPECTOR" }] } } };
    const b: Save = { ...emptySave(V), bests: { 4: { wires: 6, time: 5, wireMet: false, timeMet: true } }, lamps: { 3: { wiring: null }, 4: { wiring: [] } } };
    const m = mergeSaves(a, b);
    expect(m.bests[4]).toEqual({ wires: 5, time: 5, wireMet: true, timeMet: true });
    expect(m.lamps[3]).toEqual(a.lamps[3]!);
    expect(m.lamps[4]).toEqual({ wiring: [] });
  });
});

describe("SAVE-01 what this browser keeps, read again", () => {
  test("a kept save reads back whole", () => {
    const s = saveOf([{ order: 1, wiring: "IN → World Council" }, { order: 1, wiring: W1 }], { memos: [1], debriefs: [1], earned: ["Paper Trail"] });
    expect(readStoredSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  test("a malformed part reads as absent; each filed report once; no GameVersion, no save", () => {
    const s = saveOf([{ order: 1, wiring: W1 }]);
    const f = s.filed[0]!;
    const bad = {
      ...s,
      won: [1, "2", null, 99, 1],
      bests: { 1: null, 2: { wires: "3", time: 1, wireMet: false, timeMet: false }, 3: { wires: 2, time: 5, wireMet: true, timeMet: false }, 17: { wires: 1, time: 1, wireMet: true, timeMet: true } },
      repairBests: [],
      lamps: { 3: { wiring: "x" }, 4: null, 5: { wiring: null } },
      filed: [null, f, { ...f }, { order: 1, wiring: [{ from: "IN", to: "NOWHERE" }], id: "x" }, { order: 2, wiring: [], id: "y" }, { order: "1", wiring: [], id: "z" }],
      found: { 1: [2, 2, 9, "0"], 99: [0] },
      earned: ["Paper Trail", 5, "Gold Star"],
      memos: null,
      debriefs: [1, 99],
      prints: { ...s.prints, 2: 5 },
    };
    expect(readStoredSave(bad)).toEqual({
      ...emptySave(V),
      won: [1],
      bests: { 3: { wires: 2, time: 5, wireMet: true, timeMet: false } },
      lamps: { 5: { wiring: null } },
      filed: [f],
      found: { 1: [2] },
      earned: ["Paper Trail"],
      debriefs: [1],
      prints: s.prints,
    });
    for (const v of [null, [], "save", {}, { version: "1" }, { version: 0 }]) expect(readStoredSave(v)).toBeNull();
    expect(readStoredSave({ version: 2 })).toEqual(emptySave(2));
  });
  test("kept wirings: a malformed one reads as absent", () => {
    const good = { wiring: [{ from: "IN", to: "LAMINATOR" }], past: [[]], print: printOf(1), version: 1 };
    expect(readKeptWirings({ 1: good, 2: { ...good, past: [null] }, 3: { ...good, version: "1" }, 4: null, 99: good })).toEqual({ 1: good });
    expect(readKeptWirings("x")).toEqual({});
  });
});

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

describe("SAVE-01 the page closes while its writes wait on the lock", () => {
  test("pagehide writes them at once, without the lock: the save merged, the changed wiring, a won repair order's wiring dropped", async () => {
    const g = globalThis as { window?: unknown };
    const w = new EventTarget();
    g.window = w;
    try {
      const st = new MemStorage();
      // Another page kept order 2 won; order 17's wiring was kept before this page won it.
      const theirs: Save = { ...emptySave(V), won: [2] };
      st.setItem("tc2.save", JSON.stringify(theirs));
      st.setItem("tc2.wirings", JSON.stringify({ 17: { wiring: [], past: [], print: printOf(17), version: V } }));
      // Another page holds the lock: it is never granted here.
      const locks: LockManagerLike = { request: () => new Promise(() => {}) };
      const store = createStore({ prefix: "tc2.", storage: st, locks });
      let progress: Progress = NEW_PROGRESS;
      const changed: (() => void)[] = [];
      const campaign = {
        progress: () => progress,
        onChange: (cb: () => void) => (changed.push(cb), () => {}),
        onOutcome: () => () => {},
        extend: () => {},
      } as unknown as Campaign;
      const archive = { state: () => EMPTY_ARCHIVE, onChange: () => () => {} } as unknown as Archive;
      const earned = { earned: () => [], onChange: () => () => {} } as unknown as Achievements;
      startSaving({ store, campaign, archive, achievements: earned, offline: {} as OfflinePlay });
      // This page wins orders 1 and 17 (a repair order) and changes order 3's wiring.
      expect(order(17).repair).toBe(true);
      progress = { ...NEW_PROGRESS, won: [1, 17] };
      for (const cb of changed) cb();
      const w3 = parseWiring(order(3), "IN → INSPECTOR");
      setWiring(3, w3);
      pageEvents.emit("wiringChanged", { order: 3 });
      await new Promise((r) => setTimeout(r, 20));
      // Waiting on the lock: nothing written.
      expect(JSON.parse(st.getItem("tc2.save")!)).toEqual(theirs);
      expect(Object.keys(JSON.parse(st.getItem("tc2.wirings")!))).toEqual(["17"]);
      w.dispatchEvent(new Event("pagehide"));
      expect(readStoredSave(JSON.parse(st.getItem("tc2.save")!))!.won).toEqual([1, 2, 17]);
      const wirings = readKeptWirings(JSON.parse(st.getItem("tc2.wirings")!));
      expect(Object.keys(wirings)).toEqual(["3"]);
      expect(wirings[3]!.wiring).toEqual(w3);
    } finally {
      delete g.window;
    }
  });
});

describe("SAVE-05 Version", () => {
  test("an order whose fingerprint differs drops its filed reports; its win, finds, bests and lamp stay", () => {
    const s = saveOf([{ order: 4, wiring: "IN → INSPECTOR" }, { order: 4, wiring: TEST_WIRINGS[3]!.wirings.map((w) => w.wires.map((x) => `${x.from} → ${x.to}`).join("; "))[0]! }]);
    const old: Save = { ...s, version: 1, lamps: { 4: { wiring: s.filed[1]!.wiring } }, prints: { ...s.prints, 4: "0000000" } };
    const r = readIntoVersion(old, 2);
    expect(r.dropped).toBe(true);
    expect(r.save.version).toBe(2);
    expect(r.save.filed.filter((f) => f.order === 4)).toEqual([]);
    expect(r.save.won).toEqual(s.won);
    expect(r.save.bests).toEqual(s.bests);
    expect(r.save.found).toEqual(s.found);
    expect(r.save.lamps[4]).toEqual({ wiring: null });
    expect(readIntoVersion(s, 1).dropped).toBe(false);
  });
});

describe("SAVE-01 size: a whole campaign with every report filed", () => {
  test("every order won by each test wiring, every hand-written result found: kept well inside local storage", async () => {
    let archive: ArchiveState = EMPTY_ARCHIVE;
    const bests: Record<number, Best> = {};
    const repairBests: Record<number, RepairBest> = {};
    const lamps: Record<number, { wiring: readonly { from: string; to: string }[] }> = {};
    for (const o of orders()) {
      for (const r of o.results) {
        const w = wiringFor(o, r.ending)!;
        const { report } = replay(o.n, w);
        archive = fileReport(archive, o.n, report, w).state;
      }
      for (const tw of TEST_WIRINGS.find((x) => x.order === o.n)!.wirings) {
        const { trace, report } = replay(o.n, tw.wires);
        archive = fileReport(archive, o.n, report, tw.wires).state;
        if (o.par.kind === "score") bests[o.n] = keepBest(bests[o.n] ?? null, score(o, trace)!);
        else repairBests[o.n] = keepRepairBest(o, repairBests[o.n] ?? null, moves(o, tw.wires));
      }
      if (hasSecondWiring(o)) lamps[o.n] = { wiring: TEST_WIRINGS.find((x) => x.order === o.n)!.wirings[0]!.wires };
    }
    // Every result found, whichever wiring a player found it by.
    archive = { ...archive, found: Object.fromEntries(orders().map((o) => [o.n, o.results.map((_, i) => i)])) };
    const progress = { won: orders().map((o) => o.n), memos: [1, 2, 3, 4, 5, 6], debriefs: [1, 2, 3, 4, 5, 6], lamps };
    const s = toSave({ progress, archive, earned: achievements().map((a) => a.name), bests, repairBests }, V);
    const kept = JSON.stringify(s).length;
    const code = await writeCode(s);
    console.log(`full campaign: ${s.filed.length} filed reports, ${Object.values(s.found).flat().length} results found; kept save ${kept} characters; save code ${code.length} characters`);
    expect(Object.values(s.found).flat().length).toBe(90);
    // Local storage holds about 5 million characters per origin; the save stays under a twentieth of it.
    expect(kept).toBeLessThan(250_000);
    expect(code.length).toBeLessThan(CODE_MAX_LENGTH);
    const back = await readCode(code, V);
    expect(back.ok && back.save).toEqual(s);
  });
});
