# Transmission Control 2 documentation

This folder is the source of truth for Transmission Control 2 design. Each rule lives in one step on one page.

## Start here

- [Vision and pillars](vision.md): pitch, player, platform, constraints, goals, monetization.
- [Vision pillars](vision-pillars.md): game and product pillars.
- [System map](system-map.md): every system with area, tag, pillars, reason, content estimate.
- [Open questions](open-questions.md): gaps by area.
  - [Game](open-questions/game.md): vision gaps.
  - [Board](open-questions/board.md), [Orders](open-questions/orders.md), [Campaign](open-questions/campaign.md), [Platform](open-questions/platform.md), [Product](open-questions/product.md): system map areas.
- [Glossary](glossary.md): one term per thing.
- [Concept](source/concept.md): the original concept, never edited.

## Pages

Board:

- [Wiring board](board/wiring-board.md), steps `BOARD-`: the console, places, orientation, pan and zoom, run switch.
- [Wires](board/wires.md), steps `WIRE-`: wire kinds, plugging, moving, cutting, undo and reset.
- [Agents](board/agents.md), steps `AGENT-`: faces and jacks, work, checks, copies, pass limit, lamps.
- [Items](board/items.md), steps `ITEM-`: entry, marks, copies, drawing.
- [Run](board/run.md), steps `RUN-`: beats, ends, rejects, match, result.
- [Run view](board/run-view.md), steps `VIEW-`: play, follow, fast and skip, full alarm.
- [Reports](board/reports.md), steps `REPORT-`: leads, item lines, result lines, first difference.
- [Par and score](board/par-and-score.md), steps `PAR-`: setting par, score, best.

Orders:

- [Orders](orders/orders.md), steps `ORDER-`: texts, agents, batches, hand-written results, second wirings.
- [Repair orders](orders/repair-orders.md), steps `REPAIR-`: faults, moves, score.

Campaign:

- [Campaign](campaign/campaign.md), steps `CAMPAIGN-`: opening misfire, unlock, act start and end, order list, after the report.
- [Incident archive](campaign/incident-archive.md), steps `ARCHIVE-`: file, browse, reprint.
- [Achievements](campaign/achievements.md), steps `ACHIEVE-`: earn, show.
- [Report sharing](campaign/report-sharing.md), steps `SHARE-`: text, picture.

Platform:

- [Saving](platform/saving.md), steps `SAVE-`: keep, copy out, paste in, no keeping, version.
- [Offline play](platform/offline-play.md), steps `OFFLINE-`: first load, open, new version.
- [Settings](platform/settings.md), steps `SETTING-`: sound.

Product:

- [Product measures](product/measures.md), steps `MEAS-`: order starts and finishes, event flags, sending.

Presentation:

- [Art direction](art-direction.md), steps `ART-`: palette, shapes, type, lamps, jacks, wires, contrast.
  - [Art direction, objects](art-direction-objects.md): faces, items, mark tiles, paper, the picture.
  - [Art direction, sound](art-direction-sound.md): the sound style.
- [Feel](feel.md), steps `FEEL-`: the motion, timing and sound of each key moment, here the wire steps and input.
  - [Feel, run](feel-run.md): the run switch, agents, verdicts, arrivals, stops, fast-forward.
  - [Feel, campaign](feel-campaign.md): reports, the alarm, opening and printouts.

UI and content:

- [UI style](ui/style.md): style values and shared parts. Screens: [Loading](ui/loading.md), [Board](ui/board.md), [Order list](ui/order-list.md), [Incident archive](ui/archive.md).
- [Content inventory](content.md): every asset first release needs.

Data:

- [Data](data.md): agent families, agents, item kinds, order fields, achievements.
  - [Orders, acts 1 and 2](data-orders-acts-1-2.md), [acts 3 and 4](data-orders-acts-3-4.md), [acts 5 and 6](data-orders-acts-5-6.md).
  - [Authored lines, acts 1 and 2](data-lines-acts-1-2.md), [acts 3 and 4](data-lines-acts-3-4.md), [acts 5 and 6](data-lines-acts-5-6.md).

Build:

- [Build order](build/order.md): builders start here.
  - [Acceptance tests](build/acceptance.md), one test per step, by area: [Orders](build/acceptance-orders.md), [Board](build/acceptance-board.md), [Board, run](build/acceptance-board-run.md), [Campaign](build/acceptance-campaign.md), [Platform](build/acceptance-platform.md), [Product](build/acceptance-product.md), [Presentation, art direction](build/acceptance-art.md), [Presentation, feel](build/acceptance-feel.md).
  - [Tunables](build/tunables.md): every parameter with a tuning range.
  - [Test wirings](build/wirings.md): one winning wiring per order, for tests.

## Labels

Each component, topic, rule, layout and data page opens with a design status:

- **Draft**: written, not reviewed.
- **Partial**: reviewed; an open question marked "blocks" remains at a step.
- **Defined**: reviewed; no open question marked "blocks" at any step. Buildable.

Inside pages:

- No mark: design rule.
- **Derived:** a consequence of rules, linking the owners. Adds no rule.
- `Open: OQ-...`: open questions that affect that step.

## Reading order

- Builder: build order, then each page it links.
