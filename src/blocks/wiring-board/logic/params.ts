// Wiring board parameters at their start values (board/wiring-board.md, Parameters).
import { shared } from "../../../platform/tokens";

export const BOARD_PARAMS = {
  /** CSS pixels on screen: a jack's size at the farthest zoom stop. One board unit is one CSS pixel there. */
  JackMinSize: shared.JackMinSize,
  /** CSS pixels on screen: a jack's size at the closest zoom stop. */
  JackMaxSize: shared.JackMaxSize,
  /** CSS pixels from the window's edge. */
  EdgePanZone: 40,
  /** CSS pixels per second. */
  EdgePanSpeed: 400,
  /** CSS pixels on screen, round the board's extent. */
  BoardMargin: 16,
} as const;
