// The archive in the page (ARCHIVE-01 to ARCHIVE-03, ui/archive.md): the state, and the Incident archive screen: per act, its
// heading, its achievements, then each order with its results found and its filed reports; a tap reprints a report at once.
import {
  actHeading,
  declareKeys,
  KEY,
  key,
  listRow,
  plate,
  printout,
  type FrameControl,
  type PrintLine,
  type Printout,
  type SilhouetteName,
} from "../../../platform/pieces";
import { h } from "../../../platform/pieces/dom";
import { families } from "../../agents/api";
import { orders } from "../../orders/api";
import type { Archive, ArchiveDeps, ArchiveExtension, ArchiveState, Filed } from "../api";
import { EMPTY_ARCHIVE, fileReport, foundOf, orderRows, replay, resultsLine } from "../logic/archive";

/** A report as it prints: its lead in double strike (ART-12), then its lines. */
export function reportLines(lines: readonly string[]): PrintLine[] {
  return lines.map((text, i) => (i === 0 ? { text, double: true } : { text }));
}

export function startArchive(d: ArchiveDeps): Archive {
  const { shell, sound } = d;
  let state: ArchiveState = EMPTY_ARCHIVE;
  let ext: ArchiveExtension = {};
  const changed = new Set<() => void>();
  let paperUp = false;
  declareKeys({ label: "ORDERS" });

  const frame = shell.define("archive", { title: "INCIDENT ARCHIVE", mount: () => {}, onShow: () => render() });

  const print = (lines: PrintLine[], o: { controls?: HTMLElement[]; atOnce?: boolean } = {}): Printout => {
    const p = printout({
      lines,
      ...(o.controls ? { controls: o.controls } : {}),
      onLine: (l) => void sound.play("teletype", l.double ? { double: true } : {}),
      onAtOnce: () => void sound.play("teletype"),
      onBell: () => void sound.play("bell"),
      onClosed: () => (paperUp = false),
    });
    paperUp = true;
    frame.showPaper(p);
    if (o.atOnce) p.printAtOnce();
    else void p.print();
    return p;
  };

  const reprint = (f: Filed): Printout => {
    const { report } = replay(f.order, f.wiring);
    const controls: HTMLElement[] = [];
    const p = print(reportLines(report.lines), { controls, atOnce: false });
    // ARCHIVE-03: it prints at once, with its share control.
    const share = ext.share?.(f, p);
    if (share) controls.push(share);
    p.printAtOnce();
    return p;
  };

  const render = () => {
    const list = h("div", { class: "tc-list", "data-part": "archive-list" });
    list.style.cssText = "height:100%;overflow-y:auto;overscroll-behavior:contain";
    const listed = new Set(ext.listed?.() ?? orders().map((o) => o.n));
    const acts = [...new Set(orders().filter((o) => listed.has(o.n)).map((o) => o.act))].sort((a, b) => a - b);
    for (const act of acts) {
      const f = families().find((x) => x.act === act)!;
      const tap = ext.headingTap?.(act) ?? null;
      const head = actHeading({
        act,
        family: f.name,
        silhouette: f.silhouette as SilhouetteName,
        ...(tap ? { onPress: () => !paperUp && tap() } : { inactive: true }),
      });
      head.el.dataset.act = String(act);
      list.append(head.el, ...(ext.actRows?.(act) ?? []));
      for (const o of orders().filter((x) => x.act === act && listed.has(x.n))) {
        const row = listRow({ first: `${o.n} ${o.name}`, far: resultsLine(foundOf(state, o.n).length), inactive: true });
        row.el.dataset.order = String(o.n);
        list.append(row.el);
        for (const r of orderRows(state, o.n, ext.litBy?.(o.n) ?? null)) {
          if (r.kind === "result") {
            // A result found whose report was dropped: listed by its line alone, with no report to reprint (ARCHIVE-02).
            const x = listRow({ first: "", lead: r.text, variant: "report", inactive: true });
            x.el.dataset.result = String(r.result);
            x.el.dataset.dropped = "true";
            list.append(x.el);
            continue;
          }
          const second = [...(r.note ? [r.note] : []), ...(r.secondWiring ? ["SECOND WIRING"] : [])];
          const x = listRow({
            first: "",
            lead: r.report.lead,
            variant: "report",
            ...(second.length ? { second } : {}),
            onPress: () => !paperUp && reprint(r.filed),
          });
          x.el.dataset.report = r.filed.id;
          if (r.result !== null) x.el.dataset.result = String(r.result);
          list.append(x.el);
        }
      }
    }
    frame.window.replaceChildren(list);
    // Owner's change: ORDERS, the way back, and MEDALS; then AUDIO, each in its slot. ARCHIVE's own slot stays empty.
    const back = plate({ label: "ORDERS", onPress: () => !paperUp && ext.orders?.() });
    back.el.dataset.control = "orders";
    const controls: FrameControl[] = [
      key(back, KEY.orders),
      ...(ext.medalsKey ? [key(ext.medalsKey(() => !paperUp), KEY.medals)] : []),
      ...(ext.controls?.() ?? []),
    ];
    frame.setControls(controls);
  };

  const notify = () => {
    for (const cb of changed) cb();
    if (shell.current === "archive" && !paperUp) render();
  };

  return {
    state: () => state,
    setState(s) {
      state = s;
      if (shell.current === "archive" && !paperUp) render();
    },
    file(n, report, wiring) {
      const r = fileReport(state, n, report, wiring);
      state = r.state;
      if (r.result.isNew || r.result.foundResult !== null) notify();
      return r.result;
    },
    isFiled: (n, id) => state.filed.some((f) => f.order === n && f.id === id),
    found: (n) => foundOf(state, n),
    rows: (n, litBy = null) => orderRows(state, n, litBy),
    extend(e) {
      ext = { ...ext, ...e };
    },
    show() {
      shell.show("archive");
      render();
    },
    reprint,
    print,
    onChange(cb) {
      changed.add(cb);
      return () => changed.delete(cb);
    },
  };
}

