// The Product steps' acceptance tests (build/acceptance-product.md), one test each, named by step id, against the test build
// under /transmission-control-2/. CountAddress is the test server's local counter, under this test's own key; nothing is sent to
// any outside server.
import { expect, test, type Browser, type BrowserContext, type Page, type Request, type TestInfo } from "@playwright/test";
import { frameOf } from "./board-kit";
import {
  W,
  closePaper,
  counts,
  keyFor,
  newGame,
  openFromList,
  openGame,
  orderRow,
  paperLines,
  playMisfire,
  prepare,
  reopen,
  runOrder,
  screen,
  setServer,
  toOrderList,
  waitBoardOpen,
  waitWhole,
  workerActive,
  workerSettled,
  workerWaiting,
} from "./game-kit";

test.setTimeout(240_000);

const SEND_WAIT = 30;
const HOLD = "event lock taken, write not made";

/** The events the counter received, as their `p` field, oldest first. */
const sent = async (page: Page, key: string) => (await counts(page, key)).map((c) => new URL(c.url, "http://counter").searchParams.get("p"));
const queueOf = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem("tc2.events") ?? "null") as { queue: { name: string; order: number; version: number }[] } | null)?.queue ?? []);

async function browserFor(browser: Browser, info: TestInfo, key: string, init?: () => void): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: info.project.use.viewport!, baseURL: info.project.use.baseURL! });
  await prepare(ctx, { key });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await page.request.get(`/__test/reset?key=${key}`);
  return { ctx, page };
}

/** The opening misfire played and act 1's memo closed: order 1 open. */
async function throughMisfire(page: Page): Promise<void> {
  await newGame(page);
  await playMisfire(page);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitBoardOpen(page, 1);
}

test("MEAS-01 order_start: at the misfire's first tap, at each order's first open, once", async ({ browser }, info) => {
  const key = keyFor(info);
  const { ctx, page } = await browserFor(browser, info, key);
  await newGame(page);
  await page.waitForTimeout(1000);
  expect(await sent(page, key)).toEqual([]);
  await playMisfire(page);
  await expect.poll(() => sent(page, key)).toEqual(["order_start-1-1"]);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitBoardOpen(page, 1);
  await runOrder(page, 1, W[1]);
  await closePaper(page);
  await expect.poll(() => sent(page, key)).toEqual(["order_start-1-1", "order_finish-1-1"]);
  await openFromList(page, 2);
  await waitBoardOpen(page, 2);
  await expect.poll(() => sent(page, key)).toEqual(["order_start-1-1", "order_finish-1-1", "order_start-2-1"]);
  await openFromList(page, 2);
  await waitBoardOpen(page, 2);
  await page.waitForTimeout(1000);
  expect(await sent(page, key)).toEqual(["order_start-1-1", "order_finish-1-1", "order_start-2-1"]);
  for (const c of await counts(page, key)) expect(new URL(c.url, "http://counter").searchParams.get("e")).toBe("true");
  await ctx.close();
});

test("MEAS-02 order_finish: a kept win's first time; a replay or a pasted code's win makes none", async ({ browser }, info) => {
  const key = keyFor(info);
  // A save code from another browser that holds order 2 won.
  const other = await browser.newContext({ viewport: info.project.use.viewport!, baseURL: info.project.use.baseURL! });
  await prepare(other, { seed: { won: [1, 2], memos: [1] } });
  const op = await other.newPage();
  await openGame(op);
  await toOrderList(op);
  await op.locator('.tc-frame[data-screen="orderList"] .tc-cbar .tc-plate[aria-label="SAVE CODE"]').click();
  await waitWhole(op);
  const code = (await paperLines(op))[1]!.replace(/\s+/g, "");
  await other.close();

  const { ctx, page } = await browserFor(browser, info, key);
  await prepare(ctx, { seed: { runs: [{ order: 1, wiring: "IN → World Council" }], memos: [1], events: { flags: ["order_start-1"], queue: [] } } });
  await openGame(page);
  const finishes = async () => (await sent(page, key)).filter((p) => p!.startsWith("order_finish"));
  await runOrder(page, 1, W[1]);
  await closePaper(page);
  await expect.poll(finishes).toEqual(["order_finish-1-1"]);
  await runOrder(page, 1, W[1]);
  await closePaper(page);
  await page.waitForTimeout(1000);
  expect(await finishes()).toEqual(["order_finish-1-1"]);
  // The code's win of order 2: no event, its flag unset.
  await toOrderList(page);
  await page.locator('.tc-frame[data-screen="orderList"] .tc-cbar .tc-plate[aria-label="LOAD SAVE CODE"]').click();
  await waitWhole(page);
  await page.locator('[data-control="code-field"]').fill(code);
  await page.locator('[data-control="read"]').click();
  await expect(page.locator('[data-paper="code-read"]')).toBeVisible();
  await waitWhole(page);
  await closePaper(page);
  await page.waitForTimeout(1000);
  expect(await finishes()).toEqual(["order_finish-1-1"]);
  // This browser's first run that wins it makes one.
  await runOrder(page, 2, W[2]);
  await closePaper(page);
  await expect.poll(finishes).toEqual(["order_finish-1-1", "order_finish-2-1"]);
  await ctx.close();
});

