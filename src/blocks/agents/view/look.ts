// How an agent's mark looks on a tile (ART-11): its code, and the tile shape of the act its family belongs to.
import { markCode, markCodeMetrics, tileShapeForAct, type CodeMetrics, type TileShape } from "../../../platform/pieces";
import { agents, family } from "../logic/agents";

let shapes: Map<string, TileShape> | null = null;

export function markLook(mark: string): { code: string; shape: TileShape } {
  shapes ??= new Map(agents().flatMap((a) => (a.mark ? [[a.mark, tileShapeForAct(family(a.family).act)] as const] : [])));
  const shape = shapes.get(mark);
  if (!shape) throw new Error(`no agent adds the mark "${mark}"`);
  return { code: markCode(mark), shape };
}

let metrics: CodeMetrics | null = null;

/** One code size for every mark code on the page (ART-11), measured once. */
export function markMetrics(): CodeMetrics {
  metrics ??= markCodeMetrics([...new Set(agents().flatMap((a) => (a.mark ? [markCode(a.mark)] : [])))]);
  return metrics;
}
