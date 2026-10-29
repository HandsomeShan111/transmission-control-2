// Par and score, switched off: no score, no lines, no lamps.
import type * as Api from "./api";

export const score: typeof Api.score = () => null;
export const scoreLine: typeof Api.scoreLine = () => "";
export const scoreLines: typeof Api.scoreLines = () => [];
export const keepBest: typeof Api.keepBest = (prev, s) => prev ?? { wires: s.wires, time: s.time, wireMet: false, timeMet: false };
export const parLamps: typeof Api.parLamps = () => ({ wire: "none", time: "none" });
