// A report's id: stable over every run that prints the same report (board contract, page events).
// FNV-1a, 32 bits, over the order number and the report's lines.
import type { Report } from "../api";

export function reportId(r: Pick<Report, "order" | "lines">): string {
  let h = 0x811c9dc5;
  const text = `${r.order}\n${r.lines.join("\n")}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${r.order}-${h.toString(16).padStart(8, "0")}`;
}
