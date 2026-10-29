// ART-09 agent faces: a Cream face with an Ink outline. From the top: an Ink
// band with the family's silhouette at the left and the family name in Cream;
// the agent's name and its rule in Ink; the bottom row with the lamp, the mark
// tile, and a checking agent's PassLimit label. Jacks: input on the upstream
// edge, outputs on the downstream edge, plus before minus and item before copy
// in lane order. Sizes: ui/board.md (face 128 x 118, band 24, ...).
//
// WIRE-01 layers, back to front: `base` (face and band) under wires; `plate`
// (the label plate's Cream) over wires; then a wire's trace; `top` (band
// silhouette and name with their Ink halo, the plate's text, lamp, tile);
// `jacks` over all.
import { art, boardLayout as B, colours, objects, shared, typeStacks } from "../tokens";
import { n, s, type Point } from "./dom";
import { jack, type JackKind } from "./jack";
import { lampLens, type LampLens, type LampState } from "./lamp";
import { markTile, type CodeMetrics, type TileShape } from "./mark-tile";
import { ringRadiusFor } from "./rings";
import { silhouetteSvg, type SilhouetteName } from "./silhouette";
import type { Flow } from "./terminal";

export type AgentRole = "worker" | "checker" | "copier";

/**
 * Text sizes on a face, board units: the heights ui/board.md gives. Weights: design silent; name bold, rule regular, as the
 * previews. Design silent on the PassLimit label's size: the rule's, the least the design names on a face.
 */
export const FACE_TEXT = { family: B.FamilyNameHeight, name: B.NameHeight, rule: B.RuleHeight, passLimit: B.RuleHeight } as const;

export type Measure = (text: string, px: number, weight: number) => number;

let measureCtx: CanvasRenderingContext2D | null = null;
export const canvasTextWidth: Measure = (text, px, weight) => {
  const ctx = (measureCtx ??= document.createElement("canvas").getContext("2d"));
  if (!ctx) throw new Error("no 2d canvas to measure face text");
  ctx.font = `${weight} ${px}px ${typeStacks.SansStack}`;
  return ctx.measureText(text).width;
};

export interface AgentFaceOptions {
  /** As printed: a number follows a repeated agent's name (AGENT-01). */
  name: string;
  family: string;
  silhouette: SilhouetteName;
  rule: string;
  role: AgentRole;
  /** Workers and copiers: their mark's code and tile shape. */
  mark?: { code: string; shape: TileShape };
  metrics?: CodeMetrics;
  /** Checking agents: the PassLimit label as the caller words it. */
  passLimitLabel?: string;
  lamp?: LampState;
  flow: Flow;
  /** The face's centre. */
  x?: number;
  y?: number;
  measure?: Measure;
}

export interface FaceJack {
  /** "in", "out", "plus", "minus", "item", "copy". */
  name: string;
  kind: JackKind;
  at: Point;
}

export interface AgentFace {
  base: SVGGElement;
  plate: SVGGElement;
  top: SVGGElement;
  jacks: SVGGElement;
  jackList: FaceJack[];
  lamp: LampLens;
  /** The label plate's outline in board units, for clipping a trace. */
  plateD: string;
  /** Top-left corner. */
  origin: Point;
}

function wrapWords(text: string, maxW: number, px: number, weight: number, m: Measure): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && m(t, px, weight) > maxW) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

