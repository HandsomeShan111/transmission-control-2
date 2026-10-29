// Helpers for the game's browser tests: the test build under /transmission-control-2/, as GitHub Pages serves it.
// Wiring goes through the real UI (the Board's helpers); saves are seeded from test files in the save's own terms.
import { expect, type BrowserContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { control, cutByDrag, frameOf, plugByTaps, wireEl } from "./board-kit";

export const GAME = "/transmission-control-2/";

/** Design values the tests name (campaign.md, feel-campaign.md, saving.md, report-sharing.md parameters). */
export const D = {
  OpeningGuard: 1.0,
  WakeTime: 0.25,
  SelfThrowDelay: 0.4,
  StandbyLight: 0.25,
  PaperFeedTime: 0.3,
  PrintLineTime: 0.15,
  TearTime: 0.25,
  ScrollBackTime: 0.4,
  BellLead: 0.4,
  PopTime: 0.16,
  SwitchThrowTime: 0.12,
  ItemLeaveTime: 0.5,
  ViewMoveTime: 0.6,
  OpenStagger: 0.08,
  OpenSettleTime: 0.5,
  OpenZoomFrom: 0.92,
  HandResults: 3,
  OrdersPerAct: 5,
  Acts: 6,
  LoadStep: 10,
  FirstLoadMax: 1_000_000,
  SendWait: 30,
  PictureWidth: 1080,
  PictureHeight: 1350,
  QRSize: 240,
  PictureTextRows: 3,
  PictureDrawingMin: 400,
} as const;

export const seedFile = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "saves", `${name}.json`), "utf8")) as object;

/** Sets what a browser sees before the game first opens: a seed, held points, aid answers; set once per browser (`once`), on its
 * first page load, so a reload or a second page opens on what the game kept. `key`: the test server's key (scripts/serve.ts). */
export async function prepare(
  ctx: BrowserContext | Page,
  o: { seed?: object; holds?: string[]; persist?: "granted" | "refused"; clipboard?: "refuse"; once?: boolean; key?: string } = {},
) {
  if (o.key) {
    const c = "context" in ctx ? ctx.context() : ctx;
    await c.addCookies([{ name: "tc2test", value: o.key, domain: "127.0.0.1", path: "/" }]);
  }
  const id = `tc2test.prepared.${Math.random().toString(36).slice(2)}`;
  await ctx.addInitScript(
    ({ id, seed, holds, persist, clipboard, once, key }) => {
      try {
        if (key) localStorage.setItem("tc2aid.countKey", key);
        if (once && localStorage.getItem(id)) return;
        localStorage.setItem(id, "1");
        if (seed) localStorage.setItem("tc2aid.seed", JSON.stringify(seed));
        if (holds) localStorage.setItem("tc2aid.holds", JSON.stringify(holds));
        if (persist) localStorage.setItem("tc2aid.persist", persist);
        if (clipboard) localStorage.setItem("tc2aid.clipboard", clipboard);
      } catch {
        // storage blocked: nothing to prepare
      }
    },
    { id, seed: o.seed ?? null, holds: o.holds ?? null, persist: o.persist ?? null, clipboard: o.clipboard ?? null, once: o.once ?? true, key: o.key ?? null },
  );
}

/** The title screen's plate: START on a new game, CONTINUE once there is progress. */
export const titlePlate = (page: Page) => page.locator('.tc-frame[data-screen="title"] [data-control="start"], .tc-frame[data-screen="title"] [data-control="continue"]');

/**
 * The title screen every open of the game shows, after LOADING on a first load: waits for it, then presses its plate as a
 * player does. `want`: the plate it must show. Returns the plate pressed.
 */
