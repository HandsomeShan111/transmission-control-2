# Order list

Design status: Defined.

## Goal

The player picks an order to open, and carries the save out or in. Reached from: the game opening on a save that is not new, and ORDERS on the board or the archive: [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list).

## Shows

- Each act with an unlocked order, its heading and its unlocked orders: [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list).
- At each order: its number and name; the plus sign once it is won, [ART-13](../art-direction.md#art-13-verdict-colour-and-sign); its par lamps and second-wiring lamp; its results found, [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).
- Printouts: a memo, a debrief, the save code, the save code field and what it prints, the no-keeping line, the cannot-store line: [CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start), [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end), [SAVE-02](../platform/saving.md#save-02-copy-out), [SAVE-03](../platform/saving.md#save-03-paste-in), [SAVE-04](../platform/saving.md#save-04-no-keeping), [SAVE-05](../platform/saving.md#save-05-version), [OFFLINE-01](../platform/offline-play.md#offline-01-first-load).

## Controls

- An order's row → it opens: [BOARD-01](../board/wiring-board.md#board-01-open), after its act's memo when [CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start) prints one.
- An act's heading → its memo: [CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start).
- ARCHIVE → the archive: [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).
- SAVE CODE → [SAVE-02](../platform/saving.md#save-02-copy-out). LOAD SAVE CODE → [SAVE-03](../platform/saving.md#save-03-paste-in).
- On a printout: a tap, [REPORT-04](../board/reports.md#report-04-print); COPY, [SAVE-02](../platform/saving.md#save-02-copy-out); READ, [SAVE-03](../platform/saving.md#save-03-paste-in).
- AUDIO → [SETTING-01](../platform/settings.md#setting-01-sound).

## Layout

Values at the smallest and the largest screen of the vision's [Platform](../vision.md#platform), as [UI style](style.md#style) scales them.

Frame: [Console frame](style.md#console-frame).

- Order bar: "ORDER LIST" in TextSize.
- Control bar, from its start: ARCHIVE, SAVE CODE, LOAD SAVE CODE, AUDIO. Shared parts: [Plate](style.md#plate), [Switch](style.md#switch).
- Window: the acts in act order, each its heading row, then its orders' rows in order. Shared part: [List row](style.md#list-row).
- An order's row, first line: the number, the name, and at its far end the plus sign, as wide as a [Lamp](style.md#lamp) lens, once won. Second line, in LabelSize: the results found, as [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse) words them, then the par lamps, then the second-wiring lamp, labelled as on the [Board](board.md#shows).
- Printouts lie over the window: [Printout](style.md#printout). The save code field and READ: [Field](style.md#field).
- **Derived:** the four controls fit a 360 short side in both orientations, LOAD SAVE CODE on three lines at most in landscape.
- **Derived:** at 360×640, an act's heading and its five orders show at once, with each order's second line.

## Links

- [UI style](style.md).
