// Saving, the save code (SAVE-02, SAVE-03): the save as one line of letters, digits, "-" and "_", ending in a check that fails when
// any one character changes. "TC2-<GameVersion>-<payload>-<check>": the payload is the save's fields, deflated, in base64url; the
// check is a CRC-32 of all before it. A code is read field by field and checked in full before anything merges: known orders,
// legal wires for each order, known results and achievements, each filed report once, bounded counts and length. Anything else:
// not read. The writer keeps inside the same bounds, so a code it writes is always read.
import { achievements } from "../../achievements/api";
import { hasSecondWiring } from "../../campaign/api";
import { reportIdOf, replay } from "../../incident-archive/api";
import type { Wire } from "../../orders/api";
import { order as orderOf, orders } from "../../orders/api";
import type { Best } from "../../par-and-score/api";
import type { RepairBest } from "../../repair-orders/api";
import { emptySave, legalWiring, printOf } from "./save";
import type { Save, SaveFiled } from "./save";

/**
 * Bounds of a code and of what it holds. FILED_MAX: a whole campaign files about 121 reports; each filed report of an order playing
 * runs again as the code is read, so the bound keeps the slowest read (every one a loop at RunLimit) short.
 */
export const CODE_MAX_LENGTH = 200_000;
export const PAYLOAD_MAX_BYTES = 2_000_000;
export const FILED_MAX = 500;
export const WIRES_MAX = 64;
export const JACK_MAX = 48;
export const COUNT_MAX = 999;

/** A filed report's order and wiring, as the code names it once. */
const filedKey = (order: number, wiring: readonly Wire[]) => `${order}:${JSON.stringify(wiring.map((w) => [w.from, w.to]))}`;

export type ReadCode =
  | { readonly ok: true; readonly save: Save }
  | { readonly ok: false; readonly why: "not read" }
  | { readonly ok: false; readonly why: "newer"; readonly version: number };

// ---------- bytes ----------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    if (b !== undefined) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    if (c !== undefined) out += B64[c & 63]!;
  }
  return out;
}

