// Report sharing in the page (SHARE-01, SHARE-02, ART-26): the SHARE control on a printed report and on a reprint; TEXT copies the
// report with GameLink; PICTURE draws it with GameLink and a QR code, offers it as a download, and opens the share sheet where the
// device has one. A refused copy prints the text to select; a browser with no download shows the picture on screen.
import qrcode from "qrcode-generator";
import { h, plate, s, type PrintLine, type Printout } from "../../../platform/pieces";
import { pageSlots } from "../../../platform/slots";
import { art, boardLayout as B, colours, objects, typeStacks } from "../../../platform/tokens";
import { markLook, markMetrics } from "../../agents/api";
import { replay } from "../../incident-archive/api";
import { arrivalSign, firstDifferencePlaces, rowItem, rowStamp, rowTileX, tileRing, type DrawContext } from "../../items/api";
import { gameLink, gameUrl } from "../../offline-play/api";
import { order as orderOf } from "../../orders/api";
import type { Report } from "../../reports/api";
import type { Trace, TraceItem } from "../../run/api";
import { BOARD_SLOTS } from "../../wiring-board/api";
import type { PictureMade, SharingDeps } from "../api";
import { COPIED, PICTURE, PICTURE_FAILED, PICTURE_ON_SCREEN, SAVED, SELECT_AND_COPY, leadItem, pictureLayout, pictureResultLine, shareText } from "../logic/sharing";

type Shared = { readonly order: number; readonly report: Report; readonly trace: Trace };

/**
 * ART-26: on the Cream ground a tile's Cream outline vanishes, leaving its Ink; the board's first-difference ring, scaled by
 * that Ink's share of the tile about its centre, stands to it as the board's ring stands to the whole tile (design silent).
 */
function pictureRing(k: number, dy: number): SVGGElement {
  const f = (objects.MarkTileSize - 2 * art.OutlineWeight) / objects.MarkTileSize;
  const x = rowTileX(k);
  const r = tileRing(k);
  r.setAttribute("transform", `translate(${x} ${dy}) scale(${f}) translate(${-x} 0)`);
  return r;
}

/** ART-26: the lead item at its output under its required output, as a result row draws it (ITEM-04). */
function drawing(it: TraceItem): SVGGElement {
  const ctx: DrawContext = { look: markLook, metrics: markMetrics() };
  const g = s("g", { "data-part": "picture-drawing" });
  const gap = B.TileGap * 2;
  const step = B.RowBodySize + gap;
  const marks = it.marks.map((m) => m.name);
  if (it.required) {
    const req = rowItem(it.required.kind, it.required.marks, ctx);
    g.append(req);
  }
  const res = s("g", { transform: `translate(0 ${step})` });
  if (it.end.type === "arrived") {
    res.append(rowItem(it.kind, marks, ctx, it.rejectedBy !== null), arrivalSign(it.matched ? "plus" : "minus"));
    const diff = it.required && !it.matched ? firstDifferencePlaces(marks, it.required.marks) : null;
    if (diff) {
      // ITEM-04: the differing mark and the required one above it; an extra or a missing mark rings its place in the result only.
      res.append(pictureRing(diff.result, 0));
      if (diff.required !== null) res.append(pictureRing(diff.required, -step));
    }
  } else {
    // A stopped or lost lead item: its kind and marks at its end, stamped as ITEM-04 stamps it.
    res.append(rowItem(it.kind, marks, ctx, it.rejectedBy !== null));
    const where = it.end.type === "lost" ? "LOST" : it.end.type === "rejected" ? `STOPPED: ${it.end.agent}` : `STOPPED: ${it.end.agent ?? "INPUT TERMINAL"}`;
    const st = rowStamp(where, 11);
    st.setAttribute("transform", `translate(0 ${B.RowBodySize / 2 + gap + 10})`);
    res.append(st);
  }
  g.append(res);
  return g;
}

