// The release build into dist/: the game's page, index.html with main.ts as main.js; its service worker, sw.js, with this build's
// file list and GameVersion; and files.json, every file the game keeps with its size and SHA-256, for the loading progress (system
// architecture, Build and publish). No other page: the sandbox and the gallery are never shipped to players. Fails when the game's
// files total over FirstLoadMax compressed (gzip), and prints the size; when a page's build writes a file not listed; when dist/
// holds a page but index.html.
//
// --test: the test build (acceptance.md, Test build) into dist-test/, every page in src/app/ (each <name>.html with its <name>.ts:
// the test sandbox is sandbox, the design system is gallery): GameLink and CountAddress at the test server, the aids in, any
// order from a test list; and dist-test-v2/, the same game with GameVersion raised and named data changed.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { BunPlugin } from "bun";
import { RELEASE, type BuildValues } from "../src/blocks/offline-play/logic/build";
import { FIRST_LOAD_MAX, KEPT_FILES } from "../src/blocks/offline-play/logic/loading";

const root = resolve(import.meta.dir, "..");
const app = join(root, "src/app");

/** The files the game keeps, in load order; the service worker and the list are the game's too, for the size check. */
const KEPT: readonly string[] = KEPT_FILES;
const LIMIT = FIRST_LOAD_MAX * 1_000_000;

const fail = (why: string): never => {
  console.error(`build failed: ${why}`);
  process.exit(1);
};

/** v2 of the test build: order 4's batch changed, so its fingerprint differs, and a result's text rewritten in its place (SAVE-05). */
const dataV2: BunPlugin = {
  name: "tc2-data-v2",
  setup(b) {
    b.onLoad({ filter: /orders[\\/]data[\\/]orders\.gen\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8").replace("export const ORDERS: readonly Order[] = [", "const BASE: readonly Order[] = [");
      const patch = JSON.stringify(join(root, "src/testbuild/data-v2"));
      return { contents: `${src}\nimport { patchOrders } from ${patch};\nexport const ORDERS: readonly Order[] = patchOrders(BASE);\n`, loader: "ts" };
    });
  },
};

async function buildOne(out: string, values: BuildValues, o: { mainEntry?: string; plugins?: BunPlugin[] } = {}): Promise<number> {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const pages = values.test
    ? readdirSync(app)
        .filter((f) => f.endsWith(".html"))
        .map((f) => f.slice(0, -".html".length))
        .filter((name) => existsSync(join(app, `${name === "index" ? "main" : name}.ts`)))
    : ["index"];
  const define = { TC2_BUILD: JSON.stringify(values) };
  const entry = (name: string) => (name === "index" && o.mainEntry ? o.mainEntry : join(app, `${name === "index" ? "main" : name}.ts`));
  // Each page alone, so that its file is named for the page (main.js for the game, whatever its entry).
  for (const name of pages) {
    const result = await Bun.build({
      entrypoints: [entry(name)],
      outdir: out,
      target: "browser",
      format: "esm",
      minify: true,
      sourcemap: "linked",
      splitting: false,
      naming: `${name === "index" ? "main" : name}.[ext]`,
      define,
      plugins: o.plugins ?? [],
    });
    if (!result.success) {
      for (const log of result.logs) console.error(log);
      process.exit(1);
    }
    // Every file the game's build writes is a kept file, so the offline list misses none; another page writes its own script.
    const listed = name === "index" ? KEPT : [`${name}.js`];
    const extra = result.outputs.map((a) => relative(out, a.path)).filter((p) => !p.endsWith(".map") && !listed.includes(p));
    if (extra.length) fail(`${name}.html's build wrote ${extra.join(", ")}, not in its files (${listed.join(", ")})`);
    copyFileSync(join(app, `${name}.html`), join(out, `${name}.html`));
  }
  // The kept files, their sizes and digests (the worker keeps only these bytes). The list's id changes with any byte of them or of the worker's own code, so a new build is a
  // new version to the browser, and a new worker never takes the cache name of the one serving (OFFLINE-03).
  const files = KEPT.map((path) => {
    const bytes = readFileSync(join(out, path));
    return { path, size: bytes.length, sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex") };
  });
  const worker = async (listId: string) => {
    const r = await Bun.build({
      entrypoints: [join(root, "src/blocks/offline-play/view/sw.ts")],
      target: "browser",
      format: "esm",
      minify: true,
      define: { TC2_SW: JSON.stringify({ version: values.version, listId, files }) },
    });
    if (!r.success) {
      for (const log of r.logs) console.error(log);
      process.exit(1);
    }
    return Buffer.from(await r.outputs[0]!.arrayBuffer());
  };
  const listId = new Bun.CryptoHasher("sha256")
    .update(Buffer.concat([...KEPT.map((p) => readFileSync(join(out, p))), await worker("")]))
    .digest("hex")
    .slice(0, 12);
  writeFileSync(join(out, "files.json"), JSON.stringify({ version: values.version, listId, files }, null, 1));
  writeFileSync(join(out, "sw.js"), await worker(listId));
  // The release: the game's page alone.
  const others = readdirSync(out).filter((f) => f.endsWith(".html") && f !== "index.html");
  if (!values.test && others.length) fail(`${relative(root, out)}/ holds ${others.join(", ")}: the release ships the game's page alone`);
  // FirstLoadMax: the game's files as sent, compressed.
  let total = 0;
  for (const f of [...KEPT, "sw.js", "files.json"]) {
    const raw = readFileSync(join(out, f));
    const gz = Bun.gzipSync(raw).length;
    total += gz;
    console.log(`${out.slice(root.length + 1)}/${f} ${raw.length} bytes, ${gz} gzip`);
  }
  for (const name of pages.filter((p) => p !== "index")) console.log(`${out.slice(root.length + 1)}/${name}.html`);
  console.log(`game files: ${total} bytes gzip, limit ${LIMIT} (FirstLoadMax ${FIRST_LOAD_MAX} MB)`);
  if (total > LIMIT) {
    console.error(`build failed: the game's files total ${total} bytes gzip, over ${LIMIT}`);
    process.exit(1);
  }
  return total;
}

if (process.argv.includes("--test")) {
  const test: BuildValues = { version: RELEASE.version, link: null, countAddress: "local", test: true };
  const mainEntry = join(root, "src/testbuild/main-test.ts");
  await buildOne(join(root, "dist-test"), test, { mainEntry });
  await buildOne(join(root, "dist-test-v2"), { ...test, version: RELEASE.version + 1 }, { mainEntry, plugins: [dataV2] });
} else {
  await buildOne(join(root, "dist"), RELEASE);
}
