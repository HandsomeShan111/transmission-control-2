# Data, orders, acts 1 and 2

Design status: Defined.

Part of [Data](data.md#orders): orders 1 to 10, acts RECORDS and COMMS. Fields: [Orders](data.md#orders).

## Orders

### 1 Signing ceremony

- act: 1. repair: no.
- text: "Signing ceremony at 0900. The World Council needs the treaty, the address and the star chart laminated."
- agents: LAMINATOR at 1/0.
- destinations: World Council.
- batch:
  - Treaty → World Council: Treaty, laminated
  - Address → World Council: Address, laminated
  - Star chart → World Council: Star chart, laminated
- opening: IN → World Council.
- results:
  - 1 at World Council: Treaty, untouched. "The treaty arrived unlaminated, so legally a napkin. Hostilities resume at 0905."
  - 1 stopped at LAMINATOR: Treaty, laminated. "LAMINATOR laminated the treaty and is keeping it. The ceremony moves inside the machine."
  - 1 stopped at IN: Treaty, untouched. "Nothing left the input tray. The Council signed an empty table, now ratified."
- par: wires none, time none.

### 2 Victory parade

- act: 1. repair: no.
- text: "Parade Control needs confetti from the star chart and the address, every piece laminated against rain."
- agents: LAMINATOR at 1/0; SHREDDER at 2/0.
- destinations: Parade Control.
- batch:
  - Star chart → Parade Control: Confetti, shredded, laminated
  - Address → Parade Control: Confetti, shredded, laminated
- opening: none.
- results:
  - 1 at Parade Control: Confetti, laminated, shredded. "Laminated before shredding, each piece of confetti is waterproof on one edge only."
  - 1 at Parade Control: Star chart, laminated. "One laminated star chart, to be thrown from the balcony whole."
  - 1 lost: Confetti. "The star chart never came out of the machines. Parade Control has sent a search party."
- par: wires none, time none.

### 3 Diplomatic pouch

- act: 1. repair: no.
- text: "Diplomatic pouch for the Embassy: every paper laminated. Customs forbids cake: it may enter only as laminated confetti."
- agents: INSPECTOR at 1/1, pass limit 2; LAMINATOR at 2/0; SHREDDER at 2/2; SHREDDER at 3/2.
- destinations: Embassy.
- batch:
  - Treaty → Embassy: Treaty, laminated
  - Cake → Embassy: Confetti, shredded, laminated
  - Address → Embassy: Address, laminated
- opening: INSPECTOR plus → LAMINATOR.
- results:
  - 2 at Embassy: Cake, laminated. "Customs waved the cake through as stationery, laminated and all."
  - 1 at Embassy: Confetti, shredded, laminated. "The treaty arrived as laminated confetti. Talks resume once it is reassembled."
  - 2 stopped at INSPECTOR: Cake, untouched. "INSPECTOR is holding the cake for further inspection. It has started on the icing."
- par: wires none, time none.

### 4 Archive day

- act: 1. repair: no.
- text: "The Archive accepts only laminated paper. File the treaty and the star chart; the coffee becomes laminated confetti."
- agents: INSPECTOR at 1/1, pass limit 2; LAMINATOR at 2/0; LAMINATOR at 3/2; SHREDDER at 2/2.
- destinations: Archive.
- batch:
  - Treaty → Archive: Treaty, laminated
  - Coffee → Archive: Confetti, shredded, laminated
  - Star chart → Archive: Star chart, laminated
- opening: none.
- results:
  - 2 at Archive: Coffee, laminated. "Laminated coffee, filed under Beverages, Permanent."
  - 2 at Archive: Confetti, laminated, shredded. "Laminated, then shredded: an archivist is gluing the coffee back together."
  - 1 at Archive: Confetti, shredded, laminated. "The treaty, filed as laminated confetti in four hundred folders."
- par: wires 5, time 5, split.

### 5 Museum split

- act: 1. repair: no.
- text: "Every exhibit arrives laminated: the papers to the Archive, the moon rock to the Museum."
- agents: LAMINATOR at 1/0; INSPECTOR at 2/1, pass limit 2; LAMINATOR at 1/2; SHREDDER at 3/2.
- destinations: Archive; Museum.
- batch:
  - Treaty → Archive: Treaty, laminated
  - Moon rock → Museum: Moon rock, laminated
  - Address → Archive: Address, laminated
- opening: none.
- results:
  - 2 at Archive: Moon rock, laminated. "Archivists now lift the moon rock with their knees. Laminated, it counts as paper."
  - 2 at Museum: Moon rock, untouched. "A bare moon rock. Visitors touched it. It is mostly fingerprints now."
  - 1 at Museum: Treaty, laminated. "The treaty is on show in a glass case marked 'Extinct'."
- par: wires 4, time none.

### 6 Latin hour

- act: 2. repair: no.
- text: "Senate decree: every document filed in Latin. Some already are. Deliver to the Senate Archive."
- agents: CENSOR at 1/1, pass limit 2; SUMMARIZER at 2/0; TRANSLATOR at 2/2.
- destinations: Senate Archive.
- batch:
  - Address → Senate Archive: Address, translated
  - Treaty [translated] → Senate Archive: Treaty, translated
  - Star chart → Senate Archive: Star chart, translated
- opening: none.
- results:
  - 2 at Senate Archive: Treaty, translated, translated. "Latin twice over. Scholars say the treaty reads as English again."
  - 1 at Senate Archive: Address, summarized, translated. "The President's address, filed as one Latin word: 'Non.' Historians call it his best."
  - 1 at Senate Archive: Address, untouched. "An address in English. The Senate has declared it a foreign speech."
- par: wires none, time 5.

### 7 Night broadcast

- act: 2. repair: no.
- text: "Night broadcast: regulation sends every message through the Latin desk. The colonies listen only in English."
- agents: CENSOR at 1/1, pass limit 2; TRANSLATOR at 2/0; TRANSLATOR at 2/2; SUMMARIZER at 3/1.
- destinations: Radio Tower.
- batch:
  - Address → Radio Tower: Address, translated, translated
  - Treaty [translated] → Radio Tower: Treaty, translated, translated
- opening: none.
- results:
  - 1 at Radio Tower: Address, translated. "The colonies heard the President in Latin until dawn. They took it as a threat."
  - 2 at Radio Tower: Treaty, translated, translated, translated. "Latin three times, so Latin again. Three colonies took the treaty as war."
  - 1 at Radio Tower: Address, summarized, translated. "The whole address went out as one Latin word. The colonies have declared independence."
- par: wires none, time none.

### 8 Treaty ceremony

- act: 2. repair: no.
- text: "Treaty ceremony: the Senate takes papers only in laminated Latin. The cake goes to the Canteen as it is."
- agents: INSPECTOR at 1/0, pass limit 2; CENSOR at 1/2, pass limit 2; SUMMARIZER at 2/0; TRANSLATOR at 2/2; LAMINATOR at 3/1.
- destinations: Senate; Canteen.
- batch:
  - Address [translated] → Senate: Address, translated, laminated
  - Treaty → Senate: Treaty, translated, laminated
  - Cake → Canteen: Cake, untouched
- opening: none.
- results:
  - 3 at Senate: Cake, translated, laminated. "A laminated cake in Latin was read into the record. It is now law."
  - 1 at Senate: Address, translated, translated, laminated. "The address went into Latin and back out. The Senate laminated the round trip as evidence."
  - 2 at Senate: Treaty, laminated. "An English treaty, laminated so it can never be translated."
- par: wires none, time 6.

### 9 Colony bulletin

- act: 2. repair: no.
- text: "Colony bulletin: one Latin word per message, laminated against the weather. The cake goes laminated only."
- agents: CENSOR at 1/0, pass limit 2; INSPECTOR at 1/2, pass limit 2; SUMMARIZER at 2/0; TRANSLATOR at 3/0; LAMINATOR at 3/2; LAMINATOR at 4/1.
- destinations: Colonies.
- batch:
  - Address → Colonies: Address, summarized, translated, laminated
  - Treaty [summarized, translated] → Colonies: Treaty, summarized, translated, laminated
  - Cake → Colonies: Cake, laminated
- opening: none.
- results:
  - 1 at Colonies: Address, translated, summarized, laminated. "Cut after the Latin, the bulletin says only 'Et.' The colonies await the rest."
  - 2 at Colonies: Treaty, summarized, translated, summarized, translated, laminated. "Cut and translated twice over, the treaty says nothing anyone agreed."
  - 3 at Colonies: Cake, summarized, translated, laminated. "The cake went out as one laminated Latin word, 'placenta'. It has been framed."
- par: wires 8, time 6, split.

### 10 Senate recess

- act: 2. repair: no.
- text: "Senate recess: everything filed in Latin. Cake may enter the chamber only shredded."
- agents: INSPECTOR at 1/0, pass limit 2; CENSOR at 1/2, pass limit 2; SHREDDER at 2/0; TRANSLATOR at 3/1; LAMINATOR at 2/2.
- destinations: Senate.
- batch:
  - Cake → Senate: Confetti, shredded, translated
  - Treaty [translated] → Senate: Treaty, translated
  - Address → Senate: Address, translated
- opening: none.
- results:
  - 1 at Senate: Cake, translated. "A cake in Latin was entered into the minutes, then eaten by them."
  - 2 at Senate: Treaty, translated, translated. "Twice through the Latin desk, the treaty came back English, and binding."
  - 1 at Senate: Confetti, translated, shredded. "Latin confetti: one letter a piece, spelling nothing in any language."
- par: wires none, time 6.
