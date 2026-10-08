# Reactivity

State in jasno is a signal: a function that returns the current value. Pass the function to keep a place live, or call it to get a snapshot.

Derived values, effects and scheduling all follow from this one rule.

## The rule

A function is live. Any other value is a snapshot. `h.p(null, count)` updates when `count` changes. `h.p(null, count())` shows the number once and never updates.

A signal is a function. Pass `count` to make a live place. Write `count()` to read a snapshot. There is no second rule: no guessing, no automatic unwrapping, no compiler.

```ts
const count = signal(0);
const doubled = computed(() => count() * 2);
const live = h.p(null, 'Count: ', count, ', doubled: ', doubled);
// renders "Count: 0" and never changes
const snapshot = h.p(null, `Count: ${count()}`);
```

Types enforce the rule. A live input has the type `Read<T>`: a function with no arguments that returns `T`. On a `Read<readonly Item[]>`, `items.length` is a type error. The hint says "call it first: items().length". A forgotten call does not compile.

Some props are usually constant and sometimes live, for example a label or a hint. These props have the type `MaybeRead<T>`. The caller passes `'Default'` or `() => text()`. Element props and children accept both.

Names from other frameworks are type errors. `createSignal`, `useState`, `createMemo`, `useEffect`, `useOptimistic` and `batch` exist only as stubs. The type of each stub is the error message, and it points to the jasno form.

## Signals

`signal(initial)` creates writable state. Call it to read. Call `set(value)` to write. Call `update(fn)` to write `fn(current)`.

`set` and `update` are bound, so `onclick: count.update` type-checks. Do not use it. A signal is not a handler. Write `() => count.update((n) => n + 1)`.

```ts
const items = signal<string[]>([]);
items.update((list) => [...list, 'new']); // replace the array
const price = signal(1.5, {
  equal: (a, b) => Math.abs(a - b) < 0.001,
  debugName: 'price',
});
```

Equality is `Object.is`. A write with an equal value does nothing and schedules nothing. The `equal` option replaces `Object.is` for one signal. `equal: () => false` always notifies.

jasno does not see mutation. `users().push(u); users.set(users())` does nothing, because `Object.is` finds the same array. For this reason arrays, tuples, `Map` and `Set` are readonly when you read them. `items().push('new')` is a type error. Replace the value instead. This blocks the habit of mutating in place from Vue or Svelte.

Other object types stay as they are. `Readonly<T>` on a DOM element or a class instance would give false errors. Generic code that stores a type parameter writes `signal<T, T>(initial)` to opt out.

## Derived values

`computed(fn)` is a lazy, cached derived value. It recomputes only when you read it after a source changed. While something observes it, its readers run at most once per flush, even if several sources change.

A computed must be pure and synchronous. A write inside it throws `WRITE_IN_DERIVATION` in both builds. An async function is a type error.

A computed that nothing observes recomputes on every read and keeps no links. A computed that you create in a handler is garbage when you drop the reference.

Use `linkedSignal` for state that resets when an input changes. Do not copy the input with an effect. Examples are a draft that clears when the user changes, and a selection that resets when the list reloads. A `linkedSignal` is writable until its source gives a new value. jasno compares the values with `Object.is`.

```ts
const Draft = component(function Draft(p: { userId: Read<string> }): Node {
  // resets per user, writable until then
  const text = linkedSignal({ source: p.userId, computation: () => '' });
  return h.textarea({ 'aria-label': 'Note', ...bindValue(text) });
});
```

The object form is deliberate. jasno has no shorthand `linkedSignal(() => { p.userId(); return ''; })`. Such a form would reset when anything the function reads changes. An inline `() => user().id` would clear the draft on every refetch. The dependency line would also look dead, so someone would delete it.

In the object form, `source` names the dependency. `computation(source, previous)` receives the old source and the old value. Use them to merge, for example to keep edits across a save echo. Annotate the return type when the computation reads `previous`.

For selection in lists, use `selector(source)`. `const isSelected = selector(selectedId)` gives each row `() => isSelected(item().id)`. The row runs again only when its own answer changes. A write costs O(1), not one run per row.

## Reading in setup

A component body runs once and is untracked. The callbacks of `show`, `match`, `each` and `catchError` do the same. A signal that you read there is a snapshot from the moment of creation. In development, jasno reports it as `STRICT_READ_UNTRACKED`. The report names the component, the signal and the line.

To fix it, read the signal inside a function that you give to jasno.

```ts
const Greeting = component(function Greeting(p: { name: Read<string> }): Node {
  // live; `Hello, ${p.name()}` outside the function would be a snapshot
  return h.p(null, () => `Hello, ${p.name()}`);
});
```

Read in setup on purpose only when the value must never update. Use `untracked()` for it.

```ts
const Editor = component(function Editor(p: { initial: Read<string> }): Node {
  // a seed: the editor keeps its own state from here
  const text = signal(untracked(p.initial));
  return h.input({ 'aria-label': 'Text', ...bindValue(text) });
});
```

`untracked()` does not silence the warning. A computed that reads only through `untracked()` can never update. jasno reports this as `UNTRACKED_IN_DERIVATION`.

`jasno check` finds two common cases before the code runs. `SNAPSHOT_TO_ACCESSOR` reports `hint: text()` where a `MaybeRead` prop expected `text`. `SIGNAL_IN_TEMPLATE` reports a signal that is not called inside a template literal, such as `${count}`. That code would print the function.

