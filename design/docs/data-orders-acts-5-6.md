# Data, orders, acts 5 and 6

Design status: Defined.

Part of [Data](data.md#orders): orders 21 to 30, acts AUDIT and DISPATCH. Fields: [Orders](data.md#orders).

## Orders

### 21 Form week

- act: 5. repair: no.
- text: "Form week: the Bureau takes exactly three APPROVED stamps per file."
- agents: TALLY at 1/1, pass limit 4; STAMPER at 2/2; STAMPER at 2/0.
- destinations: Bureau.
- batch:
  - Treaty → Bureau: Treaty, approved, approved, approved
  - Address [approved] → Bureau: Address, approved, approved, approved
  - Coffee [approved, approved] → Bureau: Coffee, approved, approved, approved
- opening: none.
- results:
  - 1 at Bureau: Treaty, approved. "The Bureau returned it for two more stamps."
  - 1 at Bureau: Treaty, untouched. "Three clerks fainted at the unstamped treaty."
  - 1 at Bureau: Treaty, approved, approved, approved, approved. "The Bureau rejected it for excess approval."
- par: wires 4, time 8.

### 22 Night audit

- act: 5. repair: yes.
- text: "Night audit: the Archive takes papers sealed over exactly three stamps; cake to the Canteen."
- agents: INSPECTOR at 1/0, pass limit 2; TALLY at 2/1, pass limit 4; STAMPER at 3/2; SEALER at 3/0; SHREDDER at 2/2.
- destinations: Archive; Canteen.
- batch:
  - Treaty → Archive: Treaty, approved, approved, approved, sealed
  - Cake → Canteen: Cake, untouched
  - Address [approved, approved] → Archive: Address, approved, approved, approved, sealed
- opening: IN → INSPECTOR; INSPECTOR minus → Canteen; INSPECTOR plus → TALLY; TALLY minus → STAMPER; STAMPER → SEALER; SEALER → Archive.
- results:
  - 1 at Archive: Treaty, approved, sealed. "One stamp, then sealed against the other two."
  - 1 stopped at TALLY: Treaty, approved, approved, approved. "TALLY counted three stamps, then nowhere to send it."
  - 2 at Archive: Cake, approved, approved, approved, sealed. "An approved, sealed cake is now a legal document."
- par: moves 2.

### 23 Seal of office

- act: 5. repair: no.
- text: "Seal of office: every file sealed over exactly three marks."
- agents: TALLY at 1/1, pass limit 4; STAMPER at 2/0; STAMPER at 2/2; STAMPER at 3/2; SEALER at 4/1.
- destinations: Archive.
- batch:
  - Treaty → Archive: Treaty, approved, approved, approved, sealed
  - Sandwich → Archive: Sandwich, approved, approved, approved, sealed
  - Star chart [translated, laminated, approved] → Archive: Star chart, translated, laminated, approved, sealed
- opening: none.
- results:
  - 1 at Archive: Treaty, sealed. "A sealed, unapproved treaty: nobody may sign it."
  - 1 at Archive: Treaty, approved, approved, sealed. "One stamp short, sealed for good."
  - 1 at Archive: Treaty, approved, approved, approved. "Unsealed, three senators amended it."
- par: wires 5, time 7, split.

### 24 Embassy mail

- act: 5. repair: yes.
- text: "Embassy mail, wired overnight: Latin sealed for the Senate; the rest to three stamps for the Bureau."
- agents: CENSOR at 1/1, pass limit 2; SEALER at 2/0; TALLY at 2/2, pass limit 4; STAMPER at 3/2; STAMPER at 3/0.
- destinations: Senate; Bureau.
- batch:
  - Treaty [translated] → Senate: Treaty, translated, sealed
  - Address [approved] → Bureau: Address, approved, approved, approved
  - Star chart [approved, approved, approved] → Bureau: Star chart, approved, approved, approved
- opening: IN → CENSOR; CENSOR plus → TALLY; CENSOR minus → SEALER; SEALER → Senate; TALLY minus → SEALER; STAMPER 1 → TALLY; TALLY plus → Bureau.
- results:
  - 2 at Senate: Address, approved, sealed. "The Senate cannot open the sealed address."
  - 2 at Bureau: Address, approved. "The address came back two stamps short."
  - 1 at Bureau: Treaty, translated, approved, approved. "The Bureau approved a Latin treaty unread."
- par: moves 3.

### 25 Grand audit

- act: 5. repair: no.
- text: "Grand audit: the Senate takes Latin files sealed over exactly three marks."
- agents: CENSOR at 1/0, pass limit 2; TRANSLATOR at 2/0; TALLY at 2/2, pass limit 4; STAMPER at 3/2; STAMPER at 3/0; SEALER at 4/1.
- destinations: Senate.
- batch:
  - Treaty → Senate: Treaty, translated, approved, approved, sealed
  - Address [translated] → Senate: Address, translated, approved, approved, sealed
  - Star chart [translated, approved, approved] → Senate: Star chart, translated, approved, approved, sealed
- opening: none.
- results:
  - 1 at Senate: Treaty, approved, approved, approved, sealed. "A sealed English treaty stays foreign."
  - 2 at Senate: Address, translated, translated, approved, sealed. "Translated twice into English, sealed as Latin."
  - 1 at Senate: Treaty, translated, approved, approved. "Unsealed, the treaty was amended by passers-by."
- par: wires 8, time 8, split.

### 26 Launch window

- act: 6. repair: no.
- text: "Launch window: everything flies wrapped. Some cargo already is."
- agents: VERIFIER at 1/1, pass limit 2; WRAPPER at 2/2; LABELLER at 2/0.
- destinations: Launch Pad.
- batch:
  - Satellite → Launch Pad: Satellite, wrapped
  - Flag [wrapped] → Launch Pad: Flag, wrapped
  - Spacesuit → Launch Pad: Spacesuit, wrapped
- opening: none.
- results:
  - 2 at Launch Pad: Flag, wrapped, wrapped. "Wrapped twice, the flag unfurls on Mars, eventually."
  - 1 at Launch Pad: Satellite, untouched. "The bare satellite launched smudged."
  - 1 at Launch Pad: Satellite, wrapped, labelled. "Labelled URGENT, the satellite left without the rocket."
- par: wires none, time 5.

### 27 Priority mail

- act: 6. repair: no.
- text: "Priority mail: all wrapped; the address and star chart also URGENT."
- agents: WRAPPER at 1/1; VERIFIER at 2/1, pass limit 2; LABELLER at 3/0; INSPECTOR at 3/2, pass limit 2.
- destinations: Launch Pad.
- batch:
  - Treaty → Launch Pad: Treaty, wrapped
  - Address → Launch Pad: Address, wrapped, labelled
  - Star chart → Launch Pad: Star chart, wrapped, labelled
- opening: none.
- results:
  - 2 at Launch Pad: Address, labelled, wrapped. "The URGENT label is wrapped inside, unseen."
  - 1 at Launch Pad: Treaty, wrapped, labelled. "Labelled URGENT, the treaty was ratified in a hurry."
  - 2 at Launch Pad: Address, wrapped. "Not urgent, the address leaves next year."
- par: wires 5, time 6.

### 28 Night freight

- act: 6. repair: yes.
- text: "Night freight, wired overnight: papers wrapped, the address also URGENT; coffee to the Canteen."
- agents: INSPECTOR at 1/1, pass limit 2; WRAPPER at 2/0; VERIFIER at 3/0, pass limit 2; LABELLER at 4/1; SEALER at 2/2.
- destinations: Launch Pad; Canteen.
- batch:
  - Treaty → Launch Pad: Treaty, wrapped
  - Address → Launch Pad: Address, wrapped, labelled
  - Coffee → Canteen: Coffee, untouched
- opening: IN → INSPECTOR; INSPECTOR plus → VERIFIER; INSPECTOR minus → Canteen; VERIFIER plus → Launch Pad; VERIFIER minus → WRAPPER; WRAPPER → Launch Pad; LABELLER → Launch Pad; SEALER → Launch Pad.
- results:
  - 2 at Launch Pad: Address, wrapped. "Unlabelled, the address became packing for the treaty."
  - 1 at Launch Pad: Treaty, labelled. "Urgent and unwrapped, the treaty blew away."
  - 1 at Launch Pad: Treaty, untouched. "The bare treaty is in orbit, unsigned."
- par: moves 3.

### 29 Last mail

- act: 6. repair: yes.
- text: "Last mail, wired overnight: Latin papers wrapped and URGENT for the Colonies; the satellite wrapped for the Moon Base."
- agents: CENSOR at 1/1, pass limit 2; GAUGE at 2/2, pass limit 2; TRANSLATOR at 3/2; WRAPPER at 4/1; VERIFIER at 5/1, pass limit 2; LABELLER at 6/0; STAMPER at 3/0.
- destinations: Colonies; Moon Base.
- batch:
  - Address → Colonies: Address, translated, wrapped, labelled
  - Satellite → Moon Base: Satellite, wrapped
  - Treaty [translated] → Colonies: Treaty, translated, wrapped, labelled
- opening: IN → CENSOR; CENSOR plus → WRAPPER; CENSOR minus → GAUGE; GAUGE plus → WRAPPER; GAUGE minus → TRANSLATOR; TRANSLATOR → LABELLER; WRAPPER → LABELLER; LABELLER → Colonies; VERIFIER plus → Colonies; VERIFIER minus → WRAPPER.
- results:
  - 1 at Colonies: Address, translated, labelled. "Bare and URGENT, the Latin address was read off the hull."
  - 2 at Colonies: Satellite, wrapped. "The Colonies now have a space programme, by mistake."
  - 1 at Colonies: Address, wrapped, labelled. "English and URGENT, the address got one reply: 'Quid?'"
- par: moves 4.

### 30 Final launch

- act: 6. repair: no.
- text: "Final launch: all wrapped for the Moon Base; one cake half and the treaty also URGENT."
- agents: TASTER at 1/1, pass limit 2; SLICER at 2/2; WRAPPER at 3/1; VERIFIER at 4/1, pass limit 2; LABELLER at 5/0; WRAPPER at 2/0.
- destinations: Moon Base.
- batch:
  - Cake → Moon Base: Cake, sliced, wrapped
  - copy 1 → Moon Base: Cake, sliced, wrapped, labelled
  - Treaty → Moon Base: Treaty, wrapped, labelled
  - Satellite → Moon Base: Satellite, wrapped
- opening: none.
- results:
  - 1 copy 1 at Moon Base: Cake, sliced, wrapped. "The unlabelled half went up with the spare socks."
  - 2 at Moon Base: Treaty, sliced, wrapped. "Half a treaty went up; the other half started a war."
  - 1 at Moon Base: Cake, sliced, wrapped, labelled. "An URGENT cake was eaten in the airlock."
- par: wires 9, time 7, split.
