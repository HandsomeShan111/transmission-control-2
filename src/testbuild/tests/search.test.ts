// Tests that need the wiring search: ORDER-01, ORDER-02, ORDER-04, ORDER-05, PAR-01, REPAIR-01, and the Test wirings page.
import { describe, expect, test } from "bun:test";
import { agent, agents, families } from "../../blocks/agents/api";
import type { Order } from "../../blocks/orders/api";
import { order, orders, sameEnding } from "../../blocks/orders/api";
import { moves } from "../../blocks/repair-orders/api";
import { report } from "../../blocks/reports/api";
import { endingOf, run } from "../../blocks/run/api";
import type { Wire } from "../../blocks/wires/api";
import type { Found } from "../search";
import { fewestMoveFixes, winningWirings, wiringFor } from "../search";
import { TEST_WIRINGS } from "../wirings.gen";

// A search test may take this long; the whole search over 30 orders takes about a second.
const SearchTimeout = 30_000;

const winsMemo = new Map<number, Found[]>();
const wins = (o: Order) => winsMemo.get(o.n) ?? (winsMemo.set(o.n, winningWirings(o)), winsMemo.get(o.n)!);
const fixMemo = new Map<number, ReturnType<typeof fewestMoveFixes>>();
const fixes = (o: Order) => (fixMemo.has(o.n) ? fixMemo.get(o.n)! : (fixMemo.set(o.n, fewestMoveFixes(o)), fixMemo.get(o.n)!));

const key = (ws: readonly Wire[]) => ws.map((w) => `${w.from} → ${w.to}`).sort().join("; ");
const scoreOrders = () => orders().filter((o) => o.par.kind === "score");
const stripTwins = (label: string) => label.replace(/ \d+$/, "");

describe("Test wirings", () => {
  test("each of the 30 orders is won by every wiring listed for it", () => {
    for (const line of TEST_WIRINGS) {
      const o = order(line.order);
      for (const w of line.wirings) expect(run(o, w.wires).win, `order ${o.n} ${w.label}`).toBe(true);
    }
  });

  test("the listed wirings meet the pars they say, and a repair fix needs at most MovePar moves", () => {
    for (const line of TEST_WIRINGS) {
      const o = order(line.order);
      for (const w of line.wirings) {
        const t = run(o, w.wires);
        const at = `order ${o.n} ${w.label}`;
        if (o.par.kind === "moves") {
          expect(w.label, at).toBe("fix");
          expect(moves(o, w.wires), at).toBeLessThanOrEqual(o.par.moves);
          continue;
        }
        if (w.label === "wirePar" || w.label === "bothPars") expect(t.wireCount, at).toBeLessThanOrEqual(o.par.wires!);
        if (w.label === "timePar" || w.label === "bothPars") expect(t.time, at).toBeLessThanOrEqual(o.par.time!);
      }
      // Where one wiring can meet both pars it does; where none can, one wiring meets each.
      if (o.par.kind === "score" && o.par.wires !== null && o.par.time !== null) {
        const labels = line.wirings.map((w) => w.label);
        expect(labels, `order ${o.n}`).toEqual(o.par.split ? ["wirePar", "timePar"] : ["bothPars"]);
      }
    }
  });

  test(
    "each listed wiring is a known winning wiring: the search lists it, or lists it as a fewest-move fix",
    () => {
      for (const line of TEST_WIRINGS) {
        const o = order(line.order);
        const known = new Set((o.repair ? fixes(o)!.fixes : wins(o)).map((f) => key(f.wires)));
        for (const w of line.wirings) expect(known.has(key(w.wires)), `order ${o.n} ${w.label}`).toBe(true);
      }
    },
    SearchTimeout,
  );

  test(
    "no listed search wiring has a wire that carries nothing",
    () => {
      for (const o of orders()) {
        for (const f of wins(o)) {
          const t = run(o, f.wires, { snapshots: false });
          const used = new Set(t.beats.flatMap((b) => b.events.flatMap((e) => (e.type === "send" ? [e.from] : []))));
          for (const w of f.wires) expect(used.has(w.from), `order ${o.n}: ${key(f.wires)}`).toBe(true);
        }
      }
    },
    SearchTimeout,
  );
});

describe("PAR-01 Setting par", () => {
  test(
    "WirePar and TimePar are the fewest wires and beats of the known winning wirings; none where all wins are alike; Signing ceremony and Archive day among them",
    () => {
      const pars = (o: Order) => {
        const ws = wins(o);
        const n = ws.map((f) => f.wireCount);
        const t = ws.map((f) => f.time);
        return {
          wires: Math.min(...n) === Math.max(...n) ? null : Math.min(...n),
          time: Math.min(...t) === Math.max(...t) ? null : Math.min(...t),
        };
      };
      expect(pars(order(1))).toEqual({ wires: null, time: null });
      expect(pars(order(4))).toEqual({ wires: 5, time: 5 });
      for (const o of scoreOrders()) {
        const p = o.par as { wires: number | null; time: number | null };
        expect(pars(o), `order ${o.n}`).toEqual({ wires: p.wires, time: p.time });
      }
    },
    SearchTimeout,
  );
});

describe("ORDER-01 Text", () => {
  test("each text is in GP-3's 20 words, names no agent, and lists no marks as steps in order", () => {
    const marks = agents().flatMap((a) => (a.mark ? [a.mark] : []));
    const m = marks.join("|");
    for (const o of orders()) {
      expect(o.text.split(/\s+/).length, `order ${o.n}`).toBeLessThanOrEqual(20);
      for (const a of agents()) expect(new RegExp(`\\b${a.name}\\b`, "i").test(o.text), `order ${o.n} names ${a.name}`).toBe(false);
      // Two mark names side by side, joined by a comma, "and" or "then", would list marks as steps.
      expect(new RegExp(`\\b(${m})\\b(,| and| then|, then) (${m})\\b`, "i").test(o.text), `order ${o.n}`).toBe(false);
    }
  });
});

