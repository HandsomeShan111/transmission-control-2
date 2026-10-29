// Report sharing, switched off: no SHARE control.
import type * as Api from "./api";

export const startReportSharing: typeof Api.startReportSharing = () => ({ lastPicture: () => null });
