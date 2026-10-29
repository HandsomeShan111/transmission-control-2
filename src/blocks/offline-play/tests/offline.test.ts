// OFFLINE- rules a logic run can check (design/docs/build/acceptance-platform.md, Offline play); the browser tests load and
// reopen the game: tests/e2e/platform.spec.ts.
import { describe, expect, test } from "bun:test";
import qrcode from "qrcode-generator";
import { GAME_LINK_MAX, LOAD_STEP, RELEASE, RELEASE_LINK, cacheName, cacheVersion, gameLink, gameVersion, isGameCache, loadSteps } from "../api";

describe("OFFLINE-01 First load", () => {
  test("LOADING lines in steps of LoadStep, by bytes, each once", () => {
    expect(loadSteps(0, 1000, 0)).toEqual([]);
    expect(loadSteps(250, 1000, 0)).toEqual(["10%", "20%"]);
    expect(loadSteps(260, 1000, 20)).toEqual([]);
    expect(loadSteps(1000, 1000, 20)).toEqual(["30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"]);
    expect(LOAD_STEP).toBe(10);
  });
});

describe("OFFLINE-03 New version", () => {
  test("one cache per GameVersion and file list; GameVersion starts at 1", () => {
    expect(gameVersion()).toBe(1);
    expect(RELEASE.version).toBe(1);
    expect(cacheName(2, "abc")).not.toBe(cacheName(1, "abc"));
    expect(isGameCache(cacheName(1, "abc"))).toBe(true);
    expect(isGameCache("other")).toBe(false);
    // Activation deletes caches by the GameVersion their names carry.
    expect(cacheVersion(cacheName(12, "abc"))).toBe(12);
    expect(cacheVersion("tc2-vx-abc")).toBeNull();
    expect(cacheVersion("other")).toBeNull();
  });
});

describe("GameLink", () => {
  test("the GitHub Pages address, 48 characters, over GameLinkMax by the owner's leave; its QR code is version 4 at level M", () => {
    expect(gameLink()).toBe(RELEASE_LINK);
    expect(RELEASE_LINK).toBe("handsomeshan111.github.io/transmission-control-2");
    expect(RELEASE_LINK.length).toBe(48);
    expect(RELEASE_LINK.length).toBeGreaterThan(GAME_LINK_MAX);
    const q = qrcode(0, "M");
    q.addData(`https://${RELEASE_LINK}`);
    q.make();
    expect((q.getModuleCount() - 17) / 4).toBe(4);
  });
});
