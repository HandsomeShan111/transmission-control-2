// The Campaign steps' acceptance tests (build/acceptance-campaign.md), one test each, named by step id, against the test build
// under /transmission-control-2/; and the order list and archive screen checks, and FEEL-11, 12, 13 and 16 timings
// (build/acceptance.md, build/acceptance-feel.md). Wiring goes through the real UI; saves are seeded from test files.
import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { control, cutByDrag, frameOf } from "./board-kit";
import {
  D,
  GAME,
  RESULT_1_1,
  W,
  achievementRows,
  archiveOf,
  closePaper,
  frame,
  kept,
  listControl,
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
  printsAtOnce,
  recordSounds,
  reopen,
  reportLines,
  runAndSkip,
  runOrder,
  screen,
  seedFile,
  setWiring,
  shot,
  sounds,
  tapPaper,
  testWiring,
  titlePlate,
  toOrderList,
  waitBoardOpen,
  waitWhole,
  wiringNow,
  workerActive,
} from "./game-kit";

test.setTimeout(180_000);

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const LEAD_1_2 = "LAMINATOR laminated the treaty and is keeping it. The ceremony moves inside the machine.";
const LEAD_1_3 = "Nothing left the input tray. The Council signed an empty table, now ratified.";
const COMMEND = {
  paperTrail: "COMMENDATION: Paper Trail. Every RECORDS incident on file. The cabinet no longer closes.",
  secondOpinion: "COMMENDATION: Second Opinion. Two right answers on file. The committee cannot pick one.",
  underBudget: "COMMENDATION: Under Budget. Fewer wires, less time. Accounting suspects a typo.",
  lineNoise: "COMMENDATION: Line Noise. All fifteen COMMS failures transcribed. The colonies want them broadcast.",
  kitchen: "COMMENDATION: Kitchen Incidents. Health inspectors have read all fifteen GALLEY incidents. The Canteen is closed.",
};
const bells = async (page: Page) => (await sounds(page)).filter((s) => s.name === "bell").length;

/** Whether a row lies inside its list's scrolled view. */
const inView = (page: Page, n: number) =>
  orderRow(page, n).evaluate((row) => {
    const list = row.closest('[data-part="order-list"]')!.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    return r.top >= list.top - 1 && r.bottom <= list.bottom + 1;
  });

/** Reads the save code the order list's SAVE CODE prints. */
async function saveCodeOf(page: Page): Promise<string> {
  await toOrderList(page);
  await page.locator('.tc-frame[data-screen="orderList"] .tc-cbar .tc-plate[aria-label="SAVE CODE"]').click();
  await waitWhole(page);
  const lines = await paperLines(page);
  expect(lines[0]).toBe("SAVE CODE");
  const code = lines[1]!.replace(/\s+/g, "");
  await closePaper(page);
  return code;
}

/** LOAD SAVE CODE on the order list: pastes `code` into the field and taps READ; returns the result's lines. */
async function readCode(page: Page, code: string): Promise<string[]> {
  await toOrderList(page);
  await page.locator('.tc-frame[data-screen="orderList"] .tc-cbar .tc-plate[aria-label="LOAD SAVE CODE"]').click();
  await waitWhole(page);
  await paper(page).locator('[data-piece="field"]').fill(code);
  await paper(page).locator('.tc-plate[aria-label="READ"]').click();
  await page.waitForTimeout(300);
  await waitWhole(page);
  return paperLines(page);
}

// ---------- Incident archive ----------

test("ARCHIVE-01 file: a report is filed once, its new result found", async ({ page }, info) => {
  await newGame(page);
  await playMisfire(page);
  await closePaper(page);
  await waitWhole(page);
  await closePaper(page);
  await waitBoardOpen(page, 1);
  expect(await wiringNow(page)).toEqual(["IN → World Council"]);

  await cutByDrag(page, "IN");
  await runAndSkip(page);
  await waitWhole(page);
  const first = await paperLines(page);
  expect(first[0]).toBe(LEAD_1_3);
  expect(first).toContain("FILED: 2 of 3.");
  await closePaper(page);
  await openArchive(page);
  const a = (await archiveOf(page, 1))!;
  expect(a.results).toContain("Results 2 of 3");
  expect(a.rows.map((r) => r.lead)).toEqual([RESULT_1_1, LEAD_1_3]);
  await shot(page, info, "archive-01-after-first");

  // The same wiring again: the same report, filed once; its result filed, so no FILED line.
  await toOrderList(page);
  await orderRow(page, 1).click();
  await waitBoardOpen(page, 1);
  expect(await wiringNow(page)).toEqual([]);
  await runAndSkip(page);
  await waitWhole(page);
  const again = await paperLines(page);
  expect(again[0]).toBe(LEAD_1_3);
  expect(again.some((l) => l.startsWith("FILED"))).toBe(false);
  await closePaper(page);
  await openArchive(page);
  const b = (await archiveOf(page, 1))!;
  expect(b.results).toContain("Results 2 of 3");
  expect(b.rows.map((r) => r.lead)).toEqual([RESULT_1_1, LEAD_1_3]);
  await shot(page, info, "archive-01-after-second");
});

test("ARCHIVE-02 browse: rows in result order then newest, second wiring marked, achievements beside each act", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("archive-02") });
  await openGame(page);
  await openArchive(page);
  const a1 = (await archiveOf(page, 1))!;
  expect(a1.results).toContain("Results 3 of 3");
  expect(a1.rows.map((r) => r.lead)).toEqual([RESULT_1_1, LEAD_1_2, LEAD_1_3, "Signing ceremony: delivered as ordered."]);
  expect(a1.rows.map((r) => r.result)).toEqual(["0", "1", "2", null]);
  expect(a1.rows[3]!.second).toContain("2 wires, 4 beats");
  expect(a1.rows.slice(0, 3).every((r) => r.second === "")).toBe(true);
  // Order 5: two wins, newest first; the second, INSPECTOR first, lit the lamp.
  const a5 = (await archiveOf(page, 5))!;
  expect(a5.results).toContain("Results 0 of 3");
  expect(a5.rows).toHaveLength(2);
  expect(a5.rows[0]!.second).toBe("5 wires, 5 beats | SECOND WIRING");
  expect(a5.rows[1]!.second).toBe("4 wires, 5 beats");
  // Order 6: unlocked, no report, no result; order 7 not listed.
  const a6 = (await archiveOf(page, 6))!;
  expect(a6.results).toContain("Results 0 of 3");
  expect(a6.rows).toEqual([]);
  expect(await archiveOf(page, 7)).toBeNull();
  // Beside each act: its three achievements as medals, in kind order, none earned: each named, dim, with its kind's progress.
  const m1 = await achievementRows(page, 1);
  expect(m1.map((m) => [m.name, m.earned])).toEqual([
    ["Paper Trail", false],
    ["Second Opinion", false],
    ["Under Budget", false],
  ]);
  expect(m1[0]!.text).toBe("Results 3 of 15");
  expect(m1[1]!.text).toMatch(/^Second wirings \d+ of 3$/);
  expect(m1[2]!.text).toMatch(/^Pars \d+ of \d+$/);
  expect(m1[0]!.label).toBe("Paper Trail, not earned. Results 3 of 15");
  const m2 = await achievementRows(page, 2);
  expect(m2.map((m) => [m.name, m.earned])).toEqual([
    ["Line Noise", false],
    ["Alternate Frequency", false],
    ["Clear Signal", false],
  ]);
  // The wall fits the archive's width: two or more medals to a row, no sideways scroll.
  const wall = await frame(page, "archive").locator('[data-part="medals"]').first().evaluate((g) => {
    const tops = [...g.querySelectorAll('[data-piece="medal"]')].map((m) => Math.round(m.getBoundingClientRect().top));
    const list = g.closest('[data-part="archive-list"]')!;
    return { perRow: tops.filter((t) => t === tops[0]).length, inside: g.getBoundingClientRect().right <= list.getBoundingClientRect().right + 0.5, sideways: list.scrollWidth > list.clientWidth || document.documentElement.scrollWidth > innerWidth };
  });
  expect(wall.perRow).toBeGreaterThanOrEqual(2);
  expect(wall.inside).toBe(true);
  expect(wall.sideways).toBe(false);
  await shot(page, info, "archive-02-browse");
  // A done act's heading prints its debrief again, as it stands, its progress lines as the medals word them.
  await frame(page, "archive").locator('[data-act="1"]').click();
  expect(await printsAtOnce(page)).toBe(true);
  const debrief = await paperLines(page);
  expect(debrief[0]).toBe(RESULT_1_1);
  expect(debrief).toContain("Results 3 of 15");
  for (const m of m1) expect(debrief).toContain(m.text);
  expect(debrief[debrief.length - 1]).toBe("ORDER 6 UNLOCKED: Latin hour.");
  await shot(page, info, "archive-02-debrief");
  await closePaper(page);
  expect(await screen(page)).toBe("archive");
});

test("ARCHIVE-03 reprint: a filed report prints at once with its share control", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("archive-02") });
  await openGame(page);
  await openArchive(page);
  const row = frame(page, "archive").locator('[data-order="1"] ~ [data-report]').nth(3);
  await row.click();
  expect(await printsAtOnce(page)).toBe(true);
  const lines = await paperLines(page);
  expect(lines[0]).toBe("Signing ceremony: delivered as ordered.");
  expect(lines).toContain("Wires 2.");
  await expect(paper(page).locator('[data-control="share-open"]')).toBeVisible();
  await shot(page, info, "archive-03-reprint");
  await closePaper(page);
  expect(await screen(page)).toBe("archive");
});

// ---------- Campaign ----------

test("CAMPAIGN-01 opening misfire: AUDIO only flips, the guard, the skip, the alarm tap, memo, order 1 on its opening", async ({ page, browser }, info) => {
  await newGame(page);
  await shot(page, info, "campaign-01-standby");
  // AUDIO flips in standby and starts nothing.
  // The switch is down while sound is off (SETTING-01).
  const audio = frameOf(page).locator('[data-control="audio"] button');
  await audio.click();
  await expect(audio).toHaveAttribute("aria-pressed", "true");
  await audio.click();
  await expect(audio).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(300);
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true");
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  // The first tap runs the night staff's wiring; a tap inside OpeningGuard does nothing; one after it skips.
  const win = (await frameOf(page).locator(".tc-window").boundingBox())!;
  const t0 = Date.now();
  await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", "running", { timeout: 2000 });
  await page.waitForTimeout(Math.max(0, 500 - (Date.now() - t0)));
  await page.mouse.click(win.x + 20, win.y + 20);
  await page.waitForTimeout(Math.max(0, D.OpeningGuard * 1000 - 100 - (Date.now() - t0)));
  await expect(frameOf(page)).toHaveAttribute("data-run", "running");
  await page.waitForTimeout(Math.max(0, D.OpeningGuard * 1000 + 150 - (Date.now() - t0)));
  await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", /alarm|printing/, { timeout: 2000 });
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 10_000 });
  await waitWhole(page);
  const report = await paperLines(page);
  expect(report[0]).toBe(RESULT_1_1);
  expect(report).toContain("FILED: 1 of 3.");
  await closePaper(page);
  // Act 1's memo, then order 1 on the night wiring.
  await waitWhole(page);
  const memo = await paperLines(page);
  expect(memo).toContain("RECORDS");
  await shot(page, info, "campaign-01-memo");
  await closePaper(page);
  await waitBoardOpen(page, 1);
  expect(await wiringNow(page)).toEqual(["IN → World Council"]);
  await expect(frameOf(page)).toHaveAttribute("data-standby", "false");
  await shot(page, info, "campaign-01-order-1");

  // A second new game: a tap once the full alarm lights prints the report at once.
  const ctx2 = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  const p2 = await ctx2.newPage();
  await newGame(p2);
  const w2 = (await frameOf(p2).locator(".tc-window").boundingBox())!;
  await p2.mouse.click(w2.x + 20, w2.y + 20);
  await expect(frameOf(p2)).toHaveAttribute("data-run", "alarm", { timeout: 60_000 });
  await p2.waitForTimeout(150);
  await p2.mouse.click(w2.x + 20, w2.y + 20);
  await expect(frameOf(p2)).toHaveAttribute("data-run", "printing", { timeout: 2000 });
  expect(await printsAtOnce(p2)).toBe(true);
  expect((await paperLines(p2))[0]).toBe(RESULT_1_1);
  await ctx2.close();
});

