# Feel, campaign

Design status: Defined.

Part of [Feel](feel.md#campaign): the steps from a run's report to the next order, and the opening misfire.

## Goal

The end of a run is paper, not fanfare: the report prints, the board unlocks, the next order opens. The opening misfire plays in the room first: GP-2. Nothing shakes: GP-3.
Wire steps: [Feel](feel.md). Run steps: [Feel, run](feel-run.md).

## Parameters

Owned elsewhere: [PrintLineTime](board/reports.md#parameters), [OpeningGuard](campaign/campaign.md#parameters), [JackMinSize](board/wiring-board.md#parameters), [ViewMoveTime](board/run-view.md#parameters).
Values used below from the other Feel pages, such as [SwitchThrowTime](feel-run.md#parameters), [LampRiseTime](feel-run.md#parameters), [LampFallTime](feel-run.md#parameters), [RingTime](feel.md#parameters) and [PopTime](feel.md#parameters): [Feel, run](feel-run.md#parameters), [Feel](feel.md#parameters).

- **PaperFeedTime**: number, seconds the paper takes to feed up from the window's bottom edge. Start: 0.3. Range: 0.15 to 0.5.
- **TearTime**: number, seconds a closed printout takes to tear away. Start: 0.25. Range: 0.15 to 0.4.
- **ScrollBackTime**: number, seconds a printout taller than its room takes to move back to its top once whole. Start: 0.4. Range: 0.25 to 0.7.
- **DoubleStrikeGap**: number, seconds between the two strikes of a click in a double-strike line. Start: 0.03. Range: 0.02 to 0.04.
- **BellLead**: number, seconds from the bell's start to the line after it. Start: 0.4. Range: 0.2 to 0.8.
- **AlarmToneTime**: number, seconds the alarm tone sounds. Start: 1.0. Range: 0.6 to 1.6.
- **AlarmSilenceTime**: number, seconds of silence after the tone, before the report prints. Start: 0.8. Range: 0.5 to 1.5.
- **RoomLight**: number, fraction of light the board keeps in the room dim. Start: 0.45. Range: 0.3 to 0.5.
- **RoomDimTime**: number, seconds one ramp of the room dim takes, down or back. Start: 0.2. Range: 0.15 to 0.25.
- **ItemLeaveTime**: number, seconds the items take to leave the board. Start: 0.5. Range: 0.2 to 1.0.
- **OpenStagger**: number, seconds between two columns appearing. Start: 0.08. Range: 0.04 to 0.15.
- **OpenSettleTime**: number, seconds the camera takes to settle to its framing. Start: 0.5. Range: 0.3 to 0.9.
- **OpenZoomFrom**: number, fraction of the framed zoom the camera starts at. Start: 0.92. Range: 0.85 to 0.98.
- **OpenPanFrom**: number, fraction of the window's length along the flow that the camera starts off its framing, against the flow. Start: 0.08. Range: 0.04 to 0.15.
- **StandbyLight**: number, fraction of light the console keeps in standby. Start: 0.25. Range: 0.1 to 0.4.
- **WakeTime**: number, seconds the console takes to light from the first tap. Start: 0.25. Range: 0.2 to 0.3.
- **SelfThrowDelay**: number, seconds from the first tap to the run switch throwing itself. Start: 0.4. Range: 0.4 to 0.45.

## Mechanics

### FEEL-09 Report prints

[REPORT-04](board/reports.md#report-04-print) prints a report, and [CAMPAIGN-06](campaign/campaign.md#campaign-06-after-the-report) the lines after it → anticipation: every result stands with its sign. The paper feeds up from the window's bottom edge over PaperFeedTime. Impact: lines print in order, one each PrintLineTime. Follow-through: on a win, each par lamp and the second-wiring lamp not yet lit light as their lines print. A lamp already lit stays lit, with no ring or sound. When a commendation prints, the bell rings as [CAMPAIGN-06](campaign/campaign.md#campaign-06-after-the-report) says, and printing waits BellLead. Once the last line has printed, a printout taller than its room moves back to its top over ScrollBackTime: [REPORT-04](board/reports.md#report-04-print). The move is eased out: fast at the start, slow at the end, with no rebound.

- The paper shows nothing below the window's bottom edge as it feeds, so it never crosses the control bar.
- A report that prints at once, filed or on a tap, stands whole at its top: [REPORT-04](board/reports.md#report-04-print). Its sound: [ART-23](art-direction-sound.md#art-23-teletype). Its lamps stand lit. A commendation's bell rings at once. No PaperFeedTime, PrintLineTime, BellLead or ScrollBackTime wait.
- Input is live: [FEEL-17](feel.md#feel-17-input-during-motion). No tap waits for the move.
- Double-strike lines: [ART-12](art-direction-objects.md#art-12-teletype-paper) lists them.
- Timing: PaperFeedTime, [PrintLineTime](board/reports.md#parameters), DoubleStrikeGap, [LampRiseTime](feel-run.md#parameters), [RingTime](feel.md#parameters), [RingGrow](feel.md#parameters), BellLead, ScrollBackTime.
- Sound cue: teletype, [ART-23](art-direction-sound.md#art-23-teletype), each line; working, [ART-19](art-direction-sound.md#art-19-working), at each lamp; bell, [ART-24](art-direction-sound.md#art-24-bell). The move back is silent. Camera: none.

### FEEL-10 Full alarm and incident report

[VIEW-04](board/run-view.md#view-04-full-alarm) sounds the full alarm → anticipation: the view has reached the last framing of [VIEW-02](board/run-view.md#view-02-follow); the room holds still. Impact: the master alarm lamp lights, its rings standing, and the tone sounds over AlarmToneTime. Follow-through: silence for AlarmSilenceTime; in it the board dims to RoomLight over RoomDimTime, holds, and the light returns over RoomDimTime. The lamp stays lit. Then the report prints as in [FEEL-09](#feel-09-report-prints).

- A tap during the alarm ends the tone and the dim at once; the report then prints as [FEEL-09](#feel-09-report-prints)'s at-once report, as [VIEW-04](board/run-view.md#view-04-full-alarm) says.
- The room dim skips the alarm lamp, the output terminals with their items, and stopped and lost items: [FEEL-08](feel-run.md#feel-08-item-stops-or-is-lost).
- A queued arrival or stop tone not yet started when the alarm starts does not sound.
- **Derived:** RoomDimTime's greatest value is at most half of AlarmSilenceTime's least. The dim and the return fit inside the silence.
- Timing: AlarmToneTime, AlarmSilenceTime, RoomLight, RoomDimTime, [LampRiseTime](feel-run.md#parameters).
- Sound cue: alarm tone, [ART-22](art-direction-sound.md#art-22-alarm-tone), then silence, then the teletype of FEEL-09. Camera: none; nothing shakes.

### FEEL-16 Report closes

[VIEW-05](board/run-view.md#view-05-return) returns the board → anticipation: the printout stands whole. Impact: it tears away over TearTime, and the run switch toggle returns over [SwitchThrowTime](feel-run.md#parameters); the returned toggle is the unlock's one motion. At the close the control bar's plates change back, with no motion, as [Board controls](ui/board.md#controls) says. With the tear, the view starts its move to the order's opening framing, [BOARD-01](board/wiring-board.md#board-01-open). The move frames the board; it is no unlock cue. Follow-through: items fade out where they stand over ItemLeaveTime, and the lamps fall over [LampFallTime](feel-run.md#parameters).

- Input is live: [FEEL-17](feel.md#feel-17-input-during-motion).
- Timing: TearTime, SwitchThrowTime, ItemLeaveTime, LampFallTime, [ViewMoveTime](board/run-view.md#parameters).
- Sound cue: run switch, [ART-21](art-direction-sound.md#art-21-run-switch): the thunk as the toggle starts to return, the click at its seat. Camera: the move of VIEW-05, one move of ViewMoveTime, starting with the tear.

### FEEL-11 Order opens

[BOARD-01](board/wiring-board.md#board-01-open) opens an order → anticipation: the camera starts at OpenZoomFrom of its framed zoom. Where that would show a jack below [JackMinSize](board/wiring-board.md#parameters), it starts at its framed zoom, OpenPanFrom of the window off its framing, against the flow. Impact: the frame, the run switch and the alarm lamp show at once. The columns follow in flow order, OpenStagger apart. The input terminal with its wire and the items come first. Each agent column follows with its outgoing wires. The output terminals come last. Follow-through: the camera settles to its framing over OpenSettleTime, starting with the first column.

- The lamps are as [BOARD-01](board/wiring-board.md#board-01-open) and [AGENT-01](board/agents.md#agent-01-face) say.
- Input is live: [FEEL-17](feel.md#feel-17-input-during-motion).
- Timing: OpenZoomFrom, OpenPanFrom, OpenSettleTime, OpenStagger.
- Sound cue: none. Camera: settle, as stated.

### FEEL-12 Opening misfire

[CAMPAIGN-01](campaign/campaign.md#campaign-01-opening-misfire) opens the campaign → anticipation: the console waits at StandbyLight, with a ring blinking on the run switch: [ART-15](art-direction.md#art-15-rings). The AUDIO switch works in standby, so the standby dim leaves it and that ring undimmed. Impact: the first tap lights the console over WakeTime. It stands lit before the run switch throws itself SelfThrowDelay after the first tap. The night staff's wiring runs. Follow-through: the alarm and report of [FEEL-10](#feel-10-full-alarm-and-incident-report).

- Input and the opening guard: [CAMPAIGN-01](campaign/campaign.md#campaign-01-opening-misfire), [FEEL-17](feel.md#feel-17-input-during-motion).
- **Derived:** counted from the first tap, WakeTime's greatest is below SelfThrowDelay's least. SelfThrowDelay's greatest is below [OpeningGuard](campaign/campaign.md#parameters)'s least. The throw falls inside the guard, so no tap skips a run not yet started.
- Timing: StandbyLight, [LitBlinkTime](feel.md#parameters), WakeTime, SelfThrowDelay.
- Sound cue: those of [FEEL-04](feel-run.md#feel-04-run-starts) and FEEL-10, as [ART-17](art-direction-sound.md#art-17-sound-palette) says. Camera: none; [VIEW-02](board/run-view.md#view-02-follow) moves the view.

### FEEL-13 Memo, debrief and save printouts

[CAMPAIGN-03](campaign/campaign.md#campaign-03-act-start) prints a memo, [CAMPAIGN-04](campaign/campaign.md#campaign-04-act-end) a debrief, [SAVE-02](platform/saving.md#save-02-copy-out) a save code, or [SAVE-03](platform/saving.md#save-03-paste-in) reads one → anticipation: the paper feeds up from the window's bottom edge, as in [FEEL-09](#feel-09-report-prints). Impact: lines print as in [FEEL-09](#feel-09-report-prints), in double strike where [ART-12](art-direction-objects.md#art-12-teletype-paper) says. A memo's stamp pops in as its family name prints, over PopTime. Follow-through: the commendations after SAVE CODE READ ring the bell as in FEEL-09. A closed printout tears away over TearTime. A printout taller than its room moves back to its top once whole, as in FEEL-09.

- The paper lies over the screen as the trigger leaves it.
- A memo that prints at once stands whole with its stamp: [FEEL-09](#feel-09-report-prints).
- A closed memo is followed by the order opening: [FEEL-11](#feel-11-order-opens).
- Timing: PaperFeedTime, [PrintLineTime](board/reports.md#parameters), DoubleStrikeGap, [PopTime](feel.md#parameters), [Rebound](feel.md#parameters), BellLead, ScrollBackTime, TearTime.
- Sound cue: teletype, [ART-23](art-direction-sound.md#art-23-teletype), each line; bell, [ART-24](art-direction-sound.md#art-24-bell). Camera: none.

## Links

- Look: [Art direction](art-direction.md). The content inventory and screens, written later, link here.
