import type { Item } from "../../items/api";
import { addMark, changeKind, copyItem, kind, markNames, marksEqual } from "../../items/api";
import type { AgentData, Applied, FamilyData, Lamp, NextCopy, OutJackKind, PlacedAgent, Role } from "../api";
import { AGENTS, FAMILIES } from "../data/agents.gen";

const byName = new Map(AGENTS.map((a) => [a.name, a]));
const familyByName = new Map(FAMILIES.map((f) => [f.name, f]));

export function agents(): readonly AgentData[] {
  return AGENTS;
}

export function agent(name: string): AgentData {
  const a = byName.get(name);
  if (!a) throw new Error(`no agent "${name}"`);
  return a;
}

export function families(): readonly FamilyData[] {
  return FAMILIES;
}

export function family(name: string): FamilyData {
  const f = familyByName.get(name);
  if (!f) throw new Error(`no agent family "${name}"`);
  return f;
}

/** AGENT-01: the output jacks of a role, in face order. Every agent also has one input jack. */
export function outJacks(role: Role): readonly OutJackKind[] {
  if (role === "worker") return ["out"];
  if (role === "checker") return ["plus", "minus"];
  return ["item", "copy"];
}

/** AGENT-01: two or more of one agent in an order: each name gets a number from 1, in column order, then lane order. */
export function numberTwins(places: readonly { readonly name: string; readonly col: number; readonly lane: number }[]): string[] {
  return places.map((p) => {
    const twins = places.filter((q) => q.name === p.name);
    if (twins.length < 2) return p.name;
    const sorted = [...twins].sort((a, b) => a.col - b.col || a.lane - b.lane);
    return `${p.name} ${sorted.indexOf(p) + 1}`;
  });
}

function verdict(def: AgentData, item: Item): boolean {
  const t = def.test;
  if (!t) throw new Error(`${def.name} is no checking agent`);
  switch (t.type) {
    case "attribute":
      return kind(item.kind).attribute === t.attribute;
    case "mark": {
      const mark = agent(t.agent).mark;
      return item.marks.some((m) => m.name === mark);
    }
    case "count":
      return item.marks.length >= t.count;
    case "asOrdered":
      // data.md: kind and marks equal the required output's, destination aside; no required output → minus.
      return item.required !== null && item.kind === item.required.kind && marksEqual(markNames(item.marks), item.required.marks);
  }
}

/** AGENT-02 to AGENT-05: what `placed` does to `item`, the first at its input jack. `next`: the copy a copier makes. */
export function apply(placed: PlacedAgent, item: Item, next?: NextCopy): Applied {
  const def = agent(placed.name);
  if (def.role === "checker") {
    const limit = placed.passLimit;
    if (limit === null) throw new Error(`${placed.label} has no pass limit`);
    const done = item.checks[placed.label] ?? 0;
    if (done >= limit) return { action: "reject", item: { ...item, rejectedBy: placed.label }, checks: done };
    const count = done + 1;
    const checked = { ...item, checks: { ...item.checks, [placed.label]: count } };
    const v = verdict(def, item) ? "plus" : "minus";
    return { action: "check", item: checked, verdict: v, count, jack: v };
  }
  const mark = def.mark!;
  const marked = addMark(item, mark, placed.label);
  if (def.role === "copier") {
    if (!next) throw new Error(`${placed.label} copies: the next copy number is needed`);
    return { action: "copy", item: marked, copy: copyItem(marked, next.copy, next.required), mark };
  }
  const to = def.toKind === null ? item.kind : def.toKind === "first kind" ? item.first : def.toKind;
  const worked = changeKind(marked, to);
  return { action: "work", item: worked, mark, kindFrom: item.kind, kindTo: worked.kind, jack: "out" };
}

/** A lamp after one beat (AGENT-02, AGENT-03, AGENT-05, AGENT-06): what the agent did this beat, if anything. */
export function lampAfter(role: Role, before: Lamp, did: Applied | null): Lamp {
  if (role !== "checker") return did === null ? "off" : "steady";
  if (did?.action === "check") return did.verdict;
  if (did?.action === "reject") return "minus";
  return before;
}