## Timing

A write is visible at once. After `s.set(v)` returns, `s()` is `v`. Every computed that depends on `s` is consistent on its next read.

jasno updates its own outputs later. These are DOM bindings, effects, the `item` and `index` Reads of `each`, the value of `show`, and the router's `params` and `data`. They update together in one flush on the next microtask. `flush()` runs the flush now. Use it in tests, to measure layout, and inside `document.startViewTransition`.

```ts
const n = signal(0);
const label = h.span(null, n);
n.set(1);
// 1 "0": the signal reads back at once,
// the DOM updates in the next microtask
console.log(n(), label.textContent);
flush();
console.log(label.textContent); // "1"
```

There are two consequences. First, there is no `batch()`. Writes are already deferred, so several writes in one handler cause one flush. Second, a handler that writes and then needs the new value must read the source. The source is the signal or the list. Do not read a Read made by a builder, such as the `item` of a row. It stays old until the flush.

A flush runs in this order:

1. Bindings run in creation order. This includes rows and branches that were created in the same flush.
2. New effects, `onMount` callbacks and changed effects run. An effect sees the updated DOM, so it can measure it.

A flush that runs one effect or binding more than 100 times throws `EFFECT_LOOP`. The error names the ones that ran most. `flush()` inside a computed or a component body throws `FLUSH_REENTRANT`.

## Effects

Use an effect to sync the outside world with signals. Examples are the document title, storage and a chart widget.

An effect runs in the first flush. It runs again after something it read changes. It runs after the DOM of that flush is updated. It can return a cleanup function. It also receives an `abortSignal`. The `abortSignal` aborts before the next run and when the effect is disposed.

```ts
const Title = component(function Title(p: { count: Read<number> }): Node {
  effect(() => { document.title = `${p.count()} items`; });
  onMount(({ abortSignal }) => {
    window.addEventListener(
      'resize',
      () => console.log(window.innerWidth),
      { signal: abortSignal },
    );
  });
  return h.p(null, p.count, ' items');
});
```

An effect never sets signals. `effect(() => total.set(items().length))` is a computed written as an effect. It runs one flush late. jasno reports it as `EFFECT_WRITES_STATE`. Use `computed` to derive. Use `linkedSignal` to reset.

The rule also covers callbacks that other code calls synchronously during the run. Take a presence source that emits its current state when you subscribe. It writes inside the effect. Put a subscription whose callback sets signals in `onMount`.

`onMount` runs once, after the nodes of the component are inserted. It is untracked. Use it also for window and document listeners, timers, focus and measuring. Writes in `onMount`, handlers, timers and promise callbacks are silent.

`jasno check` reports a fetch inside an effect as `ASYNC_IN_EFFECT`. Use a `resource` for async state. A `resource` aborts a stale request when its params change.

`jasno check` reports an effect that read no signal in its first run as `EFFECT_NO_DEPS`. Such an effect never runs again.

An effect has an owner. The owner is the component, branch or row that created it. The effect is disposed with its owner. An effect created in an event handler, or after an `await`, has no owner. It leaks. jasno reports it as `NO_OWNER`.

Some work lives as long as the app and outside any component, for example a session resource in `src/state.ts`. Use `createRoot` to give it an owner.

## Mistakes this catches

| Code | When |
|---|---|
| [`STRICT_READ_UNTRACKED`](/docs/diagnostics/STRICT_READ_UNTRACKED) | a signal read in setup, a snapshot that never updates |
| [`SNAPSHOT_TO_ACCESSOR`](/docs/diagnostics/SNAPSHOT_TO_ACCESSOR) | `hint: text()` where a `MaybeRead` prop expected `text` |
| [`SIGNAL_IN_TEMPLATE`](/docs/diagnostics/SIGNAL_IN_TEMPLATE) | an uncalled signal in a template literal |
| [`UNTRACKED_IN_DERIVATION`](/docs/diagnostics/UNTRACKED_IN_DERIVATION) | a computed that reads only through `untracked()` |
| [`WRITE_IN_DERIVATION`](/docs/diagnostics/WRITE_IN_DERIVATION) | a signal written inside a computed or a binding |
| [`WRITE_IN_SETUP`](/docs/diagnostics/WRITE_IN_SETUP) | setup writing a signal it did not create |
| [`EFFECT_WRITES_STATE`](/docs/diagnostics/EFFECT_WRITES_STATE) | an effect setting a signal, a computed in disguise |
| [`EFFECT_NO_DEPS`](/docs/diagnostics/EFFECT_NO_DEPS) | an effect whose first run read nothing |
| [`ASYNC_IN_EFFECT`](/docs/diagnostics/ASYNC_IN_EFFECT) | `fetch` or `.then` inside an effect |
| [`EFFECT_LOOP`](/docs/diagnostics/EFFECT_LOOP) | an effect or binding running more than 100 times in one flush |
| [`FLUSH_REENTRANT`](/docs/diagnostics/FLUSH_REENTRANT) | `flush()` inside a computed or setup |
| [`NO_OWNER`](/docs/diagnostics/NO_OWNER) | an effect, resource or component created in a handler or after `await` |
| [`OWNED_IN_DERIVATION`](/docs/diagnostics/OWNED_IN_DERIVATION) | an effect or component created inside a computed |
| [`LEAK_IN_SETUP`](/docs/diagnostics/LEAK_IN_SETUP) | a window listener or timer created in setup without cleanup |
