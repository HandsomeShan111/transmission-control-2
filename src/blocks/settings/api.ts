// Settings: one setting, sound on or off, kept beside the save (SETTING-01). Fills the AUDIO switch on the Board, the order list,
// the archive, the commendations and the title screen. No API: only players reach it.
import type { SoundSystem } from "../../platform/sound";
import type { Achievements } from "../achievements/api";
import type { Archive } from "../incident-archive/api";
import type { Campaign } from "../campaign/api";
import type { Saving } from "../saving/api";

export type SettingsDeps = { readonly sound: SoundSystem; readonly saving: Saving; readonly campaign: Campaign; readonly archive: Archive; readonly achievements: Achievements };

export { startSettings } from "./view/settings";
