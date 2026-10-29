// Repair orders on the board (REPAIR-02, REPAIR-03): the MOVES lamp in the order bar, the moves of each run, and a win's
// moves line in its mission report. A repair order opens on its fault wiring: its opening wiring (REPAIR-01, BOARD-01).
import { order as orderOf } from "../../orders/api";
import type { Board } from "../../wiring-board/api";
import { best, setBest } from "../logic/bests";
import { keepRepairBest, moves, movesLine, repairLamp } from "../logic/repair";

export const MOVES_LAMP = "MOVES";

/** Adds repair orders to a board; returns their removal. */
export function repairBoard(board: Board): () => void {
  return board.addOn({
    lamps: (n) => (orderOf(n).repair ? [{ label: MOVES_LAMP, lit: repairLamp(best(n)) === "lit" }] : []),
    scoreRun: (n, wiring, trace) => {
      const o = orderOf(n);
      if (!o.repair) return null;
      const count = moves(o, wiring);
      if (!trace.win) return { moves: count };
      setBest(n, keepRepairBest(o, best(n), count));
      return { moves: count, movesLine: movesLine(o, count), lampLabel: MOVES_LAMP };
    },
  });
}
