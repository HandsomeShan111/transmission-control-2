// Reads the design's data pages and writes the game's generated data files.
// Run: `bun run data`. Fails loudly on any line it cannot parse.
// Sources: design/docs/data.md and its parts, design/docs/build/wirings.md.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { numberTwins } from "../src/blocks/agents/api";

const root = resolve(import.meta.dir, "..");
const docs = join(root, "design/docs");

type Wire = { from: string; to: string };
type Required = { destination: string; kind: string; marks: string[] };
type Ending =
  | { item: number; copy: number; end: "at"; destination: string; kind: string; marks: string[] }
  | { item: number; copy: number; end: "stopped"; at: string; kind: string; marks: string[] }
  | { item: number; copy: number; end: "lost"; kind: string };

class ParseError extends Error {}

function fail(file: string, line: number, text: string, why: string): never {
  throw new ParseError(`${file}:${line}: ${why}\n  ${text}`);
}

type Line = { file: string; n: number; text: string };

function readLines(rel: string): Line[] {
  return readFileSync(join(docs, rel), "utf8")
    .split("\n")
    .map((text, i) => ({ file: `design/docs/${rel}`, n: i + 1, text }));
}

// The bullet lines after "Entries" of one "## <heading>" section.
function entries(lines: Line[], heading: string): Line[] {
  const start = lines.findIndex((l) => l.text === `## ${heading}`);
  if (start < 0) throw new ParseError(`data.md: no section "## ${heading}"`);
  const out: Line[] = [];
  let inEntries = false;
  for (const l of lines.slice(start + 1)) {
    if (l.text.startsWith("## ")) break;
    if (l.text.startsWith("Entries")) {
      inEntries = true;
      continue;
    }
    if (!inEntries || l.text.trim() === "") continue;
    if (!l.text.startsWith("- ")) fail(l.file, l.n, l.text, "expected an entry bullet");
    out.push(l);
  }
  if (out.length === 0) throw new ParseError(`data.md: section "${heading}" has no entries`);
  return out;
}

const dataLines = readLines("data.md");

// ---- Agent families ----
const families = entries(dataLines, "Agent families").map((l) => {
  const m = /^- ([A-Z]+): ([a-z ]+), act (\d)\. "(.+)"$/.exec(l.text);
  if (!m) fail(l.file, l.n, l.text, "not an agent family entry");
  return { name: m[1]!, silhouette: m[2]!, act: Number(m[3]), memo: m[4]! };
});
const familyNames = new Set(families.map((f) => f.name));

// ---- Item kinds ----
const kinds = entries(dataLines, "Item kinds").map((l) => {
  const m = /^- ([A-Z][a-z]+(?: [a-z]+)?): (paper|edible|metal|none)\.(?: (.+))?$/.exec(l.text);
  if (!m) fail(l.file, l.n, l.text, "not an item kind entry");
  return { name: m[1]!, attribute: m[2] === "none" ? null : m[2]!, note: m[3] ?? null };
});
const kindNames = new Set(kinds.map((k) => k.name));

