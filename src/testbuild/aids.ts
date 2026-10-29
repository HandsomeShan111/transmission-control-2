// The test build's aids (acceptance.md, Test build), and nothing else: the game plays as the release does.
// - A test list: any order opens past the campaign's locks (`?testlist` shows it; `__tc2.openOrder(n)`).
// - Local counter and link: CountAddress is the test server's /__count; GameLink is this server's own address (build values).
// - Named hold points for two-page tests: arm a point by name (`tc2aid.holds` in local storage, or `__tc2.arm`), the page stops
//   there with `__tc2.held` set to its name until `__tc2.release(name)`.
// - Storage request control: `tc2aid.persist` "granted" or "refused"; the requests are counted in `tc2aid.persistCount`, kept
//   across reloads.
// - Clipboard control: `tc2aid.clipboard` "refuse" refuses every write; each write is kept in `__tc2.clipboard`.
// - Item placement at a jack: `__tc2.place(item, jack)`, then `__tc2.work(agent)`: one agent works or checks its first waiting
//   item once, with no run and no report.
// - Save seeding from a test file: `tc2aid.seed` (a SeedSpec, JSON) is written as the save, kept wirings, event store and
//   setting before the game opens, then removed.
// - Kept-save view: `__tc2.keptView()`, the kept save as named values.
import { apply, type Applied } from "../blocks/agents/api";
import { enter, type Item } from "../blocks/items/api";
import { order as orderOf, orders } from "../blocks/orders/api";
import { gameVersion } from "../blocks/offline-play/api";
import type { Save } from "../blocks/saving/api";
import { seedOf, type SeedSpec } from "./seed";

const PREFIX = "tc2.";
const AID = "tc2aid.";

const ls = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      // a browser that keeps nothing: the aid keeps nothing either
    }
  },
  remove(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      // as above
    }
  },
};

/** Seeds the save before the game opens. */
export function seedNow(): void {
  const text = ls.get(`${AID}seed`);
  if (!text) return;
  ls.remove(`${AID}seed`);
  const s = seedOf(JSON.parse(text) as SeedSpec, gameVersion());
  ls.set(`${PREFIX}save`, JSON.stringify(s.save));
  ls.set(`${PREFIX}wirings`, JSON.stringify(s.wirings));
  if (s.events) ls.set(`${PREFIX}events`, JSON.stringify(s.events));
  if (s.muted !== null) ls.set(`${PREFIX}settings`, JSON.stringify({ muted: s.muted }));
}

export type Aids = ReturnType<typeof makeAids>;

export function makeAids() {
  const armed = new Set<string>(JSON.parse(ls.get(`${AID}holds`) ?? "[]") as string[]);
  const waiting = new Map<string, () => void>();
  const placed = new Map<string, Item[]>();
  const aids = {
    held: null as string | null,
    clipboard: [] as string[],
    arm(point: string) {
      armed.add(point);
    },
    release(point: string) {
      armed.delete(point);
      const r = waiting.get(point);
      waiting.delete(point);
      if (aids.held === point) aids.held = null;
      r?.();
    },
    hold(point: string): Promise<void> {
      if (!armed.has(point)) return Promise.resolve();
      aids.held = point;
      return new Promise<void>((r) => waiting.set(point, r));
    },
    persist(): Promise<boolean> {
      ls.set(`${AID}persistCount`, String(Number(ls.get(`${AID}persistCount`) ?? "0") + 1));
      return Promise.resolve(ls.get(`${AID}persist`) === "granted");
    },
    persistCount: () => Number(ls.get(`${AID}persistCount`) ?? "0"),
    async copy(text: string): Promise<void> {
      if (ls.get(`${AID}clipboard`) === "refuse") throw new Error("the test build refuses the clipboard");
      aids.clipboard.push(text);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // The engine's own clipboard may refuse a test page; the copy is kept above.
      }
    },
    /** Puts batch item `place` of order n at `jack`, an agent's input jack; an item moved keeps its kind, marks and checks. */
    place(n: number, place: number, jack: string) {
      const o = orderOf(n);
      let it: Item | undefined;
      for (const [j, list] of placed) {
        const i = list.findIndex((x) => x.place === place && x.copy === 0);
        if (i >= 0) {
          it = list[i];
          list.splice(i, 1);
          placed.set(j, list);
        }
      }
      const b = o.batch[place - 1]!;
      it ??= enter(place, b.kind, b.marks, b.required);
      placed.set(jack, [...(placed.get(jack) ?? []), it]);
      return it;
    },
    /** One named agent works or checks its first waiting item once: no run, no report. */
    work(n: number, label: string): Applied | null {
      const o = orderOf(n);
      const a = o.agents.find((x) => x.label === label);
      const list = placed.get(label) ?? [];
      const first = list.shift();
      if (!a || !first) return null;
      const r = apply({ name: a.name, label: a.label, passLimit: a.passLimit }, first, { copy: 1, required: null });
      placed.set(label, list);
      return r;
    },
    /** The kept save as named values: orders won, each order's best wires, beats and moves, pars met. */
    keptView() {
      const s = JSON.parse(ls.get(`${PREFIX}save`) ?? "null") as Save | null;
      if (!s) return null;
      const bests: Record<number, { wires: number; beats: number }> = {};
      const moves: Record<number, number> = {};
      const parsMet: Record<number, string[]> = {};
      for (const [k, b] of Object.entries(s.bests)) {
        bests[Number(k)] = { wires: b.wires, beats: b.time };
        parsMet[Number(k)] = [...(b.wireMet ? ["wires"] : []), ...(b.timeMet ? ["time"] : [])];
      }
      for (const [k, b] of Object.entries(s.repairBests)) {
        moves[Number(k)] = b.moves;
        parsMet[Number(k)] = b.parMet ? ["moves"] : [];
      }
      return { version: s.version, won: s.won, bests, moves, parsMet, found: s.found, earned: s.earned, memos: s.memos, debriefs: s.debriefs, lamps: Object.keys(s.lamps).map(Number), filed: s.filed.length };
    },
    orders: () => orders().map((o) => ({ n: o.n, name: o.name })),
  };
  return aids;
}
