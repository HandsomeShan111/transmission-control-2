# Content inventory

Every asset first release needs. Each line links what needs it and the art direction rule or feel step it follows.

Entry form: `- **Asset**: count, base × variants where any. Needed by step or data entry. Follows ART or FEEL step.`

Kinds follow the [System map](system-map.md) in its order, then the kinds its visual line counts. Every count is of items, not of text lines on this page.

## Console

- **Console frame**: 1. Needed by [BOARD-01](board/wiring-board.md#board-01-open). Follows [ART-04](art-direction.md#art-04-console-frame).
- **Jack**: 1 × 4 plates, output, input, plus and minus. Needed by [AGENT-01](board/agents.md#agent-01-face). Follows [ART-07](art-direction.md#art-07-jacks-and-terminals).
- **Run switch**: 1, also the AUDIO switch. Needed by [BOARD-04](board/wiring-board.md#board-04-run-switch), [SETTING-01](platform/settings.md#setting-01-sound). Follows [ART-04](art-direction.md#art-04-console-frame).
- **Master alarm lamp**: 1. Needed by [VIEW-04](board/run-view.md#view-04-full-alarm). Follows [ART-06](art-direction.md#art-06-master-alarm).
- **Terminals**: 2, input and output. Needed by [BOARD-01](board/wiring-board.md#board-01-open). Follows [ART-07](art-direction.md#art-07-jacks-and-terminals).

**Derived:** frame 1 of 1, parts 3 of 3 and terminals 2 of 2 in [Wiring board](system-map.md#board). Within ContentTolerance.

## Wires

- **Wire styles**: 3, data, plus feedback and minus feedback, with arrow, sign disc, hop and the trace across a face. Needed by [WIRE-01](board/wires.md#wire-01-wire-kinds). Follows [ART-08](art-direction.md#art-08-wires).

**Derived:** styles 3 of 3 in [Wires](system-map.md#board). Within ContentTolerance.

## Sounds

- **Plug and unplug**: 2. Needed by [WIRE-03](board/wires.md#wire-03-plug), [WIRE-05](board/wires.md#wire-05-cut). Follows [ART-18](art-direction-sound.md#art-18-plug-and-unplug).
- **Working**: 1. Needed by [AGENT-02](board/agents.md#agent-02-work). Follows [ART-19](art-direction-sound.md#art-19-working).
- **Verdict tones**: 2, plus and minus. Needed by [AGENT-03](board/agents.md#agent-03-check). Follows [ART-20](art-direction-sound.md#art-20-verdicts).
- **Run switch sound**: 1. Needed by [VIEW-01](board/run-view.md#view-01-play). Follows [ART-21](art-direction-sound.md#art-21-run-switch).
- **Alarm tone**: 1. Needed by [VIEW-04](board/run-view.md#view-04-full-alarm). Follows [ART-22](art-direction-sound.md#art-22-alarm-tone).
- **Teletype**: 1. Needed by [REPORT-04](board/reports.md#report-04-print). Follows [ART-23](art-direction-sound.md#art-23-teletype).
- **Bell**: 1. Needed by [CAMPAIGN-06](campaign/campaign.md#campaign-06-after-the-report). Follows [ART-24](art-direction-sound.md#art-24-bell).

**Derived:** 9 against the 8 of [Wires](system-map.md#board), [Agents](system-map.md#board), [Run view](system-map.md#board) and [Reports](system-map.md#board), the bell added. 9 is within 20% of 8. A tenth would not be.

## Agents

- **Agent faces**: 18, 6 families × 3. Needed by [Agents](data.md#agents). Follows [ART-09](art-direction-objects.md#art-09-agent-faces).
- **Rule texts**: 18, one per agent. Needed by [Agents](data.md#agents). Follows [ART-09](art-direction-objects.md#art-09-agent-faces).
- **Silhouettes**: 6, one per family, also the memo stamp. Needed by [Agent families](data.md#agent-families). Follows [ART-09](art-direction-objects.md#art-09-agent-faces), [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Lamp states**: 4, off, steady, plus and minus. Needed by [AGENT-01](board/agents.md#agent-01-face). Follows [ART-05](art-direction.md#art-05-lamps).

**Derived:** agents 18 of 18, rule texts 18 of 18 in [Agents](system-map.md#board). Silhouettes 6 of 6, lamp states 4 of 4. Within ContentTolerance.

## Items

- **Item bodies**: 12, one per kind. Needed by [Item kinds](data.md#item-kinds). Follows [ART-10](art-direction-objects.md#art-10-item-bodies).
- **Mark tiles**: 12, 6 shapes × 2 marks. Needed by [ITEM-02](board/items.md#item-02-marks). Follows [ART-11](art-direction-objects.md#art-11-mark-tiles).

**Derived:** item kinds 12 of 12 and marks 12 of 12 in [Items](system-map.md#board). Within ContentTolerance.

## Reports

- **Report forms**: 2, mission and incident. Needed by [REPORT-01](board/reports.md#report-01-form-and-lead). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Authored lines**: 216, 18 agents × 12 item kinds. Needed by [Authored lines](data.md#authored-lines). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).

**Derived:** report forms 2 of 2 and authored lines 216 of at most 216 in [Reports](system-map.md#board). Within ContentTolerance.

## Orders

- **Orders**: 30, 6 acts × 5. Needed by [Orders](data.md#orders). Follows [FEEL-11](feel-campaign.md#feel-11-order-opens).
- **Repair orders**: 6, 3 acts × 2, counted in the 30. Needed by [REPAIR-01](orders/repair-orders.md#repair-01-faults). Follows [FEEL-11](feel-campaign.md#feel-11-order-opens).
- **Order texts**: 30, one per order. Needed by [ORDER-01](orders/orders.md#order-01-text). Follows [ART-03](art-direction.md#art-03-type).
- **Hand-written results**: 90, 30 orders × 3. Needed by [ORDER-04](orders/orders.md#order-04-hand-written-results). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).

**Derived:** orders 30 of 30, order texts 30 of 30 and results 90 of 90 in [Orders](system-map.md#orders). Repair orders 6 of 6 in [Repair orders](system-map.md#orders), inside the 30. Within ContentTolerance.

## Campaign

- **Acts**: 6, one per family. Needed by [CAMPAIGN-03](campaign/campaign.md#campaign-03-act-start). Follows [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts).
- **Opening misfire**: 1, a scripted run with its report. Needed by [CAMPAIGN-01](campaign/campaign.md#campaign-01-opening-misfire), [Order 1](data-orders-acts-1-2.md#1-signing-ceremony). Follows [FEEL-12](feel-campaign.md#feel-12-opening-misfire).
- **Memo lines**: 6, one per family. Needed by [Agent families](data.md#agent-families). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).

**Derived:** acts 6 of 6, opening misfire 1 of 1 and memo lines 6 of 6 in [Campaign](system-map.md#campaign). Within ContentTolerance.

## Achievements

- **Achievements**: 18, 6 acts × 3 kinds, each a name and a line. Needed by [Achievements](data.md#achievements). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).

**Derived:** achievements 18 of 18 in [Achievements](system-map.md#campaign). Within ContentTolerance.

## Report sharing

- **Picture layout**: 1. Needed by [SHARE-02](campaign/report-sharing.md#share-02-picture). Follows [ART-26](art-direction-objects.md#art-26-shared-picture).

**Derived:** picture layouts 1 of 1 in [Report sharing](system-map.md#campaign). Within ContentTolerance.

## Animations

- **Hold a wire**: 1. Needed by [FEEL-01](feel.md#feel-01-hold-a-wire). Follows [FEEL-01](feel.md#feel-01-hold-a-wire).
- **Plug or move a wire**: 1. Needed by [FEEL-02](feel.md#feel-02-plug-or-move-a-wire). Follows [FEEL-02](feel.md#feel-02-plug-or-move-a-wire).
- **Cut a wire**: 1. Needed by [FEEL-03](feel.md#feel-03-cut-a-wire). Follows [FEEL-03](feel.md#feel-03-cut-a-wire).
- **Run starts**: 1. Needed by [FEEL-04](feel-run.md#feel-04-run-starts). Follows [FEEL-04](feel-run.md#feel-04-run-starts).
- **Agent works**: 1. Needed by [FEEL-05](feel-run.md#feel-05-agent-works). Follows [FEEL-05](feel-run.md#feel-05-agent-works).
- **Check verdict**: 1. Needed by [FEEL-06](feel-run.md#feel-06-check-verdict). Follows [FEEL-06](feel-run.md#feel-06-check-verdict).
- **Item arrives**: 1. Needed by [FEEL-07](feel-run.md#feel-07-item-arrives). Follows [FEEL-07](feel-run.md#feel-07-item-arrives).
- **Item stops or is lost**: 1. Needed by [FEEL-08](feel-run.md#feel-08-item-stops-or-is-lost). Follows [FEEL-08](feel-run.md#feel-08-item-stops-or-is-lost).
- **Report prints**: 1. Needed by [FEEL-09](feel-campaign.md#feel-09-report-prints). Follows [FEEL-09](feel-campaign.md#feel-09-report-prints).
- **Full alarm and incident report**: 1. Needed by [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report). Follows [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report).
- **Order opens**: 1. Needed by [FEEL-11](feel-campaign.md#feel-11-order-opens). Follows [FEEL-11](feel-campaign.md#feel-11-order-opens).
- **Opening misfire**: 1. Needed by [FEEL-12](feel-campaign.md#feel-12-opening-misfire). Follows [FEEL-12](feel-campaign.md#feel-12-opening-misfire).
- **Memo, debrief and save printouts**: 1. Needed by [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts). Follows [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts).
- **Undo, reset or replaced wire**: 1. Needed by [FEEL-14](feel.md#feel-14-undo-reset-or-replaced-wire). Follows [FEEL-14](feel.md#feel-14-undo-reset-or-replaced-wire).
- **Fast, skip and hidden page**: 1. Needed by [FEEL-15](feel-run.md#feel-15-fast-skip-and-hidden-page). Follows [FEEL-15](feel-run.md#feel-15-fast-skip-and-hidden-page).
- **Report closes**: 1. Needed by [FEEL-16](feel-campaign.md#feel-16-report-closes). Follows [FEEL-16](feel-campaign.md#feel-16-report-closes).
- **Input during motion**: 1. Needed by [FEEL-17](feel.md#feel-17-input-during-motion). Follows [FEEL-17](feel.md#feel-17-input-during-motion).

**Derived:** 17 animations, one per feel step, of 17 on the [System map](system-map.md#not-mapped)'s visual line. Within ContentTolerance.

## Effects

- **Blinking ring**: 1, Mustard. Needed by [FEEL-01](feel.md#feel-01-hold-a-wire), [FEEL-12](feel-campaign.md#feel-12-opening-misfire). Follows [ART-15](art-direction.md#art-15-rings).
- **Held tip**: 1, Mustard, on a held wire. Needed by [FEEL-01](feel.md#feel-01-hold-a-wire). Follows [ART-15](art-direction.md#art-15-rings).
- **Cream rings**: 5, seat, jack pulse, lamp, par and first-difference. Needed by [FEEL-02](feel.md#feel-02-plug-or-move-a-wire), [FEEL-05](feel-run.md#feel-05-agent-works), [FEEL-07](feel-run.md#feel-07-item-arrives), [FEEL-08](feel-run.md#feel-08-item-stops-or-is-lost), [FEEL-09](feel-campaign.md#feel-09-report-prints). Follows [ART-15](art-direction.md#art-15-rings).
- **Alarm rings**: 1, two standing rings. Needed by [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report). Follows [ART-06](art-direction.md#art-06-master-alarm).
- **Pop-ins**: 3, sign disc, mark tile and memo stamp. Needed by [FEEL-02](feel.md#feel-02-plug-or-move-a-wire), [FEEL-05](feel-run.md#feel-05-agent-works), [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts). Follows [ART-08](art-direction.md#art-08-wires), [ART-11](art-direction-objects.md#art-11-mark-tiles), [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Dims**: 3, stopped item, room and standby. Needed by [FEEL-08](feel-run.md#feel-08-item-stops-or-is-lost), [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report), [FEEL-12](feel-campaign.md#feel-12-opening-misfire). Follows [ART-01](art-direction.md#art-01-palette).
- **Dash march**: 1. Needed by [FEEL-06](feel-run.md#feel-06-check-verdict). Follows [ART-08](art-direction.md#art-08-wires).

**Derived:** 15 effects of 15 on the [System map](system-map.md#not-mapped)'s visual line. Within ContentTolerance.

## Printout lines

- **Memo**: 1 form. Needed by [CAMPAIGN-03](campaign/campaign.md#campaign-03-act-start). Follows [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts), [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Debrief**: 1 form, with 3 progress lines. Needed by [CAMPAIGN-04](campaign/campaign.md#campaign-04-act-end). Follows [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts).
- **Unlock lines**: 2, unlock and sign-off. Needed by [CAMPAIGN-02](campaign/campaign.md#campaign-02-unlock), [CAMPAIGN-04](campaign/campaign.md#campaign-04-act-end). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **After-report lines**: 3, filed, second wiring filed and route on file. Needed by [CAMPAIGN-06](campaign/campaign.md#campaign-06-after-the-report). Follows [FEEL-09](feel-campaign.md#feel-09-report-prints).
- **Save code**: 1. Needed by [SAVE-02](platform/saving.md#save-02-copy-out). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Save lines**: 7: COPIED, SELECT AND COPY, SAVE CODE READ, CODE NOT READ, the newer-version line, the no-keeping line and the dropped-records line. Sharing prints the first two too. Needed by [SAVE-02](platform/saving.md#save-02-copy-out), [SHARE-01](campaign/report-sharing.md#share-01-text), [SAVE-03](platform/saving.md#save-03-paste-in), [SAVE-04](platform/saving.md#save-04-no-keeping), [SAVE-05](platform/saving.md#save-05-version). Follows [FEEL-13](feel-campaign.md#feel-13-memo-debrief-and-save-printouts).
- **Share lines**: 3: the text's first line, SAVED, and PICTURE ON SCREEN. SAVE BY HAND. Needed by [SHARE-01](campaign/report-sharing.md#share-01-text), [SHARE-02](campaign/report-sharing.md#share-02-picture). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Commendation line**: 1 form. Needed by [ACHIEVE-02](campaign/achievements.md#achieve-02-show). Follows [FEEL-09](feel-campaign.md#feel-09-report-prints).
- **Loading lines**: 3. Needed by [OFFLINE-01](platform/offline-play.md#offline-01-first-load). Follows [ART-03](art-direction.md#art-03-type).

**Derived:** 25 forms and lines against 24 on the [System map](system-map.md#not-mapped)'s visual line. Within ContentTolerance.

## Other drawn parts

- **Teletype paper**: 1, a perforated strip. Needed by [REPORT-04](board/reports.md#report-04-print). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Signs**: 2, plus and minus. Needed by [WIRE-01](board/wires.md#wire-01-wire-kinds), [VIEW-07](board/run-view.md#view-07-arrival). Follows [ART-13](art-direction.md#art-13-verdict-colour-and-sign).

**Derived:** 3 parts of 3 on the [System map](system-map.md#not-mapped)'s visual line. Within ContentTolerance.

## UI

- **Screens**: 4, loading, board, order list and archive. Needed by [UI style](ui/style.md#screens). Follows [ART-04](art-direction.md#art-04-console-frame).
- **Plates**: 1 × 13 labels: ORDERS, UNDO, RESET, FAST, SKIP, ARCHIVE, SAVE CODE, LOAD SAVE CODE, READ, COPY, SHARE, TEXT, PICTURE. Needed by [Board](ui/board.md#controls), [Order list](ui/order-list.md#controls), [Incident archive](ui/archive.md#controls). Follows [ART-02](art-direction.md#art-02-shape), [ART-03](art-direction.md#art-03-type).
- **Lamps**: 1 × 4 labels: WIRES, TIME, MOVES and 2ND WIRING. The AUDIO lamp has none. Needed by [PAR-03](board/par-and-score.md#par-03-best), [CAMPAIGN-05](campaign/campaign.md#campaign-05-order-list), [SETTING-01](platform/settings.md#setting-01-sound). Follows [ART-05](art-direction.md#art-05-lamps).
- **List rows**: 3, an order or report row, an achievement row and an act heading. Needed by [CAMPAIGN-05](campaign/campaign.md#campaign-05-order-list), [ARCHIVE-02](campaign/incident-archive.md#archive-02-browse). Follows [ART-09](art-direction-objects.md#art-09-agent-faces), [ART-14](art-direction.md#art-14-text-contrast).
- **Screen titles**: 3, ORDER LIST, INCIDENT ARCHIVE and TRANSMISSION CONTROL 2. Needed by [Order list](ui/order-list.md#layout), [Incident archive](ui/archive.md#layout), [Loading](ui/loading.md#layout). Follows [ART-03](art-direction.md#art-03-type).
- **Save code field**: 1. Needed by [SAVE-03](platform/saving.md#save-03-paste-in). Follows [ART-12](art-direction-objects.md#art-12-teletype-paper).
- **Picture view**: 1. Needed by [SHARE-02](campaign/report-sharing.md#share-02-picture). Follows [ART-26](art-direction-objects.md#art-26-shared-picture).
- **Row stamps**: 3, STOPPED, LOST and the count tile. Needed by [ITEM-04](board/items.md#item-04-drawing). Follows [ART-03](art-direction.md#art-03-type), [ART-11](art-direction-objects.md#art-11-mark-tiles).

**Derived:** 32 UI items: 4 screens, 13 plate labels, 4 lamp labels, 3 row kinds, 3 titles, 1 field, 1 picture view, 3 stamps. 32 of 32 on the [System map](system-map.md#not-mapped)'s visual line. Within ContentTolerance.
