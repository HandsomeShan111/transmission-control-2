# UI style

Design status: Defined.

## Goal

Every screen is the console: controls are labelled plates and switches on the Graphite frame, GP-3 Means. The window gives the board the most room on every screen: [Screen fit](../vision.md#constraints). Every control takes one tap or click, by finger or mouse: PP-1.

## Style

Sizes are CSS pixels, set at a screen whose short side is 360 and at one whose short side is 1080. Between them a size scales in a straight line with the short side. Past 1080 it holds. Below 360 it scales down with the short side, but a plate or a row never goes below [JackMinSize](../board/wiring-board.md#parameters), on any screen. Below, "a → b" gives the value at 360, then at 1080.

- **FrameMargin**: 6 → 12. The Graphite frame's width round the window and between the bars and the window.
- **OrderBar**: portrait height 112 → 170; landscape width 180 → 400. The order bar's room on the Board. On another screen, portrait: its title line and PlateGap each side.
- **ControlBar**: portrait height 72 → 112; landscape width 96 → 144. The control bar's room.
- **TextSize**: 14 → 22. Names, order text, list rows; SansStack.
- **LabelSize**: 11 → 16. Capital labels on plates, switches and lamps; SansStack.
- **PaperTextSize**: 14 → 20. Teletype type; MonoStack.
- **PlateSize**: 48 → 72. A plate's least height and width.
- **PlateGap**: 8 → 16. Space between two plates, and from a bar's ends.
- **PerfMargin**: 10 → 16. A printout's perforated edge, each side.
- **RowHeight**: 48 → 72. A list row's least height.
- **RowWidth**: 40 TextSize at most. A list row's greatest width.

## Shared parts

### Console frame

- Shows: [ART-04](../art-direction.md#art-04-console-frame), on every screen.
- Layout: two bars at the two ends of the screen's long side, the window between them. Portrait: the order bar on top, the control bar at the bottom. Landscape: the order bar at the left, the control bar at the right. FrameMargin round the window.
- The order bar holds the screen's title or the order. The control bar holds the screen's plates and switches in one line along it; the last control sits at the bar's far end: right in portrait, bottom in landscape.
- Across the bar, controls keep half PlateGap from its sides.
- Controls that do not fit one line at their least sizes wrap. Those that do not fit, counted back from the far end, take a second line, further from the window. The last control keeps the far end. The bar grows by that line's height and PlateGap.
- A press on a plate, a switch or a row makes no sound of its own, except the run switch's, [ART-21](../art-direction-sound.md#art-21-run-switch). What the press causes sounds as its step says: [ART-17](../art-direction-sound.md#art-17-sound-palette).
- States: lit; standby, [FEEL-12](../feel-campaign.md#feel-12-opening-misfire).

### Plate

- Shows: a control's name, in capitals.
- Layout: a Cream plate with an Ink outline and an Ink label of LabelSize, PlateSize at least each way. It is wide enough for its label and half PlateGap each side, the outline within that. A label wraps at spaces onto three lines at most.
- States: normal; pressed, an Ink plate with a Cream label, while held, except on paper: [Printout](#printout); disabled, a GraphiteLight plate with a Cream label.

### Switch

- Shows: the run switch, [ART-04](../art-direction.md#art-04-console-frame), [BOARD-04](../board/wiring-board.md#board-04-run-switch); the AUDIO switch, [SETTING-01](../platform/settings.md#setting-01-sound).
- Layout: a toggle half PlateSize long on a plate of PlateSize, coloured as [ART-04](../art-direction.md#art-04-console-frame) colours the run switch, its label under the toggle. The AUDIO switch adds its lamp beside the plate, half PlateGap from it: [Lamp](#lamp).
- States: up and down. The AUDIO switch is up while sound is on. The run switch's toggle moves as [FEEL-04](../feel-run.md#feel-04-run-starts) and [FEEL-16](../feel-campaign.md#feel-16-report-closes) say.

### Lamp

- Shows: a par lamp, the second-wiring lamp or the AUDIO lamp: [ART-05](../art-direction.md#art-05-lamps).
- Layout: a lens of [LampSize](../art-direction.md#parameters) of JackMinSize across, its label of LabelSize after it: Cream on the frame, Ink on a Cream row. The AUDIO lamp has no label: its switch's names it.
- States: off and steady.

### Printout

- Shows: a report, memo, debrief, save code or teletype line: [ART-12](../art-direction-objects.md#art-12-teletype-paper), [REPORT-04](../board/reports.md#report-04-print).
- Layout: PaperColumns characters of PaperTextSize wide, plus PerfMargin each side, centred across the window. It rests with its foot on the window's bottom edge, its top no higher than the window's top; a taller one scrolls in that room: [REPORT-04](../board/reports.md#report-04-print).
- A paper wider than the window lies over FrameMargin each side, and in landscape over the order bar, off centre as little as it must. It never lies over the control bar or past the screen's edges. Wider still, its PaperTextSize shrinks until it fits.
- Its foot stays on the window's bottom edge while the paper above it scrolls. It holds the lines after a report, [CAMPAIGN-06](../campaign/campaign.md#campaign-06-after-the-report), then the paper's controls in a row. Where it would leave less room than the lead and an incident report's second line, its lines scroll with the paper; its controls stay.
- Its controls are plates on the paper, in its foot, shown once it is whole: a report's SHARE, then TEXT and PICTURE after it is tapped; a save code's COPY. The save code field takes a row of its own, READ under it: [SHARE-01](../campaign/report-sharing.md#share-01-text), [SAVE-02](../platform/saving.md#save-02-copy-out), [SAVE-03](../platform/saving.md#save-03-paste-in).
- A plate on the paper, pressed: [ART-12](../art-direction-objects.md#art-12-teletype-paper).
- While a printout lies on the screen, the frame's plates show disabled; the AUDIO switch stays as it is: [REPORT-04](../board/reports.md#report-04-print).
- States: printing, whole, tearing away: [FEEL-09](../feel-campaign.md#feel-09-report-prints), [FEEL-13](../feel-campaign.md#feel-13-memo-debrief-and-save-printouts), which give its feed. Taps: [REPORT-04](../board/reports.md#report-04-print).
- **Derived:** a printout of PaperColumns' greatest fits a 360 short side in portrait, and in landscape every phone's long side, so its type shrinks on no phone.

### Field

- Shows: the pasted save code: [SAVE-03](../platform/saving.md#save-03-paste-in).
- Layout: a Cream box with an Ink outline on the paper, PaperColumns wide, three rows of PaperTextSize; Ink MonoStack text.
- States: empty, holding text.

### Picture view

- Shows: the shared picture when the browser cannot download it: [SHARE-02](../campaign/report-sharing.md#share-02-picture), [ART-26](../art-direction-objects.md#art-26-shared-picture).
- Layout: over the window and its printout, fitted whole into the window above the printout's last three lines, centred, its outline Ink. Those lines stay in view below it.

### List row

- Shows: one row of the [Order list](order-list.md) or the [Incident archive](archive.md): [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list), [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse).
- Layout: a Cream row across the window, at most RowWidth, centred; RowHeight at least, growing with its lines; Ink text of TextSize, PlateGap from the row's sides; rows PlateGap apart.
- An act heading: an Ink row with the family's silhouette at its start, then "ACT <number>" and the family name in Cream: [ART-09](../art-direction-objects.md#art-09-agent-faces).
- States: normal; pressed, a row turns Ink with Cream text, and an act heading turns GraphiteLight.

## Screens

- [Loading](loading.md): the first load.
- [Board](board.md): one order on the wiring board, its run and its printouts.
- [Order list](order-list.md): acts and orders; sound and save codes.
- [Incident archive](archive.md): filed reports and achievements.

## Links

- Art direction: [Art direction](../art-direction.md). Feel: [Feel](../feel.md).
