# Test wirings

One winning wiring per order, for the tests that win one. Derived from the order data by the wiring search of the [Test build](acceptance.md#test-build); the build's search is the owner. Each meets the order's pars where one wiring can; where none meets both, one wiring meets each. A repair order: one fewest-move fix, written as the whole board after it.

## Act 1

- **1 Signing ceremony**: IN → LAMINATOR; LAMINATOR → World Council.
- **2 Victory parade**: IN → SHREDDER; LAMINATOR → Parade Control; SHREDDER → LAMINATOR.
- **3 Diplomatic pouch**: IN → INSPECTOR; INSPECTOR minus → SHREDDER 1; INSPECTOR plus → LAMINATOR; LAMINATOR → Embassy; SHREDDER 1 → INSPECTOR.
- **4 Archive day**: meets WirePar: IN → INSPECTOR; INSPECTOR minus → SHREDDER; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; SHREDDER → INSPECTOR. Meets TimePar: IN → INSPECTOR; INSPECTOR minus → SHREDDER; INSPECTOR plus → LAMINATOR 1; LAMINATOR 1 → Archive; SHREDDER → LAMINATOR 2; LAMINATOR 2 → Archive.
- **5 Museum split**: meets WirePar: IN → LAMINATOR 1; LAMINATOR 1 → INSPECTOR; INSPECTOR minus → Museum; INSPECTOR plus → Archive. A second wiring that counts as different, INSPECTOR before each LAMINATOR: IN → INSPECTOR; LAMINATOR 1 → Archive; LAMINATOR 2 → Museum; INSPECTOR minus → LAMINATOR 2; INSPECTOR plus → LAMINATOR 1.

## Act 2

- **6 Latin hour**: meets TimePar: IN → CENSOR; CENSOR minus → TRANSLATOR; CENSOR plus → Senate Archive; TRANSLATOR → Senate Archive.
- **7 Night broadcast**: IN → CENSOR; CENSOR minus → TRANSLATOR 1; CENSOR plus → TRANSLATOR 2; TRANSLATOR 1 → CENSOR; TRANSLATOR 2 → Radio Tower.
- **8 Treaty ceremony**: meets TimePar: IN → INSPECTOR; INSPECTOR minus → Canteen; INSPECTOR plus → CENSOR; CENSOR minus → TRANSLATOR; CENSOR plus → LAMINATOR; TRANSLATOR → LAMINATOR; LAMINATOR → Senate.
- **9 Colony bulletin**: meets WirePar: IN → CENSOR; CENSOR minus → INSPECTOR; CENSOR plus → LAMINATOR 1; INSPECTOR minus → LAMINATOR 1; INSPECTOR plus → SUMMARIZER; SUMMARIZER → TRANSLATOR; TRANSLATOR → CENSOR; LAMINATOR 1 → Colonies. Meets TimePar: IN → CENSOR; CENSOR minus → INSPECTOR; CENSOR plus → LAMINATOR 1; INSPECTOR minus → LAMINATOR 2; INSPECTOR plus → SUMMARIZER; SUMMARIZER → TRANSLATOR; TRANSLATOR → LAMINATOR 1; LAMINATOR 1 → Colonies; LAMINATOR 2 → Colonies.
- **10 Senate recess**: meets TimePar: IN → INSPECTOR; INSPECTOR minus → SHREDDER; INSPECTOR plus → CENSOR; CENSOR minus → TRANSLATOR; CENSOR plus → Senate; SHREDDER → TRANSLATOR; TRANSLATOR → Senate.

## Act 3

- **11 Picnic day**: meets both pars: IN → INSPECTOR; INSPECTOR minus → Canteen; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive.
- **12 Signing party**: meets both pars: IN → INSPECTOR; INSPECTOR minus → BAKER; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive; BAKER → Canteen.
- **13 Embassy dinner**: meets both pars: IN → INSPECTOR; INSPECTOR minus → SLICER; INSPECTOR plus → LAMINATOR; SLICER item → Canteen; SLICER copy → LAMINATOR; LAMINATOR → Embassy.
- **14 Moon Base birthday**: meets WirePar: IN → TASTER; TASTER minus → BAKER; TASTER plus → SLICER 1; SLICER 1 item → Moon Base; SLICER 1 copy → Moon Base; BAKER → TASTER. Meets TimePar: IN → TASTER; TASTER minus → BAKER; TASTER plus → SLICER 2; SLICER 1 item → Moon Base; SLICER 1 copy → Moon Base; BAKER → SLICER 1; SLICER 2 item → Moon Base; SLICER 2 copy → Moon Base.
- **15 State banquet**: meets TimePar: IN → TASTER; INSPECTOR minus → BAKER; INSPECTOR plus → LAMINATOR; TASTER minus → INSPECTOR; TASTER plus → SLICER; LAMINATOR → Banquet; BAKER → Banquet; SLICER item → Banquet; SLICER copy → Banquet.

## Act 4

- **16 Scrap drive**: meets TimePar: IN → GAUGE; GAUGE minus → SHREDDER; GAUGE plus → Hangar; SHREDDER → COMPACTOR; COMPACTOR → Hangar.
- **17 Night scrap run**: fix: IN → INSPECTOR; INSPECTOR minus → GAUGE; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive; GAUGE minus → COMPACTOR; GAUGE plus → Hangar; COMPACTOR → Hangar; SHREDDER → Hangar.
- **18 Moving day**: meets WirePar: IN → GAUGE; GAUGE minus → COMPACTOR; GAUGE plus → LAMINATOR 1; COMPACTOR → RESTORER; LAMINATOR 1 → Moon Base; RESTORER → LAMINATOR 1. Meets TimePar: IN → GAUGE; GAUGE minus → COMPACTOR; GAUGE plus → LAMINATOR 2; COMPACTOR → RESTORER; LAMINATOR 1 → Moon Base; RESTORER → LAMINATOR 1; LAMINATOR 2 → Moon Base.
- **19 Museum move**: fix: IN → GAUGE; GAUGE minus → INSPECTOR; GAUGE plus → Museum; COMPACTOR → RESTORER; INSPECTOR minus → COMPACTOR; INSPECTOR plus → LAMINATOR; RESTORER → Museum; LAMINATOR → Museum.
- **20 Recycling day**: meets TimePar: IN → TASTER; GAUGE minus → COMPACTOR; GAUGE plus → Hangar; TASTER minus → GAUGE; TASTER plus → SLICER; COMPACTOR → Hangar; SLICER item → Canteen; SLICER copy → COMPACTOR.

## Act 5

- **21 Form week**: meets both pars: IN → STAMPER 1; TALLY minus → STAMPER 1; TALLY plus → Bureau; STAMPER 1 → TALLY.
- **22 Night audit**: fix: IN → INSPECTOR; INSPECTOR minus → Canteen; INSPECTOR plus → TALLY; TALLY minus → STAMPER; TALLY plus → SEALER; SEALER → Archive; STAMPER → TALLY.
- **23 Seal of office**: meets WirePar: IN → TALLY; TALLY minus → STAMPER 1; TALLY plus → SEALER; STAMPER 1 → TALLY; SEALER → Archive. Meets TimePar: IN → TALLY; TALLY minus → STAMPER 1; TALLY plus → SEALER; STAMPER 1 → STAMPER 2; STAMPER 2 → STAMPER 3; STAMPER 3 → SEALER; SEALER → Archive.
- **24 Embassy mail**: fix: IN → CENSOR; CENSOR minus → TALLY; CENSOR plus → SEALER; SEALER → Senate; TALLY minus → STAMPER 1; TALLY plus → Bureau; STAMPER 1 → TALLY.
- **25 Grand audit**: meets WirePar: IN → CENSOR; CENSOR minus → TRANSLATOR; CENSOR plus → TALLY; TRANSLATOR → CENSOR; TALLY minus → STAMPER 1; TALLY plus → SEALER; STAMPER 1 → TALLY; SEALER → Senate. Meets TimePar: IN → CENSOR; CENSOR minus → TRANSLATOR; CENSOR plus → TALLY; TRANSLATOR → STAMPER 1; TALLY minus → STAMPER 1; TALLY plus → SEALER; STAMPER 1 → STAMPER 2; STAMPER 2 → TALLY; SEALER → Senate.

## Act 6

- **26 Launch window**: meets TimePar: IN → VERIFIER; VERIFIER minus → WRAPPER; VERIFIER plus → Launch Pad; WRAPPER → Launch Pad.
- **27 Priority mail**: meets both pars: IN → WRAPPER; WRAPPER → VERIFIER; VERIFIER minus → LABELLER; VERIFIER plus → Launch Pad; LABELLER → Launch Pad.
- **28 Night freight**: fix: IN → INSPECTOR; INSPECTOR minus → Canteen; INSPECTOR plus → WRAPPER; WRAPPER → VERIFIER; VERIFIER minus → LABELLER; VERIFIER plus → Launch Pad; LABELLER → Launch Pad; SEALER → Launch Pad.
- **29 Last mail**: fix: IN → CENSOR; CENSOR minus → GAUGE; CENSOR plus → WRAPPER; GAUGE minus → TRANSLATOR; GAUGE plus → WRAPPER; TRANSLATOR → CENSOR; WRAPPER → VERIFIER; VERIFIER minus → LABELLER; VERIFIER plus → Moon Base; LABELLER → Colonies.
- **30 Final launch**: meets WirePar: IN → TASTER; TASTER minus → WRAPPER 1; TASTER plus → SLICER; WRAPPER 1 → VERIFIER; SLICER item → WRAPPER 1; SLICER copy → WRAPPER 1; VERIFIER minus → LABELLER; VERIFIER plus → Moon Base; LABELLER → Moon Base. Meets TimePar: IN → TASTER; TASTER minus → WRAPPER 1; TASTER plus → SLICER; WRAPPER 1 → VERIFIER; SLICER item → WRAPPER 1; SLICER copy → WRAPPER 2; WRAPPER 2 → LABELLER; VERIFIER minus → LABELLER; VERIFIER plus → Moon Base; LABELLER → Moon Base.
