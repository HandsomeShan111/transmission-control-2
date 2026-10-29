# Art direction, sound

Design status: Defined.

Part of [Art direction](art-direction.md#sound): the sound steps ART-17 to ART-24.

## Goal

Sound of a plain control room, played straight: "Sounds are relays, switches, tones and teletype": GP-3 Means. The alarm tone is the loudest moment: [Fantasy](vision.md#fantasy), signature moment.
Look: [Art direction](art-direction.md). The moment each sound plays: [Feel](feel.md).

## Parameters

- **LevelQuiet**: number, fraction of full scale, the peak of a sound. Start: 0.25. Range: 0.15 to 0.35.
- **LevelMid**: number, fraction of full scale, the peak of a sound. Start: 0.5. Range: 0.4 to 0.65.
- **LevelLoud**: number, fraction of full scale, the peak of the alarm tone as a whole. Start: 0.8. Range: 0.7 to 0.9.
- **ClickMaxTime**: number, seconds, the longest click, clack or thunk. Start: 0.15. Range: 0.08 to 0.25.
- **VerdictToneTime**: number, seconds, how long a verdict tone lasts. Start: 0.16. Range: 0.1 to 0.2.
- **PlusPitch**: number, hertz. Start: 880. Range: 700 to 1100.
- **MinusPitch**: number, hertz. Start: 247. Range: 200 to 300.
- **UnplugPitch**: number, hertz, where the unplug clack starts. Start: 400. Range: 300 to 500.
- **UnplugDrop**: number, fraction of UnplugPitch the clack falls. Start: 0.3. Range: 0.15 to 0.5.
- **AlarmPitch**: number, hertz. Start: 440. Range: 330 to 660.
- **AlarmBeat**: number, hertz between the two alarm tones. Start: 2. Range: 1 to 4.
- **LineStrikes**: integer, key clicks in one pass of a printed line. Start: 5. Range: 4 to 6.
- **BellPitch**: number, hertz. Start: 1760. Range: 1400 to 2200.
- **BellTime**: number, seconds the bell rings out. Start: 1.0. Range: 0.6 to 1.5.

## Mechanics

### ART-17 Sound palette

Any sound → relay, switch, tone or teletype only; no music, voice, siren or slapstick. Each sound is made in the browser.

- Levels: LevelQuiet for plug, unplug, working and teletype. LevelMid for verdicts, run switch and bell. LevelLoud for the alarm tone.
- Waves: a tone is a sine, except the minus tone, a triangle. A click, clack or thunk is a short burst of noise of at most ClickMaxTime. Teletype clicks may overlap.
- One-shot sounds: plug, unplug, working, plus tone, minus tone, run switch, alarm tone and bell. Different sounds overlap.
- Two things cut a sound while sound is on: a one-shot sound starting again cuts the one still sounding, and a tap ends the alarm tone: [FEEL-10](feel-campaign.md#feel-10-full-alarm-and-incident-report). A teletype line is not one-shot. It plays out, and lines do not cut one another.
- Sound while AUDIO is off: [SETTING-01](platform/settings.md#setting-01-sound).
- Sound starts at the first tap. A printout before it is silent.
- The sounds are the system map's, and the bell: [ART-24](#art-24-bell).

### ART-18 Plug and unplug

Plug → a dry relay clack with a contact tick after it. Unplug → one duller clack, noise through a bandpass filter (BiquadFilterNode). Its centre frequency starts at UnplugPitch and falls by UnplugDrop of it.

### ART-19 Working

An agent works, or a par or second-wiring lamp lights → two relay ticks, at most ClickMaxTime in all. Every family sounds the same.

### ART-20 Verdicts

Plus → one clean tone at PlusPitch. Minus → one flat low tone at MinusPitch, with no slide. Each lasts VerdictToneTime.

### ART-21 Run switch

The run switch is thrown or returns → a heavy two-stage toggle. A thunk sounds as it starts to move. A click sounds as it seats, [SwitchThrowTime](feel-run.md#parameters) later. The thunk may still sound under the click.

### ART-22 Alarm tone

The alarm sounds → one steady tone made of two tones, AlarmPitch and AlarmBeat above it, so it beats slowly. Each tone carries half of LevelLoud. No rise, no repeat.

### ART-23 Teletype

A line prints → LineStrikes key clicks spread over [PrintLineTime](board/reports.md#parameters), then one carriage thunk at its end. A double-strike line sounds each click twice, [DoubleStrikeGap](feel-campaign.md#parameters) apart. Its clicks spread over PrintLineTime less DoubleStrikeGap, so both strikes end inside the line. A report that prints at once sounds as one plain line, not one for each line.

### ART-24 Bell

The campaign rings the bell ([CAMPAIGN-06](campaign/campaign.md#campaign-06-after-the-report), [ACHIEVE-02](campaign/achievements.md#achieve-02-show)) → one struck bell at BellPitch, ringing out over BellTime. Nothing else uses it.

## Links

- Look: [Art direction](art-direction.md). The feel page links here.
