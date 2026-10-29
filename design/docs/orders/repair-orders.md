# Repair orders

Design status: Defined.

## Goal

Repair orders: later acts' orders that open already wired and already failing, scored by the moves of the fix. Serves GP-2, GP-4.
Player decision: which wrong wires to move or add, read from the opening run's report, knowing a fix can break another item. Feedback: the opening wiring on the board; the incident report of its first failing item; the moves line and its par lamp on a win.
Flavour: the night shift's workflow, left running and failing; the morning crew patches it before anyone upstairs notices.
Not owned here: the opening wiring on the board, [BOARD-01](../board/wiring-board.md#board-01-open); a repair order's incident report, [REPORT-06](../board/reports.md#report-06-repair-orders); which acts hold repair orders, [Orders](../system-map.md#orders).

## Inputs

- The order's opening wiring: [BOARD-01](../board/wiring-board.md#board-01-open).
- The wiring at the run switch and a won run: [WIRE-03](../board/wires.md#wire-03-plug), [RUN-08](../board/run.md#run-08-result).

## Outputs

- The moves line: [REPORT-01](../board/reports.md#report-01-form-and-lead).
- Fewest moves and the par met: [Campaign](../system-map.md#campaign), [Platform](../system-map.md#platform).

## Parameters

- **MovePar**: integer, moves. Start: 2. Range: 2 to 4. Set per repair order in its data, and confirmed by a search over its wirings.

## Mechanics

### REPAIR-01 Faults

A repair order's data is written → its opening wiring is MovePar moves from the nearest winning wiring known for it, and its run fails.

- At least one move of a fewest-move fix, made alone, makes an item fail that the opening wiring delivered.
- Known: found by a search over the order's wirings near the opening one, or by the designer when a search cannot cover the order.

### REPAIR-02 Moves

A repair order's run is won → its moves: the fewest moves that turn the opening wiring into the wiring run.

- Count: each opening wire missing from the wiring, and each wire in the wiring the opening lacks. A missing wire and a new wire that share one end make one move, moved; every other one is one move, cut or added. The pairs taken give the fewest moves.
- Moves made and then undone, reset or reversed by hand count nothing.

### REPAIR-03 Score

A repair order's run is won → the mission report prints "Moves <count>, par <MovePar>.", and " Par met." when the count is at or under MovePar.

- The order keeps its fewest moves over all its wins, and whether its par was ever met.
- The order shows one par lamp, lit once the par is met.

## Edge cases

- The opening wiring run unchanged: it fails, no score: [REPAIR-01](#repair-01-faults).
- A reset, then a run: the opening wiring again, 0 moves, and it fails: [REPAIR-02](#repair-02-moves), [WIRE-07](../board/wires.md#wire-07-reset).
- A win through a different wiring than the known fix: wins; its own moves count: [REPAIR-02](#repair-02-moves).
- **Derived:** one wiring gives one move count, however the player reached it: [REPAIR-02](#repair-02-moves).
- **Derived:** a fewest-move fix moves or adds wires, never cuts one: a wire no item travels changes nothing, and a jack with no wire stops its item: [REPAIR-02](#repair-02-moves), [RUN-04](../board/run.md#run-04-stop).
- **Derived:** a win under MovePar beats the known fix, and the order's best shows it: [REPAIR-03](#repair-03-score).

## Links

- Score of the other orders: [Par and score](../board/par-and-score.md).
- Its incident report: [REPORT-06](../board/reports.md#report-06-repair-orders).
