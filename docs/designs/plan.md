# Plan: Transmission Control 2, first playable release

Engineering plan for the build. Sources: the Brief, the User stories, the System architecture, and the design itself.

## Source of truth

- The design is copied into this repository, read-only, under `design/`: the design pages (`design/docs/`). Every rule cited here by step id, such as `RUN-02`, lives there.
- Copy of the design accepted 26 Oct 2026.
- Game data (orders, agents, item kinds, authored lines, achievements, test wirings) is generated from the design's data pages by one script and committed. A data change starts in `design/`, then the script runs again.

## Stack

- TypeScript 7.0.2, strict. Bun 1.4 bundles and runs tests. No framework.
- Board in SVG, screens in plain DOM and CSS. Sounds made with Web Audio. System fonts only.
- One runtime library: `qrcode-generator` 2.0.4, pinned in the lock file, for the shared picture.
- Browser tests: Playwright, in Chromium, Firefox and WebKit, at 360 by 640 portrait and 1920 by 1080 landscape.
- Offline: one service worker with a versioned file list.
- Kept data: browser local storage; Web Locks between open pages where the browser has them.

## Repository layout

```
design/                     copied design, read-only
scripts/extract-data.ts     design data pages -> src/blocks/*/data/*.gen.ts
scripts/build.ts            bundle -> dist/ (index.html, game.js, sw.js, files.json); fails over 1 MB compressed
scripts/serve.ts            static server for dist/ on $PORT (test site)
src/platform/               events, slots, store, sound, motion, shell, design system pieces
src/blocks/<name>/          one folder per architecture block:
  block.json                name, layer, blocks it uses
  api.ts                    what other blocks may import
  logic/  view/  data/  stub.ts  tests/
src/app/main.ts             assembly: starts blocks, fills slots
src/testbuild/              test aids, only in the test build
tests/e2e/                  Playwright specs
.github/workflows/pages.yml test, build, publish to GitHub Pages on push to staging
.paneweb.json               task test site
```

- A test reads every `block.json` and every import: a block imports only `api.ts` of blocks in its own layer or below, and only platform pieces. Breaking it fails the tests.

## Core model

```
Order        n, name, act, repair, text, agents[{name, col, lane, passLimit?}],
             destinations[], batch[{kind, marks[], required|untouched, copies[{n, required}]}],
             opening wires | null, results[{ending, text}], par {wires?, time?, split?, moves?}
Wire         from: IN | agent | agent plus/minus | agent item/copy
             to:   agent input | destination
Item         batch index, copy number, kind, first kind, marks[], required output | none,
             check counts per checking agent, rejected
Trace        beats[ moves per beat ], ends per item (arrived, stopped at, rejected, lost),
             match per item, win, run time in beats
```

- `Run.run(order, wires)` is pure: same input, same trace (`GP-1`). Run view only plays a trace; it never decides anything.
- Trace contract, fixed before the board view starts: stable item ids (batch index and copy number); per beat, every event in order (work, mark, kind change, verdict with check count, reject, copy made, sent, arrived, stopped) and a snapshot of every item (place, kind, marks, rejected) and every agent's lamp. Reports and Run view read the trace; neither runs the order again.
- Wiring search (test build): lists every winning wiring with no idle wire; fewest-move fixes for repair orders; a wiring for each hand-written result. It drives `Run.run` itself.

## Build steps

Each step lists the stories it serves. Steps 2 and 3 run side by side, then 4 and 5.

1. **Set-up** (S1). Package, TypeScript, test runner, design copy, empty block folders with stubs, import-rule test, test site config.
2. **Core logic** (S2, S3, S4, S5). Data extraction; Orders, Agents, Items, Wires (model), Run, Par and score, Reports (text), Repair orders (faults, moves). Wiring search. Logic acceptance tests: `ORDER-`, `AGENT-`, `ITEM-`, `RUN-`, `PAR-`, `REPORT-`, `REPAIR-`. Every order's test wiring wins; every hand-written result is reachable.
3. **Platform and look** (S1, S9). Page events, slots, store with locks, Web Audio voices for the nine sounds, motion timings, web shell with screen switching and window fit, design system pieces from the art direction and UI style: frame, plate, switch, lamp, list row, printout, jack, terminal, wire, sign disc, ring, teletype paper, agent face, item body, mark tiles. One page shows every piece. `ART-` tests.
4. **Board** (S2, S3, S4, S9). Wiring board view: placing, orientation, pan and zoom, run switch and lock. Wires interaction: hold, plug, move, cut, undo, reset; mouse, touch, tap-tap, edge pan, pinch. Run view: play, follow, FAST, SKIP, hidden page, full alarm. Report printing. Repair order board. Feel steps on the board: `FEEL-01` to `FEEL-10`, `FEEL-14` to `FEEL-17`. `BOARD-`, `WIRE-`, `VIEW-` browser tests.
5. **Campaign and keeping** (S5, S6, S7, S8, S10). Offline contract: first visit loads from network while the service worker installs the whole file list or none; a failed install deletes its partial cache; a new version installs beside the old one and activates only when no page of the game is open; the old cache is deleted after activation. Every save change takes the lock, reads the save again, merges, then writes once. Save codes are validated in full: known ids only, legal wires only, bounded counts, before anything merges. Storage budget measured with a full campaign archive. Incident archive, Campaign with opening misfire, Achievements, Report sharing with QR picture, Saving with save codes, Settings, Product measures, Offline play with loading screen and service worker. Order list, archive and loading screens. `FEEL-11` to `FEEL-13`, `FEEL-16`. `ARCHIVE-`, `CAMPAIGN-`, `ACHIEVE-`, `SHARE-`, `SAVE-`, `OFFLINE-`, `SETTING-`, `MEAS-` tests.
6. **Assembly and publishing** (S1, S10). Main assembly, build script with 1 MB check, test build, GitHub Pages workflow, test site. Screen layout checks at both preview sizes in three engines.
7. **Agent playtest** (S2, S5). One agent plays the campaign through the test site and reports where fun drops; one round of fixes inside the design's rules.

