# Code review and second opinion

Reviews of the whole game's code: once before the visual check, and once more after your changes at Test and Trial. Status: every finding below fixed, or kept out with its reason.

## Code review

Six reviewers read the game in parallel, one area each: core rules; board and look; saving, offline play and publishing; campaign and collection; tests; and failure modes across all of them. A second model ran its own attack pass.

Fixed, as a player would see them:

- A crafted save code of a few hundred characters could freeze the game for minutes. Codes repeating a report are now refused, a code holds at most 500 reports (a full campaign files about 121), and the worst code reads in under a second.
- The published site carried the test sandbox and the design gallery. It now ships only the game, and the build fails if anything else lands in it.
- Turning the phone mid-drag could leave a ghost wire. Opening another order mid-run could print the old order's report over the new one. RUN pressed while a report tore away was ignored. All fixed, each with a browser test.
- A browser that blocks site data broke saving and loading codes. It now plays on without keeping, as the design says.
- Two pages of the game at once could lose events when the browser has no locks.
- The offline file check accepted any file of the right size; it now checks each file's fingerprint, and a broken or stale cache no longer passes as kept.
- The unlock line lost its double strike when a commendation printed with it; the bell could ring with no commendation; the 2ND WIRING lamp lit before its line printed; the order list jumped back to the top after each change.
- The shared picture rings both marks of a first difference, as a result row does; a double tap on PICTURE no longer saves twice.
- Undo steps are capped at the newest 200 per order, so one long session cannot fill the browser's storage.

Tests: every acceptance test in the design now has a test named by its id, and a check fails when one goes missing. Nine tests that could never fail now check what they claim.

## Second opinion

A second model reviewed the fixed code. Seven findings.

Fixed:

- A win could be lost when the page closed while another page of the game held the save lock. Waiting writes are now made at once when the page hides or closes.
- When the browser had dropped the game's files but kept its offline worker, the game claimed to work offline and then failed. It now fetches the files again.
- File checks now use content fingerprints, not size alone.

Kept out:

- Counts are never sent: the counter address stays empty until you give it, as agreed in the Brief.
- Browser tests do not run in the publishing step: they run here before every release, and the publishing step runs the rule tests and type check.
- A press cancelled mid-drag was said to block the next tap on a printout: not so, the next press clears it.
- Reading a code of 500 crafted reports takes up to about 0.6 seconds on this machine: accepted.

## Final round, after your changes

Two reviewers read the whole branch again, one by checklist, one attacking it; then a second model. 21 findings, none critical.

Fixed, as a player would see them:

- Keys pressed by keyboard while a printout lay on the screen could hide it where nobody could close it. Now only AUDIO answers under a printout, by keyboard as by touch.
- A double click on START or CONTINUE also pressed the next screen: it ran the opening misfire or opened an order. Now one press.
- After another page of the game saved, the medal walls showed the old medals and progress. Now they follow the save.
- PICTURE and SAVE CODE clicked on a press that did nothing.
- After NEXT, a run started as the next act's memo closed was cut off when the next order opened. Now NEXT gives way.
- Keyboard focus left a key when the keys were laid out again, as at a run's start. Now it stays.
- Screen readers: keys are read in the order they stand, a held key is read as the current screen, and the title has one heading.

Tests: tests that could never fail now check what they claim, among them the zoom out to the whole board for every order.

## Checks after the fixes

- Rule tests: 273 pass.
- Browser tests in Chromium, phone and desktop sizes: every test passes. Firefox runs once more at Release. Safari's engine cannot run on this machine; you check a real phone at Test.
- Game files: 96 KB compressed, limit 1 MB.

## Decisions where the design is silent

- Save codes hold at most 500 filed reports.
- Undo keeps the newest 200 steps per order.
- A failed shared picture prints "PICTURE NOT MADE."
- A save kept by a newer version of the game is never written back by an older one.
