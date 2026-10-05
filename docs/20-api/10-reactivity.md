# Reactivity

State in jasno is a signal: a function that returns the current value. Pass the function and the place you pass it to stays live; call it and you get a snapshot. Everything else on this page, derived values, effects, scheduling, follows from that one rule.

## The rule

A function is live, anything else is static. `h.p(null, count)` updates when `count` changes; `h.p(null, count())` renders the number once and never again. Signals are functions, so passing `count` is the live form and `count()` the snapshot. There is no second rule: no heuristics, no auto-unwrapping, no compiler.

```ts
const count = signal(0);
const doubled = computed(() => count() * 2);
const live = h.p(null, 'Count: ', count, ', doubled: ', doubled);
const snapshot = h.p(null, `Count: ${count()}`); // renders "Count: 0" and never changes
```

The types carry the rule. A live input is a `Read<T>`: a zero-argument function returning `T`. `items.length` on a `Read<readonly Item[]>` is a type error with the hint "call it first: items().length", so a forgotten call does not compile. A prop that is usually a constant and now and then live, a label or a hint, is typed `MaybeRead<T>`: callers pass `'Default'` or `() => text()`, and element props and children take either.

Names from other frameworks are rejected at the type level with a pointer to the jasno form: `createSignal`, `useState`, `createMemo`, `useEffect`, `batch` and the rest exist only as stubs whose type is the error message.

## Signals

`signal(initial)` creates writable state. Call it to read, `set(value)` to write, `update(fn)` to write `fn(current)`. `set` and `update` are bound, so `onclick: count.update` would work; write `() => count.update((n) => n + 1)` anyway, a signal itself is not a handler.

```ts
const items = signal<string[]>([]);
items.update((list) => [...list, 'new']); // replace the array
const price = signal(1.5, { equal: (a, b) => Math.abs(a - b) < 0.001, debugName: 'price' });
```

Equality is `Object.is`: a write with an equal value is a no-op and nothing is scheduled. The `equal` option replaces it for one signal; `equal: () => false` always notifies.

Mutation is invisible to jasno. `users().push(u); users.set(users())` would be a silent no-op under `Object.is`, so arrays, tuples, `Map` and `Set` read back readonly: `items().push('new')` is a type error, and the habit from Vue or Svelte of mutating in place does not compile. Replace the value instead. Other object types are left alone, because `Readonly<T>` on a DOM element or a class instance would produce false errors. Generic code that stores a type parameter writes `signal<T, T>(initial)` to opt out.

## Derived values

`computed(fn)` is a lazy, cached derivation. It recomputes only when read after a source changed, and while something observes it, its consumers run at most once per round even when several sources change. It must be pure and synchronous: a write inside throws `WRITE_IN_DERIVATION` in both builds, and an async function is a type error.

A computed that nothing observes recomputes on every read and keeps no links, so one created in a handler is garbage once unreferenced.

State that resets when an input changes is a `linkedSignal`, not an effect that copies: a draft that clears when the user changes, a selection that resets when the list reloads. It is writable until its source produces a new value, compared with `Object.is`.

```ts
const Draft = component(function Draft(p: { userId: Read<string> }): Node {
  const text = linkedSignal({ source: p.userId, computation: () => '' }); // resets per user, writable until then
  return h.textarea({ 'aria-label': 'Note', ...bindValue(text) });
});
```

The object form is deliberate. A shorthand `linkedSignal(() => { p.userId(); return ''; })` would reset on any change of anything the function reads, an inline `() => user().id` would wipe the draft on every refetch, and the dependency line looks dead and gets deleted. `source` names the dependency; `computation(source, previous)` receives the old source and value for merges, such as keeping edits across a save echo. Annotate the return type when the computation reads `previous`.

For selection in lists there is `selector(source)`: `const isSelected = selector(selectedId)` gives a row's `() => isSelected(item().id)` that re-runs only when its own answer flips, O(1) per write instead of one re-run per row.

## Reading in setup

A component body runs once, untracked. So do the callbacks of `show`, `match`, `each` and `catchError`. A signal read there is a snapshot taken at creation, and in development it is reported as `STRICT_READ_UNTRACKED` with the component, the signal and the line. The fix is to read inside a function you hand to jasno:

```ts
const Greeting = component(function Greeting(p: { name: Read<string> }): Node {
  return h.p(null, () => `Hello, ${p.name()}`); // live; `Hello, ${p.name()}` outside the function would be a snapshot
});
```

Only a value that must never update is read in setup on purpose, through `untracked()`:

```ts
const Editor = component(function Editor(p: { initial: Read<string> }): Node {
  const text = signal(untracked(p.initial)); // a seed: the editor keeps its own state from here
  return h.input({ 'aria-label': 'Text', ...bindValue(text) });
});
```

`untracked()` is not a way to silence the warning: a derivation that reads only through it can never update, and that is reported too, as `UNTRACKED_IN_DERIVATION`. `jasno check` catches the common case before the code runs: `SNAPSHOT_TO_ACCESSOR` reports `hint: text()` where a `MaybeRead` prop expected `text`, and `SIGNAL_IN_TEMPLATE` reports a signal interpolated uncalled, `${count}`, which would print the function.

