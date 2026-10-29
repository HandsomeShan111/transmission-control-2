# Run

Design status: Defined.

## Goal

Run: the batch flows through the wiring, beat by beat, with no chance; any wiring whose items all match wins. Serves GP-1, GP-4.
Player decision: when to run, and what a run tests: a wiring meant to win, or one wired wrong to read its report. Feedback: the run on the board, then its report.
Flavour: the count starts; every item goes where its wire sends it, and nothing in the room can stop it.
Not owned here: what each agent does, [Agents](agents.md); how the run looks, [Run view](run-view.md).

## Inputs

- Run switch flipped: [BOARD-04](wiring-board.md#board-04-run-switch).
- The wiring: [Wires](wires.md). The batch: [ITEM-01](items.md#item-01-enter).
- Agent work and verdicts: [AGENT-02](agents.md#agent-02-work) to [AGENT-05](agents.md#agent-05-pass-limit).

## Outputs

- Each beat's moves: [VIEW-01](run-view.md#view-01-play).
- Each item's end and match, the win, the run time: [REPORT-01](reports.md#report-01-form-and-lead), [PAR-02](par-and-score.md#par-02-score).

## Parameters

- **RunLimit**: integer, beats. Start: 99. Range: 60 to 200.

## Mechanics

### RUN-01 Start

The run starts → beat 0: every batch item waits at the input terminal ([ITEM-01](items.md#item-01-enter)); every check count is zero; run time is zero.

### RUN-02 Beat

Each beat, in this order:

1. Each agent with items waiting at its input jack works the first one, agents in column order, then lane order: [AGENT-02](agents.md#agent-02-work) to [AGENT-05](agents.md#agent-05-pass-limit). The item goes along the wire of the jack the agent sends it by.
2. The input terminal sends its first waiting item along its wire.
3. Each item arrives at its wire's far end that beat. Items arriving at one input jack in one beat join its queue in batch order; a copy right behind its original batch item, copies by copy number.
4. Run time goes up by one beat.

An item that arrives at an agent is worked the next beat at the earliest.

### RUN-03 Arrive

An item reaches an output terminal → it stays there, at its end.

### RUN-04 Stop

An item is sent by a jack with no wire → it stays at that jack, stopped, at its end.

- The input terminal with no wire: every item stays there, stopped, in the first beat.

### RUN-05 Reject

A checking agent rejects an item ([AGENT-05](agents.md#agent-05-pass-limit)) → the item goes, as it is, to the output terminal of its required output's destination, arriving that beat, rejected, at its end.

- An item with no required output stays at that checking agent, rejected, at its end.

### RUN-06 End

After a beat, no item waits at the input terminal or at an input jack → the run ends. A stopped item does not wait.

- RunLimit beats pass first → the run ends; every item not yet at its end is lost.

### RUN-07 Match

An item reaches its end → it matches when all hold:

- it arrived at the output terminal of its required output's destination, not rejected;
- its kind equals the required kind;
- its marks equal the required marks, in order, repeats included.

An item with no required output never matches.

### RUN-08 Result

The run ends → the order is won when every item on the board matches, and each copy the order names was made. Else it fails.

- Won → mission report; failed → incident report: [REPORT-01](reports.md#report-01-form-and-lead).

## Edge cases

- Two items reach one input jack in one beat: batch order: [RUN-02](#run-02-beat).
- A loop of data wires, with no checking agent: it runs until RunLimit; its items are lost: [RUN-06](#run-06-end).
- An item reaching the wrong output terminal: it stays there and fails: [RUN-03](#run-03-arrive), [RUN-07](#run-07-match).
- A copy the order does not name: it never matches, so the order fails: [RUN-07](#run-07-match), [RUN-08](#run-08-result).
- A copy the order names, not made, while every item matches: a guard only. In the order data each matching item with a named copy has passed the agent that copies it: [RUN-08](#run-08-result).
- **Derived:** one wiring gives one run, every time: nothing in [RUN-02](#run-02-beat) depends on anything but the wiring and the batch.
- **Derived:** a loop costs run time, as its items queue at the agents it shares; a chain of more agents runs them side by side: [RUN-02](#run-02-beat).

## Links

- The run as the player watches it: [Run view](run-view.md).
- What a run's end prints: [Reports](reports.md).
