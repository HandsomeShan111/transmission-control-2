# Campaign

Design status: Defined.

## Goal

Campaign: six acts of orders, one act a session, each act bringing an agent family, opened by the night staff's misfire. Serves GP-2, PP-1.
Player decision: which unlocked order to play or replay next. Feedback: the order list ([CAMPAIGN-05](#campaign-05-order-list)); the act's debrief at its end.
Flavour: one shift after another at humanity's last Mission Control, each shift handed a new department of machines.
Not owned here: an order's content, [Orders](../orders/orders.md); filed reports, [Incident archive](incident-archive.md); what persists between sessions, [SAVE-01](../platform/saving.md#save-01-keep).

## Inputs

- Orders and their acts: [Orders data](../data.md#orders); agent families: [Agent families](../data.md#agent-families).
- A won run and its scores: [RUN-08](../board/run.md#run-08-result), [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score).
- Hand-written results found: [ARCHIVE-01](incident-archive.md#archive-01-file).

## Outputs

- The order a board opens: [BOARD-01](../board/wiring-board.md#board-01-open).
- Act progress, for achievements: [Achievements](achievements.md).
- A new game's first tap: [MEAS-01](../product/measures.md#meas-01-order_start).

## Parameters

- **Acts**: integer, acts. Start: 6. Fixed.
- **OrdersPerAct**: integer, orders. Start: 5. Fixed.
- **OpeningGuard**: number, seconds. Start: 1.0. Range: 0.5 to 2.0.

## Mechanics

### CAMPAIGN-01 Opening misfire

The game opens as a new game, no order won and no result found, and the player taps anywhere but the AUDIO switch ([SETTING-01](../platform/settings.md#setting-01-sound)) → the night staff's wiring of order 1 runs on the board, as any run: [VIEW-01](../board/run-view.md#view-01-play), [VIEW-04](../board/run-view.md#view-04-full-alarm).

- The night staff's wiring: order 1's `opening` ([Orders data](../data-orders-acts-1-2.md#1-signing-ceremony)). Its report leads with order 1's first hand-written result, so the full alarm plays and the result is filed: [ARCHIVE-01](incident-archive.md#archive-01-file).
- Taps in the OpeningGuard seconds from the first tap do nothing; after them, a tap anywhere but the AUDIO switch skips the run as skip does ([VIEW-03](../board/run-view.md#view-03-fast-and-skip)), and acts in the alarm as [VIEW-04](../board/run-view.md#view-04-full-alarm) says; a tap on the AUDIO switch only flips it.
- The report is closed → act 1's memo prints as [CAMPAIGN-03](#campaign-03-act-start) says; the memo is closed → order 1 opens on that wiring, as its `opening`: [BOARD-01](../board/wiring-board.md#board-01-open).

### CAMPAIGN-02 Unlock

An order is won for the first time → the next order in the campaign is unlocked, and the unlock line, "ORDER <number> UNLOCKED: <name>.", prints where [CAMPAIGN-06](#campaign-06-after-the-report) puts it; after an act's last order, it ends the debrief: [CAMPAIGN-04](#campaign-04-act-end).

- Order 1 is unlocked at a new game's first tap: [CAMPAIGN-01](#campaign-01-opening-misfire).
- The first order of an act is unlocked when the last order of the act before is won.
- Every unlocked order stays unlocked and can be replayed.
- No order after order 1 is unlocked any other way.

### CAMPAIGN-03 Act start

The player opens an act's first order, and the act's memo has never been closed → before its board shows, a teletype memo prints: the family's memo line ([Agent families](../data.md#agent-families)), its name and silhouette, then each of its agents with its face rule.

- Act 1: the memo also prints when the opening misfire's report is closed, if it has never been closed: [CAMPAIGN-01](#campaign-01-opening-misfire).
- A memo or a debrief prints and closes as [REPORT-04](../board/reports.md#report-04-print) says. One closed before prints at once when it prints again.
- A tap on an act's heading in the order list prints its memo, at once; closing it counts as the act's memo closed.

### CAMPAIGN-04 Act end

An act's last order is won for the first time → the act's debrief prints, a teletype printout, in its place after the report: [CAMPAIGN-06](#campaign-06-after-the-report).

- Lead: the first hand-written result found in the act, in order and result order; none → the act's newest incident report's lead; none → its newest mission report's lead; none → no lead line.
- Then one line per order, its best scores and pars met: "<number> <name>: ", then each best as the mission report prints a score ([PAR-02](../board/par-and-score.md#par-02-score)), Wires then Time, a repair order's Moves; such as "4 Archive day: Wires 5, par 5. Par met. Time 6, par 5.": [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score).
- Then the act's three achievements: an earned one by its name; the rest as progress, "Results <found> of <results>", "Second wirings <orders done> of <orders>", "Pars <met> of <pars>": [ACHIEVE-01](achievements.md#achieve-01-earn).
- The game closed after the win and before the debrief was closed → it prints when the game next opens, before the order list.
- Last, the next act's first order, as the unlock line ([CAMPAIGN-02](#campaign-02-unlock)); after the last act, "NO FURTHER ORDERS ON FILE."
- A done act: one whose last order is won. A tap on its heading in the incident archive prints its debrief again, its lead and progress as they stand then.

### CAMPAIGN-05 Order list

The game opens on a save that is not new, or the player opens the order list → it shows each act that has an unlocked order, its heading and its unlocked orders, and at each order:

- its number and name, and whether it is won;
- its par lamps: [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score);
- its results found: [ARCHIVE-02](incident-archive.md#archive-02-browse);
- an order that counts for second wirings ([ACHIEVE-01](achievements.md#achieve-01-earn)): a second-wiring lamp, lit once two of its wins count as different ([ORDER-05](../orders/orders.md#order-05-second-wirings)), and lit from then on. The wins compared: this win and each mission report the archive holds for the order, with its wiring ([ARCHIVE-01](incident-archive.md#archive-01-file)).

A tap on an order opens it: [BOARD-01](../board/wiring-board.md#board-01-open). The list opens scrolled to the order last opened; when the game opens, to the last unlocked order. Where it shows: [Order list](../ui/order-list.md).

### CAMPAIGN-06 After the report

A run's report prints → the lines it earns follow it on the teletype, in this order:

1. "FILED", for a result found: [ARCHIVE-01](incident-archive.md#archive-01-file).
2. On an order with a second-wiring lamp: "SECOND WIRING FILED: <order name>.", for a win that lights it; while it is dark, "ROUTE ALREADY ON FILE.", for a win that counts the same as a win on file and sets no new best and meets no par for the first time: [CAMPAIGN-05](#campaign-05-order-list), [ACHIEVE-01](achievements.md#achieve-01-earn).
3. Each commendation, in the kind order of [ACHIEVE-01](achievements.md#achieve-01-earn), results, second wirings, par; the teletype's bell rings once before the first, and never without one: [ACHIEVE-02](achievements.md#achieve-02-show).
4. An act's last first win: the report is closed → the debrief prints ([CAMPAIGN-04](#campaign-04-act-end)), then the save code: [SAVE-02](../platform/saving.md#save-02-copy-out).
5. Any other first win: the unlock line: [CAMPAIGN-02](#campaign-02-unlock).

## Edge cases

- A printout over the standby, such as the cannot-store line: the tap that closes it is not the first tap: [REPORT-04](../board/reports.md#report-04-print).
- A player who skips the opening misfire: the result is filed all the same: [CAMPAIGN-01](#campaign-01-opening-misfire).
- The game closed before the misfire's report prints: still a new game: [CAMPAIGN-01](#campaign-01-opening-misfire).
- The game closed before act 1's memo is closed: it prints again, as a first print, when order 1 next opens: [CAMPAIGN-03](#campaign-03-act-start).
- The game closed after an act's last first win, before its debrief was closed: the debrief prints at the next open, then the save code: [CAMPAIGN-04](#campaign-04-act-end).
- A new browser holding a save code: the misfire runs first; the code is pasted from the order list after it: [SAVE-03](../platform/saving.md#save-03-paste-in).
- An order replayed after a win: nothing new is unlocked: [CAMPAIGN-02](#campaign-02-unlock).
- An act's debrief with no incident report in the act: its lead is the newest mission report's: [CAMPAIGN-04](#campaign-04-act-end).
- **Derived:** the campaign holds Acts × OrdersPerAct orders, the [Orders](../system-map.md#orders) count: [CAMPAIGN-02](#campaign-02-unlock).

## Links

- Filed reports: [Incident archive](incident-archive.md).
- Achievements: [Achievements](achievements.md).
