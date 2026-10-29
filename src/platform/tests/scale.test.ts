import { describe, expect, test } from "bun:test";
import { cssVars, orientationOf, scaleValue, uiSizes } from "../scale";
import { shared, ui } from "../tokens";

describe("scaleValue (ui/style.md Style)", () => {
  test("a at a 360 short side, b at 1080", () => {
    expect(scaleValue([14, 22], 360)).toBe(14);
    expect(scaleValue([14, 22], 1080)).toBe(22);
  });
  test("a straight line between", () => {
    expect(scaleValue([14, 22], 720)).toBe(18);
    expect(scaleValue([6, 12], 540)).toBeCloseTo(7.5, 10);
  });
  test("holds past 1080", () => expect(scaleValue([48, 72], 2160)).toBe(72));
  test("scales down with the short side below 360", () => expect(scaleValue([14, 22], 320)).toBeCloseTo((14 * 320) / 360, 10));
});

describe("uiSizes", () => {
  test("smallest preview screen, 360 x 640 portrait", () => {
    const s = uiSizes({ width: 360, height: 640 });
    expect(s.orientation).toBe("portrait");
    expect([s.FrameMargin, s.OrderBar, s.ControlBar, s.TextSize, s.LabelSize, s.PaperTextSize, s.PlateSize, s.PlateGap, s.PerfMargin, s.RowHeight]).toEqual([
      6, 112, 72, 14, 11, 14, 48, 8, 10, 48,
    ]);
    expect(s.RowWidth).toBe(40 * 14);
    expect(s.LampLens).toBe(22);
  });
  test("largest preview screen, 1920 x 1080 landscape", () => {
    const s = uiSizes({ width: 1920, height: 1080 });
    expect(s.orientation).toBe("landscape");
    expect([s.FrameMargin, s.OrderBar, s.ControlBar, s.TextSize, s.LabelSize, s.PaperTextSize, s.PlateSize, s.PlateGap, s.PerfMargin, s.RowHeight]).toEqual([
      12, 400, 144, 22, 16, 20, 72, 16, 16, 72,
    ]);
  });
  test("bars take the orientation's ranges", () => {
    const land = uiSizes({ width: 640, height: 360 });
    expect(land.OrderBar).toBe(ui.OrderBar.landscape[0]);
    expect(land.ControlBar).toBe(ui.ControlBar.landscape[0]);
  });
  test("a plate or a row never goes below JackMinSize", () => {
    const s = uiSizes({ width: 240, height: 400 });
    expect(s.TextSize).toBeCloseTo((14 * 240) / 360, 10);
    expect(s.PlateSize).toBe(shared.JackMinSize);
    expect(s.RowHeight).toBe(shared.JackMinSize);
  });
  test("another screen's portrait order bar: its title line and PlateGap each side", () => {
    const s = uiSizes({ width: 360, height: 640 }, { titleOnly: true });
    expect(s.OrderBar).toBeCloseTo(14 * 1.2 + 2 * 8, 10);
    const l = uiSizes({ width: 640, height: 360 }, { titleOnly: true });
    expect(l.OrderBar).toBe(180);
  });
  test("safe-area insets narrow the room the sizes scale with", () => {
    const s = uiSizes({ width: 400, height: 800, safe: { top: 20, right: 20, bottom: 20, left: 20 } });
    expect(s.width).toBe(360);
    expect(s.TextSize).toBe(14);
  });
  test("a square screen is portrait (design silent)", () => expect(orientationOf(500, 500)).toBe("portrait"));
  test("cssVars names each size", () => {
    const v = cssVars(uiSizes({ width: 360, height: 640 }));
    expect(v["--TextSize"]).toBe("14px");
    expect(v["--PlateSize"]).toBe("48px");
    expect(v["--LampLens"]).toBe("22px");
  });
});