## Tests

```
UNIT / LOGIC (bun test, no browser)          BROWSER (Playwright, 3 engines x 2 sizes)
  data extraction: counts match design         first load, LOADING lines, offline reopen
  every acceptance test of logic steps         wire by mouse, touch, tap-tap; pan, zoom, pinch
  30 test wirings win; pars met                run, FAST, SKIP, hidden page, alarm
  every hand-written result reachable          report print, close, share text and picture
  repair fixes in par moves                    order list, unlocks, archive, reprint
  save code round trip; bad codes refused      save code out and in; private window
  event flags and send queue                   two pages: locks, one event each
  import rule between blocks                   size check: first load at most 1 MB
```

- Every design acceptance test maps to one test, named by its step id. A step that only a person can judge (a sound's character, a motion's feel) gets a browser test for its timings and a line in the test report for the person.
- Counts in tests go to a local test server, never to GoatCounter.
- The test site serves the build under `/transmission-control-2/`, the GitHub Pages path, so paths, worker scope and offline reopen are tested as published.
- Test build aids, as the design's acceptance page lists them: test list of every order, local counter and link servers, a second build with GameVersion raised, named hold points for two-page tests, storage-request control, item placement at a jack, save seeding from a test file, wiring search.
- Wiring search is benchmarked; the whole logic test run stays under 2 minutes.
- Real phones: emulation cannot prove iPhone audio, pinch and sharing. The person plays on an iPhone or Android phone at Test.
- Not testable here: a real phone's silent switch (`OQ-PLATFORM-05`). The game sets no audio session type, as the design says; the person checks it on a phone at Test.

## Failure modes

- Corrupt or foreign save code: parser reads fixed fields only, refuses the rest, prints CODE NOT READ. Tested with truncated, edited, empty and oversized codes.
- Storage refused or full: no-keeping line, play goes on (`SAVE-04`). Tested with storage blocked.
- Service worker fails to keep files: one teletype line, game runs from download (`OFFLINE-01`).
- Clipboard or share sheet refused: SELECT AND COPY line, code shown selectable (`SAVE-02`, `SHARE-01`).
- Counter pixel fails or is slow: event stays queued, send stops until next start (`MEAS-03`).
- Run never ends: RunLimit stops it, items lost (`RUN-06`).
- Two pages open: locks order writes; without locks, documented double count (`MEAS-03`).

## Performance

- First load at most 1 MB compressed: data and code only, no images, no fonts. The build prints the size and fails above it.
- Run view on a phone at FAST: SVG items moved by transform only; no layout during a run.
- Report lines and drawings are built once per run, not per frame.

## Publishing

- Release merges the task branch into `staging` and pushes it. The workflow tests, builds and publishes `dist/` to GitHub Pages.
- Needs from the owner at release: repository public, GitHub Pages source set to GitHub Actions.
- Rollback: revert the merge on `staging`; the workflow publishes the previous build.
- GameVersion starts at 1 and rises by one each release (`OFFLINE-03`, `SAVE-05`).
- CountAddress stays empty, so nothing is sent, until the owner gives a GoatCounter address.

## Decisions made where the design is silent

Listed here as they come up during the build, and again in the test report.

