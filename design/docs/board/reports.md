# Reports

Design status: Defined.

## Goal

Reports: every run ends in a mission report or an incident report, printed on the teletype: the joke and the clue. Serves GP-1, GP-2, GP-3.
Player decision: which wire to change next, read from where each item first went wrong. Feedback: the teletype printout and its sound; a lead line naming the result; each item's path, agent by agent.
Flavour: a formal record of an absurd result, typed by a machine that sees nothing wrong.
Not owned here: filing and sharing reports, [Campaign](../system-map.md#campaign); the alarm before a report, [VIEW-04](run-view.md#view-04-full-alarm).

## Inputs

- Each item's end, path and match, and the result: [RUN-03](run.md#run-03-arrive) to [RUN-08](run.md#run-08-result).
- Authored lines and verdict words: [Data](../data.md#authored-lines), [Agents](../data.md#agents).
- The order's hand-written results, each with the item ending it answers: [Orders](../system-map.md#orders).
- Scores: [PAR-02](par-and-score.md#par-02-score).

## Outputs

- The report's lead, for the full alarm: [VIEW-04](run-view.md#view-04-full-alarm).
- The printed report, for the archive and sharing: [Campaign](../system-map.md#campaign).

## Parameters

- **ItemLinesMax**: integer, lines per item path. Start: 8. Range: 4 to 12.
- **PrintLineTime**: number, seconds per line. Start: 0.15. Range: 0.05 to 0.3.
- **ItemBlocksMax**: integer, item blocks per report. Start: 12. Range: 8 to 16.

## Mechanics

### REPORT-01 Form and lead

The run ends ([RUN-08](run.md#run-08-result)) → a report with one lead line.

- Won → mission report. Lead: "<order name>: delivered as ordered." Then the scores: [PAR-02](par-and-score.md#par-02-score); for a repair order, its moves, [REPAIR-03](../orders/repair-orders.md#repair-03-score).
- Failed → incident report. Lead: the first of the order's hand-written results whose item ending the run gave; for a repair order, the first of its first failing item's ([REPORT-06](#report-06-repair-orders)). None → the first failing item's result line ([REPORT-03](#report-03-result-line)), or its end line when it has none ([REPORT-02](#report-02-item-lines)); items in batch order, each copy right behind its original.
- An incident report's second line: the first difference of the item the lead names, when it has one ([REPORT-05](#report-05-first-difference)).
- A hand-written result answers one item ending: one batch item, by its place in the batch, or one of its copies, by copy number, ending in one of three ways: at a given output terminal with a given kind and marks; stopped at a given agent or the input terminal with a given kind and marks, a rejected item that stays at its checking agent ([RUN-05](run.md#run-05-reject)) among them; or lost, with a given kind. A run gives it when that item ends so.
- Then each item's lines ([REPORT-02](#report-02-item-lines)); for a repair order, [REPORT-06](#report-06-repair-orders).

### REPORT-02 Item lines

A report is written → for each item, in the item order of [REPORT-01](#report-01-form-and-lead):

1. A heading: the item's first kind, with its copy number for a copy.
2. Its path: the authored line of each agent that worked it, in order, picked by the kind the item has when that agent receives it; a checking agent's line ends with its verdict word, after a space, on the same line.
   - In a line, `{first}` prints "the" and the name of the item's first kind.
   - A line repeating back to back as printed prints once, ending with "×" and the number of times it ran, after any verdict word. A block of lines repeating so prints once, then "Last <n> lines ×<count>." Where both could collapse, the repeat that starts first collapses; from one start, the shorter.
3. Its end, the first of these that holds:
   - rejected: "<agent> rejected the <kind> after <PassLimit> checks." ("1 check" for one), then its result line and first difference; with no required output, it stays at the checking agent ([RUN-05](run.md#run-05-reject)), and "Nobody ordered this <kind>." follows in place of both;
   - with no required output: its result line, if it reached an output terminal, then "Nobody ordered this <kind>.";
   - matched: "Delivered to <destination> as ordered.";
   - at an output terminal, not matched: its result line ([REPORT-03](#report-03-result-line)) and its first difference ([REPORT-05](#report-05-first-difference));
   - stopped: "<agent, or the input terminal> holds the <kind>: no wire.";
   - lost: "Still in the wiring when the run ended."

- The item an incident report's second line names: its block leaves out that first difference, and its result line when the lead is that line.

- Kind names print as data names them in headings and result lines, and in lower case inside a sentence, as authored lines write them.
- More items than ItemBlocksMax: the first item blocks, as many as ItemBlocksMax less two; then "<count> more items, through <agents>."; then the last item's block.
- A path still over ItemLinesMax lines once repeats collapse: its first lines, as many as ItemLinesMax less two; then "<count> more lines, through <agents>."; then its last line.
- A cut line names each agent of the hidden lines once, in the order first named, joined by commas, the last after "and"; none → "through no agent".

### REPORT-03 Result line

An item ends at an output terminal → its result line: "<destination> received: <kind>, <marks, in order>."

- Marks print as their names ([Agents](../data.md#agents)), in order, joined by commas; with two or more, the last after "then". No marks → "untouched".
- The output terminal it reached names the destination.

### REPORT-04 Print

A report is ready → it prints on the teletype, one line each PrintLineTime, with the teletype sound.

- A tap prints the rest at once.
- Any printout on the teletype, its field included, closes on a tap once whole. A report's close returns the board: [VIEW-05](run-view.md#view-05-return).
- While a printout lies on the screen, a tap anywhere does only what this step says. Its own plates and field do their own. The AUDIO switch flips: [SETTING-01](../platform/settings.md#setting-01-sound). While the picture view shows, [SHARE-02](../campaign/report-sharing.md#share-02-picture) owns every other tap. The frame's other controls, RUN among them, and whatever lies under the paper do nothing of their own.
- A printout taller than its room keeps its newest line in view while it prints. Once whole, it goes back to its top: the lead, and an incident report's second line, in view. Its foot stays: [Printout](../ui/style.md#printout). Then a drag or the wheel on it scrolls it and closes nothing.

- A report already filed prints at once: [ARCHIVE-01](../campaign/incident-archive.md#archive-01-file).

### REPORT-05 First difference

An item fails at an output terminal → its first difference, the first of these that holds:

- a mark differs: "First difference: mark <n>, <mark> by <agent>; required <mark>."
- the required marks run out first: "First difference: mark <n>, <mark> by <agent>, not ordered."
- the item's marks run out first: "First difference: mark <n> missing; required <mark>."
- the destination differs: "First difference: delivered to <destination>; required <destination>."

A mark the item started with names "from the start" in place of "by <agent>".

- **Derived:** a kind never differs alone. A worker that changes the kind adds its mark ([AGENT-02](agents.md#agent-02-work)), so equal marks mean an equal kind.

- A rejected item, none of these holding: "First difference: none in kind or marks; the item was rejected."

### REPORT-06 Repair orders

A repair order's run fails → its incident report gives the item lines of its first failing item only: the first, in the item order of [REPORT-01](#report-01-form-and-lead), that is not matched.

## Edge cases

- Several hand-written results given by one run, or none: one lead, as REPORT-01 picks it; with none given, a first failing item that reached no output terminal leads with its end line: [REPORT-01](#report-01-form-and-lead), [REPORT-02](#report-02-item-lines).
- An item no agent worked: its path is empty; its end line follows its heading: [REPORT-02](#report-02-item-lines).
- **Derived:** the cannot-store line over the opening's standby: the first tap closes it only; the next starts the opening misfire: [REPORT-04](#report-04-print), [OFFLINE-01](../platform/offline-play.md#offline-01-first-load), [CAMPAIGN-01](../campaign/campaign.md#campaign-01-opening-misfire).
- **Derived:** one wiring prints one report, as its run is one: [RUN-02](run.md#run-02-beat).
- **Derived:** a failing item's first difference names the agent that gave a wrong mark or kind, where one did, so the report points to the wire into or out of that agent: [REPORT-05](#report-05-first-difference).

## Links

- Lines: [Data, authored lines](../data.md#authored-lines).
- How a printing report looks and sounds: [FEEL-09](../feel-campaign.md#feel-09-report-prints).
- Sharing a report: [Report sharing](../campaign/report-sharing.md).
- Archive and sharing: [Campaign](../system-map.md#campaign).
