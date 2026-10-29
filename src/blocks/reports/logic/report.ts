import { agent } from "../../agents/api";
import type { Order } from "../../orders/api";
import { sameEnding } from "../../orders/api";
import { score, scoreLines } from "../../par-and-score/api";
import type { Trace, TraceItem } from "../../run/api";
import { endingOf } from "../../run/api";
import type { CutBlock, ItemBlock, Report, ReportSlots } from "../api";
import { ITEM_BLOCKS_MAX, ITEM_LINES_MAX } from "../api";
import { LINES } from "../data/lines.gen";

const lineOf = new Map(LINES.map((l) => [`${l.agent}|${l.kind}`, l.text]));

/** Kind names inside a sentence print in lower case, as authored lines write them (REPORT-02). */
const lower = (kind: string) => kind.toLowerCase();

/** REPORT-02: the authored line of agent `name` for an item of kind `kind`; `{first}` prints "the" and the first kind. */
export function authoredLine(name: string, kind: string, first: string): string {
  const text = lineOf.get(`${name}|${kind}`);
  if (text === undefined) throw new Error(`no authored line for ${name} and ${kind}`);
  return text.replaceAll("{first}", `the ${lower(first)}`);
}

/** "A", "A and B", "A, B and C" (REPORT-02 cut lines). */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const through = (names: readonly string[]) => `through ${names.length ? joinNames(names) : "no agent"}`;

function unique(names: readonly (string | null)[]): string[] {
  const out: string[] = [];
  for (const n of names) if (n !== null && !out.includes(n)) out.push(n);
  return out;
}

/** REPORT-03: "<destination> received: <kind>, <marks>." Marks joined by commas, the last after "then"; none: "untouched". */
export function resultLine(it: TraceItem): string | null {
  if (it.end.type !== "arrived") return null;
  const m = it.marks.map((x) => x.name);
  const marks = m.length === 0 ? "untouched" : m.length === 1 ? m[0]! : `${m.slice(0, -1).join(", ")}, then ${m[m.length - 1]}`;
  return `${it.end.destination} received: ${it.kind}, ${marks}.`;
}

/** REPORT-05: where an item that failed at an output terminal first went wrong; null when it has none. */
export function firstDifference(it: TraceItem): string | null {
  const r = it.required;
  if (it.end.type !== "arrived" || !r || it.matched) return null;
  const im = it.marks;
  const rm = r.marks;
  const by = (i: number) => (im[i]!.by === null ? "from the start" : `by ${im[i]!.by}`);
  for (let i = 0; i < Math.min(im.length, rm.length); i++) {
    if (im[i]!.name !== rm[i]) return `First difference: mark ${i + 1}, ${im[i]!.name} ${by(i)}; required ${rm[i]}.`;
  }
  if (im.length > rm.length) return `First difference: mark ${rm.length + 1}, ${im[rm.length]!.name} ${by(rm.length)}, not ordered.`;
  if (im.length < rm.length) return `First difference: mark ${im.length + 1} missing; required ${rm[im.length]}.`;
  if (it.end.destination !== r.destination) return `First difference: delivered to ${it.end.destination}; required ${r.destination}.`;
  if (it.rejectedBy !== null) return "First difference: none in kind or marks; the item was rejected.";
  // REPORT-05, derived: a kind never differs alone, so nothing else is left.
  return null;
}

type Leave = { result: boolean; difference: boolean };

function endParts(order: Order, it: TraceItem, leave: Leave): string[] {
  const k = lower(it.kind);
  const result = leave.result ? null : resultLine(it);
  const diff = leave.difference ? null : firstDifference(it);
  const keep = (xs: (string | null)[]) => xs.filter((x): x is string => x !== null);
  if (it.rejectedBy !== null) {
    const n = order.agents.find((a) => a.label === it.rejectedBy)!.passLimit!;
    const s = `${it.rejectedBy} rejected the ${k} after ${n} ${n === 1 ? "check" : "checks"}.`;
    return it.required ? keep([s, result, diff]) : [s, `Nobody ordered this ${k}.`];
  }
  if (!it.required) return keep([result, `Nobody ordered this ${k}.`]);
  if (it.matched && it.end.type === "arrived") return [`Delivered to ${it.end.destination} as ordered.`];
  switch (it.end.type) {
    case "arrived":
      return keep([result, diff]);
    case "stopped":
      // At a line's start, the input terminal is written "The input terminal".
      return [`${it.end.agent ?? "The input terminal"} holds the ${k}: no wire.`];
    case "lost":
      return ["Still in the wiring when the run ended."];
    case "rejected":
      throw new Error("a rejected item has rejectedBy");
  }
}

/** REPORT-02, item 3: an item's end line. */
export function endLine(order: Order, it: TraceItem): string {
  return endParts(order, it, { result: false, difference: false }).join(" ");
}

type PathLine = { text: string; agent: string | null };

