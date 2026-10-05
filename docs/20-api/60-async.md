# Async

`resource()` loads async data and gives you its state as signals. New params abort the old request, and jasno drops results that arrive too late.

## Load data

A resource has two functions. `params` is synchronous and tracked: it returns the input of the request. `loader` is async: it gets the params and an `abortSignal`, and returns a promise.

<!-- ts: declare function getUser(id: string, signal: AbortSignal): Promise<{ name: string }>; -->

```ts
export const UserCard = component(function UserCard(p: { id: Read<string> }): Node {
  const user = resource({
    params: () => p.id(),
    loader: ({ params, abortSignal }) => getUser(params, abortSignal),
  });
  return show(
    () => user.hasValue() && user.value(),
    (u) => h.h2(null, () => u().name),
    () => h.p({ role: 'status' }, 'Loading'),
  );
});
```

Follow these rules:

- **Read signals in `params`, not in the loader.** The loader is untracked. A signal that you read there never starts a new request, and jasno reports `LOADER_READ_UNTRACKED`.
- **Pass `abortSignal` to `fetch`.** It aborts when the params change, when `reload()` or `set()` replaces the request, and when the owner is disposed.
- **Resolve `null` for "no data".** A loader that resolves `undefined` is a type error. Such a resource would show "Loading" forever.
- **Without `params`, the resource loads once.** If `params()` returns `undefined`, the resource is idle and does not load.

## State

`status()` is one of six values.

| Status | Meaning |
|---|---|
| `idle` | `params()` is `undefined`. Nothing loads. |
| `loading` | A request runs, and there is no value yet. |
| `reloading` | A request runs after `reload()`, and the old value is still there. |
| `resolved` | The request finished, and `value()` has the result. |
| `error` | The request failed. `error()` has the reason. |
| `local` | `set()` wrote the value. |

Use the other members like this:

- **`hasValue()`** is true when `value()` has a value. Gate your content on it, and never write `value()!`. It also narrows the type of `value()`.
- **`isLoading()`** is true in `loading` and `reloading`. Use it for spinners.
- **`error()`** is the reason in `error`, otherwise `undefined`. Use `status() === 'error'` to show an error.
- **`value()`** throws the loader's error in `error`. Read it in setup while the resource is idle or loading, and jasno throws `PENDING_READ_UNTRACKED`. Read it inside a function instead.

<!-- ts: declare const user: Resource<{ name: string }>; -->

```ts
const message = h.p({ role: 'alert' }, () => (user.status() === 'error' ? 'Could not load the user.' : ''));
```

### latest

`latest()` never throws. It returns the last value that the current params held, even if that value is old. After a failed load, `value()` throws, but `latest()` still has the old value. Show the error next to it.

<!-- ts: declare const metrics: Resource<readonly string[]>; -->

```ts
const board = h.section(null,
  h.p({ role: 'alert' }, () => (metrics.status() === 'error' ? 'Could not refresh.' : '')),
  show(() => metrics.latest(), (m) => h.p(null, () => m().join(', ')), () => h.p(null, 'Loading')),
);
```

Use `latest()` only where old data is still useful, such as a list or a chart. A price or a balance that someone acts on must use `value()`.

After a params change, `latest()` is `undefined` until the new value arrives. It never shows the value of other params.

## New params

When `params()` returns a new value, jasno aborts the current request, clears the value and starts a new request. A result counts only if its request is still the current one. A late result of an old request is dropped.

jasno compares params with `Object.is`. Plain objects and arrays are compared one level deep. An inline object such as `{ q: q(), page: page() }` does not start a request when an unrelated signal changes.

## reload and set

`reload()` fetches the current params again. It keeps the value and sets the status to `reloading`. It aborts a request that is in flight. It does nothing while the resource is idle.

If a reload fails, `value()` is gone and the status is `error`. `latest()` keeps the old value.

`set(value)` replaces the value now and sets the status to `local`. It also aborts a request that is in flight.

After an `await`, the params may have changed. Capture the params before the `await`, and write only if they are still the same. A view stays mounted when only its params change.

<!-- ts: declare function addNote(id: string, text: string): Promise<void>; declare const notes: Resource<readonly string[]>; declare const id: Read<string>; -->

```ts
async function add(text: string): Promise<void> {
  const current = id();
  await addNote(current, text);
  if (id() === current) notes.reload(); // reload() fetches the current params
}
```

For an optimistic save, call `set()` before the `await`. If the save fails, undo it with `set()`. Never undo it with `reload()`: a reload that fails clears the value. Never call `reload()` after an optimistic save for the same reason.

<!-- ts: declare function saveTodo(todo: Todo): Promise<void>; declare const todos: Resource<readonly Todo[]>; interface Todo { readonly id: number; readonly done: boolean } -->

```ts
async function toggle(todo: Todo): Promise<void> {
  if (!todos.hasValue()) return;
  const before = todos.value();
  const next = { ...todo, done: !todo.done };
  todos.set(before.map((t) => (t.id === todo.id ? next : t)));
  try {
    await saveTodo(next);
  } catch {
    todos.set(before);
  }
}
```

This form is correct for one save at a time. Overlapping saves of one record need a queue, and that pattern belongs to the recipes.

If you call `set()` while the status is `loading`, the value probably belongs to old params. jasno reports `RESOURCE_SET_WHILE_LOADING`.

## Errors

A rejection of the loader gives the status `error`. jasno ignores a rejection only if the request is no longer current, or if jasno aborted it. A timeout that the loader makes itself, such as `AbortSignal.timeout(10_000)`, becomes an `error`.

To react to a failed load, for example to show a message, use `try`/`catch` in the loader, and throw the error again. Do not watch `status()` in an effect.

## Owner

A resource belongs to the component, branch or row that created it. When that owner is disposed, jasno aborts the current request and ignores later results.

Create resources in setup. A resource that you create in an event handler, or after an `await`, has no owner and jasno reports `NO_OWNER`. Data that lives as long as the app is a resource inside `createRoot`, for example in `src/state.ts`.

Do not fetch in an effect. An effect runs again when a signal changes, so a late answer for old input can overwrite the answer for new input. `jasno check` reports `ASYNC_IN_EFFECT`.

## Mistakes this catches

| Code | When |
|---|---|
| [`LOADER_READ_UNTRACKED`](/docs/diagnostics/LOADER_READ_UNTRACKED) | a signal is read in the loader, so a change does not reload |
| [`PENDING_READ_UNTRACKED`](/docs/diagnostics/PENDING_READ_UNTRACKED) | `value()` is read in setup while the resource is idle or loading |
| [`RESOURCE_SET_WHILE_LOADING`](/docs/diagnostics/RESOURCE_SET_WHILE_LOADING) | `set()` is called while the resource loads |
| [`ASYNC_IN_EFFECT`](/docs/diagnostics/ASYNC_IN_EFFECT) | `fetch`, `.then` or an async function runs inside an effect |
| [`NO_OWNER`](/docs/diagnostics/NO_OWNER) | a resource is created in a handler or after `await` |