test("CAMPAIGN-02 unlock: a first win unlocks the next order; an act's last first win ends its debrief", async ({ page, context }, info) => {
  await prepare(context, {
    seed: { runs: [{ order: 1, wiring: "IN → World Council" }, ...[1, 2, 3].map((n) => ({ order: n, wiring: W[n as 1] }))], memos: [1] },
  });
  await openGame(page);
  await expect(orderRow(page, 4)).toBeVisible();
  await expect(orderRow(page, 5)).toHaveCount(0);

  const four = await runOrder(page, 4, W[4]);
  expect(four[four.length - 1]).toBe("ORDER 5 UNLOCKED: Museum split.");
  await shot(page, info, "campaign-02-order-4");
  await closePaper(page);
  await toOrderList(page);
  await expect(orderRow(page, 5)).toBeVisible();
  await expect(orderRow(page, 6)).toHaveCount(0);

  const five = await runOrder(page, 5, W[5]);
  expect(five.some((l) => l.includes("UNLOCKED"))).toBe(false);
  await closePaper(page);
  await waitWhole(page);
  const debrief = await paperLines(page);
  expect(debrief[debrief.length - 1]).toBe("ORDER 6 UNLOCKED: Latin hour.");
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await closePaper(page);
  await toOrderList(page);
  await expect(orderRow(page, 6)).toBeVisible();
  await expect(frame(page, "orderList").locator('[data-act="2"]')).toBeVisible();

  // A win of an order already won unlocks nothing more.
  const one = await runOrder(page, 1, W[1]);
  expect(one.some((l) => l.includes("UNLOCKED"))).toBe(false);
  await closePaper(page);
  await toOrderList(page);
  await expect(orderRow(page, 7)).toHaveCount(0);
  for (const n of range(1, 6)) await expect(orderRow(page, n)).toHaveCount(1);
  await shot(page, info, "campaign-02-order-list");
});

test("CAMPAIGN-03 act start: the memo before the act's first order, until closed; the heading prints it at once", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("act1-won") });
  await openGame(page);
  await orderRow(page, 6).click();
  await waitWhole(page);
  const memo = await paperLines(page);
  expect(memo).toContain("COMMS");
  expect(await printsAtOnce(page, 0)).toBe(true);
  expect(await screen(page)).not.toBe("board");
  await shot(page, info, "campaign-03-memo");
  // Closed with the memo open: it was never closed, so it prints again.
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  await orderRow(page, 6).click();
  await page.waitForTimeout(200);
  expect(await printsAtOnce(page, 200)).toBe(false);
  await waitWhole(page);
  expect(await paperLines(page)).toEqual(memo);
  await closePaper(page);
  await waitBoardOpen(page, 6);
  // Closed once: order 6 opens straight away.
  await toOrderList(page);
  await orderRow(page, 6).click();
  await waitBoardOpen(page, 6);
  await expect(paper(page)).toHaveCount(0);
  // The act's heading prints its memo, at once.
  await toOrderList(page);
  await frame(page, "orderList").locator('[data-act="2"]').click();
  expect(await printsAtOnce(page)).toBe(true);
  expect(await paperLines(page)).toEqual(memo);
  await shot(page, info, "campaign-03-heading-memo");
  await closePaper(page);
});

test("CAMPAIGN-04 act end: the debrief after the act's last first win, kept over a reload, reprinted from the archive", async ({ page, context, browser }, info) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  const five = await runOrder(page, 5, W[5]);
  expect(five.some((l) => l.includes("UNLOCKED"))).toBe(false);
  await closePaper(page);
  await waitWhole(page);
  const debrief = await paperLines(page);
  expect(debrief).toEqual([
    RESULT_1_1,
    "1 Signing ceremony: Wires 2. Time 4.",
    "2 Victory parade: Wires 3. Time 4.",
    "3 Diplomatic pouch: Wires 5. Time 6.",
    "4 Archive day: Wires 5, par 5. Par met. Time 6, par 5.",
    "5 Museum split: Wires 4, par 4. Par met. Time 5.",
    "Results 1 of 15",
    "Second wirings 0 of 3",
    "Pars 2 of 3",
    "ORDER 6 UNLOCKED: Latin hour.",
  ]);
  await shot(page, info, "campaign-04-debrief");
  // Closed with the debrief on the teletype: it prints when the game next opens, before the order list.
  await reopen(page, "continue");
  await waitWhole(page);
  expect(await paperLines(page)).toEqual(debrief);
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await closePaper(page);
  await expect.poll(() => screen(page)).toBe("orderList");
  // A done act's heading in the archive prints its debrief again.
  await openArchive(page);
  await frame(page, "archive").locator('[data-act="1"]').click();
  expect(await printsAtOnce(page)).toBe(true);
  expect(await paperLines(page)).toEqual(debrief);
  await closePaper(page);

  // The last act's last order: no order follows.
  const ctx2 = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  const p2 = await ctx2.newPage();
  await prepare(ctx2, { seed: seedFile("to-29") });
  await openGame(p2);
  const last = await runOrder(p2, 30, (await testWiring(p2, 30))!);
  expect(last[0]).toMatch(/delivered as ordered\.$/);
  await closePaper(p2);
  await waitWhole(p2);
  const end = await paperLines(p2);
  expect(end[end.length - 1]).toBe("NO FURTHER ORDERS ON FILE.");
  await shot(p2, info, "campaign-04-last-debrief");
  await ctx2.close();
});

test("CAMPAIGN-05 order list: won signs, lamps, results; scrolled to the last unlocked order, then the order last opened", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("act1-won") });
  await openGame(page);
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  for (const n of range(1, 5)) await expect(orderRow(page, n)).toHaveAttribute("data-won", "true");
  await expect(orderRow(page, 6)).toHaveAttribute("data-won", "false");
  await expect(orderRow(page, 7)).toHaveCount(0);
  expect(await inView(page, 6)).toBe(true);
  await expect(orderRow(page, 1)).toContainText("Results 1 of 3");
  await expect(orderRow(page, 2)).toContainText("Results 0 of 3");
  await expect(orderRow(page, 4).locator('[data-lamp="WIRES"]')).toHaveAttribute("data-state", "steady");
  await expect(orderRow(page, 4).locator('[data-lamp="TIME"]')).toHaveAttribute("data-state", "steady");
  await expect(orderRow(page, 4).locator('[data-lamp="2ND WIRING"]')).toHaveAttribute("data-state", "steady");
  await expect(orderRow(page, 5).locator('[data-lamp="2ND WIRING"]')).toHaveAttribute("data-state", "steady");
  await expect(orderRow(page, 3).locator('[data-lamp="2ND WIRING"]')).toHaveAttribute("data-state", "off");
  await expect(orderRow(page, 1).locator("[data-lamp]")).toHaveCount(0);
  await shot(page, info, "campaign-05-order-list");
  // Opened from the list, then back with ORDERS: scrolled to the order last opened.
  await orderRow(page, 3).click();
  await waitBoardOpen(page, 3);
  await toOrderList(page);
  expect(await inView(page, 3)).toBe(true);
  // Order 6: its act's memo first, then its board.
  await orderRow(page, 6).click();
  await waitWhole(page);
  expect(await paperLines(page)).toContain("COMMS");
  await closePaper(page);
  await waitBoardOpen(page, 6);
});

test("CAMPAIGN-05 order list: a kept change under a list being read leaves it where it is", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("to-16") });
  await openGame(page);
  await expect.poll(() => screen(page)).toBe("orderList");
  const list = frame(page, "orderList").locator('[data-part="order-list"]');
  // Read half way up, then the progress changes (another page's win merged in): a row is added, the list stays put.
  const before = await list.evaluate((el) => {
    el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) / 2);
    return el.scrollTop;
  });
  expect(before).toBeGreaterThan(0);
  const rowsBefore = await list.locator("[data-order]").count();
  await page.evaluate(() => {
    const c = (window as unknown as { __tc2: { game: { campaign: { progress(): { won: number[] }; setProgress(p: unknown): void } } } }).__tc2.game.campaign;
    c.setProgress({ ...c.progress(), won: [...c.progress().won, Math.max(...c.progress().won) + 1] });
  });
  await expect(frame(page, "orderList").locator("[data-order]")).toHaveCount(rowsBefore + 1);
  const after = await frame(page, "orderList").locator('[data-part="order-list"]').evaluate((el) => el.scrollTop);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
});

test("CAMPAIGN-06 after the report: FILED, the second-wiring line, commendations with one bell, the debrief", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("c06") });
  await openGame(page);
  await recordSounds(page);
  // The missing result: FILED, then the act's results commendation, the bell once before it.
  const r = await runOrder(page, 5, W["5r3"]);
  expect(r[0]).toBe("The treaty is on show in a glass case marked 'Extinct'.");
  expect(r.slice(-2)).toEqual(["FILED: 3 of 3.", COMMEND.paperTrail]);
  expect(await bells(page)).toBe(1);
  await shot(page, info, "campaign-06-filed");
  await closePaper(page);
  // INSPECTOR before each LAMINATOR: a first win, the act's last order: nothing after the report; the debrief, the save code.
  const a = await runOrder(page, 5, W["5i"]);
  expect(a.some((l) => /^(FILED|SECOND|ROUTE|COMMENDATION|ORDER)/.test(l))).toBe(false);
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page)).at(-1)).toBe("ORDER 6 UNLOCKED: Latin hour.");
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await closePaper(page);
  // The same again: the same route, no new best, no par met for the first time.
  const b = await runOrder(page, 5, W["5i"]);
  expect(b[b.length - 1]).toBe("ROUTE ALREADY ON FILE.");
  await shot(page, info, "campaign-06-route");
  await closePaper(page);
  // LAMINATOR before INSPECTOR: the lamp lights, then two commendations, the bell once before the first.
  const before = await bells(page);
  // FEEL-09: the 2ND WIRING lamp lights as its line prints, not as the report starts: the state of the lamp as each line prints.
  await page.evaluate(() => {
    const w = window as unknown as { __lampAt: { text: string; lamp: string }[] };
    w.__lampAt = [];
    new MutationObserver((ms) => {
      for (const m of ms)
        for (const n of m.addedNodes)
          if (n instanceof HTMLElement && n.dataset.part === "paper-line")
            w.__lampAt.push({ text: (n.textContent ?? "").replace(/\s+/g, " ").trim(), lamp: document.querySelector('.tc-frame[data-screen="board"] [data-lamp="2ND WIRING"]')?.getAttribute("data-state") ?? "" });
    }).observe(document.body, { subtree: true, childList: true });
  });
  const c = await runOrder(page, 5, W[5]);
  expect(c.slice(-3)).toEqual(["SECOND WIRING FILED: Museum split.", COMMEND.secondOpinion, COMMEND.underBudget]);
  expect((await bells(page)) - before).toBe(1);
  const lampAt = await page.evaluate(() => (window as unknown as { __lampAt: { text: string; lamp: string }[] }).__lampAt);
  const wiringLine = lampAt.findIndex((x) => x.text.startsWith("SECOND WIRING FILED"));
  expect(wiringLine).toBeGreaterThan(0);
  expect(lampAt.slice(0, wiringLine).map((x) => x.lamp)).toEqual(Array(wiringLine).fill("off"));
  expect(lampAt[wiringLine]!.lamp).toBe("steady");
  await expect(frameOf(page).locator('[data-lamp="2ND WIRING"]')).toHaveAttribute("data-state", "steady");
  await shot(page, info, "campaign-06-second-wiring");
  await closePaper(page);
});

