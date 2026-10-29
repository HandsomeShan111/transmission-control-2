// The test build's page (acceptance.md, Test build): the release's game with the aids, and a test list of every order.
import { startGame, type Game } from "../app/game";
import { makeAids, seedNow, type Aids } from "./aids";
import { winningWirings } from "./search";
import { TEST_WIRINGS } from "./wirings.gen";
import { formatWiring } from "../blocks/wires/api";
import { order as orderOf } from "../blocks/orders/api";
import { gameVersion } from "../blocks/offline-play/api";

declare global {
  interface Window {
    __tc2?: Aids & {
      game: Game;
      version: number;
      /** True once the game has opened on its first screen. */
      opened: boolean;
      openOrder(n: number): Promise<void>;
      testWiring(n: number, label?: string): string | null;
      searchWins(n: number): string[];
    };
  }
}

seedNow();
const aids = makeAids();
// The local counter, under the test's own key (scripts/serve.ts).
let countKey = "";
try {
  countKey = localStorage.getItem("tc2aid.countKey") ?? "";
} catch {
  // a browser that keeps nothing counts under no key
}
const game = startGame({
  anyOrder: true,
  countAddress: new URL(`/__count/${countKey}`, location.href).href,
  hold: (p) => aids.hold(p),
  persist: () => aids.persist(),
  clipboard: (t) => aids.copy(t),
});
window.__tc2 = Object.assign(aids, {
  game,
  version: gameVersion(),
  opened: false,
  openOrder: (n: number) => game.campaign.openOrder(n),
  /** A test wiring's line (build/wirings.md): its first wiring, or the one with that label. */
  testWiring(n: number, label?: string) {
    const w = TEST_WIRINGS.find((x) => x.order === n)?.wirings.find((x) => !label || x.label === label);
    return w ? formatWiring(w.wires) : null;
  },
  searchWins: (n: number) => winningWirings(orderOf(n)).map((f) => formatWiring(f.wires)),
});

void game.opened.then(() => {
  if (window.__tc2) window.__tc2.opened = true;
});

// The test list: every order, past the campaign's locks; shown with ?testlist.
if (new URLSearchParams(location.search).has("testlist")) {
  void game.opened.then(() => {
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", "test list");
    sel.style.cssText = "position:fixed;right:2px;top:2px;z-index:999;font:12px monospace";
    sel.append(new Option("TEST LIST", ""), ...aids.orders().map((o) => new Option(`${o.n} ${o.name}`, String(o.n))));
    sel.addEventListener("change", () => sel.value && void game.campaign.openOrder(Number(sel.value)));
    document.body.append(sel);
  });
}
