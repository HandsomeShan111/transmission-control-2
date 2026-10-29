// Product measures, switched off: no event, nothing sent.
import type * as Api from "./api";
import { EMPTY_EVENTS } from "./logic/measures";

export const startMeasures: typeof Api.startMeasures = () => ({ send: () => Promise.resolve(), events: () => EMPTY_EVENTS });
