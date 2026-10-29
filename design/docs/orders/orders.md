# Orders

Design status: Defined.

## Goal

Orders: each a humanity-critical mission with its batch, its agents, its required outputs and its hand-written results. Serves GP-2, GP-3, GP-4.
Player decision: read what each destination needs, then pick the agents and the path each item takes, unneeded agents included. Feedback: the order text and the required outputs drawn at each output terminal; on a wrong run, a hand-written result when the run gave one.
Flavour: urgent requests from every corner of a struggling humanity, each answered by one console and its literal machines.
Not owned here: the board an order opens on, [BOARD-01](../board/wiring-board.md#board-01-open); repair orders' faults and moves, [Repair orders](repair-orders.md); acts and their order of play, [Campaign](../system-map.md#campaign).

## Inputs

- Agents and item kinds: [Data](../data.md#agents).

## Outputs

- Each order's data: [Orders data](../data.md#orders), read by [BOARD-01](../board/wiring-board.md#board-01-open), [ITEM-01](../board/items.md#item-01-enter), [REPORT-01](../board/reports.md#report-01-form-and-lead), [PAR-01](../board/par-and-score.md#par-01-setting-par), [CAMPAIGN-01](../campaign/campaign.md#campaign-01-opening-misfire), [CAMPAIGN-02](../campaign/campaign.md#campaign-02-unlock), [CAMPAIGN-04](../campaign/campaign.md#campaign-04-act-end), [CAMPAIGN-05](../campaign/campaign.md#campaign-05-order-list), [CAMPAIGN-06](../campaign/campaign.md#campaign-06-after-the-report), [ARCHIVE-01](../campaign/incident-archive.md#archive-01-file), [ARCHIVE-02](../campaign/incident-archive.md#archive-02-browse), [ACHIEVE-01](../campaign/achievements.md#achieve-01-earn), [SHARE-01](../campaign/report-sharing.md#share-01-text), [SHARE-02](../campaign/report-sharing.md#share-02-picture), [SAVE-01](../platform/saving.md#save-01-keep), [MEAS-03](../product/measures.md#meas-03-send), [MEAS-04](../product/measures.md#meas-04-event-flags).

## Parameters

- **BatchItems**: integer, items per batch, named copies not counted. Start: per order, as its data gives it. Range: 2 to 6.
- **UnneededAgents**: integer, agents per order beyond the fewest any known winning wiring uses. Start: per order, as its agents and the search over its wirings give it. Range: 1 to 2, from order 3.
- **HandResults**: integer, hand-written results per order. Start: 3. Fixed.

## Mechanics

### ORDER-01 Text

An order's data is written → its text names the result each destination needs, in GP-3's word limit: [GP-3](../vision-pillars.md#gp-3-mission-control-played-straight).

- It never names the agents to use or their order.
- It never lists marks as steps in order; the required output's drawing shows their order: [ITEM-04](../board/items.md#item-04-drawing).

### ORDER-02 Agents

An order's data is written → its agents come from the families of its act and of earlier acts, the act's own family among them: [Agent families](../data.md#agent-families).

- Order 1: one agent; order 2: two agents, and one winning wiring.
- From order 3: UnneededAgents agents beyond what a win needs.

### ORDER-03 Batch

An order's data is written → its batch holds BatchItems items, no two with the same kind and starting marks.

- Order 1: two or more items, each needing its one agent.
- Every item of a batch has a required output: [ITEM-01](../board/items.md#item-01-enter).
- The largest batch, its named copies included, holds fewer items than ItemBlocksMax: [Reports](../board/reports.md#parameters).

### ORDER-04 Hand-written results

An order's data is written → it holds HandResults hand-written results, each answering one item ending of a likely wrong wiring: [REPORT-01](../board/reports.md#report-01-form-and-lead).

- Each item ending is one some wiring of the order gives, found by a search over its wirings.
- Likely wrong wirings first: an agent skipped, two agents swapped, a check's plus and minus swapped, an unneeded agent used, a wire left out, a loop with no way out.

### ORDER-05 Second wirings

An order's data is written, for an order of three or more agents → it has at least two known winning wirings that differ in the agents some item passes, found by a search over its wirings.

- Ways to a second wiring: two checks that split one batch alike; two checks in either order; a kind change that sends an item back through a check; one worker in a loop against several of it in a chain; paths that share agents against paths of their own.
- A second wiring that only puts one numbered twin in another's place, with the same wires and run time, does not count.
- Each act holds an order with both pars and its `par` marked split: [Orders data](../data.md#orders), [PAR-01](../board/par-and-score.md#par-01-setting-par).

## Edge cases

- Two hand-written results one run gives: one leads, as REPORT-01 picks it: [REPORT-01](../board/reports.md#report-01-form-and-lead).
- **Derived:** orders 30, hand-written results 90, the system map's counts: [ORDER-04](#order-04-hand-written-results), [Orders](../system-map.md#orders).

## Links

- Order data: [Data](../data.md#orders).
- Repair orders: [Repair orders](repair-orders.md).
