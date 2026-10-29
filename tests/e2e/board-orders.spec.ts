// Every one of the 30 orders opens in the sandbox, and its test wiring (design/docs/build/wirings.md, the line's first
// wiring), wired through the real UI, wins with a mission report. Chromium, both sizes.
import { expect, test } from "@playwright/test";
import { TEST_WIRINGS } from "../../src/testbuild/wirings.gen";
import { closeReport, frameOf, openOrder, runAndRead, wireUp } from "./board-kit";

test.describe.configure({ mode: "parallel" });

for (const line of TEST_WIRINGS) {
  test(`order ${line.order}: its test wiring, wired through the board, wins`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "this check runs in Chromium");
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openOrder(page, line.order);
    await expect(frameOf(page)).toHaveAttribute("data-order", String(line.order));
    await wireUp(page, line.wirings[0]!.wires);
    const r = await runAndRead(page);
    expect(r.form).toBe("mission");
    expect(r.lines[0]).toMatch(/: delivered as ordered\.$/);
    await closeReport(page);
    expect(errors).toEqual([]);
  });
}
