// REPAIR-03: each repair order's best moves, held in this page's memory. Saving keeps it and sets it back on start.
import { orderStore } from "../../par-and-score/api";
import type { RepairBest } from "../api";

export const { best, setBest, bests } = orderStore<RepairBest>();
