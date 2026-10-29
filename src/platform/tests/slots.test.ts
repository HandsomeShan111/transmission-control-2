import { describe, expect, test } from "bun:test";
import { createSlots, type SlotHost } from "../slots";

class Host implements SlotHost<string> {
  nodes: string[] = [];
  replaceChildren(...n: string[]) {
    this.nodes = n;
  }
}

describe("slots", () => {
  test("a slot without filler keeps its default", () => {
    const slots = createSlots<string>();
    const host = new Host();
    slots.define("AUDIO", host, () => "default");
    expect(host.nodes).toEqual(["default"]);
    expect(slots.isFilled("AUDIO")).toBe(false);
  });
  test("fill by name after the slot exists", () => {
    const slots = createSlots<string>();
    const host = new Host();
    slots.define("SAVE CODE", host, () => null);
    expect(host.nodes).toEqual([]);
    slots.fill("SAVE CODE", () => ["plate", "field"]);
    expect(host.nodes).toEqual(["plate", "field"]);
  });
  test("fill by name before the slot exists", () => {
    const slots = createSlots<string>();
    slots.fill("AUDIO", () => "switch");
    const host = new Host();
    slots.define("AUDIO", host, () => "default");
    expect(host.nodes).toEqual(["switch"]);
  });
  test("unfill returns the default", () => {
    const slots = createSlots<string>();
    const host = new Host();
    slots.define("x", host, () => "default");
    const unfill = slots.fill("x", () => "filled");
    unfill();
    expect(host.nodes).toEqual(["default"]);
  });
  test("one filler per slot, one definition per name", () => {
    const slots = createSlots<string>();
    slots.fill("x", () => "a");
    expect(() => slots.fill("x", () => "b")).toThrow("already filled");
    slots.define("x", new Host(), () => null);
    expect(() => slots.define("x", new Host(), () => null)).toThrow("already defined");
  });
  test("refresh renders again", () => {
    const slots = createSlots<string>();
    const host = new Host();
    let n = 0;
    slots.define("x", host, () => `v${n}`);
    n = 1;
    slots.refresh("x");
    expect(host.nodes).toEqual(["v1"]);
  });
  test("a filler kept over an undefine fills the next define", () => {
    const slots = createSlots<string>();
    slots.fill("x", () => "f");
    slots.define("x", new Host(), () => "d");
    slots.undefine("x");
    const h2 = new Host();
    slots.define("x", h2, () => "d");
    expect(h2.nodes).toEqual(["f"]);
    expect(slots.names()).toEqual(["x"]);
  });
  test("widgets by name", () => {
    const slots = createSlots<string>();
    slots.widget<{ label: string }>("lamp", (p) => `lamp ${p.label}`);
    expect(slots.makeWidget("lamp", { label: "WIRES" })).toBe("lamp WIRES");
    expect(slots.hasWidget("lamp")).toBe(true);
    expect(() => slots.makeWidget("none", {})).toThrow("no widget none");
    expect(() => slots.widget("lamp", () => "")).toThrow("already registered");
  });
});
