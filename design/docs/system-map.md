# System map

Every system, with the pillars it serves, its tag, its reason and its content estimate.
Pages start from this map. A system with no entry gets no page.

## How to read

- Tag: **First release**, or **Later**. Tags own first-release scope. Later systems get an entry only, no page.
- Pillars: IDs from the [vision](vision-pillars.md#game-pillars). A system serves a pillar when weakening the system weakens that pillar.
- Cut candidate: serves no pillar. Its reason names what it serves instead, such as a platform need.
- Content: kinds and rough counts, variants as base × variants. Approved estimate for ContentTolerance.
- Areas are listed in design order. Each system's page is at its path.

Entry form: `**System**: tag. Pillars IDs. Reason: why the vision needs it. Content: kind count, base × variants, or none. Page: path.`
No pillar: `Pillars: none, cut candidate.` Later: no `Page:` part.

## Board

Every few seconds: the player wires agents and runs the batch, until every output matches; the win is scored against par. Holds the core loop.

- **Wiring board**: First release. Pillars GP-3, PP-1. Reason: the console where an order's agents sit fixed and placed, panned and zoomed like a map on every screen ([Constraints](vision.md#constraints), Screen fit). Content: console frame 1; console parts 3, jack, run switch and master alarm lamp; terminals 2 kinds, the order's input, where the batch enters, and its outputs. Page: `board/wiring-board.md`.
- **Wires**: First release. Pillars GP-1, GP-3, GP-4, PP-1. Reason: the player's one verb, data wires and feedback wires from output jack to input jack ([Pitch](vision.md#pitch)). Content: wire styles 3, data and feedback plus and minus; sounds 2, plug and unplug. Page: `board/wires.md`.
- **Agents**: First release. Pillars GP-1, GP-3. Reason: literal-minded agents, each with its rule on its face, workers and copiers with their mark; checking agents give verdicts ([Vision pillars](vision-pillars.md#gp-1-same-wiring-same-result)). Content: agents 6 families × 3 = 18; rule texts 18; silhouettes 6, one per family; lamp states 4; sounds 3, working and two verdicts. Page: `board/agents.md`.
- **Items**: First release. Pillars GP-2, GP-3. Reason: the batch's items carry their history as marks, and the result is drawn at the output ([Fantasy](vision.md#fantasy)). Content: item kinds 12, one drawn body each; marks 12, one per agent that is no checking agent, drawn on any body. Page: `board/items.md`.
- **Run**: First release. Pillars GP-1, GP-4. Reason: the batch flows through the wiring with no chance, and any wiring whose outputs all match wins ([Pitch](vision.md#pitch)). Content: none. Page: `board/run.md`.
- **Run view**: First release. Pillars GP-2, GP-3. Reason: the run shown on the console, followed by the view, fast-forwarded or skipped, with lamps and the master alarm ([Vision pillars](vision-pillars.md#gp-3-mission-control-played-straight)). Content: sounds 2, run switch and alarm tone. Page: `board/run-view.md`.
- **Reports**: First release. Pillars GP-1, GP-2, GP-3. Reason: every run ends in a mission or incident report that is the joke and the clue ([Vision pillars](vision-pillars.md#gp-2-every-failure-is-a-joke-and-a-clue)). Content: report forms 2, mission and incident; authored lines at most 18 agents × 12 item kinds = 216, each line serving both forms; sounds 1, teletype. Page: `board/reports.md`.
- **Par and score**: First release. Pillars GP-4. Reason: wires and run time against par make a second, leaner wiring worth finding ([Pitch](vision.md#pitch)). Content: none. Page: `board/par-and-score.md`.

## Orders

Every few minutes: one order, run until won.

- **Orders**: First release. Pillars GP-2, GP-3, GP-4. Reason: each order is a mission with its batch, required outputs, agents and hand-written results ([Pitch](vision.md#pitch)). Content: orders 6 acts × 5 = 30, repair orders included; order texts 30; hand-written results 30 × 3 = 90. Page: `orders/orders.md`.
- **Repair orders**: First release. Pillars GP-2, GP-4. Reason: later acts open orders already wired and failing, with interacting faults, scored by moves ([Pitch](vision.md#pitch)). Content: repair orders 3 acts × 2 = 6, counted in Orders. Page: `orders/repair-orders.md`.

## Campaign

Every session: one act, and what the player keeps from it.

- **Campaign**: First release. Pillars GP-2, PP-1. Reason: acts of orders, each bringing an agent family, opened by the night staff's misfire, so a player from the link reaches the end of act 1 ([Vision pillars](vision-pillars.md#gp-2-every-failure-is-a-joke-and-a-clue)). Content: acts 6; opening misfire 1, a scripted run with its report; memo lines 6, one per family. Page: `campaign/campaign.md`.
- **Incident archive**: First release. Pillars GP-2. Reason: Mission Control files every report the player has found, and each order shows how many of its hand-written results are found ([Fantasy](vision.md#fantasy)). Content: none beyond Reports and Orders. Page: `campaign/incident-archive.md`.
- **Achievements**: First release. Pillars GP-2, GP-4. Reason: the director's achievements, made from the wrong and right solutions the player finds ([Pitch](vision.md#pitch)). Content: achievements 6 acts × 3 kinds = 18, the kinds hand-written results found, second winning wirings, par beaten; each a name and a line. Page: `campaign/achievements.md`.
- **Report sharing**: First release. Pillars PP-1. Reason: a report leaves the game as text with the link, or as a picture with the link and a QR code ([Vision pillars](vision-pillars.md#pp-1-plays-anywhere-from-a-link)). Content: picture layout 1. Page: `campaign/report-sharing.md`.

## Platform

- **Saving**: First release. Pillars: none, cut candidate. Reason: progress kept in this browser and carried by a save code ([Constraints](vision.md#constraints)). Content: none. Page: `platform/saving.md`.
- **Offline play**: First release. Pillars: none, cut candidate. Reason: every order plays offline after the first load ([Constraints](vision.md#constraints)). Content: none. Page: `platform/offline-play.md`.
- **Settings**: First release. Pillars: none, cut candidate. Reason: a platform need, sound on or off for play in shared rooms. Content: none. Page: `platform/settings.md`.

## Product

- **Product measures**: First release. Pillars: none, cut candidate. Reason: the anonymous counts that measure [Product goals](vision.md#product-goals). Content: none. Page: `product/measures.md`.

## Later

- **Hints**: Later. Pillars PP-1. Reason: one more clue for a player stuck in act 1. Reports already point to the wrong wire; a core-loop playtest shows whether that is enough. Content: none.

## Not mapped

- "no actual llms, all is scripted" ([Concept](source/concept.md), line 6): a build rule, no system. Every agent rule is scripted, per [GP-1](vision-pillars.md#gp-1-same-wiring-same-result).
- The visual line ([Concept](source/concept.md), line 10): look and sound style, written as art direction, no system. Its content, counted in the [content inventory](content.md#animations): animations 17, one per feel step; effects 15; printout forms and lines 24; other drawn parts 3; UI items 32.

**Derived:** first-release systems per pillar: GP-1 Wires, Agents, Run, Reports; GP-2 Items, Run view, Reports, Orders, Repair orders, Campaign, Incident archive, Achievements; GP-3 Wiring board, Wires, Agents, Items, Run view, Reports, Orders; GP-4 Wires, Run, Par and score, Orders, Repair orders, Achievements; PP-1 Wiring board, Wires, Campaign, Report sharing. Every pillar has a first-release system. Cut candidates: Saving, Offline play, Settings, Product measures. Content totals: orders 30, repair orders 6 of them; order texts 30; hand-written results 90; agents 18; rule texts 18; silhouettes 6; lamp states 4; item kinds 12; marks 12; authored lines at most 216; report forms 2; wire styles 3; sounds 8; acts 6; opening misfire 1; memo lines 6; achievements 18; picture layouts 1; console frames 1; console parts 3; terminal kinds 2; animations 17; effects 15; printout forms and lines 24; other drawn parts 3; UI items 32.
