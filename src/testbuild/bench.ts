// Test build aid (acceptance.md, Test build): a batch item of the open order put at any input jack; one named agent then works or
// checks it once: no run, no report. An item moved from another jack keeps its kind, marks and check counts.
import { apply } from "../blocks/agents/api";
import type { Applied } from "../blocks/agents/api";
import { enter } from "../blocks/items/api";
import type { Item } from "../blocks/items/api";
import type { Order } from "../blocks/orders/api";

export class Bench {
  private readonly copies: number[];

  constructor(readonly order: Order) {
    this.copies = order.batch.map(() => 0);
  }

  /** Batch item `place` (from 1) as it enters (ITEM-01). */
  item(place: number): Item {
    const b = this.order.batch[place - 1];
    if (!b) throw new Error(`order ${this.order.n} has no item ${place}`);
    return enter(place, b.kind, b.marks, b.required);
  }

  /** Agent `label` works or checks `item` once. A copier's copy takes its batch item's next copy number (ITEM-03). */
  work(label: string, item: Item): Applied {
    const a = this.order.agents.find((x) => x.label === label);
    if (!a) throw new Error(`order ${this.order.n} has no agent ${label}`);
    const n = this.copies[item.place - 1]! + 1;
    const res = apply(a, item, { copy: n, required: this.order.batch[item.place - 1]!.copies.find((c) => c.n === n)?.required ?? null });
    if (res.action === "copy") this.copies[item.place - 1] = n;
    return res;
  }
}
