# Run view

Design status: Defined.

## Goal

Run view: the run shown on the console, followed by the view, fast-forwarded or skipped, with lamps and the master alarm. Serves GP-2, GP-3.
Player decision: watch the run, speed it up, or skip to the report. Feedback: items gliding along wires, agent lamps, the run switch sound; before a hand-written result, the master alarm.
Flavour: the room holds its breath while the batch goes through.
Not owned here: what happens each beat, [RUN-02](run.md#run-02-beat); lamps, [AGENT-02](agents.md#agent-02-work) to [AGENT-06](agents.md#agent-06-idle).

## Inputs

- Each beat's moves and the run's end: [RUN-02](run.md#run-02-beat), [RUN-06](run.md#run-06-end).
- The report's lead: [REPORT-01](reports.md#report-01-form-and-lead).

## Outputs

- The report printed: [REPORT-04](reports.md#report-04-print).
- The board back to wiring: [BOARD-04](wiring-board.md#board-04-run-switch).

## Parameters

- **BeatTime**: number, seconds per beat at normal speed. Start: 1.0. Range: 0.6 to 1.6.
- **FastFactor**: number, times normal speed. Start: 4. Range: 2 to 8.
- **AutoFastBeat**: integer, beats. Start: 20. Range: 12 to 40.
- **ViewMoveTime**: number, seconds per view move, eased. Start: 0.6. Range: 0.4 to 1.5.
- **ViewHold**: number, seconds the view stays on an item that has reached its end. Start: 1.0. Range: 0.5 to 2.
- **ViewMargin**: number, CSS pixels from the window's edge. Start: 80. Range: 40 to 160.

## Mechanics

### VIEW-01 Play

The run starts → run switch sound; each beat plays in BeatTime.

- Each item glides along its wire in one beat, drawn as [ITEM-04](items.md#item-04-drawing) draws it.
- Each agent's lamp shows its state that beat.
- A rejected item moves straight from its checking agent to its output terminal, across the board, not along a wire.

### VIEW-07 Arrival

An item reaches an output terminal → on its result's body, the plus sign when it matches ([RUN-07](run.md#run-07-match)); else the minus sign; where it sits: [Board](../ui/board.md#layout). Its sound: [FEEL-07](../feel-run.md#feel-07-item-arrives).

### VIEW-02 Follow

A run plays → the view follows the batch's first item until it reaches its end, then the next item not yet at its end, in the item order of [REPORT-01](reports.md#report-01-form-and-lead).

- The view moves only when the item it follows comes within ViewMargin of a window edge with more of the board beyond it, or is out of the window. The board ends at its extent: [BOARD-01](wiring-board.md#board-01-open).
- Each move takes ViewMoveTime and ends with the item at the middle of the window, or with the board's end at the window's edge when that comes first: it is aimed where the item is when the move ends.
- After an item reaches its end, the view stays ViewHold before it follows the next.
- Every item at its end, items lost at RunLimit among them → after ViewHold, the view frames every output terminal and the master alarm lamp, each result under its required output, in one move: the last framing.
- The output terminals and the lamp too large for the window at JackMinSize ([BOARD-03](wiring-board.md#board-03-pan-and-zoom)) → the last framing is at that zoom, on the master alarm lamp and the first output terminal in lane order, its header bar in view. Where it sits: [Board](../ui/board.md#layout).

### VIEW-03 Fast and skip

The player taps fast-forward → beats play in BeatTime divided by FastFactor, and ViewMoveTime and ViewHold divide by it too; a second tap → normal speed. The player taps skip → every remaining beat resolves at once, and the view moves to the last framing of [VIEW-02](#view-02-follow) in one move of ViewMoveTime divided by FastFactor, with no hold.
- A speed change during a move or a hold scales what is left of it.

- A run still playing after AutoFastBeat beats plays fast on its own, once per run; a run already fast stays fast; a tap on fast-forward returns it to normal speed for the rest of the run.

### VIEW-04 Full alarm

The run has ended, and its incident report leads with a hand-written result not yet filed ([REPORT-01](reports.md#report-01-form-and-lead)) → the master alarm lamp lights, the alarm tone plays, then a moment of silence; then the report prints.

- The alarm starts once the view holds the last framing: [VIEW-02](#view-02-follow), [VIEW-03](#view-03-fast-and-skip).
- A tap during the alarm → the report prints at once.
- Any other run, a filed hand-written result included: the report prints at once.

### VIEW-05 Return

The player closes the report → items leave the board; lamps go off; the wiring stays as it was; the lock of [BOARD-04](wiring-board.md#board-04-run-switch) ends.

- The view moves to the order's opening framing, [BOARD-01](wiring-board.md#board-01-open), in one move of ViewMoveTime.

### VIEW-06 Hidden

The page is hidden mid-run → the run skips to its end, as [VIEW-03](#view-03-fast-and-skip) skips; the full alarm, if due, and the report wait until the page shows again.

## Edge cases

- A tap during the full alarm: [VIEW-04](#view-04-full-alarm).
- The first item stops at once: the view holds, then follows the next item not yet at its end: [VIEW-02](#view-02-follow).
- Every item stopped at the input terminal: no item moves; the view stays on the input terminal, then moves to the last framing: [VIEW-02](#view-02-follow), [RUN-04](run.md#run-04-stop).
- The page hidden mid-run: [VIEW-06](#view-06-hidden).
- The game closed mid-run: no report; the wiring is kept: [SAVE-01](../platform/saving.md#save-01-keep).
- **Derived:** a whole order in the window: the view stays still until the run's last item ends: [VIEW-02](#view-02-follow).

## Links

- Lamp and sound timing for each moment: [Feel](../feel.md).
- The run itself: [Run](run.md).
