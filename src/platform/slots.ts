// Named slots and widgets (system architecture, Web shell: joins slots and
// widgets by name). A screen's owner defines a slot: a named place with a
// default. Another block fills it by name, before or after the slot exists.
// A slot without filler keeps its default. A widget is a named builder a block
// registers so others can place it by name.

/** What a slot renders into; an Element in the page. */
export interface SlotHost<N> {
  replaceChildren(...nodes: N[]): void;
}

export type Render<N> = () => N | N[] | null;

export interface Slots<N> {
  /** Defines a slot in a host. Throws on a second definition of one name. */
  define(name: string, host: SlotHost<N>, fallback: Render<N>): void;
  /** Removes a slot's definition; its filler stays for a later define. */
  undefine(name: string): void;
  /** Fills a slot by name. One filler per slot: a second throws. Returns the unfill. */
  fill(name: string, render: Render<N>): () => void;
  unfill(name: string): void;
  /** Renders a slot again, its filler or its default. */
  refresh(name: string): void;
  isFilled(name: string): boolean;
  isDefined(name: string): boolean;
  names(): string[];
  widget<P>(name: string, build: (props: P) => N): void;
  makeWidget<P>(name: string, props: P): N;
  hasWidget(name: string): boolean;
}

export function createSlots<N>(): Slots<N> {
  const defined = new Map<string, { host: SlotHost<N>; fallback: Render<N> }>();
  const fillers = new Map<string, Render<N>>();
  const widgets = new Map<string, (props: never) => N>();

  const render = (name: string) => {
    const d = defined.get(name);
    if (!d) return;
    const out = (fillers.get(name) ?? d.fallback)();
    d.host.replaceChildren(...(out == null ? [] : Array.isArray(out) ? out : [out]));
  };

  const slots: Slots<N> = {
    define(name, host, fallback) {
      if (defined.has(name)) throw new Error(`slot ${name} is already defined`);
      defined.set(name, { host, fallback });
      render(name);
    },
    undefine(name) {
      defined.delete(name);
    },
    fill(name, r) {
      if (fillers.has(name)) throw new Error(`slot ${name} is already filled`);
      fillers.set(name, r);
      render(name);
      return () => {
        if (fillers.get(name) === r) slots.unfill(name);
      };
    },
    unfill(name) {
      if (!fillers.delete(name)) return;
      render(name);
    },
    refresh: render,
    isFilled: (name) => fillers.has(name),
    isDefined: (name) => defined.has(name),
    names: () => [...new Set([...defined.keys(), ...fillers.keys()])].sort(),
    widget(name, build) {
      if (widgets.has(name)) throw new Error(`widget ${name} is already registered`);
      widgets.set(name, build as (props: never) => N);
    },
    makeWidget<P>(name: string, props: P) {
      const build = widgets.get(name) as ((p: P) => N) | undefined;
      if (!build) throw new Error(`no widget ${name}`);
      return build(props);
    },
    hasWidget: (name) => widgets.has(name),
  };
  return slots;
}

/** The page's one registry of DOM slots and widgets. */
export const pageSlots: Slots<Node> = createSlots<Node>();
