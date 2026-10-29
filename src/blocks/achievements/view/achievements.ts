// Achievements in the page (ACHIEVE-01, ACHIEVE-02): earned after each report for its act, and after a save code for every act;
// the commendation lines after a report and in a debrief; beside each act in the archive, its achievements as a wall of medals;
// the COMMENDATIONS screen, every act's heading then its wall, reached by MEDALS, which shows the count earned (owner's change).
import { actHeading, declareKeys, h, KEY, key, medal, medalGrid, plate, type FrameControl, type Plate, type RibbonColour, type SilhouetteName } from "../../../platform/pieces";
import { ACTS, actFamily } from "../../campaign/api";
import { order as orderOf } from "../../orders/api";
import type { Achievements, AchievementsDeps, AchievementsExtension } from "../api";
import {
  achievements,
  actAchievements,
  commendationLine,
  debriefAchievementLines,
  kindProgress,
  newlyEarned,
  progressLine,
  type Kind,
  type Standing,
} from "../logic/achievements";

/** A medal's ribbon by its kind (owner's change; design silent). */
const RIBBON: Record<Kind, RibbonColour> = { results: "Orange", "second wirings": "Teal", par: "Cream" };

export function startAchievements(d: AchievementsDeps): Achievements {
  const { shell, campaign, archive, bests } = d;
  const total = achievements().length;
  // The key's size holds the widest count it can show.
  declareKeys({ label: "ORDERS" }, { label: "MEDALS", sub: `${total}/${total}` });
  let earned = new Set<string>();
  let ext: AchievementsExtension = {};
  const changed = new Set<() => void>();

  // ---------- MEDALS, with the count earned over the total (owner's change) ----------

  const live = new Set<Plate>();
  const count = () => achievements().filter((a) => earned.has(a.name)).length;
  const sub = () => `${count()}/${total}`;
  const aria = () => `MEDALS, ${count()} of ${total} earned`;
  /** Every MEDALS key and every medal wall on the page shows the medals now: on each earning, and on a save restored or a code
   * read. A wall is drawn again in its place, on whichever screen holds it (COMMENDATIONS, the archive), the list's scroll kept. */
  const recount = () => {
    for (const p of live) p.setSub(sub(), aria());
    for (const g of document.querySelectorAll<HTMLElement>("[data-medals]")) g.replaceWith(wall(Number(g.dataset.medals)));
  };
  /** A MEDALS key: a press opens the commendations when `may` allows; held down on the commendations themselves. */
  const medalsKey = (may: (() => boolean) | null): Plate => {
    // A key is attached as it is returned, so one not on the page is a render's old one: let it go.
    for (const p of live) if (!p.el.isConnected) live.delete(p);
    const p = plate({ label: "MEDALS", sub: sub(), aria: aria(), ...(may ? { onPress: () => may() && show() } : { held: true }) });
    p.el.dataset.control = "medals";
    live.add(p);
    return p;
  };
  const standing = (): Standing => ({ progress: campaign.progress(), found: (n) => archive.found(n), best: (n) => bests.best(n), repairBest: (n) => bests.repairBest(n) });
  const earn = (acts: number[]) => {
    const got = newlyEarned(acts, earned, standing());
    if (got.length) {
      earned = new Set([...earned, ...got.map((a) => a.name)]);
      recount();
      for (const cb of changed) cb();
    }
    return got.map(commendationLine);
  };

  /** An act's achievements as medals (owner's change to archive.md's rows): each with its name; earned, in colour with its
   * commendation's line; the rest dim, with their kind's progress as the debrief words it. */
  const wall = (act: number) => {
    const f = actFamily(act);
    const medals = actAchievements(act).map((a) => {
      const has = earned.has(a.name);
      const m = medal({
        name: a.name,
        text: has ? a.line : progressLine(a.kind, kindProgress(a.kind, a.act, standing())),
        earned: has,
        silhouette: f.silhouette as SilhouetteName,
        ribbon: RIBBON[a.kind],
      });
      m.dataset.achievement = a.name;
      m.dataset.variant = "achievement";
      return m;
    });
    const grid = medalGrid(medals, `ACT ${act} ${f.name} commendations`);
    grid.dataset.medals = String(act);
    return grid;
  };

  // ---------- the COMMENDATIONS screen ----------

  const frame = shell.define("commendations", { title: "COMMENDATIONS", mount: () => {}, onShow: () => render() });
  /** Every act, its heading then its wall, in a list that scrolls as the archive's; ORDERS, MEDALS held down, ARCHIVE, AUDIO. */
  const render = () => {
    const list = h("div", { class: "tc-list", "data-part": "commendations-list" });
    list.style.cssText = "height:100%;overflow-y:auto;overscroll-behavior:contain";
    for (let act = 1; act <= ACTS; act++) {
      const f = actFamily(act);
      const head = actHeading({ act, family: f.name, silhouette: f.silhouette as SilhouetteName, inactive: true });
      head.el.dataset.act = String(act);
      list.append(head.el, wall(act));
    }
    frame.window.replaceChildren(list);
    // ORDERS, MEDALS held down; ARCHIVE's slot stays empty (it shows on the order list only); AUDIO.
    const orders = plate({ label: "ORDERS", onPress: () => campaign.showOrderList() });
    orders.el.dataset.control = "orders";
    const controls: FrameControl[] = [key(orders, KEY.orders), key(medalsKey(null), KEY.medals), ...(ext.controls?.() ?? [])];
    frame.setControls(controls);
  };
  const show = () => {
    shell.show("commendations");
    render();
  };

  campaign.extend({
    commendations: (n) => earn([orderOf(n).act]),
    debriefAchievements: (act) => debriefAchievementLines(act, earned, standing()),
    medalsKey,
  });
  archive.extend({ actRows: (act) => [wall(act)], medalsKey });

  return {
    earned: () => [...earned],
    setEarned(names) {
      earned = new Set(names);
      recount();
    },
    earnAll: () => earn(Array.from({ length: ACTS }, (_, i) => i + 1)),
    onChange(cb) {
      changed.add(cb);
      return () => changed.delete(cb);
    },
    extend(e) {
      ext = { ...ext, ...e };
    },
    show,
  };
}
