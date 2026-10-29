# Loading

Design status: Defined.

## Goal

The player waits while the game's files load for the first time. Reached from: the game's link in a browser that lacks its files: [OFFLINE-01](../platform/offline-play.md#offline-01-first-load).

## Shows

- "LOADING" and how much has loaded, and "NO SIGNAL": [OFFLINE-01](../platform/offline-play.md#offline-01-first-load). It prints silent, before the first tap: [ART-17](../art-direction-sound.md#art-17-sound-palette). The cannot-store line prints once the game opens, on the screen it opens on: [REPORT-04](../board/reports.md#edge-cases).

## Controls

- None. Loading ends on its own, and the game opens: [CAMPAIGN-01](../campaign/campaign.md#campaign-01-opening-misfire), [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list).

## Layout

Values at the smallest and the largest screen of the vision's [Platform](../vision.md#platform), as [UI style](style.md#style) scales them.

Frame: [Console frame](style.md#console-frame).

- Order bar: "TRANSMISSION CONTROL 2" in TextSize.
- Control bar: empty.
- Window: the empty Ink ground; the lines print on a printout over it: [Printout](style.md#printout).

## Links

- [UI style](style.md).