/** REPORT-02, item 2: authored lines in order, then repeats collapsed, then a cut over ItemLinesMax. */
function pathLines(it: TraceItem): string[] {
  const raw: PathLine[] = it.path.map((s) => {
    let text = authoredLine(s.name, s.kind, it.first);
    // AGENT-01: a numbered twin's number prints wherever the name does; every authored line opens with its agent's name.
    if (s.agent !== s.name) text = s.agent + text.slice(s.name.length);
    if (s.verdict) text += ` ${agent(s.name).verdictWords![s.verdict === "plus" ? 0 : 1]}`;
    return { text, agent: s.agent };
  });
  // Repeats as printed collapse; where two could, the one that starts first, and from one start the shorter (REPORT-02).
  const out: PathLine[] = [];
  let i = 0;
  while (i < raw.length) {
    let done = false;
    for (let len = 1; len <= Math.floor((raw.length - i) / 2) && !done; len++) {
      const same = (a: number, b: number) => raw.slice(a, a + len).every((l, j) => l.text === raw[b + j]!.text);
      let k = 1;
      while (i + (k + 1) * len <= raw.length && same(i, i + k * len)) k++;
      if (k < 2) continue;
      if (len === 1) out.push({ text: `${raw[i]!.text} ×${k}`, agent: raw[i]!.agent });
      else out.push(...raw.slice(i, i + len), { text: `Last ${len} lines ×${k}.`, agent: null });
      i += k * len;
      done = true;
    }
    if (!done) out.push(raw[i++]!);
  }
  if (out.length <= ITEM_LINES_MAX) return out.map((l) => l.text);
  const keep = ITEM_LINES_MAX - 2;
  const hidden = out.slice(keep, -1);
  return [...out.slice(0, keep).map((l) => l.text), `${hidden.length} more lines, ${through(unique(hidden.map((l) => l.agent)))}.`, out[out.length - 1]!.text];
}

function block(order: Order, it: TraceItem, leave: Leave): ItemBlock {
  const parts = endParts(order, it, leave);
  return {
    item: it.id,
    heading: it.copy === 0 ? it.first : `${it.first}, copy ${it.copy}`,
    path: pathLines(it),
    end: parts.length ? parts.join(" ") : null,
  };
}

/** REPORT-01, REPORT-02, REPORT-06: the report of one run. */
export function report(order: Order, trace: Trace, slots: ReportSlots = {}): Report {
  const items = trace.items;
  const none: Leave = { result: false, difference: false };
  let lead = "";
  let leadItem: TraceItem | null = null;
  let handWritten: number | null = null;
  let second: string | null = null;
  let sl: string[] = [];
  let shown: readonly TraceItem[] = items;
  let leaveFor: Leave = none;

  if (trace.win) {
    lead = `${order.name}: delivered as ordered.`;
    if (order.par.kind === "score") sl = scoreLines(score(order, trace)!);
    else if (slots.movesLine !== undefined) sl = [slots.movesLine];
  } else {
    const failing = items.find((i) => !i.matched);
    // RUN-08's guard: every named copy is made wherever every item matches, in the order data.
    if (!failing) throw new Error(`order ${order.n}: a failed run with every item matched`);
    const candidates = order.results
      .map((r, index) => ({ r, index }))
      .filter(({ r }) => !order.repair || (r.ending.item === failing.place && r.ending.copy === failing.copy));
    for (const { r, index } of candidates) {
      const it = items.find((i) => i.place === r.ending.item && i.copy === r.ending.copy);
      if (it && sameEnding(endingOf(it), r.ending)) {
        lead = r.text;
        leadItem = it;
        handWritten = index;
        break;
      }
    }
    if (handWritten === null) {
      leadItem = failing;
      const rl = resultLine(failing);
      lead = rl ?? endLine(order, failing);
    }
    second = firstDifference(leadItem!);
    leaveFor = { result: handWritten === null && resultLine(leadItem!) !== null, difference: second !== null };
    if (order.repair) shown = [failing];
  }

  let blocks: (ItemBlock | CutBlock)[] = shown.map((it) => block(order, it, it === leadItem ? leaveFor : none));
  if (blocks.length > ITEM_BLOCKS_MAX) {
    const keep = ITEM_BLOCKS_MAX - 2;
    const hidden = shown.slice(keep, -1);
    const names = unique(hidden.flatMap((it) => it.path.map((s) => s.agent)));
    blocks = [...blocks.slice(0, keep), { cut: `${hidden.length} more items, ${through(names)}.` }, blocks[blocks.length - 1]!];
  }

  const lines = [lead, ...(second ? [second] : []), ...sl];
  for (const b of blocks) {
    if ("cut" in b) lines.push(b.cut);
    else lines.push(b.heading, ...b.path, ...(b.end ? [b.end] : []));
  }
  return {
    order: order.n,
    form: trace.win ? "mission" : "incident",
    lead: lead,
    leadItem: leadItem?.id ?? null,
    handWritten,
    second,
    scoreLines: sl,
    blocks,
    lines,
  };
}
