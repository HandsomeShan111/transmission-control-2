// Settings, switched off: no AUDIO switch; sound stays on.
import type * as Api from "./api";

export const startSettings: typeof Api.startSettings = () => ({ muted: () => false });
