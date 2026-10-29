// Run, switched off: the run starts and ends at once; every item stays at the input terminal and nothing wins.
import type * as Api from "./api";

export const run: typeof Api.run = (order, wires) => {
  const items = order.batch.map((b, i) => ({
    id: `${i + 1}`,
    place: i + 1,
    copy: 0,
    copiedFrom: null,
    first: b.kind,
    kind: b.kind,
    marks: b.marks.map((name) => ({ name, by: null })),
    required: b.required,
    checks: {},
    rejectedBy: null,
    end: { type: "stopped" as const, jack: "IN", agent: null },
    endBeat: 0,
    matched: false,
    path: [],
  }));
  return { order: order.n, wires, wireCount: wires.length, start: null, beats: [], items, copiesMissing: [], win: false, time: 0 };
};

export const endingOf: typeof Api.endingOf = (t) => ({ item: t.place, copy: t.copy, end: "lost", kind: t.kind });