test("CAMPAIGN-06 after the report: a commendation, then the unlock line, still in double strike (ART-12)", async ({ page, context }) => {
  // Act 1 but order 4 never won, only its time par met: its first win meets the wire par, the last the act lacks, so Under Budget
  // prints before the unlock line.
  const base = seedFile("act1-won") as { runs: { order: number; wiring: string }[] };
  await prepare(context, { seed: { ...base, runs: base.runs.filter((r) => r.order !== 4), bests: { "4": { wires: 6, time: 5, wireMet: false, timeMet: true } } } });
  await openGame(page);
  await recordSounds(page);
  const lines = await runOrder(page, 4, W[4]);
  expect(lines.slice(-2)).toEqual([COMMEND.underBudget, "ORDER 5 UNLOCKED: Museum split."]);
  expect(await bells(page)).toBe(1);
  const struck = (text: string) => paper(page).locator('[data-part="paper-line"]').filter({ hasText: text }).locator('[data-part="strike2"]');
  await expect(struck("ORDER 5 UNLOCKED")).toHaveCount(1);
  await expect(struck("COMMENDATION")).toHaveCount(0);
  await closePaper(page);
});

// ---------- Achievements ----------

test("ACHIEVE-01 earn: each kind once, of the order's act", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("achieve-01") });
  await openGame(page);
  await recordSounds(page);
  await openFromList(page, 5);
  await waitBoardOpen(page, 5);
  expect(await medalsOf(page, "board")).toEqual({ sub: "0/18", aria: "MEDALS, 0 of 18 earned" });
  const r = await runOrder(page, 5, W["5r3"]);
  expect(r.slice(-2)).toEqual(["FILED: 3 of 3.", COMMEND.paperTrail]);
  // MEDALS counts a commendation as soon as it is earned, its report still on the board.
  expect(await medalsOf(page, "board")).toEqual({ sub: "1/18", aria: "MEDALS, 1 of 18 earned" });
  await closePaper(page);
  const c = await runOrder(page, 5, W[5]);
  expect(c.slice(-3)).toEqual(["SECOND WIRING FILED: Museum split.", COMMEND.secondOpinion, COMMEND.underBudget]);
  expect(await medalsOf(page, "board")).toEqual({ sub: "3/18", aria: "MEDALS, 3 of 18 earned" });
  await shot(page, info, "achieve-01-earned");
  await closePaper(page);
  const again = await runOrder(page, 5, W[5]);
  expect(again.some((l) => /^(FILED|SECOND|ROUTE|COMMENDATION|ORDER)/.test(l))).toBe(false);
  expect(await bells(page)).toBe(2);
  await closePaper(page);
  const kept = (await page.evaluate(() => (window as unknown as { __tc2: { keptView(): { earned: string[] } } }).__tc2.keptView()))!;
  expect([...kept.earned].sort()).toEqual(["Paper Trail", "Second Opinion", "Under Budget"]);
});

test("ACHIEVE-02 show: a code read prints only the commendations neither save held; the archive shows every act's three", async ({ page, context, browser }, info) => {
  const all = { won: range(1, 30), memos: range(1, 6), debriefs: range(1, 6) };
  const three = (ns: number[]) => Object.fromEntries(ns.map((n) => [String(n), [0, 1, 2]]));
  // The second browser: act 1 but order 5's last result, part of acts 2 and 3.
  await prepare(context, { seed: { ...all, found: { ...three([1, 2, 3, 4, 6, 7, 8, 11, 12]), 5: [0, 1], 13: [0, 1] } } });
  await openGame(page);
  await recordSounds(page);
  // The first browser: the rest of acts 2 and 3, and Under Budget.
  const ctxA = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  const a = await ctxA.newPage();
  await prepare(ctxA, { seed: { ...all, found: { ...three([9, 10, 14, 15]), 13: [2] }, earned: ["Under Budget"] } });
  await openGame(a);

  const r = await runOrder(page, 5, W["5r3"]);
  expect(r.slice(-2)).toEqual(["FILED: 3 of 3.", COMMEND.paperTrail]);
  await closePaper(page);
  const code = await saveCodeOf(a);
  await ctxA.close();

  const before = await bells(page);
  const read = await readCode(page, code);
  expect(read).toEqual(["SAVE CODE READ", COMMEND.lineNoise, COMMEND.kitchen]);
  // MEDALS counts the code's commendations too: Paper Trail, Under Budget from the code, Line Noise, Kitchen Incidents.
  expect(await medalsOf(page, "orderList")).toEqual({ sub: "4/18", aria: "MEDALS, 4 of 18 earned" });
  expect((await bells(page)) - before).toBe(1);
  await shot(page, info, "achieve-02-read");
  await closePaper(page);
  expect(await readCode(page, code)).toEqual(["SAVE CODE READ"]);
  await closePaper(page);

  await openArchive(page);
  for (const act of range(1, 6)) expect(await achievementRows(page, act), `act ${act}`).toHaveLength(3);
  // Earned: in colour, with its commendation's line; the rest dim, with their kind's progress.
  const act1 = await achievementRows(page, 1);
  expect(act1.map((m) => [m.name, m.earned])).toEqual([
    ["Paper Trail", true],
    ["Second Opinion", false],
    ["Under Budget", true],
  ]);
  expect(`COMMENDATION: ${act1[0]!.name}. ${act1[0]!.text}`).toBe(COMMEND.paperTrail);
  expect(`COMMENDATION: ${act1[2]!.name}. ${act1[2]!.text}`).toBe(COMMEND.underBudget);
  expect(act1[1]!.text).toMatch(/^Second wirings \d+ of 3$/);
  expect(act1[0]!.label).toBe("Paper Trail, earned. Every RECORDS incident on file. The cabinet no longer closes.");
  expect(act1[1]!.label).toMatch(/^Second Opinion, not earned\. Second wirings \d+ of 3$/);
  const [act2] = await achievementRows(page, 2);
  expect(act2!.earned).toBe(true);
  expect(`COMMENDATION: ${act2!.name}. ${act2!.text}`).toBe(COMMEND.lineNoise);
  const [act3] = await achievementRows(page, 3);
  expect(act3!.earned).toBe(true);
  expect(`COMMENDATION: ${act3!.name}. ${act3!.text}`).toBe(COMMEND.kitchen);
  // An earned medal in full colour with Ink outlines; one not earned only a dim GraphiteLight outline; both named in Cream.
  const looks = await frame(page, "archive").locator('[data-part="medals"]').first().evaluate((g) =>
    [...g.querySelectorAll('[data-piece="medal"]')].map((m) => {
      const disc = m.querySelector('[data-part="disc"]')!;
      return { fill: disc.getAttribute("fill"), stroke: disc.getAttribute("stroke"), text: getComputedStyle(m.querySelector('[data-part="medal-name"]')!).color };
    }),
  );
  expect(looks[0]).toEqual({ fill: "#e2b03a", stroke: "#1c1c1a", text: "rgb(239, 230, 204)" });
  expect(looks[1]).toEqual({ fill: "none", stroke: "#454945", text: "rgb(239, 230, 204)" });
  await shot(page, info, "achieve-02-archive");
});

// ---------- Report sharing ----------

/** The text SHARE-01 copies: the first line, then the report's lines as printed. */
const shareTextOf = async (page: Page, name: string, lines: readonly string[]) => {
  const host = new URL(page.url()).host;
  return [`Transmission Control 2, ${name}: ${host}/transmission-control-2`, ...lines].join("\n");
};