test("MEAS-03 send: queued offline, sent oldest first from the page; a stall past SendWait keeps it; two pages; a later version", async ({ browser }, info) => {
  const key = keyFor(info);
  const { ctx, page } = await browserFor(browser, info, key);
  const fromPage: Request[] = [];
  ctx.on("request", (r) => r.url().includes("/__count/") && fromPage.push(r));
  // The game kept by this browser, then the connection off: a new game.
  await newGame(page);
  await workerActive(page);
  await ctx.setOffline(true);
  await reopen(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 20_000 });
  await throughMisfire2(page);
  await runOrder(page, 1, W[1]);
  await closePaper(page);
  await openFromList(page, 2);
  await waitBoardOpen(page, 2);
  expect(await sent(page, key)).toEqual([]);
  expect((await queueOf(page)).map((e) => `${e.name}-${e.order}-${e.version}`)).toEqual(["order_start-1-1", "order_finish-1-1", "order_start-2-1"]);
  // Back online: one request per event, oldest first, then the queue is empty. Sending starts when the browser reports it is
  // back online. Firefox under Playwright does not fire `online` in a page it loaded while offline (navigator.onLine turns true
  // with no event), so there the next open starts the sending instead, and the test says so.
  await page.evaluate(() => addEventListener("online", () => ((window as unknown as { __online: boolean }).__online = true)));
  await ctx.setOffline(false);
  await page.waitForTimeout(1000);
  if (!(await page.evaluate(() => (window as unknown as { __online?: boolean }).__online === true))) {
    test.info().annotations.push({ type: "engine", description: `${info.project.name}: no online event after the connection returned; the next open sends` });
    await reopen(page);
    await expect.poll(() => screen(page), { timeout: 20_000 }).toMatch(/board|orderList/);
  }
  await expect.poll(() => sent(page, key), { timeout: 20_000 }).toEqual(["order_start-1-1", "order_finish-1-1", "order_start-2-1"]);
  await expect.poll(() => queueOf(page)).toEqual([]);
  // Each a GET with no cookie and no referrer, made by the page, never a worker.
  for (const c of await counts(page, key)) {
    expect(c.method).toBe("GET");
    expect(c.cookie).toBeNull();
    expect(c.referer).toBeNull();
    expect([...new URL(c.url, "http://counter").searchParams.keys()].sort()).toEqual(["e", "p"]);
  }
  expect(fromPage.length).toBeGreaterThanOrEqual(3);
  for (const r of fromPage) {
    expect(r.serviceWorker()).toBeNull();
    expect(r.frame().page()).toBe(page);
  }

  // The receiver stalls past SendWait: the event stays queued, play goes on; a reload sends it.
  await setServer(page, key, "count=stall");
  const t0 = Date.now();
  await runOrder(page, 2, W[2]);
  await closePaper(page);
  await expect.poll(() => sent(page, key)).toContain("order_finish-2-1");
  // Play on while the request stalls.
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  await page.waitForTimeout(Math.max(0, (SEND_WAIT + 2) * 1000 - (Date.now() - t0)));
  expect((await queueOf(page)).map((e) => `${e.name}-${e.order}`)).toEqual(expect.arrayContaining(["order_finish-2"]));
  await setServer(page, key, "count=answer");
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toMatch(/board|orderList/);
  await expect.poll(() => queueOf(page), { timeout: 20_000 }).toEqual([]);
  expect((await sent(page, key)).filter((p) => p === "order_finish-2-1").length).toBe(2);

  // Two pages open: an event queued in one is sent once.
  const second = await ctx.newPage();
  await openGame(second);
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  await page.waitForTimeout(3000);
  expect((await sent(page, key)).filter((p) => p === "order_start-3-1")).toHaveLength(1);
  await second.close();

  // An event queued, then the game opened under a build with GameVersion raised: it keeps the version it was made under.
  await setServer(page, key, "count=refuse");
  await runOrder(page, 3, W[3]);
  await closePaper(page);
  await expect.poll(async () => (await queueOf(page)).map((e) => `${e.name}-${e.order}-${e.version}`)).toContain("order_finish-3-1");
  await setServer(page, key, "build=2&count=answer");
  await page.reload();
  await workerWaiting(page);
  await page.close();
  const look = await ctx.newPage();
  await look.goto("/sandbox.html?order=1");
  await workerSettled(look);
  await openGame(look);
  expect(await look.evaluate(() => (window as unknown as { __tc2: { version: number } }).__tc2.version)).toBe(2);
  await expect.poll(() => sent(look, key), { timeout: 20_000 }).toContain("order_finish-3-1");
  await ctx.close();
});

