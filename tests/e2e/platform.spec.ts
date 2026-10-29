// The Platform steps' acceptance tests (build/acceptance-platform.md), one test each, named by step id, against the test build
// under /transmission-control-2/, and the Loading screen check (build/acceptance.md). The test server's settings are per test
// (its key): the build served, the connection to the game's files, a file that fails (scripts/serve.ts).
import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { frameOf } from "./board-kit";
import {
  D,
  GAME,
  RESULT_1_1,
  W,
  archiveOf,
  closePaper,
  frame,
  kept,
  keyFor,
  newGame,
  openArchive,
  openFromList,
  openGame,
  orderRow,
  paper,
  paperLines,
  paperText,
  passTitle,
  playMisfire,
  prepare,
  reopen,
  runAndSkip,
  runOrder,
  screen,
  seedFile,
  setServer,
  setWiring,
  shot,
  testWiring,
  toOrderList,
  waitBoardOpen,
  waitWhole,
  wire,
  wiringNow,
  workerActive,
  workerSettled,
  workerWaiting,
} from "./game-kit";

test.setTimeout(240_000);

const TOP = join(import.meta.dirname, "..", "..");
const SAVE_CODE_READ = "SAVE CODE READ";
const CODE_NOT_READ = "CODE NOT READ";
const NEWER_CODE = "CODE FROM A NEWER VERSION. CONNECT, CLOSE EVERY TERMINAL, AND OPEN IT AGAIN.";
const KEEPS_NO_RECORDS = "THIS TERMINAL KEEPS NO RECORDS. COPY YOUR SAVE CODE.";
const EARLIER_DROPPED = "SOME RECORDS FROM AN EARLIER VERSION NOT KEPT.";
const CANNOT_STORE = "THIS TERMINAL CANNOT STORE THE GAME. A CONNECTION IS NEEDED TO OPEN IT AGAIN.";
const V2_RESULT_TEXT = "Laminated coffee, filed under Beverages, Forever.";
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** A fresh browser of this test's project size, with this test's server key. */
async function browserFor(browser: Browser, info: TestInfo, key: string | null, init?: () => void): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: info.project.use.viewport!, baseURL: info.project.use.baseURL!, acceptDownloads: true });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  if (key) {
    await ctx.addCookies([{ name: "tc2test", value: key, domain: "127.0.0.1", path: "/" }]);
    await page.request.get(`/__test/reset?key=${key}`);
  }
  return { ctx, page };
}

const version = (page: Page) => page.evaluate(() => (window as unknown as { __tc2: { version: number } }).__tc2.version);
const gameCaches = (page: Page) => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith("tc2-v")));
const waiting = workerWaiting;
const activeWorker = workerActive;
const loadingLines = (page: Page) => frame(page, "loading").locator('[data-part="paper-line"]').allInnerTexts();

/** Reads the save code the order list's SAVE CODE prints. */
async function saveCodeOf(page: Page): Promise<string> {
  await toOrderList(page);
  await frame(page, "orderList").locator('.tc-cbar .tc-plate[aria-label="SAVE CODE"]').click();
  await waitWhole(page);
  const lines = await paperLines(page);
  expect(lines[0]).toBe("SAVE CODE");
  const code = lines[1]!.replace(/\s+/g, "");
  await closePaper(page);
  return code;
}

/** LOAD SAVE CODE: pastes `text` into the field; READ unless `close`, which closes the field first. Returns what READ prints. */
async function readCode(page: Page, text: string, o: { close?: boolean } = {}): Promise<string[]> {
  await toOrderList(page);
  await frame(page, "orderList").locator('.tc-cbar .tc-plate[aria-label="LOAD SAVE CODE"]').click();
  await waitWhole(page);
  await paper(page).locator('[data-control="code-field"]').fill(text);
  if (o.close) {
    await closePaper(page);
    return [];
  }
  await paper(page).locator('[data-control="read"]').click();
  await expect(page.locator('[data-paper="code-read"]')).toBeVisible();
  await waitWhole(page);
  return paperLines(page);
}

/** Every page of a browser closed, then the game opened again: the version waiting runs (OFFLINE-03). */
async function reopenFresh(ctx: BrowserContext): Promise<Page> {
  for (const p of ctx.pages()) await p.close();
  // A page outside the game's scope watches the waiting version activate, then the game opens.
  const page = await ctx.newPage();
  await page.goto("/sandbox.html?order=1");
  await workerSettled(page);
  await openGame(page);
  return page;
}

// ---------- Offline play ----------

