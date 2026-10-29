// Orders, switched off: no orders.
import type * as Api from "./api";

export const orders: typeof Api.orders = () => [];
export const order: typeof Api.order = (n) => {
  throw new Error(`orders are switched off: no order ${n}`);
};
export const sameEnding: typeof Api.sameEnding = () => false;
