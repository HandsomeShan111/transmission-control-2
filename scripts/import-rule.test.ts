// Architecture rule: a block imports only the api.ts of blocks it lists in
// block.json, in its own layer or below; platform never imports a block.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const blocksDir = join(root, "src/blocks");

type Manifest = { name: string; layer: number; uses: string[] };

const manifests = new Map<string, Manifest>();
for (const name of readdirSync(blocksDir)) {
  const m = JSON.parse(readFileSync(join(blocksDir, name, "block.json"), "utf8")) as Manifest;
  manifests.set(name, m);
}

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tsFiles(p);
    return /\.tsx?$/.test(f) ? [p] : [];
  });
}

/** The relative module paths a source imports or re-exports: `import … from`, `export … from`, a bare `import "x"`, and `import("x")`. */
function importsIn(src: string): string[] {
  return [...src.matchAll(/^\s*(?:import|export)\b[^;'"]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/gm)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? "")
    .filter((s) => s.startsWith("."));
}

const imports = (file: string) => importsIn(readFileSync(file, "utf8"));

const inside = (dir: string, path: string) => !relative(dir, path).startsWith("..");

function blockOf(path: string): string | null {
  const rel = relative(blocksDir, path);
  return rel.startsWith("..") ? null : (rel.split("/")[0] ?? null);
}

test("every block manifest names known blocks in its layer or below", () => {
  for (const m of manifests.values()) {
    for (const u of m.uses) {
      const other = manifests.get(u);
      expect(other, `${m.name} uses unknown block ${u}`).toBeDefined();
      expect(other!.layer, `${m.name} (layer ${m.layer}) uses ${u} (layer ${other!.layer})`).toBeLessThanOrEqual(m.layer);
    }
  }
});

test("block dependencies have no cycle", () => {
  const state = new Map<string, "open" | "done">();
  const cycles: string[] = [];
  const visit = (name: string, path: string[]) => {
    if (state.get(name) === "done") return;
    if (state.get(name) === "open") {
      cycles.push([...path, name].join(" -> "));
      return;
    }
    state.set(name, "open");
    for (const u of manifests.get(name)?.uses ?? []) visit(u, [...path, name]);
    state.set(name, "done");
  };
  for (const name of manifests.keys()) visit(name, []);
  expect(cycles).toEqual([]);
});

test("blocks import only listed blocks' api.ts", () => {
  const bad: string[] = [];
  for (const file of tsFiles(blocksDir)) {
    const from = blockOf(file)!;
    for (const spec of imports(file)) {
      const target = resolve(dirname(file), spec);
      const to = blockOf(target);
      if (!to || to === from) continue;
      const m = manifests.get(from)!;
      const isApi = /\/api(\.ts)?$/.test(target);
      const isTestStub = file.includes("/tests/") && /\/stub(\.ts)?$/.test(target);
      if (!m.uses.includes(to) || !(isApi || isTestStub)) bad.push(`${relative(root, file)} -> ${spec}`);
    }
  }
  expect(bad).toEqual([]);
});

test("the scanner reads every form of import", () => {
  const src = [
    'import { a } from "./a";',
    'import type { B } from "../b";',
    'import "./side";',
    "import './quiet'",
    'export { c } from "./c";',
    'export * from "./d";',
    'import {\n  e,\n  f,\n} from "./e";',
    'const g = await import("./g");',
    'import pkg from "pkg";',
    'import "pkg/side";',
    'export const h = "from ./not";',
  ].join("\n");
  expect(importsIn(src)).toEqual(["./a", "../b", "./side", "./quiet", "./c", "./d", "./e", "./g"]);
});

test("no block imports src/app; only a block's tests import src/testbuild (the test build's wirings and search)", () => {
  const bad: string[] = [];
  for (const file of tsFiles(blocksDir)) {
    const isTest = file.includes("/tests/");
    for (const spec of imports(file)) {
      const target = resolve(dirname(file), spec);
      if (inside(join(root, "src/app"), target) || (!isTest && inside(join(root, "src/testbuild"), target))) bad.push(`${relative(root, file)} -> ${spec}`);
    }
  }
  expect(bad).toEqual([]);
});

test("platform imports no block", () => {
  const bad: string[] = [];
  const platformDir = join(root, "src/platform");
  for (const file of tsFiles(platformDir)) {
    for (const spec of imports(file)) {
      if (blockOf(resolve(dirname(file), spec))) bad.push(`${relative(root, file)} -> ${spec}`);
    }
  }
  expect(bad).toEqual([]);
});
