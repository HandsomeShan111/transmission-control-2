# Report sharing

Design status: Defined.

## Goal

Report sharing: a printed report leaves the game as text with the game's link, or as a picture with the link printed and as a QR code. Serves PP-1.
Player decision: which report to send, as text or as a picture. Feedback: "COPIED" or "SAVED" on the teletype, and the share sheet where the device has one.
Flavour: a teletype tear-off, sent out of the building by a junior clerk.
Not owned here: a report's lines, [Reports](../board/reports.md); an item's drawing, [ITEM-04](../board/items.md#item-04-drawing); the game's link, [Offline play parameters](../platform/offline-play.md#parameters).

## Inputs

- A printed or filed report: [REPORT-04](../board/reports.md#report-04-print), [ARCHIVE-03](incident-archive.md#archive-03-reprint).
- The lead item's drawing at its output: [ITEM-04](../board/items.md#item-04-drawing).

## Outputs

- Text copied or a picture saved, and sent through the device's share sheet where it has one.

## Parameters

- **PictureWidth**: integer, px. Start: 1080. Fixed.
- **PictureHeight**: integer, px. Start: 1350. Fixed.
- **QRSize**: integer, px. Start: 240. Range: 200 to 320.
- **PictureMargin**: integer, px, each edge. Start: 60. Fixed.
- **PictureBands**: integers, px, by band. Start: header 50, link 60. Fixed.
- **PictureLineHeight**: integer, px, one row of text. Start: 55. Fixed.
- **PictureDrawingMin**: integer, px, the drawing's least height. Start: 400. Fixed.
- **PictureTextSize**: integer, px. Start: 44. Fixed.
- **PictureTextRows**: integer, rows, the most the lead or the result line takes. Start: 3. Fixed.
- GameLink: [Offline play parameters](../platform/offline-play.md#parameters).

## Mechanics

### SHARE-01 Text

The player taps a report's share control, then TEXT → a first line, "Transmission Control 2, <order name>: <GameLink>", then the report's lines as printed, not the lines after it, are copied, and "COPIED" prints; where the device has a share sheet, it opens too.

- The browser refuses the copy → the text, first line included, prints on the teletype, selected for the player to copy, and "SELECT AND COPY" prints, the line [SAVE-02](../platform/saving.md#save-02-copy-out) prints for a code. It closes as [REPORT-04](../board/reports.md#report-04-print) says.

### SHARE-02 Picture

The player taps a report's share control, then PICTURE → one picture of PictureWidth by PictureHeight: a header, "INCIDENT REPORT" or "MISSION REPORT" and the game's name; the order's name, the report's lead; the lead item drawn at its output under its required output, as [ITEM-04](../board/items.md#item-04-drawing) draws a result row; its result line, none for a stopped or lost item; then GameLink printed and as a QR code of QRSize, at error correction level M.

- The lead item: the item the lead names; a mission report or a lead naming none, the batch's first item. A stopped lead item: its kind and marks at its end. A lost one: its last kind and marks. Each is stamped as [ITEM-04](../board/items.md#item-04-drawing) stamps it.
- Bands, top to bottom, inside PictureMargin: header, order name and lead, drawing, result line, link, code. The header and the link are their PictureBands heights, each one row in PictureTextSize type; the code is QRSize. The order name, the lead and the result line wrap, in PictureTextSize type, a row each PictureLineHeight. The lead and the result line take PictureTextRows rows at most each; a longer one is cut, its last row ending "…". A result line that is the lead prints once, as the lead.
- The drawing takes the height left, never under PictureDrawingMin. It is scaled to fit its band and centred in it.
- **Derived:** drawing height = PictureHeight − two PictureMargin − the PictureBands − QRSize − PictureLineHeight × the rows of name, lead and result line. With a one-row order name, and a lead and a result line of PictureTextRows rows each, it stays over PictureDrawingMin at every QRSize.
- It is offered as a file download, and "SAVED" prints; where the device can share files, its share sheet opens too.
- The browser has no `download` attribute on links → the picture shows whole, and "PICTURE ON SCREEN. SAVE BY HAND." prints. A tap anywhere but on the AUDIO switch closes the picture only; the printout stays, and closes as [REPORT-04](../board/reports.md#report-04-print) says.

## Edge cases

- A long lead or result line, or a stopped or lost lead item: [SHARE-02](#share-02-picture).
- A share sheet closed with nothing sent, from text or picture: nothing more prints: [SHARE-01](#share-01-text), [SHARE-02](#share-02-picture).
- Offline: text and picture both work; only the link needs a connection to open: [SHARE-01](#share-01-text), [SHARE-02](#share-02-picture).
- **Derived:** a shared report carries no save, no filed report but the one shared, and no data of the player: [SHARE-01](#share-01-text), [SHARE-02](#share-02-picture).

## Links

- Filed reports: [Incident archive](incident-archive.md).