test("SHARE-01 text: the first line and the report's lines copied; refused, printed selected; the share sheet", async ({ page, context, browser, browserName }, info) => {
  // Chromium lets a test read the real clipboard; Firefox has no clipboard-read permission to grant, so there the copy is read
  // from the test build's own record (`__tc2.clipboard`) only.
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await prepare(context, { seed: seedFile("act1-won") });
  await openGame(page);
  await runOrder(page, 1, W[1]);
  const reportOnly = await reportLines(page);
  await paper(page).locator('[data-control="share-open"]').click();
  await paper(page).locator('[data-control="share-text"]').click();
  await expect.poll(() => paperText(page)).toContain("COPIED");
  // COPIED prints in the report's own foot: TEXT and PICTURE stay whole and take a tap.
  for (const c of ["share-text", "share-picture"]) {
    const hit = await paper(page)
      .locator(`[data-control="${c}"]`)
      .evaluate((el) => {
        const b = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
      });
    expect(hit, c).toBe(true);
  }
  const copied = await page.evaluate(() => (window as unknown as { __tc2: { clipboard: string[] } }).__tc2.clipboard.at(-1));
  expect(copied).toBe(await shareTextOf(page, "Signing ceremony", reportOnly));
  if (browserName === "chromium") {
    // The browser's clipboard holds the same text, and pasted into a text field it reads the same.
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(copied);
    await page.evaluate(() => {
      const f = document.createElement("textarea");
      f.id = "paste-here";
      document.body.append(f);
      f.focus();
    });
    await page.keyboard.press("ControlOrMeta+V");
    expect(await page.locator("#paste-here").inputValue()).toBe(copied);
  }
  await shot(page, info, "share-01-copied");

  // A browser that refuses the clipboard write: the text printed, selected; SELECT AND COPY.
  const ctx2 = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  const p2 = await ctx2.newPage();
  await prepare(ctx2, { seed: seedFile("act1-won"), clipboard: "refuse" });
  await openGame(p2);
  const r2 = await runOrder(p2, 1, W[1]);
  const r2Only = await reportLines(p2);
  await paper(p2).locator('[data-control="share-open"]').click();
  await paper(p2).locator('[data-control="share-text"]').click();
  await p2.waitForTimeout(300);
  await waitWhole(p2);
  const printed = await paperLines(p2);
  // A word longer than the paper's row breaks across rows: compared without the row breaks.
  const bare = (t: string) => t.replace(/\s+/g, "");
  expect(bare(printed[0]!)).toBe(bare(`Transmission Control 2, Signing ceremony: ${new URL(p2.url()).host}/transmission-control-2`));
  expect(printed.at(-1)).toBe("SELECT AND COPY");
  const selected = bare(await p2.evaluate(() => window.getSelection()?.toString() ?? ""));
  expect(selected).toContain(bare(printed[0]!));
  expect(selected).toContain(bare(r2[0]!));
  // The paper breaks GameLink at its columns; copying the whole selection carries the text itself, as one line.
  const copyEvent = await p2.evaluate(() => {
    // Read after the game's own listener ran, from the data the event itself carries.
    let text = "";
    document.addEventListener("copy", (ev) => (text = ev.clipboardData?.getData("text/plain") ?? ""), { once: true });
    const e = new ClipboardEvent("copy", { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    return { text, taken: e.defaultPrevented };
  });
  expect(copyEvent.taken).toBe(true);
  expect(copyEvent.text).toBe(await shareTextOf(p2, "Signing ceremony", r2Only));
  await shot(p2, info, "share-01-select-and-copy");
  await closePaper(p2);
  await ctx2.close();

  // A device with a share sheet: it opens with the same text.
  const ctx3 = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  await ctx3.addInitScript(() => {
    const w = window as unknown as { __shared: unknown[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d: unknown) => void w.__shared.push(d) });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  });
  const p3 = await ctx3.newPage();
  await prepare(ctx3, { seed: seedFile("act1-won") });
  await openGame(p3);
  await runOrder(p3, 1, W[1]);
  const r3Only = await reportLines(p3);
  await paper(p3).locator('[data-control="share-open"]').click();
  await paper(p3).locator('[data-control="share-text"]').click();
  await expect.poll(() => paperText(p3)).toContain("COPIED");
  const shared = (await p3.evaluate(() => (window as unknown as { __shared: { text?: string }[] }).__shared)) as { text?: string }[];
  expect(shared).toHaveLength(1);
  expect(shared[0]!.text).toBe(await shareTextOf(p3, "Signing ceremony", r3Only));
  await ctx3.close();
});

/** The PNG's size from its header. */
const pngSize = (file: string) => {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

type Made = {
  order: number;
  width: number;
  height: number;
  qr: { size: number; version: number; data: string; x: number; y: number };
  nameRows: number;
  leadRows: string[];
  leadCut: boolean;
  resultRows: string[];
  drawingHeight: number;
  rings: number;
};
const lastPicture = (page: Page) => page.evaluate(() => (window as unknown as { __tc2: { game: { sharing: { lastPicture(): unknown } } } }).__tc2.game.sharing.lastPicture()) as Promise<Made | null>;

const SHARE_02_SEED = {
  won: range(1, 8),
  memos: [1, 2],
  debriefs: [1],
  runs: [
    { order: 1, wiring: "IN → LAMINATOR" },
    { order: 2, wiring: "IN → SHREDDER; SHREDDER → SHREDDER" },
    { order: 9, wiring: "IN → TRANSLATOR; TRANSLATOR → LAMINATOR 1; LAMINATOR 1 → CENSOR; CENSOR plus → SUMMARIZER; SUMMARIZER → LAMINATOR 2; LAMINATOR 2 → TRANSLATOR" },
    { order: 1, wiring: W[1] },
  ],
};
/** The four reports' archive rows: order 1 led by its result stopped at LAMINATOR, order 2 lost, order 9, the mission report. */
const shareRows = (page: Page) => [
  frame(page, "archive").locator('[data-order="1"] ~ [data-report][data-result="1"]').first(),
  frame(page, "archive").locator('[data-order="2"] ~ [data-report][data-result="2"]').first(),
  frame(page, "archive").locator('[data-order="9"] ~ [data-report]').first(),
  frame(page, "archive").locator('[data-order="1"] ~ [data-report]:not([data-result])').first(),
];

test("SHARE-02 picture: one picture of PictureWidth by PictureHeight, offline; no download attribute; a device that shares files", async ({ page, context, browser }, info) => {
  await prepare(context, { seed: SHARE_02_SEED });
  await openGame(page);
  await workerActive(page);
  await context.setOffline(true);
  await openArchive(page);
  const host = new URL(page.url()).host;
  for (const [i, row] of shareRows(page).entries()) {
    await row.click();
    await waitWhole(page);
    await paper(page).locator('[data-control="share-open"]').click();
    const dl = page.waitForEvent("download");
    await paper(page).locator('[data-control="share-picture"]').click();
    const file = await (await dl).path();
    expect(pngSize(file)).toEqual({ width: D.PictureWidth, height: D.PictureHeight });
    await expect.poll(() => paperText(page)).toContain("SAVED");
    const made = (await lastPicture(page))!;
    expect(made.width).toBe(D.PictureWidth);
    expect(made.height).toBe(D.PictureHeight);
    expect(made.qr.size).toBe(D.QRSize);
    // The code carries GameLink as a URL a camera opens: its scheme, then GameLink.
    expect(made.qr.data).toBe(`http://${host}/transmission-control-2`);
    expect(made.drawingHeight).toBeGreaterThanOrEqual(D.PictureDrawingMin);
    if (i === 2) {
      // Order 9's lead: PictureTextRows rows, its last cut with "…", printed once (no result line).
      expect(made.leadRows).toHaveLength(D.PictureTextRows);
      expect(made.leadRows.at(-1)!.endsWith("…")).toBe(true);
      expect(made.resultRows).toEqual([]);
    }
    if (i === 0 || i === 1) expect(made.resultRows).toEqual([]);
    await shot(page, info, `share-02-picture-${i + 1}`);
    await closePaper(page);
  }
  await context.setOffline(false);

  // A browser whose links lack the download attribute: the picture on screen; AUDIO flips only; a tap closes the picture only.
  const ctx2 = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  await ctx2.addInitScript(() => {
    delete (HTMLAnchorElement.prototype as { download?: string }).download;
  });
  const p2 = await ctx2.newPage();
  await prepare(ctx2, { seed: SHARE_02_SEED });
  await openGame(p2);
  await openArchive(p2);
  await shareRows(p2)[3]!.click();
  await waitWhole(p2);
  await paper(p2).locator('[data-control="share-open"]').click();
  await paper(p2).locator('[data-control="share-picture"]').click();
  const pic = p2.locator('[data-part="picture-view"]');
  await expect(pic).toBeVisible();
  await expect.poll(() => paperText(p2)).toContain("PICTURE ON SCREEN. SAVE BY HAND.");
  await shot(p2, info, "share-02-on-screen");
  const audio = frame(p2, "archive").locator('[data-control="audio"] button');
  const was = await audio.getAttribute("aria-pressed");
  const ab = (await audio.boundingBox())!;
  await p2.mouse.click(ab.x + ab.width / 2, ab.y + ab.height / 2);
  await expect(audio).not.toHaveAttribute("aria-pressed", was!);
  await expect(pic).toBeVisible();
  await pic.click();
  await expect(pic).toHaveCount(0);
  await expect(paper(p2)).toBeVisible();
  await closePaper(p2);
  await ctx2.close();

  // A device that shares files: its share sheet opens with the picture, and the download is offered too.
  const ctx3 = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  await ctx3.addInitScript(() => {
    const w = window as unknown as { __shared: unknown[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (d: { files?: File[] }) => void w.__shared.push({ files: (d.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })) }),
    });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  });
  const p3 = await ctx3.newPage();
  await prepare(ctx3, { seed: SHARE_02_SEED });
  await openGame(p3);
  await openArchive(p3);
  await shareRows(p3)[3]!.click();
  await waitWhole(p3);
  await paper(p3).locator('[data-control="share-open"]').click();
  const dl3 = p3.waitForEvent("download");
  await paper(p3).locator('[data-control="share-picture"]').click();
  await dl3;
  await expect
    .poll(() => p3.evaluate(() => (window as unknown as { __shared: { files: { type: string }[] }[] }).__shared))
    .toEqual([{ files: [expect.objectContaining({ type: "image/png" })] }]);
  await ctx3.close();
});

test("SHARE-02 picture: the first difference rings the result's mark and the required mark above it (ITEM-04)", async ({ page, context }) => {
  await prepare(context, {
    seed: {
      won: [1, 2],
      memos: [1],
      runs: [
        // A mark that differs (laminated for a shredded one): both rings. An extra mark: the result's place only.
        { order: 3, wiring: "IN → LAMINATOR; LAMINATOR → Embassy" },
        { order: 2, wiring: "IN → SHREDDER; SHREDDER → Parade Control" },
        // Stopped at the input terminal: nothing to ring.
        { order: 1, wiring: "" },
      ],
    },
  });
  await openGame(page);
  await openArchive(page);
  for (const [n, rings] of [[3, 2], [2, 1], [1, 0]] as const) {
    await frame(page, "archive").locator(`[data-order="${n}"] ~ [data-report]`).first().click();
    await waitWhole(page);
    await paper(page).locator('[data-control="share-open"]').click();
    const dl = page.waitForEvent("download");
    await paper(page).locator('[data-control="share-picture"]').click();
    await dl;
    expect((await lastPicture(page))!.rings, `order ${n}`).toBe(rings);
    await closePaper(page);
  }
});

test("SHARE-02 picture: one tap saves once; a picture that cannot be made prints a line", async ({ page, context }) => {
  await prepare(context, { seed: SHARE_02_SEED });
  await openGame(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let saved = 0;
  page.on("download", () => saved++);
  await openArchive(page);
  await shareRows(page)[3]!.click();
  await waitWhole(page);
  await paper(page).locator('[data-control="share-open"]').click();
  // Two taps in one go: the second finds the picture still being drawn.
  await paper(page).locator('[data-control="share-picture"]').evaluate((el) => {
    (el as HTMLElement).click();
    (el as HTMLElement).click();
  });
  await expect.poll(() => paperText(page)).toContain("SAVED");
  await page.waitForTimeout(1000);
  expect(saved).toBe(1);
  expect((await paperLines(page)).filter((l) => l === "SAVED")).toHaveLength(1);
  // The drawing fails (no PNG from the canvas): a short line, and no error left unhandled.
  await page.evaluate(() => {
    const w = window as unknown as { __toBlob: HTMLCanvasElement["toBlob"] };
    w.__toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
      cb(null);
    };
  });
  await paper(page).locator('[data-control="share-picture"]').click();
  await expect.poll(() => paperText(page)).toContain("PICTURE NOT MADE.");
  expect(saved).toBe(1);
  // The failure frees the control: the next tap saves.
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = (window as unknown as { __toBlob: HTMLCanvasElement["toBlob"] }).__toBlob;
  });
  await paper(page).locator('[data-control="share-picture"]').click();
  await expect.poll(() => saved).toBe(2);
  expect(errors).toEqual([]);
  await closePaper(page);
});

test("ART-26 shared picture: a Cream ground, Ink type in SansStack, the QR code Ink on Cream, item bodies in their colours", async ({ page, context }, info) => {
  // Signing ceremony, IN wire cut, run to its report; SHARE, PICTURE.
  await prepare(context, { seed: seedFile("act1-won") });
  await openGame(page);
  await runOrder(page, 1, "");
  await paper(page).locator('[data-control="share-open"]').click();
  const dl = page.waitForEvent("download");
  await paper(page).locator('[data-control="share-picture"]').click();
  const file = await (await dl).path();
  const made = (await lastPicture(page))!;
  mkdirSync("tmp/campaign", { recursive: true });
  copyFileSync(file, `tmp/campaign/art-26-picture-${info.project.name}.png`);
  const r = await page.evaluate(
    async ({ b64, made }) => {
      const CREAM = [0xef, 0xe6, 0xcc];
      const INK = [0x1c, 0x1c, 0x1a];
      const ORANGE = [0xe2, 0x69, 0x2a]; // the Treaty's accent (ART-10)
      const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
      const MONO = '"Courier New", Courier, monospace';
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const read = (c: HTMLCanvasElement) => c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")!.drawImage(img, 0, 0);
      const d = read(c);
      const W = c.width;
      const px = (x: number, y: number) => [d[(y * W + x) * 4]!, d[(y * W + x) * 4 + 1]!, d[(y * W + x) * 4 + 2]!];
      const same = (a: number[], b: number[], t = 0) => a.every((v, i) => Math.abs(v - b[i]!) <= t);
      // A pixel of Ink type: Cream and Ink mixed, nothing else.
      const mixed = (p: number[]) => {
        const t = (CREAM[0]! - p[0]!) / (CREAM[0]! - INK[0]!);
        return t >= -0.02 && t <= 1.02 && p.every((v, i) => Math.abs(v - (CREAM[i]! + t * (INK[i]! - CREAM[i]!))) <= 3);
      };
      const count = (x0: number, y0: number, x1: number, y1: number, test: (p: number[]) => boolean) => {
        let n = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (test(px(x, y))) n++;
        return n;
      };
      const area = (x0: number, y0: number, x1: number, y1: number) => (x1 - x0) * (y1 - y0);
      // The ground: the corners and the margins.
      const ground = [px(2, 2), px(W - 3, 2), px(2, c.height - 3), px(W - 3, c.height - 3), px(30, c.height / 2), px(W - 30, c.height / 2)].map((p) => same(p, CREAM));
      // The QR code: Ink and Cream only, no blend.
      const q = made.qr;
      const qrArea = area(q.x, q.y, q.x + q.size, q.y + q.size);
      const qrInk = count(q.x, q.y, q.x + q.size, q.y + q.size, (p) => same(p, INK));
      const qrCream = count(q.x, q.y, q.x + q.size, q.y + q.size, (p) => same(p, CREAM));
      // Everywhere but the drawing's band and the code: type, Ink on Cream.
      const dy = 60 + 50 + 55 * (made.nameRows + made.leadRows.length);
      const band = { y0: dy, y1: dy + made.drawingHeight };
      const outside = [
        [0, 0, W, band.y0],
        [0, band.y1, W, q.y],
      ] as const;
      const typeBad = outside.reduce((n, [x0, y0, x1, y1]) => n + count(x0, y0, x1, y1, (p) => !mixed(p)), 0);
      const typeInk = outside.reduce((n, [x0, y0, x1, y1]) => n + count(x0, y0, x1, y1, (p) => !same(p, CREAM, 1)), 0);
      // The drawing: a Treaty keeps its Orange seal.
      const orange = count(0, band.y0, W, band.y1, (p) => same(p, ORANGE, 2));
      // The type is SansStack: the header's form, drawn here in each stack, in each size down from PictureTextSize, against the picture.
      const x0 = 60;
      const x1 = 60 + 480;
      const hy0 = 60;
      const hy1 = 110;
      const header = (stack: string) => {
        let best = Infinity;
        for (const text of ["INCIDENT REPORT", "MISSION REPORT"])
          for (let size = 44; size >= 12; size--) {
            const ref = document.createElement("canvas");
            ref.width = W;
            ref.height = c.height;
            const g = ref.getContext("2d")!;
            g.fillStyle = "#efe6cc";
            g.fillRect(0, 0, ref.width, ref.height);
            g.fillStyle = "#1c1c1a";
            g.font = `700 ${size}px ${stack}`;
            g.textBaseline = "middle";
            g.fillText(text, 60, 60 + 25);
            const rd = read(ref);
            let diff = 0;
            for (let y = hy0; y < hy1; y++) for (let x = x0; x < x1; x++) diff += Math.abs(rd[(y * W + x) * 4]! - d[(y * W + x) * 4]!);
            best = Math.min(best, diff);
          }
        return best;
      };
      return { ground, qrInk: qrInk / qrArea, qrCream: qrCream / qrArea, qrOther: 1 - (qrInk + qrCream) / qrArea, typeBad, typeInk, orange, sans: header(SANS), mono: header(MONO) };
    },
    { b64: readFileSync(file).toString("base64"), made },
  );
  expect(r.ground).toEqual([true, true, true, true, true, true]);
  expect(r.qrOther).toBe(0);
  expect(r.qrInk).toBeGreaterThan(0.2);
  expect(r.qrCream).toBeGreaterThan(0.2);
  expect(r.typeInk).toBeGreaterThan(500);
  expect(r.typeBad).toBe(0);
  expect(r.orange).toBeGreaterThan(20);
  // The header matches SansStack and not MonoStack.
  expect(r.sans).toBeLessThan(r.mono / 4);
});

