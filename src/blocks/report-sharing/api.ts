// Report sharing: a printed report leaves the game as text with GameLink, or as a picture with GameLink printed and as a QR code;
// the share sheet where the device has one (SHARE-01, SHARE-02). Fills the SHARE control on a report and on a reprint.
import type { Shell } from "../../platform/shell";
import type { Archive } from "../incident-archive/api";
import type { Campaign } from "../campaign/api";
import type { Board } from "../wiring-board/api";

/** What one shared picture measured, for the test build to read. */
export type PictureMade = {
  readonly order: number;
  readonly width: number;
  readonly height: number;
  readonly qr: { readonly size: number; readonly modules: number; readonly version: number; readonly data: string; readonly x: number; readonly y: number };
  readonly nameRows: number;
  readonly leadRows: readonly string[];
  readonly leadCut: boolean;
  readonly resultRows: readonly string[];
  readonly drawingHeight: number;
  /** The first-difference rings drawn round the result row and the required row above it (ITEM-04). */
  readonly rings: number;
  readonly linkSize: number;
};

export type SharingDeps = {
  readonly shell: Shell;
  readonly board: Board;
  readonly archive: Archive;
  readonly campaign: Campaign;
  readonly clipboard?: (text: string) => Promise<void>;
};

export type { Measure, PictureLayout } from "./logic/sharing";
export { COPIED, PICTURE, PICTURE_FAILED, PICTURE_ON_SCREEN, SAVED, SELECT_AND_COPY, cutRows, leadItem, pictureLayout, pictureResultLine, shareText, wrapRows } from "./logic/sharing";
export { drawPicture, startReportSharing } from "./view/share";
