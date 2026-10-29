// Every acceptance test id of design/docs/build/acceptance*.md (RUN-02, SAVE-03, FEEL-11, ART-26 …) is named in the title of at least
// one test or describe in a test file: tests/e2e/*.spec.ts, src/**/*.test.ts, scripts/*.test.ts. A mention in a comment does not count.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

/** Ids whose test is not written yet, with why. A gap that gets its test stays listed here harmlessly: delete the line then. */
/** Acceptance tests with no test yet, each with why. */
const KNOWN_GAPS: Record<string, string> = {};

function idsOf(): string[] {
  const dir = join(root, "design/docs/build");
  const ids = readdirSync(dir)
    .filter((f) => /^acceptance(-.+)?\.md$/.test(f))
    .flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/^- \*\*([A-Z]+-\d+)\*\*:/gm)].map((m) => m[1]!));
  return [...new Set(ids)];
}

function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === "node_modules" || p === import.meta.path) return [];
    if (statSync(p).isDirectory()) return testFiles(p);
    return /\.(test|spec)\.ts$/.test(f) ? [p] : [];
  });
}

/** The first string argument of every test(…), describe(…) and it(…) call, including test.only, test.each and the like. */
function titles(src: string): string[] {
  return [...src.matchAll(/\b(?:test|describe|it)(?:\.\w+)*\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
}

test("the title reader finds titles in every call form, and not a mention in a comment", () => {
  const src = ['// ART-26 is not here', 'test("RUN-01 a", () => {});', "describe('RUN-02 b', () => {});", "test.only(`RUN-03 c`, () => {});", 'test(\n  "RUN-04 d",\n  () => {},\n);'].join("\n");
  expect(titles(src)).toEqual(["RUN-01 a", "RUN-02 b", "RUN-03 c", "RUN-04 d"]);
});

test("every acceptance test id is in a test title, or is a known gap", () => {
  const ids = idsOf();
  expect(ids.length, "ids read from the acceptance pages").toBeGreaterThan(100);
  const named = [join(root, "tests/e2e"), join(root, "src"), join(root, "scripts")].flatMap(testFiles).flatMap((f) => titles(readFileSync(f, "utf8")));
  const missing = ids.filter((id) => !named.some((t) => new RegExp(`\\b${id}\\b`).test(t)));
  expect(missing.filter((id) => !(id in KNOWN_GAPS))).toEqual([]);
  for (const id of Object.keys(KNOWN_GAPS)) expect(ids, `known gap ${id} is no acceptance test id`).toContain(id);
});
