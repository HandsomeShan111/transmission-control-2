# Agents

Design status: Defined.

## Goal

Agents: literal-minded machines fixed on the wiring board, each applying the rule on its face to whatever item arrives. Serves GP-1, GP-3.
Player decision: which agents each item passes, and in which order; which agents a win does not need. Feedback: each face shows its rule and the mark it adds; its lamp lights while it works and shows each verdict; working and verdict sounds.
Flavour: the night shift's machines: patient, literal, proud of every job, however absurd.
Not owned here: where agents sit, [BOARD-01](wiring-board.md#board-01-open); when an agent works, [RUN-02](run.md#run-02-beat).

## Inputs

- An item at its input jack: [RUN-02](run.md#run-02-beat).
- Its place and, for a checking agent, its pass limit: the order, [Orders](../system-map.md#orders).

## Outputs

- The worked item, sent by one of its output jacks: [RUN-02](run.md#run-02-beat).
- A rejected item: [RUN-05](run.md#run-05-reject).
- Its line in the report: [REPORT-02](reports.md#report-02-item-lines).

## Parameters

- **PassLimit**: integer, checks of one item. Start: 2. Range: 1 to 5. Set per checking agent in each order.

## Mechanics

### AGENT-01 Face

An order opens → each agent shows its name, its family's silhouette, its rule, its lamp and its jacks, from [Agents](../data.md#agents).

- A worker: one input jack, one output jack. Its mark, drawn on its face as on an item.
- A checking agent: one input jack, a plus jack and a minus jack. Its face also shows its PassLimit, labelled as the most checks it gives one item.
- A copier: one input jack, and two output jacks labelled by what leaves them: item and copy. Its mark, as a worker's.
- Its lamp: off.
- Two or more of one agent in an order: each name gets a number, from 1, in column order, then lane order. The number prints wherever the name does.

### AGENT-02 Work

A worker works an item → it adds its mark ([ITEM-02](items.md#item-02-marks)), then sends the item by its output jack.

- A worker with a `to kind` also changes the item into that kind; `first kind` changes it back to the item's first kind ([ITEM-01](items.md#item-01-enter)). The kind changes before the next agent reads it.
- Its lamp: steady while it works; working sound.

### AGENT-03 Check

A checking agent checks an item → it gives the verdict its `test` reads ([Agents](../data.md#agents)), and sends the item by the jack of that verdict.

- Plus: it sends the item by its plus jack. Minus: by its minus jack.
- It adds no mark either way.
- Its lamp: plus or minus, until it checks the next item; that verdict's sound.

### AGENT-04 Copy

A copier works an item → it adds its mark, makes a copy ([ITEM-03](items.md#item-03-copies)), and sends the item by its item jack and the copy by its copy jack.

- Its lamp and sound: as a worker's, [AGENT-02](#agent-02-work).

### AGENT-05 Pass limit

A checking agent's next item is one it has checked PassLimit times → it rejects that item in place of a check, with no mark ([RUN-05](run.md#run-05-reject)).

- Each checking agent counts its own checks of each item, from the run's start. A copy's count starts at zero.
- Its lamp: minus; the minus sound.

### AGENT-06 Idle

A worker or a copier has no item to work → its lamp is off.

## Edge cases

- An agent no wire reaches: never works, lamp off all run: [AGENT-06](#agent-06-idle).
- A checking agent wired into its own input: each item comes back to it until PassLimit: [AGENT-05](#agent-05-pass-limit).
- A kind change into the kind the item already has: the kind stays, the mark is added: [AGENT-02](#agent-02-work).
- **Derived:** a checking agent leaves no trace on an item; its verdicts show in its lamp, in the item's route and in the report: [AGENT-03](#agent-03-check), [REPORT-02](reports.md#report-02-item-lines).
- **Derived:** a loop through one worker and a chain through several of that worker, numbered ([AGENT-01](#agent-01-face)), give the same marks: [ITEM-02](items.md#item-02-marks), [AGENT-03](#agent-03-check).

## Links

- Agent and family data: [Data](../data.md#agents).
- How items move between agents: [Run](run.md).
