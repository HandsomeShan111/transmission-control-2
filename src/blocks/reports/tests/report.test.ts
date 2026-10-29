// REPORT- acceptance tests, the report as data. Printing (REPORT-04) needs a browser.
import { describe, expect, test } from "bun:test";
import type { Wire } from "../../orders/api";
import { order } from "../../orders/api";
import type { TraceItem } from "../../run/api";
import { run } from "../../run/api";
import type { ItemBlock } from "../api";
import { ITEM_BLOCKS_MAX as CODE_ITEM_BLOCKS_MAX, ITEM_LINES_MAX as CODE_ITEM_LINES_MAX, firstDifference, report } from "../api";

// The design's start values (board/reports.md, Parameters), written here so a wrong constant in the code fails.
const ITEM_LINES_MAX = 8;
const ITEM_BLOCKS_MAX = 12;

test("Parameters: ItemLinesMax is 8 and ItemBlocksMax 12", () => {
  expect([CODE_ITEM_LINES_MAX, CODE_ITEM_BLOCKS_MAX]).toEqual([ITEM_LINES_MAX, ITEM_BLOCKS_MAX]);
});

// "A → B; C → D" as wires; the run checks each against the board.
const parseWiring = (_o: unknown, text: string): Wire[] =>
  text.split("; ").map((w) => {
    const [from, to] = w.split(" → ");
    return { from: from!, to: to! };
  });

const reportOf = (n: number, wiring: string | null) => {
  const o = order(n);
  return report(o, run(o, wiring === null ? o.opening! : parseWiring(o, wiring)));
};
const blocks = (r: ReturnType<typeof reportOf>) => r.blocks.filter((b): b is ItemBlock => "heading" in b);

describe("REPORT-01 Form and lead", () => {
  test("Signing ceremony: the opening wiring's incident report is led by its hand-written result, then the first difference", () => {
    const r = reportOf(1, null);
    expect([r.form, r.handWritten, r.leadItem]).toEqual(["incident", 0, "1"]);
    expect(r.lines.slice(0, 2)).toEqual(["The treaty arrived unlaminated, so legally a napkin. Hostilities resume at 0905.", "First difference: mark 1 missing; required laminated."]);
  });

  test("Signing ceremony won: the mission report's lead, then its scores, then each item's lines", () => {
    const r = reportOf(1, "IN → LAMINATOR; LAMINATOR → World Council");
    expect(r.form).toBe("mission");
    expect(r.lines.slice(0, 6)).toEqual([
      "Signing ceremony: delivered as ordered.",
      "Wires 2.",
      "Time 4.",
      "Treaty",
      "LAMINATOR laminated the treaty, leaving no margin for amendment.",
      "Delivered to World Council as ordered.",
    ]);
  });

  test("no hand-written result given: the first failing item's result line leads, or its end line when it has none", () => {
    expect(reportOf(13, "IN → SLICER; SLICER item → INSPECTOR; INSPECTOR minus → INSPECTOR; SLICER copy → Embassy").lead).toBe("Canteen received: Cake, sliced.");
    expect(reportOf(13, "IN → SLICER; SLICER item → SLICER; SLICER copy → Embassy").lead).toBe("Still in the wiring when the run ended.");
    expect(reportOf(21, "IN → STAMPER 1; STAMPER 1 → TALLY; TALLY minus → STAMPER 1").lead).toBe("TALLY holds the treaty: no wire.");
  });
});

describe("REPORT-02 Item lines", () => {
  test("Embassy dinner: paths by authored line and verdict word, a back-to-back repeat collapsed, end lines; the lead item leaves out what leads", () => {
    const r = reportOf(13, "IN → SLICER; SLICER item → INSPECTOR; INSPECTOR minus → INSPECTOR; SLICER copy → Embassy");
    expect(r.lines).toEqual([
      "Canteen received: Cake, sliced.",
      "First difference: none in kind or marks; the item was rejected.",
      "Cake",
      "SLICER cut the cake in two and obtained two cakes, neither of them a slice.",
      "INSPECTOR cut a thin section of the cake and examined it. Not paper. ×2",
      "INSPECTOR rejected the cake after 2 checks.",
      "Cake, copy 1",
      "Embassy received: Cake, sliced. First difference: mark 2 missing; required laminated.",
      "Treaty",
      "SLICER cut the treaty in two, and each half was a complete treaty.",
      "INSPECTOR held the treaty to the light and counted the fibres. Paper.",
      "INSPECTOR holds the treaty: no wire.",
      "Treaty, copy 1",
      "Embassy received: Treaty, sliced. Nobody ordered this treaty.",
    ]);
  });

  test("Moving day: a path over ItemLinesMax prints its first lines, a cut line naming the hidden lines' agents, then its last line", () => {
    const r = reportOf(18, "IN → COMPACTOR; COMPACTOR → LAMINATOR 1; LAMINATOR 1 → GAUGE; GAUGE plus → LAMINATOR 2; LAMINATOR 2 → RESTORER; GAUGE minus → RESTORER; RESTORER → LAMINATOR 1");
    const flag = blocks(r)[0]!;
    expect(flag.path.length).toBe(ITEM_LINES_MAX);
    expect(flag.path.slice(ITEM_LINES_MAX - 3)).toEqual([
      "LAMINATOR 1 laminated the flag, which then stood up on its own.",
      "2 more lines, through GAUGE and RESTORER.",
      "LAMINATOR 1 laminated the flag, which then stood up on its own.",
    ]);
    // RESTORER's line prints "the" and the first kind for {first}.
    expect(flag.path).toContain("RESTORER turned the cube back into the flag, corners last.");
  });

  test("Embassy dinner: over ItemBlocksMax items, the first blocks, a cut line, then the last item's block", () => {
    const r = reportOf(13, "IN → SLICER; SLICER item → SLICER; SLICER copy → Embassy");
    const o = order(13);
    const t = run(o, parseWiring(o, "IN → SLICER; SLICER item → SLICER; SLICER copy → Embassy"));
    expect(r.blocks.length).toBe(ITEM_BLOCKS_MAX);
    expect(r.blocks[ITEM_BLOCKS_MAX - 2]).toEqual({ cut: `${t.items.length - (ITEM_BLOCKS_MAX - 1)} more items, through SLICER.` });
    expect((r.blocks.at(-1) as ItemBlock).item).toBe(t.items.at(-1)!.id);
    expect(blocks(r)[0]!.path).toEqual([`SLICER cut the cake in two and obtained two cakes, neither of them a slice. ×${t.items[0]!.path.length}`]);
  });

  test("Form week: a block of lines repeating back to back prints once, then 'Last <n> lines ×<count>.'", () => {
    const r = reportOf(21, "IN → STAMPER 1; STAMPER 1 → TALLY; TALLY minus → STAMPER 1");
    expect(blocks(r)[0]!.path).toEqual([
      "STAMPER 1 stamped the treaty APPROVED, directly over the signatures.",
      "TALLY checked the treaty for marks and counted them twice. Fewer than three.",
      "Last 2 lines ×2.",
      "STAMPER 1 stamped the treaty APPROVED, directly over the signatures.",
      "TALLY checked the treaty for marks and counted them twice. Three or more.",
    ]);
  });
});