export async function passTitle(page: Page, want?: "start" | "continue", timeout = 60_000): Promise<"start" | "continue"> {
  await expect.poll(() => screen(page), { timeout }).toBe("title");
  const plate = titlePlate(page);
  await expect(plate).toBeVisible();
  const which = (await plate.getAttribute("data-control")) as "start" | "continue";
  if (want) expect(which).toBe(want);
  await plate.click();
  await expect.poll(() => screen(page)).not.toBe("title");
  // A press within the double-click time after the title's is let go (a double click's second): wait it out.
  await page.waitForFunction(() => !("titlePressed" in document.documentElement.dataset));
  return which;
}

/** Opens the game, passes its title screen, and waits for it to open on its first screen. */
export async function openGame(page: Page, query = ""): Promise<void> {
  await page.goto(GAME + query);
  await page.waitForFunction(() => !!(window as unknown as { __tc2?: unknown }).__tc2, null, { timeout: 30_000 });
  await page.waitForFunction(() => (window as unknown as { __tc2: { opened: boolean } }).__tc2.opened, null, { timeout: 60_000 });
  await passTitle(page);
  await expect.poll(() => screen(page)).toMatch(/board|orderList/);
}

/** Reloads the game's page and passes its title screen. */
export async function reopen(page: Page, want?: "start" | "continue"): Promise<void> {
  await page.reload();
  await passTitle(page, want);
}

export const screen = (page: Page) => page.evaluate(() => document.documentElement.dataset.screen ?? null);
export const frame = (page: Page, id: string) => page.locator(`.tc-frame[data-screen="${id}"]`);
/** The printout on the screen showing; the newest when several lie there. */
export const paper = (page: Page) => page.locator(".tc-frame:not([hidden]) .tc-paper:not(.tc-tearing)").last();
export const paperText = async (page: Page) => (await paper(page).innerText()).replace(/\s+/g, " ").trim();
/** One line per printed line, wrapped rows joined (ART-12: a line means one authored line). */
export const paperLines = (page: Page) =>
  paper(page).evaluate((p) => [...p.querySelectorAll('[data-part="paper-line"] [data-part="strike1"]')].map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));

/** A report's own lines, without the lines after it (the Board prints those in its foot). */
export const reportLines = (page: Page) =>
  paper(page).evaluate((p) => [...p.querySelectorAll('.tc-lines [data-part="paper-line"] [data-part="strike1"]')].map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));

/** Taps a printout on its paper, away from its plates. */
export async function tapPaper(page: Page): Promise<void> {
  const p = paper(page);
  const b = (await p.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + Math.min(24, b.height / 3));
}

/** REPORT-04: a tap prints the rest at once; a tap once whole closes it. Waits for the tear. */
export async function closePaper(page: Page): Promise<void> {
  const p = paper(page);
  await expect(p).toBeVisible();
  const handle = await p.elementHandle();
  await tapPaper(page);
  await page.waitForTimeout(80);
  if (handle && (await handle.evaluate((e) => e.isConnected && !e.classList.contains("tc-tearing")))) await tapPaper(page);
  await page.waitForFunction((e) => !e || !e.isConnected, handle, { timeout: 5000 });
}

/** Waits until a printout stands whole: its lines stop growing for longer than a line and a bell's lead take. */
export async function waitWhole(page: Page): Promise<void> {
  const p = paper(page);
  await expect(p).toBeVisible({ timeout: 15_000 });
  let last = -1;
  for (let i = 0; i < 100; i++) {
    const n = await p.evaluate((e) => e.querySelectorAll('[data-part="paper-line"]').length).catch(() => -1);
    if (n === last && n > 0) return;
    last = n;
    await page.waitForTimeout((D.BellLead + D.PrintLineTime) * 1000 + 100);
  }
}

/** Plugs each wire of a wiring by tap-tap, skipping wires already there. */
export async function wire(page: Page, wiring: string): Promise<void> {
  for (const part of wiring.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [from, to] = part.split("→").map((s) => s.trim()) as [string, string];
    if ((await wireEl(page, from, to).count()) > 0) continue;
    await plugByTaps(page, from, to);
  }
}

