# Vision and pillars

## Pitch

- A web wiring puzzle game about orchestrating machine agents at humanity's last Mission Control.
- The player wires each order's fixed set of agents at their own pace, output jack to input jack, with data wires and feedback wires, then runs the workflow and watches items flow; in later acts, repair orders open already wired and already failing.
- An order's input is a batch of different items, each with its own required output, all served by one wiring. An order may hold more agents than a win needs.
- Data wires carry items. A checking agent gives each item a verdict, and sends it along the feedback wire of that verdict, marked plus or minus: on to a later agent or an output terminal, or back to an earlier agent. The checking agent's face shows its pass limit; past it, the item is rejected.
- Each agent but a checking agent adds its mark to an item; an item shows its three latest marks. An output matches when its kind and marks equal the required ones, in order.
- Every run ends in a report: a mission report on a win, an incident report otherwise.
- An order is won when every output matches; its score is wires and run time against par, or moves for a repair order. A loop saves wires and costs run time; a chain through more agents does the reverse.
- A repair order's faults, its wrong wires, interact: fixing one can break another item. A move is one wire cut, moved or added.
- Achievements are made from the solutions the player finds, wrong and right.
- Each session plays one act of the campaign: a handful of orders, each act bringing a new agent family.

## Fantasy

- Player fantasy: the flight director of humanity's last Mission Control, the one calm engineer in the room. The staff is a wall of literal-minded machine agents. The player wires them into a workflow that turns an absurd urgent order, such as "Moon Base needs a birthday cake by 0900", into exactly the right result.
- Hook: every wrong wiring is written. Items carry their history, the latest three marks on their bodies and all of it in the report, so a wrong path builds its own absurd result, such as "a translated, shredded, then laminated peace treaty", drawn at the output. Mission Control files each one in an incident archive the player collects.
- Signature moment: the teletype incident report after a spectacular misfire: "SUMMARIZER condensed the President's address to humanity to: 'No.'" The misfire plays in the room first: the master alarm lamp, one tone, a beat of silence.

## Target player

- Ages 14 to 45 who play puzzle games in the browser or on a phone, in short breaks and evening sessions. They know Human Resource Machine, Baba Is You or Portal, and enjoy office and science-fiction comedy. A session is about 15 minutes: one act.
- Served first: the experimenter, who wires, runs and learns from what goes wrong. Served second: the optimizer, who replays to beat par.

## Platform

- Platform and devices: web browsers on desktop, laptop, tablet and phone.
- Screens: any size, per Screen fit; every order plays in both orientations. Preview screens: smallest 360×640 portrait, largest 1920×1080 landscape. Previews use both: PreviewSizes.
- Inputs: mouse, trackpad, touch.
- Engine: none. TypeScript in the browser; the wiring board drawn in SVG, so it stays sharp at every zoom. Versions: pinned in the build docs.
- Languages at first release: English only.

## Constraints

- Age rating: none fixed. Jokes follow the joke limits below.
- Joke limits, a soft guideline, not a hard rule: aim for ages 10 and up, with no violence, swearing or cruelty. Disasters stay absurd and hurt nobody on screen.
- Personal data and accounts: none. No account, no cookies. Progress is saved in this browser; the player can copy it out as a save code and paste it into another browser. The game offers the save code at the end of each act. It holds progress, best scores, achievements and the incident archive.
- Offline play: after the first load, every order plays offline.
- Screen fit: the wiring board pans and zooms like a map, so every order plays on every screen. Flow runs left to right in landscape, top to bottom in portrait. On touch, a drag from a jack draws a wire and a drag elsewhere pans; a tap on one jack, then on another, also draws one; a pinch zooms; a wire held at the screen edge pans the board. Zoom stops while jacks stay fingertip-sized. During a run, the view follows the batch's first item and ends framed on the outputs.

## Product goals

Business goal: a free web game, judged by how far players get.

- First session: 40% of players who start finish act 1, one session's worth of play. Measure: anonymous counts of starts and finishes per order, sent only while online; the step is on the product measures page.
- First release: 15% of players who start finish the last order of the first release. Measure: the same counts.

## Monetization

- Sold: nothing. Free to play in the browser.
- Never: ads; selling anything, ever.
- Running costs: static web hosting, at most $5 a month; the counting service, at most $5 a month.

## Game pillars

Moved to [Vision pillars](vision-pillars.md#game-pillars).

## Product pillars

Moved to [Vision pillars](vision-pillars.md#product-pillars).

## Reference games

- Human Resource Machine: takes the order as an input and a required output, met by building a process; leaves out program text.
- Opus Magnum: takes many winning solutions, each scored against a target; leaves out free placement of parts, and score charts that need a server.

## First release

Tags on the [System map](system-map.md) own first-release scope.
