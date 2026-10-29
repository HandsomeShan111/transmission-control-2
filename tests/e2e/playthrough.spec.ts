// A new game played from the opening misfire through act 1, orders 1 to 5, wired through the real UI with their test wirings;
// the act's debrief and save code; a reload keeps the progress; offline, the game opens again from what the browser kept.
import { expect, test } from "@playwright/test";
import { frameOf } from "./board-kit";
import { GAME, workerActive, closePaper, openFromList, orderRow, paperLines, runAndSkip, screen, shot, testWiring, waitBoardOpen, waitWhole, wire, passTitle, reopen } from "./game-kit";

test.setTimeout(240_000);

test("act 1 playthrough: misfire, orders 1 to 5, debrief and save code, reload, offline reopen", async ({ page, context }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(GAME);
  await passTitle(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 20_000 });
  await shot(page, info, "play-01-standby");

  // CAMPAIGN-01: the first tap runs the night staff's wiring; after the guard, a tap skips.
  const win = (await frameOf(page).locator(".tc-window").boundingBox())!;
  await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/, { timeout: 3000 });
  await page.waitForTimeout(1100);
  await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 20_000 });
  await waitWhole(page);
  const misfire = await paperLines(page);
  expect(misfire[0]).toContain("The treaty arrived unlaminated");
  expect(misfire).toContain("FILED: 1 of 3.");
  await shot(page, info, "play-02-misfire-report");
  await closePaper(page);
  // Act 1's memo, then order 1 opens on the night wiring.
  await waitWhole(page);
  expect((await paperLines(page))[1]).toBe("RECORDS");
  await shot(page, info, "play-03-memo");
  await closePaper(page);
  await waitBoardOpen(page, 1);

  for (const n of [1, 2, 3, 4, 5]) {
    if (n > 1) {
      await openFromList(page, n);
      await waitBoardOpen(page, n);
    }
    await wire(page, (await testWiring(page, n))!);
    await runAndSkip(page);
    await waitWhole(page);
    const lines = await paperLines(page);
    expect(lines[0], `order ${n}`).toMatch(/delivered as ordered\.$/);
    if (n < 5) expect(lines, `order ${n}`).toContain(`ORDER ${n + 1} UNLOCKED: ${["", "Victory parade", "Diplomatic pouch", "Archive day", "Museum split"][n]}.`);
    await shot(page, info, `play-04-order-${n}-report`);
    await closePaper(page);
    await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  }
  // CAMPAIGN-04: the debrief, then the save code (SAVE-02).
  await waitWhole(page);
  const debrief = await paperLines(page);
  expect(debrief[debrief.length - 1]).toBe("ORDER 6 UNLOCKED: Latin hour.");
  for (const n of [1, 2, 3, 4, 5]) expect(debrief.some((l) => new RegExp(`^${n} .+: Wires \\d+.* Time \\d+`).test(l)), `order ${n}`).toBe(true);
  await shot(page, info, "play-05-debrief");
  await closePaper(page);
  await waitWhole(page);
  const code = (await paperLines(page))[1]!.replace(/\s+/g, "");
  expect(code).toMatch(/^TC2-1-[A-Za-z0-9_-]+-[A-Za-z0-9_-]{6}$/);
  await shot(page, info, "play-06-save-code");
  await closePaper(page);

  // A reload keeps the progress: the order list, act 2 open, orders 1 to 5 won.
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  for (const n of [1, 2, 3, 4, 5]) await expect(orderRow(page, n)).toHaveAttribute("data-won", "true");
  await expect(orderRow(page, 6)).toHaveAttribute("data-won", "false");
  await shot(page, info, "play-07-order-list");

  // Offline: the game opens again from the kept files (OFFLINE-02).
  await workerActive(page);
  await context.setOffline(true);
  await reopen(page);
  await expect.poll(() => screen(page), { timeout: 20_000 }).toBe("orderList");
  await expect(orderRow(page, 5)).toHaveAttribute("data-won", "true");
  await shot(page, info, "play-08-offline");
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