test("Loading screen: the layout, LOADING and its steps on the teletype", async ({ browser }, info) => {
  const key = keyFor(info);
  const { ctx, page } = await browserFor(browser, info, key);
  await setServer(page, key, "net=slow&rate=60000");
  await page.goto(GAME);
  await expect.poll(() => screen(page)).toBe("loading");
  await expect(frame(page, "loading").locator(".tc-title")).toHaveText("TRANSMISSION CONTROL 2");
  await expect.poll(() => loadingLines(page), { timeout: 20_000 }).toContain("10%");
  await shot(page, info, "screen-loading");
  const m = await frame(page, "loading").evaluate((f) => {
    const p = f.querySelector(".tc-paper")!.getBoundingClientRect();
    const w = f.querySelector(".tc-window")!.getBoundingClientRect();
    return { inside: p.left >= w.left - 1 && p.right <= w.right + 1, pageScroll: document.documentElement.scrollWidth > window.innerWidth };
  });
  expect(m.inside).toBe(true);
  expect(m.pageScroll).toBe(false);
  await setServer(page, key, "net=up");
  await passTitle(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 30_000 });
  await ctx.close();
});

test("OFFLINE-01 first load: LOADING in LoadStep steps, NO SIGNAL, all or none kept, under FirstLoadMax", async ({ browser }, info) => {
  // Derived: all files as sent, compressed, total at most FirstLoadMax.
  const list = JSON.parse(readFileSync(join(TOP, "dist-test", "files.json"), "utf8")) as { files: { path: string; size: number }[] };
  const sent = ["sw.js", "files.json", ...list.files.map((f) => f.path)].reduce((t, p) => t + gzipSync(readFileSync(join(TOP, "dist-test", p))).length, 0);
  expect(sent).toBeLessThanOrEqual(D.FirstLoadMax);

  const key = keyFor(info);
  const { ctx, page } = await browserFor(browser, info, key);
  await setServer(page, key, "net=slow&rate=40000");
  await page.goto(GAME);
  await expect.poll(() => loadingLines(page), { timeout: 20_000 }).toContain("10%");
  // The connection cut mid-load: NO SIGNAL; restored: the load goes on.
  await setServer(page, key, "net=down");
  await expect.poll(() => loadingLines(page), { timeout: 15_000 }).toContain("NO SIGNAL");
  await shot(page, info, "offline-01-no-signal");
  await setServer(page, key, "net=slow&rate=40000");
  const at = (await loadingLines(page)).length;
  await expect.poll(async () => (await loadingLines(page)).slice(at).some((l) => /^\d+%$/.test(l)), { timeout: 30_000 }).toBe(true);
  // The page closed mid-load: nothing kept.
  await page.close();
  const look = await ctx.newPage();
  await look.waitForTimeout(2500);
  await look.goto("/sandbox.html?order=1");
  await expect.poll(() => gameCaches(look), { timeout: 15_000 }).toEqual([]);
  await look.close();
  // Opened again: the load starts over and finishes; every file kept, then the game opens.
  await setServer(look, key, "net=slow&rate=120000");
  const again = await ctx.newPage();
  await again.goto(GAME);
  await expect.poll(() => loadingLines(again), { timeout: 20_000 }).toContain("LOADING");
  await passTitle(again, "start");
  await expect(frameOf(again)).toHaveAttribute("data-standby", "true", { timeout: 60_000 });
  const steps = (await loadingLines(again)).filter((l) => /^\d+%$/.test(l)).map((l) => parseInt(l, 10));
  expect(steps).toEqual(range(1, 10).map((i) => i * 10));
  expect((await gameCaches(again)).length).toBe(1);
  await ctx.close();

  // A browser that cannot keep a file: nothing kept; the game opens from the download; the line prints once.
  const key2 = `${key}b`;
  const b = await browserFor(browser, info, key2);
  await setServer(b.page, key2, "fail=main.js");
  await b.page.goto(GAME);
  await passTitle(b.page, "start");
  await expect(frameOf(b.page)).toHaveAttribute("data-standby", "true", { timeout: 30_000 });
  // A new game: the line waits for the misfire's report and memo, then prints as order 1 opens.
  await playMisfire(b.page);
  await closePaper(b.page);
  await waitWhole(b.page);
  await closePaper(b.page);
  await expect.poll(() => paperText(b.page)).toContain(CANNOT_STORE);
  expect(await gameCaches(b.page)).toEqual([]);
  await shot(b.page, info, "offline-01-cannot-store");
  await closePaper(b.page);
  await b.page.waitForTimeout(500);
  await expect(b.page.locator(".tc-frame:not([hidden]) .tc-paper")).toHaveCount(0);
  await b.ctx.close();
});

test("OFFLINE-02 open: a browser that kept every file runs from them offline, and online again", async ({ browser }, info) => {
  const { ctx, page } = await browserFor(browser, info, keyFor(info));
  await newGame(page);
  await activeWorker(page);
  await ctx.setOffline(true);
  await reopen(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 20_000 });
  const report = await playMisfire(page);
  expect(report[0]).toBe(RESULT_1_1);
  await shot(page, info, "offline-02-report-offline");
  await closePaper(page);
  await ctx.setOffline(false);
  await page.goto(GAME);
  await passTitle(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toMatch(/board|orderList/);
  await ctx.close();
});

