# Acceptance tests

One test per step. A test passes when the build does what its linked step says, with every parameter at its start value.
Order: [Build order](order.md).

Test form: `- **<STEP ID>**: Setup: <state before, naming parameters>. Do: <player or system action>. Expect: <link: step>.`
Expected count or position computed from parameters → name them in a **Derived:** part, never the values.

## Test build

Tests run on a test build. It plays as the release does, with these aids only:

- Any order opens from a test list, past the campaign's locks.
- CountAddress and GameLink point at local test servers. A test never sends to the real counting service.
- A second build serves the same game with GameVersion raised, or with named data changed, for the new-version tests.
- A page can be held at a named point, for the tests of two open pages: run ended, report not printing; report printing; event lock taken, write not made.
- The browser's answer to the request to keep storage can be set: granted or refused. The aid counts the requests the game makes, kept across reloads, for the tester to read.
- A batch item of the open order can be put at any input jack. An item moved from another jack keeps its kind, marks and check counts. One named agent then works or checks its first waiting item once: no run, no report.
- The kept save shows as named values: orders won, each order's best wires, beats and moves, pars met. A save and the event store can be set before the game opens, from a test file in the save's own terms: orders won, bests, pars met, lamps, results found, filed reports with their wirings, closed memos and debriefs, kept wirings, achievements.
- Wiring search: for an order, it lists every winning wiring with no wire that carries nothing, with its wires, beats and the agents each item passes; for a repair order, its fewest-move fixes; for an item ending a hand-written result names, a wiring whose run gives it, with as few wires as the item's path needs. It drives the build's own run. A known winning wiring is one it lists. Tests that search run after build item 6, [Run](../board/run.md). A test that wins an order with no wiring named uses its line in [Test wirings](wirings.md): the line's first wiring, unless the test names the other.

## Areas

By area, each in the build order of its systems:

- [Orders](acceptance-orders.md): `ORDER-`, `REPAIR-`.
- [Board](acceptance-board.md): `BOARD-`, `AGENT-`, `WIRE-`, `ITEM-`.
- [Board, run](acceptance-board-run.md): `RUN-`, `PAR-`, `REPORT-`, `VIEW-`.
- [Campaign](acceptance-campaign.md): `ARCHIVE-`, `CAMPAIGN-`, `ACHIEVE-`, `SHARE-`.
- [Platform](acceptance-platform.md): `OFFLINE-`, `SAVE-`, `SETTING-`.
- [Product](acceptance-product.md): `MEAS-`.
- [Presentation, art direction](acceptance-art.md): `ART-`.
- [Presentation, feel](acceptance-feel.md): `FEEL-`.

## Screens

One check per screen: the build at the smallest and the largest screen of the vision's [Platform](../vision.md#platform) matches the screen page's Layout values; the preview is a guide only.

- **Loading**: Expect: [Loading layout](../ui/loading.md#layout).
- **Board**: Expect: [Board layout](../ui/board.md#layout).
- **Order list**: Expect: [Order list layout](../ui/order-list.md#layout).
- **Incident archive**: Expect: [Archive layout](../ui/archive.md#layout).
