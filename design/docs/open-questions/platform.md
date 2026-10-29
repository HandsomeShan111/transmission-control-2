# Platform open questions

Entry format and ID rules: [Open questions](../open-questions.md).

### OQ-PLATFORM-05 Silent switch

- **Gap:** how a phone's silent switch treats the game's sounds, with no audio session type set. No source read says.
- **First release:** does not block.
- **Blocks:** the result SETTING-01's test expects on a phone set to silent.
- **Step:** [SETTING-01](../platform/settings.md#setting-01-sound).
- **Settled by:** engine spike: on an iPhone with its silent switch on, and an Android phone set to silent, play one game sound with no type set, then with `playback`; note which plays.
