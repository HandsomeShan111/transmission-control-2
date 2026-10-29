// Achievements, the rules (ACHIEVE-01, ACHIEVE-02): three per act, earned once, never gating progress. Pure.
import { actOrders, hasSecondWiring } from "../../campaign/api";
import type { Progress } from "../../campaign/api";
import type { Best } from "../../par-and-score/api";
import type { PrintLine } from "../../../platform/pieces/printout";
import type { RepairBest } from "../../repair-orders/api";
import type { AchievementData } from "../data/achievements.gen";
import { ACHIEVEMENTS } from "../data/achievements.gen";

export type { AchievementData };

/** The kinds, in kind order (ACHIEVE-01). */
export const KINDS = ["results", "second wirings", "par"] as const;
export type Kind = (typeof KINDS)[number];

/** What the kinds read: results found, lamps lit, bests and pars met. */
export type Standing = {
  readonly progress: Progress;
  readonly found: (n: number) => readonly number[];
  readonly best: (n: number) => Best | null;
  readonly repairBest: (n: number) => RepairBest | null;
};

export function achievements(): readonly AchievementData[] {
  return ACHIEVEMENTS;
}

export function isAchievement(name: string): boolean {
  return ACHIEVEMENTS.some((a) => a.name === name);
}

/** An act's three, in kind order. */
export function actAchievements(act: number): AchievementData[] {
  return KINDS.map((k) => ACHIEVEMENTS.find((a) => a.act === act && a.kind === k)!).filter(Boolean);
}

/** A kind's progress in an act: what is met of how many (CAMPAIGN-04 progress lines). */
export function kindProgress(kind: Kind, act: number, s: Standing): { met: number; of: number } {
  const list = actOrders(act);
  if (kind === "results") {
    return { met: list.reduce((t, o) => t + s.found(o.n).filter((r) => r < o.results.length).length, 0), of: list.reduce((t, o) => t + o.results.length, 0) };
  }
  if (kind === "second wirings") {
    const counted = list.filter(hasSecondWiring);
    return { met: counted.filter((o) => s.progress.lamps[o.n] !== undefined).length, of: counted.length };
  }
  let met = 0;
  let of = 0;
  for (const o of list) {
    if (o.par.kind === "moves") {
      of++;
      if (s.repairBest(o.n)?.parMet) met++;
      continue;
    }
    const b = s.best(o.n);
    if (o.par.wires !== null) {
      of++;
      if (b?.wireMet) met++;
    }
    if (o.par.time !== null) {
      of++;
      if (b?.timeMet) met++;
    }
  }
  return { met, of };
}

/** ACHIEVE-01: a kind is met when all of it is. */
export function isMet(a: AchievementData, s: Standing): boolean {
  const p = kindProgress(a.kind, a.act, s);
  return p.of > 0 && p.met === p.of;
}

/** ACHIEVE-01: the achievements newly earned in these acts, in act order, each act's in kind order. */
export function newlyEarned(acts: readonly number[], earned: ReadonlySet<string>, s: Standing): AchievementData[] {
  return [...acts]
    .sort((a, b) => a - b)
    .flatMap((act) => actAchievements(act))
    .filter((a) => !earned.has(a.name) && isMet(a, s));
}

/** ACHIEVE-02: "COMMENDATION: <name>. <line>". */
export function commendationLine(a: AchievementData): PrintLine {
  return { text: `COMMENDATION: ${a.name}. ${a.line}` };
}

/** CAMPAIGN-04: "Results <found> of <results>", "Second wirings <done> of <orders>", "Pars <met> of <pars>". */
export function progressLine(kind: Kind, p: { met: number; of: number }): string {
  const label = kind === "results" ? "Results" : kind === "second wirings" ? "Second wirings" : "Pars";
  return `${label} ${p.met} of ${p.of}`;
}

/** CAMPAIGN-04: an act's three for its debrief: an earned one by its name, the rest as progress, as campaign.md quotes them. */
export function debriefAchievementLines(act: number, earned: ReadonlySet<string>, s: Standing): PrintLine[] {
  return actAchievements(act).map((a) => ({ text: earned.has(a.name) ? a.name : progressLine(a.kind, kindProgress(a.kind, a.act, s)) }));
}