test("OFFLINE-01 files lost: the worker active, its kept files gone; opened online, they are kept again; offline, the game opens", async ({ browser }, info) => {
  const { ctx, page } = await browserFor(browser, info, keyFor(info));
  const keptFiles = () =>
    page.evaluate(async () => {
      const out: string[] = [];
      for (const k of (await caches.keys()).filter((k) => k.startsWith("tc2-v"))) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname.split("/").pop()!);
      return out.sort();
    });
  await newGame(page);
  await activeWorker(page);
  expect(await keptFiles()).toEqual(["index.html", "main.js"]);
  // The browser drops the game's caches (cleared or evicted); its worker stays active.
  await page.evaluate(async () => {
    for (const k of await caches.keys()) await caches.delete(k);
  });
  expect(await gameCaches(page)).toEqual([]);
  // Opened again online: the loading screen prints as the worker keeps every file again; then the game opens.
  await reopen(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 60_000 });
  const lines = await loadingLines(page);
  expect(lines[0]).toBe("LOADING");
  expect(lines).toContain("100%");
  expect(await keptFiles()).toEqual(["index.html", "main.js"]);
  // Offline: the game opens from the files kept.
  await ctx.setOffline(true);
  await reopen(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 20_000 });
  await ctx.close();
});

test("OFFLINE-03 new version: downloads beside, runs once no page is open; a cut download dropped; a newer code looks", async ({ browser }, info) => {
  test.setTimeout(480_000);
  const key = keyFor(info);
  await test.step("a new version downloads beside and runs once no page is open", async () => {
  const { ctx, page } = await browserFor(browser, info, key);
  await prepare(ctx, { seed: seedFile("act1-won") });
  await openGame(page);
  await activeWorker(page);
  expect(await version(page)).toBe(1);
  await openFromList(page, 1);
  await waitBoardOpen(page, 1);
  // The server now serves GameVersion 2; back online, the page looks and downloads it beside.
  await setServer(page, key, "build=2");
  await ctx.setOffline(true);
  await ctx.setOffline(false);
  await waiting(page);
  expect((await gameCaches(page)).sort()).toEqual([expect.stringMatching(/^tc2-v1-/), expect.stringMatching(/^tc2-v2-/)]);
  // The order, its run and its report stay on the version playing; so does a second page.
  await setWiring(page, W[1]);
  await runAndSkip(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("Signing ceremony: delivered as ordered.");
  await closePaper(page);
  expect(await version(page)).toBe(1);
  const second = await ctx.newPage();
  await openGame(second);
  expect(await version(second)).toBe(1);
  // Every page closed, then opened: version 2, the kept save carried over.
  const v2 = await reopenFresh(ctx);
  expect(await version(v2)).toBe(2);
  expect((await kept(v2))!.won).toEqual(range(1, 5));
  expect((await kept(v2))!.version).toBe(2);
  await expect.poll(async () => (await gameCaches(v2)).every((k) => k.startsWith("tc2-v2-"))).toBe(true);
  await shot(v2, info, "offline-03-v2");
  await ctx.close();

  });
  // The download cut off: dropped; the next look starts it over.
  await test.step("a download cut off is dropped; the next look starts it over", async () => {
  const key2 = `${key}c`;
  const c = await browserFor(browser, info, key2);
  await prepare(c.ctx, { seed: seedFile("act1-won") });
  await openGame(c.page);
  await activeWorker(c.page);
  await setServer(c.page, key2, "build=2&net=down");
  await c.ctx.setOffline(true);
  await c.ctx.setOffline(false);
  await c.page.waitForTimeout(3000);
  await workerSettled(c.page);
  expect(await gameCaches(c.page)).toEqual([expect.stringMatching(/^tc2-v1-/)]);
  await setServer(c.page, key2, "net=up");
  await c.ctx.setOffline(true);
  await c.ctx.setOffline(false);
  await waiting(c.page);
  expect(await version(await reopenFresh(c.ctx))).toBe(2);
  await c.ctx.close();

  });
  // A code from the later build: CODE FROM A NEWER VERSION, and the page looks for it.
  await test.step("a code from the later build looks for it", async () => {
  const key3 = `${key}d`;
  const later = await browserFor(browser, info, key3);
  await setServer(later.page, key3, "build=2");
  await prepare(later.ctx, { seed: seedFile("act1-won") });
  await openGame(later.page);
  expect(await version(later.page)).toBe(2);
  const code2 = await saveCodeOf(later.page);
  expect(code2).toMatch(/^TC2-2-/);
  await later.ctx.close();
  const key4 = `${key}e`;
  const d = await browserFor(browser, info, key4);
  await prepare(d.ctx, { seed: seedFile("act1-but-5") });
  await openGame(d.page);
  await activeWorker(d.page);
  await setServer(d.page, key4, "build=2");
  expect(await readCode(d.page, code2)).toEqual([NEWER_CODE]);
  expect((await kept(d.page))!.won).toEqual(range(1, 4));
  await closePaper(d.page);
  await waiting(d.page);
  const d2 = await reopenFresh(d.ctx);
  expect(await version(d2)).toBe(2);
  // The kept save read into build 2: order 4's data changed, its reports dropped, said once (SAVE-05).
  await waitWhole(d2);
  expect(await paperLines(d2)).toEqual([EARLIER_DROPPED]);
  await closePaper(d2);
  expect((await readCode(d2, code2))[0]).toBe(SAVE_CODE_READ);
  await d.ctx.close();
});
});

// ---------- Saving ----------

test("SAVE-01 keep: wirings and the setting kept at once; a run's outcome when its report starts; two pages; one persist request", async ({ page, context, browser }, info) => {
  await prepare(context, { seed: seedFile("to-16") });
  await openGame(page);
  // Order 3: a wire placed, undone once, placed again; AUDIO off; reload.
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  const opening3 = await wiringNow(page);
  await wire(page, "IN → INSPECTOR");
  await frameOf(page).locator('[data-control="undo"]').click();
  await expect.poll(() => wiringNow(page)).toEqual(opening3);
  await wire(page, "IN → INSPECTOR");
  const placed = await wiringNow(page);
  const audio = frameOf(page).locator('[data-control="audio"] button');
  await audio.click();
  await expect(audio).toHaveAttribute("aria-pressed", "true");
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  expect(await wiringNow(page)).toEqual(placed);
  await expect(frameOf(page).locator('[data-control="audio"] button')).toHaveAttribute("aria-pressed", "true");
  // Kept in this browser's storage, never a cookie.
  expect(await context.cookies()).toEqual([]);
  const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tc2.")).sort());
  expect(stored).toEqual(expect.arrayContaining(["tc2.save", "tc2.settings", "tc2.wirings"]));

  // Order 17, a repair order: closed before the report prints, only the wiring the run started from is kept.
  const fix = (await testWiring(page, 17))!;
  await openFromList(page, 17);
  await waitBoardOpen(page, 17);
  await setWiring(page, fix);
  await frameOf(page).locator('[data-control="run"]').click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "running");
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  expect((await kept(page))!.won).not.toContain(17);
  await openFromList(page, 17);
  await waitBoardOpen(page, 17);
  expect(await wiringNow(page)).toEqual(fix.split("; ").sort());
  // Closed as the report starts to print: the outcome is kept whole; the won repair order opens failing again.
  await frameOf(page).locator('[data-control="run"]').click();
  await frameOf(page).locator('[data-control="skip"]').click().catch(() => {});
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 20_000 });
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  const k17 = (await kept(page))!;
  expect(k17.won).toContain(17);
  expect(k17.moves[17]).toBeGreaterThan(0);
  await expect(orderRow(page, 17)).toHaveAttribute("data-won", "true");
  await openFromList(page, 17);
  await waitBoardOpen(page, 17);
  expect(await wiringNow(page)).not.toEqual(fix.split("; ").sort());

  // One wiring changed in two pages: the later change stands.
  const other = await context.newPage();
  await openGame(other);
  await toOrderList(page);
  await openFromList(page, 2);
  await waitBoardOpen(page, 2);
  await openFromList(other, 2);
  await waitBoardOpen(other, 2);
  await wire(page, "IN → LAMINATOR");
  await page.waitForTimeout(300);
  await wire(other, "IN → SHREDDER");
  await page.waitForTimeout(300);
  const wirings = await page.evaluate(() => JSON.parse(localStorage.getItem("tc2.wirings") ?? "{}") as Record<string, { wiring: { from: string; to: string }[] }>);
  expect(wirings["2"]!.wiring.map((w) => `${w.from} → ${w.to}`)).toContain("IN → SHREDDER");
  await other.close();

  // Two fresh browsers: one granting persistent storage, one refusing; one request each, never asked again.
  for (const answer of ["granted", "refused"] as const) {
    const b = await browserFor(browser, info, null);
    await prepare(b.ctx, { seed: seedFile("act1-won"), persist: answer });
    await openGame(b.page);
    await saveCodeOf(b.page);
    const count = () => b.page.evaluate(() => (window as unknown as { __tc2: { persistCount(): number } }).__tc2.persistCount());
    expect(await count(), answer).toBe(1);
    if (answer === "refused") {
      await reopen(b.page);
      await expect.poll(() => screen(b.page), { timeout: 20_000 }).toBe("orderList");
      expect(await count()).toBe(1);
      await saveCodeOf(b.page);
      expect(await count()).toBe(1);
    }
    expect(await b.ctx.cookies()).toEqual([]);
    await b.ctx.close();
  }
});

