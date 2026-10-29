// The teletype of the screen showing (REPORT-04, FEEL-13): one printout at a time, each after the one before closes. On the
// Board it lies over the window through the Board's overlay; on the order list and the archive, over their own window.
import { printout, type PrintLine, type Printout } from "../../../platform/pieces/printout";
import type { Shell } from "../../../platform/shell";
import type { SoundSystem } from "../../../platform/sound";
import type { PrintSpec } from "../api";
import type { Board } from "../../wiring-board/api";

/** A printout that sounds as the teletype does (ART-23, ART-24) and resolves once closed. */
export function paper(sound: SoundSystem, spec: PrintSpec, onClosed?: () => void): Printout {
  return printout({
    lines: spec.lines,
    ...(spec.controls ? { controls: spec.controls } : {}),
    onLine: (l: PrintLine) => void sound.play("teletype", l.double ? { double: true } : {}),
    onAtOnce: () => void sound.play("teletype"),
    onBell: () => void sound.play("bell"),
    ...(onClosed ? { onClosed } : {}),
  });
}

export type Teletype = {
  /** Queued: prints once every printout before it has closed. Resolves with the printout once it shows. */
  print(spec: PrintSpec): { shown: Promise<Printout>; closed: Promise<void> };
  /** Something lies on the teletype, or waits for it. */
  busy(): boolean;
  /** Resolves once nothing lies on the teletype or waits for it. */
  idle(): Promise<void>;
};

export function teletype(shell: Shell, board: () => Board | null, sound: SoundSystem): Teletype {
  let chain: Promise<void> = Promise.resolve();
  let pending = 0;
  return {
    print(spec) {
      pending++;
      let shownResolve!: (p: Printout) => void;
      const shown = new Promise<Printout>((r) => (shownResolve = r));
      const closed = (chain = chain.then(
        () =>
          new Promise<void>((done) => {
            const p = paper(sound, spec, () => {
              pending--;
              done();
            });
            const where = shell.current;
            const b = board();
            if (where === "board" && b) b.overlay(p);
            else if (where) shell.frame(where)!.showPaper(p);
            if (spec.atOnce) p.printAtOnce();
            else void p.print();
            shownResolve(p);
          }),
      ));
      return { shown, closed };
    },
    busy: () => pending > 0,
    async idle() {
      while (pending > 0) await chain;
    },
  };
}