// ---- Agents ----
type AgentOut = {
  name: string;
  family: string;
  role: "worker" | "checker" | "copier";
  rule: string;
  mark: string | null;
  toKind: string | null;
  test: { type: "attribute"; attribute: string } | { type: "mark"; agent: string } | { type: "count"; count: number } | { type: "asOrdered" } | null;
  verdictWords: [string, string] | null;
};
const agents: AgentOut[] = entries(dataLines, "Agents").map((l) => {
  let m = /^- ([A-Z]+): ([A-Z]+), (worker|copier)\. "([^"]+)" Mark: ([a-z]+)\. To kind: (.+)\.$/.exec(l.text);
  if (m) {
    const toKind = m[6] === "none" ? null : m[6]!;
    if (toKind !== null && toKind !== "first kind" && !kindNames.has(toKind)) fail(l.file, l.n, l.text, `unknown kind ${toKind}`);
    if (!familyNames.has(m[2]!)) fail(l.file, l.n, l.text, `unknown family ${m[2]}`);
    return { name: m[1]!, family: m[2]!, role: m[3] as "worker" | "copier", rule: m[4]!, mark: m[5]!, toKind, test: null, verdictWords: null };
  }
  m = /^- ([A-Z]+): ([A-Z]+), checker\. "([^"]+)" Test: (.+)\. Verdict words: "([^"]+)" "([^"]+)"$/.exec(l.text);
  if (!m) fail(l.file, l.n, l.text, "not an agent entry");
  if (!familyNames.has(m[2]!)) fail(l.file, l.n, l.text, `unknown family ${m[2]}`);
  const t = m[4]!;
  let test: AgentOut["test"];
  let tm: RegExpExecArray | null;
  if ((tm = /^attribute (paper|edible|metal)$/.exec(t))) test = { type: "attribute", attribute: tm[1]! };
  else if ((tm = /^mark ([A-Z]+)$/.exec(t))) test = { type: "mark", agent: tm[1]! };
  else if ((tm = /^count (\d+)$/.exec(t))) test = { type: "count", count: Number(tm[1]) };
  else if (t === "as ordered") test = { type: "asOrdered" };
  else fail(l.file, l.n, l.text, `unknown test "${t}"`);
  return { name: m[1]!, family: m[2]!, role: "checker", rule: m[3]!, mark: null, toKind: null, test, verdictWords: [m[5]!, m[6]!] };
});
const agentByName = new Map(agents.map((a) => [a.name, a]));
for (const a of agents) {
  if (a.test?.type === "mark" && !agentByName.get(a.test.agent)?.mark) throw new ParseError(`agent ${a.name}: test names ${a.test.agent}, which has no mark`);
}
const markNames = new Set(agents.flatMap((a) => (a.mark ? [a.mark] : [])));

