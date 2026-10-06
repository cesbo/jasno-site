# Components

`component()` wraps a function that builds one DOM node. The body runs once. jasno gives each component an owner, and the owner cleans up everything that the component creates.

## Define a component

Write the component as a named function with a props interface and the return type `Node`. Call it like a function.

```ts
export interface CounterProps {
  label: Read<string>;
  onChange: (value: number) => void;
}

export const Counter = component(function Counter(p: CounterProps): Node {
  const count = signal(0);
  return h.button({
    onclick: () => { count.update((n) => n + 1); p.onChange(count()); },
  }, p.label, ': ', count);
});

const counter = Counter({
  label: () => 'Clicks',
  onChange: (n) => console.log(n),
});
```

Follow three rules:

- **Name the function.** jasno names the owner after the function. The name appears in diagnostics and in `window.__JASNO__`. An arrow function or an unnamed function is reported as `ANONYMOUS_COMPONENT`.
- **Write `: Node`.** A view often imports the router, and the router imports the view. Without the annotation, TypeScript cannot infer the types of both, and it reports a confusing TS7022 error in a different file. A missing annotation is reported as `COMPONENT_RETURN_TYPE`.
- **Wrap every exported component.** An exported PascalCase function that returns `Node` without `component()` has no owner of its own. jasno reports it as `COMPONENT_NOT_WRAPPED`.

A component returns exactly one node. To render nothing, return `show(...)`. To return several nodes, wrap them in one element. Another return value throws `COMPONENT_RETURN_NOT_NODE` in development.

A small markup helper that creates no signals, effects or `onMount` callbacks can stay a plain function. Give it a camelCase name, such as `badge(text)`. It is not a component, so jasno does not report it.

## Setup

The body of a component is its setup. Setup runs once, and it is untracked. A signal that you read there is a snapshot. The [reactivity](/docs/api/reactivity) page explains how to read signals correctly.

Create local state in setup. Setup can write only the signals that it created itself. If setup writes a module signal, or a signal that a parent passed down, jasno reports `WRITE_IN_SETUP`. Write that signal in an event handler or in `onMount`.

## Props

A data prop is a `Read<T>`. The caller passes a signal, a computed or `() => value`. Use a plain `T` only for a value that is fixed at creation, such as an id.

An optional prop has the type `Read<T> | undefined`, and the `?` mark: `sub?: Read<string> | undefined`. The `| undefined` part lets a caller pass `undefined` on purpose.

A callback prop is a plain function.

A prop that is usually a constant and sometimes live, such as a label or a hint, has the type `MaybeRead<T>`. The caller writes `hint: 'Default'` or `hint: () => text()`. Elements accept both forms, so you can pass the prop to `h.*` as it is. To compute with it, unwrap it once inside a function.

```ts
export interface CardProps {
  title: Read<string>;
  hint?: MaybeRead<string> | undefined;
  onClose: () => void;
}

export const Card = component(function Card(p: CardProps): Node {
  const hint = () => (typeof p.hint === 'function' ? p.hint() : p.hint);
  return h.section({ class: 'card' },
    h.h3(null, p.title),
    h.small(null, hint),
    h.button({ onclick: p.onClose }, 'Close'),
  );
});
```

jasno passes props by reference. It does not copy, proxy or track them. A prop is the function that the caller gave you, so you call it inside a live place, as in `h.h3(null, p.title)`.

### Content props

Content that may not render is a function prop. So is content that must see the context of the component. Do not use a `children` prop.

The reason is the order of evaluation. JavaScript evaluates the arguments of a call before the body of the called function. A node that you pass as an argument is created first. It is created even if the component never shows it, and it cannot see the context that the component provides.

```ts
export interface PanelProps {
  title: Read<string>;
  body: () => Child;
}

export const Panel = component(function Panel(p: PanelProps): Node {
  const open = signal(true);
  return h.section(null, h.h3(null, p.title), show(open, () => p.body()));
});

const panel = Panel({
  title: () => 'Notes',
  body: () => h.p(null, 'The text'),
});
```

## Owners and cleanup

Each call of a component creates an owner. Everything that setup creates belongs to that owner: computeds, effects, resources, bindings and child components.

When the component leaves the page, jasno disposes its owner. A component leaves when a `show` branch flips, when a row key leaves a list, or when the router opens another view. Disposal runs in this order:

1. jasno disposes the child owners, in reverse order of creation.
2. jasno aborts the `abortSignal` of the owner.
3. jasno runs the cleanup functions, in reverse order of registration.

Disposal does not remove DOM nodes. The region that holds them, such as `show`, `each` or the router, removes them.

### onMount

Use `onMount` for work that needs the page: window and document listeners, timers, focus, measuring, and subscriptions whose callbacks set signals. The callback runs once, after the nodes of the component are in the document. It is untracked.

The callback receives an `abortSignal`. It can also return a cleanup function. Both run when the component is disposed.

```ts
export const Clock = component(function Clock(): Node {
  const now = signal(Date.now());
  onMount(({ abortSignal }) => {
    window.addEventListener(
      'focus',
      () => now.set(Date.now()),
      { signal: abortSignal },
    );
    const timer = setInterval(() => now.set(Date.now()), 1000);
    return () => clearInterval(timer);
  });
  return h.p(null, () => new Date(now()).toLocaleTimeString());
});
```

Do not add a window listener or a timer in setup. Nothing removes it, and jasno reports `LEAK_IN_SETUP`. Code in an event handler, in a timer or after an `await` has no owner. An effect or a component that you create there leaks, and jasno reports `NO_OWNER`.

## No refs

jasno has no refs. `h.*` returns the real element, so keep it in a `const`. `ref` and `useRef` are type errors. A `ref` prop on an element is reported as `UNKNOWN_PROP`. The [elements](/docs/api/elements-and-events) page has an example.

## Mistakes this catches

| Code | When |
|---|---|
| [`ANONYMOUS_COMPONENT`](/docs/diagnostics/ANONYMOUS_COMPONENT) | `component()` gets an arrow function or an unnamed function |
| [`COMPONENT_RETURN_TYPE`](/docs/diagnostics/COMPONENT_RETURN_TYPE) | a component function without `: Node` |
| [`COMPONENT_NOT_WRAPPED`](/docs/diagnostics/COMPONENT_NOT_WRAPPED) | an exported PascalCase function returns `Node` without `component()` |
| [`COMPONENT_RETURN_NOT_NODE`](/docs/diagnostics/COMPONENT_RETURN_NOT_NODE) | a component returns `null`, a string or an array |
| [`WRITE_IN_SETUP`](/docs/diagnostics/WRITE_IN_SETUP) | setup writes a signal that it did not create |
| [`LEAK_IN_SETUP`](/docs/diagnostics/LEAK_IN_SETUP) | a window listener or timer in setup without cleanup |
| [`NO_OWNER`](/docs/diagnostics/NO_OWNER) | an effect, resource or component created in a handler or after `await` |
| [`UNKNOWN_PROP`](/docs/diagnostics/UNKNOWN_PROP) | a `ref` prop on an element |