describe("REPORT-03 Result line", () => {
  test("Victory parade: marks by name, the last after 'then'; none: 'untouched'", () => {
    const a = reportOf(2, "IN → LAMINATOR; LAMINATOR → SHREDDER; SHREDDER → Parade Control");
    expect(a.lines).toContain("Parade Control received: Confetti, laminated, then shredded.");
    const b = reportOf(2, "IN → Parade Control");
    expect(b.lead).toBe("Parade Control received: Star chart, untouched.");
    expect(b.lines.at(-1)).toBe("Parade Control received: Address, untouched. First difference: mark 1 missing; required shredded.");
  });
});

describe("REPORT-05 First difference", () => {
  test("Embassy dinner: an extra mark, a wrong destination, a differing mark; then a missing mark and a rejection", () => {
    const a = reportOf(13, "IN → SLICER; SLICER item → LAMINATOR; SLICER copy → LAMINATOR; LAMINATOR → Canteen");
    expect(a.second).toBe("First difference: mark 2, laminated by LAMINATOR, not ordered.");
    expect(a.lines).toContain("Canteen received: Cake, sliced, then laminated. First difference: delivered to Canteen; required Embassy.");
    expect(a.lines).toContain("Canteen received: Treaty, sliced, then laminated. First difference: mark 1, sliced by SLICER; required laminated.");
    const b = reportOf(13, "IN → SLICER; SLICER item → INSPECTOR; INSPECTOR minus → INSPECTOR; SLICER copy → Embassy");
    expect(b.second).toBe("First difference: none in kind or marks; the item was rejected.");
    expect(b.lines).toContain("Embassy received: Cake, sliced. First difference: mark 2 missing; required laminated.");
  });

  test("a mark the item started with names 'from the start'", () => {
    const item: TraceItem = {
      id: "1",
      place: 1,
      copy: 0,
      copiedFrom: null,
      first: "Address",
      kind: "Address",
      marks: [{ name: "approved", by: null }],
      required: { destination: "Bureau", kind: "Address", marks: ["sealed"] },
      checks: {},
      rejectedBy: null,
      end: { type: "arrived", destination: "Bureau", rejectedBy: null },
      endBeat: 1,
      matched: false,
      path: [],
    };
    expect(firstDifference(item)).toBe("First difference: mark 1, approved from the start; required sealed.");
  });
});

describe("REPORT-06 Repair orders", () => {
  test("Night scrap run, opening wiring: the incident report gives the first failing item's lines only", () => {
    const r = reportOf(17, null);
    expect(r.lines).toEqual([
      "By regulation, the archived flag no longer flutters.",
      "First difference: mark 1, laminated by LAMINATOR; required crushed.",
      "Flag",
      "GAUGE hung the flag from a spring balance and read the dial. Not metal.",
      "LAMINATOR laminated the flag, which then stood up on its own.",
      "Archive received: Flag, laminated.",
    ]);
  });

  test("a won repair order prints the moves line it is given", () => {
    const o = order(17);
    const t = run(o, parseWiring(o, "IN → INSPECTOR; INSPECTOR minus → GAUGE; INSPECTOR plus → LAMINATOR; LAMINATOR → Archive; GAUGE minus → COMPACTOR; GAUGE plus → Hangar; COMPACTOR → Hangar; SHREDDER → Hangar"));
    expect(report(o, t, { movesLine: "Moves 2, par 2. Par met." }).lines.slice(0, 2)).toEqual(["Night scrap run: delivered as ordered.", "Moves 2, par 2. Par met."]);
  });
});