// ---- Achievements ----
const achievements = entries(dataLines, "Achievements").map((l) => {
  const m = /^- ([A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*): act (\d), (results|second wirings|par)\. "(.+)"$/.exec(l.text);
  if (!m) fail(l.file, l.n, l.text, "not an achievement entry");
  return { name: m[1]!, act: Number(m[2]), kind: m[3]!, line: m[4]! };
});

// ---- Authored lines ----
const lines: { agent: string; kind: string; text: string }[] = [];
for (const rel of ["data-lines-acts-1-2.md", "data-lines-acts-3-4.md", "data-lines-acts-5-6.md"]) {
  let agent: string | null = null;
  let kindIndex = 0;
  for (const l of readLines(rel)) {
    const h = /^### ([A-Z]+)$/.exec(l.text);
    if (h) {
      if (agent !== null && kindIndex !== kinds.length) fail(l.file, l.n, l.text, `agent ${agent} has ${kindIndex} lines, not ${kinds.length}`);
      agent = h[1]!;
      if (!agentByName.has(agent)) fail(l.file, l.n, l.text, `unknown agent ${agent}`);
      kindIndex = 0;
      continue;
    }
    if (agent === null) {
      if (l.text.startsWith("- ")) fail(l.file, l.n, l.text, "line before any agent heading");
      continue;
    }
    if (l.text.trim() === "") continue;
    if (!l.text.startsWith("- ")) fail(l.file, l.n, l.text, "expected an authored-line bullet under an agent heading");
    const m = /^- ([A-Z][a-z]+(?: [a-z]+)?): (.+)$/.exec(l.text);
    if (!m) fail(l.file, l.n, l.text, "not an authored line");
    const expected = kinds[kindIndex]?.name;
    if (m[1] !== expected) fail(l.file, l.n, l.text, `expected the line for ${expected}, kinds in Item kinds order`);
    lines.push({ agent, kind: m[1]!, text: m[2]! });
    kindIndex++;
  }
  if (agent !== null && kindIndex !== kinds.length) throw new ParseError(`${rel}: agent ${agent} has ${kindIndex} lines, not ${kinds.length}`);
}

// ---- Orders ----
type AgentPlace = { name: string; label: string; col: number; lane: number; passLimit: number | null };
type OrderOut = {
  n: number;
  name: string;
  act: number;
  repair: boolean;
  text: string;
  agents: AgentPlace[];
  destinations: string[];
  batch: { kind: string; marks: string[]; required: Required; copies: { n: number; required: Required }[] }[];
  opening: Wire[] | null;
  results: { ending: Ending; text: string }[];
  par: { kind: "score"; wires: number | null; time: number | null; split: boolean } | { kind: "moves"; moves: number };
};

// Jack names, as the data writes them: output jacks "IN", "<agent>", "<agent> plus|minus|item|copy"; input ends "<agent>" or a destination.
function jackSets(agentsOf: AgentPlace[], destinations: string[]) {
  const from = new Set<string>(["IN"]);
  const to = new Set<string>(destinations);
  for (const a of agentsOf) {
    to.add(a.label);
    const role = agentByName.get(a.name)!.role;
    if (role === "worker") from.add(a.label);
    else if (role === "checker") (from.add(`${a.label} plus`), from.add(`${a.label} minus`));
    else (from.add(`${a.label} item`), from.add(`${a.label} copy`));
  }
  return { from, to };
}

function parseWires(text: string, sets: { from: Set<string>; to: Set<string> }, l: Line): Wire[] {
  const wires = text.split("; ").map((w) => {
    const m = /^(.+?) → (.+)$/.exec(w);
    if (!m) fail(l.file, l.n, l.text, `not a wire: "${w}"`);
    if (!sets.from.has(m[1]!)) fail(l.file, l.n, l.text, `not an output jack of this order: "${m[1]}"`);
    if (!sets.to.has(m[2]!)) fail(l.file, l.n, l.text, `not an input jack or destination of this order: "${m[2]}"`);
    return { from: m[1]!, to: m[2]! };
  });
  const froms = wires.map((w) => w.from);
  if (new Set(froms).size !== froms.length) fail(l.file, l.n, l.text, "two wires from one output jack (WIRE-03)");
  return wires;
}

function parseKindMarks(text: string, l: Line): { kind: string; marks: string[] } {
  const parts = text.split(", ");
  const kind = parts[0]!;
  if (!kindNames.has(kind)) fail(l.file, l.n, l.text, `unknown kind "${kind}"`);
  const rest = parts.slice(1);
  if (rest.length === 1 && rest[0] === "untouched") return { kind, marks: [] };
  if (rest.length === 0) fail(l.file, l.n, l.text, `no marks and no "untouched" after "${kind}"`);
  for (const mk of rest) if (!markNames.has(mk)) fail(l.file, l.n, l.text, `unknown mark "${mk}"`);
  return { kind, marks: rest };
}

const orders: OrderOut[] = [];
for (const rel of ["data-orders-acts-1-2.md", "data-orders-acts-3-4.md", "data-orders-acts-5-6.md"]) {
  const all = readLines(rel);
  const heads = all.flatMap((l, i) => (/^### \d+ /.test(l.text) ? [i] : []));
  if (heads.length === 0) throw new ParseError(`${rel}: no orders`);
  heads.forEach((hi, k) => {
    const head = all[hi]!;
    const hm = /^### (\d+) (.+)$/.exec(head.text)!;
    const body = all.slice(hi + 1, heads[k + 1] ?? all.length).filter((l) => l.text.trim() !== "" && !l.text.startsWith("## "));
    const fields = new Map<string, { line: Line; nested: Line[] }>();
    let last: string | null = null;
    for (const l of body) {
      if (l.text.startsWith("  - ")) {
        if (last === null) fail(l.file, l.n, l.text, "nested bullet before any field");
        fields.get(last)!.nested.push(l);
        continue;
      }
      const fm = /^- ([a-z]+):/.exec(l.text);
      if (!fm) fail(l.file, l.n, l.text, "not a field bullet");
      if (fields.has(fm[1]!)) fail(l.file, l.n, l.text, `field ${fm[1]} given twice`);
      fields.set(fm[1]!, { line: l, nested: [] });
      last = fm[1]!;
    }
    const field = (name: string) => {
      const f = fields.get(name);
      if (!f) fail(head.file, head.n, head.text, `order has no field "${name}"`);
      return f;
    };
    const known = ["act", "text", "agents", "destinations", "batch", "opening", "results", "par"];
    for (const [name, f] of fields) if (!known.includes(name)) fail(f.line.file, f.line.n, f.line.text, `unknown field "${name}"`);

    const actL = field("act").line;
    const am = /^- act: (\d)\. repair: (yes|no)\.$/.exec(actL.text);
    if (!am) fail(actL.file, actL.n, actL.text, "not an act and repair field");

    const textL = field("text").line;
    const tm = /^- text: "(.+)"$/.exec(textL.text);
    if (!tm) fail(textL.file, textL.n, textL.text, "not a text field");

    const agL = field("agents").line;
    const agm = /^- agents: (.+)\.$/.exec(agL.text);
    if (!agm) fail(agL.file, agL.n, agL.text, "not an agents field");
    const places = agm[1]!.split("; ").map((s) => {
      const m = /^([A-Z]+) at (\d+)\/(\d+)(?:, pass limit (\d+))?$/.exec(s);
      if (!m) fail(agL.file, agL.n, agL.text, `not an agent place: "${s}"`);
      const def = agentByName.get(m[1]!);
      if (!def) fail(agL.file, agL.n, agL.text, `unknown agent ${m[1]}`);
      if ((def.role === "checker") !== (m[4] !== undefined)) fail(agL.file, agL.n, agL.text, `${m[1]}: a pass limit is given for checking agents only, and always`);
      return { name: m[1]!, col: Number(m[2]), lane: Number(m[3]), passLimit: m[4] === undefined ? null : Number(m[4]) };
    });
    const cells = places.map((p) => `${p.col}/${p.lane}`);
    if (new Set(cells).size !== cells.length) fail(agL.file, agL.n, agL.text, "two agents in one place");
    const names = numberTwins(places);
    const agentsOf: AgentPlace[] = places.map((p, i) => ({ name: p.name, label: names[i]!, col: p.col, lane: p.lane, passLimit: p.passLimit }));
    const agentLabels = new Set(agentsOf.map((a) => a.label));

    const dL = field("destinations").line;
    const dm = /^- destinations: (.+)\.$/.exec(dL.text);
    if (!dm) fail(dL.file, dL.n, dL.text, "not a destinations field");
    const destinations = dm[1]!.split("; ");
    const destSet = new Set(destinations);
    const sets = jackSets(agentsOf, destinations);

    const bF = field("batch");
    if (bF.line.text !== "- batch:") fail(bF.line.file, bF.line.n, bF.line.text, "not a batch field");
    const batch: OrderOut["batch"] = [];
    const requiredOf = (dest: string, km: string, l: Line): Required => {
      if (!destSet.has(dest)) fail(l.file, l.n, l.text, `unknown destination "${dest}"`);
      const { kind, marks } = parseKindMarks(km, l);
      return { destination: dest, kind, marks };
    };
    for (const l of bF.nested) {
      const t = l.text.slice(4);
      const cm = /^copy (\d+) → (.+?): (.+)$/.exec(t);
      if (cm) {
        const item = batch[batch.length - 1];
        if (!item) fail(l.file, l.n, l.text, "a copy before any item");
        const n = Number(cm[1]);
        if (n !== item.copies.length + 1) fail(l.file, l.n, l.text, `copy ${n} out of order`);
        item.copies.push({ n, required: requiredOf(cm[2]!, cm[3]!, l) });
        continue;
      }
      const im = /^([A-Z][a-z]+(?: [a-z]+)?)(?: \[([a-z, ]+)\])? → (.+?): (.+)$/.exec(t);
      if (!im) fail(l.file, l.n, l.text, "not a batch item");
      if (!kindNames.has(im[1]!)) fail(l.file, l.n, l.text, `unknown kind "${im[1]}"`);
      const marks = im[2] ? im[2].split(", ") : [];
      for (const mk of marks) if (!markNames.has(mk)) fail(l.file, l.n, l.text, `unknown mark "${mk}"`);
      batch.push({ kind: im[1]!, marks, required: requiredOf(im[3]!, im[4]!, l), copies: [] });
    }
    if (batch.length === 0) fail(bF.line.file, bF.line.n, bF.line.text, "empty batch");

    const oL = field("opening").line;
    const om = /^- opening: (.+)\.$/.exec(oL.text);
    if (!om) fail(oL.file, oL.n, oL.text, "not an opening field");
    const opening = om[1] === "none" ? null : parseWires(om[1]!, sets, oL);

    const rF = field("results");
    if (rF.line.text !== "- results:") fail(rF.line.file, rF.line.n, rF.line.text, "not a results field");
    const results = rF.nested.map((l) => {
      const m = /^ {2}- (.+?)\. "(.+)"$/.exec(l.text);
      if (!m) fail(l.file, l.n, l.text, "not a hand-written result");
      const e = m[1]!;
      let ending: Ending;
      let em: RegExpExecArray | null;
      const ref = (item: string, copy: string | undefined) => {
        const i = Number(item);
        const c = copy === undefined ? 0 : Number(copy);
        const b = batch[i - 1];
        if (!b) fail(l.file, l.n, l.text, `no batch item ${i}`);
        if (c > b.copies.length) fail(l.file, l.n, l.text, `item ${i} has no named copy ${c}`);
        return { item: i, copy: c };
      };
      if ((em = /^(\d+)(?: copy (\d+))? at (.+?): (.+)$/.exec(e))) {
        if (!destSet.has(em[3]!)) fail(l.file, l.n, l.text, `unknown destination "${em[3]}"`);
        ending = { ...ref(em[1]!, em[2]), end: "at", destination: em[3]!, ...parseKindMarks(em[4]!, l) };
      } else if ((em = /^(\d+)(?: copy (\d+))? stopped at (.+?): (.+)$/.exec(e))) {
        if (em[3] !== "IN" && !agentLabels.has(em[3]!)) fail(l.file, l.n, l.text, `unknown agent "${em[3]}"`);
        ending = { ...ref(em[1]!, em[2]), end: "stopped", at: em[3]!, ...parseKindMarks(em[4]!, l) };
      } else if ((em = /^(\d+)(?: copy (\d+))? lost: (.+)$/.exec(e))) {
        if (!kindNames.has(em[3]!)) fail(l.file, l.n, l.text, `unknown kind "${em[3]}"`);
        ending = { ...ref(em[1]!, em[2]), end: "lost", kind: em[3]! };
      } else fail(l.file, l.n, l.text, "not an item ending");
      return { ending, text: m[2]! };
    });

    const pL = field("par").line;
    let par: OrderOut["par"];
    let pm: RegExpExecArray | null;
    const repair = am[2] === "yes";
    if ((pm = /^- par: wires (none|\d+), time (none|\d+)(, split)?\.$/.exec(pL.text))) {
      if (repair) fail(pL.file, pL.n, pL.text, "a repair order's par is its moves");
      par = { kind: "score", wires: pm[1] === "none" ? null : Number(pm[1]), time: pm[2] === "none" ? null : Number(pm[2]), split: pm[3] !== undefined };
    } else if ((pm = /^- par: moves (\d+)\.$/.exec(pL.text))) {
      if (!repair) fail(pL.file, pL.n, pL.text, "only a repair order has a moves par");
      par = { kind: "moves", moves: Number(pm[1]) };
    } else fail(pL.file, pL.n, pL.text, "not a par field");
    if (repair && opening === null) fail(oL.file, oL.n, oL.text, "a repair order opens wired");

    orders.push({ n: Number(hm[1]), name: hm[2]!, act: Number(am[1]), repair, text: tm[1]!, agents: agentsOf, destinations, batch, opening, results, par });
  });
}
orders.forEach((o, i) => {
  if (o.n !== i + 1) throw new ParseError(`orders out of sequence: order ${o.n} at place ${i + 1}`);
});
const orderByN = new Map(orders.map((o) => [o.n, o]));

// ---- Test wirings ----
type TestWiring = { label: "plain" | "wirePar" | "timePar" | "bothPars" | "second" | "fix"; note: string | null; wires: Wire[] };
const testWirings: { order: number; wirings: TestWiring[] }[] = [];
for (const l of readLines("build/wirings.md")) {
  if (!l.text.startsWith("- **")) continue;
  const m = /^- \*\*(\d+) (.+?)\*\*: (.+)\.$/.exec(l.text);
  if (!m) fail(l.file, l.n, l.text, "not a test wiring line");
  const o = orderByN.get(Number(m[1]));
  if (!o || o.name !== m[2]) fail(l.file, l.n, l.text, `no order "${m[1]} ${m[2]}"`);
  const sets = jackSets(o.agents, o.destinations);
  const wirings = m[3]!.split(/\. (?=[A-Z])/).map((seg): TestWiring => {
    const sm = /^([^→]+?): (.+)$/.exec(seg);
    if (!sm) return { label: "plain", note: null, wires: parseWires(seg, sets, l) };
    const lab = sm[1]!;
    const wires = parseWires(sm[2]!, sets, l);
    if (/^meets WirePar$/i.test(lab)) return { label: "wirePar", note: null, wires };
    if (/^meets TimePar$/i.test(lab)) return { label: "timePar", note: null, wires };
    if (/^meets both pars$/i.test(lab)) return { label: "bothPars", note: null, wires };
    if (lab === "fix") return { label: "fix", note: null, wires };
    const sec = /^A second wiring that counts as different, (.+)$/.exec(lab);
    if (sec) return { label: "second", note: sec[1]!, wires };
    fail(l.file, l.n, l.text, `unknown wiring label "${lab}"`);
  });
  if (o.repair !== wirings.every((w) => w.label === "fix")) fail(l.file, l.n, l.text, "a repair order's line gives its fix, and only it");
  testWirings.push({ order: o.n, wirings });
}
if (testWirings.length !== orders.length) throw new ParseError(`build/wirings.md: ${testWirings.length} lines for ${orders.length} orders`);

// ---- Write ----
function file(source: string, body: string): string {
  return `// Generated by scripts/extract-data.ts from ${source}. Do not edit: change the design page, then run \`bun run data\`.\n${body}`;
}
const json = (v: unknown) => JSON.stringify(v, null, 2);

export const outputs: Record<string, string> = {
  "src/blocks/orders/data/orders.gen.ts": file(
    "design/docs/data-orders-acts-1-2.md, -3-4.md, -5-6.md",
    `import type { Order } from "../api";\n\nexport const ORDERS: readonly Order[] = ${json(orders)};\n`,
  ),
  "src/blocks/agents/data/agents.gen.ts": file(
    "design/docs/data.md (Agent families, Agents)",
    `import type { AgentData, FamilyData } from "../api";\n\nexport const FAMILIES: readonly FamilyData[] = ${json(families)};\n\nexport const AGENTS: readonly AgentData[] = ${json(agents)};\n`,
  ),
  "src/blocks/items/data/kinds.gen.ts": file(
    "design/docs/data.md (Item kinds)",
    `import type { KindData } from "../api";\n\nexport const KINDS: readonly KindData[] = ${json(kinds)};\n`,
  ),
  "src/blocks/reports/data/lines.gen.ts": file(
    "design/docs/data-lines-acts-1-2.md, -3-4.md, -5-6.md",
    `import type { AuthoredLine } from "../api";\n\nexport const LINES: readonly AuthoredLine[] = ${json(lines)};\n`,
  ),
  "src/blocks/achievements/data/achievements.gen.ts": file(
    "design/docs/data.md (Achievements)",
    `export type AchievementData = {\n  readonly name: string;\n  readonly act: number;\n  readonly kind: "results" | "second wirings" | "par";\n  readonly line: string;\n};\n\nexport const ACHIEVEMENTS: readonly AchievementData[] = ${json(achievements)};\n`,
  ),
  "src/testbuild/wirings.gen.ts": file(
    "design/docs/build/wirings.md",
    `import type { Wire } from "../blocks/wires/api";\n\n/** One line of Test wirings: its wirings in the page's order. plain: the line's one wiring; wirePar, timePar, bothPars: meets that par; second: a second wiring that counts as different; fix: a repair order's fewest-move fix, the whole board. */\nexport type TestWiring = {\n  readonly label: "plain" | "wirePar" | "timePar" | "bothPars" | "second" | "fix";\n  readonly note: string | null;\n  readonly wires: readonly Wire[];\n};\n\nexport const TEST_WIRINGS: readonly { readonly order: number; readonly wirings: readonly TestWiring[] }[] = ${json(testWirings)};\n`,
  ),
};

if (import.meta.main) {
  for (const [rel, text] of Object.entries(outputs)) writeFileSync(join(root, rel), text);
  console.log(
    `data: ${orders.length} orders, ${families.length} families, ${agents.length} agents, ${kinds.length} kinds, ${lines.length} lines, ${achievements.length} achievements, ${testWirings.length} test wiring lines`,
  );
}