describe("ORDER-02 Agents", () => {
  test(
    "agents from the act's family and earlier ones; one agent in order 1, two and one win in order 2; from order 3, UnneededAgents 1 to 2",
    () => {
      const actOf = new Map(families().map((f) => [f.name, f.act]));
      for (const o of orders()) {
        const acts = o.agents.map((a) => actOf.get(agent(a.name).family)!);
        expect(Math.max(...acts), `order ${o.n}`).toBeLessThanOrEqual(o.act);
        expect(acts, `order ${o.n}`).toContain(o.act);
        const fewest = Math.min(...wins(o).map((f) => new Set(Object.values(f.passes).flat()).size));
        const unneeded = o.agents.length - fewest;
        if (o.n <= 2) expect(unneeded, `order ${o.n}`).toBe(0);
        else {
          expect(unneeded, `order ${o.n}`).toBeGreaterThanOrEqual(1);
          expect(unneeded, `order ${o.n}`).toBeLessThanOrEqual(2);
        }
      }
      expect(order(1).agents.length).toBe(1);
      expect([order(2).agents.length, wins(order(2)).length]).toEqual([2, 1]);
    },
    SearchTimeout,
  );
});

describe("ORDER-04 Hand-written results", () => {
  test(
    "every hand-written result can lead a report: the search gives a wiring whose run gives its item ending and whose report is led by it",
    () => {
      for (const o of orders()) {
        expect(o.results.length, `order ${o.n}`).toBe(3);
        o.results.forEach((r, index) => {
          const at = `order ${o.n}: ${r.text}`;
          const w = wiringFor(o, r.ending, { index, of: (t) => report(o, t).handWritten });
          expect(w, at).not.toBeNull();
          const t = run(o, w!);
          const it = t.items.find((i) => i.place === r.ending.item && i.copy === r.ending.copy)!;
          expect(sameEnding(endingOf(it), r.ending), at).toBe(true);
          const rep = report(o, t);
          expect(rep.handWritten, at).toBe(index);
          expect(rep.lead, at).toBe(r.text);
        });
      }
    },
    SearchTimeout,
  );
});

describe("ORDER-05 Second wirings", () => {
  // Two wins count as different when some item passes other agents, unless only numbered twins changed places at the same wires and time.
  const differ = (a: Found, b: Found) => {
    const ids = Object.keys(a.passes);
    const same = (strip: (s: string) => string) => ids.every((id) => (a.passes[id] ?? []).map(strip).join() === (b.passes[id] ?? []).map(strip).join());
    if (same((s) => s)) return false;
    return !(same(stripTwins) && a.wireCount === b.wireCount && a.time === b.time);
  };

  test(
    "each order of three or more agents has two known wins that differ in the agents some item passes; Diplomatic pouch and Latin hour among them",
    () => {
      for (const o of orders().filter((x) => x.agents.length >= 3)) {
        const ws = wins(o);
        const pair = ws.some((a, i) => ws.slice(i + 1).some((b) => differ(a, b)));
        expect(pair, `order ${o.n}`).toBe(true);
      }
      expect(order(3).agents.length).toBeGreaterThanOrEqual(3);
      expect(order(6).agents.length).toBeGreaterThanOrEqual(3);
    },
    SearchTimeout,
  );

  test(
    "orders with both pars no one known wiring meets are the orders marked split, at least one per act",
    () => {
      const listed = scoreOrders().filter((o) => {
        const p = o.par as { wires: number | null; time: number | null };
        return p.wires !== null && p.time !== null && !wins(o).some((f) => f.wireCount <= p.wires! && f.time <= p.time!);
      });
      const split = scoreOrders().filter((o) => o.par.kind === "score" && o.par.split);
      expect(listed.map((o) => o.n)).toEqual(split.map((o) => o.n));
      for (let act = 1; act <= 6; act++) expect(listed.some((o) => o.act === act), `act ${act}`).toBe(true);
    },
    SearchTimeout,
  );
});

describe("REPAIR-01 Faults", () => {
  test(
    "each repair order's opening wiring fails, sits MovePar moves from its fewest-move fixes, and one fix has a move that alone breaks an item the opening delivered",
    () => {
      for (const o of orders().filter((x) => x.repair)) {
        const opening = o.opening!;
        const t0 = run(o, opening);
        expect(t0.win, `order ${o.n}`).toBe(false);
        const f = fixes(o);
        expect(f, `order ${o.n}`).not.toBeNull();
        expect(f!.moves, `order ${o.n}`).toBe((o.par as { moves: number }).moves);
        const delivered = new Set(t0.items.filter((i) => i.matched).map((i) => i.id));
        for (const fix of f!.fixes) expect(moves(o, fix.wires), `order ${o.n}`).toBe(f!.moves);
        const breaks = f!.fixes.some((fix) => {
          const was = new Map(opening.map((w) => [w.from, w.to]));
          const changed = fix.wires.filter((w) => was.get(w.from) !== w.to);
          return changed.some((w) => {
            const alone = [...opening.filter((x) => x.from !== w.from), w];
            return run(o, alone).items.some((i) => delivered.has(i.id) && !i.matched);
          });
        });
        expect(breaks, `order ${o.n}`).toBe(true);
      }
    },
    SearchTimeout,
  );
});
