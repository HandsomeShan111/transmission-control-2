# Offline play

Design status: Defined.

## Goal

Offline play: the whole game loads once, then every order plays with no connection. Serves no pillar: [Constraints](../vision.md#constraints).
Player decision: none. Feedback: "LOADING" on the teletype at the first load, and how much has loaded.
Flavour: the night's tape reels, threaded before the shift.
Not owned here: what the player keeps, [Saving](saving.md); events sent while online, [MEAS-03](../product/measures.md#meas-03-send).

## Inputs

- The build's own files: [Build order](../build/order.md).

## Outputs

- Every order, playable offline: [BOARD-01](../board/wiring-board.md#board-01-open).
- GameLink, printed on shared reports: [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture).
- GameVersion, kept with the save: [SAVE-01](saving.md#save-01-keep).

## Parameters

- **FirstLoadMax**: number, MB of 10^6 bytes, all the game's files as sent, compressed. Start: 1.0. Range: 0.5 to 1.0.
- **GameLink**: text, the game's web address, printed on shared reports, GameLinkMax characters at most. Start: the address, set before release. Fixed.
- **GameLinkMax**: integer, characters, a GameLink short enough for a 29-module QR code at level M, with room to spare. Start: 30. Fixed.
- **LoadStep**: integer, percent of the download, between two LOADING lines. Start: 10. Fixed.
- **GameVersion**: integer, the game's release number. Start: 1. Fixed; each later release raises it by one, at the [release](../build/order.md#release).

## Mechanics

### OFFLINE-01 First load

The game's link opens in a browser that lacks any of its files → every file downloads, at most FirstLoadMax in all, and this browser keeps them all or none; then the game opens: [OFFLINE-02](#offline-02-open).

- The teletype prints "LOADING" and how much of the download has loaded, by bytes from the build's file sizes, in steps of LoadStep: [Loading](../ui/loading.md).
- The connection lost mid-load → "NO SIGNAL"; the load goes on when the connection returns. The page closed mid-load → nothing is kept, and the next open starts over.
- A file fails to be kept → nothing is kept; the game opens from the download, and the teletype prints once: "THIS TERMINAL CANNOT STORE THE GAME. A CONNECTION IS NEEDED TO OPEN IT AGAIN."

### OFFLINE-02 Open

The game opens in a browser that keeps all its files → it runs from them, online or not.

### OFFLINE-03 New version

The game opens online, comes back online while open, or meets a code from a later GameVersion ([SAVE-03](saving.md#save-03-paste-in)) → it looks for a new version; one found downloads whole, beside the version playing.

- The new version runs once no page of the game is open: every page opened before then, an order, its run and its report stay on the version playing.
- A download cut off is dropped; the next look starts it over.
- The kept save carries over: [SAVE-05](saving.md#save-05-version).

## Edge cases

- A first load cut off, or files the browser cannot keep: [OFFLINE-01](#offline-01-first-load).
- Two pages of the game open when a new version arrives: both stay on the version playing: [OFFLINE-03](#offline-03-new-version).
- Sharing a report offline: [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture).
- **Derived:** a browser that keeps the files waits on a slow connection once, at the first load: [OFFLINE-01](#offline-01-first-load), [OFFLINE-02](#offline-02-open).

## Links

- Keeping the player's progress: [Saving](saving.md).