// ---------- Screens ----------

test("Order list screen: the layout", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("to-16") });
  await openGame(page);
  await expect.poll(() => screen(page)).toBe("orderList");
  const f = frame(page, "orderList");
  await expect(f.locator(".tc-title, [data-part='title']").first()).toContainText("ORDER LIST");
  // No row spills sideways; the list scrolls inside the window; rows tappable at JackMinSize or more.
  const m = await f.evaluate((el) => {
    const list = el.querySelector('[data-part="order-list"]')!;
    const lr = list.getBoundingClientRect();
    const rows = [...list.querySelectorAll('[data-piece="list-row"]')].map((r) => r.getBoundingClientRect());
    return {
      over: rows.filter((r) => r.left < lr.left - 1 || r.right > lr.right + 1).length,
      minHeight: Math.min(...rows.map((r) => r.height)),
      scrolls: list.scrollHeight > list.clientHeight,
      pageScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(m.over).toBe(0);
  expect(m.minHeight).toBeGreaterThanOrEqual(44);
  expect(m.pageScroll).toBe(false);
  expect(m.scrolls).toBe(true);
  for (const label of ["ARCHIVE", "SAVE CODE", "LOAD SAVE CODE"]) await expect(f.locator(`.tc-cbar .tc-plate[aria-label="${label}"]`)).toBeVisible();
  await expect(f.locator('[data-control="audio"]')).toBeVisible();
  await shot(page, info, "screen-order-list");
});

test("Incident archive screen: the layout", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("archive-02") });
  await openGame(page);
  await openArchive(page);
  const f = frame(page, "archive");
  await expect(f.locator(".tc-title, [data-part='title']").first()).toContainText("INCIDENT ARCHIVE");
  const m = await f.evaluate((el) => {
    const list = el.querySelector('[data-part="archive-list"]')!;
    const lr = list.getBoundingClientRect();
    const rows = [...list.querySelectorAll('[data-piece="list-row"]')].map((r) => r.getBoundingClientRect());
    return { over: rows.filter((r) => r.left < lr.left - 1 || r.right > lr.right + 1).length, pageScroll: document.documentElement.scrollWidth > window.innerWidth };
  });
  expect(m.over).toBe(0);
  expect(m.pageScroll).toBe(false);
  await expect(f.locator('.tc-cbar .tc-plate[aria-label="ORDERS"]')).toBeVisible();
  await expect(f.locator('[data-control="audio"]')).toBeVisible();
  await shot(page, info, "screen-archive");
});

// ---------- Feel timings ----------

test("FEEL-11 order opens: frame at once, columns OpenStagger apart in flow order, camera settles over OpenSettleTime", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("act1-won") });
  await openGame(page);
  await page.evaluate(() => {
    const w = window as unknown as { __samples: { t: number; cols: number[]; tr: string }[]; __t0: number };
    w.__samples = [];
    w.__t0 = 0;
    const loop = () => {
      const root = document.querySelector('.tc-frame[data-screen="board"] [data-part="board-root"]');
      if (root && w.__t0) {
        const cols: number[] = [];
        for (const el of document.querySelectorAll('.tc-frame[data-screen="board"] [data-col]')) {
          const c = Number(el.getAttribute("data-col"));
          const o = Number(getComputedStyle(el).opacity);
          cols[c] = Math.max(cols[c] ?? 0, o);
        }
        w.__samples.push({ t: performance.now() - w.__t0, cols, tr: root.getAttribute("transform") ?? "" });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("click", () => (w.__t0 = performance.now()), { capture: true, once: true });
  });
  await orderRow(page, 3).click();
  await waitBoardOpen(page, 3);
  const s = await page.evaluate(() => (window as unknown as { __samples: { t: number; cols: number[]; tr: string }[] }).__samples);
  const shown = (c: number) => s.find((x) => (x.cols[c] ?? 0) > 0.5)?.t ?? Infinity;
  const cols = Math.max(...s.map((x) => x.cols.length));
  const times = range(0, cols - 1).map(shown);
  for (let i = 1; i < times.length; i++) expect(times[i]!, `column ${i}`).toBeGreaterThanOrEqual(times[i - 1]!);
  // OpenStagger apart: the last column shows about (columns − 1) × OpenStagger after the first.
  const spread = (times.at(-1)! - times[0]!) / 1000;
  expect(spread).toBeGreaterThan((cols - 1) * D.OpenStagger * 0.6);
  expect(spread).toBeLessThan((cols - 1) * D.OpenStagger + 0.25);
  // The camera moves from the start and stands still after OpenSettleTime.
  const trs = s.filter((x) => x.tr);
  const lastChange = trs.reduce((acc, x, i) => (i > 0 && x.tr !== trs[i - 1]!.tr ? x.t : acc), 0) / 1000;
  expect(lastChange).toBeGreaterThan(D.OpenSettleTime * 0.6);
  expect(lastChange).toBeLessThan(D.OpenSettleTime + 0.35);
  await shot(page, info, "feel-11-opened");
});

test("FEEL-12 opening misfire: StandbyLight, AUDIO undimmed, lit within WakeTime, the switch throws SelfThrowDelay after", async ({ page }, info) => {
  await newGame(page);
  const dim = frameOf(page).locator('[data-part="standby-dim"]');
  const dimOpacity = Number(await dim.evaluate((e) => getComputedStyle(e).opacity));
  expect(dimOpacity).toBeCloseTo(1 - D.StandbyLight, 1);
  await expect(frameOf(page).locator('[data-part="standby-ring"]')).toBeVisible();
  // The AUDIO switch sits above the dim.
  const audioOnTop = await frameOf(page).locator('[data-control="audio"] button').evaluate((a) => {
    const r = a.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && (a === top || a.contains(top));
  });
  expect(audioOnTop).toBe(true);
  await shot(page, info, "feel-12-standby");
  await page.evaluate(() => {
    const w = window as unknown as { __m: { t: number; dim: number; run: string; sw: string }[]; __t0: number };
    w.__m = [];
    w.__t0 = 0;
    const f = document.querySelector('.tc-frame[data-screen="board"]') as HTMLElement;
    const d = f.querySelector('[data-part="standby-dim"]') as HTMLElement | null;
    const loop = () => {
      if (w.__t0) w.__m.push({ t: performance.now() - w.__t0, dim: d ? Number(getComputedStyle(d).opacity) : 0, run: f.dataset.run ?? "", sw: f.querySelector('[data-control="run"]')?.getAttribute("aria-pressed") ?? "" });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("pointerdown", () => (w.__t0 = performance.now()), { capture: true, once: true });
  });
  const win = (await frameOf(page).locator(".tc-window").boundingBox())!;
  await page.mouse.click(win.x + 20, win.y + 20);
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => (window as unknown as { __m: { t: number; dim: number; run: string; sw: string }[] }).__m);
  const lit = m.find((x) => x.dim < 0.02)?.t ?? Infinity;
  const thrown = m.find((x) => x.run === "running" || x.sw === "true")?.t ?? Infinity;
  expect(lit / 1000).toBeLessThan(D.WakeTime + 0.1);
  expect(thrown / 1000).toBeGreaterThan(D.SelfThrowDelay - 0.05);
  expect(thrown / 1000).toBeLessThan(D.SelfThrowDelay + 0.15);
  expect(lit).toBeLessThan(thrown);
  expect(thrown / 1000).toBeLessThan(D.OpeningGuard);
});

