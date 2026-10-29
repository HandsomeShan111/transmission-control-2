# Data, orders, acts 3 and 4

Design status: Defined.

Part of [Data](data.md#orders): orders 11 to 20, acts GALLEY and WORKSHOP. Fields: [Orders](data.md#orders).

## Orders

### 11 Picnic day

- act: 3. repair: no.
- text: "Picnic: papers laminated to the Archive, the sandwich to the Canteen as it is."
- agents: INSPECTOR at 1/0, pass limit 2; TASTER at 1/2, pass limit 2; LAMINATOR at 2/0; BAKER at 2/2.
- destinations: Archive; Canteen.
- batch:
  - Treaty → Archive: Treaty, laminated
  - Sandwich → Canteen: Sandwich, untouched
  - Address → Archive: Address, laminated
- opening: none.
- results:
  - 2 at Canteen: Cake, baked. "The sandwich came baked into a cake. Nobody can find the filling."
  - 1 at Canteen: Treaty, untouched. "The treaty was served for lunch, with a light dressing."
  - 2 at Archive: Sandwich, laminated. "Sealed in plastic, lunch will stay fresh for ten thousand years."
- par: wires 4, time 5.

### 12 Signing party

- act: 3. repair: no.
- text: "Signing party: the Canteen serves only cake. The treaty goes to the Archive, laminated."
- agents: TASTER at 1/1, pass limit 2; INSPECTOR at 2/1, pass limit 2; BAKER at 3/2; LAMINATOR at 3/0.
- destinations: Archive; Canteen.
- batch:
  - Coffee → Canteen: Cake, baked
  - Treaty → Archive: Treaty, laminated
  - Moon rock → Canteen: Cake, baked
- opening: none.
- results:
  - 1 at Canteen: Coffee, untouched. "Coffee at a cake party. Edible, the guests agree, but not cake."
  - 2 at Canteen: Cake, baked. "The treaty was baked and eaten before the signing. Peace is now digested."
  - 3 at Canteen: Moon rock, untouched. "An unbaked moon rock on the cake table. Catering lists it as a very dry sponge."
- par: wires 5, time 5.

### 13 Embassy dinner

- act: 3. repair: no.
- text: "A cake cut in two: half to the Canteen, half laminated for the Embassy, with the treaty."
- agents: INSPECTOR at 1/0, pass limit 2; TASTER at 1/2, pass limit 2; SLICER at 2/2; LAMINATOR at 3/1.
- destinations: Canteen; Embassy.
- batch:
  - Cake → Canteen: Cake, sliced
  - copy 1 → Embassy: Cake, sliced, laminated
  - Treaty → Embassy: Treaty, laminated
- opening: none.
- results:
  - 1 at Embassy: Cake, sliced, laminated. "The Canteen's half reached the Embassy, laminated. The diplomats chewed politely."
  - 1 copy 1 stopped at SLICER: Cake, sliced. "SLICER cut the cake in two and kept half. It calls this the fee."
  - 2 at Canteen: Treaty, sliced. "Half a treaty, served as a starter."
- par: wires 6, time 5.

### 14 Moon Base birthday

- act: 3. repair: no.
- text: "Moon Base birthday: everything in two halves, one per shift. The flag goes as cake."
- agents: TASTER at 1/1, pass limit 2; BAKER at 2/2; SLICER at 3/1; SLICER at 2/0.
- destinations: Moon Base.
- batch:
  - Flag → Moon Base: Cake, baked, sliced
  - copy 1 → Moon Base: Cake, baked, sliced
  - Coffee → Moon Base: Coffee, sliced
  - copy 1 → Moon Base: Coffee, sliced
- opening: none.
- results:
  - 1 at Moon Base: Flag, sliced. "Half a flag for dessert. The colony now salutes the other half."
  - 2 at Moon Base: Cake, baked, sliced. "The coffee was baked into a cake and halved, still too hot to eat."
  - 1 at Moon Base: Cake, sliced, baked. "Halved first, the flag became a cake with half a flag inside."
- par: wires 6, time 4, split.

### 15 State banquet

- act: 3. repair: no.
- text: "State banquet: the address laminated, the cake cut in two, anything else baked."
- agents: INSPECTOR at 1/0, pass limit 2; TASTER at 1/2, pass limit 2; LAMINATOR at 2/0; BAKER at 2/1; SLICER at 2/2; SHREDDER at 3/1.
- destinations: Banquet.
- batch:
  - Address → Banquet: Address, laminated
  - Moon rock → Banquet: Cake, baked
  - Cake → Banquet: Cake, sliced
  - copy 1 → Banquet: Cake, sliced
- opening: none.
- results:
  - 2 at Banquet: Cake, baked, sliced. "Moon rock cake, cut in two. Each half broke a tooth."
  - 1 at Banquet: Cake, baked. "The address was baked into a cake. Guests read it with forks."
  - 3 at Banquet: Cake, baked. "The cake was baked again. It is now a fine brick."
- par: wires none, time 5.

### 16 Scrap drive

- act: 4. repair: no.
- text: "Scrap drive: the Hangar takes only metal. Papers go as cubes of confetti, for security."
- agents: GAUGE at 1/1, pass limit 2; SHREDDER at 2/2; COMPACTOR at 3/1; LAMINATOR at 2/0.
- destinations: Hangar.
- batch:
  - Treaty → Hangar: Cube, shredded, crushed
  - Satellite → Hangar: Satellite, untouched
  - Address → Hangar: Cube, shredded, crushed
- opening: none.
- results:
  - 1 at Hangar: Cube, crushed. "The treaty was crushed whole. Its secrets can still be read along the edges."
  - 3 at Hangar: Confetti, crushed, shredded. "Crushed before shredding, the address is now classified gravel."
  - 2 at Hangar: Cube, crushed. "The satellite arrived as a cube. Ground control asks it to stop beeping."
- par: wires none, time 6.

### 17 Night scrap run

- act: 4. repair: yes.
- text: "Scrap run, wired overnight: papers laminated to the Archive; metal to the Hangar, the rest as cubes."
- agents: INSPECTOR at 1/1, pass limit 2; LAMINATOR at 2/0; GAUGE at 2/2, pass limit 2; COMPACTOR at 3/2; SHREDDER at 3/0.
- destinations: Archive; Hangar.
- batch:
  - Treaty → Archive: Treaty, laminated
  - Satellite → Hangar: Satellite, untouched
  - Flag → Hangar: Cube, crushed
- opening: IN → GAUGE; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive; INSPECTOR minus → GAUGE; GAUGE plus → Hangar; GAUGE minus → LAMINATOR; COMPACTOR → Hangar; SHREDDER → Hangar.
- results:
  - 3 at Archive: Flag, laminated. "By regulation, the archived flag no longer flutters."
  - 1 at Hangar: Cube, crushed. "The treaty is a cube now, the most binding agreement ever."
  - 2 at Hangar: Cube, crushed. "Night shift work: a satellite-sized cube that orbits the forklift slowly."
- par: moves 2.

### 18 Moving day

- act: 4. repair: no.
- text: "Moving day: everything arrives laminated and as itself. Only metal rides in the van uncrushed."
- agents: GAUGE at 1/1, pass limit 2; COMPACTOR at 2/2; RESTORER at 3/2; LAMINATOR at 3/0; LAMINATOR at 4/1.
- destinations: Moon Base.
- batch:
  - Flag → Moon Base: Flag, crushed, restored, laminated
  - Spacesuit → Moon Base: Spacesuit, crushed, restored, laminated
  - Satellite → Moon Base: Satellite, laminated
- opening: none.
- results:
  - 1 at Moon Base: Cube, crushed, laminated. "The flag arrived as a laminated cube. It was planted anyway."
  - 1 at Moon Base: Flag, crushed, laminated, restored. "Restored inside its lamination, the flag flies, stiffly."
  - 3 at Moon Base: Satellite, crushed, restored, laminated. "Crushed and restored, the satellite now reports only on its own condition."
- par: wires 6, time 6, split.

### 19 Museum move

- act: 4. repair: yes.
- text: "Museum move, wired overnight: metal as it is, papers laminated, everything else restored."
- agents: GAUGE at 1/1, pass limit 2; INSPECTOR at 2/2, pass limit 2; LAMINATOR at 3/2; COMPACTOR at 2/0; RESTORER at 3/0; SHREDDER at 3/1.
- destinations: Museum.
- batch:
  - Satellite → Museum: Satellite, untouched
  - Flag → Museum: Flag, crushed, restored
  - Treaty → Museum: Treaty, laminated
- opening: IN → GAUGE; GAUGE plus → RESTORER; GAUGE minus → INSPECTOR; INSPECTOR plus → LAMINATOR; LAMINATOR → Museum; INSPECTOR minus → COMPACTOR; COMPACTOR → GAUGE; RESTORER → Museum.
- results:
  - 1 at Museum: Satellite, restored. "A satellite, restored to a satellite. Now more so."
  - 2 at Museum: Cube, crushed. "The flag is a cube, labelled 'Flag, abstract period'."
  - 2 at Museum: Flag, untouched. "The flag skipped the van's crusher. The insurers want to know how."
- par: moves 2.

### 20 Recycling day

- act: 4. repair: no.
- text: "Recycling: the Hangar keeps metal, other scrap as cubes. Half the cake is scrap; half feeds the Canteen."
- agents: GAUGE at 1/0, pass limit 2; TASTER at 1/2, pass limit 2; COMPACTOR at 2/0; SLICER at 2/2; BAKER at 3/1.
- destinations: Hangar; Canteen.
- batch:
  - Satellite → Hangar: Satellite, untouched
  - Cake → Canteen: Cake, sliced
  - copy 1 → Hangar: Cube, sliced, crushed
  - Flag → Hangar: Cube, crushed
- opening: none.
- results:
  - 2 at Hangar: Cube, crushed. "A cake crushed into a cube, the densest dessert on record."
  - 3 at Hangar: Flag, untouched. "A flag at the Hangar, planted on the forklift."
  - 2 copy 1 at Canteen: Cake, sliced. "The scrap half of the cake reached the Canteen. Recycling has filed a complaint."
- par: wires none, time 6.
