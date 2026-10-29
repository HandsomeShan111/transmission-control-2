# Open questions

Each entry is a gap nobody has decided yet: missing, incomplete or conflicting.
Decisions never live here: a decided question leaves its area file and becomes a rule.

Entry fields:

- **Gap:** what is missing or conflicts; only the open part.
- **First release:** "blocks" or "does not block".
- **Blocks:** what cannot be designed, built or tuned until it is decided.
- **Step:** where the decided part lives and where the answer goes.
- **Settled by:** optional. An engine spike and what it tries, or who decides it.

Pages cite open questions by ID only, in one `Open:` line at the end of a step.

## Areas

- [Game](open-questions/game.md): vision gaps.
- [Board](open-questions/board.md): wiring, agents, items, run, reports, par.
- [Orders](open-questions/orders.md): orders and repair orders.
- [Campaign](open-questions/campaign.md): acts, archive, achievements, sharing.
- [Platform](open-questions/platform.md): saving, offline play, settings.
- [Product](open-questions/product.md): product measures.

## IDs

- ID form: `OQ-<AREA>-<NN>`, such as `OQ-GAME-01`. Area part: capital letters only. Heading: `### OQ-<AREA>-<NN> <Title>`.
- IDs are stable. Never reused or renumbered.
- New ID: next free number in its area, decided IDs included.

## Recording an answer

- Fully decided → rule written into its step, entry deleted. One commit.
- Partly decided → decided part into its step; the entry keeps only the open part.

## Blocks first release

Entries marked "blocks" block first release. None may be left when design ends. An engine spike is marked "does not block": design ends without it; the build order runs it first.

List them: `grep -rn -B1 'First release:\*\* blocks' docs/open-questions`.
