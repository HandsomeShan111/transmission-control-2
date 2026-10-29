// The design system's one style sheet. Sizes come from scale.ts as custom
// properties on the root; colours, type and weights from the tokens.
import { art, colours, feel, feelCampaign, feelRun, objects, typeStacks } from "../tokens";
import { cssEasings } from "../motion";

export function styleSheet(): string {
  const c = colours;
  const OW = `${art.OutlineWeight}px`;
  return `
:root{
  --Graphite:${c.Graphite};--GraphiteLight:${c.GraphiteLight};--Cream:${c.Cream};--Ink:${c.Ink};
  --Orange:${c.Orange};--Mustard:${c.Mustard};--Teal:${c.Teal};--Alarm:${c.Alarm};
  --Sans:${typeStacks.SansStack};--Mono:${typeStacks.MonoStack};
  --OW:${OW};--WireEdge:${art.WireEdge}px;
  --PaperColumns:${objects.PaperColumns};--DoubleStrikeOffset:${objects.DoubleStrikeOffset};
  --SwitchThrowTime:${feelRun.SwitchThrowTime}s;--LampRiseTime:${feelRun.LampRiseTime}s;--LampFallTime:${feelRun.LampFallTime}s;
  --LitBlinkTime:${feel.LitBlinkTime}s;--TearTime:${feelCampaign.TearTime}s;
}
.tc-root,.tc-root *{box-sizing:border-box}
.tc-root{margin:0;background:var(--Graphite);color:var(--Cream);font-family:var(--Sans);-webkit-text-size-adjust:100%;text-size-adjust:100%}
.tc-root svg text{font-family:var(--Sans)}
.tc-root :focus{outline:none}
/* Design silent on keyboard focus: a Cream outline, offset, never a browser colour. */
.tc-root :focus-visible{outline:var(--OW) solid var(--Cream);outline-offset:var(--OW)}

/* ART-04 console frame, ui/style.md Console frame */
.tc-frame{position:absolute;inset:0;display:grid;background:var(--Graphite);overflow:hidden;
  padding:var(--SafeTop,0px) var(--SafeRight,0px) var(--SafeBottom,0px) var(--SafeLeft,0px);--Bar:var(--ControlBar)}
.tc-frame[hidden]{display:none}
/* Owner's change: the order bar a strip above the window, as tall as its text; the control bar along the bottom or the right. */
.tc-frame.tc-portrait{grid-template-rows:auto minmax(0,1fr) var(--Bar);grid-template-columns:minmax(0,1fr)}
.tc-frame.tc-landscape{grid-template-columns:minmax(0,1fr) var(--Bar);grid-template-rows:auto minmax(0,1fr)}
.tc-landscape>.tc-obar{grid-area:1/1/2/2}
.tc-landscape>.tc-window{grid-area:2/1/3/2}
.tc-landscape>.tc-cbar{grid-area:1/2/3/3}
.tc-obar{padding:var(--PlateGap) var(--FrameMargin) 0;font-size:var(--TextSize);line-height:1.2;color:var(--Cream);min-width:0;overflow-wrap:anywhere}
.tc-title{font-weight:700;margin:0;font-size:var(--TextSize);line-height:1.2}
.tc-window{position:relative;margin:var(--FrameMargin);background:var(--Ink);border:var(--OW) solid var(--Orange);overflow:hidden;min-width:0;min-height:0}
/* The control bar's keys in fixed slots: a grid the frame sets for the sizes in force. */
.tc-cbar{display:grid;min-width:0;min-height:0}
.tc-portrait .tc-cbar{align-content:center;padding:calc(var(--PlateGap) / 2) var(--PlateGap)}
.tc-landscape .tc-cbar{justify-content:center;padding:var(--PlateGap) calc(var(--PlateGap) / 2)}
.tc-cbar>*{place-self:center}
.tc-standby{position:absolute;inset:0;background:var(--Ink);pointer-events:none;z-index:50}
.tc-frame .tc-undimmed{position:relative;z-index:51}
.tc-paperlayer{position:absolute;left:0;top:0;right:0;height:0;overflow:hidden;pointer-events:none;z-index:55}
.tc-paperlayer .tc-paper{pointer-events:auto}
.tc-catcher{display:none;position:absolute;inset:0;z-index:40}
.tc-paperup .tc-catcher{display:block}
.tc-paperup .tc-abovepaper{position:relative;z-index:41}
/* While a printout lies on the screen, the frame's plates show disabled; a switch stays as it is (ui/style.md Printout). */
.tc-paperup .tc-cbar .tc-plate:not(.tc-switch){background:var(--GraphiteLight);color:var(--Cream);border-color:var(--Cream)}

/* Plate: ui/style.md Plate */
.tc-plate{appearance:none;-webkit-appearance:none;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-direction:column;flex:none;
  margin:0;min-width:var(--PlateSize);min-height:var(--PlateSize);padding:0 calc(var(--PlateGap) / 2 - var(--OW));
  background:var(--Cream);color:var(--Ink);border:var(--OW) solid var(--Ink);border-radius:4px;
  font-family:var(--Sans);font-weight:700;font-size:var(--LabelSize);line-height:1.15;text-align:center;white-space:nowrap;
  cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.tc-plate .tc-label{display:block}
.tc-plate .tc-sub{margin-top:calc(var(--PlateGap) / 8)}
/* Owner's change: a console key. Inside its Ink outline, a GraphiteLight bevel along the bottom and right edges and a thin
   GraphiteLight line inset round the face; the label engraved, letter-spaced. Pressed, the bevel drops and the label sits
   that much lower and further right; a switch's toggle stays where it is. A plate on paper stays printed (ART-12). */
.tc-plate:not(.tc-onpaper){--Bevel:calc(var(--PlateSize) / 16);--KeyPad:calc(var(--PlateGap) * .9 - 4.8px);padding:0 calc(var(--KeyPad) + var(--Bevel)) var(--Bevel) var(--KeyPad)}
.tc-plate:not(.tc-onpaper)::after{content:"";position:absolute;inset:0;border-right:var(--Bevel) solid var(--GraphiteLight);border-bottom:var(--Bevel) solid var(--GraphiteLight);border-radius:0 0 2px 0;pointer-events:none}
.tc-plate:not(.tc-onpaper)::before{content:"";position:absolute;left:1px;top:1px;right:calc(var(--Bevel) + 1px);bottom:calc(var(--Bevel) + 1px);border:1px solid var(--GraphiteLight);border-radius:2px;pointer-events:none}
.tc-plate:not(.tc-onpaper) .tc-label{letter-spacing:calc(var(--PlateGap) / 16);margin-right:calc(var(--PlateGap) / -16)}
.tc-plate.tc-pressed:not(.tc-onpaper)::after,.tc-plate:not(.tc-disabled):not(.tc-onpaper):active::after{display:none}
.tc-plate.tc-pressed:not(.tc-onpaper):not(.tc-switch)::before,.tc-plate:not(.tc-disabled):not(.tc-onpaper):not(.tc-switch):active::before{left:calc(var(--Bevel) + 1px);top:calc(var(--Bevel) + 1px);right:1px;bottom:1px}
.tc-plate.tc-pressed:not(.tc-onpaper):not(.tc-switch),.tc-plate:not(.tc-disabled):not(.tc-onpaper):not(.tc-switch):active{padding:var(--Bevel) var(--KeyPad) 0 calc(var(--KeyPad) + var(--Bevel))}
.tc-plate.tc-pressed,.tc-plate:not(.tc-disabled):not(.tc-onpaper):active{background:var(--Ink);color:var(--Cream);border-color:var(--Cream)}
.tc-plate.tc-held{cursor:default}
.tc-plate.tc-disabled{background:var(--GraphiteLight);color:var(--Cream);border-color:var(--Cream);cursor:default}
/* ART-12: a plate on paper keeps its Cream fill and Ink label; pressed, a second Ink outline stands outside the first, a gap of OutlineWeight between them. */
.tc-plate.tc-onpaper.tc-pressed,.tc-plate.tc-onpaper:active{background:var(--Cream);color:var(--Ink);border-color:var(--Ink);outline:var(--OW) solid var(--Ink);outline-offset:var(--OW)}

/* Switch: ui/style.md Switch. A switch has no disabled look: it is up or down. */
.tc-switchunit{display:inline-flex;align-items:center;flex:none}
.tc-switch{gap:calc(var(--PlateGap) / 4)}
/* The AUDIO switch's lamp in its plate, beside the toggle (owner's change). */
.tc-switch .tc-keyrow{display:flex;align-items:center;gap:calc(var(--PlateGap) / 2);padding:0 calc(var(--PlateGap) / 4)}
.tc-switch.tc-pressed,.tc-switch:active{background:var(--Cream);color:var(--Ink);border-color:var(--Ink)}
.tc-toggle{display:block;width:calc(var(--PlateSize) / 3);height:calc(var(--PlateSize) / 2);overflow:visible}
/* The previews' throw: the lever leans 32 degrees either way of upright, about a point near its foot. */
.tc-lever{transform-box:view-box;transform-origin:50% 88%;transform:rotate(-32deg);transition:transform var(--SwitchThrowTime) cubic-bezier(.3,1.6,.6,1)}
.tc-switch.tc-down .tc-lever{transform:rotate(32deg)}
.tc-switch.tc-snap .tc-lever{transition:none}

/* Lamp: ui/style.md Lamp, ART-05 */
/* Half PlateGap between the lens and its label, so a lit lens's ring clears the label (design silent). */
.tc-lampunit{display:inline-flex;align-items:center;gap:calc(var(--PlateGap) / 2);flex:none;white-space:nowrap}
.tc-lens{display:block;flex:none;width:var(--LampLens);height:var(--LampLens);overflow:visible}
.tc-lampunit .tc-lamplabel{font-size:var(--LabelSize);line-height:1.1;font-weight:700;color:var(--Cream)}
.tc-oncream .tc-lamplabel{color:var(--Ink)}

/* List row: ui/style.md List row */
.tc-list{display:flex;flex-direction:column;align-items:center;gap:var(--PlateGap);padding:var(--PlateGap)}
.tc-row{appearance:none;-webkit-appearance:none;display:flex;flex-direction:column;justify-content:center;position:relative;flex:none;margin:0;
  width:min(100%,var(--RowWidth));min-height:var(--RowHeight);padding:calc(var(--PlateGap) / 2) calc(var(--PlateGap) - var(--OW));
  background:var(--Cream);color:var(--Ink);border:var(--OW) solid var(--Ink);border-radius:4px;
  font-family:var(--Sans);font-size:var(--TextSize);line-height:1.15;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.tc-row.tc-inactive{cursor:default}
.tc-row .tc-r1{display:flex;align-items:center;justify-content:space-between;gap:var(--PlateGap)}
.tc-row .tc-r2{display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--PlateGap) / 2) var(--PlateGap);font-size:var(--LabelSize);line-height:1.15;font-weight:700;margin-top:2px}
.tc-row .tc-lead{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tc-row.tc-indent{margin-left:var(--PlateGap);width:min(calc(100% - var(--PlateGap)),calc(var(--RowWidth) - var(--PlateGap)))}
.tc-row.tc-pressed,.tc-row:not(.tc-inactive):not(.tc-head):not(.tc-ach):active{background:var(--Ink);color:var(--Cream);border-color:var(--Cream)}
.tc-row.tc-pressed .tc-lamplabel,.tc-row:not(.tc-inactive):not(.tc-head):not(.tc-ach):active .tc-lamplabel{color:var(--Cream)}
.tc-row.tc-head{flex-direction:row;align-items:center;justify-content:flex-start;gap:var(--PlateGap);background:var(--Ink);color:var(--Cream);border-color:var(--Cream);font-weight:700}
.tc-row.tc-head.tc-pressed,.tc-row.tc-head:not(.tc-inactive):active{background:var(--GraphiteLight)}
.tc-row.tc-ach{background:var(--GraphiteLight);color:var(--Cream);border-color:var(--Cream);cursor:default}
.tc-row .tc-sil{display:block;flex:none}

/* Medal (owner's change; design silent): a grid as wide as a list row; each tile GraphiteLight with Cream text, as an achievement
   row; a medal not earned on Ink, its tile's outline dashed, its text at full contrast. */
.tc-medals{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,calc(var(--TextSize) * 9.5)),1fr));gap:var(--PlateGap);
  width:min(100%,var(--RowWidth));margin:0;padding:0;list-style:none;flex:none}
.tc-medal{display:flex;flex-direction:column;align-items:center;gap:calc(var(--PlateGap) / 2);min-width:0;margin:0;
  padding:calc(var(--PlateGap) / 2) calc(var(--PlateGap) / 2) var(--PlateGap);background:var(--GraphiteLight);color:var(--Cream);
  border:var(--OW) dashed var(--Cream);border-radius:4px;text-align:center;font-family:var(--Sans)}
.tc-medal:not(.tc-earned){background:var(--Ink)}
.tc-medal.tc-earned{border-style:solid}
.tc-medal .tc-medalart{display:block;flex:none;width:calc(var(--PlateSize) * 1.15);height:calc(var(--PlateSize) * 1.15 * 76 / 60)}
.tc-medal .tc-mname{font-size:var(--TextSize);font-weight:700;line-height:1.15;overflow-wrap:anywhere}
.tc-medal .tc-mtext{font-size:var(--LabelSize);line-height:1.25;overflow-wrap:anywhere}
.tc-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

/* Printout: ui/style.md Printout, ART-12 */
/* Its Ink outline stands outside the PaperColumns and the PerfMargin each side. */
.tc-paper{position:absolute;bottom:0;left:calc(50% - (var(--PaperColumns) * 1ch + 2 * var(--PerfMargin) + 2 * var(--OW)) / 2);display:flex;flex-direction:column;max-height:100%;
  width:calc(var(--PaperColumns) * 1ch + 2 * var(--PerfMargin) + 2 * var(--OW));
  background:var(--Cream);color:var(--Ink);border:var(--OW) solid var(--Ink);border-bottom:0;
  font-family:var(--Mono);font-size:var(--PaperTextSize);line-height:1.3;z-index:20;cursor:pointer}
.tc-paper .tc-perf{position:absolute;top:0;bottom:0;width:var(--PerfMargin);pointer-events:none;overflow:hidden}
.tc-paper .tc-perf svg{display:block;width:100%;height:100%}
.tc-paper .tc-perf.tc-l{left:0}.tc-paper .tc-perf.tc-r{right:0}
/* The space under the body's last row is a margin, not padding, so a row cut by the body's edge never shows in it. */
.tc-paper .tc-pbody{flex:1 1 auto;min-height:0;overflow:hidden;padding:calc(var(--PaperTextSize) * .7) var(--PerfMargin) 0;margin-bottom:calc(var(--PaperTextSize) * .5)}
.tc-paper .tc-lines{width:calc(var(--PaperColumns) * 1ch)}
.tc-paper .tc-ln{position:relative;white-space:pre;min-height:1.3em}
.tc-paper .tc-txt{position:relative;display:inline-block;vertical-align:top}
.tc-paper .tc-ln .tc-strike2{position:absolute;left:calc(var(--DoubleStrikeOffset) * 1ch);top:0;pointer-events:none}
.tc-paper .tc-ln .tc-stamp{display:inline-block;vertical-align:middle;margin-right:1ch;height:1.6em;width:1.6em}
.tc-paper .tc-foot{flex:none;border-top:var(--OW) dashed var(--Ink)}
.tc-paper .tc-foot:empty{display:none}
.tc-paper .tc-footlines{padding:calc(var(--PaperTextSize) * .5) var(--PerfMargin) 0}
.tc-paper .tc-footlines:empty{display:none}
.tc-paper .tc-controls{display:flex;justify-content:center;flex-wrap:wrap;gap:var(--PlateGap);padding:var(--PlateGap) var(--PerfMargin);font-family:var(--Sans)}
.tc-paper .tc-controls:empty{display:none}
/* Field: its text PaperColumns wide, in the paper's columns; its outline stands out into the PerfMargin each side. Words
   wrap at spaces, a word longer than a row breaks where it must; a pasted code, no space in it, breaks at every column. */
.tc-field{display:block;flex:none;width:calc(var(--PaperColumns) * 1ch + 2 * var(--OW));height:calc(var(--PaperTextSize) * 1.3 * 3 + 2 * var(--OW) + 4px);
  margin:0 calc(-1 * var(--OW));padding:2px 0;resize:none;
  background:var(--Cream);color:var(--Ink);border:var(--OW) solid var(--Ink);border-radius:0;font-family:var(--Mono);font-size:var(--PaperTextSize);line-height:1.3;
  white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;overflow:hidden}
.tc-field.tc-code{word-break:break-all}
.tc-field::placeholder{color:var(--Ink)}
.tc-paper.tc-tearing{transition:transform var(--TearTime) ${cssEasings.easeIn},opacity var(--TearTime) ${cssEasings.easeIn};transform:translateY(40%) rotate(2deg);opacity:0}

/* Board SVG */
.tc-board{display:block;overflow:visible}
.tc-blink{animation:tc-blink var(--LitBlinkTime) steps(1,end) infinite}
@keyframes tc-blink{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
`;
}

/** Puts the design system's style sheet into the document once. */
export function installStyles(doc: Document): void {
  if (doc.getElementById("tc-styles")) return;
  const el = doc.createElement("style");
  el.id = "tc-styles";
  el.textContent = styleSheet();
  doc.head.appendChild(el);
  doc.documentElement.classList.add("tc-root");
  doc.body.classList.add("tc-root");
}
