// Reports, switched off: a mission report's lead only; an incident report prints nothing.
import type * as Api from "./api";

export const authoredLine: typeof Api.authoredLine = () => "";
export const resultLine: typeof Api.resultLine = () => null;
export const firstDifference: typeof Api.firstDifference = () => null;
export const endLine: typeof Api.endLine = () => "";
export const report: typeof Api.report = (order, trace) => {
  const lead = trace.win ? `${order.name}: delivered as ordered.` : "";
  return { order: order.n, form: trace.win ? "mission" : "incident", lead, leadItem: null, handWritten: null, second: null, scoreLines: [], blocks: [], lines: lead ? [lead] : [] };
};
