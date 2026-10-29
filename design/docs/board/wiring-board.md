# Wiring board

Design status: Defined.

## Goal

Wiring board: the console where an order's agents sit fixed and placed, panned and zoomed like a map on every screen. Serves GP-3, PP-1.
Player decision: none; it serves Screen fit, every order on every screen, [Constraints](../vision.md#constraints). Feedback: the whole order framed on opening; the batch waiting at the input terminal; each output terminal showing what it must receive.
Flavour: one panel of humanity's last Mission Control: flat Bauhaus shapes, labelled jacks, one run switch, one red lamp.
Not owned here: wires, [Wires](wires.md); what agents show, [AGENT-01](agents.md#agent-01-face); the view during a run, [VIEW-02](run-view.md#view-02-follow).

## Inputs

- The order: its agents and their places, its batch, its destinations and required outputs, its opening wiring: [Orders](../system-map.md#orders).
- Report closed: [VIEW-05](run-view.md#view-05-return).

## Outputs

- Run switch flipped: [RUN-01](run.md#run-01-start).
- Jacks and terminals for wires: [WIRE-02](wires.md#wire-02-hold).

## Parameters

- **JackMinSize**: number, CSS pixels on screen. Start: 44. Range: 40 to 56.
- **JackMaxSize**: number, CSS pixels on screen. Start: 120. Range: 88 to 160.
- **EdgePanZone**: number, CSS pixels from the window's edge. Start: 40. Range: 24 to 64.
- **EdgePanSpeed**: number, CSS pixels per second. Start: 400. Range: 200 to 800.
- **BoardMargin**: number, CSS pixels on screen, round the board's extent. Start: 16. Range: 8 to 40.

## Mechanics

### BOARD-01 Open

An order opens → the board shows in the window between the console's bars, framed whole; an order wider than the window at JackMinSize, framed at that zoom on its input terminal:

- the input terminal at the start of the flow, with the batch's items in batch order, and one output jack;
- each agent at its place: a column along the flow and a lane across it, from the order;
- one output terminal per destination at the end of the flow, labelled with the destination, showing the required output of each item it must receive, drawn as [ITEM-04](items.md#item-04-drawing) draws a result; a copy the order names, in a row at its own destination's terminal, labelled with its original's kind and its copy number, right under its original's row when both go there;
- the order's opening wiring: none, or a repair order's wrong wires, or wires the order opens with; a wiring kept for the order shows in its place: [SAVE-01](../platform/saving.md#save-01-keep);
- the run switch and the master alarm lamp, off.
- The board's extent: the smallest rectangle round its terminals, agents and the master alarm lamp with its lit rings, jacks included, and BoardMargin beyond it on each side. Framed whole: at the zoom that fits the extent to the window, within the zoom stops of [BOARD-03](#board-03-pan-and-zoom), the extent centred; an order wider than the window, framed as the opening line says. Either is the order's opening framing.
- Where each part sits: [Board](../ui/board.md#layout).

### BOARD-02 Orientation

The screen is landscape → the flow runs left to right: columns along the width, lanes down the height. Portrait → the flow runs top to bottom: columns down the height, lanes along the width.

- One place per agent serves both orientations. Faces, names and text stay upright.
- The screen turns → wiring and zoom stay; the view keeps its centre, then moves the least it must to sit inside the pan stops of [BOARD-03](#board-03-pan-and-zoom).

### BOARD-03 Pan and zoom

The board is not locked ([BOARD-04](#board-04-run-switch)), and the player drags from anywhere but an output jack or a wire's end ([WIRE-02](wires.md#wire-02-hold), [WIRE-04](wires.md#wire-04-move)), turns a scroll wheel or scrolls with two fingers on a trackpad → the board pans. A pinch, or the wheel with the control key held → the board zooms around that point.

- Zoom stops where a jack shows at JackMinSize, and where it shows at JackMaxSize.
- A held wire within EdgePanZone of a window edge, or past that edge → the board pans toward it at EdgePanSpeed.
- Pan stops, on each axis, where the extent's edge of [BOARD-01](#board-01-open) meets the window's edge. On an axis where the extent is smaller than the window, the board does not pan, and stays centred.

### BOARD-04 Run switch

The board is not locked, and the player flips the run switch → the run starts: [RUN-01](run.md#run-01-start).

- The board is locked from the flip until the report closes ([VIEW-05](run-view.md#view-05-return)): no wiring, pan, zoom or leaving for the order list.

## Edge cases

- An order wider than the window at JackMinSize: the player pans to see it all: [BOARD-01](#board-01-open), [BOARD-03](#board-03-pan-and-zoom).
- The screen turns during a run: the run plays on; the view keeps following: [BOARD-02](#board-02-orientation), [VIEW-02](run-view.md#view-02-follow).
- **Derived:** one wiring reads the same in both orientations, as places are kept per agent: [BOARD-02](#board-02-orientation).

## Links

- Wires on the board: [Wires](wires.md).
- The run on the board: [Run view](run-view.md).