/** The misfire through its memo, on a page already in standby. */
async function throughMisfire2(page: Page): Promise<void> {
  await playMisfire(page);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitBoardOpen(page, 1);
}

test("MEAS-04 event flags: two pages open order 2 at once, one event; in a browser that keeps nothing, each page its own", async ({ browser }, info) => {
  const key = keyFor(info);
  const { ctx, page: a } = await browserFor(browser, info, key);
  await prepare(ctx, {
    seed: { runs: [{ order: 1, wiring: "IN → World Council" }, { order: 1, wiring: W[1] }], memos: [1], events: { flags: ["order_start-1", "order_finish-1"], queue: [] } },
    holds: [HOLD],
  });
  await openGame(a);
  const b = await ctx.newPage();
  await openGame(b);
  await expect(orderRow(a, 2)).toBeVisible();
  await expect(orderRow(b, 2)).toBeVisible();
  // Both open order 2 at once: the page that takes the event lock first holds there before its write.
  await Promise.all([orderRow(a, 2).click(), orderRow(b, 2).click()]);
  const held = async () =>
    Promise.all([a, b].map((p) => p.evaluate(() => (window as unknown as { __tc2: { held: string | null } }).__tc2.held)));
  await expect.poll(held).toContain(HOLD);
  const [ha] = await held();
  const first = ha === HOLD ? a : b;
  const later = first === a ? b : a;
  await later.waitForTimeout(500);
  expect(await later.evaluate(() => (window as unknown as { __tc2: { held: string | null } }).__tc2.held)).toBeNull();
  expect(await sent(a, key)).toEqual([]);
  await first.evaluate((h) => (window as unknown as { __tc2: { release(p: string): void } }).__tc2.release(h), HOLD);
  await expect.poll(() => sent(a, key)).toEqual(["order_start-2-1"]);
  await a.waitForTimeout(1500);
  expect(await sent(a, key)).toEqual(["order_start-2-1"]);
  // Reloaded, order 2 again: its flag is set, no event.
  for (const p of [a, b]) {
    await p.evaluate(() => localStorage.removeItem("tc2aid.holds"));
    await reopen(p);
    await expect.poll(() => screen(p), { timeout: 20_000 }).toMatch(/board|orderList/);
    await openFromList(p, 2);
    await waitBoardOpen(p, 2);
  }
  await a.waitForTimeout(1500);
  expect(await sent(a, key)).toEqual(["order_start-2-1"]);
  await ctx.close();

  // A browser that keeps nothing: each page keeps its own flags until it closes, so each page counts once.
  const key2 = `${key}n`;
  const n = await browserFor(browser, info, key2, () => {
    Storage.prototype.setItem = function () {
      throw new DOMException("The test browser rejects every write.", "QuotaExceededError");
    };
  });
  const n2 = await n.ctx.newPage();
  for (const p of [n.page, n2]) {
    await throughMisfire(p);
    await runOrder(p, 1, W[1]);
    await closePaper(p);
    await toOrderList(p);
    await waitWhole(p);
    await closePaper(p);
  }
  await Promise.all([orderRow(n.page, 2).click(), orderRow(n2, 2).click()]);
  await expect.poll(async () => (await sent(n.page, key2)).filter((p) => p === "order_start-2-1").length).toBe(2);
  await n.page.waitForTimeout(1500);
  const all = await sent(n.page, key2);
  expect(all.filter((p) => p === "order_start-1-1")).toHaveLength(2);
  expect(all.filter((p) => p === "order_start-2-1")).toHaveLength(2);
  await n.ctx.close();
});