test("SAVE-01 keep: a kept wiring keeps its undo steps across a reload and another order", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("to-16") });
  await openGame(page);
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  const opening3 = await wiringNow(page);
  await wire(page, "IN → INSPECTOR");
  const first = await wiringNow(page);
  await wire(page, "LAMINATOR → Embassy");
  const second = await wiringNow(page);
  const keptSteps = () =>
    page.evaluate(() => (JSON.parse(localStorage.getItem("tc2.wirings") ?? "{}") as Record<string, { past: unknown[] }>)["3"]?.past.length ?? 0);
  await expect.poll(keptSteps).toBe(2);
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  await openFromList(page, 2);
  await waitBoardOpen(page, 2);
  await toOrderList(page);
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  expect(await wiringNow(page)).toEqual(second);
  const undo = frameOf(page).locator('[data-control="undo"]');
  await undo.click();
  await expect.poll(() => wiringNow(page)).toEqual(first);
  await undo.click();
  await expect.poll(() => wiringNow(page)).toEqual(opening3);
  await undo.click();
  await page.waitForTimeout(300);
  expect(await wiringNow(page)).toEqual(opening3);
});

test("SAVE-01 keep: a win kept whole when its page closes as the report prints while another page holds the save lock", async ({ page, context }) => {
  type Aid = { arm(p: string): void; release(p: string): void; held: string | null; game: { saving: { keep(): Promise<void> } } };
  const HOLD = "save lock taken, write not made";
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  // A second page of the game takes the save lock and holds it there, its write not made.
  const other = await context.newPage();
  await openGame(other);
  await other.evaluate((h) => {
    const t = (window as unknown as { __tc2: Aid }).__tc2;
    t.arm(h);
    void t.game.saving.keep();
  }, HOLD);
  const held = () => other.evaluate(() => (window as unknown as { __tc2: Aid }).__tc2.held);
  await expect.poll(held).toBe(HOLD);
  // Order 5 won; the page closes as its report starts to print, its keep still waiting on the lock.
  await openFromList(page, 5);
  await waitBoardOpen(page, 5);
  await setWiring(page, W[5]);
  await runAndSkip(page);
  await page.close();
  // Opened again: the win is kept.
  const again = await context.newPage();
  await openGame(again);
  expect((await kept(again))!.won).toEqual(range(1, 5));
  await expect(orderRow(again, 5)).toHaveAttribute("data-won", "true");
  // The holding page, let go, writes its merge: the win stays.
  await other.evaluate((h) => (window as unknown as { __tc2: Aid }).__tc2.release(h), HOLD);
  await expect.poll(held).toBeNull();
  await other.waitForTimeout(500);
  expect((await kept(again))!.won).toEqual(range(1, 5));
});