/** A drawing as an image of its own size, for the picture's canvas. */
async function svgImage(g: SVGGElement): Promise<{ img: HTMLImageElement; w: number; h: number }> {
  const probe = s("svg", { xmlns: "http://www.w3.org/2000/svg", width: 10, height: 10, style: "position:absolute;left:-9999px;top:0" }, g);
  document.body.append(probe);
  const bb = g.getBBox();
  probe.remove();
  const pad = 4;
  const svg = s(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width: bb.width + 2 * pad, height: bb.height + 2 * pad, viewBox: `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}` },
    g,
  );
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("drawing not drawn"));
      img.src = url;
    });
    return { img, w: bb.width + 2 * pad, h: bb.height + 2 * pad };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** SHARE-02, ART-26: the picture, PictureWidth by PictureHeight, on a Cream ground; Ink type in SansStack; the QR code Ink on Cream. */
export async function drawPicture(x: Shared): Promise<{ canvas: HTMLCanvasElement; made: PictureMade }> {
  const P = PICTURE;
  const o = orderOf(x.order);
  const it = leadItem(x.report, x.trace);
  const canvas = document.createElement("canvas");
  canvas.width = P.width;
  canvas.height = P.height;
  const c = canvas.getContext("2d")!;
  const font = (px: number, bold = false) => `${bold ? "700 " : ""}${px}px ${typeStacks.SansStack}`;
  c.font = font(P.textSize);
  const measure = (t: string) => c.measureText(t).width;
  // The QR code of GameLink, QRSize across, at error correction level M; four of its modules of Cream above it.
  const q = qrcode(0, "M");
  q.addData(gameUrl());
  q.make();
  const count = q.getModuleCount();
  const L = pictureLayout({ form: x.report.form, name: o.name, lead: x.report.lead, result: pictureResultLine(x.report, it), measure, quiet: (4 * P.qr) / count });
  const inner = P.width - 2 * P.margin;
  c.fillStyle = colours.Cream;
  c.fillRect(0, 0, P.width, P.height);
  c.fillStyle = colours.Ink;
  c.textBaseline = "middle";
  // One row in PictureTextSize type; shrunk only where it would pass the row (design silent).
  const fitRow = (t: string, bold: boolean, width: number) => {
    let px: number = P.textSize;
    c.font = font(px, bold);
    while (px > 12 && c.measureText(t).width > width) c.font = font(--px, bold);
    return px;
  };
  // Header: the report's form at the start, the game's name at the end.
  c.textAlign = "left";
  fitRow(L.header.form, true, inner / 2);
  c.fillText(L.header.form, P.margin, L.header.y + L.header.h / 2);
  c.textAlign = "right";
  fitRow(L.header.name, false, inner / 2);
  c.fillText(L.header.name, P.width - P.margin, L.header.y + L.header.h / 2);
  c.textAlign = "left";
  const rows = (list: readonly string[], y0: number, bold: boolean) => {
    c.font = font(P.textSize, bold);
    list.forEach((r, i) => c.fillText(r, P.margin, y0 + i * P.lineHeight + P.lineHeight / 2));
  };
  rows(L.nameRows, L.textY, true);
  rows(L.leadRows, L.textY + L.nameRows.length * P.lineHeight, false);
  // The drawing: scaled to fit its band, centred in it.
  const drawn = drawing(it);
  const rings = drawn.querySelectorAll('[data-part="difference-ring"]').length;
  const art = await svgImage(drawn);
  const k = Math.min(inner / art.w, L.drawing.h / art.h);
  const dw = art.w * k;
  const dh = art.h * k;
  c.drawImage(art.img, (P.width - dw) / 2, L.drawing.y + (L.drawing.h - dh) / 2, dw, dh);
  rows(L.resultRows, L.resultY, false);
  // GameLink, printed: one row; GameLink is 48 characters, over GameLinkMax, so its type shrinks to fit the row (plan.md).
  const link = gameLink();
  const linkPx = fitRow(link, false, inner);
  c.textAlign = "center";
  c.fillText(link, P.width / 2, L.link.y + L.link.h / 2);
  const cell = L.qr.size / count;
  for (let r = 0; r < count; r++)
    for (let col = 0; col < count; col++)
      if (q.isDark(r, col)) {
        const x0 = Math.round(L.qr.x + col * cell);
        const y0 = Math.round(L.qr.y + r * cell);
        c.fillRect(x0, y0, Math.round(L.qr.x + (col + 1) * cell) - x0, Math.round(L.qr.y + (r + 1) * cell) - y0);
      }
  const made: PictureMade = {
    order: x.order,
    width: canvas.width,
    height: canvas.height,
    qr: { size: L.qr.size, modules: count, version: (count - 17) / 4, data: gameUrl(), x: L.qr.x, y: L.qr.y },
    nameRows: L.nameRows.length,
    leadRows: [...L.leadRows],
    leadCut: L.leadCut,
    resultRows: [...L.resultRows],
    drawingHeight: L.drawing.h,
    rings,
    linkSize: linkPx,
  };
  return { canvas, made };
}

