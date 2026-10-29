# Achievements

Design status: Defined.

## Goal

Achievements: three per act, earned by the wrong and the right solutions the player finds. Serves GP-2, GP-4.
Player decision: wire wrong on purpose to find an act's results; replay a won order for a second wiring or a par. Feedback: a teletype line when one is earned; each act's achievements in the archive and its debrief.
Flavour: commendations in the staff file, signed by a committee nobody has met.
Not owned here: results found, [ARCHIVE-01](incident-archive.md#archive-01-file); pars met, [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score); unlocking, [CAMPAIGN-02](campaign.md#campaign-02-unlock).

## Inputs

- Hand-written results found: [ARCHIVE-01](incident-archive.md#archive-01-file).
- A won run's wiring: [RUN-08](../board/run.md#run-08-result).
- Pars met: [PAR-03](../board/par-and-score.md#par-03-best), [REPAIR-03](../orders/repair-orders.md#repair-03-score).
- Each achievement's name and line: [Achievements data](../data.md#achievements).

## Outputs

- Achievements earned: [ARCHIVE-02](incident-archive.md#archive-02-browse), [CAMPAIGN-04](campaign.md#campaign-04-act-end), [SAVE-01](../platform/saving.md#save-01-keep).

## Mechanics

### ACHIEVE-01 Earn

A report prints, or a save code is read ([SAVE-03](../platform/saving.md#save-03-paste-in)) → each achievement whose kind is met is earned, once, of the order's act after a report, of every act after a code:

- Results: every hand-written result of the act's orders is found.
- Second wirings: every order of the act that counts for second wirings ([ORDER-05](../orders/orders.md#order-05-second-wirings)), repair orders aside, has its second-wiring lamp lit: [CAMPAIGN-05](campaign.md#campaign-05-order-list).
- Par: every par of the act's orders is met, in one run or in several: WirePar, TimePar and MovePar, each that is not none.

### ACHIEVE-02 Show

An achievement is earned → in its place after the report, a line prints: "COMMENDATION: <name>. <line>": [CAMPAIGN-06](campaign.md#campaign-06-after-the-report).

- After a save code is read: only those neither save held print, after "SAVE CODE READ", in act order, each act's in kind order, the bell before the first of all, as [CAMPAIGN-06](campaign.md#campaign-06-after-the-report) item 3 rings it. Those the code carries as earned print nothing: [SAVE-03](../platform/saving.md#save-03-paste-in).
- The archive shows each act's achievements beside its orders, earned ones with their line, the rest with their kind only.
- An earned achievement stays earned.

## Edge cases

- Two achievements earned by one report: both lines print: [CAMPAIGN-06](campaign.md#campaign-06-after-the-report).
- A player who never earns one: every order is still unlocked; achievements never gate progress: [CAMPAIGN-02](campaign.md#campaign-02-unlock).
- An order's two pars met by two different wirings: par is met for both: [ACHIEVE-01](#achieve-01-earn).
- **Derived:** achievements: three kinds in each of the Acts, 18 in all, the system map's count: [ACHIEVE-01](#achieve-01-earn), [Campaign parameters](campaign.md#parameters).

## Links

- Achievements data: [Data](../data.md#achievements).
- Where they show: [Incident archive](incident-archive.md), [Campaign](campaign.md).
