# Feel

Design status: Defined.

## Goal

The game moves like a plain machine room: relays, lamps and paper answer each action, then the screen follows. Nothing shakes. A rebound is one return past rest, never repeated: GP-3. A wrong run is held breath, then paper: GP-2. Motion never varies by chance: GP-1.
The flight director stays calm; the room does the reacting: [Fantasy](vision.md#fantasy).
This page holds the wire steps. Run steps: [Feel, run](feel-run.md). Report, alarm, opening and printout steps: [Feel, campaign](feel-campaign.md).

## Parameters

Values the other Feel pages use too are linked from them.

- **SettleTime**: number, seconds a part takes to move into place and rest (a dip, a lift, a settle). Start: 0.14. Range: 0.08 to 0.25.
- **JackDip**: number, fraction of a jack's plate a plate or a panel sinks. Start: 0.12. Range: 0.05 to 0.2.
- **Rebound**: number, fraction of a move, the one return past rest. Start: 0.25. Range: 0.1 to 0.4.
- **RingTime**: number, seconds a seat, pulse, lamp or par ring takes to grow and fade. Start: 0.3. Range: 0.15 to 0.3.
- **RingGrow**: number, fraction of the ringed part's width a ring grows past its rim. Start: 0.5. Range: 0.3 to 0.8.
- **PopTime**: number, seconds a sign disc, a mark tile or a memo stamp takes to pop in. Start: 0.16. Range: 0.1 to 0.3.
- **LitStagger**: number, seconds between the first blinks of two rings. Start: 0.04. Range: 0.02 to 0.08.
- **LitBlinkTime**: number, seconds of one ring blink. Start: 0.8. Range: 0.5 to 1.2.
- **CutRetractTime**: number, seconds a wire takes to retract or to draw out. Start: 0.15. Range: 0.1 to 0.3.

## Mechanics

### FEEL-01 Hold a wire

[WIRE-02](board/wires.md#wire-02-hold) holds a wire → anticipation: the jack plate dips and rebounds. Impact: the wire leaves it. Every jack and terminal that takes it shows its ring, as [ART-15](art-direction.md#art-15-rings) draws it, nearest the held jack first. Follow-through: the rings blink together; let go, and they go out at once.

- A dip sinks the plate JackDip and returns it past rest by Rebound, all within SettleTime. Every dip below is this one. A terminal's panel dips JackDip of its input jack's plate, not of its own size.
- Nearest: centre to centre of the jacks, a terminal by its input jack. Ties go in column order, then lane order, output terminals after the last column: [BOARD-02](board/wiring-board.md#board-02-orientation).
- A wire let go over no jack retracts as in [FEEL-03](#feel-03-cut-a-wire), with no sound. On touch, the rings keep their order from the held jack, not from the finger.
- Timing: JackDip, Rebound, SettleTime, LitStagger, LitBlinkTime, CutRetractTime.
- Sound cue: none. Camera: none.

### FEEL-02 Plug or move a wire

[WIRE-03](board/wires.md#wire-03-plug) plugs a wire, or [WIRE-04](board/wires.md#wire-04-move) moves one → anticipation: a held wire's rings blink, as in [FEEL-01](#feel-01-hold-a-wire). A dragged end rings the jacks and terminals WIRE-04 lets it take. The rings light nearest its own jack first, as in FEEL-01. Its wire stretches to it, as in [FEEL-03](#feel-03-cut-a-wire). Impact: the wire seats; the taking jack's plate, or the terminal's panel, dips, and a seat ring grows and fades. Follow-through: a feedback wire's sign disc pops in; any ring goes out.

- Timing: JackDip, Rebound, SettleTime, RingTime, RingGrow, PopTime.
- Sound cue: plug, [ART-18](art-direction-sound.md#art-18-plug-and-unplug), at the dip. Camera: none.

### FEEL-03 Cut a wire

[WIRE-05](board/wires.md#wire-05-cut) cuts a wire → anticipation: the wire stretches to the dragged end. Impact: dropped on no jack, it retracts to its output jack in CutRetractTime, whichever end was dragged. That plate dips. Follow-through: the rings go out at release. No seat ring and no mark is left.

- [WIRE-04](board/wires.md#wire-04-move) sends a dragged end dropped on its own jack, or on a jack of the other side, back. It returns to its jack as a cut wire retracts, with no sound, and nothing is removed.
- Timing: CutRetractTime, JackDip, Rebound, SettleTime.
- Sound cue: unplug, [ART-18](art-direction-sound.md#art-18-plug-and-unplug), at release. Camera: none.

### FEEL-14 Undo, reset or replaced wire

[WIRE-06](board/wires.md#wire-06-undo) undoes, [WIRE-07](board/wires.md#wire-07-reset) resets, or [WIRE-03](board/wires.md#wire-03-plug) or [WIRE-04](board/wires.md#wire-04-move) removes an output jack's earlier wire → anticipation: the wire to go stays in place. Impact: each wire removed retracts to its output jack as in [FEEL-03](#feel-03-cut-a-wire), and that plate dips. Follow-through: each wire restored draws out from its output jack in CutRetractTime and seats as in [FEEL-02](#feel-02-plug-or-move-a-wire).

- A reset moves only the wires it removes or restores; opening wires that stay do not move.
- An undone plug retracts its wire; an undone cut draws one out. An undone move or replace retracts the new wire, then draws out the earlier one.
- A replace retracts the old wire first. The new wire seats SettleTime after the old wire has gone.
- Sound cue: unplug at the retract, once however many wires go. Plug at the seat, once however many wires are restored. On a replace the unplug sounds first. A change with no wire to change makes no sound and no motion: [WIRE-06](board/wires.md#wire-06-undo).
- Input is live: [FEEL-17](#feel-17-input-during-motion).
- Timing: CutRetractTime, SettleTime, JackDip, Rebound.
- Camera: none.

### FEEL-17 Input during motion

The player taps, drags or flips a switch while motions play → input the rules allow is live from the tap. The action replaces a running motion of the same part, or one its own result voids; each jumps to its end state. Other motions play on. Then the action plays its own cues.

- A part is one drawn thing: a jack's plate, a terminal's panel, a wire, a ring, an item, a lamp, the toggle, the paper, the view.
- A press on a jack while another jack's dip runs: two plates, so both dips play. A press on the same jack again: its dip jumps to its end, then dips anew.
- RUN while a wire retracts: the retract plays on beside the toggle's throw. RUN while a wire draws out: the draw-out jumps to its end, as the run's items ride whole wires only.
- A touch while an order opens ends the opening whatever it lands on: its columns and the view jump to their end state, [FEEL-11](feel-campaign.md#feel-11-order-opens). The touch acts on what lay under it when it landed.
- A tap while a printout prints: the paper's motions and the lamps still to light jump to their end state, as [REPORT-04](board/reports.md#report-04-print) and [FEEL-09](feel-campaign.md#feel-09-report-prints) say.
- Input waits only for the run lock, [BOARD-04](board/wiring-board.md#board-04-run-switch), and the opening guard, [CAMPAIGN-01](campaign/campaign.md#campaign-01-opening-misfire). While a printout lies on the screen, a tap does what REPORT-04 says.
- A sound plays out as [ART-17](art-direction-sound.md#art-17-sound-palette) says.
- No step waits for a motion to end. The beats of a run follow [VIEW-03](board/run-view.md#view-03-fast-and-skip).
- Timing: none. Sound cue: none of its own. Camera: none.

## Run

Run steps FEEL-04 to FEEL-08 and FEEL-15: [Feel, run](feel-run.md).

## Campaign

Report, alarm, opening and printout steps FEEL-09 to FEEL-13 and FEEL-16: [Feel, campaign](feel-campaign.md).

## Links

- Look: [Art direction](art-direction.md). The content inventory and screens, written later, link here.
