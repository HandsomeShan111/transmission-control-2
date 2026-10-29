# Console reference

Every key, screen, lamp, score and limit in Transmission Control 2. The rules behind each item are in the design copy, `design/docs/`, by step id.

## The console

Every screen is one console: a strip on top, the window in the middle, and the control bar of keys.

- Strip: the screen's name. On the board: the order's number and name, its lamps, and its description.
- Window: the board, a list, or the title.
- Teletype: printouts lie over the window. Tap one to print it at once; tap again to close it. A long printout scrolls with a drag.

## Keys

Keys have fixed places, the same on every screen. A key a screen lacks leaves its place empty, so no key moves. In order:

1. AUDIO: the sound switch, with its lamp. On every screen but LOADING.
2. ORDERS: the order list.
3. MEDALS: COMMENDATIONS. Its second line counts medals earned over 18, as 3/18.
4. ARCHIVE: the incident archive. On the order list only.
5. The screen's first action: UNDO on the board, FAST while a run plays, SAVE CODE on the order list.
6. The screen's second action: RESET on the board, SKIP while a run plays, LOAD SAVE CODE on the order list.
7. RUN: the run switch, on the board.

States:

- Pressed: a key sinks while held.
- Held down: the key of the screen you are on, ORDERS on the order list, MEDALS on COMMENDATIONS. A press does nothing.
- Locked: while a run plays, ORDERS and MEDALS do nothing until the report closes.
- Under a printout: only AUDIO answers, by touch and by keyboard.

Layout: one line on a computer or tablet, down the right side or along the bottom. On a phone, two fixed rows. Key size: 67 by 48 on a phone, 90 by 62 on a tablet, 108 by 72 on desktop.

## Screens

- Title: TRANSMISSION CONTROL 2 and one plate, START for a new game, CONTINUE with progress kept. A double click counts as one press.
- Board: one order. Wire, run, read the report.
- Order list: every act and its orders. Each row: number and name, "Results n of 3", and the order's lamps. Locked orders do not show.
- Incident archive: per act, its medals, then each order's results and filed reports. Tap a report to print it again.
- COMMENDATIONS: per act, a wall of three medals. Earned ones in colour with their line; the rest dim, with their progress.

## The board

- INPUT: the tray holding the batch, the items the order sends, in order. Its OUT jack starts the wiring.
- Agents: each with its family (RECORDS, COMMS, GALLEY, WORKSHOP, AUDIT, DISPATCH), its name, its rule, and its mark, such as LA for laminated.
- Checks: agents that ask a question, such as "Is it paper?". A teal plus jack for yes, an orange minus jack for no. Each check shows its limit, such as "MAX 2 CHECKS PER ITEM": an item checked that many times by it is rejected in place of one more check, and stops there.
- Destinations: each with a row per required item, showing the kind and marks it must arrive with.
- Wires: solid from a worker's OUT, dashed from a check's plus or minus.
- Master alarm lamp: the ring above the destinations. It lights red when a run goes wrong.

## Wiring

- Plug: tap an output jack, then an input jack. Or drag from one to the other.
- An output jack holds one wire. An input jack takes any number.
- Move: drag a wire's end to another jack of the same side.
- Cut: drag a wire's end and drop it on no jack.
- UNDO: reverses the last plug, move, cut or reset. It keeps the newest 200 steps per order.
- RESET: returns the order to its opening wiring.
- Pan: drag on the board, or scroll. Zoom: pinch, or the scroll wheel with the control key held. Zoom out stops where the whole board fits.

## Runs

- RUN: throws the switch. The board locks, and items travel one beat at a time.
- FAST: plays the run faster. SKIP: jumps to its end.
- Every item delivered as ordered: a win. Anything else: the alarm, and the first wrong result row ringed.

## Printouts

- Mission report: a win. "delivered as ordered", each item's path, the score, then SHARE and NEXT.
- Incident report: a loss. Each item's path (on a repair order, the first item that went wrong), the hand-written result when one is found, "FILED: n of 3.", then SHARE.
- Memo: at the start of an act, its department and agents.
- Debrief: at the end of an act. The act's first hand-written result, each order's score, the act's commendations or the progress toward them, and the unlock line. The act 6 debrief ends "NO FURTHER ORDERS ON FILE."
- Save code: the first time an act's debrief closes, and on SAVE CODE.
- NEXT: on a won report when a next order exists. Never on a failed report or on order 30. Another run, or another order opened first, cancels it.

## Scores and lamps

- Wires: the number of wires in a winning wiring. "Wires 5, par 4."
- Time: the run's length in beats. "Time 8, par 8. Par met."
- Moves: repair orders only. The changes made to the overnight wiring; a change undone counts nothing. "Moves 2, par 2. Par met."
- WIRES lamp and TIME lamp: lit once that par is met. An order has a lamp only for a par it has.
- 2ND WIRING lamp: lit once two of the order's wins count as different wirings.
- Results n of 3: the hand-written results found, by wiring the order wrong.

## Commendations

Three per act, 18 in all:

- Results: every hand-written result of the act's orders found.
- Second wirings: every counting order of the act with its 2ND WIRING lamp lit.
- Par: every par of the act's orders met: wires, time and moves, in one run or several.

A new medal prints "COMMENDATION:", its name and its line on the teletype, after one bell.

## Sounds

Ten sounds, all silent with AUDIO off: plug, unplug, an agent working, a check's plus and minus, the run switch, the alarm, the teletype, the bell, and the key click. A key click plays on every real press. A key that cannot act at that moment stays silent.

## Saving

- Progress keeps in this browser's storage at once: orders won, best scores, lamps, filed reports, results found, medals, and acts begun and ended.
- A save code is one line of letters, digits, "-" and "_", with a check at its end. Reading one merges it into this browser's progress.
- A code holds at most 500 filed reports. A full campaign files about 121.
- A save from a newer version of the game is never written back by an older one.

## Offline play

- The first visit keeps every file of the game: about 96 KB compressed.
- Later visits open from those files, with or without a connection.
- Online, the game looks for a new version once per visit, and again when the connection comes back.
