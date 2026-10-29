<!-- tab: Scope -->
# Transmission Control 2: scope

Agreed 28 Oct 2026, from signed-off Brief and Scope. Design source: Transmission Control 2 design, copied in `design/`.

## Problem

Design finished and approved: vision, every rule, 30 orders with texts and jokes, look, sound, screens, one acceptance test per rule. Nobody can play it yet. This project builds that game and publishes it on GitHub Pages, free in any browser.

## Who it serves

- Players aged 14 to 45 who play short puzzle games in browsers or on phones. One act: about 15 minutes.
- Experimenter, served first: wires, runs, laughs at what goes wrong.
- Optimizer, served second: replays orders to beat par.
- Owner: one link to share; counts of how far players get.

## What exists

- Design: 36 rule and screen pages marked buildable, build order, acceptance tests, tuning values, one winning wiring per order.
- Core-loop toy and previews of four screens, from design run.
- No game code before this project.

## Approach

Whole first release, as designed, in design's own build order; act 1 playable first as checkpoint.

- Every rule checked against its acceptance test; every order against its winning wiring.
- After first playable build: one agent playtest of campaign, one round of fixes inside design's rules.
- Early check of phone silent switch and game sounds: design's one open question.
- Rejected: act 1 alone first (campaign, archive, achievements and saving need all six acts; two releases).
- Rejected: game engine on canvas (design rules out engines; needs sharp drawing at every zoom; first load capped at 1 MB).

## In scope

- Six acts, 30 orders; six repair orders open already wired and failing.
- 18 agents in six departments: Records, Comms, Galley, Workshop, Audit, Dispatch.
- Wiring board panned and zoomed like map, by mouse, trackpad or touch; portrait and landscape; any screen size.
- Every run ends in printed mission or incident report, filed in incident archive.
- Scores against par: wires and run time, or moves on repair orders. 18 achievements.
- Report sharing as text, or as picture with link and QR code.
- Progress kept in browser; save code carries it to another browser. No account, no cookies.
- Offline play after first load. Sound on or off. English only.
- 1970s mission-control look, all drawn in page: no picture or font downloads. Sounds made in browser.
- Anonymous counts of order starts and finishes through GoatCounter; nothing sent until owner gives counter address.
- One test per design rule on every change; automatic publishing to GitHub Pages at each release.

## Where it lives

- GitHub Pages, handsomeshan111.github.io/transmission-control-2, at each release.
- Address is 48 characters, over design's 30; QR code on shared pictures gets one size denser. Agreed with owner.
- Repository made public at release: free GitHub plan publishes only public repositories. Agreed with owner.
- Before release: owner tests on private test link.

## Success criteria

- Every order winnable; its design winning wiring wins it.
- Every design acceptance test passes.
- First load 1 MB or less, compressed, as sent.
- Plays in Chrome and Edge 124, Firefox 125, Safari 17.4 or later; desktop and phone; both orientations.
- Plays offline after first load.
- Owner opens public address and plays act 1 to its end.
- Tracked after launch, once counts are on: 40% of players who start finish act 1; 15% finish last order.

## Risks and handling

- Bad release on public address: publishing runs only after tests pass; rollback publishes previous version again.
- Old version kept offline: new version downloads in background, starts at next open; each release raises game version; saves carry over.
- Broken or edited save code: game reads only expected fields, prints "CODE NOT READ" otherwise, never runs it.
- Browser that keeps nothing, such as private window: design's no-keeping line prints; play goes on.
- Clipboard or share sheet blocked: design's fallback lines ask player to select and copy by hand.
- Counter unreachable: counts wait in browser, send later; play never waits.
- First load past 1 MB: size check runs with tests, stops build.
- Slow phones: board checked at phone size with run on fast-forward, busiest moment.
- Game faults on players' machines: game sends nothing but counts, so such faults reach owner only through players. Accepted; design rules out other data.

## Out of scope

- Hints: design marks them for later.
- Languages other than English.
- Accounts, leaderboards, ads, anything sold.
- Benchmark against first Transmission Control game: separate task after release.
- Changes to design's rules. Where design is silent, builder decides within its rules and lists each decision in test report.
- Help for stuck players beyond reports; text size and motion settings.
