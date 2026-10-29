# Board

Design status: Defined.

## Goal

The player reads an order, wires its agents and runs it, then reads the printout. Reached from: a tap on an order, [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list); a new game, [CAMPAIGN-01](../campaign/campaign.md#campaign-01-opening-misfire); a closed memo, [CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start).

## Shows

- The order's number, name and text: [ORDER-01](../orders/orders.md#order-01-text), the order's `text` in [Orders data](../data.md#orders).
- Its par lamps, labelled WIRES, TIME or MOVES: [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score). Its second-wiring lamp, labelled 2ND WIRING, on an order that has one: [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list).
- The wiring board: [BOARD-01](../board/wiring-board.md#board-01-open), faces ([AGENT-01](../board/agents.md#agent-01-face)), wires ([WIRE-01](../board/wires.md#wire-01-wire-kinds)), items and results ([ITEM-04](../board/items.md#item-04-drawing)), the master alarm lamp ([ART-06](../art-direction.md#art-06-master-alarm)).
- The standby of the opening misfire: [FEEL-12](../feel-campaign.md#feel-12-opening-misfire).
- Printouts: the report and the lines after it, [REPORT-04](../board/reports.md#report-04-print), [CAMPAIGN-06](../campaign/campaign.md#campaign-06-after-the-report); a memo, a debrief and a save code, [CAMPAIGN-03](../campaign/campaign.md#campaign-03-act-start), [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end), [SAVE-02](../platform/saving.md#save-02-copy-out); share lines and the picture view, [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture); the cannot-store line, [OFFLINE-01](../platform/offline-play.md#offline-01-first-load).

## Controls

- ORDERS → the order list: [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list). Disabled while the board is locked: [BOARD-04](../board/wiring-board.md#board-04-run-switch).
- UNDO → [WIRE-06](../board/wires.md#wire-06-undo). RESET → [WIRE-07](../board/wires.md#wire-07-reset). While the board is locked, FAST and SKIP stand in their places: [VIEW-03](../board/run-view.md#view-03-fast-and-skip).
- AUDIO → [SETTING-01](../platform/settings.md#setting-01-sound).
- RUN → [BOARD-04](../board/wiring-board.md#board-04-run-switch).
- On the board: hold, plug, move, cut, pan and zoom, [WIRE-02](../board/wires.md#wire-02-hold) to [WIRE-05](../board/wires.md#wire-05-cut), [BOARD-03](../board/wiring-board.md#board-03-pan-and-zoom).
- On a printout: a tap, [REPORT-04](../board/reports.md#report-04-print); SHARE, then TEXT or PICTURE, [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture); COPY, [SAVE-02](../platform/saving.md#save-02-copy-out).
- In the opening misfire, a tap on any control but AUDIO does what [CAMPAIGN-01](../campaign/campaign.md#campaign-01-opening-misfire) says.

## Layout

Values at the smallest and the largest screen of the vision's [Platform](../vision.md#platform), as [UI style](style.md#style) scales them.

Frame: [Console frame](style.md#console-frame). The board's framing, edge pan and view margins measure to the window's edges: [BOARD-01](../board/wiring-board.md#board-01-open), [BOARD-03](../board/wiring-board.md#board-03-pan-and-zoom), [VIEW-02](../board/run-view.md#view-02-follow).

- Order bar, first line: "<number> <name>" in TextSize. Second line: the lamps, par lamps first, then 2ND WIRING, wrapping at a lamp where the bar is too narrow. Shared part: [Lamp](style.md#lamp).
- Order bar, below: the order text in TextSize, wrapping at spaces. Its lines stack PlateGap inside the bar's edges.
- Control bar, from its start: ORDERS, UNDO or FAST, RESET or SKIP, AUDIO, RUN. Shared parts: [Plate](style.md#plate), [Switch](style.md#switch).
- Window: the board, on its Ink ground, inside the frame's Orange rule. Printouts lie over it: [Printout](style.md#printout).
- Last framing at JackMinSize, [VIEW-02](../board/run-view.md#view-02-follow): across the flow, the window's edge on the alarm lamp's side just clears its lit rings. Along it, the centre of the first output terminal's input jack sits ViewMargin inside the window's upstream edge. Where that puts the lamp's lit rings or the terminal's far edge past the window, the jack moves nearer that edge, never past it.
- **Derived:** the five controls fit a 360 short side in both orientations at the start values, and the order bar holds the name, the lamps and the longest order text in [Orders data](../data.md#orders).

Board, in board units: [Art direction parameters](../art-direction.md#parameters). "Along" and "across" are the flow's, as [BOARD-02](../board/wiring-board.md#board-02-orientation) turns it. Faces and terminals stay upright, so their "wide" and "high" are the screen's.

- Face: 128 wide, 118 high. From the top: the band, 24 high, its silhouette 18 wide at its start, the family name 11 high after it; the name, 14 high; the rule, 11 high, two lines at most; the bottom row, 40 high, with the lamp, the mark tile and the PassLimit label. Text sits 8 from the face's edges and clear of its jacks. [ART-09](../art-direction-objects.md#art-09-agent-faces).
- The face's label plate, drawn over wires ([WIRE-01](../board/wires.md#wire-01-wire-kinds)): everything below the band.
- Jacks on faces: in landscape, centred on the edge; in portrait, outside it by half of JackMinSize and 3 more, clear of the band. Two output jacks stand 6 apart, edge to edge, centred on the edge.
- Jacks on terminals: outside the edge by half of JackMinSize and 3 more, in both orientations, clear of every slot and result row.
- ColumnGap, along the flow, centre to centre of two facing jacks: twice [JackMinSize](../board/wiring-board.md#parameters), twice [ArrowSize](../art-direction.md#parameters), and 16: 128 at the start values.
- LaneGap, across the flow, between two faces: 30 in landscape, 44 in portrait.
- Input terminal: at the flow's start, centred across the lanes, 100 wide. A header bar 32 high, then one item slot per batch item, 44 square, 4 apart, in batch order down the panel. Its output jack sits at the middle of its downstream edge, ColumnGap along from the first column's input jacks.
- Output terminals: at the flow's end, one per destination, in the order's lane order, 30 apart across the flow. Each is TerminalWidth wide: 60 + RowMarks × (MarkTileSize + 4), 240 at the start values. Their upstream edges stand in line. A header bar 32 high with its destination, then one result row per item it must receive, 96 high: the required output over the result, each 44 high. The foot row of [ITEM-04](../board/items.md#item-04-drawing), 62 high, only when used. Its input jack sits at the middle of its upstream edge without the foot row, and stays there when the foot row shows. It stands ColumnGap along from the last column's output jacks.
- A result row's marks: the body, 44 wide, then up to RowMarks tiles of [MarkTileSize](../art-direction-objects.md#parameters), 4 apart, the count tile of [ITEM-04](../board/items.md#item-04-drawing) among them. RowMarks: 5.
- Master alarm lamp: on the Ink ground before the first output terminal in lane order, across the flow, its centre JackMinSize from that terminal's edge. Portrait: level with the terminal's header bar. Landscape: centred on the terminal's width.
- A moving item: its body, 36 wide, with its marks in a row under it, oldest first: [ITEM-04](../board/items.md#item-04-drawing).
- Arrival sign, [VIEW-07](../board/run-view.md#view-07-arrival): a disc of [SignDiscSize](../art-direction.md#parameters) in the plus or the minus colour, with its Ink sign, centred on the top right corner of the result row's body, drawn over the mark tile and the required output beside it.
- Rejected sign, [ITEM-04](../board/items.md#item-04-drawing): the same disc, minus, centred 4 inside the top left corner of the body: a result row's, or 2 inside on a moving item.
- **Derived:** a wire between two parts is at least ColumnGap long between its jack centres; a wire onto its own agent runs around the face, [WIRE-01](../board/wires.md#wire-01-wire-kinds), at least half the face's outline. So no wire's sign disc, arrow and jack plates overlap at any value in range.
- **Derived:** the largest required output in [Orders data](../data.md#orders) holds fewer marks than RowMarks, so every required output shows whole before the run.

## Links

- [UI style](style.md).