test("SAVE-02 copy out: the code after the debrief, COPY, the refused clipboard, SAVE CODE on the order list", async ({ page, context, browser }, info) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  await runOrder(page, 5, W[5]);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitWhole(page);
  const lines = await paperLines(page);
  expect(lines[0]).toBe("SAVE CODE");
  const code = lines[1]!.replace(/\s+/g, "");
  expect(code).toMatch(/^TC2-1-[A-Za-z0-9_-]+-[A-Za-z0-9_-]{6}$/);
  // Selectable.
  expect(await paper(page).locator('[data-part="paper-line"]').nth(1).evaluate((e) => getComputedStyle(e).userSelect)).not.toBe("none");
  // The browser's own clipboard holds the code: read back in Chromium, which grants the read to a test. Firefox grants no
  // clipboard read to a test page; there the copy the game made is checked alone.
  const chromium = info.project.name.startsWith("chromium");
  if (chromium) await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await paper(page).locator('[data-control="copy"]').click();
  await expect.poll(() => paperText(page)).toContain("COPIED");
  const copied = await page.evaluate(() => (window as unknown as { __tc2: { clipboard: string[] } }).__tc2.clipboard.at(-1));
  expect(copied).toBe(code);
  if (chromium) expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\s+/g, "")).toBe(code);
  await shot(page, info, "save-02-copied");
  await closePaper(page);
  const listed = await (async () => {
    await toOrderList(page);
    await frame(page, "orderList").locator('.tc-cbar .tc-plate[aria-label="SAVE CODE"]').click();
    await waitWhole(page);
    return paperLines(page);
  })();
  expect(listed[1]!.replace(/\s+/g, "")).toBe(code);
  await closePaper(page);

  // A browser that refuses the clipboard write: the code selected, SELECT AND COPY.
  const b = await browserFor(browser, info, null);
  await prepare(b.ctx, { seed: seedFile("act1-won"), clipboard: "refuse" });
  await openGame(b.page);
  await toOrderList(b.page);
  await frame(b.page, "orderList").locator('.tc-cbar .tc-plate[aria-label="SAVE CODE"]').click();
  await waitWhole(b.page);
  const shown = (await paperLines(b.page))[1]!.replace(/\s+/g, "");
  await paper(b.page).locator('[data-control="copy"]').click();
  await expect.poll(() => paperText(b.page)).toContain("SELECT AND COPY");
  expect(await b.page.evaluate(() => (window.getSelection()?.toString() ?? "").replace(/\s+/g, ""))).toBe(shown);
  await shot(b.page, info, "save-02-select-and-copy");
  await b.ctx.close();
});

