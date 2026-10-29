# Saving

Design status: Defined.

## Goal

Saving: progress kept in this browser as it happens, and carried to another browser by a save code. Serves no pillar: [Constraints](../vision.md#constraints).
Player decision: when to copy the save code, and where to paste it. Feedback: the code on the teletype with its COPY control; "COPIED", "SAVE CODE READ" or "CODE NOT READ".
Flavour: Mission Control's personnel file, typed out as one long line.
Not owned here: what is won and found, [Campaign](../campaign/campaign.md), [Incident archive](../campaign/incident-archive.md), [Achievements](../campaign/achievements.md); best scores, [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score); the sound setting, [Settings](settings.md).

## Inputs

- Orders won: [CAMPAIGN-02](../campaign/campaign.md#campaign-02-unlock).
- Best scores and pars met: [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score).
- Filed reports and results found: [ARCHIVE-01](../campaign/incident-archive.md#archive-01-file).
- Achievements earned: [ACHIEVE-01](../campaign/achievements.md#achieve-01-earn).
- Each order's wiring and its undo steps: [Wires](../board/wires.md).
- A report printed: [REPORT-04](../board/reports.md#report-04-print).
- Each order's second-wiring lamp: [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list).
- GameVersion: [Offline play parameters](offline-play.md#parameters).
- An act's memo and debrief closed: [CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start), [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end).

## Outputs

- The kept save, read when the game opens: [CAMPAIGN-02](../campaign/campaign.md#campaign-02-unlock), [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list), [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse), [ACHIEVE-02](../campaign/achievements.md#achieve-02-show), [BOARD-01](../board/wiring-board.md#board-01-open).

## Mechanics

### SAVE-01 Keep

Anything the save holds changes, except a run's outcome → this browser's own storage keeps it at once, never a cookie, merged into the save it already keeps as [SAVE-03](#save-03-paste-in) merges, never written over it.

- The save holds, GameVersion first ([Offline play parameters](offline-play.md#parameters)): orders won; each order's best scores, pars met and second-wiring lamp, with the filed report of the win that lit it; filed reports, in filing order ([ARCHIVE-01](../campaign/incident-archive.md#archive-01-file)); results found; achievements earned; the acts whose memo and whose debrief the player has closed ([CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start), [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end)). Orders and results are named as [Orders](../data.md#orders) keeps them, jacks as the order data writes them; each order with a filed report carries a fingerprint of its agents, destinations, batch, opening and par, the data a report reprints from.
- This browser also keeps, outside the save code: each order's wiring, in wire list order, with its undo steps, its order's fingerprint, of the fields above, one that changes when any of them changes, and the GameVersion it was kept under; the sound setting ([SETTING-01](settings.md#setting-01-sound)); whether the game has asked to keep storage as persistent; the event store, its flags and queue ([MEAS-04](../product/measures.md#meas-04-event-flags), [MEAS-03](../product/measures.md#meas-03-send)). Two pages change one wiring: the later change stands. A won repair order keeps no wiring, whether a run or a pasted code won it, and whatever page changes it after: it opens failing again: [BOARD-01](../board/wiring-board.md#board-01-open).
- A run's outcome is kept whole when its report starts to print: the win, its scores, the second-wiring lamp, the filing and any achievement. The game closed before that: only the wiring the run started from is kept.
- The save code first prints in this browser ([SAVE-02](#save-02-copy-out)) → the game asks the browser, once, to keep its storage as persistent; refused or unsupported → nothing changes, nothing prints, and it is not asked again.

### SAVE-02 Copy out

An act's debrief is closed for the first time ([CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end)), or the player taps "SAVE CODE" on the order list → the teletype prints the save code, selectable, with a COPY control.

- The code: the save, as one line of letters, digits, "-" and "_", ending in a check that fails when any one character changes.
- COPY → the whole code goes to the clipboard, and "COPIED" prints. The browser refuses → the code is selected for the player to copy, and "SELECT AND COPY" prints.
- It closes as [REPORT-04](../board/reports.md#report-04-print) says.

### SAVE-03 Paste in

The player taps "LOAD SAVE CODE" on the order list, pastes a code into its field, and taps "READ" → the code's save merges into this browser's, and "SAVE CODE READ" prints:

- an order won in either is won, its kept wiring as [SAVE-01](#save-01-keep) says; each best score is the better of the two; a par met, a lamp lit, or an act's memo or debrief closed in either is so; a lamp lit in this browser keeps its own lit-by report, one lit in the code only the code's;
- filed reports, results found and achievements: those of both, each once; filed reports in this browser's order, then the code's new ones in theirs;
- then the commendations the merge newly earns: [ACHIEVE-02](../campaign/achievements.md#achieve-02-show).

Spaces and line breaks in the pasted text are ignored. The field and what READ prints close as [REPORT-04](../board/reports.md#report-04-print) says; a field closed before READ reads nothing.

- A code whose check fails → "CODE NOT READ", and nothing changes.
- GameVersion is read first. A code from a later GameVersion → "CODE FROM A NEWER VERSION. CONNECT, CLOSE EVERY TERMINAL, AND OPEN IT AGAIN.", and nothing changes: [OFFLINE-03](offline-play.md#offline-03-new-version).

### SAVE-04 No keeping

A write to this browser's storage fails or does not read back → the game plays as usual, and the save and all SAVE-01 keeps beside it last until the page closes.

- Once, on the order list: "THIS TERMINAL KEEPS NO RECORDS. COPY YOUR SAVE CODE."
- A private window that keeps writes and clears them at its close passes the test; the code offered at each act's end carries the save out: [SAVE-02](#save-02-copy-out).

### SAVE-05 Version

The kept save, a kept wiring, or a pasted code is from an earlier GameVersion → it is read by its names; an order whose fingerprint differs from the version playing drops what no longer fits:

- a kept wiring or its undo steps → the order opens on its opening wiring;
- its filed reports → dropped; its win, results found, bests, pars met and lamp stay, and each result found stays listed: [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).
- Anything dropped → "SOME RECORDS FROM AN EARLIER VERSION NOT KEPT." prints, once.
- Once read, the kept save takes the GameVersion playing.
- A release keeps each order's number and each result's place in its list; a result rewritten in its place keeps its find.

## Edge cases

- A code pasted into the browser it came from, or pasted twice: the save stays the same: [SAVE-03](#save-03-paste-in).
- A code from an earlier or a later version: [SAVE-03](#save-03-paste-in), [SAVE-05](#save-05-version).
- Two pages of the game open in one browser: [SAVE-01](#save-01-keep).
- A run hidden and then closed before its report: not kept as won: [SAVE-01](#save-01-keep), [VIEW-06](../board/run-view.md#view-06-hidden).
- **Derived:** the code grows with the filed reports; it holds no personal data: [SAVE-01](#save-01-keep), [Constraints](../vision.md#constraints).

## Links

- Where the game's files are kept: [Offline play](offline-play.md).
