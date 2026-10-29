# Incident archive

Design status: Defined.

## Goal

Incident archive: Mission Control's file of every report the player has printed, by order, with each order's count of hand-written results found. Serves GP-2.
Player decision: which wrong wiring to try next, to find an order's missing results. Feedback: "Results <found> of <HandResults>" at each order; the filed reports; the achievements beside them.
Flavour: a grey steel filing cabinet of formal records, each an absurd result stamped and kept.
Not owned here: a report's lines, [Reports](../board/reports.md); achievements, [Achievements](achievements.md); what a save keeps, [SAVE-01](../platform/saving.md#save-01-keep).

## Inputs

- A printed report: [REPORT-04](../board/reports.md#report-04-print).
- Each order's hand-written results: [ORDER-04](../orders/orders.md#order-04-hand-written-results).

## Outputs

- Filed: [REPORT-04](../board/reports.md#report-04-print), [VIEW-04](../board/run-view.md#view-04-full-alarm).
- Hand-written results found: [CAMPAIGN-04](campaign.md#campaign-04-act-end), [ACHIEVE-01](achievements.md#achieve-01-earn).
- Filed reports and results found, to keep: [SAVE-01](../platform/saving.md#save-01-keep).

## Parameters

- HandResults: [Orders parameters](../orders/orders.md#parameters).

## Mechanics

### ARCHIVE-01 File

A report prints for the first time → the archive files it under its order, with the run's wiring.

- Two reports are the same when every line is the same; the archive files one.
- A report whose lead is a hand-written result not yet found: that result is found, and the teletype prints "FILED: <found> of <HandResults>." in its place after the report: [CAMPAIGN-06](campaign.md#campaign-06-after-the-report).

### ARCHIVE-02 Browse

The player opens the archive → it lists the acts and orders the order list shows ([CAMPAIGN-05](campaign.md#campaign-05-order-list)), and at each order "Results <found> of <HandResults>".

- An order's filed reports, in this order: those led by hand-written results first, in result order, each result's newest first; then the rest, newest first.
- Each row: the report's lead; a mission report adds its wires and beats, or its moves.
- The win that lit the second-wiring lamp, as the save keeps it ([SAVE-01](../platform/saving.md#save-01-keep)): its row is marked "second wiring".
- A lit lamp whose report was dropped ([SAVE-05](../platform/saving.md#save-05-version)): no report is marked "second wiring".
- An order with no filed report and no result found: listed, with "Results 0 of <HandResults>".
- Where it shows: [Incident archive](../ui/archive.md).
- A result found whose filed report was dropped ([SAVE-05](../platform/saving.md#save-05-version)): listed by its line alone, in its result's place among the reports led by results, with no report to reprint.
- Beside each act: its achievements, earned and not: [ACHIEVE-02](achievements.md#achieve-02-show); a tap on a done act's heading: [CAMPAIGN-04](campaign.md#campaign-04-act-end).

### ARCHIVE-03 Reprint

The player opens a filed report → it prints at once, with its share control: [REPORT-04](../board/reports.md#report-04-print), [SHARE-01](report-sharing.md#share-01-text).

## Edge cases

- A run that gives a report already filed: nothing new is filed: [ARCHIVE-01](#archive-01-file).
- A hand-written result found again through another wiring: filed once as found; the new report is filed when its lines differ: [ARCHIVE-01](#archive-01-file).
- A mission report: filed as any report: [ARCHIVE-01](#archive-01-file).
- **Derived:** the most results to find: HandResults per order, 90 in all: [ORDER-04](../orders/orders.md#order-04-hand-written-results).

## Links

- Campaign: [Campaign](campaign.md).
- Sharing a filed report: [Report sharing](report-sharing.md).
