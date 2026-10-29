<!-- tab: System Architecture -->
> **Status: agreed, 28 Oct 2026.** Owner approved Brief, Scope and automatic Architecture stage on board task 120. Code is not built yet.

# Transmission Control 2 system architecture

## 1. Introduction

Transmission Control 2 is built from business components, called blocks. Each block is plugin: it owns its data, screens and API. Blocks stand in layers. Block uses only its own layer and layers below; calls and dependencies never go in circle. Product takes layers it needs; block it skips runs as its stub.

- Every block ships with first build. Block not built yet ships as stub, switched off until built.
- Behavior inside block is its implementation, not architecture.
- Higher layer adds to lower one through API, page events, slots and widgets. Lower layer never knows what sits above it.
- [Platform and assembly](#sec-5-platform-and-assembly) sit under every layer; they are not business.
- Stack, decided by Brief and design: static game, no server, no database. TypeScript 7.0.2 in browser, board drawn in SVG, sounds made with Web Audio. No framework; only library: one QR encoder, version pinned in lock file. Owner's default Rust and React stack does not apply: design rules out libraries, and GitHub Pages serves static files only.
- Rules come from design pages in `design/docs/`, cited by step id such as `WIRE-03`. This document places them; it restates none.

### Layers

- **Layer 0: [Shared](#sec-0-shared).** Adds loading, offline keeping and game version.
  - [Offline play](#sec-offline-play-loads-and-keeps-game)
- **Layer 1: [Core loop](#sec-1-core-loop).** Adds one order wired, run, reported and scored; smallest product that lives alone.
  - [Orders](#sec-orders-holds-every-order)
  - [Agents](#sec-agents-applies-each-agents-rule)
  - [Items](#sec-items-carries-kinds-and-marks)
  - [Wiring board](#sec-wiring-board-shows-order-on-console)
  - [Wires](#sec-wires-keeps-players-wiring)
  - [Run](#sec-run-computes-batchs-path)
  - [Run view](#sec-run-view-plays-run-on-console)
  - [Par and score](#sec-par-and-score-scores-win-against-par)
  - [Reports](#sec-reports-writes-and-prints-report)
- **Layer 2: [Repair](#sec-2-repair).** Adds orders that open already wired and failing, scored by moves.
  - [Repair orders](#sec-repair-orders-opens-faulty-wirings)
- **Layer 3: [Campaign](#sec-3-campaign).** Adds acts, unlocks, order list and filed reports.
  - [Incident archive](#sec-incident-archive-files-every-report)
  - [Campaign](#sec-campaign-runs-acts-and-order-list)
- **Layer 4: [Collection](#sec-4-collection).** Adds achievements and sharing.
  - [Achievements](#sec-achievements-awards-commendations)
  - [Report sharing](#sec-report-sharing-sends-report-out)
- **Layer 5: [Keeping](#sec-5-keeping).** Adds saved progress, save codes and sound setting.
  - [Saving](#sec-saving-keeps-progress)
  - [Settings](#sec-settings-switches-sound)
- **Layer 6: [Measures](#sec-6-measures).** Adds anonymous counts.
  - [Product measures](#sec-product-measures-counts-starts-and-finishes)

**Products from same plugins:**

- Test sandbox, layers 0-1: opens one order by number for tests and agent playtest. Never shipped to players.
- Transmission Control 2: every layer.

## 2. Plugins

Each business component is plugin: one folder with fixed structure. Any team can take that folder, build and test it alone. Nothing ties two plugins together except their API, page events, slots and widgets.

```
blocks/<name>/
  block.json     name, layer; API it offers; APIs, events and slots it uses
  api.ts         types and calls it offers to other blocks
  logic/         rules, pure functions, no screen
  view/          SVG and page parts: screens, widgets, slot fillers
  data/          its share of game data, typed, from design data pages
  stub.ts        "off" implementation: used until built
  tests/         acceptance tests of its design steps; need only blocks it calls, or their stubs
```

- Plugin reaches another plugin only through its API, page events, slots and widgets. Never its files, data or stored keys.
- Slot: named hole plugin leaves. Filler: plugin from same or higher layer. Without filler, slot keeps its default, mostly nothing.
- Widget: named piece of screen plugin offers; plugin from same or higher layer places it.
- Slot and widget pass ids only: order number, report id, item index.
- Page events: named, fixed fields, listed in [Assembly](#sec-assembly). No plugin imports another's view.
- Every call acts for nobody: game has no accounts.
- Logic is pure and deterministic: same order and wiring give same run, every time (GP-1). Tests run logic without browser.
- Plugin's screens use only [Design system](#sec-design-system-gives-every-screen-its-look) pieces.

## 3. Business components

**Transmission Control 2: web wiring puzzle game.** Layers 0 to 6, each on top of those below.

### 0. Shared

Used by every layer.

#### Offline play: loads and keeps game

- **What it does:** first load with progress, keeps every file in browser, opens offline, finds and installs new versions (`OFFLINE-01` to `OFFLINE-03`). Holds GameVersion and GameLink.
  - Service worker keeps files; new version waits until no page of game is open.
  - First load at most 1 MB compressed; build fails past it.
  - GameLink: GitHub Pages address, 48 characters, over design's GameLinkMax of 30. Owner approved, 28 Oct 2026; QR code one size denser.
- <b class="arch-screens">Screens:</b>
  - `loading` (teletype LOADING lines, progress, NO SIGNAL) <span class="arch-tag">#public</span>. Uses: printout, teletype type.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `gameVersion` (in: nothing; out: release number)
  - `gameLink` (in: nothing; out: game address)
  - `lookForNewVersion` (in: nothing; out: found or not)
- **Calls:** none.
- **On screens:** [Loading](#sec-loading).

### 1. Core loop

One order on console: player wires its agents, runs batch, reads report, sees score. Smallest product that lives alone: test sandbox.

#### Orders: holds every order

- **What it does:** keeps 30 orders: text, batch, required outputs, agents and their places, hand-written results, second wirings, opening wiring (`ORDER-` steps, orders data pages). Plain store: API only.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `order` (in: order number; out: order)
  - `orders` (in: nothing; out: every order, in act order)
  - `sameEnding` (in: two item endings; out: whether they are one; an order's hand-written results are found by it)
- **Calls:** none.

#### Agents: applies each agent's rule

- **What it does:** keeps 18 agents and 6 families; works, checks and copies items; pass limit; lamp states (`AGENT-` steps).
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `agent` (in: agent name; out: family, role, rule, mark, jacks)
  - `apply` (in: agent name, item; out: items and their jacks, or verdict)
- **Widgets:** `agentFace` (in: agent name, lamp state).
- **Calls:**
  - Items, to read kinds and add marks.

#### Items: carries kinds and marks

- **What it does:** keeps 12 item kinds and 12 marks; item entry, marks, copies, match against required output, drawing (`ITEM-` steps).
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `kind` (in: kind name; out: attribute)
  - `addMark`, `copy`, `matches` (in: item, mark or required output; out: item or match)
- **Widgets:** `itemDrawing` (in: item; draws body and three latest marks).
- **Calls:** none.

#### Wiring board: shows order on console

- **What it does:** console frame, agents at their places, terminals, orientation by screen, pan and zoom like map, run switch and board lock (`BOARD-` steps). Owns Board screen.
  - Leaves slots: lamps, printouts, AUDIO switch, ORDERS control, after-report lines.
- <b class="arch-screens">Screens:</b>
  - `board` (one order, its wiring, run and printouts) <span class="arch-tag">#public</span>. Uses: console frame, plate, switch, lamp, printout.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `openOrder` (in: order number, wiring or none; out: board open)
  - `place` (in: agent or terminal; out: board position)
- **Calls:**
  - Orders, to read order.
  - Agents, to draw faces.
  - Wires, to draw and edit wiring.
  - Run, Run view, Par and score and Reports, when run switch flips.
- **On screens:** [Board](#sec-board).

#### Wires: keeps player's wiring

- **What it does:** data wires and plus and minus feedback wires; hold, plug, move, cut, undo, reset; touch, tap-tap and edge pan (`WIRE-` steps).
- <b class="arch-screens">Screens:</b> none; draws on Board.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `wiring` (in: order number; out: wires)
  - `setWiring` (in: order number, wires; out: done)
  - `wireCount` (in: wires; out: number)
- **Calls:**
  - Agents, to read jacks.
- **On screens:** [Board](#sec-board).

#### Run: computes batch's path

- **What it does:** runs batch through wiring in beats, with no chance: ends, rejects, stops, losses, match, win, run time (`RUN-` steps). Pure: wiring in, trace out.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `run` (in: order, wires; out: trace of every beat, each item's end, win or not, run time)
- **Calls:**
  - Agents, to apply rules.
  - Items, to match outputs.

#### Run view: plays run on console

- **What it does:** plays trace beat by beat, view follows first item, FAST and SKIP, hidden page, master alarm (`VIEW-` steps).
- <b class="arch-screens">Screens:</b> none; plays on Board.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `play` (in: trace; out: done when last beat shows)
- **Calls:**
  - Items, to draw items.
  - Agents, to light lamps.
- **On screens:** [Board](#sec-board).

#### Par and score: scores win against par

- **What it does:** par per order, score by wires and run time, best kept per order (`PAR-` steps). Fills Board lamp slot: WIRES and TIME.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `score` (in: order, wires, run result; out: wires, time, against par)
  - `best`, `setBest` (in: order number; out: best score)
- **Calls:**
  - Orders, to read par.
  - Wires, to count wires.
- **On screens:** [Board](#sec-board).

#### Reports: writes and prints report

- **What it does:** mission or incident report: lead, item lines, result lines, first difference, teletype print (`REPORT-` steps). Keeps 216 authored lines.
  - Leaves slots: moves line, lines after report, share control, commendation line.
- <b class="arch-screens">Screens:</b> none; prints on Board.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `report` (in: order, trace, score; out: report)
  - `print` (in: report; out: closed when player taps)
- **Calls:**
  - Orders, to read hand-written results.
  - Agents, to read verdict words.
  - Par and score, to print score line.
- **On screens:** [Board](#sec-board).

### 2. Repair

#### Repair orders: opens faulty wirings

- **What it does:** six repair orders open with their faults wired; counts moves; scores by moves against par (`REPAIR-` steps). Fills Reports' moves line and Board's MOVES lamp.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `faultWiring` (in: order number; out: wires)
  - `moves` (in: order number, wires; out: number)
- **Calls:**
  - Orders, Wires, Wiring board, Run, Reports.
- **On screens:** [Board](#sec-board).

### 3. Campaign

#### Incident archive: files every report

- **What it does:** files each new report, browses by act and order, reprints, counts hand-written results found per order (`ARCHIVE-` steps). Owns Incident archive screen.
  - Leaves slots: commendations, SHARE on reprint, lines after filing.
- <b class="arch-screens">Screens:</b>
  - `archive` (filed reports and achievement rows) <span class="arch-tag">#public</span>. Uses: list row, printout, plate.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `file` (in: report; out: new or already filed)
  - `filed` (in: order number or none; out: reports)
- **Calls:**
  - Reports, to reprint.
  - Orders, to count hand-written results.
- **On screens:** [Incident archive](#sec-incident-archive).

#### Campaign: runs acts and order list

- **What it does:** opening misfire, unlocks, act memo and debrief, order list, lines after report (`CAMPAIGN-` steps). Owns Order list screen. Fills Board's ORDERS control and after-report lines.
  - Leaves slots: commendations, SAVE CODE and LOAD SAVE CODE, AUDIO switch.
- <b class="arch-screens">Screens:</b>
  - `orderList` (acts, orders, lamps, controls) <span class="arch-tag">#public</span>. Uses: list row, lamp, plate, switch.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `progress` (in: nothing; out: won orders, open act)
  - `setProgress` (in: progress; out: done)
- **Calls:**
  - Orders, Wiring board, Run, Par and score, Repair orders, Incident archive.
- **On screens:** [Order list](#sec-order-list), [Board](#sec-board).

### 4. Collection

#### Achievements: awards commendations

- **What it does:** 18 achievements: hand-written results found, second wirings, par beaten, per act; commendation line on report (`ACHIEVE-` steps). Fills archive and order list commendation slots.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `earned` (in: nothing; out: achievements earned)
  - `setEarned` (in: achievements; out: done)
- **Calls:**
  - Incident archive, Run, Par and score, Repair orders.
- **On screens:** [Board](#sec-board), [Incident archive](#sec-incident-archive).

#### Report sharing: sends report out

- **What it does:** share as text with GameLink, or as picture with GameLink and QR code; share sheet where device has one (`SHARE-` steps). Fills SHARE slot on report and reprint.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b> none. Only players reach it.
- **Calls:**
  - Reports, Incident archive, Items, Offline play.
- **On screens:** [Board](#sec-board), [Incident archive](#sec-incident-archive).

### 5. Keeping

#### Saving: keeps progress

- **What it does:** keeps progress, bests, achievements, archive and wirings in this browser; save code out and in; browser that keeps nothing; version carry-over (`SAVE-` steps). Fills SAVE CODE and LOAD SAVE CODE slots.
  - Save code read field by field; anything else prints CODE NOT READ, never runs.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b>
  - `kept` (in: nothing; out: save)
- **Calls:**
  - Campaign, Par and score, Incident archive, Achievements, Wires, Reports, Offline play.
- **On screens:** [Order list](#sec-order-list), [Board](#sec-board).

#### Settings: switches sound

- **What it does:** sound on or off, kept with save (`SETTING-01`). Fills AUDIO switch slots.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b> none. Only players reach it.
- **Calls:**
  - Saving, to keep setting.
- **On screens:** [Board](#sec-board), [Order list](#sec-order-list).

### 6. Measures

#### Product measures: counts starts and finishes

- **What it does:** one `order_start` and one `order_finish` event per order per browser, queued, sent as GoatCounter pixel while online (`MEAS-` steps). Sends nothing while CountAddress is empty.
- <b class="arch-screens">Screens:</b> none.
- <b class="arch-routes">Routes:</b> none.
- <b class="arch-api">API:</b> none. Listens to page events.
- **Calls:**
  - Offline play, to read version.

## 4. Screens and forms

Every screen has one owner block; blocks from same or higher layers fill its slots or place their widgets in it. Frame of every page comes from [Web shell](#sec-web-shell-frames-every-page). Layout values: design's UI pages.

### Game

#### Loading

- **Address:** game's one page, first load. **Owner:** [Offline play](#sec-offline-play-loads-and-keeps-game), `loading`.
- **Layout:** title, teletype LOADING lines with progress ([Offline play](#sec-offline-play-loads-and-keeps-game)).

#### Board

- **Address:** game's one page. **Owner:** [Wiring board](#sec-wiring-board-shows-order-on-console), `board`.
- **Layout:**
  - Order bar: number, name, text ([Orders](#sec-orders-holds-every-order)); lamps WIRES and TIME ([Par and score](#sec-par-and-score-scores-win-against-par)), MOVES ([Repair orders](#sec-repair-orders-opens-faulty-wirings)), 2ND WIRING ([Campaign](#sec-campaign-runs-acts-and-order-list)).
  - Window: faces ([Agents](#sec-agents-applies-each-agents-rule)), wires ([Wires](#sec-wires-keeps-players-wiring)), items ([Items](#sec-items-carries-kinds-and-marks)), run and alarm ([Run view](#sec-run-view-plays-run-on-console)).
  - Printouts over window: report ([Reports](#sec-reports-writes-and-prints-report)), lines after it, memo, debrief ([Campaign](#sec-campaign-runs-acts-and-order-list)), commendation ([Achievements](#sec-achievements-awards-commendations)), SHARE ([Report sharing](#sec-report-sharing-sends-report-out)), save code ([Saving](#sec-saving-keeps-progress)).
- **Forms:** control bar: ORDERS ([Campaign](#sec-campaign-runs-acts-and-order-list)), UNDO or FAST, RESET or SKIP ([Wires](#sec-wires-keeps-players-wiring), [Run view](#sec-run-view-plays-run-on-console)), AUDIO ([Settings](#sec-settings-switches-sound)), RUN ([Wiring board](#sec-wiring-board-shows-order-on-console)).

#### Order list

- **Address:** game's one page. **Owner:** [Campaign](#sec-campaign-runs-acts-and-order-list), `orderList`.
- **Layout:** act headings and order rows with lamps ([Campaign](#sec-campaign-runs-acts-and-order-list)); ARCHIVE ([Incident archive](#sec-incident-archive-files-every-report)).
- **Forms:** AUDIO ([Settings](#sec-settings-switches-sound)); SAVE CODE, LOAD SAVE CODE and pasted code with READ ([Saving](#sec-saving-keeps-progress)).

#### Incident archive

- **Address:** game's one page. **Owner:** [Incident archive](#sec-incident-archive-files-every-report), `archive`.
- **Layout:** report rows by act and order ([Incident archive](#sec-incident-archive-files-every-report)); achievement rows ([Achievements](#sec-achievements-awards-commendations)); reprint with SHARE ([Report sharing](#sec-report-sharing-sends-report-out)).

## 5. Platform and assembly

Not business components. They hold no business data and no business rules, and name no block.

### Assembly

- Audience tags: `public` only. Every screen opens without sign-in; game has none.
- App: one static page with every block, tag `public`, served by GitHub Pages.
- Page events, fixed fields:
  - `orderOpened` (order number), from [Wiring board](#sec-wiring-board-shows-order-on-console).
  - `wiringChanged` (order number), from [Wires](#sec-wires-keeps-players-wiring).
  - `runEnded` (order number, win or not, report id), from [Run view](#sec-run-view-plays-run-on-console).
  - `reportClosed` (order number, report id), from [Reports](#sec-reports-writes-and-prints-report).
  - `winKept` (order number), from [Saving](#sec-saving-keeps-progress).

#### Web shell: frames every page

- One page; shows one screen at time; console frame round it; fits window and orientation. Joins slots and widgets by name.

#### Build and publish: ships every block as static files

- Bundles blocks into one script and one page; writes file list and sizes for Offline play; fails above 1 MB compressed.
- Runs every block's tests, then publishes to GitHub Pages each time Release merges into staging branch. Before release, owner tests on private test link. Rollback: publish previous commit.

### Platform

Every block uses it.

- **Store:** browser storage with locks between open pages; reports when browser keeps nothing.
- **Sound:** Web Audio voices for nine design sounds; one mute switch.
- **Motion:** design's feel timings; input during motion (`FEEL-17`).
- **Test bench:** runs any order and wiring without browser; browser tests at phone and desktop sizes in Chromium, Firefox and WebKit.

#### Design system: gives every screen its look

- **Rules:**
  - Block's screens use only design system pieces. No block has its own colours or buttons.
  - Piece shows only what its caller gives it.
  - Pieces never import block. Build fails if one does.
  - New shared need is added here, never copied into block.
  - One page shows every piece.
- **Design rules:** design's art direction and UI style: palette, shapes, sans and mono system type, no web fonts, contrast, scaling.
- **Basic pieces:** plate, switch, lamp, list row, printout.
- **Transmission Control 2 pieces:** console frame, jack, terminal, wire, sign disc, ring, teletype paper.

##### printout

Teletype paper strip over window: lines print one by one; tap closes.

<style>
.arch-screens { color: var(--color-status-info, #1f5fa8); }
.arch-routes { color: var(--color-status-warning, #a65e00); }
.arch-api { color: var(--color-status-success, #2e7d32); }
.arch-tag { color: #a855f7; background: color-mix(in srgb, #a855f7 14%, transparent); border-radius: 10px; padding: 0 7px; font-size: 0.85em; white-space: nowrap; }
</style>
