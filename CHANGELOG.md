# Changelog

## Version 1, first release (2026-10-29)

You can now play all of Transmission Control 2 in a browser, on a phone or a computer, at https://handsomeshan111.github.io/transmission-control-2/. Start with [Your first shift](docs/tutorial-your-first-shift.md).

- Six acts, 30 orders: wire agents on the console so each item reaches the right place in the right state. Repair orders open on a broken overnight wiring and score the moves to fix it.
- Every run plays out on the board and prints its report on the teletype. A wrong wiring files an incident report, and each order hides three hand-written results to find.
- Pars for wires and time on most orders, moves on repair orders, and a second wiring to find on most orders, for a leaner or different win. 18 commendations, shown as medals on COMMENDATIONS, with a MEDALS key that counts them.
- NEXT on a won report opens the next order. A title screen with START, or CONTINUE once you have progress.
- Zoom out until the whole board fits, by pinch or by the control key and scroll wheel.
- Keys stand in fixed places on every screen, one size each. A key click plays on every press, and AUDIO turns every sound off.
- Progress keeps in the browser. A save code moves it to another device: SAVE CODE, then LOAD SAVE CODE on the other one. See [Player tasks](docs/how-to-player-tasks.md).
- After one visit online, the game opens with no connection.
- SHARE sends a report as text, or as a picture with a QR code that opens the game.

### For contributors

- TypeScript and Bun, no framework. Release build: `bun run build`. Checks: `bun run check`, `bun run test`, `bun run e2e`. See [Build and publish](docs/how-to-build-and-publish.md).
- Every push to `staging` checks, builds and publishes the game to GitHub Pages.
- Visit counts are built but off: nothing is sent until a GoatCounter address is set.
