// Agents, switched off: no agents; every agent rejects what reaches it.
import type * as Api from "./api";

export const agents: typeof Api.agents = () => [];
export const agent: typeof Api.agent = (name) => ({ name, family: "", role: "worker", rule: "", mark: null, toKind: null, test: null, verdictWords: null });
export const families: typeof Api.families = () => [];
export const family: typeof Api.family = (name) => ({ name, silhouette: "", act: 1, memo: "" });
export const outJacks: typeof Api.outJacks = () => [];
export const numberTwins: typeof Api.numberTwins = (places) => places.map((p) => p.name);
export const apply: typeof Api.apply = (placed, item) => ({ action: "reject", item: { ...item, rejectedBy: placed.label }, checks: 0 });
export const lampAfter: typeof Api.lampAfter = () => "off";
