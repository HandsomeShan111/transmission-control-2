// ART-11 mark tiles: a tile of MarkTileSize in its family's shape, Ink fill,
// a Cream outline of OutlineWeight inside the size, a two-letter code in Cream
// capitals in SansStack whose cap block is centred on the shape's centre.
// Every code has one font size: the widest code is MarkCodeWidth of the tile.
import { art, colours, objects, typeStacks } from "../tokens";
import { n, s } from "./dom";

export const TILE_SHAPES = ["circle", "square", "hexagon", "pentagon", "octagon", "arch"] as const;
export type TileShape = (typeof TILE_SHAPES)[number];

/** Tile shapes, one per family in act order. */
export function tileShapeForAct(act: number): TileShape {
  const shape = TILE_SHAPES[act - 1];
  if (!shape) throw new Error(`no tile shape for act ${act}`);
  return shape;
}

/** The mark name's first two letters in capitals; LB for labelled, as LA is laminated. */
export function markCode(mark: string): string {
  return mark === "labelled" ? "LB" : mark.slice(0, 2).toUpperCase();
}

/** The code's weight (design silent; the previews print codes bold). */
export const CODE_WEIGHT = 700;

export interface CodeMetrics {
  /** One font size for every code, board units. */
  fontSize: number;
  /** Cap height at that size. */
  capHeight: number;
}

export type Measure = (text: string, fontPx: number) => { width: number; capHeight: number };

/** Measures text in SansStack bold on a canvas. */
let measureCtx: CanvasRenderingContext2D | null = null;
export const canvasMeasure: Measure = (text, fontPx) => {
  const ctx = (measureCtx ??= document.createElement("canvas").getContext("2d"));
  if (!ctx) throw new Error("no 2d canvas to measure mark codes");
  ctx.font = `${CODE_WEIGHT} ${fontPx}px ${typeStacks.SansStack}`;
  return { width: ctx.measureText(text).width, capHeight: ctx.measureText("H").actualBoundingBoxAscent };
};

/** The one code size: the widest of the codes is MarkCodeWidth of the tile across. */
export function markCodeMetrics(codes: string[], measure: Measure = canvasMeasure, tile: number = objects.MarkTileSize): CodeMetrics {
  const ref = 100;
  const widest = Math.max(...codes.map((c) => measure(c, ref).width));
  const fontSize = (objects.MarkCodeWidth * tile * ref) / widest;
  return { fontSize, capHeight: measure("H", fontSize).capHeight };
}

function polygon(count: number, radius: number, start: number, cy = 0): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const t = start + (i * 2 * Math.PI) / count;
    d += `${i ? "L" : "M"}${n(radius * Math.cos(t))} ${n(cy + radius * Math.sin(t))}`;
  }
  return d + "Z";
}

/**
 * The tile's outline path, centred on the shape's centre, its stroke of
 * OutlineWeight inside a box `tile` across. Returns the path and where the
 * shape's centre sits from the box middle.
 */
export function tileOutline(shape: TileShape, tile: number = objects.MarkTileSize): { d: string; centreY: number } {
  const ow = art.OutlineWeight;
  const half = tile / 2;
  switch (shape) {
    case "circle": {
      const r = half - ow / 2;
      return { d: `M${n(-r)} 0A${n(r)} ${n(r)} 0 1 1 ${n(r)} 0A${n(r)} ${n(r)} 0 1 1 ${n(-r)} 0Z`, centreY: 0 };
    }
    case "square": {
      const a = half - ow / 2;
      return { d: `M${n(-a)} ${n(-a)}H${n(a)}V${n(a)}H${n(-a)}Z`, centreY: 0 };
    }
    case "hexagon": {
      // Vertex to vertex across, flat top and bottom.
      const R = half - ow / 2 / Math.cos(Math.PI / 6);
      return { d: polygon(6, R, 0), centreY: 0 };
    }
    case "pentagon": {
      // Corner to corner across, pointing up; its centre is the point equally far from its corners.
      // Design silent on its height in the box: its extent up and down is centred in the box.
      const R0 = tile / (2 * Math.sin((2 * Math.PI) / 5));
      const R = R0 - ow / 2 / Math.cos(Math.PI / 5);
      const height = R0 * (1 + Math.cos(Math.PI / 5));
      const cy = -half + (tile - height) / 2 + R0;
      return { d: polygon(5, R, -Math.PI / 2, cy), centreY: cy };
    }
    case "octagon": {
      // Flat to flat across.
      const R = (half - ow / 2) / Math.cos(Math.PI / 8);
      return { d: polygon(8, R, Math.PI / 8), centreY: 0 };
    }
    case "arch": {
      // A half circle of radius half the tile on a rectangle tile wide and half the tile high, flat base; its centre is the box middle.
      const a = half - ow / 2;
      return { d: `M${n(-a)} ${n(a)}V0A${n(a)} ${n(a)} 0 0 1 ${n(a)} 0V${n(a)}Z`, centreY: 0 };
    }
  }
}

export interface MarkTileOptions {
  code: string;
  shape: TileShape;
  metrics: CodeMetrics;
  /** The box middle. */
  cx?: number;
  cy?: number;
  tile?: number;
}

export function markTile(o: MarkTileOptions): SVGGElement {
  const tile = o.tile ?? objects.MarkTileSize;
  const { d, centreY } = tileOutline(o.shape, tile);
  const scale = tile / objects.MarkTileSize;
  return s(
    "g",
    {
      "data-piece": "mark-tile",
      "data-shape": o.shape,
      "data-code": o.code,
      transform: `translate(${n(o.cx ?? 0)} ${n(o.cy ?? 0)})`,
    },
    s("path", { d, fill: colours.Ink, stroke: colours.Cream, "stroke-width": art.OutlineWeight, "stroke-linejoin": "miter", "data-part": "tile" }),
    s(
      "text",
      {
        x: 0,
        y: n(centreY + (o.metrics.capHeight * scale) / 2),
        "text-anchor": "middle",
        fill: colours.Cream,
        "font-family": typeStacks.SansStack,
        "font-weight": CODE_WEIGHT,
        "font-size": n(o.metrics.fontSize * scale),
        "data-part": "code",
      },
      o.code,
    ),
  );
}