const SAVE_03_X_A = "IN → INSPECTOR; INSPECTOR plus → LAMINATOR; INSPECTOR minus → SHREDDER 1; LAMINATOR → Embassy; SHREDDER 1 → LAMINATOR";
const SAVE_03_X_B = "IN → INSPECTOR; INSPECTOR plus → LAMINATOR; INSPECTOR minus → SHREDDER 2; LAMINATOR → Embassy; SHREDDER 2 → LAMINATOR";
const W4_TIME = "IN → INSPECTOR; INSPECTOR minus → SHREDDER; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; SHREDDER → LAMINATOR 2; LAMINATOR 2 → Archive";

test("SAVE-03 paste in: merged, the lamps' own lit-by reports, spaces ignored; a changed code, again, closed, newer", async ({ page, context, browser }, info) => {
  const runsOf = (name: string) => (seedFile(name) as { runs: { order: number; wiring: string }[] }).runs;
  // Browser A: every order up to 17 won; order 3's lamp lit by X_A, order 4's lamp lit; memo 5 closed; a result of order 6.
  const a = await browserFor(browser, info, null);
  await prepare(a.ctx, {
    seed: {
      runs: [...runsOf("to-17"), { order: 3, wiring: SAVE_03_X_A }, { order: 4, wiring: W4_TIME }],
      memos: [1, 2, 3, 4, 5],
      debriefs: [1, 2, 3],
      found: { 6: [0] },
    },
  });
  await openGame(a.page);
  const codeA = await saveCodeOf(a.page);
  const keptA = (await kept(a.page))!;
  await a.ctx.close();
  // Browser B: up to 16 won, a kept wiring in order 17; order 3's lamp lit by X_B; a result of order 7.
  const fix17 = (seedFile("to-17") as { runs: { order: number; wiring: string }[] }).runs.find((r) => r.order === 17)!.wiring;
  await prepare(context, {
    seed: { runs: [...runsOf("to-16"), { order: 3, wiring: SAVE_03_X_B }], memos: [1, 2, 3, 4], debriefs: [1, 2, 3], found: { 7: [1] }, wirings: { 17: fix17 } },
  });
  await openGame(page);
  const before = (await kept(page))!;
  expect(before.won).toEqual(range(1, 16));

  // A's code with spaces and line breaks inside.
  const messy = codeA.slice(0, 10) + " \n " + codeA.slice(10, 40) + "\n\n" + codeA.slice(40, 80) + "   " + codeA.slice(80);
  const read = await readCode(page, messy);
  expect(read[0]).toBe(SAVE_CODE_READ);
  await shot(page, info, "save-03-read");
  await closePaper(page);
  const after = (await kept(page))!;
  expect(after.won).toEqual(range(1, 17));
  expect(after.memos).toEqual([1, 2, 3, 4, 5]);
  expect(after.lamps.sort((x, y) => x - y)).toEqual(expect.arrayContaining([3, 4]));
  expect(after.found[6]).toEqual([0]);
  expect(after.found[7]).toEqual([1]);
  // Order 17's repair best: B had none; A's.
  expect(before.moves[17]).toBeUndefined();
  expect(keptA.moves[17]).toBeGreaterThan(0);
  expect(after.moves[17]).toBe(keptA.moves[17]);
  expect(after.filed).toBeGreaterThan(before.filed);
  await toOrderList(page);
  await expect(orderRow(page, 17)).toHaveAttribute("data-won", "true");
  await expect(orderRow(page, 18)).toBeVisible();
  // The archive: both browsers' reports; order 3's lamp keeps B's own lit-by report, order 4's is A's.
  await openArchive(page);
  const a3 = (await archiveOf(page, 3))!;
  const marked3 = a3.rows.filter((r) => r.second.includes("SECOND WIRING"));
  expect(marked3).toHaveLength(1);
  await frame(page, "archive").locator(`[data-report="${marked3[0]!.report}"]`).click();
  await waitWhole(page);
  expect((await paperLines(page)).join(" ")).toContain("SHREDDER 2");
  await closePaper(page);
  const a4 = (await archiveOf(page, 4))!;
  const marked4 = a4.rows.filter((r) => r.second.includes("SECOND WIRING"));
  expect(marked4).toHaveLength(1);
  await frame(page, "archive").locator(`[data-report="${marked4[0]!.report}"]`).click();
  await waitWhole(page);
  expect((await paperLines(page)).join(" ")).toContain("LAMINATOR 2");
  await closePaper(page);
  expect((await archiveOf(page, 6))!.results).toContain("Results 1 of 3");
  expect((await archiveOf(page, 7))!.results).toContain("Results 1 of 3");
  // Order 17, now won: its kept wiring is not kept; it opens failing again.
  await toOrderList(page);
  await openFromList(page, 17);
  await waitBoardOpen(page, 17);
  expect(await wiringNow(page)).not.toEqual(fix17.split("; ").sort());

  // One character changed: CODE NOT READ, nothing changes.
  const at = 20;
  const changed = codeA.slice(0, at) + (codeA[at] === "A" ? "B" : "A") + codeA.slice(at + 1);
  const snapshot = await kept(page);
  expect(await readCode(page, changed)).toEqual([CODE_NOT_READ]);
  await closePaper(page);
  expect(await kept(page)).toEqual(snapshot);
  // A's code again: read, nothing new.
  expect(await readCode(page, codeA)).toEqual([SAVE_CODE_READ]);
  await closePaper(page);
  expect(await kept(page)).toEqual(snapshot);
  // The field closed before READ: nothing read, nothing printed.
  await readCode(page, codeA, { close: true });
  await page.waitForTimeout(500);
  await expect(page.locator('[data-paper="code-read"]')).toHaveCount(0);
  expect(await kept(page)).toEqual(snapshot);

  // A code from a build with GameVersion raised.
  const key = keyFor(info);
  const later = await browserFor(browser, info, key);
  await setServer(later.page, key, "build=2");
  await prepare(later.ctx, { seed: seedFile("act1-won") });
  await openGame(later.page);
  const code2 = await saveCodeOf(later.page);
  await later.ctx.close();
  expect(await readCode(page, code2)).toEqual([NEWER_CODE]);
  await closePaper(page);
  expect(await kept(page)).toEqual(snapshot);
});

