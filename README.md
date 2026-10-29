# Transmission Control 2

A wiring puzzle at humanity's last Mission Control. You plug wires between agents on a console so each item reaches the right place in the right state. Six acts, 30 orders, one web page that plays offline.

Play: https://handsomeshan111.github.io/transmission-control-2/

## Documentation

- [Your first shift](docs/tutorial-your-first-shift.md): a tutorial, from the title screen to order 2.
- [Player tasks](docs/how-to-player-tasks.md): zoom out, move or cut a wire, keep progress on another device, play offline, share a report.
- [Build and publish](docs/how-to-build-and-publish.md): run the game locally, run the tests, publish to GitHub Pages, turn on visit counts.
- [Console reference](docs/reference-console.md): every key, screen, lamp, score and limit.
- [How the game is built](docs/explanation-how-it-is-built.md): why one static page, how offline play and saving work, how the code is split.
- [Changelog](CHANGELOG.md)

Design and build records:

- `design/`: a read-only copy of the game's design. Its pages are the rules the game follows.
- `docs/product/`: scope, user stories and the system architecture.
- `docs/designs/`: the brief, the build plan and its decisions, the review and visual check reports.

## Quick start for developers

```sh
bun install
bun run build
PORT=8080 bun run serve
```

Then open `localhost:8080/transmission-control-2/` in a browser. Checks: `bun run check` and `bun run test`. Browser tests: `bun run e2e`.
