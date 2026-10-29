import { describe, expect, test } from "bun:test";
import { wrapPaperLine } from "../pieces/printout";
import { bestSplit } from "../pieces/plate";
import { markCode, tileOutline, tileShapeForAct } from "../pieces/mark-tile";

describe("ART-12 paper wrap", () => {
  test("a line longer than PaperColumns wraps at spaces", () => {
    const rows = wrapPaperLine("Department of Records: everything on file, nothing ever found.", 32);
    expect(rows).toEqual(["Department of Records:", "everything on file, nothing ever", "found."]);
    for (const r of rows) expect(r.length).toBeLessThanOrEqual(32);
  });
  test("a word longer than PaperColumns breaks at the column, as a save code does", () => {
    const code = "TC2-1-7F3K9Q2M8X4V1B6N5C0Z7L2P9R4T8W3Y6H5J1";
    expect(wrapPaperLine(code, 32)).toEqual([code.slice(0, 32), code.slice(32)]);
    expect(wrapPaperLine(`CODE ${code}`, 32)).toEqual(["CODE", code.slice(0, 32), code.slice(32)]);
  });
  test("an empty line is one empty row", () => expect(wrapPaperLine("", 32)).toEqual([""]));
});

describe("plate label wrap", () => {
  test("LOAD SAVE CODE onto two and three lines", () => {
    expect(bestSplit(["LOAD", "SAVE", "CODE"], 2)).toEqual(["LOAD", "SAVE CODE"]);
    expect(bestSplit(["LOAD", "SAVE", "CODE"], 3)).toEqual(["LOAD", "SAVE", "CODE"]);
  });
});

describe("ART-11 tiles", () => {
  test("codes: the first two letters; LB for labelled", () => {
    expect(markCode("laminated")).toBe("LA");
    expect(markCode("labelled")).toBe("LB");
    expect(markCode("summarized")).toBe("SU");
  });
  test("shapes in act order", () => {
    expect([1, 2, 3, 4, 5, 6].map(tileShapeForAct)).toEqual(["circle", "square", "hexagon", "pentagon", "octagon", "arch"]);
    expect(() => tileShapeForAct(7)).toThrow();
  });
  test("every outline path closes", () => {
    for (const s of ["circle", "square", "hexagon", "pentagon", "octagon", "arch"] as const) expect(tileOutline(s).d.endsWith("Z")).toBe(true);
  });
});