test("SAVE-04 no keeping: storage that rejects every write plays on, says so once; a private window plays and keeps till closed", async ({ browser }, info) => {
  const blocked = await browserFor(browser, info, null, () => {
    Storage.prototype.setItem = function () {
      throw new DOMException("The test browser rejects every write.", "QuotaExceededError");
    };
  });
  const page = blocked.page;
  await newGame(page);
  await playMisfire(page);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitBoardOpen(page, 1);
  await runOrder(page, 1, W[1]);
  await closePaper(page);
  await toOrderList(page);
  await waitWhole(page);
  expect(await paperLines(page)).toEqual([KEEPS_NO_RECORDS]);
  await shot(page, info, "save-04-no-records");
  await closePaper(page);
  await expect(orderRow(page, 1)).toHaveAttribute("data-won", "true");
  await expect(orderRow(page, 2)).toBeVisible();
  // Once: the order list again prints nothing.
  await openFromList(page, 2);
  await waitBoardOpen(page, 2);
  await toOrderList(page);
  await page.waitForTimeout(800);
  await expect(page.locator(".tc-frame:not([hidden]) .tc-paper")).toHaveCount(0);
  // Reloaded: nothing was kept, a new game.
  await reopen(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 20_000 });
  await blocked.ctx.close();

  // A private window (a fresh browser context keeps writes until it closes): plays and keeps, no notice.
  const priv = await browserFor(browser, info, null);
  await newGame(priv.page);
  await playMisfire(priv.page);
  await closePaper(priv.page);
  await waitWhole(priv.page);
  await closePaper(priv.page);
  await waitBoardOpen(priv.page, 1);
  await runOrder(priv.page, 1, W[1]);
  await closePaper(priv.page);
  await toOrderList(priv.page);
  await priv.page.waitForTimeout(800);
  await expect(priv.page.locator(".tc-frame:not([hidden]) .tc-paper")).toHaveCount(0);
  await expect(orderRow(priv.page, 1)).toHaveAttribute("data-won", "true");
  expect((await kept(priv.page))!.won).toEqual([1]);
  await priv.ctx.close();
});