/** Flips RUN, skips to the end, and waits for the report to print. */
export async function runAndSkip(page: Page): Promise<void> {
  await control(page, "run").click();
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/);
  if ((await frameOf(page).getAttribute("data-run")) === "running") await control(page, "skip").click().catch(() => {});
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 20_000 });
  await expect(paper(page)).toBeVisible();
}

export const testWiring = (page: Page, n: number, label?: string) =>
  page.evaluate(([n, label]) => (window as unknown as { __tc2: { testWiring(n: number, l?: string): string | null } }).__tc2.testWiring(n as number, label as string | undefined), [n, label] as const);

export const kept = (page: Page) => page.evaluate(() => (window as unknown as { __tc2: { keptView(): unknown } }).__tc2.keptView()) as Promise<null | {
  version: number;
  won: number[];
  bests: Record<number, { wires: number; beats: number }>;
  moves: Record<number, number>;
  parsMet: Record<number, string[]>;
  found: Record<number, number[]>;
  earned: string[];
  memos: number[];
  debriefs: number[];
  lamps: number[];
  filed: number;
}>;

/** The order list's row of order n. */
export const orderRow = (page: Page, n: number) => page.locator(`.tc-frame[data-screen="orderList"] [data-order="${n}"]`);
export const listControl = (page: Page, screenId: string, label: string) => page.locator(`.tc-frame[data-screen="${screenId}"] .tc-cbar .tc-plate[data-label="${label}"]`);

/** Opens order n from the order list: ORDERS on the Board when needed, then its row. */
export async function openFromList(page: Page, n: number): Promise<void> {
  if ((await screen(page)) === "board") await page.locator('.tc-frame[data-screen="board"] [data-slot="board.control.orders"] .tc-plate').click();
  await expect(frame(page, "orderList")).toBeVisible();
  await orderRow(page, n).click();
}

export async function waitBoardOpen(page: Page, n: number): Promise<void> {
  await expect(frameOf(page)).toHaveAttribute("data-order", String(n));
  await expect(frameOf(page)).toHaveAttribute("data-run", "idle");
  await page.waitForTimeout(900);
}

export async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: `tmp/campaign/${name}-${info.project.name}.png` });
}

export const tc2 = <T>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([fn, args]) => (window as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>).__tc2![fn as string]!(...(args as unknown[])), [fn, args] as const) as Promise<T>;

export const counts = async (page: Page, key: string) =>
  (await page.request.get(`/__test/counts?key=${key}`)).json() as Promise<{ url: string; cookie: string | null; referer: string | null; method: string }[]>;
export const setServer = async (page: Page, key: string, q: string) => (await page.request.get(`/__test/set?key=${key}&${q}`)).json();
/** A key of this test's own, for the test server's settings and counter. */
export const keyFor = (info: TestInfo) => `t${info.testId}${info.project.name}${info.repeatEachIndex}${info.retry}`.replace(/[^A-Za-z0-9]/g, "");

export type { Locator };

/** The board's wiring now, as the order data writes it, from the wires drawn. */
export const wiringNow = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.tc-frame[data-screen="board"] [data-layer="wires"] [data-piece="wire"][data-from][data-to]')]
      .map((e) => `${e.getAttribute("data-from")} → ${e.getAttribute("data-to")}`)
      .sort(),
  );

/** Makes the board's wiring equal `wiring` through the UI: RESET when a wire is wrong, then plugs by taps, then cuts the rest. */
export async function setWiring(page: Page, wiring: string): Promise<void> {
  const want = wiring.split(";").map((s) => s.trim()).filter(Boolean);
  if ((await wiringNow(page)).some((w) => !want.includes(w))) {
    await control(page, "reset").click();
    // The reset's wires retract and the view settles before the next plug.
    await page.waitForTimeout(800);
  }
  await wire(page, wiring);
  for (const w of await wiringNow(page)) if (!want.includes(w)) await cutByDrag(page, w.split(" → ")[0]!);
  expect(await wiringNow(page)).toEqual([...want].sort());
}

