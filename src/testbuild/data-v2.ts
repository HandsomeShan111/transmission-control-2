// The second test build's named data change (acceptance.md, Test build; SAVE-05): order 4 Archive day's batch changed, so its
// fingerprint differs, and its first result's text rewritten in its place.
import type { Order } from "../blocks/orders/api";

export const V2_RESULT_TEXT = "Laminated coffee, filed under Beverages, Forever.";

export function patchOrders(base: readonly Order[]): readonly Order[] {
  return base.map((o) =>
    o.n !== 4
      ? o
      : {
          ...o,
          batch: o.batch.map((b, i) => (i === 2 ? { kind: "Address", marks: [], required: { destination: "Archive", kind: "Address", marks: ["laminated"] }, copies: [] } : b)),
          results: o.results.map((r, i) => (i === 0 ? { ...r, text: V2_RESULT_TEXT } : r)),
        },
  );
}