test("SAVE-05 version: a save from GameVersion 1 read by build 2 drops order 4's reports and wiring, keeps the rest, says so once", async ({ browser }, info) => {
  const key = keyFor(info);
  const { ctx, page } = await browserFor(browser, info, key);
  await prepare(ctx, {
    seed: {
      runs: [
        { order: 1, wiring: "IN → World Council" },
        { order: 1, wiring: W[1] },
        { order: 2, wiring: W[2] },
        { order: 3, wiring: W[3] },
        { order: 4, wiring: "IN → LAMINATOR 1; LAMINATOR 1 → Archive" },
        { order: 4, wiring: W[4] },
        { order: 4, wiring: W4_TIME },
      ],
      found: { 4: [0] },
      memos: [1],
      wirings: { 4: W[4] },
    },
  });
  await openGame(page);
  await activeWorker(page);
  const k1 = (await kept(page))!;
  expect(k1.lamps).toContain(4);
  expect(k1.parsMet[4]).toEqual(["wires", "time"]);
  const code1 = await saveCodeOf(page);
  // The server serves build 2; the page finds it; every page closed, the game opens on build 2.
  await setServer(page, key, "build=2");
  await page.reload();
  await waiting(page);
  const v2 = await reopenFresh(ctx);
  expect(await version(v2)).toBe(2);
  await waitWhole(v2);
  expect(await paperLines(v2)).toEqual([EARLIER_DROPPED]);
  await shot(v2, info, "save-05-dropped");
  await closePaper(v2);
  const k2 = (await kept(v2))!;
  expect(k2.version).toBe(2);
  expect(k2.won).toEqual(k1.won);
  expect(k2.parsMet[4]).toEqual(["wires", "time"]);
  expect(k2.lamps).toContain(4);
  expect(k2.found[4]).toEqual([0]);
  // Order 4 opens on its opening wiring.
  await openFromList(v2, 4);
  await waitBoardOpen(v2, 4);
  expect(await wiringNow(v2)).toEqual([]);
  // The archive: order 4's reports dropped, its found result listed by its rewritten line.
  await openArchive(v2);
  const a4 = (await archiveOf(v2, 4))!;
  expect(a4.results).toContain("Results 1 of 3");
  expect(a4.rows).toEqual([{ lead: V2_RESULT_TEXT, second: "", report: null, result: "0", dropped: true }]);
  expect((await archiveOf(v2, 3))!.rows.length).toBeGreaterThan(0);
  // Closed and opened again: said once.
  await reopen(v2);
  await expect.poll(() => screen(v2), { timeout: 20_000 }).toBe("orderList");
  await v2.waitForTimeout(800);
  await expect(v2.locator(".tc-frame:not([hidden]) .tc-paper")).toHaveCount(0);
  await ctx.close();

  // A second browser on build 2 reads the code from GameVersion 1: what fits merges; the dropped line prints with READ's lines.
  const key2 = `${key}b`;
  const b = await browserFor(browser, info, key2);
  await setServer(b.page, key2, "build=2");
  await prepare(b.ctx, { seed: { won: [1], memos: [1] } });
  await openGame(b.page);
  expect(await version(b.page)).toBe(2);
  const read = await readCode(b.page, code1);
  expect(read[0]).toBe(SAVE_CODE_READ);
  expect(read.at(-1)).toBe(EARLIER_DROPPED);
  expect((await kept(b.page))!.won).toEqual([1, 2, 3, 4]);
  await b.ctx.close();
});

// ---------- Settings ----------

test("SETTING-01 sound: AUDIO off stops every sound at once, on plays again; on the board, order list and archive; kept", async ({ page, context }, info) => {
  await newGame(page);
  // The game sets no audio session type.
  expect(await page.evaluate(() => (navigator as unknown as { audioSession?: { type: string } }).audioSession?.type ?? "auto")).toBe("auto");
  const sound = () => page.evaluate(() => (window as unknown as { __tc2: { game: { sound: { muted: boolean; context(): BaseAudioContext | null } } } }).__tc2.game.sound.muted);
  const lamp = (scr: string) => frame(page, scr).locator('[data-control="audio"] [data-piece="lamp-unit"], [data-control="audio"] [data-piece="lamp"]').first();
  const flip = (scr: string) => frame(page, scr).locator('[data-control="audio"] button').click();
  expect(await sound()).toBe(false);
  // Off during the opening misfire's full alarm.
  const win = (await frameOf(page).locator(".tc-window").boundingBox())!;
  await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", "alarm", { timeout: 60_000 });
  await page.evaluate(() => {
    const w = window as unknown as { __tc2: { game: { sound: { play: (...a: unknown[]) => unknown } } }; __after: boolean[] };
    const s = w.__tc2.game.sound;
    const orig = s.play.bind(s);
    w.__after = [];
    s.play = (...a: unknown[]) => {
      const r = orig(...a);
      w.__after.push(r !== null);
      return r;
    };
  });
  await flip("board");
  expect(await sound()).toBe(true);
  await expect(lamp("board")).toHaveAttribute("data-state", "off");
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 10_000 });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as unknown as { __after: boolean[] }).__after.every((x) => !x))).toBe(true);
  await flip("board");
  expect(await sound()).toBe(false);
  await expect(lamp("board")).toHaveAttribute("data-state", "steady");
  await waitWhole(page);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitBoardOpen(page, 1);
  // The order list and the archive.
  await toOrderList(page);
  await flip("orderList");
  expect(await sound()).toBe(true);
  await expect(lamp("orderList")).toHaveAttribute("data-state", "off");
  await flip("orderList");
  expect(await sound()).toBe(false);
  await openArchive(page);
  await flip("archive");
  expect(await sound()).toBe(true);
  await expect(lamp("archive")).toHaveAttribute("data-state", "off");
  await shot(page, info, "setting-01-archive-off");
  // Kept: off after a reload.
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toMatch(/board|orderList/);
  expect(await sound()).toBe(true);
  await expect(lamp((await screen(page))!)).toHaveAttribute("data-state", "off");
  expect(await context.cookies()).toEqual([]);
});

