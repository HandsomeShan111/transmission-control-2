# Data

Design status: Defined.

Game data, one section per data set. Field lists live here once. Rules that use the data live on the linked steps.

## Agent families

Used by [AGENT-01](board/agents.md#agent-01-face), and by the campaign's acts.

Fields, in entry order:

- `name`: text. The family's name, printed on each of its agents' faces.
- `silhouette`: text. The outline every agent of the family shares, drawn as [ART-09](art-direction-objects.md#art-09-agent-faces) says.
- `act`: integer, 1 to 6. The act that brings the family.
- `memo`: text, at most 12 words. The first line of the act's memo: [CAMPAIGN-03](campaign/campaign.md#campaign-03-act-start).

Entries:

- RECORDS: filing cabinet, act 1. "Department of Records: everything on file, nothing ever found."
- COMMS: teletype, act 2. "Communications: all messages travel in Latin, the only language no colony speaks."
- GALLEY: oven, act 3. "Galley: by regulation, cake outranks every document on this base."
- WORKSHOP: crane, act 4. "Workshop: heavy machinery for delicate missions. Mind the treaty."
- AUDIT: ledger desk, act 5. "Audit: every action counted, stamped, then counted again."
- DISPATCH: launch tube, act 6. "Dispatch: everything leaves this department. Nothing comes back."

## Agents

Used by [AGENT-01](board/agents.md#agent-01-face), [AGENT-02](board/agents.md#agent-02-work), [AGENT-03](board/agents.md#agent-03-check), [AGENT-04](board/agents.md#agent-04-copy), [REPORT-02](board/reports.md#report-02-item-lines).

Fields, in entry order:

- `name`: text, capital letters. Printed on the face, and in reports.
- `family`: an [Agent families](#agent-families) entry.
- `role`: `worker`, `checker` or `copier`. Sets the agent's jacks: [AGENT-01](board/agents.md#agent-01-face).
- `rule`: text, in [GP-3](vision-pillars.md#gp-3-mission-control-played-straight)'s word limit. Printed on the face.
- `mark`: workers and copiers only. Text, one past-tense word: the mark's name, used in result lines ([REPORT-03](board/reports.md#report-03-result-line)), and drawn on the agent's face. Its drawing: [ART-11](art-direction-objects.md#art-11-mark-tiles).
- `to kind`: an [Item kinds](#item-kinds) entry, `first kind`, or none. A worker's kind change: [AGENT-02](board/agents.md#agent-02-work).
- `test`: checkers only. `attribute`, then an attribute: plus when the item's kind has it. `mark`, then an agent: plus when the item carries that agent's mark. `count`, then a number: plus when the item carries that many marks or more. `as ordered`: plus when the item's kind and marks equal its required output's ([ITEM-01](board/items.md#item-01-enter)), destination aside; an item with no required output gets minus.
- `verdict words`: checkers only. Plus word, then minus word, printed after the agent's line in reports.

Entries:

- LAMINATOR: RECORDS, worker. "Laminates it." Mark: laminated. To kind: none.
- SHREDDER: RECORDS, worker. "Shreds it to confetti." Mark: shredded. To kind: Confetti.
- INSPECTOR: RECORDS, checker. "Is it paper?" Test: attribute paper. Verdict words: "Paper." "Not paper."
- TRANSLATOR: COMMS, worker. "Translates it to Latin." Mark: translated. To kind: none.
- SUMMARIZER: COMMS, worker. "Shortens it to one word." Mark: summarized. To kind: none.
- CENSOR: COMMS, checker. "Is it in Latin?" Test: mark TRANSLATOR. Verdict words: "Latin." "No Latin."
- BAKER: GALLEY, worker. "Bakes it into a cake." Mark: baked. To kind: Cake.
- SLICER: GALLEY, copier. "Cuts it in two." Mark: sliced. To kind: none.
- TASTER: GALLEY, checker. "Is it edible?" Test: attribute edible. Verdict words: "Edible." "Not edible."
- COMPACTOR: WORKSHOP, worker. "Crushes it into a cube." Mark: crushed. To kind: Cube.
- RESTORER: WORKSHOP, worker. "Restores its first kind." Mark: restored. To kind: first kind.
- GAUGE: WORKSHOP, checker. "Is it metal?" Test: attribute metal. Verdict words: "Metal." "Not metal."
- STAMPER: AUDIT, worker. "Stamps it APPROVED." Mark: approved. To kind: none.
- SEALER: AUDIT, worker. "Seals it in wax." Mark: sealed. To kind: none.
- TALLY: AUDIT, checker. "Three marks yet?" Test: count 3. Verdict words: "Three or more." "Fewer than three."
- WRAPPER: DISPATCH, worker. "Wraps it for flight." Mark: wrapped. To kind: none.
- LABELLER: DISPATCH, worker. "Labels it URGENT." Mark: labelled. To kind: none.
- VERIFIER: DISPATCH, checker. "Is it as ordered?" Test: as ordered. Verdict words: "As ordered." "Not as ordered."

## Item kinds

Used by [ITEM-01](board/items.md#item-01-enter), [AGENT-02](board/agents.md#agent-02-work), [AGENT-03](board/agents.md#agent-03-check), [REPORT-02](board/reports.md#report-02-item-lines).

Fields, in entry order:

- `name`: text. Printed in reports and order texts.
- `attribute`: `paper`, `edible`, `metal` or none. What attribute tests read: [AGENT-03](board/agents.md#agent-03-check).

Entries:

- Address: paper. The President's address to humanity.
- Treaty: paper.
- Star chart: paper.
- Confetti: paper.
- Cake: edible.
- Coffee: edible.
- Sandwich: edible.
- Satellite: metal.
- Cube: metal.
- Flag: none.
- Moon rock: none.
- Spacesuit: none. Always empty.

## Orders

Used by [BOARD-01](board/wiring-board.md#board-01-open), [ITEM-01](board/items.md#item-01-enter), [REPORT-01](board/reports.md#report-01-form-and-lead), [PAR-01](board/par-and-score.md#par-01-setting-par), [REPAIR-01](orders/repair-orders.md#repair-01-faults), [CAMPAIGN-01](campaign/campaign.md#campaign-01-opening-misfire), [CAMPAIGN-02](campaign/campaign.md#campaign-02-unlock), [CAMPAIGN-04](campaign/campaign.md#campaign-04-act-end), [CAMPAIGN-05](campaign/campaign.md#campaign-05-order-list), [CAMPAIGN-06](campaign/campaign.md#campaign-06-after-the-report), [ARCHIVE-01](campaign/incident-archive.md#archive-01-file), [ARCHIVE-02](campaign/incident-archive.md#archive-02-browse), [ACHIEVE-01](campaign/achievements.md#achieve-01-earn), [SHARE-01](campaign/report-sharing.md#share-01-text), [SHARE-02](campaign/report-sharing.md#share-02-picture), [SAVE-01](platform/saving.md#save-01-keep), [MEAS-03](product/measures.md#meas-03-send), [MEAS-04](product/measures.md#meas-04-event-flags).

Order numbers and result places across releases: [SAVE-05](platform/saving.md#save-05-version).

Fields, in entry order, one `###` heading per order, "<number> <name>"; one bullet per field, "<field>: <value>.", `act` and `repair` sharing one; items of a list as nested bullets:

- `act`: integer, 1 to 6. `repair`: yes or no, a repair order.
- `text`: text. The order as the [Board](ui/board.md#shows) shows it: [ORDER-01](orders/orders.md#order-01-text).
- `agents`: each agent as "<name> at <column>/<lane>", a checking agent with ", pass limit <PassLimit>", joined by semicolons. Columns from 1, lanes from 0. Numbered as [AGENT-01](board/agents.md#agent-01-face) says.
- `destinations`: names, one output terminal each, in lane order, joined by semicolons. Where the terminals sit: [Board](ui/board.md#layout).
- `batch`: items in batch order, one nested bullet each: "<kind>", with "[<starting marks>]" if any, "→ <destination>: <kind>, <marks in order, joined by commas>" or "untouched". A named copy follows its item as "copy <n> → <destination>: <kind>, <marks>".
- `opening`: the opening wiring, wires as "<output jack> → <input jack or destination>" joined by semicolons, or none. Output jacks: `IN` for the input terminal, "<agent>" for a worker's, "<agent> plus" and "<agent> minus" for a checking agent's, "<agent> item" and "<agent> copy" for a copier's.
- `results`: hand-written results, one nested bullet each: its item ending, "<item>[ copy <n>] at <destination>: <kind>, <marks> or untouched", "<item>[ copy <n>] stopped at <agent or IN>: <kind>, <marks> or untouched" or "<item>[ copy <n>] lost: <kind>", then its text in quotes.
- `par`: "wires <WirePar>, time <TimePar>", each a number or none, then ", split" where no one known winning wiring meets both; a repair order "moves <MovePar>".

Entries, in three parts by act:

- RECORDS and COMMS: [Orders, acts 1 and 2](data-orders-acts-1-2.md).
- GALLEY and WORKSHOP: [Orders, acts 3 and 4](data-orders-acts-3-4.md).
- AUDIT and DISPATCH: [Orders, acts 5 and 6](data-orders-acts-5-6.md).

## Achievements

Used by [ACHIEVE-01](campaign/achievements.md#achieve-01-earn) and [ACHIEVE-02](campaign/achievements.md#achieve-02-show).

Fields, in entry order:

- `name`: text, at most 3 words. Printed in the commendation line and the archive.
- `act`: integer, 1 to 6.
- `kind`: `results`, `second wirings` or `par`.
- `line`: text, at most 12 words, printed after the name.

Entries:

- Paper Trail: act 1, results. "Every RECORDS incident on file. The cabinet no longer closes."
- Second Opinion: act 1, second wirings. "Two right answers on file. The committee cannot pick one."
- Under Budget: act 1, par. "Fewer wires, less time. Accounting suspects a typo."
- Line Noise: act 2, results. "All fifteen COMMS failures transcribed. The colonies want them broadcast."
- Alternate Frequency: act 2, second wirings. "Every message sent two ways. The colonies replied to both."
- Clear Signal: act 2, par. "No message ran over par. The Latin desk took the afternoon off."
- Kitchen Incidents: act 3, results. "Health inspectors have read all fifteen GALLEY incidents. The Canteen is closed."
- Two Recipes: act 3, second wirings. "Each dish served two ways. Both were cake."
- Served Hot: act 3, par. "Every order served before it cooled. The soup arrived before the guests."
- Scrap Heap: act 4, results. "The WORKSHOP file is complete. It has been crushed for storage."
- Spare Parts: act 4, second wirings. "Jobs done two ways. The Workshop has billed for both."
- Tight Tolerances: act 4, par. "Every job within tolerance. The crane has been given a medal."
- Full Audit: act 5, results. "Fifteen AUDIT incidents, each stamped three times. The Bureau is delighted."
- Second Signature: act 5, second wirings. "Forms approved by two routes. The Bureau has opened an inquiry."
- Within Regulation: act 5, par. "Every par met. The Bureau finds this irregular."
- Debris Field: act 6, results. "Fifteen DISPATCH mishaps, recovered from low orbit and filed."
- Alternate Trajectory: act 6, second wirings. "Launches flown two ways. Both reached orbit."
- On Schedule: act 6, par. "Every launch at par. Humanity is, briefly, on time."

## Authored lines

One line per agent and item kind, 216 in all, in three parts by family. RESTORER's lines hold `{first}`, printed as [REPORT-02](board/reports.md#report-02-item-lines) says.

- RECORDS and COMMS: [Authored lines, acts 1 and 2](data-lines-acts-1-2.md).
- GALLEY and WORKSHOP: [Authored lines, acts 3 and 4](data-lines-acts-3-4.md).
- AUDIT and DISPATCH: [Authored lines, acts 5 and 6](data-lines-acts-5-6.md).