test("FEEL-13 memo, debrief and save printouts: feed, lines PrintLineTime apart, the stamp, the bell's lead, the tear", async ({ page, context, browser }, info) => {
  // A code that earns a commendation this save lacks: every act 1 result found.
  const ctxA = await browser.newContext({ viewport: page.viewportSize()!, baseURL: info.project.use.baseURL! });
  const a = await ctxA.newPage();
  await prepare(ctxA, { seed: { won: [1, 2, 3, 4], memos: [1], found: Object.fromEntries(range(1, 5).map((n) => [String(n), [0, 1, 2]])) } });
  await openGame(a);
  const code = await saveCodeOf(a);
  await ctxA.close();

  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  await page.evaluate(() => {
    const w = window as unknown as { __lines: { t: number; text: string }[] };
    w.__lines = [];
    new MutationObserver((ms) => {
      for (const m of ms)
        for (const n of m.addedNodes)
          if (n instanceof HTMLElement && n.dataset.part === "paper-line") w.__lines.push({ t: performance.now(), text: (n.textContent ?? "").replace(/\s+/g, " ").trim() });
    }).observe(document.body, { subtree: true, childList: true });
  });
  const linesSeen = () => page.evaluate(() => (window as unknown as { __lines: { t: number; text: string }[] }).__lines.splice(0));
  const paperAt = () => page.evaluate(() => performance.now());
  await runOrder(page, 5, W[5]);
  // Watch from before the debrief's paper exists: its feed runs from the frame its paper first moves to the frame it stands.
  await page.evaluate(() => {
    const w = window as unknown as { __feed: { start: number; end: number } | null };
    w.__feed = null;
    const old = new Set(document.querySelectorAll(".tc-paper"));
    const tick = () => {
      const p = [...document.querySelectorAll<HTMLElement>(".tc-paper")].find((e) => !old.has(e) && e.style.visibility !== "hidden");
      const now = performance.now();
      if (p && p.style.transform !== "" && !w.__feed) w.__feed = { start: now, end: 0 };
      else if (p && w.__feed && !w.__feed.end && p.style.transform === "") w.__feed.end = now;
      if (!w.__feed?.end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await closePaper(page);
  await linesSeen();
  // The debrief feeds up over PaperFeedTime, then prints a line each PrintLineTime.
  await expect(paper(page)).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __feed: { end: number } | null }).__feed?.end);
  const feedSpan = await page.evaluate(() => {
    const f = (window as unknown as { __feed: { start: number; end: number } }).__feed;
    return (f.end - f.start) / 1000;
  });
  expect(feedSpan).toBeGreaterThan(D.PaperFeedTime - 0.08);
  expect(feedSpan).toBeLessThan(D.PaperFeedTime + 0.1);
  await waitWhole(page);
  const t = (await linesSeen()).map((x) => x.t);
  expect(t.length).toBeGreaterThan(5);
  const gaps = t.slice(1).map((x, i) => (x - t[i]!) / 1000);
  const median = [...gaps].sort((x, y) => x - y)[Math.floor(gaps.length / 2)]!;
  expect(median).toBeGreaterThan(D.PrintLineTime - 0.04);
  expect(median).toBeLessThan(D.PrintLineTime + 0.06);
  await shot(page, info, "feel-13-debrief");
  // The tear: the paper goes TearTime after the tap.
  const handle = await paper(page).elementHandle();
  const t0 = await paperAt();
  await tapPaper(page);
  await page.waitForFunction((e) => !e || !e.isConnected, handle);
  const gone = ((await paperAt()) - t0) / 1000;
  expect(gone).toBeGreaterThan(D.TearTime - 0.05);
  expect(gone).toBeLessThan(D.TearTime + 0.3);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await closePaper(page);
  // Act 2's memo: its family name in double strike with its stamp.
  await openFromList(page, 6);
  await waitWhole(page);
  const name = paper(page).locator('[data-part="paper-line"]').filter({ hasText: "COMMS" }).first();
  await expect(name.locator(".tc-stamp")).toHaveCount(1);
  await expect(name.locator('[data-part="strike2"]')).toHaveCount(1);
  await shot(page, info, "feel-13-memo");
  await closePaper(page);
  await waitBoardOpen(page, 6);
  // SAVE CODE READ, then the bell BellLead before the commendation's line.
  await linesSeen();
  const read = await readCode(page, code);
  expect(read).toEqual(["SAVE CODE READ", COMMEND.paperTrail]);
  const seen = await linesSeen();
  const at = (txt: string) => seen.find((x) => x.text.startsWith(txt))!.t;
  const lead = (at("COMMENDATION") - at("SAVE CODE READ")) / 1000;
  expect(lead).toBeGreaterThan(D.BellLead + D.PrintLineTime - 0.06);
  expect(lead).toBeLessThan(D.BellLead + D.PrintLineTime + 0.15);
  await shot(page, info, "feel-13-code-read");
  await closePaper(page);
});

test("FEEL-16 report closes: the tear, the toggle returns, one view move of ViewMoveTime starting with the tear", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("act1-won") });
  await openGame(page);
  await runOrder(page, 4, W[4]);
  await page.evaluate(() => {
    const w = window as unknown as { __v: { t: number; tr: string; sw: string; tearing: boolean }[]; __t0: number };
    w.__v = [];
    w.__t0 = 0;
    const f = document.querySelector('.tc-frame[data-screen="board"]') as HTMLElement;
    const loop = () => {
      const root = f.querySelector('[data-part="board-root"]');
      if (w.__t0)
        w.__v.push({
          t: performance.now() - w.__t0,
          tr: root?.getAttribute("transform") ?? "",
          sw: f.querySelector('[data-control="run"]')?.getAttribute("aria-pressed") ?? "",
          tearing: !!f.querySelector(".tc-tearing"),
        });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("pointerdown", () => (w.__t0 = performance.now()), { capture: true, once: true });
  });
  await tapPaper(page);
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle", { timeout: 3000 });
  await page.waitForTimeout(1200);
  const v = await page.evaluate(() => (window as unknown as { __v: { t: number; tr: string; sw: string; tearing: boolean }[] }).__v);
  const tearStart = v.find((x) => x.tearing)?.t ?? Infinity;
  const changes = v.filter((x, i) => i > 0 && x.tr !== v[i - 1]!.tr).map((x) => x.t);
  expect(changes.length).toBeGreaterThan(2);
  const moveStart = changes[0]! / 1000;
  const moveEnd = changes.at(-1)! / 1000;
  // One move: it starts with the tear and takes ViewMoveTime.
  expect(Math.abs(moveStart - tearStart / 1000)).toBeLessThan(0.1);
  expect(moveEnd - moveStart).toBeGreaterThan(D.ViewMoveTime * 0.7);
  expect(moveEnd - moveStart).toBeLessThan(D.ViewMoveTime + 0.2);
  await shot(page, info, "feel-16-returned");
});


// ---------- The title screen and NEXT (owner's changes; the design is silent) ----------

test("Title screen: a new game shows the name and START; START leads to the opening misfire's standby; sound plays after it", async ({ page }, info) => {
  await page.goto(GAME);
  await expect.poll(() => screen(page), { timeout: 60_000 }).toBe("title");
  const t = frame(page, "title");
  const name = t.locator('[data-part="title-name"]');
  expect((await name.innerText()).replace(/\s+/g, " ").trim()).toBe("TRANSMISSION CONTROL 2");
  await expect(titlePlate(page)).toHaveCount(1);
  await expect(titlePlate(page)).toHaveAttribute("data-control", "start");
  await expect(titlePlate(page)).toHaveAttribute("aria-label", "START");
  // AUDIO in the control bar, as on the other screens; the plate in the window under the name.
  await expect(t.locator('.tc-cbar [data-control="audio"]')).toHaveCount(1);
  const m = await t.evaluate((f) => {
    const win = f.querySelector(".tc-window")!.getBoundingClientRect();
    const n = f.querySelector('[data-part="title-name"]')!;
    const nb = n.getBoundingClientRect();
    const pb = f.querySelector('[data-control="start"]')!.getBoundingClientRect();
    return {
      inside: nb.left >= win.left && nb.right <= win.right && nb.top >= win.top && pb.bottom <= win.bottom,
      below: pb.top >= nb.bottom,
      plate: { w: pb.width, h: pb.height },
      nameSize: parseFloat(getComputedStyle(n).fontSize),
      textSize: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--TextSize")),
      sideways: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(m.inside).toBe(true);
  expect(m.below).toBe(true);
  expect(m.plate.w).toBeGreaterThanOrEqual(44);
  expect(m.plate.h).toBeGreaterThanOrEqual(44);
  expect(m.nameSize).toBeGreaterThan(2 * m.textSize);
  expect(m.sideways).toBe(false);
  await shot(page, info, "title-start");
  const unlocked = () => page.evaluate(() => (window as unknown as { __tc2: { game: { sound: { unlocked: boolean } } } }).__tc2.game.sound.unlocked);
  expect(await unlocked()).toBe(false);
  expect(await passTitle(page, "start")).toBe("start");
  // What a new game showed before the title: order 1 in standby for the misfire's first tap.
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true");
  await expect(frameOf(page)).toHaveAttribute("data-order", "1");
  expect(await unlocked()).toBe(true);
  await recordSounds(page);
  expect((await playMisfire(page))[0]).toBe(RESULT_1_1);
  const played = await sounds(page);
  expect(played.length).toBeGreaterThan(0);
  expect(played.every((s) => s.sounded)).toBe(true);
});

test("Title screen: with progress it shows CONTINUE; CONTINUE leads to the order list", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await page.goto(GAME);
  await expect.poll(() => screen(page), { timeout: 60_000 }).toBe("title");
  await expect(titlePlate(page)).toHaveAttribute("aria-label", "CONTINUE");
  await shot(page, info, "title-continue");
  expect(await passTitle(page, "continue")).toBe("continue");
  await expect.poll(() => screen(page)).toBe("orderList");
  await expect(orderRow(page, 5)).toBeVisible();
  await expect(orderRow(page, 6)).toHaveCount(0);
});

test("Title screen: a double click on START is one press; its second is not the standby board's first tap", async ({ page }) => {
  await page.goto(GAME);
  await expect.poll(() => screen(page), { timeout: 60_000 }).toBe("title");
  await recordSounds(page);
  await titlePlate(page).dblclick();
  await expect.poll(() => screen(page)).toBe("board");
  await page.waitForTimeout(700);
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true");
  expect((await sounds(page)).filter((x) => x.name === "key")).toHaveLength(1);
  // Past the double-click time a tap is the first tap, as ever.
  expect((await playMisfire(page))[0]).toBe(RESULT_1_1);
});

test("Title screen: a double click on CONTINUE is one press; its second does not reach the order list", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await page.goto(GAME);
  await expect.poll(() => screen(page), { timeout: 60_000 }).toBe("title");
  await recordSounds(page);
  // The second click comes a beat after the first, on the order list now showing, on order 5's row (where the plate stood on
  // the phone; beside it on the desktop). The page notes when each press starts, to show the second within the time.
  await page.evaluate(() => {
    const w = window as unknown as { __downs: number[] };
    w.__downs = [];
    window.addEventListener("pointerdown", () => w.__downs.push(performance.now()), true);
  });
  await titlePlate(page).click();
  await expect.poll(() => screen(page)).toBe("orderList");
  const row = (await orderRow(page, 5).boundingBox())!;
  await page.mouse.click(row.x + row.width / 2, row.y + row.height / 2);
  const downs = await page.evaluate(() => (window as unknown as { __downs: number[] }).__downs);
  expect(downs).toHaveLength(2);
  expect(downs[1]! - downs[0]!, "the second press within the double-click time").toBeLessThan(500);
  await page.waitForTimeout(700);
  expect(await screen(page)).toBe("orderList");
  expect((await sounds(page)).filter((x) => x.name === "key")).toHaveLength(1);
  // Past the double-click time a press is a press.
  await orderRow(page, 3).click();
  await waitBoardOpen(page, 3);
});

test("NEXT: a won mid-act report has NEXT beside SHARE; it tears the report and opens the next order", async ({ page, context }, info) => {
  await prepare(context, { seed: { runs: [{ order: 1, wiring: "IN → World Council" }, { order: 1, wiring: W[1] }], memos: [1] } });
  await openGame(page);
  const lines = await runOrder(page, 2, W[2]);
  expect(lines[lines.length - 1]).toBe("ORDER 3 UNLOCKED: Diplomatic pouch.");
  const foot = paper(page).locator(".tc-foot");
  const share = foot.locator('[data-control="share-open"]');
  const next = foot.locator('[data-control="next"]');
  await expect(share).toBeVisible();
  await expect(next).toBeVisible();
  await expect(next).toHaveAttribute("aria-label", "NEXT");
  const a = (await share.boundingBox())!;
  const b = (await next.boundingBox())!;
  expect(Math.abs(a.y + a.height / 2 - (b.y + b.height / 2))).toBeLessThan(2);
  expect(b.x).toBeGreaterThan(a.x + a.width);
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await shot(page, info, "next-on-report");
  const report = await paper(page).elementHandle();
  await next.click();
  // Closed as a tap closes it: the tear, then order 3 opens on the board, no paper left.
  await expect.poll(() => report!.evaluate((e) => e.classList.contains("tc-tearing") || !e.isConnected)).toBe(true);
  await waitBoardOpen(page, 3);
  expect(await screen(page)).toBe("board");
  await expect(page.locator(".tc-frame:not([hidden]) .tc-paper")).toHaveCount(0);
  expect((await kept(page))!.won).toEqual([1, 2]);
});

test("NEXT at an act's last order: the debrief and the save code print and close, then the next act's memo, then its first order", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  await runOrder(page, 5, W[5]);
  await paper(page).locator('[data-control="next"]').click();
  // Every paper that follows the report prints as ever, over the board still on order 5.
  await waitWhole(page);
  const debrief = await paperLines(page);
  expect(debrief[debrief.length - 1]).toBe("ORDER 6 UNLOCKED: Latin hour.");
  await expect(frameOf(page)).toHaveAttribute("data-order", "5");
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await expect(frameOf(page)).toHaveAttribute("data-order", "5");
  await closePaper(page);
  // Act 2's memo, never closed, prints before its first order opens.
  await waitWhole(page);
  expect(await paperLines(page)).toContain("COMMS");
  await expect(frameOf(page)).toHaveAttribute("data-order", "5");
  await closePaper(page);
  await waitBoardOpen(page, 6);
  expect(await screen(page)).toBe("board");
  await expect(page.locator(".tc-frame:not([hidden]) .tc-paper")).toHaveCount(0);
  const k = (await kept(page))!;
  expect(k.debriefs).toContain(1);
  expect(k.memos).toContain(2);
});

/** The centre of a locator's box, to press it at once (a tear lasts TearTime). */
const centreOf = async (page: Page, l: ReturnType<Page["locator"]>) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const boardOrders = (page: Page) => page.locator('.tc-frame[data-screen="board"] [data-slot="board.control.orders"] .tc-plate');

