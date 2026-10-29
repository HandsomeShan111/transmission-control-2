# Art direction, objects

Design status: Defined.

Part of [Art direction](art-direction.md#objects): the steps ART-09 to ART-12 and ART-26.

## Goal

The things on the console and on paper keep the console look: GP-3. A face, an item body and a mark tile read at the smallest zoom: GP-1 Review check.
Colours, shapes and type: [Art direction](art-direction.md). Motion: [Feel](feel.md).

## Parameters

Board unit: as [Art direction](art-direction.md#parameters) sets it.
Owned elsewhere: [OutlineWeight](art-direction.md#parameters), [WireEdge](art-direction.md#parameters), [SansStack](art-direction.md#parameters), [PassLimit](board/agents.md#parameters).

- **MarkTileSize**: number, board units across the tile's square box, the outline inside it. Start: 32. Range: 32 to 40.
- **MarkCodeWidth**: number, fraction of MarkTileSize, the width of the widest code. Start: 0.52. Range: 0.5 to 0.54.
- **PaperColumns**: integer, characters per printed line. Start: 32. Range: 28 to 40.
- **DoubleStrikeOffset**: number, fraction of a character width. Start: 0.08. Range: 0.04 to 0.15.

## Mechanics

### ART-09 Agent faces

An agent → a Cream face with an Ink outline, in these regions from the top:

- An Ink band: the family's silhouette at the left, then the family name in Cream. The silhouette is solid Cream with Ink detail lines.
- Over a wire, [WIRE-01](board/wires.md#wire-01-wire-kinds), the silhouette and the name keep an Ink halo of WireEdge. Each stays Cream on Ink: [ART-14](art-direction.md#art-14-text-contrast).
- The agent's name and its rule, in Ink.
- Bottom row on the Cream face: the lamp, the mark tile, and a checking agent's Ink PassLimit label.
- Jacks: the input jack on the face's upstream edge, the outputs on its downstream edge. Plus comes before minus, and item before copy, in lane order: [BOARD-02](board/wiring-board.md#board-02-orientation), [AGENT-01](board/agents.md#agent-01-face).
- One silhouette per family, from its `silhouette` field: [Agent families](data.md#agent-families). Each reads solid at the smallest zoom. No family colour.

### ART-10 Item bodies

An item kind → one flat body in Cream and Ink with at most one palette accent. No two bodies share an outline.

- Each kind has one body: [ITEM-02](board/items.md#item-02-marks). Where it is drawn: [ITEM-04](board/items.md#item-04-drawing), [SHARE-02](campaign/report-sharing.md#share-02-picture).

### ART-11 Mark tiles

A mark → a tile of MarkTileSize in its family's shape, with an Ink fill. Its Cream outline, OutlineWeight wide, sits inside the size. Its two-letter code is in Cream capitals in SansStack. The cap block, from baseline to cap height, is centred on the shape's centre.

- Tile shapes, one per family in act order: circle, square, hexagon, pentagon, octagon, arch. The circle, square, hexagon, pentagon and octagon are regular, and each one's extent across the box is the tile. The hexagon is vertex to vertex, flat top and bottom. The pentagon is corner to corner and points up. The octagon is flat to flat. The arch is a half circle of radius half the tile on a rectangle tile wide and half the tile high, with a flat base.
- A shape's centre is its middle. The pentagon's is the point equally far from its corners. The arch's is the box middle.
- The code is the mark name's first two letters; LB for labelled, as LA is laminated.
- Every code has one font size, set so the widest code is MarkCodeWidth of the tile across. The cap height follows from that width.
- Where tiles sit: [AGENT-01](board/agents.md#agent-01-face), [ITEM-04](board/items.md#item-04-drawing).
- **Derived:** the pentagon is the tightest shape. Every code fits every shape at every size and outline weight, for a font whose cap height is at most 0.52 of the widest code's width.

### ART-12 Teletype paper

A printed report, memo, debrief or save code → a Cream paper strip with perforated edges, PaperColumns characters wide.

- A line longer than PaperColumns wraps at spaces. A word longer than PaperColumns breaks at the column, as a save code does. A line means one authored line, however many rows.
- Double strike: the lead line, the unlock line, and a memo's family name. After the last act the sign-off line of [CAMPAIGN-04](campaign/campaign.md#campaign-04-act-end) replaces the unlock line. A double-strike line is drawn twice, the second DoubleStrikeOffset of a character width right.
- A memo's stamp is its family's silhouette beside the family name: solid Ink with Cream detail lines.
- Type is Ink monospace. Paper carries Ink and the stamp's Cream lines only.
- A plate on paper keeps its Cream fill and Ink label. Pressed, a second Ink outline of OutlineWeight stands outside the first, a gap of OutlineWeight between them.

### ART-26 Shared picture

[SHARE-02](campaign/report-sharing.md#share-02-picture) draws the shared picture → a Cream ground. Its type is Ink in SansStack, and the QR code is Ink on Cream. Item bodies keep their [ART-10](#art-10-item-bodies) colours.

## Links

- Vision: [Fantasy](vision.md#fantasy). The feel page, content inventory and UI style link here.
