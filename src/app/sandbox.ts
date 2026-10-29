// Test sandbox (system architecture: layers 0 and 1): one order by number from ?order=n, every Board control working,
// no campaign. Never shipped to players. Test aids, design silent on them:
// - ?wiring=<wires in the data's notation> opens the order on that wiring, as a kept wiring would.
// - ?layers=2 adds layer 2, Repair orders (MOVES lamp, moves line), for the REPAIR- browser tests.
// - ORDERS opens the next order (the order list belongs to layer 3).
// - AUDIO mutes the page's sound (the Settings block belongs to layer 5).
// - window.tc2 lets a test read the board's state; tc2.sounds logs each sound cue the board asks for, with its time.
import { orders, order as orderOf } from "../blocks/orders/api";
import { best as parBest } from "../blocks/par-and-score/api";
import { best as repairBest, repairBoard } from "../blocks/repair-orders/api";
import { parseWiring, wiring as heldWiring, formatWiring } from "../blocks/wires/api";
import { board as makeBoard, BOARD_SLOTS } from "../blocks/wiring-board/api";
import { createShell } from "../platform/shell";
import { createSound, type SoundSystem } from "../platform/sound";
import { pageEvents } from "../platform/events";
import { pageSlots } from "../platform/slots";
import { plate, switchPiece } from "../platform/pieces";

const q = new URLSearchParams(location.search);
const n = Number(q.get("order") ?? "1");
if (!Number.isInteger(n) || n < 1 || n > orders().length) throw new Error(`no order ${q.get("order")}`);

const shell = createShell();
const page = createSound();
page.unlock(document);
const sounds: { name: string; t: number; fast?: number; double?: boolean }[] = [];
const sound: SoundSystem = {
  play(name, o = {}) {
    sounds.push({ name, t: performance.now() + (o.delay ?? 0) * 1000, ...(o.fast !== undefined ? { fast: o.fast } : {}), ...(o.double ? { double: true } : {}) });
    return page.play(name, o);
  },
  setMuted: (m) => page.setMuted(m),
  get muted() {
    return page.muted;
  },
  unlock: (t) => page.unlock(t),
  get unlocked() {
    return page.unlocked;
  },
  stopAll: () => page.stopAll(),
  context: () => page.context(),
};
const board = makeBoard(shell, { sound });
// The game's key click on every real press of a plate (owner's change), as the assembly plays it.
pageEvents.on("keyPressed", () => void sound.play("key"));
if (q.get("layers") === "2") repairBoard(board);

const audio = switchPiece({
  label: "AUDIO",
  withLamp: true,
  lampOn: true,
  onFlip: () => {
    const muted = !sound.muted;
    sound.setMuted(muted);
    audio.set(muted);
    audio.lamp?.set(muted ? "off" : "steady");
  },
});
audio.plate.dataset.control = "audio";
pageSlots.fill(BOARD_SLOTS.audioSwitch, () => audio.el);
// BOARD-04: no leaving while the board is locked.
const ordersPlate = plate({ label: "ORDERS", onPress: () => !board.locked() && board.openOrder((board.currentOrder() ?? 0) % orders().length + 1) });
ordersPlate.el.dataset.control = "orders";
pageSlots.fill(BOARD_SLOTS.ordersControl, () => ordersPlate.el);

const events: { name: string; payload: unknown }[] = [];
for (const name of ["orderOpened", "wiringChanged", "runEnded", "reportClosed"] as const) pageEvents.on(name, (p) => events.push({ name, payload: p }));

const w = q.get("wiring");
board.openOrder(n, w !== null ? { wiring: parseWiring(orderOf(n), w) } : {});

Object.assign(window, {
  tc2: {
    board,
    events,
    sounds,
    wiring: () => formatWiring(heldWiring(board.currentOrder()!)),
    best: (k: number) => parBest(k),
    repairBest: (k: number) => repairBest(k),
  },
});