test("NEXT, then RUN as the report tears: order n stays and runs; then ORDERS as it tears: the order list stays", async ({ page, context }) => {
  await prepare(context, { seed: { runs: [{ order: 1, wiring: "IN → World Council" }, { order: 1, wiring: W[1] }], memos: [1] } });
  await openGame(page);
  await runOrder(page, 2, W[2]);
  // RUN as the report tears (the board answers from the tear's start, FEEL-17): the run is not left for order 3.
  const run = await centreOf(page, frameOf(page).locator('[data-control="run"]'));
  await paper(page).locator('[data-control="next"]').click();
  await page.mouse.click(run.x, run.y);
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
  await page.waitForTimeout(D.TearTime * 1000 + 600);
  await expect(frameOf(page)).toHaveAttribute("data-order", "2");
  expect(await frameOf(page).getAttribute("data-run")).toMatch(/running|alarm|printing/);
  if ((await frameOf(page).getAttribute("data-run")) === "running") await control(page, "skip").click().catch(() => {});
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 20_000 });
  await waitWhole(page);
  // ORDERS as the report tears: the order list stays, and order 3 does not open behind it.
  const orders = await centreOf(page, boardOrders(page));
  await paper(page).locator('[data-control="next"]').click();
  await page.mouse.click(orders.x, orders.y);
  await expect.poll(() => screen(page)).toBe("orderList");
  await page.waitForTimeout(D.TearTime * 1000 + 600);
  expect(await screen(page)).toBe("orderList");
  await expect(frameOf(page)).toHaveAttribute("data-order", "2");
});

test("NEXT at an act's end, then RUN as the next act's memo tears: order n stays and runs", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  await runOrder(page, 5, W[5]);
  await paper(page).locator('[data-control="next"]').click();
  // The debrief, the save code, then act 2's memo, over the board still on order 5.
  await waitWhole(page);
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await closePaper(page);
  await waitWhole(page);
  expect(await paperLines(page)).toContain("COMMS");
  const run = await centreOf(page, frameOf(page).locator('[data-control="run"]'));
  await tapPaper(page);
  await page.mouse.click(run.x, run.y);
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
  await page.waitForTimeout(D.TearTime * 1000 + 600);
  // The memo is closed for good; the run plays on order 5; order 6 waits for the order list.
  await expect(frameOf(page)).toHaveAttribute("data-order", "5");
  expect(await frameOf(page).getAttribute("data-run")).toMatch(/running|alarm|printing/);
  expect((await kept(page))!.memos).toContain(2);
});

test("NEXT: none on a failed run's report, nor on order 30's", async ({ page, context }) => {
  test.setTimeout(240_000);
  await prepare(context, { seed: { won: range(1, 29), memos: range(1, 6), debriefs: range(1, 5) } });
  await openGame(page);
  await runOrder(page, 2, "IN → LAMINATOR");
  await expect(paper(page)).toHaveAttribute("data-form", "incident");
  await expect(paper(page).locator('[data-control="share-open"]')).toBeVisible();
  await expect(paper(page).locator('[data-control="next"]')).toHaveCount(0);
  await closePaper(page);
  await runOrder(page, 30, (await testWiring(page, 30))!);
  await expect(paper(page)).toHaveAttribute("data-form", "mission");
  await expect(paper(page).locator('[data-control="share-open"]')).toBeVisible();
  await expect(paper(page).locator('[data-control="next"]')).toHaveCount(0);
  await closePaper(page);
});

// ---------- Console keys (owner's changes; the design is silent) ----------

type KeyBox = { label: string; slot: number; x: number; y: number; w: number; h: number; held: boolean };
/** A screen's control bar: each plate's label, slot and box, whether it is held, the AUDIO lamp's box, the bar's lines; the
 * keys and their slots in the bar's own order, as focus and a screen reader go through them. */
