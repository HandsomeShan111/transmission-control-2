// Screenshots of the Board for a person to compare with design/docs/ui/board.md, under tmp/board/, Chromium, both sizes.
import { expect, test } from "@playwright/test";
import { bringIntoView, control, frameOf, jack, openOrder, paper, tapAt } from "./board-kit";

test.describe.configure({ mode: "parallel" });
const shot = (name: string, project: string) => `tmp/board/${name}-${project.replace("chromium-", "")}.png`;

for (const n of [3, 13, 17, 29]) {
  test(`shot: order ${n} on opening`, async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium");
    await openOrder(page, n, n === 17 || n === 29 ? { layers: 2 } : {});
    await page.screenshot({ path: shot(`open-${n}`, info.project.name) });
  });
}

test("shot: a held wire, a run, an incident report, the alarm", async ({ page, browserName }, info) => {
  test.skip(browserName !== "chromium");
  test.setTimeout(90_000);
  await openOrder(page, 13, { wiring: "IN → SLICER; SLICER item → Embassy; SLICER copy → INSPECTOR; INSPECTOR minus → INSPECTOR; INSPECTOR plus → TASTER" });
  await tapAt(page, await bringIntoView(page, jack(page, "TASTER minus", "out")));
  await page.screenshot({ path: shot("held-13", info.project.name) });
  await tapAt(page, await bringIntoView(page, jack(page, "TASTER", "in")));
  await control(page, "run").click();
  await page.waitForTimeout(3300);
  await page.screenshot({ path: shot("run-13", info.project.name) });
  await expect(paper(page)).toBeVisible({ timeout: 30_000 });
  await expect(paper(page)).toHaveAttribute("data-state", "whole", { timeout: 30_000 });
  await page.screenshot({ path: shot("report-13", info.project.name) });
  await openOrder(page, 1, { wiring: "IN → LAMINATOR" });
  await control(page, "run").click();
  await control(page, "skip").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", "alarm");
  await page.waitForTimeout(1400);
  await page.screenshot({ path: shot("alarm-1", info.project.name) });
});
