# Optimistic save

This pattern changes the value on screen before the save finishes. When the save fails, the screen shows the value that the server accepted.

`optimistic()` does this for a resource.

<!-- ts:
declare function saveTitle(id: string, title: string, signal: AbortSignal): Promise<void>;
declare function toast(message: string): void;
interface Card { readonly id: string; readonly title: string }
declare const cards: Resource<readonly Card[]>;
-->

```ts
const save = optimistic(cards, {
  get: (list, id: string) => list.find((c) => c.id === id)?.title,
  put: (list, id, title) =>
    list.map((c) => (c.id === id ? { ...c, title } : c)),
  send: (id, title, abortSignal) => saveTitle(id, title, abortSignal),
});

export async function rename(id: string, title: string): Promise<void> {
  const result = await save(id, title);
  if (result === 'undone') toast('Not saved; your change was undone');
}
```

`optimistic(resource, options)` returns a save function. It takes three functions:

- `get` reads the field of one record from the resource value. It returns `undefined` when the record is not there.
- `put` returns a new resource value with the field set.
- `send` makes the request. Its `abortSignal` times out after 10 seconds. The `timeout` option changes the time.

The key names the record on the server. `send` gets only the key and the value.

## What save does

`save(key, value)` shows the value at once, and then it sends the value. The saves of one key run one after another. So the order stays correct, even when the server may apply requests in a different order.

The promise never rejects. It resolves one of three values:

- `'saved'`: the server accepted the value.
- `'undone'`: the save failed. The screen shows the last value that the server accepted. Tell the user.
- `'superseded'`: the save failed, but a newer save of the same key is queued. Nothing changes.

`save()` also resolves `'undone'` when the resource has no value. It then sends nothing.

## Details

- When the last save succeeds, the screen shows its value again. A `reload()` may have replaced it meanwhile.
- A save never writes into the resource after its params changed. A value that the new params loaded during the save can be older than the save.
- Never call `reload()` after a save. A reload that fails clears the value.
- `settled()` in a test waits for every queued save, also for a save that the handler did not return.
- The queue is module state. The test helpers do not reset it, so a test must wait for every save that it starts.