/** The top of the third-last paper row in view, the body's and the foot's: the picture view stands above it. */
function thirdLastRowTop(paper: Element): number | null {
  const tops: number[] = [];
  for (const ln of paper.querySelectorAll('[data-part="paper-line"]')) {
    const r = ln.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(ln).lineHeight);
    const clip = (ln.closest(".tc-pbody, .tc-foot") ?? paper).getBoundingClientRect();
    for (let i = 0; i < Math.max(1, Math.round(r.height / lh)); i++) {
      const t = r.top + i * lh;
      if (t >= clip.top - 0.5 && t + lh <= clip.bottom + 0.5) tops.push(t);
    }
  }
  tops.sort((a, b) => a - b);
  return tops.length ? tops[Math.max(0, tops.length - 3)]! : null;
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("no picture"))), "image/png"));

export function startReportSharing(d: SharingDeps): { lastPicture(): PictureMade | null } {
  const { board, archive, campaign } = d;
  let last: PictureMade | null = null;

  /** Prints share lines into the paper the control sits on: the printed report's, or a reprint's. */
  const control = (x: Shared, say: (l: PrintLine) => void): HTMLElement => {
    const box = h("span", { "data-control": "share" });
    box.style.cssText = "display:inline-flex;gap:var(--PlateGap)";
    const text = plate({ label: "TEXT", onPaper: true, onPress: () => void shareAsText(x, say) });
    // A press while a picture is being drawn does nothing, and clicks not (owner's change).
    const picture = plate({
      label: "PICTURE",
      onPaper: true,
      onPress: () => {
        if (drawingNow) return false;
        void shareAsPicture(x, say, box.closest(".tc-paper"));
        return true;
      },
    });
    text.el.dataset.control = "share-text";
    picture.el.dataset.control = "share-picture";
    const share = plate({ label: "SHARE", onPaper: true, onPress: () => box.replaceChildren(text.el, picture.el) });
    share.el.dataset.control = "share-open";
    box.append(share.el);
    return box;
  };

  const shareAsText = async (x: Shared, say: (l: PrintLine) => void) => {
    const text = shareText(orderOf(x.order).name, gameLink(), x.report);
    let ok = true;
    try {
      await (d.clipboard ?? ((t: string) => navigator.clipboard.writeText(t)))(text);
    } catch {
      ok = false;
    }
    if (ok) say({ text: COPIED });
    else {
      // SHARE-01: the text prints on the teletype, selected for the player to copy, and SELECT AND COPY prints.
      const lines = text.split("\n").map((t) => ({ text: t }));
      const job = campaign.print({ lines: [...lines, { text: SELECT_AND_COPY }], atOnce: true });
      const p = await job.shown;
      p.el.dataset.paper = "share-text";
      const all = [...p.el.querySelectorAll('[data-part="paper-line"]')];
      const sel = window.getSelection();
      if (sel && all.length > 1) {
        const r = document.createRange();
        r.setStartBefore(all[0]!);
        r.setEndAfter(all[all.length - 2]!);
        sel.removeAllRanges();
        sel.addRange(r);
        // The paper breaks a line at its columns, GameLink among them: a copy of the whole text carries the text itself.
        const bare = (t: string) => t.replace(/\s+/g, "");
        const onCopy = (e: ClipboardEvent) => {
          if (!p.el.isConnected) return document.removeEventListener("copy", onCopy);
          if (bare(window.getSelection()?.toString() ?? "") !== bare(text)) return;
          e.clipboardData?.setData("text/plain", text);
          e.preventDefault();
        };
        document.addEventListener("copy", onCopy);
      }
    }
    if (typeof navigator.share === "function") void navigator.share({ text }).catch(() => {});
  };

  /** One picture at a time: a second tap while one is drawn does nothing. A picture that cannot be made prints PICTURE_FAILED. */
  let drawingNow = false;
  const shareAsPicture = async (x: Shared, say: (l: PrintLine) => void, paper: Element | null) => {
    if (drawingNow) return;
    drawingNow = true;
    try {
      const { canvas, made } = await drawPicture(x);
      last = made;
      const blob = await toBlob(canvas);
      const name = `transmission-control-2-order-${x.order}.png`;
      if (!("download" in HTMLAnchorElement.prototype)) {
        say({ text: PICTURE_ON_SCREEN });
        pictureView(canvas, paper);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = h("a", { href: url, download: name });
      a.style.display = "none";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      say({ text: SAVED });
      const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
      if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) void navigator.share({ files: [file] }).catch(() => {});
    } catch {
      say({ text: PICTURE_FAILED });
    } finally {
      drawingNow = false;
    }
  };

  /**
   * ui/style.md Picture view: over the window and its printout, fitted whole above the printout's last three lines, centred, its
   * outline Ink. A tap anywhere but on the AUDIO switch closes the picture only (SHARE-02).
   */
  const pictureView = (canvas: HTMLCanvasElement, paper: Element | null) => {
    const frame = d.shell.frame(d.shell.current ?? "board")!;
    const win = frame.window.getBoundingClientRect();
    const fr = frame.el.getBoundingClientRect();
    const line = parseFloat(getComputedStyle(frame.el).getPropertyValue("--PaperTextSize")) * 1.3 || 20;
    const bottom = (paper && thirdLastRowTop(paper)) ?? win.bottom - 3 * line;
    const room = { w: win.width, h: Math.max(40, Math.min(win.bottom, bottom) - win.top) };
    const k = Math.min(room.w / canvas.width, room.h / canvas.height);
    const img = h("img", { src: canvas.toDataURL("image/png"), alt: "shared picture", "data-part": "picture-view" });
    img.style.cssText = `position:absolute;left:${win.left - fr.left + (win.width - canvas.width * k) / 2}px;top:${win.top - fr.top + (room.h - canvas.height * k) / 2}px;width:${canvas.width * k}px;height:${canvas.height * k}px;border:var(--OW) solid var(--Ink);background:var(--Cream)`;
    const catcher = h("div", { "data-part": "picture-catcher" });
    catcher.style.cssText = "position:absolute;inset:0;z-index:60";
    catcher.append(img);
    const close = (e: Event) => {
      const audio = frame.el.querySelector('[data-control="audio"]');
      const r = audio?.getBoundingClientRect();
      const pe = e as PointerEvent;
      if (r && pe.clientX >= r.left && pe.clientX <= r.right && pe.clientY >= r.top && pe.clientY <= r.bottom) {
        (audio!.querySelector("button") ?? (audio as HTMLElement)).click();
        return;
      }
      catcher.remove();
    };
    catcher.addEventListener("click", close);
    frame.el.append(catcher);
  };

  // On a printed report: its run is the Board's last run.
  pageSlots.fill(BOARD_SLOTS.share, () => {
    const lr = board.lastRun();
    if (!lr) return null;
    return control({ order: lr.order, report: lr.report, trace: lr.trace }, (l) => board.reportPaper()?.addFootLine(l));
  });
  // On a reprint: the filed report's run, and its own paper.
  archive.extend({
    share: (f, paper: Printout) => {
      const r = replay(f.order, f.wiring);
      return control({ order: f.order, report: r.report, trace: r.trace }, (l) => paper.addFootLine(l));
    },
  });

  return { lastPicture: () => last };
}
