# Incident archive

Design status: Defined.

## Goal

The player reads what Mission Control has filed, reprints a report to share it, and sees each act's achievements. Reached from: ARCHIVE on the [Order list](order-list.md): [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).

## Shows

- The acts and orders the order list shows, each order with its results found, and its filed reports in their order: [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).
- Beside each act, its achievements, earned and not: [ACHIEVE-02](../campaign/achievements.md#achieve-02-show).
- Printouts: a reprinted report with its share control, a debrief, the save code, share lines and the picture view: [ARCHIVE-03](../campaign/incident-archive.md#archive-03-reprint), [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end), [SAVE-02](../platform/saving.md#save-02-copy-out), [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture).

## Controls

- A filed report's row → it reprints: [ARCHIVE-03](../campaign/incident-archive.md#archive-03-reprint).
- A done act's heading → its debrief: [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end).
- On the save code: COPY, [SAVE-02](../platform/saving.md#save-02-copy-out).
- On a reprint: SHARE, then TEXT or PICTURE: [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture).
- ORDERS → the order list: [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list).
- AUDIO → [SETTING-01](../platform/settings.md#setting-01-sound).

## Layout

Values at the smallest and the largest screen of the vision's [Platform](../vision.md#platform), as [UI style](style.md#style) scales them.

Frame: [Console frame](style.md#console-frame).

- Order bar: "INCIDENT ARCHIVE" in TextSize.
- Control bar, from its start: ORDERS, AUDIO. Shared parts: [Plate](style.md#plate), [Switch](style.md#switch).
- Window: per act, its heading row, then one row per achievement, then each order. Shared part: [List row](style.md#list-row).
- An achievement row: GraphiteLight, Cream text. Earned: its commendation as [ACHIEVE-02](../campaign/achievements.md#achieve-02-show) prints it, and its line. Not earned: its kind only.
- An order: a row with its number, name and results found, as [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse) words them; under it, one row per filed report, indented by PlateGap, holding its lead as printed, two lines at most, then "…". A third line in LabelSize: a mission report's wires and beats or its moves, and "SECOND WIRING" on the win that lit that lamp.
- A result found whose report was dropped: its row takes no tap: [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).
- Printouts lie over the window: [Printout](style.md#printout).
- **Derived:** a lead longer than a row's two lines shows whole on its reprint.

## Links

- [UI style](style.md).
