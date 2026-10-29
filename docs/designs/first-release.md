# Brief: Transmission Control 2, first playable release

## The problem

The Transmission Control 2 design is finished and approved. It covers the vision, every rule, 30 orders with their texts and jokes, the look, the sound, the screens and one acceptance test per rule.

Nobody can play it yet. This task turns that design into the game and publishes it on GitHub Pages, free in any browser.

## Who it is for

- Players aged 14 to 45 who play short puzzle games in a browser or on a phone. One act takes about 15 minutes.
- First served: the experimenter, who wires, runs and laughs at what goes wrong.
- Second served: the optimizer, who replays an order to beat par.
- You, the owner: one link to share, and counts of how far players get.

## What exists today

- The design: 36 rule and screen pages marked buildable, a build order, acceptance tests, tuning values and one winning wiring per order.
- A small toy of the core loop and previews of the four screens, made during the design.
- No game code. This project is empty.

## Approaches considered

- Act 1 first, rest later. Five orders, published soon. Rejected: the campaign, archive, achievements and saving reach their designed form only with all six acts, and it needs two releases.
- Whole first release, as designed. All six acts and 30 orders, with everything the design marks for first release. Matches the approved design one to one. The longest build.
- A game engine drawing on a canvas. Rejected: the design rules out engines, needs sharp drawing at every zoom, and caps the first load at 1 MB.

## Chosen approach

Whole first release, as designed. It is built in the design's own order, with act 1 playable first as a checkpoint. Every rule is checked against its acceptance test, and every order against its winning wiring. After the first playable build, an agent plays the campaign once and reports where it stops being fun; one round of fixes follows, inside the design's rules. An early check settles the one question the design left open: how a phone's silent switch treats the game's sounds.

What the player gets:

- Six acts, 30 orders, six of them repair orders that open already wired and failing.
- 18 agents in six departments: Records, Comms, Galley, Workshop, Audit, Dispatch.
- A wiring board that pans and zooms like a map, by mouse, trackpad or touch, in portrait and landscape, on any screen size.
- Every run ends in a printed mission or incident report. Reports are filed in the incident archive.
- Scores against par: wires and run time, or moves on repair orders. 18 achievements.
- A report shared as text, or as a picture with the link and a QR code.
- Progress kept in this browser, and a save code to carry it to another one. No account, no cookies.
- Plays offline after the first load. Sound on or off. English only.
- The look of 1970s mission control, all drawn in the page. No pictures or fonts to download. Sounds made in the browser.

## Where it lives

- Published on GitHub Pages from this project, at handsomeshan111.github.io/transmission-control-2, at each release.
- Before release, you test it on a private test link.

## Success criteria

- Every order is winnable, and its winning wiring from the design wins it.
- Every acceptance test in the design passes.
- The first load is 1 MB or less, compressed, as sent.
- It plays in Chrome and Edge 124, Firefox 125 and Safari 17.4 or later, on desktop and phone, in both orientations. I check it in each browser's engine at phone and desktop sizes; you check it on a real phone at Test.
- It plays offline after the first load.
- You open the public address and play act 1 to its end.
- Tracked after launch, once counts are on: 40% of players who start finish act 1; 15% finish the last order. These are the design's product goals.

## Dependencies

- GitHub Pages switched on for this project's repository. A free GitHub plan publishes only a public repository.
- A free GoatCounter counter for the anonymous player counts.

## Out of scope

- Hints: the design marks them for later.
- Languages other than English.
- Accounts, leaderboards, ads, anything sold.
- The benchmark against the first Transmission Control game. The design run left it to the build; it compares this game with the earlier one.
- Changes to the design's rules. Where the design is silent, I decide within its rules and list each such decision in the test report.

## Scope

Scope is held as you approved it: the whole first release, nothing added, nothing cut.

In:

- Every system the design marks for first release: the wiring board, wires, agents, items, the run and its view, reports, par and score, orders and repair orders, the campaign, the incident archive, achievements, report sharing, saving, offline play, the sound setting and the player counts.
- All content the design lists: 30 orders, 18 agents, 12 item kinds, 216 report lines, 90 hand-written results, 18 achievements, 9 sounds, 4 screens.
- One test per design rule, run on every change. Every order is won by the design's winning wiring in those tests.
- Automatic publishing to GitHub Pages at each release.

Out: as listed under "Out of scope".

Risks and how they are handled:

- A bad release on the public address. Publishing runs only after the tests pass. Going back is one step: publish the previous version again.
- Players keep an old version offline. The design already covers it: a new version downloads in the background and starts at the next open. Each release raises the game's version number, so saves carry over.
- A save code pasted by hand is broken or edited. The game reads only what it expects, prints "CODE NOT READ" for anything else, and never runs it.
- A browser that keeps nothing, such as a private window. The design prints its no-keeping line, and play goes on.
- Clipboard or share sheet blocked. The design's fallback lines tell the player to select and copy by hand.
- The counter is unreachable. Counts wait in the browser and send later; play never waits for them.
- The first load grows past 1 MB. A size check runs with the tests and stops the build.
- Slow phones. The board is checked at phone size with the run on fast-forward, the busiest moment.
- The game itself breaks on a player's machine. The game sends nothing but the counts, so such faults reach us only through players. Accepted, as the design rules out any other data.

## Next steps

1. Scope, then the system architecture: a static game, no server.
2. Build in the design's order, act 1 first, then the agent playtest.
3. Code review, a second opinion, a visual check.
4. Test with you on the test link.
5. Publish on GitHub Pages.
