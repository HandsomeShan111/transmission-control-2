import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentType, resolveFile, serve } from "./serve";

/** A build of its own for one test: removed after it. */
function withBuild(run: (dir: string) => Promise<void> | void) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), "tc2-serve-"));
    writeFileSync(join(dir, "gallery.html"), "<!doctype html>");
    writeFileSync(join(dir, "index.html"), "home");
    writeFileSync(join(dir, "gallery.js"), "1");
    mkdirSync(join(dir, "sub"));
    writeFileSync(join(dir, "sub", "index.html"), "sub");
    try {
      await run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

describe("serve.ts", () => {
  test("content types", () => {
    expect(contentType("a.html")).toBe("text/html; charset=utf-8");
    expect(contentType("a.js")).toBe("text/javascript; charset=utf-8");
    expect(contentType("a.json")).toBe("application/json; charset=utf-8");
    expect(contentType("a.css")).toBe("text/css; charset=utf-8");
    expect(contentType("a.bin")).toBe("application/octet-stream");
  });
  test(
    "files inside the directory only",
    withBuild((dir) => {
      expect(resolveFile(dir, "/gallery.html")).toBe(join(dir, "gallery.html"));
      expect(resolveFile(dir, "/")).toBe(join(dir, "index.html"));
      expect(resolveFile(dir, "/sub/")).toBe(join(dir, "sub", "index.html"));
      expect(resolveFile(dir, "/../etc/passwd")).toBeNull();
      expect(resolveFile(dir, "/%2e%2e/etc/passwd")).toBeNull();
      expect(resolveFile(dir, "/missing.js")).toBeNull();
      expect(resolveFile(dir, "/%E0%A4%A")).toBeNull();
    }),
  );
  test(
    "serves with no-cache and its type",
    withBuild(async (dir) => {
      const server = serve(dir, 0);
      try {
        const r = await fetch(`http://localhost:${server.port}/gallery.js`);
        expect(r.status).toBe(200);
        expect(r.headers.get("cache-control")).toBe("no-cache");
        expect(r.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
        const miss = await fetch(`http://localhost:${server.port}/nope`);
        expect(miss.status).toBe(404);
        expect(miss.headers.get("cache-control")).toBe("no-cache");
      } finally {
        server.stop(true);
      }
    }),
  );
  test(
    "the test build listens on 127.0.0.1 only; the plain build on every address",
    withBuild((dir) => {
      const t = serve(dir, 0, { test: { v2: dir } });
      const plain = serve(dir, 0);
      try {
        expect(t.hostname).toBe("127.0.0.1");
        expect(plain.hostname).not.toBe("127.0.0.1");
      } finally {
        t.stop(true);
        plain.stop(true);
      }
    }),
  );
});
