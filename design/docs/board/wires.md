# Wires

Design status: Defined.

## Goal

Wires: the player's one verb, a wire from an output jack to an input jack. Serves GP-1, GP-3, GP-4, PP-1.
Player decision: which output jack feeds which input jack, and so which agents each item passes, in which order. Feedback: the wire drawn as it is held; lit marks blink on the jacks it can plug into; data wires solid, feedback wires dashed and marked plus or minus; a plug and an unplug sound.
Flavour: patch cords on a 1970s console, plugged by the one calm engineer in the room.
Not owned here: what moves along a wire, [RUN-02](run.md#run-02-beat); panning while a wire is held, [BOARD-03](wiring-board.md#board-03-pan-and-zoom).

## Inputs

- The jacks of the board: [AGENT-01](agents.md#agent-01-face), [BOARD-01](wiring-board.md#board-01-open).
- The order's opening wiring: [BOARD-01](wiring-board.md#board-01-open).

## Outputs

- The wiring: [RUN-02](run.md#run-02-beat), and its wire count, [PAR-02](par-and-score.md#par-02-score).

## Parameters

- **EndReach**: number, fraction of [JackMinSize](wiring-board.md#parameters), how far from a wire's line a press holds its end. Start: 0.5. Range: 0.4 to 0.75.
- **EndLength**: number, fraction of JackMinSize, how far along a wire from its jack's edge a press holds its end. Start: 1. Range: 0.75 to 1.5.

## Mechanics

### WIRE-01 Wire kinds

A wire is placed → its kind comes from the jack it leaves.

- From a worker's or a copier's output jack, or from the input terminal: a data wire, drawn solid.
- From a checking agent's plus or minus jack: a feedback wire, drawn dashed and marked with that jack's sign.
- Every wire ends at an agent's input jack or an output terminal.
- Wires are drawn over agent faces and terminals, and under each face's label plate: its name, rule, mark, PassLimit label and lamp. The band's silhouette and family name, [ART-09](../art-direction-objects.md#art-09-agent-faces), are drawn over wires too. Jacks are drawn over wires.
- The part of a wire under a label plate shows on the plate as a trace, under its text: [ART-08](../art-direction.md#art-08-wires). A wire that passes an agent never reads as one through it.
- A wire from an agent to its own input runs around that agent's face.
- Where two wires cross, the later one in the wire list shows a small hop: the opening wiring's wires first, as the order lists them, then each wire as it is placed or moved. Undo and reset restore that list.

### WIRE-02 Hold

The board is not locked ([BOARD-04](wiring-board.md#board-04-run-switch)), and the player presses an output jack and drags, or taps it → a wire is held from that jack.

- Lit marks blink on every agent's input jack and every output terminal: each takes a wire.
- A tap anywhere but an input jack, an output terminal or another output jack lets it go: no wire.

### WIRE-03 Plug

A held wire is dropped on an input jack or an output terminal, or the player taps one → the wire is placed there; plug sound.

- An output jack holds one wire: a wire it already holds is removed.
- An input jack or an output terminal takes any number of wires.
- Dropped anywhere else → no wire is placed.

### WIRE-04 Move

The player drags a placed wire by one of its ends to another jack of the same side, an input end to an input jack or an output terminal → that end moves there; plug sound.

- An end is held by a press within EndReach of the wire's line, up to EndLength from its jack's edge, or by a press on an input jack or output terminal where it ends. A dragged end is a held wire for edge pan: [BOARD-03](wiring-board.md#board-03-pan-and-zoom). Several ends there: the last in the wire list, [WIRE-01](#wire-01-wire-kinds).
- With no wire held, a tap on a wire's end does nothing.
- A press on an output jack itself always holds a new wire: [WIRE-02](#wire-02-hold).
- Output end onto an output jack: that jack's earlier wire is removed, as in [WIRE-03](#wire-03-plug).
- The wire's kind follows its new output jack: [WIRE-01](#wire-01-wire-kinds).
- Dropped on its own jack, or on a jack of the other side: the end goes back, and nothing changes.
- A press in reach of both ends of one wire: the nearer end.

### WIRE-05 Cut

The player drags a placed wire by one of its ends and drops it on no jack → the wire is removed; unplug sound.

### WIRE-06 Undo

The player taps undo → the last plug, move, cut or reset is reversed.

- Undo goes back as far as the order's opening wiring, and no further.

### WIRE-07 Reset

The player taps reset → the wiring returns to the order's opening wiring, the `opening` of its data, never a kept wiring: [BOARD-01](wiring-board.md#board-01-open).

## Edge cases

- A wire that closes a loop, its own agent's input included: placed as any other; the run ends it: [AGENT-05](agents.md#agent-05-pass-limit), [RUN-06](run.md#run-06-end).
- Two wires into one input jack: items queue there: [RUN-02](run.md#run-02-beat).
- Undo at the opening wiring: nothing changes: [WIRE-06](#wire-06-undo).
- A press while the board is locked: no wire: [WIRE-02](#wire-02-hold).
- **Derived:** a wiring with no wires is a valid wiring; its run stops every item at the input terminal: [RUN-04](run.md#run-04-stop).

## Links

- Jacks: [Agents](agents.md#agent-01-face).
- The board the wires sit on: [Wiring board](wiring-board.md).
