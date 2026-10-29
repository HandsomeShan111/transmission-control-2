# Par and score

Design status: Defined.

## Goal

Par and score: a won order's wires and run time, each against its own par, so a second, leaner wiring is worth finding. Serves GP-4.
Player decision: after a win, chase the wire par with a loop, or the time par with a longer chain, or stop. Feedback: the mission report's score lines; a lit par lamp on the order for each par met.
Flavour: the flight director's log: hardware used and time on the clock, against the best the department knows.
Not owned here: repair orders' moves, [REPAIR-03](../orders/repair-orders.md#repair-03-score); keeping best scores, [Platform](../system-map.md#platform).

## Inputs

- A won run, its wiring and its run time: [RUN-08](run.md#run-08-result), [Wires](wires.md).
- The order's WirePar and TimePar: [Orders](../system-map.md#orders).

## Outputs

- Score lines: [REPORT-01](reports.md#report-01-form-and-lead).
- Pars met and best scores: [Campaign](../system-map.md#campaign), [Platform](../system-map.md#platform).

## Parameters

- **WirePar**: integer, wires, or none. Start: per order, by [PAR-01](#par-01-setting-par). Fixed.
- **TimePar**: integer, beats, or none. Start: per order, by [PAR-01](#par-01-setting-par). Fixed.

## Mechanics

### PAR-01 Setting par

An order's data is written, for an order that is no repair order → its WirePar is the fewest wires of any winning wiring known for it, and its TimePar the fewest beats of any winning wiring known for it.

- Known: found by a search over all the order's wirings, or by the designer when a search cannot cover the order.
- The two may come from different wirings.
- All known winning wirings use the same number of wires → the order has no WirePar. All take the same run time → no TimePar.

### PAR-02 Score

A run of an order that is no repair order is won → its score: its wire count, every wire on the board; and its run time, in beats.

- Wires at or under WirePar → wire par met. Run time at or under TimePar → time par met. Each is met on its own.
- The mission report prints "Wires <count>" and "Time <run time>"; for each par the order has, ", par <par>" and, when met, " Par met."; e.g. "Wires 5, par 4.", "Time 8, par 8. Par met.", "Time 6."
- An order whose `par` is split ([Orders data](../data.md#orders)) also prints: "Best known: one wiring for each par."

### PAR-03 Best

A run of an order that is no repair order is won → the order keeps its fewest wires and its fewest beats over all its wins, each on its own, and whether each par was ever met.

- The order shows a par lamp for each par it has, lit once that par is met.

## Edge cases

- A wire that carried nothing: counted: [PAR-02](#par-02-score).
- A win under par: par met, and the order's best shows it: [PAR-02](#par-02-score), [PAR-03](#par-03-best).
- A failed run: no score: [PAR-02](#par-02-score).
- **Derived:** a wiring meeting both pars exists only where one known wiring is leanest on both: [PAR-01](#par-01-setting-par).

## Links

- What a loop and a chain cost: [Run](run.md).
