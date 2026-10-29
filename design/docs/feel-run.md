# Feel, run

Design status: Defined.

Part of [Feel](feel.md#run): the steps from the run switch to the last stopped item, and fast-forward.

## Goal

The run is relays and lamps: the toggle throws, items glide, lamps answer, tones tell the verdicts. Nothing shakes: GP-3. Every cue shows what the wiring did, so the player can explain the result: GP-1.
Wire steps and shared values: [Feel](feel.md). Report and alarm steps: [Feel, campaign](feel-campaign.md).

## Parameters

Run timing is owned elsewhere: [BeatTime](board/run-view.md#parameters), [FastFactor](board/run-view.md#parameters).
Wire values used below, such as [SettleTime](feel.md#parameters), [Rebound](feel.md#parameters), [RingTime](feel.md#parameters), [RingGrow](feel.md#parameters) and [PopTime](feel.md#parameters): [Feel](feel.md#parameters).

- **ItemBump**: number, fraction of a body an item rises in a lift or sinks in a settle. Start: 0.12. Range: 0.05 to 0.25.
- **SwitchThrowTime**: number, seconds the toggle takes to throw or to return. Start: 0.12. Range: 0.08 to 0.2.
- **GlideEase**: number, 0 linear to 1 smooth, the easing of a glide. Start: 0.6. Range: 0 to 1.
- **LampRiseTime**: number, seconds a lamp takes to light. Start: 0.06. Range: 0.03 to 0.12.
- **LampFallTime**: number, seconds a lamp takes to go off. Start: 0.15. Range: 0.08 to 0.3.
- **KindSwapTime**: number, seconds an item's old body takes to swap for the new. Start: 0.2. Range: 0.1 to 0.3.
- **DashMarchSpeed**: number, board units per second the dashes march. Start: 60. Range: 30 to 120.
- **ArrivalStagger**: number, seconds between two tones of arrivals or stops. Start: 0.25. Range: 0.25 to 0.3.
- **DiffRingTime**: number, seconds a first-difference ring takes to grow and fade. Start: 0.3. Range: 0.15 to 0.5.
- **StopLight**: number, fraction of light a stopped or lost item keeps. Start: 0.6. Range: 0.55 to 0.8.
- **StopDimTime**: number, seconds a stopped or lost item takes to dim. Start: 0.5. Range: 0.2 to 1.0.
- **FastSoundMin**: number, seconds, the least length of a sound or a gap after fast-forward divides it. Start: 0.06. Range: 0.04 to 0.1.

## Mechanics

### FEEL-04 Run starts

[BOARD-04](board/wiring-board.md#board-04-run-switch) flips the run switch, and [VIEW-01](board/run-view.md#view-01-play) plays the first beat → anticipation: the toggle sits back. Impact: it throws over SwitchThrowTime and seats with a rebound; the thrown toggle is the lock's one motion. At the flip the control bar's plates change, with no motion, as [Board controls](ui/board.md#controls) says. Follow-through: the first item, if it moves, glides as VIEW-01 says, lifting from the input terminal as it starts.

- Every item lifts the same way, from the jack it leaves, as its glide starts. A lift raises it ItemBump of its body and returns it within SettleTime.
- Timing: SwitchThrowTime, [Rebound](feel.md#parameters), ItemBump, [SettleTime](feel.md#parameters), GlideEase.
- Sound cue: run switch, [ART-21](art-direction-sound.md#art-21-run-switch): the thunk as the toggle starts to move, the click at the seat. Camera: none; [VIEW-02](board/run-view.md#view-02-follow) moves the view.

### FEEL-05 Agent works

[AGENT-02](board/agents.md#agent-02-work) works an item, or [AGENT-04](board/agents.md#agent-04-copy) copies one → anticipation: the item waits at the input jack. Impact: the lamp lights steady with a ring, and the mark tile lands on the item. Follow-through: a kind change swaps the old body for the new, starting with the impact. A copy lifts from the copy jack: [FEEL-04](#feel-04-run-starts). The lamp falls when no item waits.

- The cues of the impact start together. Agents working in one beat sound one working sound.
- **Derived:** each cue time below has a range maximum at or below the least [BeatTime](board/run-view.md#parameters). One agent's cues end inside a beat.
- Timing: LampRiseTime, LampFallTime, [RingTime](feel.md#parameters), [RingGrow](feel.md#parameters), [PopTime](feel.md#parameters), [Rebound](feel.md#parameters), [SettleTime](feel.md#parameters), KindSwapTime, ItemBump.
- Sound cue: working, [ART-19](art-direction-sound.md#art-19-working), at the landing. Camera: none.

### FEEL-06 Check verdict

[AGENT-03](board/agents.md#agent-03-check) gives a verdict, or [AGENT-05](board/agents.md#agent-05-pass-limit) rejects an item → anticipation: the item waits at the input jack. Impact: the lamp lights in the verdict's colour with its sign and a ring. A rejected item takes the minus sign too: [ITEM-04](board/items.md#item-04-drawing). Follow-through: the dashes of the verdict's wire march along the flow while the item rides it. The dashes of the wire's trace on a label plate, [ART-08](art-direction.md#art-08-wires), march with them, in step. A rejected item moves as [VIEW-01](board/run-view.md#view-01-play) says.

- Verdicts of one sign in one beat sound one tone.
- Timing: LampRiseTime, [RingTime](feel.md#parameters), [RingGrow](feel.md#parameters), DashMarchSpeed, GlideEase.
- Sound cue: plus or minus, [ART-20](art-direction-sound.md#art-20-verdicts), at the lamp. Camera: none.

### FEEL-07 Item arrives

[VIEW-07](board/run-view.md#view-07-arrival) marks an arrival → anticipation: the item glides to its result slot. Impact: it settles into the slot, and the sign stamps on its body's corner, as [Board layout](ui/board.md#layout) places it. Follow-through: a result that [ITEM-04](board/items.md#item-04-drawing) rings draws its first-difference ring.

- Arrivals of one beat stamp in batch order, a copy right behind its original, as [RUN-02](board/run.md#run-02-beat) orders them.
- A settle sinks the item ItemBump and returns it as a dip does: [FEEL-01](feel.md#feel-01-hold-a-wire).
- Each arrival's tone sounds ArrivalStagger after the one before. The first sounds ArrivalStagger after the verdict tones that start as the item arrives, or at its stamp if none. Each beat's tones queue alone. Queued tones when the alarm starts: [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report).
- **Derived:** ArrivalStagger's least value is at least [VerdictToneTime](art-direction-sound.md#parameters)'s and [ClickMaxTime](art-direction-sound.md#parameters)'s greatest. No tone or stop clack cuts the one before it. A short beat lets the last tone sound past its end. The next beat's tone of that sign cuts it: [ART-17](art-direction-sound.md#art-17-sound-palette).
- Timing: [SettleTime](feel.md#parameters), ItemBump, [PopTime](feel.md#parameters), [Rebound](feel.md#parameters), DiffRingTime, ArrivalStagger.
- Sound cue: plus or minus, [ART-20](art-direction-sound.md#art-20-verdicts), each ArrivalStagger after the one before, as above. Each tone trails its stamp, except a first arrival with no verdict tone before it. Camera: none; [VIEW-02](board/run-view.md#view-02-follow) follows the items, then moves to the last framing.

### FEEL-08 Item stops or is lost

[RUN-04](board/run.md#run-04-stop) stops an item, or [RUN-06](board/run.md#run-06-end) loses items → anticipation: the item waits where it stands, at its jack for a stopped item: [RUN-04](board/run.md#run-04-stop). Impact: a stopped item's jack pulses once, and the item dims from its halt over StopDimTime. Lost items dim where they stand, from the run's end. Follow-through: each stays at StopLight until the report closes.

- Stops of one beat sound in batch order, ArrivalStagger apart. A stop of another beat sounds at its own halt.
- Text on a stopped item under this dim: [ART-14](art-direction.md#art-14-text-contrast).
- Timing: [RingTime](feel.md#parameters), [RingGrow](feel.md#parameters), StopLight, StopDimTime, ArrivalStagger.
- Sound cue: unplug, [ART-18](art-direction-sound.md#art-18-plug-and-unplug), once per stopped item, and once for all lost items. Camera: none.

### FEEL-15 Fast, skip and hidden page

[VIEW-03](board/run-view.md#view-03-fast-and-skip) fast-forwards or skips, or [VIEW-06](board/run-view.md#view-06-hidden) hides the page → anticipation: the run plays at normal length until the tap, the auto fast-forward ([AutoFastBeat](board/run-view.md#parameters)) or the hidden page. Impact: in fast-forward, every duration of [FEEL-04](#feel-04-run-starts) to [FEEL-08](#feel-08-item-stops-or-is-lost) divides by [FastFactor](board/run-view.md#parameters) and DashMarchSpeed multiplies by it, pitch kept. A sound or gap never divides below FastSoundMin; one already shorter keeps its length. Skip and a hidden page play no beat lamp, ring or tone: lamps and signs stand at their end state. Follow-through: the alarm and report of [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report), or the report of [FEEL-09](feel-campaign.md#feel-09-report-prints), as [VIEW-04](board/run-view.md#view-04-full-alarm) picks.

- **Derived:** ArrivalStagger, [VerdictToneTime](art-direction-sound.md#parameters) and [ClickMaxTime](art-direction-sound.md#parameters) all divide by FastFactor, with the same floor. A fast tone is cut by none before it.
- Timing: [FastFactor](board/run-view.md#parameters), FastSoundMin, DashMarchSpeed, and each duration of FEEL-04 to FEEL-08.
- Sound cue: those of FEEL-04 to FEEL-08, shortened; none in skip or while hidden. Camera: none; [VIEW-03](board/run-view.md#view-03-fast-and-skip) moves the view.

## Links

- Look: [Art direction](art-direction.md). The content inventory and screens, written later, link here.
