// The values a build sets (offline-play.md and measures.md parameters, build/order.md Release). scripts/build.ts defines
// TC2_BUILD; without it (bun test) the release values stand. The test build points GameLink and CountAddress at local test
// servers and may raise GameVersion (acceptance.md, Test build).

export type BuildValues = {
  /** GameVersion: 1 at the first release, one more each release. */
  readonly version: number;
  /** GameLink, the game's address without its scheme; null: this page's own address (the test build). */
  readonly link: string | null;
  /** CountAddress: the GoatCounter /count endpoint; empty sends nothing. "local": this page's own test receiver. */
  readonly countAddress: string;
  readonly test: boolean;
};

declare const TC2_BUILD: BuildValues | undefined;

/** GameLink: the GitHub Pages address, 48 characters, over GameLinkMax 30 by the owner's leave (plan.md). */
export const RELEASE_LINK = "handsomeshan111.github.io/transmission-control-2";

export const RELEASE: BuildValues = { version: 1, link: RELEASE_LINK, countAddress: "", test: false };

export const BUILD: BuildValues = typeof TC2_BUILD === "undefined" ? RELEASE : TC2_BUILD;