/** A new game, no save: START on the title, then the board waits in standby for the first tap (CAMPAIGN-01). */
export async function newGame(page: Page): Promise<void> {
  await page.goto(GAME);
  await passTitle(page, "start");
  await expect(frameOf(page)).toHaveAttribute("data-standby", "true", { timeout: 20_000 });
}

/** CAMPAIGN-01: the first tap runs the misfire; a tap after OpeningGuard skips it; waits for its report whole. */
export async function playMisfire(page: Page): Promise<string[]> {
  const win = (await frameOf(page).locator(".tc-window").boundingBox())!;
  await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", /running|alarm|printing/, { timeout: 3000 });
  await page.waitForTimeout(D.OpeningGuard * 1000 + 150);
  if ((await frameOf(page).getAttribute("data-run")) === "running") await page.mouse.click(win.x + 20, win.y + 20);
  await expect(frameOf(page)).toHaveAttribute("data-run", "printing", { timeout: 20_000 });
  await waitWhole(page);
  return paperLines(page);
}

/** Opens order n from the order list, sets its wiring, runs it and returns the report's lines once whole. */
export async function runOrder(page: Page, n: number, wiring: string): Promise<string[]> {
  if ((await screen(page)) !== "board" || (await frameOf(page).getAttribute("data-order")) !== String(n)) {
    await openFromList(page, n);
    await waitBoardOpen(page, n);
  }
  await setWiring(page, wiring);
  await runAndSkip(page);
  await waitWhole(page);
  return paperLines(page);
}

/** ORDERS on the Board, or the archive's ORDERS: the order list. */
export async function toOrderList(page: Page): Promise<void> {
  const s = await screen(page);
  if (s === "board") await page.locator('.tc-frame[data-screen="board"] [data-slot="board.control.orders"] .tc-plate').click();
  if (s === "archive") await listControl(page, "archive", "ORDERS").click();
  await expect.poll(() => screen(page)).toBe("orderList");
}

/** ARCHIVE from the order list. */
export async function openArchive(page: Page): Promise<void> {
  if ((await screen(page)) !== "orderList") await toOrderList(page);
  await listControl(page, "orderList", "ARCHIVE").click();
  await expect.poll(() => screen(page)).toBe("archive");
}

export type ArchiveRowView = { lead: string; second: string; report: string | null; result: string | null; dropped: boolean };

/** The archive's rows under order n: its results line, then each filed report's lead and second row. */
export const archiveOf = (page: Page, n: number) =>
  page.evaluate((n) => {
    const list = document.querySelector('.tc-frame[data-screen="archive"] [data-part="archive-list"]')!;
    const row = list.querySelector(`[data-order="${n}"]`);
    if (!row) return null;
    const text = (e: Element | null) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    const rows: { lead: string; second: string; report: string | null; result: string | null; dropped: boolean }[] = [];
    for (let e = row.nextElementSibling; e && !e.hasAttribute("data-order") && !e.hasAttribute("data-act"); e = e.nextElementSibling)
      rows.push({
        lead: text(e.querySelector(".tc-lead")),
        second: [...e.querySelectorAll(".tc-r2 > span")].map((s) => text(s)).join(" | "),
        report: e.getAttribute("data-report"),
        result: e.getAttribute("data-result"),
        dropped: e.getAttribute("data-dropped") === "true",
      });
    return { results: text(row.querySelector(".tc-r1")), rows };
  }, n);

export type MedalView = { name: string; earned: boolean; text: string; label: string };

/** The archive's medals beside act a, under its heading: each one's name, whether earned, its line, and its label. */
export const achievementRows = (page: Page, act: number) =>
  page.evaluate((act) => {
    const list = document.querySelector('.tc-frame[data-screen="archive"] [data-part="archive-list"]')!;
    const head = list.querySelector(`[data-act="${act}"]`)!;
    const grid = head.nextElementSibling;
    if (!grid || grid.getAttribute("data-part") !== "medals") return [];
    const text = (e: Element | null) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    return [...grid.querySelectorAll('[data-piece="medal"]')].map((m) => ({
      name: text(m.querySelector('[data-part="medal-name"]')),
      earned: m.getAttribute("data-earned") === "true",
      text: text(m.querySelector('[data-part="medal-text"]')),
      label: m.getAttribute("aria-label") ?? "",
    }));
  }, act) as Promise<MedalView[]>;

