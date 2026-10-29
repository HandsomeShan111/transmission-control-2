# Acceptance tests, Board

Tests for the Board steps, in build order. Form and pass rule: [Acceptance tests](acceptance.md).

## Wiring board

- **BOARD-01**: Setup: no kept wiring; orders Embassy dinner, Moon Base birthday and Night scrap run on the largest screen of the [Platform](../vision.md#platform), order Last mail on the smallest. Do: open each order. Expect: [BOARD-01](../board/wiring-board.md#board-01-open). **Derived:** input terminal slots = BatchItems of the order; output terminals = its destinations.
- **BOARD-02**: Setup: order Night scrap run open on a landscape screen, panned and zoomed away from the framing it opened with. Do: turn the screen to portrait, then back. Expect: [BOARD-02](../board/wiring-board.md#board-02-orientation).
- **BOARD-03**: Setup: order Last mail, board not locked; parameters JackMinSize, JackMaxSize, EdgePanZone, EdgePanSpeed, BoardMargin. Do: drag on empty board, then from a face, a terminal and a wire's middle; turn the wheel; scroll with two fingers; pinch; turn the wheel with control held; zoom out and in to each stop; hold a wire from IN within EdgePanZone of each window edge, then past it, until the pan stops; zoom out to the stop and drag along each axis. Expect: [BOARD-03](../board/wiring-board.md#board-03-pan-and-zoom). **Derived:** a jack shows JackMinSize wide at one zoom stop and JackMaxSize wide at the other; edge pan distance = EdgePanSpeed × seconds held, until the extent's edge meets the window's edge; at that stop BoardMargin of empty board shows.
- **BOARD-04**: Setup: order Signing ceremony, board not locked. Do: flip the run switch; while the run plays, try to plug a wire, pan, zoom and tap ORDERS; close the report. Expect: [BOARD-04](../board/wiring-board.md#board-04-run-switch).

## Agents

- **AGENT-01**: Setup: order Moon Base birthday, on open; parameter PassLimit. Do: read the face of TASTER, BAKER and each SLICER. Expect: [AGENT-01](../board/agents.md#agent-01-face). **Derived:** TASTER's label shows its PassLimit from the order; the SLICER in the earlier column has the lower number.
- **AGENT-02**: Setup: order Moving day; Flag at COMPACTOR's input jack. Do: let COMPACTOR work it; put it at GAUGE's input jack and let GAUGE check it; put it at RESTORER's input jack and let RESTORER work it. Expect: [AGENT-02](../board/agents.md#agent-02-work).
- **AGENT-03**: Setup: order Archive day; Treaty and Coffee, each at INSPECTOR's input jack in turn. Do: let INSPECTOR check each; read its lamp, the item's marks and the jack the item leaves by. Expect: [AGENT-03](../board/agents.md#agent-03-check).
- **AGENT-04**: Setup: order Embassy dinner; Cake at SLICER's input jack. Do: let SLICER work it. Expect: [AGENT-04](../board/agents.md#agent-04-copy).
- **AGENT-05**: Setup: order Embassy dinner; parameter PassLimit; Cake at INSPECTOR's input jack. Do: let INSPECTOR check Cake PassLimit times, then once more; let SLICER copy Cake and put the copy at INSPECTOR's input jack. Expect: [AGENT-05](../board/agents.md#agent-05-pass-limit). **Derived:** the check after PassLimit checks of one item is a rejection; the copy's first check is not.
- **AGENT-06**: Setup: order Embassy dinner; Treaty at LAMINATOR's input jack. Do: let LAMINATOR work it; then leave LAMINATOR and SLICER with no item. Expect: [AGENT-06](../board/agents.md#agent-06-idle).

## Wires

- **WIRE-01**: Setup: order Archive day, no opening wiring. Do: plug a wire from IN, from INSPECTOR plus, from INSPECTOR minus and from SHREDDER to its own input jack; run one wire past another agent's face; cross two wires, placing one after the other. Expect: [WIRE-01](../board/wires.md#wire-01-wire-kinds). **Derived:** the hop is on the wire placed later.
- **WIRE-02**: Setup: order Archive day, board not locked. Do: press INSPECTOR plus and drag; tap INSPECTOR plus; tap it again; tap INSPECTOR minus, then tap empty board; tap INSPECTOR minus, then tap LAMINATOR 1's face. Expect: [WIRE-02](../board/wires.md#wire-02-hold).
- **WIRE-03**: Setup: order Archive day, board not locked. Do: plug LAMINATOR 1 to Archive; plug SHREDDER to Archive; plug LAMINATOR 1 to SHREDDER's input jack; drop a held wire on empty board. Expect: [WIRE-03](../board/wires.md#wire-03-plug).
- **WIRE-04**: Setup: order Night scrap run at its opening wiring; parameters JackMinSize, EndReach, EndLength. Do: press GAUGE's input jack, where two wires end, and drop the held end on COMPACTOR's input jack; drag the output end of the LAMINATOR wire onto INSPECTOR plus; press EndReach from a wire's line, EndLength from its jack; tap a wire's end; drag an input end and drop it on its own jack, then on an output jack; press where the end bands of one short wire overlap. Expect: [WIRE-04](../board/wires.md#wire-04-move). **Derived:** of the two wires ending at GAUGE's input jack, the later one in the wire list moves.
- **WIRE-05**: Setup: order Night scrap run at its opening wiring. Do: drag the output end of the SHREDDER wire to empty board and drop it. Expect: [WIRE-05](../board/wires.md#wire-05-cut).
- **WIRE-06**: Setup: order Night scrap run at its opening wiring. Do: tap undo; plug a wire, move one, cut one and reset; tap undo until it changes nothing. Expect: [WIRE-06](../board/wires.md#wire-06-undo).
- **WIRE-07**: Setup: order Night scrap run at its opening wiring. Do: cut a wire, plug another, tap reset. Expect: [WIRE-07](../board/wires.md#wire-07-reset).

## Items

- **ITEM-01**: Setup: order Latin hour. Do: flip the run switch; read the input terminal and each output terminal before the first beat. Expect: [ITEM-01](../board/items.md#item-01-enter).
- **ITEM-02**: Setup: order Latin hour; Treaty and Address, each at TRANSLATOR's input jack in turn. Do: let TRANSLATOR work each; put Treaty at SUMMARIZER's input jack and let SUMMARIZER work it. Expect: [ITEM-02](../board/items.md#item-02-marks).
- **ITEM-03**: Setup: order Moon Base birthday; Flag at SLICER 1's input jack. Do: let SLICER 1 work it; put the copy at SLICER 2's input jack and let SLICER 2 work it. Expect: [ITEM-03](../board/items.md#item-03-copies).
- **ITEM-04**: Setup: orders Form week, Embassy dinner and Seal of office; parameter MarksShown; layout value RowMarks. Do: run Form week with IN to STAMPER 1 and STAMPER 1 to its own input; with no wire from IN; with IN to STAMPER 1 to Bureau; with IN to TALLY, TALLY plus and TALLY minus both to STAMPER 1, and STAMPER 1 to TALLY. Run Embassy dinner with IN to SLICER, and SLICER's item jack and copy jack both to Canteen. Run Seal of office with IN to SEALER, SEALER to STAMPER 1, STAMPER 1 to STAMPER 2, STAMPER 2 to Archive, for a first difference past the row's plain tiles. Expect: [ITEM-04](../board/items.md#item-04-drawing). **Derived:** a moving item shows its latest MarksShown marks; a result row holds RowMarks tiles.
