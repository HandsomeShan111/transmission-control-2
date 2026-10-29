# Items

Design status: Defined.

## Goal

Items: the batch's things, flowing along wires and carrying their history as marks. Serves GP-2, GP-3.
Player decision: which path each item of the batch needs, read from its kind and its marks. Feedback: each item's body with its latest marks, moving on the board; its result drawn at the output terminal under the required output.
Flavour: humanity's urgent cargo, a treaty or a birthday cake, carried through the console like a parcel on rails.
Not owned here: what agents do to an item, [AGENT-02](agents.md#agent-02-work) to [AGENT-04](agents.md#agent-04-copy); matching, [RUN-07](run.md#run-07-match).

## Inputs

- The order's batch and required outputs: [Orders](../system-map.md#orders).
- A copy: [AGENT-04](agents.md#agent-04-copy).

## Outputs

- Kind, first kind and marks: [AGENT-03](agents.md#agent-03-check), [RUN-07](run.md#run-07-match), [REPORT-02](reports.md#report-02-item-lines).
- The item's drawing: [VIEW-01](run-view.md#view-01-play).

## Parameters

- **MarksShown**: integer, latest marks shown on a moving item's body. Start: 3, from the [Pitch](../vision.md#pitch). Fixed.

## Mechanics

### ITEM-01 Enter

A run starts → each item of the batch waits at the input terminal, in batch order.

- Each item has a kind from [Item kinds](../data.md#item-kinds), and the starting marks its order gives it, if any.
- Its first kind: its kind on entering. A kind change never changes it.
- Each item has its own required output, from its order: a destination, a kind and marks in order.

### ITEM-02 Marks

An agent adds its mark → the mark goes at the end of the item's marks.

- A mark the item already carries is added again. Marks keep the order they were added in.
- Each mark is drawn the same on any body. Each item kind has one body.

### ITEM-03 Copies

A copier makes a copy → a new item, with the original's kind, first kind and marks.

- It takes the next copy number of its original batch item: copy 1, copy 2, in the order they are made. A copy of a copy counts as a copy of the same batch item.
- Its required output: the one its order names for that copy number. None named → the copy has no required output: [RUN-07](run.md#run-07-match).

### ITEM-04 Drawing

An item is on the board → drawn as its kind's body, with its latest MarksShown marks, the oldest of them first.

- An item at an output terminal that has a row for it is drawn there as its result: its body with all its marks, in order, under its required output drawn the same way, each mark under the mark required at its place.
- A result that does not match rings its first difference ([REPORT-05](reports.md#report-05-first-difference)): the differing mark and the required one above it, an extra mark, or the empty place of a missing mark. A wrong destination, or a rejection with the required marks, rings nothing.
- A rejected item also carries the minus sign, from its rejection on.
- An item that stops or is lost leaves its row with no result, stamped "STOPPED: <agent, or the input terminal>" or "LOST".
- A result with more marks than a row holds ([RowMarks](../ui/board.md#layout)): its first marks, then one tile with the count of the rest, RowMarks tiles in all. A first difference among the rest rings that tile.
- An item at a terminal with no row for it, a copy nobody ordered or an item for another destination: drawn in one extra row at that terminal's foot, labelled "not ordered" or with the destination it was ordered for. More such items stack in that row, with a count.

## Edge cases

- An item with no marks: drawn as its bare body: [ITEM-04](#item-04-drawing).
- More marks than MarksShown while moving: the oldest are not drawn; the result and the report show all: [ITEM-04](#item-04-drawing), [REPORT-02](reports.md#report-02-item-lines).
- A kind change: the body changes, the marks stay: [AGENT-02](agents.md#agent-02-work).

## Links

- Agents that change an item: [Agents](agents.md).
- Where results are compared: [Run](run.md).