/** A printout printed at once: every line there within a frame or two of its first showing. */
export async function printsAtOnce(page: Page, within = 250): Promise<boolean> {
  const p = paper(page);
  await expect(p).toBeVisible();
  const a = await p.evaluate((e) => e.querySelectorAll('[data-part="paper-line"]').length);
  await page.waitForTimeout(within);
  const b = await p.evaluate((e) => e.querySelectorAll('[data-part="paper-line"]').length);
  return a > 0 && a === b;
}

/** Records each sound the game plays from now on, and whether it sounded (null while muted). */
export const recordSounds = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __tc2: { game: { sound: { play: (...a: unknown[]) => unknown } } }; __plays?: { name: string; at: number; sounded: boolean }[] };
    const s = w.__tc2.game.sound;
    const orig = s.play.bind(s);
    w.__plays = [];
    s.play = (...a: unknown[]) => {
      const r = orig(...a);
      w.__plays!.push({ name: String(a[0]), at: performance.now(), sounded: r !== null });
      return r;
    };
  });
export const sounds = (page: Page) =>
  page.evaluate(() => (window as unknown as { __plays?: { name: string; at: number; sounded: boolean }[] }).__plays ?? []);

/** The test wirings of act 1 (build/wirings.md), and the wirings the acceptance tests name. */
export const W = {
  1: "IN → LAMINATOR; LAMINATOR → World Council",
  2: "IN → SHREDDER; LAMINATOR → Parade Control; SHREDDER → LAMINATOR",
  3: "IN → INSPECTOR; INSPECTOR minus → SHREDDER 1; INSPECTOR plus → LAMINATOR; LAMINATOR → Embassy; SHREDDER 1 → INSPECTOR",
  4: "IN → INSPECTOR; INSPECTOR minus → SHREDDER; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; SHREDDER → INSPECTOR",
  /** Order 5, LAMINATOR before INSPECTOR: WirePar met. */
  5: "IN → LAMINATOR 1; LAMINATOR 1 → INSPECTOR; INSPECTOR minus → Museum; INSPECTOR plus → Archive",
  /** Order 5, INSPECTOR before each LAMINATOR: five wires. */
  "5i": "IN → INSPECTOR; LAMINATOR 1 → Archive; LAMINATOR 2 → Museum; INSPECTOR minus → LAMINATOR 2; INSPECTOR plus → LAMINATOR 1",
  /** Order 5's last hand-written result: the treaty laminated, at the Museum. */
  "5r3": "IN → LAMINATOR 1; LAMINATOR 1 → Museum",
} as const;

export const RESULT_1_1 = "The treaty arrived unlaminated, so legally a napkin. Hostilities resume at 0905.";

/** The game's service worker registration as the page sees it: each worker's state, or null. */
export const workers = (page: Page) =>
  page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration("/transmission-control-2/");
    return { active: r?.active?.state ?? null, waiting: r?.waiting?.state ?? null, installing: r?.installing?.state ?? null };
  });
/** Waits for the game's worker to be active (its files kept). */
export const workerActive = (page: Page) => expect.poll(async () => (await workers(page)).active, { timeout: 60_000 }).toBe("activated");
/** Waits for a new version to wait beside the one playing (OFFLINE-03). */
export const workerWaiting = (page: Page) => expect.poll(async () => (await workers(page)).waiting, { timeout: 60_000 }).toBe("installed");
/** Waits until no version waits or installs, and one is active. */
export const workerSettled = (page: Page) =>
  expect.poll(() => workers(page), { timeout: 60_000 }).toEqual({ active: "activated", waiting: null, installing: null });
