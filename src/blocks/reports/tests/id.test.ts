import { expect, test } from "bun:test";
import { order } from "../../orders/api";
import { run } from "../../run/api";
import { report, reportId } from "../api";

test("report id: the same report gives the same id; another report another", () => {
  const o = order(1);
  const w = [{ from: "IN", to: "LAMINATOR" }, { from: "LAMINATOR", to: "World Council" }];
  const a = reportId(report(o, run(o, w)));
  expect(reportId(report(o, run(o, w)))).toBe(a);
  expect(reportId(report(o, run(o, [{ from: "IN", to: "LAMINATOR" }])))).not.toBe(a);
  expect(a.startsWith("1-")).toBe(true);
});
