// In-page helpers for the art tests, added before the gallery's own script.
// Plain JavaScript in a string: it runs in each engine as written.
export const ART_INIT = `
(() => {
  let calls = 0;
  const random = Math.random;
  Math.random = function () { calls++; return random.call(Math); };
  const hex = (c) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(c || "");
    if (!m) return null;
    const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
    return { hex: "#" + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""), a: p.length > 3 ? p[3] : 1 };
  };
  const SHAPES = "rect,circle,ellipse,path,polygon,polyline,line,text,tspan";
  const scaleOf = (el) => { const m = el.getScreenCTM(); return m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1; };
  const boardOf = (el) => el.closest("svg.tc-board") || el.ownerSVGElement;
  /** An SVG length in board units: user units times the element's scale over its board's, to a millionth (the two scales'
   * ratio carries float error once the board's own scale is not a round number). */
  const toBoard = (el, v) => {
    const cs = getComputedStyle(el);
    if (cs.vectorEffect === "non-scaling-stroke") return v;
    const b = boardOf(el);
    return Math.round((v * scaleOf(el)) / (b ? scaleOf(b) : 1) * 1e6) / 1e6;
  };
  const strokeW = (el) => toBoard(el, parseFloat(getComputedStyle(el).strokeWidth));
  const fillOf = (el) => { const f = getComputedStyle(el).fill; return f === "none" || f.startsWith("url") ? f : (hex(f) || {}).hex; };
  const strokeOf = (el) => { const f = getComputedStyle(el).stroke; return f === "none" ? f : (hex(f) || {}).hex; };
  const visible = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (e.tagName === "clipPath" || e.tagName === "defs" && !e.querySelector("pattern")) return false;
    }
    return true;
  };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  window.__art = { hex, SHAPES, scaleOf, toBoard, strokeW, fillOf, strokeOf, visible, ownText, randomCalls: () => calls };
})();
`;
