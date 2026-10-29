// The title screen (owner's change; design silent): every open of the game, after the first load's LOADING screen when there is
// one, shows the game's name large on the console's window, and one plate under it: START for a new game, CONTINUE once there
// is progress. The strip above the window holds the name on one line, as the other screens' hold theirs; the control bar holds
// what the blocks above add (AUDIO, from Settings), in its slot.
import { h, plate, type FrameControl, type Plate } from "../../../platform/pieces";
import type { Shell } from "../../../platform/shell";

export const GAME_NAME = "TRANSMISSION CONTROL 2";

const STYLE = `
.tct-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--PlateGap);padding:var(--PlateGap);overflow:hidden}
.tct-name{margin:0;max-width:100%;color:var(--Cream);font-family:var(--Sans);font-weight:700;line-height:1.05;letter-spacing:.06em;text-align:center;
  overflow-wrap:normal;word-break:keep-all}
.tct-name .tct-two{color:var(--Orange)}
.tct-rule{width:min(100%,var(--RowWidth));height:var(--OW);background:var(--Orange);flex:none}
.tct-stage .tc-plate{min-width:calc(var(--PlateSize) * 3);min-height:calc(var(--PlateSize) * 1.25);font-size:var(--TextSize)}
`;

/** The longest wait between a double click's presses the usual systems allow, in seconds (owner's change; design silent). */
const DOUBLE_CLICK_TIME = 0.5;

/**
 * The press after START or CONTINUE, within DOUBLE_CLICK_TIME, is a double click's second: it is let go before it reaches the
 * next screen (the first tap of the standby board, an order row), up to its click. The page's root holds
 * data-title-pressed while that time runs.
 */
function swallowSecondPress(): void {
  const until = performance.now() + DOUBLE_CLICK_TIME * 1000;
  const types = ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "touchend", "click"] as const;
  const off = () => {
    for (const t of types) window.removeEventListener(t, swallow, true);
    clearTimeout(timer);
    delete document.documentElement.dataset.titlePressed;
  };
  const swallow = (e: Event) => {
    if (performance.now() > until) return off();
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (e.type === "click") off();
  };
  for (const t of types) window.addEventListener(t, swallow, { capture: true, passive: false });
  document.documentElement.dataset.titlePressed = "true";
  const timer = setTimeout(off, DOUBLE_CLICK_TIME * 1000);
}

export type TitleScreen = {
  /** Shows the title with its plate; `onPress` once, on the first press. */
  show(o: { label: "START" | "CONTINUE"; controls: readonly FrameControl[]; onPress: () => void }): void;
  /** The plate's label while the title shows (the progress may change under it). */
  setLabel(label: "START" | "CONTINUE"): void;
};

export function titleScreen(shell: Shell): TitleScreen {
  let stage: HTMLElement;
  let name: HTMLElement;
  let button: Plate | null = null;
  let label: "START" | "CONTINUE" = "START";
  let pressed: (() => void) | null = null;

  /** The name as large as the window holds it: its longest word on one row, every row within the window's height. */
  const fitName = () => {
    if (!stage.clientWidth) return;
    const room = { w: stage.clientWidth - 2 * parseFloat(getComputedStyle(stage).paddingLeft), h: stage.clientHeight * 0.6 };
    let px = Math.min(160, room.h / 2);
    name.style.fontSize = `${px}px`;
    for (let i = 0; i < 40 && px > 12 && (name.scrollWidth > room.w + 0.5 || name.offsetHeight > room.h + 0.5); i++) {
      px *= 0.94;
      name.style.fontSize = `${px}px`;
    }
  };

  const draw = () => {
    button = plate({
      label,
      onPress: () => {
        const go = pressed;
        pressed = null;
        if (!go) return false;
        swallowSecondPress();
        go();
        return true;
      },
    });
    button.el.dataset.control = label.toLowerCase();
    stage.replaceChildren(name, h("div", { class: "tct-rule", "aria-hidden": "true" }), button.el);
  };

  const frame = shell.define("title", {
    title: GAME_NAME,
    mount: (f) => {
      if (!document.getElementById("tct-styles")) document.head.append(h("style", { id: "tct-styles" }, STYLE));
      // The strip's heading names the screen; the large name is the same words drawn, so a screen reader reads them once.
      name = h("div", { class: "tct-name", "data-part": "title-name", "aria-hidden": "true" }, "TRANSMISSION CONTROL ", h("span", { class: "tct-two" }, "2"));
      stage = h("div", { class: "tct-stage", "data-part": "title" });
      f.window.append(stage);
      draw();
    },
    onFit: () => fitName(),
    onShow: () => fitName(),
  });

  return {
    show(o) {
      label = o.label;
      pressed = o.onPress;
      draw();
      frame.setControls([...o.controls]);
      shell.show("title");
      fitName();
    },
    setLabel(l) {
      if (l === label) return;
      label = l;
      draw();
    },
  };
}
