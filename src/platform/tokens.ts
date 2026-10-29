// Design tokens: every art direction, objects, sound, feel and UI style
// parameter at its start value, named as the design names it.
// Sources: design/docs/art-direction.md, art-direction-objects.md,
// art-direction-sound.md, feel.md, feel-run.md, feel-campaign.md, ui/style.md,
// ui/board.md (board layout numbers). Times are seconds, sizes board units
// (art) or CSS pixels (UI style), as the owner page says.

/** ART-01 palette. */
export const colours = {
  Graphite: "#2b2e2c",
  GraphiteLight: "#454945",
  Cream: "#efe6cc",
  Ink: "#1c1c1a",
  Orange: "#e2692a",
  Mustard: "#e2b03a",
  Teal: "#3a9c92",
  Alarm: "#e32f36",
} as const;
export type ColourName = keyof typeof colours;

/** ART-03 type: system stacks only, no web fonts. */
export const typeStacks = {
  SansStack: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  MonoStack: '"Courier New", Courier, monospace',
} as const;

/** Art direction parameters (board units unless stated). */
export const art = {
  TextContrast: 4.5,
  OutlineWeight: 3,
  WireWidth: 4,
  WireEdge: 2,
  DashLength: 9,
  DashGap: 6,
  HopRadius: 8,
  LampSize: 0.5,
  AlarmLampSize: 1,
  SignDiscSize: 0.5,
  SignSpan: 0.5,
  ArrowSize: 12,
  TraceWidth: 3,
  TraceLight: 0.55,
} as const;

/** Art direction, objects. */
export const objects = {
  MarkTileSize: 32,
  MarkCodeWidth: 0.52,
  PaperColumns: 32,
  DoubleStrikeOffset: 0.08,
} as const;

/** Art direction, sound. */
export const sound = {
  LevelQuiet: 0.25,
  LevelMid: 0.5,
  LevelLoud: 0.8,
  ClickMaxTime: 0.15,
  VerdictToneTime: 0.16,
  PlusPitch: 880,
  MinusPitch: 247,
  UnplugPitch: 400,
  UnplugDrop: 0.3,
  AlarmPitch: 440,
  AlarmBeat: 2,
  LineStrikes: 5,
  BellPitch: 1760,
  BellTime: 1.0,
} as const;

/** Feel (wire steps and shared values). */
export const feel = {
  SettleTime: 0.14,
  JackDip: 0.12,
  Rebound: 0.25,
  RingTime: 0.3,
  RingGrow: 0.5,
  PopTime: 0.16,
  LitStagger: 0.04,
  LitBlinkTime: 0.8,
  CutRetractTime: 0.15,
} as const;

/** Feel, run. */
export const feelRun = {
  ItemBump: 0.12,
  SwitchThrowTime: 0.12,
  GlideEase: 0.6,
  LampRiseTime: 0.06,
  LampFallTime: 0.15,
  KindSwapTime: 0.2,
  DashMarchSpeed: 60,
  ArrivalStagger: 0.25,
  DiffRingTime: 0.3,
  StopLight: 0.6,
  StopDimTime: 0.5,
  FastSoundMin: 0.06,
} as const;

/** Feel, campaign. */
export const feelCampaign = {
  PaperFeedTime: 0.3,
  TearTime: 0.25,
  ScrollBackTime: 0.4,
  DoubleStrikeGap: 0.03,
  BellLead: 0.4,
  AlarmToneTime: 1.0,
  AlarmSilenceTime: 0.8,
  RoomLight: 0.45,
  RoomDimTime: 0.2,
  ItemLeaveTime: 0.5,
  OpenStagger: 0.08,
  OpenSettleTime: 0.5,
  OpenZoomFrom: 0.92,
  OpenPanFrom: 0.08,
  StandbyLight: 0.25,
  WakeTime: 0.25,
  SelfThrowDelay: 0.4,
} as const;

/** A UI size: its value at a 360 short side, then at 1080 (ui/style.md). */
export type UiRange = readonly [atSmall: number, atLarge: number];

/** UI style sizes, CSS pixels, "a -> b". */
export const ui = {
  FrameMargin: [6, 12],
  OrderBar: { portrait: [112, 170], landscape: [180, 400] },
  ControlBar: { portrait: [72, 112], landscape: [96, 144] },
  TextSize: [14, 22],
  LabelSize: [11, 16],
  PaperTextSize: [14, 20],
  PlateSize: [48, 72],
  PlateGap: [8, 16],
  PerfMargin: [10, 16],
  RowHeight: [48, 72],
  /** RowWidth: 40 TextSize at most. */
  RowWidth: 40,
} as const satisfies Record<string, UiRange | number | { portrait: UiRange; landscape: UiRange }>;

/** Values owned by block pages that the pieces and helpers need. */
export const shared = {
  /** board/wiring-board.md: CSS pixels on screen; one board unit is one CSS pixel at the smallest zoom. */
  JackMinSize: 44,
  JackMaxSize: 120,
  /** board/reports.md */
  PrintLineTime: 0.15,
  /** board/run-view.md */
  BeatTime: 1.0,
  FastFactor: 4,
  ViewMoveTime: 0.6,
  /** campaign/campaign.md */
  OpeningGuard: 1.0,
  /** board/items.md */
  MarksShown: 3,
} as const;

/** ui/board.md layout numbers, board units. */
export const boardLayout = {
  FaceWidth: 128,
  FaceHeight: 118,
  BandHeight: 24,
  SilhouetteWidth: 18,
  FamilyNameHeight: 11,
  NameHeight: 14,
  RuleHeight: 11,
  RuleLines: 2,
  BottomRowHeight: 40,
  TextInset: 8,
  /** Jacks outside an edge by half of JackMinSize and 3 more. */
  JackOut: 3,
  /** Two output jacks stand 6 apart, edge to edge. */
  OutputJackGap: 6,
  LaneGapLandscape: 30,
  LaneGapPortrait: 44,
  InputTerminalWidth: 100,
  HeaderHeight: 32,
  SlotSize: 44,
  SlotGap: 4,
  TerminalPad: 60,
  RowMarks: 5,
  TileGap: 4,
  ResultRowHeight: 96,
  ResultPartHeight: 44,
  FootRowHeight: 62,
  TerminalGap: 30,
  ColumnGapPad: 16,
  RowBodySize: 44,
  MovingBodySize: 36,
} as const;

/** ColumnGap: twice JackMinSize, twice ArrowSize, and 16 (ui/board.md). */
export function columnGap(): number {
  return 2 * shared.JackMinSize + 2 * art.ArrowSize + boardLayout.ColumnGapPad;
}

/** TerminalWidth: 60 + RowMarks x (MarkTileSize + 4) (ui/board.md). */
export function terminalWidth(): number {
  return boardLayout.TerminalPad + boardLayout.RowMarks * (objects.MarkTileSize + boardLayout.TileGap);
}

/** Every named token in one flat record, for lookups by design name. */
export const tokens = {
  ...colours,
  ...typeStacks,
  ...art,
  ...objects,
  ...sound,
  ...feel,
  ...feelRun,
  ...feelCampaign,
  ...shared,
} as const;
export type TokenName = keyof typeof tokens;

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** ART-01 dim: Ink laid over a colour at the fraction of light not kept. */
export function dimmed(hex: string, light: number): string {
  const p = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = p(hex);
  const ink = p(colours.Ink);
  const mix = a.map((v, i) => Math.round(v * light + ink[i]! * (1 - light)));
  return "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
}