const barOf = (page: Page, id: string) =>
  page.evaluate((id) => {
    const f = document.querySelector(`.tc-frame[data-screen="${id}"]`)!;
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const plates = [...f.querySelectorAll(".tc-cbar .tc-plate")];
    const bar = f.querySelector(".tc-cbar")!;
    const audio = f.querySelector('.tc-cbar [data-control="audio"] .tc-plate');
    const lamp = audio?.querySelector(".tc-lens");
    const after = getComputedStyle(plates.find((p) => !p.classList.contains("tc-held"))!, "::after");
    return {
      landscape: f.classList.contains("tc-landscape"),
      lines: f.getAttribute("data-keys"),
      keys: plates
        .map((p) => ({
          label: p.getAttribute("data-label")!,
          slot: Number(p.closest("[data-key]")!.getAttribute("data-key")),
          held: p.classList.contains("tc-held") && p.getAttribute("aria-current") === "page" && p.getAttribute("aria-disabled") === "true" && !p.hasAttribute("aria-pressed"),
          ...box(p),
        }))
        .sort((a, b) => a.slot - b.slot),
      dom: plates.map((p) => p.getAttribute("data-label")!),
      domSlots: [...bar.children].map((e) => Number(e.getAttribute("data-key"))),
      audio: audio ? box(audio) : null,
      lamp: lamp ? box(lamp) : null,
      bevel: { width: parseFloat(after.borderRightWidth), bottom: parseFloat(after.borderBottomWidth), colour: after.borderRightColor },
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  }, id);

const SLOTS: Record<string, number> = { AUDIO: 1, ORDERS: 2, MEDALS: 3, ARCHIVE: 4, UNDO: 5, "SAVE CODE": 5, RESET: 6, "LOAD SAVE CODE": 6, RUN: 7 };

/** The keys a screen shows, in slot order, the screen's own held; one size; on one line or two; the AUDIO lamp in its plate. */
async function expectKeys(page: Page, id: string, labels: string[], held: string | null): Promise<KeyBox[]> {
  const b = await barOf(page, id);
  expect(b.keys.map((k) => k.label)).toEqual(labels);
  // The bar's own order is the slots' order.
  expect(b.dom, `${id} keys in the bar's order`).toEqual(labels);
  expect(b.domSlots, `${id} slots in the bar's order`).toEqual([...b.domSlots].sort((x, y) => x - y));
  for (const k of b.keys) expect(k.slot, `${id} ${k.label} slot`).toBe(SLOTS[k.label]);
  expect(b.keys.filter((k) => k.held).map((k) => k.label)).toEqual(held ? [held] : []);
  expect(b.sideways).toBe(false);
  const [first] = b.keys;
  for (const k of b.keys) {
    expect(Math.abs(k.w - first!.w), `${id} ${k.label} width`).toBeLessThan(0.6);
    expect(Math.abs(k.h - first!.h), `${id} ${k.label} height`).toBeLessThan(0.6);
    expect(k.w).toBeGreaterThanOrEqual(44);
    expect(k.h).toBeGreaterThanOrEqual(44);
  }
  // Along the bar in slot order: one line on the desktop (a column), two on the phone (slots 1 to 4 by the window).
  const along = (k: KeyBox) => (b.landscape ? k.y : k.x);
  const across = (k: KeyBox) => (b.landscape ? k.x : k.y);
  const lineOf = (slot: number) => (b.lines === "one line" || slot <= 4 ? 0 : 1);
  expect(b.lines).toBe(b.landscape ? "one line" : "two lines");
  for (const line of [0, 1]) {
    const on = b.keys.filter((k) => lineOf(k.slot) === line);
    for (let i = 1; i < on.length; i++) {
      expect(along(on[i]!)).toBeGreaterThan(along(on[i - 1]!));
      expect(Math.abs(across(on[i]!) - across(on[0]!))).toBeLessThan(0.6);
    }
  }
  if (b.audio && b.lamp) {
    expect(b.lamp.x).toBeGreaterThanOrEqual(b.audio.x);
    expect(b.lamp.y).toBeGreaterThanOrEqual(b.audio.y);
    expect(b.lamp.x + b.lamp.w).toBeLessThanOrEqual(b.audio.x + b.audio.w);
    expect(b.lamp.y + b.lamp.h).toBeLessThanOrEqual(b.audio.y + b.audio.h);
  }
  // A raised key: a GraphiteLight bevel along its bottom and right edges.
  expect(b.bevel.width).toBeGreaterThan(1);
  expect(b.bevel.bottom).toBeGreaterThan(1);
  expect(b.bevel.colour).toBe("rgb(69, 73, 69)");
  return b.keys;
}

test("Keys: one size for the game, each in its fixed slot, the same place on the title, board, order list, archive and COMMENDATIONS", async ({ page, context }, info) => {
  await prepare(context, { seed: seedFile("to-16") });
  await page.goto(GAME);
  await expect.poll(() => screen(page), { timeout: 60_000 }).toBe("title");
  const seen: KeyBox[][] = [await expectKeys(page, "title", ["AUDIO"], null)];
  // AUDIO in the first slot: the top of the column, the start of the phone's top row.
  await passTitle(page, "continue");
  seen.push(await expectKeys(page, "orderList", ["AUDIO", "ORDERS", "MEDALS", "ARCHIVE", "SAVE CODE", "LOAD SAVE CODE"], "ORDERS"));
  // The held key does nothing: the list it would draw again stays the same element, and no key click.
  await recordSounds(page);
  const list = await frame(page, "orderList").locator('[data-part="order-list"]').elementHandle();
  // Marked disabled, it is no target for Playwright's checks: a click at it all the same, as a player's.
  await listControl(page, "orderList", "ORDERS").click({ force: true });
  await page.waitForTimeout(300);
  expect(await screen(page)).toBe("orderList");
  expect(await list!.evaluate((e) => e.isConnected)).toBe(true);
  expect((await sounds(page)).filter((x) => x.name === "key")).toEqual([]);
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  // ARCHIVE shows on the order list only: its slot stays empty here.
  seen.push(await expectKeys(page, "board", ["AUDIO", "ORDERS", "MEDALS", "UNDO", "RESET", "RUN"], null));
  await shot(page, info, "keys-board");
  // Held down, a plate loses its bevel; let go off it, nothing is pressed.
  const undo = frameOf(page).locator('[data-control="undo"]');
  const ub = (await undo.boundingBox())!;
  const bevel = () => undo.evaluate((e) => getComputedStyle(e, "::after").display);
  expect(await bevel()).not.toBe("none");
  await page.mouse.move(ub.x + ub.width / 2, ub.y + ub.height / 2);
  await page.mouse.down();
  await expect.poll(bevel).toBe("none");
  const wb = (await frameOf(page).locator(".tc-window").boundingBox())!;
  await page.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect.poll(bevel).not.toBe("none");
  await openArchive(page);
  seen.push(await expectKeys(page, "archive", ["AUDIO", "ORDERS", "MEDALS"], null));
  await listControl(page, "archive", "MEDALS").click();
  await expect.poll(() => screen(page)).toBe("commendations");
  seen.push(await expectKeys(page, "commendations", ["AUDIO", "ORDERS", "MEDALS"], "MEDALS"));
  await shot(page, info, "keys-commendations");
  // A key never moves nor changes size from one screen to the next; a slot keeps its place whatever stands in it.
  const at = new Map<number, KeyBox>();
  for (const k of seen.flat()) {
    const a = at.get(k.slot);
    if (!a) {
      at.set(k.slot, k);
      continue;
    }
    for (const side of ["x", "y", "w", "h"] as const) expect(Math.abs(k[side] - a[side]), `slot ${k.slot} ${k.label} ${side}`).toBeLessThan(0.6);
  }
  expect([...at.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

/** A MEDALS key's count line and what a screen reader hears of it. */
const medalsOf = async (page: Page, id: string) => {
  const k = id === "board" ? page.locator('.tc-frame[data-screen="board"] [data-slot="board.control.medals"] .tc-plate') : listControl(page, id, "MEDALS");
  return { sub: await k.locator('[data-part="sub"]').innerText(), aria: await k.getAttribute("aria-label") };
};

test("MEDALS on the board opens COMMENDATIONS: every act's heading then its medals; MEDALS held there, with its count; ORDERS leaves it", async ({ page, context }, info) => {
  await prepare(context, { seed: { ...(seedFile("archive-02") as object), earned: ["Under Budget"] } });
  await openGame(page);
  await openFromList(page, 3);
  await waitBoardOpen(page, 3);
  const medals = page.locator('.tc-frame[data-screen="board"] [data-slot="board.control.medals"] .tc-plate');
  // Its count: earned over every commendation in the game.
  expect(await medalsOf(page, "board")).toEqual({ sub: "1/18", aria: "MEDALS, 1 of 18 earned" });
  // Locked with the board while it runs, as ORDERS (BOARD-04).
  await control(page, "run").click();
  expect(await medals.evaluate((e) => !!e.closest("[inert]"))).toBe(true);
  await control(page, "skip").click();
  await waitWhole(page);
  await closePaper(page);
  await expect(frameOf(page)).toHaveAttribute("data-locked", "false");
  await medals.click();
  await expect.poll(() => screen(page)).toBe("commendations");
  const f = frame(page, "commendations");
  await expect(f.locator(".tc-title")).toHaveText("COMMENDATIONS");
  const m = await f.evaluate((el) => {
    const list = el.querySelector('[data-part="commendations-list"]')!;
    return {
      acts: [...list.querySelectorAll("[data-act]")].map((e) => Number(e.getAttribute("data-act"))),
      walls: [...list.querySelectorAll("[data-medals]")].map((g) => [Number(g.getAttribute("data-medals")), g.querySelectorAll('[data-piece="medal"]').length]),
      order: [...list.children].map((e) => (e.hasAttribute("data-act") ? `act ${e.getAttribute("data-act")}` : `wall ${e.getAttribute("data-medals")}`)),
      earned: [...list.querySelectorAll('[data-piece="medal"][data-earned="true"]')].map((e) => e.getAttribute("data-achievement")),
      scrolls: list.scrollHeight > list.clientHeight && getComputedStyle(list).overflowY === "auto",
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const acts = range(1, 6);
  expect(m.acts).toEqual(acts);
  expect(m.walls).toEqual(acts.map((a) => [a, 3]));
  expect(m.order).toEqual(acts.flatMap((a) => [`act ${a}`, `wall ${a}`]));
  expect(m.earned).toEqual(["Under Budget"]);
  expect(m.scrolls).toBe(true);
  expect(m.sideways).toBe(false);
  const held = listControl(page, "commendations", "MEDALS");
  await expect(held).toHaveAttribute("aria-current", "page");
  await expect(held).toHaveAttribute("aria-disabled", "true");
  await expect(held).not.toHaveAttribute("aria-pressed", /.*/);
  const walls = await f.locator('[data-part="commendations-list"]').elementHandle();
  await held.click({ force: true });
  await page.waitForTimeout(300);
  expect(await screen(page)).toBe("commendations");
  expect(await walls!.evaluate((e) => e.isConnected)).toBe(true);
  expect(await medalsOf(page, "commendations")).toEqual({ sub: "1/18", aria: "MEDALS, 1 of 18 earned" });
  await expect(listControl(page, "commendations", "ARCHIVE")).toHaveCount(0);
  await shot(page, info, "commendations");
  await listControl(page, "commendations", "ORDERS").click();
  await expect.poll(() => screen(page)).toBe("orderList");
  await listControl(page, "orderList", "ARCHIVE").click();
  await expect.poll(() => screen(page)).toBe("archive");
  await expect(listControl(page, "archive", "ARCHIVE")).toHaveCount(0);
  expect(await medalsOf(page, "archive")).toEqual({ sub: "1/18", aria: "MEDALS, 1 of 18 earned" });
  await listControl(page, "archive", "MEDALS").click();
  await expect.poll(() => screen(page)).toBe("commendations");
  await listControl(page, "commendations", "ORDERS").click();
  await expect.poll(() => screen(page)).toBe("orderList");
  expect(await medalsOf(page, "orderList")).toEqual({ sub: "1/18", aria: "MEDALS, 1 of 18 earned" });
  await listControl(page, "orderList", "MEDALS").click();
  await expect.poll(() => screen(page)).toBe("commendations");
  // The walls follow the count, on the screen showing them, the list's scroll kept: a save restored here, then in the archive.
  const names = await f.locator('[data-piece="medal"]').evaluateAll((ms) => ms.map((m) => m.getAttribute("data-achievement")!));
  const setEarned = (earned: string[]) =>
    page.evaluate((e) => (window as unknown as { __tc2: { game: { achievements: { setEarned(n: string[]): void } } } }).__tc2.game.achievements.setEarned(e), earned);
  const list = await f.locator('[data-part="commendations-list"]').elementHandle();
  await list!.evaluate((e) => (e.scrollTop = 120));
  const second = names.find((n) => n !== "Under Budget")!;
  await setEarned(["Under Budget", second]);
  await expect(f.locator(`[data-piece="medal"][data-achievement="${second}"]`)).toHaveAttribute("data-earned", "true");
  // The same list, not drawn again; the browser may move its scroll to keep the view as a wall above it grows.
  expect(await list!.evaluate((e) => e.isConnected)).toBe(true);
  expect(await list!.evaluate((e) => e.scrollTop)).toBeGreaterThanOrEqual(120);
  expect(await medalsOf(page, "commendations")).toEqual({ sub: "2/18", aria: "MEDALS, 2 of 18 earned" });
  await listControl(page, "commendations", "ORDERS").click();
  await openArchive(page);
  const third = names.find((n) => n !== "Under Budget" && n !== second)!;
  const a = frame(page, "archive");
  await expect(a.locator(`[data-piece="medal"][data-achievement="${third}"]`)).toHaveAttribute("data-earned", "false");
  await setEarned(["Under Budget", second, third]);
  await expect(a.locator(`[data-piece="medal"][data-achievement="${third}"]`)).toHaveAttribute("data-earned", "true");
  expect(await medalsOf(page, "archive")).toEqual({ sub: "3/18", aria: "MEDALS, 3 of 18 earned" });
});

test("Keys under paper: while a debrief lies on the board only AUDIO answers, by key as by pointer; the debrief closes and the game goes on", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  await runOrder(page, 5, W[5]);
  await closePaper(page);
  await waitWhole(page);
  const debrief = await paperLines(page);
  expect(debrief.at(-1)).toBe("ORDER 6 UNLOCKED: Latin hour.");
  await expect(frameOf(page)).toHaveAttribute("data-locked", "false");
  /** The control bar's key that holds focus, by its control, or null. */
  const focused = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      return a?.closest(".tc-cbar") ? (a.closest("[data-control]")?.getAttribute("data-control") ?? "?") : null;
    });
  // From AUDIO, Tab passes over ORDERS and MEDALS (and the board's own keys): they are out of reach. Focus may come round to
  // AUDIO again, the one key live.
  await frameOf(page).locator('[data-control="audio"] .tc-plate').focus();
  expect(await focused()).toBe("audio");
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect([null, "audio"]).toContain(await focused());
  }
  // MEDALS takes no focus, and Enter leaves nothing.
  const medals = frameOf(page).locator('[data-slot="board.control.medals"] .tc-plate');
  expect(await medals.evaluate((e) => !!e.closest("[inert]"))).toBe(true);
  await medals.evaluate((e) => {
    (document.activeElement as HTMLElement | null)?.blur();
    (e as HTMLElement).focus();
  });
  expect(await focused()).toBeNull();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  expect(await screen(page)).toBe("board");
  expect(await paperLines(page)).toEqual(debrief);
  // The debrief closes; the save code prints and closes; the keys answer again.
  await closePaper(page);
  await waitWhole(page);
  expect((await paperLines(page))[0]).toBe("SAVE CODE");
  await closePaper(page);
  expect(await medals.evaluate((e) => !!e.closest("[inert]"))).toBe(false);
  // The game goes on: ORDERS, then order 6 from the list, after act 2's memo.
  await boardOrders(page).click();
  await expect.poll(() => screen(page)).toBe("orderList");
  await orderRow(page, 6).click();
  await waitWhole(page);
  expect(await paperLines(page)).toContain("COMMS");
  await closePaper(page);
  await waitBoardOpen(page, 6);
  // In the archive too: a reprint lies over it, MEDALS is out of reach, AUDIO is not.
  await openArchive(page);
  await frame(page, "archive").locator("button[data-report]").first().click();
  await waitWhole(page);
  const archiveMedals = listControl(page, "archive", "MEDALS");
  expect(await archiveMedals.evaluate((e) => !!e.closest("[inert]"))).toBe(true);
  expect(await frame(page, "archive").locator('[data-control="audio"] .tc-plate').evaluate((e) => !!e.closest("[inert]"))).toBe(false);
  await closePaper(page);
  expect(await archiveMedals.evaluate((e) => !!e.closest("[inert]"))).toBe(false);
});

test("Key click: a real press of a plate or a row plays the key cue once; held, focused or with AUDIO off, none sounds", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("to-16") });
  await openGame(page);
  await recordSounds(page);
  const keys = async () => (await sounds(page)).filter((s) => s.name === "key");
  // A plate in the control bar: one click per press.
  await listControl(page, "orderList", "MEDALS").click();
  await expect.poll(() => screen(page)).toBe("commendations");
  expect(await keys()).toEqual([expect.objectContaining({ sounded: true })]);
  // The held key does nothing and clicks not; keyboard focus alone clicks not.
  await listControl(page, "commendations", "MEDALS").click({ force: true });
  await listControl(page, "commendations", "ORDERS").focus();
  expect(await keys()).toHaveLength(1);
  // A key pressed from the keyboard is a real press.
  await page.keyboard.press("Enter");
  await expect.poll(() => screen(page)).toBe("orderList");
  expect(await keys()).toHaveLength(2);
  // A row that opens something: one click; the switches keep their own sound and give none.
  await orderRow(page, 3).click();
  await waitBoardOpen(page, 3);
  expect(await keys()).toHaveLength(3);
  await control(page, "run").click();
  expect((await sounds(page)).filter((s) => s.name === "runSwitch")).toHaveLength(1);
  await expect(frameOf(page)).toHaveAttribute("data-run", "running");
  // FAST clicks as it is pressed (no run sound: FEEL-15 holds in the sandbox).
  await control(page, "fast").click();
  expect(await keys()).toHaveLength(4);
  await waitWhole(page);
  expect(await keys()).toHaveLength(4);
  // On paper: SHARE clicks too.
  await paper(page).locator('[data-control="share-open"]').click();
  expect(await keys()).toHaveLength(5);
  await closePaper(page);
  // SKIP clicks as it is pressed, in a run at its own speed (a SKIP after the run's end does nothing and clicks not).
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "running");
  await control(page, "skip").click();
  expect(await keys()).toHaveLength(6);
  await waitWhole(page);
  expect(await keys()).toHaveLength(6);
  await closePaper(page);
  const n = 6;
  // AUDIO off: a press asks for the click and nothing sounds.
  await frameOf(page).locator('[data-control="audio"] .tc-plate').click();
  await page.locator('.tc-frame[data-screen="board"] [data-slot="board.control.orders"] .tc-plate').click();
  await expect.poll(() => screen(page)).toBe("orderList");
  const all = await keys();
  expect(all).toHaveLength(n + 1);
  expect(all.at(-1)!.sounded).toBe(false);
  expect(all.slice(0, -1).every((k) => k.sounded)).toBe(true);
});

test("Keys keep focus: RUN pressed by key lays the Board's keys out again for the run, and focus stays on RUN", async ({ page, context }) => {
  await prepare(context, { seed: seedFile("act1-but-5") });
  await openGame(page);
  await openFromList(page, 1);
  await setWiring(page, W[1]);
  const run = control(page, "run");
  await run.focus();
  await page.keyboard.press("Space");
  await expect(frameOf(page)).not.toHaveAttribute("data-run", "idle");
  // The run's keys stand in UNDO's and RESET's places: the bar was laid out again.
  await expect(frameOf(page).locator('.tc-cbar .tc-plate[data-label="FAST"]')).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-control="run"]'))).toBe(true);
});
