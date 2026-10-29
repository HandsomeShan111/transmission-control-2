# Build and publish

Recipes for people who change or publish the game. You need [Bun](https://bun.sh) 1.4. For the browser tests, Playwright's browsers: `bunx playwright install chromium firefox webkit`.

## Run the game locally

```sh
bun install
bun run build
PORT=8080 bun run serve
```

`bun run build` writes the release build to `dist/`. The server serves it at `/transmission-control-2/`, as GitHub Pages does, and at the root. Open `localhost:8080/transmission-control-2/`.

The build fails when the game's files pass 1 MB compressed, or when anything but the game's own files lands in `dist/`.

## Run the checks

- Type check: `bun run check`.
- Rule tests: `bun run test`. They cover the game's rules, data and build script, in a few seconds.
- Browser tests: `bun run e2e`. Playwright builds the test build (`dist-test/`), serves it, and plays the game in Chromium, Firefox and WebKit at phone and desktop sizes. The whole set takes up to an hour. A machine where WebKit cannot run: name the projects, `--project chromium-desktop --project chromium-phone --project firefox-desktop --project firefox-phone`.
- One spec, one browser: `bunx playwright test tests/e2e/board.spec.ts --project chromium-desktop`.

Every acceptance test in the design has a rule test or a browser test named by its id, such as `PAR-01` or `BOARD-03`. A check fails when one goes missing.

## Publish to GitHub Pages

Publishing runs on every push to `staging`: `.github/workflows/pages.yml` runs the type check and rule tests, builds `dist/`, and deploys it.

Once per repository:

1. Make the repository public, or use a plan that serves Pages from private repositories.
2. In the repository's Settings, open Pages and set Source to GitHub Actions.

The game then lives at https://handsomeshan111.github.io/transmission-control-2/.

## Release a new version

1. In `src/blocks/offline-play/logic/build.ts`, raise `version` in `RELEASE` by one. Players' browsers keep files per version, so a new number makes them fetch the new files the next time they are online.
2. Run the checks and the browser tests.
3. Merge into `staging` and push.

Saves from earlier versions stay readable: the game reads them by name. For an order whose agents, destinations, batch, opening or par changed, it drops that order's kept wiring and its filed reports. Wins, best scores and results found stay.

## Turn on visit counts

The game counts, per order, the first start and the first finish in each browser. It sends nothing until a count address is set.

1. Create a site on [GoatCounter](https://www.goatcounter.com).
2. In `src/blocks/offline-play/logic/build.ts`, set `countAddress` in `RELEASE` to the site's count endpoint, such as `https://<your-code>.goatcounter.com/count`.
3. Release as above.

Each count is one request with the event, the order and the version, such as `order_start-7-1`. It carries no cookie and no player or session ID.

## Change the game's address

The shared picture's QR code and the shared text link to `RELEASE_LINK` in `src/blocks/offline-play/logic/build.ts`. Change it if the game moves.

## Take a new copy of the design

`design/` is a read-only copy of the design. To update it:

1. Replace `design/` with the new copy, and note its source commit in `design/README.md`.
2. Run `bun run data`. It reads the design's data pages and rewrites the generated data files (`*.gen.ts`). It fails on any line it cannot parse.
3. Run the checks and the browser tests, then fix what the new design changed.
