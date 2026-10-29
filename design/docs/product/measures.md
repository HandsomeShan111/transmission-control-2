# Product measures

Design status: Defined.

## Goal

Measures for [product goals](../vision.md#product-goals): anonymous events, each order's starts and finishes, sent only while online.

- **Derived:** events count browsers, not players; one player on two browsers counts up to twice: [MEAS-04](#meas-04-event-flags). Answer lost in flight sends event again, so it counts twice: [MEAS-03](#meas-03-send). Browser that keeps nothing counts each open as new, and its unsent events end with page: [SAVE-04](../platform/saving.md#save-04-no-keeping).

## Parameters

- **SendWait**: number, seconds. Start: 30. Range: 10 to 60.
- **CountAddress**: URL of game's GoatCounter site `/count` endpoint. Start: set before release, as GameLink is. Fixed.

## Mechanics

### MEAS-01 order_start

Player opens order ([BOARD-01](../board/wiring-board.md#board-01-open)); for order 1, new game's first tap that runs misfire ([CAMPAIGN-01](../campaign/campaign.md#campaign-01-opening-misfire)) → event `order_start` with fields `order`, `version`, if its flag is unset: [MEAS-04](#meas-04-event-flags). Measures First session and First release: order 1's events are players who start.

### MEAS-02 order_finish

Run's win of order is kept ([SAVE-01](../platform/saving.md#save-01-keep)) → event `order_finish` with fields `order`, `version`, if its flag is unset: [MEAS-04](#meas-04-event-flags). Measures First session, by act 1's last order against order 1's starts, and First release, by campaign's last order.

- Win carried by pasted save code: no event, flag stays unset; this browser's first run that wins it makes one.
- Won order replayed: flag set, no event.

### MEAS-04 Event flags

This browser keeps, beside its save, one event store: two event flags per order, `order_start` and `order_finish`, and queue of events. Trigger of [MEAS-01](#meas-01-order_start) or [MEAS-02](#meas-02-order_finish) fires → page takes event lock and reads store; flag unset → page sets flag and queues event, in one write; flag set → no event. Lock ends at write.

- Two pages open: page that takes lock first makes event; other reads flag set and makes none.
- Browser that keeps nothing: [SAVE-04](../platform/saving.md#save-04-no-keeping).

### MEAS-03 Send

Event queued → page holding send lock sends queue from page itself, one request per event, oldest first.

- Fields: `order`, order's number in [Orders data](../data.md#orders); `version`, GameVersion ([Offline play parameters](../platform/offline-play.md#parameters)). Each event keeps version it was made under, across new versions.
- Request: GET of GoatCounter count pixel at CountAddress, with `p`: event name, order number and version, joined by dashes, such as `order_start-7-1`; `e`: `true`.
- Request carries no cookie and no player or session ID.
- Sending starts when event is queued, at next open, and when browser reports it is back online. Another page holds send lock → page waits for it, then reads queue again. Send lock ends when queue is empty or sending stops.
- Pixel loads: sent; page takes event lock, reads store again, removes that one event; next event goes.
- Pixel fails to load, or no load within SendWait: event stays queued; sending stops until next start.
- Page closes → its locks end. Browser with no locks: page sends and writes without them, and two pages may count one event twice or lose one.
- Play never waits on request. The request is made by the page, never by a worker.
