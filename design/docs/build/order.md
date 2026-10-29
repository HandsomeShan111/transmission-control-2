# Build order

Builders start here. Rules live on the linked pages; this page orders them.
Tests: [Acceptance tests](acceptance.md). Values to tune: [Tunables](tunables.md).

## Versions

- TypeScript 7.0.2.
- Browsers: Baseline Widely available on 26 Oct 2026. Least versions: Chrome and Edge 124, Firefox 125, Safari 17.4, each on desktop and phone.
- Libraries: none but a QR encoder, for [SHARE-02](../campaign/report-sharing.md#share-02-picture); the build pins its version in its lock file.

## Before building

- [OQ-PLATFORM-05](../open-questions/platform.md#oq-platform-05-silent-switch): how a phone's silent switch treats the game's sounds. Blocks: no system; the result the [SETTING-01](acceptance-platform.md#settings) test expects on a phone set to silent.

## Order

1. [Orders](../orders/orders.md), steps `ORDER-`, with [Data](../data.md) and its parts. Needs: none. Stubs: none.
2. [Wiring board](../board/wiring-board.md), steps `BOARD-`. Needs: [Orders](../orders/orders.md). Stubs: [Wires](../board/wires.md), the opening wiring's wires and a held wire at the window's edge; [Items](../board/items.md), the required outputs drawn; [Run](../board/run.md), the run started; [Run view](../board/run-view.md), the report closed; [Campaign](../campaign/campaign.md), the order list; [Saving](../platform/saving.md), a kept wiring.
3. [Agents](../board/agents.md), steps `AGENT-`. Needs: [Wiring board](../board/wiring-board.md), [Orders](../orders/orders.md). Stubs: [Run](../board/run.md), an item at an input jack; [Items](../board/items.md), an item's kind, marks and copies.
4. [Wires](../board/wires.md), steps `WIRE-`. Needs: [Wiring board](../board/wiring-board.md), [Agents](../board/agents.md). Stubs: none.
5. [Items](../board/items.md), steps `ITEM-`. Needs: [Orders](../orders/orders.md), [Agents](../board/agents.md). Stubs: [Run](../board/run.md), the run started and each item's end; [Reports](../board/reports.md), the first difference.
6. [Run](../board/run.md), steps `RUN-`. Needs: [Wiring board](../board/wiring-board.md), [Wires](../board/wires.md), [Agents](../board/agents.md), [Items](../board/items.md). Stubs: none.
7. [Par and score](../board/par-and-score.md), steps `PAR-`. Needs: [Run](../board/run.md), [Wires](../board/wires.md), [Orders](../orders/orders.md). Stubs: none.
8. [Reports](../board/reports.md), steps `REPORT-`. Needs: [Run](../board/run.md), [Par and score](../board/par-and-score.md), [Orders](../orders/orders.md). Stubs: [Repair orders](../orders/repair-orders.md), the moves line; [Incident archive](../campaign/incident-archive.md), a report filed; [Report sharing](../campaign/report-sharing.md), the picture view; [Settings](../platform/settings.md), the AUDIO switch.
9. [Run view](../board/run-view.md), steps `VIEW-`. Needs: [Run](../board/run.md), [Reports](../board/reports.md). Stubs: [Incident archive](../campaign/incident-archive.md), a report filed.
10. [Repair orders](../orders/repair-orders.md), steps `REPAIR-`. Needs: [Wiring board](../board/wiring-board.md), [Wires](../board/wires.md), [Run](../board/run.md), [Reports](../board/reports.md). Stubs: none.
11. [Incident archive](../campaign/incident-archive.md), steps `ARCHIVE-`. Needs: [Reports](../board/reports.md), [Orders](../orders/orders.md). Stubs: [Campaign](../campaign/campaign.md), the lines after a report and a done act; [Achievements](../campaign/achievements.md), the commendations; [Report sharing](../campaign/report-sharing.md), SHARE on a reprint; [Saving](../platform/saving.md), the report that lit a lamp.
12. [Campaign](../campaign/campaign.md), steps `CAMPAIGN-`. Needs: [Run](../board/run.md), [Par and score](../board/par-and-score.md), [Repair orders](../orders/repair-orders.md), [Incident archive](../campaign/incident-archive.md). Stubs: [Achievements](../campaign/achievements.md), the commendations; [Saving](../platform/saving.md), a kept save and the save code; [Settings](../platform/settings.md), the AUDIO switch.
13. [Achievements](../campaign/achievements.md), steps `ACHIEVE-`. Needs: [Incident archive](../campaign/incident-archive.md), [Run](../board/run.md), [Par and score](../board/par-and-score.md), [Repair orders](../orders/repair-orders.md). Stubs: [Saving](../platform/saving.md), a read save code.
14. [Report sharing](../campaign/report-sharing.md), steps `SHARE-`. Needs: [Reports](../board/reports.md), [Incident archive](../campaign/incident-archive.md), [Items](../board/items.md). Stubs: none.
15. [Offline play](../platform/offline-play.md), steps `OFFLINE-`. Needs: the build's own files. Stubs: [Saving](../platform/saving.md), a read save code.
16. [Saving](../platform/saving.md), steps `SAVE-`. Needs: [Campaign](../campaign/campaign.md), [Par and score](../board/par-and-score.md), [Incident archive](../campaign/incident-archive.md), [Achievements](../campaign/achievements.md), [Wires](../board/wires.md), [Reports](../board/reports.md), [Offline play](../platform/offline-play.md). Stubs: none.
17. [Settings](../platform/settings.md), steps `SETTING-`. Needs: [Saving](../platform/saving.md). Stubs: none.

## Screens and content

- Screens: [Loading](../ui/loading.md), after [Offline play](../platform/offline-play.md); [Board](../ui/board.md), after [Run view](../board/run-view.md), its printouts and controls added with their systems; [Order list](../ui/order-list.md), after [Campaign](../campaign/campaign.md); [Incident archive](../ui/archive.md), after [Achievements](../campaign/achievements.md). Shared parts: [UI style](../ui/style.md).
- Art direction: [Art direction](../art-direction.md) steps, with its parts [objects](../art-direction-objects.md) and [sound](../art-direction-sound.md), with the screens that draw them.
- Feel: [Feel](../feel.md) steps, with its parts [run](../feel-run.md) and [campaign](../feel-campaign.md), after the steps they present.
- Assets: [Content inventory](../content.md).

## Product measures

- [Product measures](../product/measures.md), steps `MEAS-`: MEAS-04, then MEAS-01 to MEAS-03, all after [Saving](../platform/saving.md).

## Release

- GameVersion, as its parameter says: [Offline play parameters](../platform/offline-play.md#parameters).
- Set GameLink and CountAddress, the release's own: [Offline play parameters](../platform/offline-play.md#parameters), [Product measures parameters](../product/measures.md#parameters). Check GameLink holds GameLinkMax characters or fewer.
