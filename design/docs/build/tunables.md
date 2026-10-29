# Tunables

Parameters and data fields with a tuning range, by system. Values and ranges: the linked owner.

## Wires

- [EndReach](../board/wires.md#parameters): a press farther from a wire's line still holds its end.
- [EndLength](../board/wires.md#parameters): a press farther along a wire from its jack still holds its end; the two ends of a short wire overlap more.

## Wiring board

- [JackMinSize](../board/wiring-board.md#parameters): jacks are bigger at the smallest zoom; the board zooms out less.
- [JackMaxSize](../board/wiring-board.md#parameters): jacks grow bigger at the closest zoom; the board zooms in further.
- [EdgePanZone](../board/wiring-board.md#parameters): a held wire starts panning the board farther from the window edge.
- [EdgePanSpeed](../board/wiring-board.md#parameters): the board pans faster while a held wire is near the edge.
- [BoardMargin](../board/wiring-board.md#parameters): more empty board shows round the order when it opens and where a pan stops.

## Agents

- [PassLimit](../board/agents.md#parameters): a checking agent checks each item more times before it rejects it.

## Run

- [RunLimit](../board/run.md#parameters): a looping run goes on for more beats before its items are lost.

## Reports

- [ItemLinesMax](../board/reports.md#parameters): each item's path prints more lines before the report cuts it.
- [PrintLineTime](../board/reports.md#parameters): the teletype prints each report line slower, its clicks spread wider.
- [ItemBlocksMax](../board/reports.md#parameters): a report shows more items before it replaces the rest with a summary line.

## Run view

- [BeatTime](../board/run-view.md#parameters): each beat takes longer; items glide slower along their wires.
- [FastFactor](../board/run-view.md#parameters): fast-forward plays faster; view moves and holds shorten with it.
- [AutoFastBeat](../board/run-view.md#parameters): a long run plays more beats at normal speed before it speeds up alone.
- [ViewMoveTime](../board/run-view.md#parameters): each move of the view takes longer.
- [ViewHold](../board/run-view.md#parameters): the view stays longer on an item at its end before following the next.
- [ViewMargin](../board/run-view.md#parameters): the view moves earlier, while the followed item is still farther from the edge.

## Orders

- [BatchItems](../orders/orders.md#parameters): each order's batch holds more items.
- [UnneededAgents](../orders/orders.md#parameters): orders offer more agents that a win does not need.

## Repair orders

- [MovePar](../orders/repair-orders.md#parameters): a repair order opens farther from its fix; its par allows more moves.

## Campaign

- [OpeningGuard](../campaign/campaign.md#parameters): taps after the first tap do nothing for longer; the opening misfire skips later.

## Report sharing

- [QRSize](../campaign/report-sharing.md#parameters): the shared picture's QR code prints larger.

## Offline play

- [FirstLoadMax](../platform/offline-play.md#parameters): the first load may download more; the wait on LOADING lasts longer.

## Product measures

- [SendWait](../product/measures.md#parameters): an event waits longer for its request before staying queued; the player sees nothing.

## Art direction

- [OutlineWeight](../art-direction.md#parameters): shape outlines, window rules, sign strokes and alarm rings draw thicker.
- [WireWidth](../art-direction.md#parameters): wires draw wider, with a thicker coloured core.
- [WireEdge](../art-direction.md#parameters): the Ink edge on wires, arrows and rings draws thicker.
- [DashLength](../art-direction.md#parameters): the dashes of feedback wires draw longer.
- [DashGap](../art-direction.md#parameters): the gaps between feedback wire dashes draw longer.
- [HopRadius](../art-direction.md#parameters): crossing hops on wires arch wider.
- [LampSize](../art-direction.md#parameters): lamp lenses draw larger.
- [AlarmLampSize](../art-direction.md#parameters): the master alarm lamp draws larger.
- [SignDiscSize](../art-direction.md#parameters): the sign disc on a feedback wire draws larger.
- [SignSpan](../art-direction.md#parameters): each plus and minus sign's strokes reach nearer the edge of its disc or lamp.
- [ArrowSize](../art-direction.md#parameters): the arrow on each wire draws longer and wider.
- [TraceWidth](../art-direction.md#parameters): a wire's trace on a label plate draws wider.
- [TraceLight](../art-direction.md#parameters): a wire's trace on a label plate draws lighter, closer to the plate.

## Art direction, objects

- [MarkTileSize](../art-direction-objects.md#parameters): mark tiles draw larger on faces and items.
- [MarkCodeWidth](../art-direction-objects.md#parameters): the codes on mark tiles draw larger inside the tile.
- [PaperColumns](../art-direction-objects.md#parameters): printed lines hold more characters before they wrap; the paper strip is wider.
- [DoubleStrikeOffset](../art-direction-objects.md#parameters): the second strike of a double-strike line sits farther right.

## Art direction, sound

- [LevelQuiet](../art-direction-sound.md#parameters): plug, unplug, working and teletype sounds play louder.
- [LevelMid](../art-direction-sound.md#parameters): verdict, run switch and bell sounds play louder.
- [LevelLoud](../art-direction-sound.md#parameters): the alarm tone plays louder.
- [ClickMaxTime](../art-direction-sound.md#parameters): clicks, clacks and thunks can ring longer.
- [VerdictToneTime](../art-direction-sound.md#parameters): plus and minus tones last longer.
- [PlusPitch](../art-direction-sound.md#parameters): the plus tone sounds higher.
- [MinusPitch](../art-direction-sound.md#parameters): the minus tone sounds higher.
- [UnplugPitch](../art-direction-sound.md#parameters): the unplug clack starts higher.
- [UnplugDrop](../art-direction-sound.md#parameters): the unplug clack falls farther in pitch.
- [AlarmPitch](../art-direction-sound.md#parameters): the alarm tone sounds higher.
- [AlarmBeat](../art-direction-sound.md#parameters): the alarm tone beats faster.
- [LineStrikes](../art-direction-sound.md#parameters): a printed line sounds more key clicks.
- [BellPitch](../art-direction-sound.md#parameters): the bell rings higher.
- [BellTime](../art-direction-sound.md#parameters): the bell rings out longer.

## Feel

- [SettleTime](../feel.md#parameters): dips, lifts and settles take longer to come to rest.
- [JackDip](../feel.md#parameters): a jack plate or a terminal's panel sinks deeper when a wire seats or leaves.
- [Rebound](../feel.md#parameters): dips and lifts return farther past rest, a bigger bounce.
- [RingTime](../feel.md#parameters): seat, pulse, lamp and par rings take longer to grow and fade.
- [RingGrow](../feel.md#parameters): those rings grow farther past the rim of their part.
- [PopTime](../feel.md#parameters): sign discs, mark tiles and memo stamps take longer to pop in.
- [LitStagger](../feel.md#parameters): the rings for a held wire start blinking with a longer gap between them.
- [LitBlinkTime](../feel.md#parameters): each blink of those rings lasts longer, so blinking slows.
- [CutRetractTime](../feel.md#parameters): a wire retracts, or draws out, slower.

## Feel, run

- [ItemBump](../feel-run.md#parameters): items rise higher in a lift and sink deeper in a settle.
- [SwitchThrowTime](../feel-run.md#parameters): the run switch toggle throws and returns slower; thunk and click sound farther apart.
- [GlideEase](../feel-run.md#parameters): item glides start and stop more softly.
- [LampRiseTime](../feel-run.md#parameters): lamps light more slowly.
- [LampFallTime](../feel-run.md#parameters): lamps go off more slowly.
- [KindSwapTime](../feel-run.md#parameters): an item's old body takes longer to swap for the new.
- [DashMarchSpeed](../feel-run.md#parameters): the dashes on feedback wires march faster along the flow.
- [ArrivalStagger](../feel-run.md#parameters): arrival and stop tones sound farther apart.
- [DiffRingTime](../feel-run.md#parameters): the first-difference ring on a result takes longer to grow and fade.
- [StopLight](../feel-run.md#parameters): stopped and lost items stay brighter.
- [StopDimTime](../feel-run.md#parameters): stopped and lost items dim more slowly.
- [FastSoundMin](../feel-run.md#parameters): in fast-forward, sounds and gaps shorten less.

## Feel, campaign

- [PaperFeedTime](../feel-campaign.md#parameters): paper feeds up from the window's bottom edge more slowly.
- [TearTime](../feel-campaign.md#parameters): a closed printout tears away more slowly.
- [ScrollBackTime](../feel-campaign.md#parameters): a tall printout moves back to its top more slowly once whole.
- [DoubleStrikeGap](../feel-campaign.md#parameters): the strikes of a double-strike click sound farther apart.
- [BellLead](../feel-campaign.md#parameters): printing waits longer after the bell before the next line.
- [AlarmToneTime](../feel-campaign.md#parameters): the alarm tone sounds longer.
- [AlarmSilenceTime](../feel-campaign.md#parameters): the silence after the alarm tone lasts longer before the report prints.
- [RoomLight](../feel-campaign.md#parameters): the room dims less in the silence; the board stays brighter.
- [RoomDimTime](../feel-campaign.md#parameters): the room dim ramps down and back more slowly.
- [ItemLeaveTime](../feel-campaign.md#parameters): items fade from the board more slowly after the report closes.
- [OpenStagger](../feel-campaign.md#parameters): columns appear farther apart as an order opens.
- [OpenSettleTime](../feel-campaign.md#parameters): the camera settles to its framing more slowly when an order opens.
- [OpenZoomFrom](../feel-campaign.md#parameters): the opening camera starts closer to its framed zoom, so it moves less.
- [OpenPanFrom](../feel-campaign.md#parameters): on wide orders, the opening camera starts farther off its framing, against the flow.
- [StandbyLight](../feel-campaign.md#parameters): the console stays brighter in standby before the first tap.
- [WakeTime](../feel-campaign.md#parameters): the console lights more slowly after the first tap.
- [SelfThrowDelay](../feel-campaign.md#parameters): the run switch throws itself later after the first tap.
