# Art direction

Design status: Defined.

## Goal

Look of a 1970s space-agency control console: "flat Bauhaus shapes, few colours, labelled jacks and switches, teletype printouts": GP-3 Means. The drawing lets the player explain a result: GP-1 Review check.
[Concept](source/concept.md), line 10: "a retro-futuristic, 1970s NASA mission control, Bauhaus minimalistic, Kubrick's 2001: A Space Odyssey, engineering aesthetic." The steps carry it so:

- Retro-futuristic: the whole page; no step of its own.
- 1970s NASA mission control: [ART-01](#art-01-palette), [ART-04](#art-04-console-frame), [ART-12](art-direction-objects.md#art-12-teletype-paper).
- Bauhaus minimalistic: [ART-02](#art-02-shape).
- Kubrick's 2001: [ART-06](#art-06-master-alarm) and the calm tone of [ART-22](art-direction-sound.md#art-22-alarm-tone).
- Engineering aesthetic: [ART-03](#art-03-type), [ART-07](#art-07-jacks-and-terminals), [ART-08](#art-08-wires).

Faces, items, mark tiles, paper and the picture: [Art direction, objects](art-direction-objects.md). Sound: [Art direction, sound](art-direction-sound.md). Motion: [Feel](feel.md).

## Parameters

Board unit: one CSS pixel at the smallest zoom, [JackMinSize](board/wiring-board.md#parameters).

- **Graphite**: colour, hex. Start: #2b2e2c. Fixed.
- **GraphiteLight**: colour, hex, Graphite's one lighter tint. Start: #454945. Fixed.
- **Cream**: colour, hex. Start: #efe6cc. Fixed.
- **Ink**: colour, hex. Start: #1c1c1a. Fixed.
- **Orange**: colour, hex. Start: #e2692a. Fixed.
- **Mustard**: colour, hex. Start: #e2b03a. Fixed.
- **Teal**: colour, hex. Start: #3a9c92. Fixed.
- **Alarm**: colour, hex. Start: #e32f36. Fixed.
- **SansStack**: text, a CSS font-family list. Start: "Helvetica Neue", Helvetica, Arial, sans-serif. Fixed.
- **MonoStack**: text, a CSS font-family list. Start: "Courier New", Courier, monospace. Fixed.
- **TextContrast**: number, the least luminance ratio of text to its ground. Start: 4.5. Fixed.
- **OutlineWeight**: number, board units. Start: 3. Range: 2 to 4.
- **WireWidth**: number, board units, the coloured core. Start: 4. Range: 3 to 6.
- **WireEdge**: number, board units, the Ink edge on a wire's sides, and round an arrow, a ring but the alarm's, or band text over a wire. Start: 2. Range: 1 to 3.
- **DashLength**: number, board units. Start: 9. Range: 6 to 14.
- **DashGap**: number, board units. Start: 6. Range: 4 to 10.
- **HopRadius**: number, board units. Start: 8. Range: 7 to 10.
- **LampSize**: number, fraction of JackMinSize, the lens across. Start: 0.5. Range: 0.4 to 0.6.
- **AlarmLampSize**: number, fraction of JackMinSize, the lens across. Start: 1. Range: 0.8 to 1.2.
- **SignDiscSize**: number, fraction of JackMinSize across. Start: 0.5. Range: 0.4 to 0.6.
- **SignSpan**: number, fraction of a round part's diameter, the length of a sign's stroke. Start: 0.5. Range: 0.4 to 0.6.
- **ArrowSize**: number, board units long. Start: 12. Range: 9 to 16.
- **TraceWidth**: number, board units, a wire's trace on a label plate. Start: 3. Range: 3 to 4.
- **TraceLight**: number, fraction of light the plate keeps on a wire's trace. Start: 0.55. Range: 0.55 to 0.6.

## Mechanics

### ART-01 Palette

Any drawn thing → only these colours: Graphite, its lighter tint GraphiteLight, Cream, Ink, Orange, Mustard, Teal and Alarm. No other hue, no gradient.

- Alarm colours the master alarm lamp and its rings, nothing else: [ART-06](#art-06-master-alarm).
- A dim is the one blend: Ink laid over the thing at the fraction of light not kept. Its text: [ART-14](#art-14-text-contrast).

### ART-02 Shape

Any drawn thing → a flat shape with a hard outline of OutlineWeight: circles, squares, bars. The outline is Cream on an Ink, Graphite or GraphiteLight fill, and Ink on any other fill.

- No gradient, no soft shadow, no glossy highlight. A glow is flat rings, never a blur.
- A wire, an arrow, a sign and a ring but the alarm's have their own edges: [ART-08](#art-08-wires), [ART-13](#art-13-verdict-colour-and-sign), [ART-15](#art-15-rings). The window's Orange rule is its edge: [ART-04](#art-04-console-frame).

### ART-03 Type

Any text → SansStack for plates and labels, MonoStack for the teletype. No web fonts.

- RUN, AUDIO and jack labels print in capitals. All other text prints as its owner writes it.

### ART-04 Console frame

A screen shows → a Graphite frame round a recessed window with an Ink ground.

- An Orange rule of OutlineWeight runs along each inner edge.
- On the Board, the run switch: an Orange toggle on a Cream plate at least JackMinSize across, labelled RUN.

### ART-05 Lamps

A lamp → one round lens of LampSize with an outline, in four states.

- Off: Graphite. Steady: Mustard.
- Plus: the plus colour with an Ink plus sign. Minus: the minus colour with an Ink minus sign. Colours and signs: [ART-13](#art-13-verdict-colour-and-sign).
- Par, second-wiring and AUDIO lamps use off and steady only.

### ART-06 Master alarm

The master alarm lamp → the largest lamp on the screen at every zoom. Its lens is AlarmLampSize across, with an outline. Off: Graphite, as [ART-05](#art-05-lamps).

- Lit: Alarm, with two flat Alarm rings round it, each OutlineWeight wide, with a gap of OutlineWeight between them. The rings stand; they do not grow or fade. They carry no Ink edge.
- The lamp and its rings sit on the Graphite frame or the Ink ground, never on GraphiteLight.

### ART-07 Jacks and terminals

A jack → a round plate JackMinSize across with a centred label. Output jack: Ink plate, Cream label. Input jack: Cream plate, Ink label.

- Plain jacks read IN and OUT. A copier's and a checking agent's jacks: [AGENT-01](board/agents.md#agent-01-face).
- Plus jack: a plate in the plus colour. Minus jack: a plate in the minus colour. Each carries its Ink sign: [ART-13](#art-13-verdict-colour-and-sign).
- A terminal: a GraphiteLight panel with a Cream outline and an Ink header bar with a Cream label. Item slots are Ink squares.

### ART-08 Wires

A wire → WireWidth wide with a WireEdge Ink edge on each side, in three styles. Data: solid Cream. Plus feedback: dashed in the plus colour. Minus feedback: dashed in the minus colour.

- Dashes are DashLength long with DashGap between.
- A feedback wire carries a Cream disc of SignDiscSize at its middle, with its Ink sign.
- Every wire carries one arrow, ArrowSize long and as wide, three quarters along its length, pointing with the flow. It is in the wire's colour with a WireEdge Ink edge.
- A crossing hop is a half circle of HopRadius.
- A trace, [WIRE-01](board/wires.md#wire-01-wire-kinds), is a dim of the plate's Cream, [ART-01](#art-01-palette), along the wire's centre. It is TraceWidth wide, keeping TraceLight of the light.
- It runs unbroken under the plate's text, with no halo: [ART-14](#art-14-text-contrast).
- A feedback wire's trace keeps its dashes, DashLength long with DashGap between; their motion: [FEEL-06](feel-run.md#feel-06-check-verdict). A data wire's trace is solid. The dashes tell the kind; the wire's colour returns where it leaves the plate.
- Only the line is traced. A hop, arrow or sign disc under the plate stays hidden.

### ART-13 Verdict colour and sign

A verdict, a wire kind or a result → plus is Teal and minus is Orange. These are the plus colour and the minus colour.

- A sign or a pattern always joins the colour: a plus or minus sign, a solid or dashed line.
- A sign is a stroke of OutlineWeight, Ink on Teal, Orange or Cream. On a round part, a minus is one stroke through its centre, SignSpan of its diameter long; a plus adds the same stroke upright.
- The alarm lamp is told from a minus lamp by size and rings, not hue.

### ART-14 Text contrast

Any text → Ink on Cream, Cream on Ink, or Cream on Graphite or GraphiteLight. Colour never carries text.

- A stopped or lost item carries Ink on Cream and Cream on Ink only. Under its dim, [FEEL-08](feel-run.md#feel-08-item-stops-or-is-lost), the text keeps TextContrast.
- A wire's trace, [ART-08](#art-08-wires), carries one pair, Ink text on its dimmed Cream. The pair keeps TextContrast.
- **Derived:** at [StopLight](feel-run.md#parameters)'s least value both pairs stay above TextContrast. The trace's pair stays above it across TraceLight's range, whose least is that value.
- The standby dim and the room dim are exempt: nothing under them is read. What the standby dim leaves undimmed: [FEEL-12](feel-campaign.md#feel-12-opening-misfire). The room dim skips what [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report) lists.

### ART-15 Rings

A ring → a flat ring of OutlineWeight with an Ink edge of WireEdge on each side. The alarm rings have no edge: [ART-06](#art-06-master-alarm).

- A held wire is drawn as its kind, with a Mustard tip.
- A jack or terminal that takes the wire shows a blinking Mustard ring: [WIRE-02](board/wires.md#wire-02-hold), [WIRE-04](board/wires.md#wire-04-move). Other jacks stay plain.
- In standby the same ring blinks on the run switch: [FEEL-12](feel-campaign.md#feel-12-opening-misfire).
- Every other ring is Cream: seat, jack pulse, lamp, par and first-difference rings.

### ART-16 Stills

Any moment → every state still reads in one frame: lamp, sign, stopped item, rejection. Motion adds timing, never meaning.

### ART-25 No chance

Any motion or sound → never varies by chance. A sound's noise comes from a fixed sequence.

## Objects

Steps ART-09 to ART-12 and ART-26, and their parameters: [Art direction, objects](art-direction-objects.md).

## Sound

Steps ART-17 to ART-24 and their parameters: [Art direction, sound](art-direction-sound.md).

## Links

- Vision: [Fantasy](vision.md#fantasy). The feel page, content inventory and UI style link here.
