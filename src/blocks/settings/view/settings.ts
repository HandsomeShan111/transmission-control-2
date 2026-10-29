// SETTING-01: the AUDIO switch, drawn as the run switch with a lamp as an agent's, on the Board, the order list, the archive, the
// commendations and the title screen, in its key slot.
// Off: every sound stops at once; on: sounds play again from the next one. Up and its lamp steady while sound is on. A browser
// with no setting kept starts with sound on. It stays live under a printout and in the opening's standby (REPORT-04, FEEL-12).
import { declareKeys, KEY, switchPiece, type FrameControl, type Switch } from "../../../platform/pieces";
import { pageSlots } from "../../../platform/slots";
import { BOARD_SLOTS } from "../../wiring-board/api";
import type { SettingsDeps } from "../api";

export function startSettings(d: SettingsDeps): { muted(): boolean } {
  const { sound, saving } = d;
  declareKeys({ label: "AUDIO", switch: "lamp" });
  sound.setMuted(saving.settings().muted);
  const live = new Set<Switch>();
  const draw = (sw: Switch) => {
    sw.set(sound.muted);
    sw.lamp?.set(sound.muted ? "off" : "steady");
  };
  const make = (): Switch => {
    // A switch is attached as it is returned, so one not on the page is a render's old one: let it go.
    for (const s of live) if (!s.el.isConnected) live.delete(s);
    const sw: Switch = switchPiece({
      label: "AUDIO",
      withLamp: true,
      lampOn: !sound.muted,
      down: sound.muted,
      onFlip: () => {
        sound.setMuted(!sound.muted);
        saving.keepSettings({ muted: sound.muted });
        for (const s of live) if (s.el.isConnected || s === sw) draw(s);
      },
    });
    sw.el.dataset.control = "audio";
    live.add(sw);
    return sw;
  };
  const control = (): FrameControl => ({ el: make().el, slot: KEY.audio, liveUnderPaper: true });
  pageSlots.fill(BOARD_SLOTS.audioSwitch, () => make().el);
  // AUDIO in its slot, the first, on every screen with a control bar (owner's change).
  d.campaign.extend({ orderListControls: () => [control()], titleControls: () => [control()] });
  d.archive.extend({ controls: () => [control()] });
  d.achievements.extend({ controls: () => [control()] });
  return { muted: () => sound.muted };
}