export function agentFace(o: AgentFaceOptions): AgentFace {
  const FW = B.FaceWidth;
  const FH = B.FaceHeight;
  const BAND = B.BandHeight;
  const ow = art.OutlineWeight;
  const JR = shared.JackMinSize / 2;
  const cx = o.x ?? 0;
  const cy = o.y ?? 0;
  const x0 = cx - FW / 2;
  const y0 = cy - FH / 2;
  const at = `translate(${n(x0)} ${n(y0)})`;
  const measure = o.measure ?? canvasTextWidth;

  // Jacks, in face coordinates.
  const out = shared.JackMinSize / 2 + B.JackOut;
  const pair = JR + B.OutputJackGap / 2;
  const land = o.flow === "landscape";
  const local: FaceJack[] = [];
  local.push({ name: "in", kind: "input", at: land ? { x: 0, y: FH / 2 } : { x: FW / 2, y: -out } });
  const outAt = (k: number): Point => (land ? { x: FW, y: FH / 2 + k * pair } : { x: FW / 2 + k * pair, y: FH + out });
  if (o.role === "worker") local.push({ name: "out", kind: "output", at: outAt(0) });
  if (o.role === "checker") local.push({ name: "plus", kind: "plus", at: outAt(-1) }, { name: "minus", kind: "minus", at: outAt(1) });
  if (o.role === "copier") local.push({ name: "item", kind: "output", at: outAt(-1) }, { name: "copy", kind: "output", at: outAt(1) });

  // The room a text row has: TextInset from the edges and clear of the face's jacks, 2 past them. A held wire's blinking
  // ring stands round a jack (ART-15): the rule and the PassLimit label clear the ring's outer edge too. Design silent: the
  // name keeps clear of the jack only, since a ring's room would push a long name into the far jack.
  const RING = ringRadiusFor(JR) + art.OutlineWeight / 2 + art.WireEdge;
  const rowSpan = (ya: number, yb: number, clear: number = RING): [number, number] => {
    let xa: number = B.TextInset;
    let xb: number = FW - B.TextInset;
    if (land)
      for (const j of local) {
        const dy = j.at.y < ya ? ya - j.at.y : j.at.y > yb ? j.at.y - yb : 0;
        const R = clear + 2;
        if (dy >= R) continue;
        const dx = Math.sqrt(R * R - dy * dy);
        if (j.at.x < FW / 2) xa = Math.max(xa, j.at.x + dx);
        else xb = Math.min(xb, j.at.x - dx);
      }
    return [xa, xb];
  };

  const base = s(
    "g",
    { "data-piece": "agent-face", "data-layer": "base", "data-role": o.role, transform: at },
    s("rect", { width: FW, height: FH, rx: 4, fill: colours.Cream, stroke: colours.Ink, "stroke-width": ow, "data-part": "face" }),
    // The band, BandHeight from the face's top, follows the face's own edge and corners: its edge lies on the outline's
    // Ink, so no Cream shows between them.
    s("path", {
      d: `M0 ${BAND}V4A4 4 0 0 1 4 0H${FW - 4}A4 4 0 0 1 ${FW} 4V${BAND}Z`,
      fill: colours.Ink,
      "data-part": "band",
    }),
  );

  const plateD = `M${n(ow / 2)} ${BAND}V${n(FH - 4 - ow / 2)}A4 4 0 0 0 ${n(4 + ow / 2)} ${n(FH - ow / 2)}H${n(FW - 4 - ow / 2)}A4 4 0 0 0 ${n(FW - ow / 2)} ${n(FH - 4 - ow / 2)}V${BAND}Z`;
  const plate = s(
    "g",
    { "data-piece": "agent-face", "data-layer": "plate", transform: at },
    s("path", { d: plateD, fill: colours.Cream, stroke: colours.Ink, "stroke-width": ow, "stroke-linejoin": "round", "data-part": "label-plate" }),
  );

  const text = (x: number, y: number, size: number, weight: number, fill: string, body: string, part: string, extra: Record<string, string | number> = {}) =>
    s("text", { x: n(x), y: n(y), fill, "font-family": typeStacks.SansStack, "font-size": size, "font-weight": weight, "data-part": part, ...extra }, body);

  const top = s("g", { "data-piece": "agent-face", "data-layer": "top", "data-agent": o.name, transform: at });
  // Band: silhouette and family name over wires, each with an Ink halo of WireEdge (ART-09).
  top.append(silhouetteSvg({ name: o.silhouette, size: B.SilhouetteWidth, solid: "cream", x: 6, y: (BAND - B.SilhouetteWidth) / 2, halo: art.WireEdge }));
  top.append(
    text(6 + B.SilhouetteWidth + 6, BAND / 2, FACE_TEXT.family, 700, colours.Cream, o.family, "family", {
      "dominant-baseline": "central",
      stroke: colours.Ink,
      "stroke-width": 2 * art.WireEdge,
      "stroke-linejoin": "round",
      "paint-order": "stroke",
    }),
  );
  // Name, then the rule on two lines at most.
  const nameTop = BAND + 4;
  const [na] = rowSpan(nameTop, nameTop + B.NameHeight, JR);
  top.append(text(na, nameTop + B.NameHeight * 0.78, FACE_TEXT.name, 700, colours.Ink, o.name, "name"));
  const ruleTop = nameTop + B.NameHeight + 2;
  const [ra0, rb0] = rowSpan(ruleTop, ruleTop + B.RuleLines * B.RuleHeight);
  wrapWords(o.rule, rb0 - ra0, FACE_TEXT.rule, 400, measure)
    .slice(0, B.RuleLines)
    .forEach((line, i) => {
      const [ra] = rowSpan(ruleTop + i * B.RuleHeight, ruleTop + (i + 1) * B.RuleHeight);
      top.append(text(ra, ruleTop + (i + 1) * B.RuleHeight - 2, FACE_TEXT.rule, 400, colours.Ink, line, "rule"));
    });
  // Bottom row: lamp, mark tile, PassLimit label.
  const rowY = FH - B.BottomRowHeight / 2;
  const lens = art.LampSize * shared.JackMinSize;
  const lamp = lampLens({ state: o.lamp ?? "off", cx: B.TextInset + lens / 2, cy: rowY });
  top.append(lamp.el);
  const nx = B.TextInset + lens + 8;
  if (o.role === "checker" && o.passLimitLabel) {
    const [la, lb] = rowSpan(rowY - 14, rowY + 14);
    const x = Math.max(nx, la);
    const lines = wrapWords(o.passLimitLabel, lb - x, FACE_TEXT.passLimit, 700, measure).slice(0, 3);
    // Lines a size apart, centred on the row; raised where the last would pass TextInset from the face's bottom edge.
    const step = FACE_TEXT.passLimit;
    const cap = step * 0.36;
    const first = rowY - ((lines.length - 1) * step) / 2 + cap;
    const lift = Math.max(0, first + (lines.length - 1) * step - (FH - B.TextInset));
    lines.forEach((line, i) => top.append(text(x, first - lift + i * step, FACE_TEXT.passLimit, 700, colours.Ink, line, "pass-limit")));
  } else if (o.mark) {
    if (!o.metrics) throw new Error("a face with a mark needs the mark code metrics");
    top.append(markTile({ code: o.mark.code, shape: o.mark.shape, metrics: o.metrics, cx: nx + objects.MarkTileSize / 2, cy: rowY }));
  }

  const jackList = local.map((j) => ({ ...j, at: { x: j.at.x + x0, y: j.at.y + y0 } }));
  const labels: Record<string, string> = { in: "IN", out: "OUT", item: "ITEM", copy: "COPY" };
  const jacks = s(
    "g",
    { "data-piece": "agent-face", "data-layer": "jacks" },
    ...jackList.map((j) => {
      const g = jack({ kind: j.kind, label: labels[j.name], cx: j.at.x, cy: j.at.y });
      g.setAttribute("data-jack", j.name);
      return g;
    }),
  );
  return { base, plate, top, jacks, jackList, lamp, plateD, origin: { x: x0, y: y0 } };
}