- GameLink is the GitHub Pages address, 48 characters; the QR code is version 4 at level M in place of version 3. Owner approved.
- No audio session type set (`OQ-PLATFORM-05`); checked on a real phone at Test.
- NEXT after a win (owner's change). A won report's foot shows NEXT beside SHARE when order n+1 exists. NEXT tears the report as a tap does. The debrief, the save code and the next act's memo print and close as before. Then order n+1 opens on the board. No NEXT on a failed report, on the misfire or on order 30. Another run or another order opened first cancels it.
- Title screen (owner's change). Every open shows it after LOADING, when LOADING shows. The window holds the name large, an Orange rule, and one plate: START for a new game, CONTINUE with progress. The order bar is empty; the control bar holds AUDIO. START opens the misfire's standby, CONTINUE the order list, as before. The cannot-store line prints after the title.
- Zoom floor (owner's change to BOARD-03). The far zoom stop is the smaller of JackMinSize's zoom and the zoom where the whole board with BoardMargin fits the window. Opening and last framings still use JackMinSize's zoom.
- Commendations as medals (owner's change to archive.md's rows). Each act's three show as a grid of flat medals, ribbon colour by kind: Orange for results, Teal for second wirings, Cream for par. The disc carries the act's family silhouette. Earned: full colour, with its commendation's line. Not earned: a GraphiteLight outline on an Ink tile, with its kind's progress as the debrief words it.
- Console keys (owner's change). Every plate in a control bar takes one width and height, the largest any plate needs. Plates stand on one centre line, PlateGap apart, the last at the far end. A bar too short closes its gaps evenly, to half PlateGap at the least. A GraphiteLight bevel runs inside the outline along the bottom and right; a press drops it. The AUDIO lamp sits in its plate, beside the toggle.
- MEDALS and COMMENDATIONS (owner's change). A new screen, COMMENDATIONS, shows every act's heading, then its medals. It scrolls like the archive. MEDALS opens it from the Board, the order list and the archive. The archive keeps its medals.
- Fixed key slots (owner's change, in place of the per-bar key size). One key size for the whole game: the widest key needs it, a label wrapped onto up to three lines. Seven slots, the same place on every screen: ORDERS, MEDALS, ARCHIVE, the two actions, AUDIO, RUN. A slot a screen does not use stays empty. The screen's own key stays held down and does nothing. The Board shows ARCHIVE too, locked with ORDERS and MEDALS while it runs. One line of slots when all seven fit along the bar: on the desktop a column; at 768 wide a row. Otherwise two lines: slots 1, 2, 3 and 6 by the window, then 4, 5 and 7. At 360 wide seven keys cannot fit, so the phone has two rows. At 640 by 360 seven keys cannot fit the height, so landscape there has two columns.
- Order strip (owner's change, in place of the order bar's column). A strip above the window, as wide as it, holds the order's name and lamps on one line, its text under them, as tall as the text needs. Other screens show only their name there, the title screen included. The control bar runs the whole height on the right in landscape.
- AUDIO first (owner's change). AUDIO takes the first slot: the top of the column, the left end of the phone's top row. Then ORDERS, MEDALS, ARCHIVE; the two actions after a gap; RUN alone at the far end. On two lines the four places of each line stand evenly apart: the actions under AUDIO and ORDERS, RUN under ARCHIVE.
- ARCHIVE on the order list only (owner's change). The Board, the archive and COMMENDATIONS leave its slot empty, so no other key moves. ORDERS is the way back from the archive.
- MEDALS count (owner's change). MEDALS carries a second line under its label: commendations earned over every commendation in the game, as 1/18. A screen reader hears "MEDALS, 1 of 18 earned". Every MEDALS key on the page updates as a commendation is earned, and when a save is restored or a code read. The key size holds the widest count, 18/18.
- Key click (owner's change). A tenth sound, "key": a short mechanical click of three noise ticks, a bright contact tick, the key's low body under it and a softer release tick, 33 ms in all, at half LevelQuiet, under every run sound. Every real press of a plate or of a row that opens something plays it once, through the game's sound, so AUDIO off keeps it silent. A disabled or held key, a press a guard holds, UNDO with nothing left to undo, RESET at the opening wiring, and a click the page makes itself play none. The switches keep their own throw. FAST and SKIP click as they are pressed; the click is no run sound, so FEEL-15 holds.
- Keys under paper. While a printout lies on a screen, only AUDIO answers. The other keys are out of reach by keyboard too, not only by pointer: Tab passes over them and Enter does nothing. They answer again as the printout starts to tear.
- Key order. Focus and a screen reader go through a control bar's keys in slot order, as they stand.
- Held key. The screen's own key tells a screen reader it is the current page, and that it does nothing.
- Title double click. A double click on START or CONTINUE is one press. The second click, within half a second, does not reach the next screen: it does not wake the misfire's standby or press anything on the order list.
- Medal walls follow the count. As a commendation is earned, or a save is restored or a code read, every medal wall on the page is drawn again in place, on COMMENDATIONS and in the archive.
- NEXT after a memo. When order n+1 waits for its act's memo, NEXT asks again after the memo closes. A run started, or the order list opened, while the memo tears cancels NEXT.

## GSTACK REVIEW REPORT

- Runs: plan review by second model, once; story check, once.
- Architecture: 4 findings, all applied (offline contract, published sub-path, trace contract, cycle check in the import test).
- Code quality: 2 findings, applied (save lock covers every change; full save-code validation).
- Tests: 2 findings, applied (real-phone check at Test; test build aids named).
- Performance: 2 findings, applied (storage budget measured; wiring search bounded).
- Story check: pass. S1 to S10 each map to at least one build step; set-up and publishing serve S1 and S10; no step builds anything listed as out.
- VERDICT: plan locked; build starts with steps 2 and 3 side by side.

NO UNRESOLVED DECISIONS
