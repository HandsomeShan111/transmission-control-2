// SHARE- rules a logic run can check (design/docs/build/acceptance-campaign.md, Report sharing): the text, the picture's bands.
import { describe, expect, test } from "bun:test";
import { replay } from "../../incident-archive/api";
import { order } from "../../orders/api";
import { parseWiring } from "../../wires/api";
import { PICTURE, cutRows, leadItem, pictureLayout, pictureResultLine, shareText, wrapRows } from "../api";

/** SansStack at about 0.46 em a character (the design's worked number for the shared picture). */
const measure = (t: string) => t.length * PICTURE.textSize * 0.46;
const width = PICTURE.width - 2 * PICTURE.margin;

describe("SHARE-01 Text", () => {
  test("a first line with the order's name and GameLink, then the report's lines as printed", () => {
    const r = replay(1, parseWiring(order(1), "IN → World Council"));
    const t = shareText("Signing ceremony", "handsomeshan111.github.io/transmission-control-2", r.report).split("\n");
    expect(t[0]).toBe("Transmission Control 2, Signing ceremony: handsomeshan111.github.io/transmission-control-2");
    expect(t.slice(1)).toEqual([...r.report.lines]);
  });
});

describe("SHARE-02 Picture", () => {
  test("rows wrap at spaces; a text over PictureTextRows is cut, its last row ending …", () => {
    const rows = wrapRows("a ".repeat(200), width, measure);
    expect(rows.every((r) => measure(r) <= width)).toBe(true);
    const cut = cutRows(rows, PICTURE.textRows, width, measure);
    expect(cut.rows).toHaveLength(PICTURE.textRows);
    expect(cut.rows[2]!.endsWith("…")).toBe(true);
    expect(cut.cut).toBe(true);
  });
  test("Derived: with a one-row name and a lead and result line of PictureTextRows rows each, the drawing stays over PictureDrawingMin", () => {
    const long = "word ".repeat(100);
    // The quiet zone: four modules of the smallest code, version 1 (21 modules), the most it can take.
    const quiet = Math.ceil((4 * PICTURE.qr) / 21);
    const L = pictureLayout({ form: "incident", name: "Colony bulletin", lead: long, result: long, measure, quiet });
    expect(L.nameRows).toHaveLength(1);
    expect(L.leadRows).toHaveLength(PICTURE.textRows);
    expect(L.drawing.h).toBe(PICTURE.height - 2 * PICTURE.margin - PICTURE.header - PICTURE.link - PICTURE.qr - PICTURE.lineHeight * 7 - quiet);
    expect(L.drawing.h).toBeGreaterThanOrEqual(PICTURE.drawingMin);
    expect(L.qr.y - (L.link.y + L.link.h)).toBe(quiet);
    expect(L.qr.y + L.qr.size).toBe(PICTURE.height - PICTURE.margin);
    // A quiet zone the drawing cannot spare stops at PictureDrawingMin.
    expect(pictureLayout({ form: "incident", name: "Colony bulletin", lead: long, result: long, measure, quiet: 1000 }).drawing.h).toBe(PICTURE.drawingMin);
  });
  test("order 9 wired in a loop through TRANSLATOR: its lead takes PictureTextRows rows, the last ending …, and prints once", () => {
    const o = order(9);
    const w = parseWiring(o, "IN → TRANSLATOR; TRANSLATOR → LAMINATOR 1; LAMINATOR 1 → CENSOR; CENSOR plus → SUMMARIZER; SUMMARIZER → LAMINATOR 2; LAMINATOR 2 → TRANSLATOR");
    const r = replay(9, w);
    expect(r.report.handWritten).toBeNull();
    const it = leadItem(r.report, r.trace);
    const L = pictureLayout({ form: r.report.form, name: o.name, lead: r.report.lead, result: pictureResultLine(r.report, it), measure, quiet: (4 * PICTURE.qr) / 33 });
    expect(L.leadRows).toHaveLength(PICTURE.textRows);
    expect(L.leadRows[2]!.endsWith("…")).toBe(true);
    expect(L.resultRows).toHaveLength(0);
    expect(L.drawing.h).toBeGreaterThanOrEqual(PICTURE.drawingMin);
  });
  test("a mission report's lead item is the batch's first item; a stopped or lost item has no result line", () => {
    const o = order(1);
    const win = replay(1, parseWiring(o, "IN → LAMINATOR; LAMINATOR → World Council"));
    expect(leadItem(win.report, win.trace).id).toBe("1");
    const stop = replay(1, parseWiring(o, "IN → LAMINATOR"));
    expect(pictureResultLine(stop.report, leadItem(stop.report, stop.trace))).toBeNull();
  });
});