## Timing

Writes are visible at once: after `s.set(v)` returns, `s()` is `v` and every computed depending on it is consistent on its next read. What waits is everything jasno drives: DOM bindings, effects, the `item` and `index` Reads of `each`, the value of `show`, the router's `params` and `data`. They update in one flush on the next microtask. `flush()` runs it now, for tests, for measuring layout, and inside `document.startViewTransition`.

```ts
const n = signal(0);
const label = h.span(null, n);
n.set(1);
console.log(n(), label.textContent); // 1 "0": the signal reads back at once, the DOM updates in the next microtask
flush();
console.log(label.textContent); // "1"
```

Two consequences. There is no `batch()`: writes are already deferred, and several writes in one handler produce one flush. And in a handler that writes and then needs the new value, read the source, the signal or the list, not a builder Read such as a row's `item`, which lags until the flush.

The flush has an order. Bindings run first, in creation order, including rows and branches created during the same flush; then new effects, `onMount` callbacks and dirty effects, so an effect sees the updated DOM and may measure it. A consumer that runs more than 100 times in one flush throws `EFFECT_LOOP` naming the consumers that ran most. `flush()` inside a derivation or a component body throws `FLUSH_REENTRANT`.

## Effects

An effect syncs the outside world with signals: the document title, storage, a chart widget. It runs in the first flush, then after what it read changes, after the DOM of that round is updated. It returns a cleanup, or uses the `abortSignal` it is given, which aborts before the next run and on disposal.

```ts
const Title = component(function Title(p: { count: Read<number> }): Node {
  effect(() => { document.title = `${p.count()} items`; });
  onMount(({ abortSignal }) => {
    window.addEventListener('resize', () => console.log(window.innerWidth), { signal: abortSignal });
  });
  return h.p(null, p.count, ' items');
});
```

An effect never sets signals. `effect(() => total.set(items().length))` is a derivation written as an effect; it runs a round late and the report is `EFFECT_WRITES_STATE`. Derive with `computed`, reset with `linkedSignal`. The rule includes callbacks that other code calls synchronously during the run: a presence source that emits its current state on subscribe writes inside the effect. Subscriptions whose callbacks set signals belong in `onMount`, which runs once after the component's nodes are inserted, untracked, and is also the place for window and document listeners, timers, focus and measuring. Writes in `onMount`, handlers, timers and promise callbacks are silent.

Fetching in an effect is reported by `jasno check` as `ASYNC_IN_EFFECT`: async state is a `resource`, which aborts a stale request when its params change. An effect whose first run read no signal is reported as `EFFECT_NO_DEPS`: it would never run again.

Effects belong to an owner, the component, branch or row that created them, and are disposed with it. One created in an event handler or after an `await` has no owner, leaks, and is reported as `NO_OWNER`. Work that lives as long as the app and outside any component, a session resource in `src/state.ts`, gets its owner from `createRoot`.

## Mistakes this catches

| Code | When |
|---|---|
| [`STRICT_READ_UNTRACKED`](/docs/diagnostics/STRICT_READ_UNTRACKED) | a signal read in setup, a snapshot that never updates |
| [`SNAPSHOT_TO_ACCESSOR`](/docs/diagnostics/SNAPSHOT_TO_ACCESSOR) | `hint: text()` where a `MaybeRead` prop expected `text` |
| [`SIGNAL_IN_TEMPLATE`](/docs/diagnostics/SIGNAL_IN_TEMPLATE) | an uncalled signal in a template literal |
| [`UNTRACKED_IN_DERIVATION`](/docs/diagnostics/UNTRACKED_IN_DERIVATION) | a derivation that reads only through `untracked()` |
| [`WRITE_IN_DERIVATION`](/docs/diagnostics/WRITE_IN_DERIVATION) | a signal written inside a computed or a binding |
| [`WRITE_IN_SETUP`](/docs/diagnostics/WRITE_IN_SETUP) | setup writing a signal it did not create |
| [`EFFECT_WRITES_STATE`](/docs/diagnostics/EFFECT_WRITES_STATE) | an effect setting a signal, a derivation in disguise |
| [`EFFECT_NO_DEPS`](/docs/diagnostics/EFFECT_NO_DEPS) | an effect whose first run read nothing |
| [`ASYNC_IN_EFFECT`](/docs/diagnostics/ASYNC_IN_EFFECT) | `fetch` or `.then` inside an effect |
| [`EFFECT_LOOP`](/docs/diagnostics/EFFECT_LOOP) | a consumer running more than 100 times in one flush |
| [`FLUSH_REENTRANT`](/docs/diagnostics/FLUSH_REENTRANT) | `flush()` inside a derivation or setup |
| [`NO_OWNER`](/docs/diagnostics/NO_OWNER) | an effect, resource or component created in a handler or after `await` |
| [`OWNED_IN_DERIVATION`](/docs/diagnostics/OWNED_IN_DERIVATION) | an effect or component created inside a computed |
| [`LEAK_IN_SETUP`](/docs/diagnostics/LEAK_IN_SETUP) | a window listener or timer created in setup without cleanup |
