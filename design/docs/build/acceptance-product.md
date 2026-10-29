# Acceptance tests, Product

Tests for the Product steps, in build order. Form and pass rule: [Acceptance tests](acceptance.md).

## Product measures

- **MEAS-01**: Setup: CountAddress at a test receiver; a new game with an empty event store; GameVersion. Do: take the first tap, which runs the opening misfire; close the report and the memo, so order 1 Signing ceremony opens; win it; open order 2 Victory parade; leave and open order 2 again. Expect: [MEAS-01](../product/measures.md#meas-01-order_start).
- **MEAS-02**: Setup: CountAddress at a test receiver; an event store with the order_finish flag of orders 1 Signing ceremony and 2 Victory parade unset; a save code from another browser that holds order 2 won; GameVersion. Do: win order 1; win it again; read the save code through LOAD SAVE CODE; win order 2. Expect: [MEAS-02](../product/measures.md#meas-02-order_finish).
- **MEAS-03**: Setup: CountAddress at a test receiver that can answer, stall past SendWait, or refuse; SendWait; GameVersion; a new game, the connection off. Do: run the opening misfire, win order 1 Signing ceremony, open order 2 Victory parade; turn the connection on. With the receiver stalled past SendWait, win order 2, then reload. With two pages open, queue an event in one. Queue an event, then open the game under a build with GameVersion raised. Play on while a request stalls. Check each request's method, fields, cookies and initiator. Expect: [MEAS-03](../product/measures.md#meas-03-send).
- **MEAS-04**: Setup: CountAddress at a test receiver; two pages of the game open on one browser, both on the order list, order 2 Victory parade unlocked, its order_start flag unset; a test hook that holds a page between taking the event lock and its write. Do: open order 2 in both pages at once; reload both; open order 2 again. Repeat in a browser that keeps nothing. Expect: [MEAS-04](../product/measures.md#meas-04-event-flags).
