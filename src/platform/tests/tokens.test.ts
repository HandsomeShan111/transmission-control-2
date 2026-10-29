// Every token equals its design start value, read from the design pages.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as T from "../tokens";

const docs = join(import.meta.dir, "../../../design/docs");
const page = (p: string) => readFileSync(join(docs, p), "utf8");

/** "**Name**: ... Start: value." from a page's Parameters section. */
function starts(p: string): Map<string, string> {
  const text = page(p);
  const sec = text.slice(text.indexOf("## Parameters"), text.indexOf("## Mechanics"));
  const out = new Map<string, string>();
  for (const m of sec.matchAll(/^- \*\*(\w+)\*\*:.*?Start: (.+?)\.(?: Range|\s*Fixed|$)/gm)) out.set(m[1]!, m[2]!);
  return out;
}

function check(p: string, group: Record<string, unknown>) {
  const s = starts(p);
  expect(s.size).toBeGreaterThan(0);
  for (const [name, v] of s) {
    const raw = v.trim();
    const want = raw.startsWith("#") || raw.startsWith('"') ? raw : Number(raw);
    expect(group[name], `${p} ${name}`).toEqual(want);
  }
  // No token in the group the page does not name.
  for (const k of Object.keys(group)) expect(s.has(k), `${p} has no ${k}`).toBe(true);
}

describe("tokens equal the design's start values", () => {
  test("art direction", () => check("art-direction.md", { ...T.colours, ...T.typeStacks, ...T.art }));
  test("art direction, objects", () => check("art-direction-objects.md", T.objects));
  test("art direction, sound", () => check("art-direction-sound.md", T.sound));
  test("feel", () => check("feel.md", T.feel));
  test("feel, run", () => check("feel-run.md", T.feelRun));
  test("feel, campaign", () => check("feel-campaign.md", T.feelCampaign));
  test("values owned by block pages", () => {
    const all = new Map([
      ...starts("board/wiring-board.md"),
      ...starts("board/reports.md"),
      ...starts("board/run-view.md"),
      ...starts("campaign/campaign.md"),
    ]);
    for (const k of ["JackMinSize", "JackMaxSize", "PrintLineTime", "BeatTime", "FastFactor", "ViewMoveTime", "OpeningGuard"] as const)
      expect(T.shared[k] as number, k).toBe(Number(all.get(k)));
    expect(page("board/items.md")).toContain(`**MarksShown**: integer, latest marks shown on a moving item's body. Start: ${T.shared.MarksShown}`);
  });
});

describe("UI style sizes equal ui/style.md", () => {
  const text = page("ui/style.md");
  const pair = (name: string) => {
    const m = new RegExp(`\\*\\*${name}\\*\\*: (\\d+) → (\\d+)`).exec(text);
    return m ? [Number(m[1]), Number(m[2])] : null;
  };
  test.each(["FrameMargin", "TextSize", "LabelSize", "PaperTextSize", "PlateSize", "PlateGap", "PerfMargin", "RowHeight"] as const)("%s", (name) => {
    expect(pair(name)).toEqual([...T.ui[name]]);
  });
  test("bars by orientation", () => {
    expect(text).toContain(`**OrderBar**: portrait height ${T.ui.OrderBar.portrait.join(" → ")}; landscape width ${T.ui.OrderBar.landscape.join(" → ")}`);
    expect(text).toContain(`**ControlBar**: portrait height ${T.ui.ControlBar.portrait.join(" → ")}; landscape width ${T.ui.ControlBar.landscape.join(" → ")}`);
    expect(text).toContain(`**RowWidth**: ${T.ui.RowWidth} TextSize at most`);
  });
});

describe("board layout numbers", () => {
  test("ColumnGap is 128 and TerminalWidth 240 at the start values (ui/board.md)", () => {
    expect(T.columnGap()).toBe(128);
    expect(T.terminalWidth()).toBe(240);
  });
  test("face and terminal numbers appear on ui/board.md", () => {
    const b = page("ui/board.md");
    expect(b).toContain(`Face: ${T.boardLayout.FaceWidth} wide, ${T.boardLayout.FaceHeight} high`);
    expect(b).toContain(`the band, ${T.boardLayout.BandHeight} high, its silhouette ${T.boardLayout.SilhouetteWidth} wide`);
    expect(b).toContain(`${T.boardLayout.InputTerminalWidth} wide. A header bar ${T.boardLayout.HeaderHeight} high`);
    expect(b).toContain(`${T.boardLayout.SlotSize} square, ${T.boardLayout.SlotGap} apart`);
    expect(b).toContain(`${T.boardLayout.ResultRowHeight} high`);
    expect(b).toContain(`RowMarks: ${T.boardLayout.RowMarks}`);
  });
});

describe("contrast (presentation worked numbers)", () => {
  const c = T.colours;
  test("Ink on Cream 13.7", () => expect(T.contrast(c.Ink, c.Cream)).toBeCloseTo(13.7, 1));
  test("dims keep TextContrast at StopLight and TraceLight range ends", () => {
    expect(T.contrast(T.dimmed(c.Cream, 0.6), c.Ink)).toBeCloseTo(5.72, 1);
    expect(T.contrast(T.dimmed(c.Cream, 0.55), c.Ink)).toBeCloseTo(5.02, 1);
    expect(T.contrast(T.dimmed(c.Cream, 0.8), c.Ink)).toBeCloseTo(9.16, 1);
    expect(T.contrast(T.dimmed(c.Cream, T.art.TraceLight), c.Ink)).toBeGreaterThan(T.art.TextContrast);
    expect(T.contrast(T.dimmed(c.Cream, T.feelRun.StopLight), c.Ink)).toBeGreaterThan(T.art.TextContrast);
  });
  test("room dim at RoomLight 0.45 gives 3.81 (exempt)", () => expect(T.contrast(T.dimmed(c.Cream, T.feelCampaign.RoomLight), c.Ink)).toBeCloseTo(3.81, 1));
  test("every ART-14 pair keeps TextContrast", () => {
    for (const [a, b] of [
      [c.Ink, c.Cream],
      [c.Cream, c.Graphite],
      [c.Cream, c.GraphiteLight],
    ] as const)
      expect(T.contrast(a, b)).toBeGreaterThan(T.art.TextContrast);
  });
});
