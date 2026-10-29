// Static file server for a build on $PORT (and $HOST, when set), for the test site and the browser tests. Every response says Cache-Control: no-cache.
// The build is served twice: under /transmission-control-2/, as GitHub Pages serves the game, and at the root, for the test
// build's gallery and sandbox.
//
// --test: serves the test build (dist-test/) on 127.0.0.1 only, since its test servers take any request unasked, with the test
// servers the acceptance page's Test build names. Each test keeps its
// own settings under a key, so tests run side by side: the key is the `tc2test` cookie of the test's browser (pages and the
// service worker send it), or `key` in a /__test/ query; the counter's key is in its path.
// - /__count/<key>: the local counter. It records each request; it answers, stalls past SendWait, or refuses, as set.
// - /__test/counts?key=: what it recorded; /__test/reset?key=: clears it and every setting below.
// - /__test/set?key=&build=1|2&net=up|down|slow&rate=<bytes/s>&fail=<file>&count=answer|stall|refuse: the build served (2:
//   GameVersion raised), the connection to the game's files as the service worker fetches them (down: every request cut off;
//   slow: sent at rate), a file that fails, the counter. Pages and their scripts load as usual: the network settings hold for
//   fetch() requests only (Sec-Fetch-Dest: empty), so a page can open while the worker's load is slowed or cut.
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/** The GitHub Pages path of the game (plan.md, Tests). */
export const PREFIX = "/transmission-control-2/";

export function contentType(path: string): string {
  return TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

/** The file a request path names inside dir, or null outside it or missing. */
export function resolveFile(dir: string, urlPath: string): string | null {
  let rel: string;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  const full = normalize(join(dir, rel));
  if (full !== dir && !full.startsWith(dir + sep)) return null;
  const file = existsSync(full) && statSync(full).isDirectory() ? join(full, "index.html") : full;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

/** A request path under the game's prefix, as a path in the build; the prefix without its slash redirects. */
export function underPrefix(urlPath: string): string | null {
  if (urlPath.startsWith(PREFIX)) return "/" + urlPath.slice(PREFIX.length);
  return null;
}

export type TestState = {
  build: 1 | 2;
  net: "up" | "down" | "slow";
  rate: number;
  fail: string | null;
  count: "answer" | "stall" | "refuse";
  counts: { url: string; method: string; cookie: string | null; referer: string | null; at: number }[];
};

const freshState = (): TestState => ({ build: 1, net: "up", rate: 20_000, fail: null, count: "answer", counts: [] });

/** A body that breaks off: the browser sees the connection lost. */
const cutOff = () =>
  new Response(
    new ReadableStream({
      start(c) {
        c.error(new Error("connection cut by the test server"));
      },
    }),
    { headers: { "Cache-Control": "no-cache" } },
  );

/** A file sent at `rate` bytes a second. */
function slowly(bytes: Uint8Array, rate: number, state: TestState): ReadableStream<Uint8Array> {
  const chunk = Math.max(256, Math.floor(rate / 10));
  let at = 0;
  return new ReadableStream({
    async pull(c) {
      if (state.net === "down") return c.error(new Error("connection cut by the test server"));
      if (at >= bytes.length) return c.close();
      await Bun.sleep(100);
      c.enqueue(bytes.slice(at, at + chunk));
      at += chunk;
    },
  });
}

const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

/** A test's key: its `tc2test` cookie, else the query's `key`, else "". */
export function keyOf(req: Request, url: URL): string {
  const c = /(?:^|;\s*)tc2test=([A-Za-z0-9_-]+)/.exec(req.headers.get("cookie") ?? "");
  return url.searchParams.get("key") ?? c?.[1] ?? "";
}

export function serve(dir: string, port: number, o: { test?: { v2: string } } = {}) {
  const roots = { 1: resolve(dir), 2: o.test ? resolve(o.test.v2) : resolve(dir) } as const;
  const states = new Map<string, TestState>();
  const stateOf = (key: string) => {
    let st = states.get(key);
    if (!st) states.set(key, (st = freshState()));
    return st;
  };
  const headers = { "Cache-Control": "no-cache" };
  return Bun.serve({
    port,
    // The test servers listen on loopback only; the test site on $HOST when set (paneweb binds it to loopback for the board).
    ...(o.test ? { hostname: "127.0.0.1" } : process.env.HOST ? { hostname: process.env.HOST } : {}),
    idleTimeout: 120,
    async fetch(req) {
      const url = new URL(req.url);
      const state = stateOf(o.test ? keyOf(req, url) : "");
      if (o.test) {
        if (url.pathname === "/__count" || url.pathname.startsWith("/__count/")) {
          const key = url.pathname.slice("/__count/".length);
          const state = stateOf(key);
          state.counts.push({ url: url.pathname + url.search, method: req.method, cookie: req.headers.get("cookie"), referer: req.headers.get("referer"), at: Date.now() });
          if (state.count === "refuse") return cutOff();
          if (state.count === "stall") await Bun.sleep(40_000);
          return new Response(GIF, { headers: { ...headers, "Content-Type": "image/gif" } });
        }
        if (url.pathname === "/__test/counts") return Response.json(state.counts, { headers });
        if (url.pathname === "/__test/reset") {
          Object.assign(state, freshState());
          return Response.json(state, { headers });
        }
        if (url.pathname === "/__test/set") {
          const q = url.searchParams;
          if (q.has("build")) state.build = q.get("build") === "2" ? 2 : 1;
          if (q.has("net")) state.net = (q.get("net") as TestState["net"]) ?? "up";
          if (q.has("rate")) state.rate = Number(q.get("rate"));
          if (q.has("fail")) state.fail = q.get("fail") || null;
          if (q.has("count")) state.count = (q.get("count") as TestState["count"]) ?? "answer";
          return Response.json({ ...state, counts: state.counts.length }, { headers });
        }
      }
      const inGame = underPrefix(url.pathname);
      if (url.pathname === PREFIX.slice(0, -1)) return Response.redirect(PREFIX, 301);
      const base = roots[o.test ? state.build : 1];
      const file = resolveFile(base, inGame ?? url.pathname);
      if (!file) return new Response("Not found", { status: 404, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
      const type = { ...headers, "Content-Type": contentType(file) };
      if (o.test && inGame !== null && (req.headers.get("sec-fetch-dest") ?? "empty") === "empty") {
        if (state.net === "down") return cutOff();
        if (state.fail && file.endsWith(sep + state.fail)) return new Response("refused by the test server", { status: 500, headers });
        if (state.net === "slow") return new Response(slowly(new Uint8Array(await Bun.file(file).arrayBuffer()), state.rate, state), { headers: type });
      }
      return new Response(Bun.file(file), { headers: type });
    },
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) {
    console.error("serve.ts: set PORT to the port to listen on");
    process.exit(1);
  }
  const test = process.argv.includes("--test");
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const top = join(import.meta.dir, "..");
  const dir = resolve(args[0] ?? join(top, test ? "dist-test" : "dist"));
  const server = serve(dir, port, test ? { test: { v2: join(top, "dist-test-v2") } } : {});
  console.log(`serving ${dir} on http://${test ? "127.0.0.1" : "localhost"}:${server.port} and under ${PREFIX}${test ? " (test build, with test servers)" : ""}`);
}
