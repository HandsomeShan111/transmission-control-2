# How the game is built

Why Transmission Control 2 is built the way it is. For the full map of parts, see the [system architecture](product/system-architecture.md). For the build plan and every decision taken where the design was silent, see the [plan](designs/plan.md).

## One static page

The game is one page with its script, its worker and its icons, served as plain files from GitHub Pages. No server, no accounts, no database.

The reason: the design asks for a game that opens anywhere, plays offline and costs nothing to host. A static page does all three. Everything the game needs, it carries: the 30 orders, every report line, the drawings and the sounds.

That keeps it small: about 96 KB compressed. The drawings are SVG shapes drawn in code. The ten sounds are made by the browser's Web Audio at play time, so there is no sound file to load. The build fails if the files pass 1 MB.

## The design is the rule book

`design/` holds a read-only copy of the game's design. Each rule there has a step id, such as `BOARD-03` or `SAVE-03`, and the code cites those ids beside the code that follows them. The game's data (orders, agents, report lines, medals) is not typed in by hand: `bun run data` reads it from the design pages.

Each acceptance test in the design has a rule test or a browser test named by its id. A check fails when one goes missing. So "does the game follow the design" is a question the tests answer.

## Runs are worked out, not stored

A run is a pure function of the order and the wiring: the same wiring always gives the same items, paths, beats and report. The game never stores a report's text. It stores the wiring, and prints the report again from it when the archive asks.

This is why a save code stays short, and why each filed report carries a fingerprint of its order: its agents, destinations, batch, opening wiring and par, the data a report is printed from. When a new version changes any of those, the fingerprint no longer matches, and the game drops that order's kept wiring and filed reports. Wins, scores and results found stay.

## Blocks

The code is split into blocks, one per part of the design: orders, agents, items, wires, run, reports, campaign, saving and so on. Each block has an `api.ts`, and other blocks reach it only through that file. Blocks sit in layers, and a block may use only blocks in its own layer or below, with no cycle. Rule tests enforce both. Inside a block, `logic/` holds the pure rules, and `view/` holds what draws and listens.

The rules can then be tested in milliseconds without a browser: the rule tests cover every order's known wirings, the scoring and the save codes. The browser tests cover what a player sees and does.

## Offline play

On the first visit, a service worker keeps every file of the game in the browser's cache, under the game's version number. It checks each file by its content fingerprint, so a broken download is fetched again, never kept.

Later visits open from that cache, online or not. Online, the game looks for a new version. One found downloads whole, beside the version playing. It runs once no page of the game is open, so a run in progress never changes version under the player.

## Saving

Progress lives in the browser's own storage, written the moment it changes. Two open pages of the game share one save. Each write reads the save again and merges, under a browser lock, so neither page overwrites the other's win.

A merge never loses progress: an order won in either save stays won, and each best score is the better of the two. The save code uses the same merge. A code is the save as one line of text with a check at its end, so a code from another device adds to this one's progress, never replaces it.

A browser that keeps no site data still plays. Progress then lasts until the page closes, and the game says so once.

## Counts without tracking

The game can count, per order, the first start and the first finish in each browser, through GoatCounter. Each count is one request with the event, the order and the version, and no cookie or player ID. Counting is off until a count address is set: see [Build and publish](how-to-build-and-publish.md).

## Testing

- Rule tests, `bun run test`: the game's rules and data, in seconds.
- Browser tests, `bun run e2e`: a test build with local test servers for counts and for a cut or slow connection, played in Chromium and Firefox at phone and desktop sizes.
- Safari's engine is the one gap: it does not run on the build machine. Changes to touch or sharing are checked on a real iPhone.