export function fromBase64Url(text: string): Uint8Array | null {
  if (text.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (const ch of text) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  // Leftover bits must be zero: one text, one byte string.
  if (acc & ((1 << bits) - 1)) return null;
  return out.slice(0, o);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(text: string): number {
  let c = 0xffffffff;
  for (let i = 0; i < text.length; i++) c = CRC_TABLE[(c ^ text.charCodeAt(i)) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function checkOf(text: string): string {
  const c = crc32(text);
  return toBase64Url(new Uint8Array([c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255]));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, max: number): Promise<Uint8Array | null> {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {});
  void writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      total += r.value.length;
      if (total > max) {
        void reader.cancel().catch(() => {});
        return null;
      }
      parts.push(r.value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// ---------- write ----------

/** The fields a code carries, all but GameVersion, which leads the code. Wires as [from, to]; counts at most COUNT_MAX. */
function payloadOf(s: Save): unknown {
  const pairs = (w: readonly Wire[]) => w.map((x) => [x.from, x.to]);
  const c = (x: number) => Math.min(x, COUNT_MAX);
  return {
    w: s.won,
    b: Object.entries(s.bests).map(([n, b]) => [Number(n), c(b.wires), c(b.time), b.wireMet ? 1 : 0, b.timeMet ? 1 : 0]),
    r: Object.entries(s.repairBests).map(([n, b]) => [Number(n), c(b.moves), b.parMet ? 1 : 0]),
    l: Object.entries(s.lamps).map(([n, l]) => [Number(n), l.wiring === null ? null : pairs(l.wiring)]),
    f: s.filed.map((f) => [f.order, pairs(f.wiring)]),
    o: Object.entries(s.found).map(([n, rs]) => [Number(n), [...rs]]),
    e: s.earned,
    m: s.memos,
    d: s.debriefs,
    p: Object.entries(s.prints).map(([n, p]) => [Number(n), p]),
  };
}

/**
 * SAVE-02: the save as its code, inside the bounds its reader takes: each filed report once, the first FILED_MAX in filing order;
 * over the payload's or the code's length, the newest filed reports stay out until it fits (design silent on both).
 */
export async function writeCode(s: Save): Promise<string> {
  const once = new Set<string>();
  let filed = s.filed
    .filter((f) => {
      const k = filedKey(f.order, f.wiring);
      if (once.has(k)) return false;
      once.add(k);
      return true;
    })
    .slice(0, FILED_MAX);
  for (;;) {
    const json = new TextEncoder().encode(JSON.stringify(payloadOf({ ...s, filed })));
    const packed = await pipe(json, new CompressionStream("deflate-raw"), Infinity);
    const head = `TC2-${s.version}-${toBase64Url(packed!)}`;
    const code = `${head}-${checkOf(head)}`;
    if ((json.length <= PAYLOAD_MAX_BYTES && code.length <= CODE_MAX_LENGTH) || filed.length === 0) return code;
    filed = filed.slice(0, Math.floor(filed.length * 0.9));
  }
}

// ---------- read ----------

class NotRead extends Error {}
const fail = (): never => {
  throw new NotRead();
};
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const int = (v: unknown, lo: number, hi: number): number => (isInt(v, lo, hi) ? v : fail());
const bit = (v: unknown): boolean => (v === 0 ? false : v === 1 ? true : fail());
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) && v.length <= max ? v : fail());
const tuple = (v: unknown, len: number): unknown[] => (Array.isArray(v) && v.length === len ? v : fail());
const uniqueInts = (v: unknown, lo: number, hi: number, max: number): number[] => {
  const xs = arr(v, max).map((x) => int(x, lo, hi));
  if (new Set(xs).size !== xs.length) fail();
  return [...xs].sort((a, b) => a - b);
};

/** A wiring of [from, to] pairs, each a jack name of bounded length; legal for the order when its fingerprint is the one playing. */
function wiringOf(v: unknown, n: number, current: boolean): Wire[] {
  const w = arr(v, WIRES_MAX).map((p) => {
    const [from, to] = tuple(p, 2);
    if (typeof from !== "string" || typeof to !== "string" || !from || !to || from.length > JACK_MAX || to.length > JACK_MAX) fail();
    return { from: from as string, to: to as string };
  });
  if (current && !legalWiring(n, w)) fail();
  return w;
}

/** Reads a payload's fields into a save of `version`. Throws NotRead on anything but the fields as written. */
function readPayload(v: unknown, version: number): Save {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail();
  const o = v as Record<string, unknown>;
  const keys = ["w", "b", "r", "l", "f", "o", "e", "m", "d", "p"];
  if (Object.keys(o).length !== keys.length || !keys.every((k) => k in o)) fail();
  const last = orders().length;
  const known = (n: number) => n >= 1 && n <= last;
  const once = new Set<string>();
  const first = (tag: string, n: number) => {
    if (once.has(`${tag}${n}`)) fail();
    once.add(`${tag}${n}`);
  };

  const prints: Record<number, string> = {};
  for (const p of arr(o.p, last)) {
    const [n, fp] = tuple(p, 2);
    const k = int(n, 1, last);
    first("p", k);
    if (typeof fp !== "string" || !/^[0-9a-z]{7}$/.test(fp)) fail();
    prints[k] = fp as string;
  }
  const current = (n: number) => prints[n] === printOf(n);

  const won = uniqueInts(o.w, 1, last, last);
  const bests: Record<number, Best> = {};
  for (const b of arr(o.b, last)) {
    const [n, wires, time, wm, tm] = tuple(b, 5);
    const k = int(n, 1, last);
    first("b", k);
    if (orderOf(k).repair) fail();
    bests[k] = { wires: int(wires, 0, COUNT_MAX), time: int(time, 0, COUNT_MAX), wireMet: bit(wm), timeMet: bit(tm) };
  }
  const repairBests: Record<number, RepairBest> = {};
  for (const b of arr(o.r, last)) {
    const [n, moves, pm] = tuple(b, 3);
    const k = int(n, 1, last);
    first("r", k);
    if (!orderOf(k).repair) fail();
    repairBests[k] = { moves: int(moves, 0, COUNT_MAX), parMet: bit(pm) };
  }
  const lamps: Record<number, { wiring: Wire[] | null }> = {};
  for (const l of arr(o.l, last)) {
    const [n, w] = tuple(l, 2);
    const k = int(n, 1, last);
    first("l", k);
    if (!hasSecondWiring(orderOf(k)) || (w !== null && prints[k] === undefined)) fail();
    lamps[k] = { wiring: w === null ? null : wiringOf(w, k, current(k)) };
  }
  const filed: SaveFiled[] = [];
  const filedOnce = new Set<string>();
  for (const f of arr(o.f, FILED_MAX)) {
    const [n, w] = tuple(f, 2);
    const k = int(n, 1, last);
    if (prints[k] === undefined) fail();
    const wiring = wiringOf(w, k, current(k));
    // Each filed report once: a repeat is not a code this game writes.
    const key = filedKey(k, wiring);
    if (filedOnce.has(key)) fail();
    filedOnce.add(key);
    // The id is the report's own, read again from its run where the order is the one playing.
    filed.push({ order: k, wiring, id: current(k) ? replay(k, wiring).id : reportIdOf(k, [JSON.stringify(wiring)]) });
  }
  const found: Record<number, number[]> = {};
  for (const r of arr(o.o, last)) {
    const [n, rs] = tuple(r, 2);
    const k = int(n, 1, last);
    first("o", k);
    found[k] = uniqueInts(rs, 0, orderOf(k).results.length - 1, orderOf(k).results.length);
  }
  const names = new Set(achievements().map((a) => a.name));
  const earned = arr(o.e, names.size).map((x) => (typeof x === "string" && names.has(x) ? x : fail()));
  if (new Set(earned).size !== earned.length) fail();
  const acts = Math.max(...orders().map((x) => x.act));
  const memos = uniqueInts(o.m, 1, acts, acts);
  const debriefs = uniqueInts(o.d, 1, acts, acts);
  if (!won.every(known)) fail();
  return { ...emptySave(version), won, bests, repairBests, lamps, filed, found, earned, memos, debriefs, prints };
}

/**
 * SAVE-03: reads a pasted code. Spaces and line breaks are ignored. GameVersion is read first: a later one is not read here.
 * A failed check, or anything but the fields as written: not read.
 */
export async function readCode(pasted: string, playing: number): Promise<ReadCode> {
  const text = pasted.replace(/\s+/g, "");
  if (text.length === 0 || text.length > CODE_MAX_LENGTH) return { ok: false, why: "not read" };
  const m = /^TC2-([1-9][0-9]{0,3})-([A-Za-z0-9_-]+)-([A-Za-z0-9_-]{6})$/.exec(text);
  if (!m) return { ok: false, why: "not read" };
  const version = Number(m[1]);
  if (version > playing) return { ok: false, why: "newer", version };
  const head = `TC2-${m[1]}-${m[2]}`;
  if (checkOf(head) !== m[3]) return { ok: false, why: "not read" };
  const packed = fromBase64Url(m[2]!);
  if (!packed) return { ok: false, why: "not read" };
  const json = await pipe(packed, new DecompressionStream("deflate-raw"), PAYLOAD_MAX_BYTES);
  if (!json) return { ok: false, why: "not read" };
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(json));
  } catch {
    return { ok: false, why: "not read" };
  }
  try {
    return { ok: true, save: readPayload(value, version) };
  } catch (e) {
    if (e instanceof NotRead) return { ok: false, why: "not read" };
    throw e;
  }
}
