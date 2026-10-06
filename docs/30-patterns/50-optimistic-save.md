# Optimistic save

This pattern changes the value on screen before the save finishes, and it undoes the change when the save fails. The saves of one record run one after another.

The queue is correct when the server may apply requests in a different order.

<!-- ts:
declare function saveTitle(id: string, title: string, signal: AbortSignal): Promise<void>;
declare function toast(message: string): void;
interface Card { readonly id: string; readonly title: string }
declare const cards: Resource<readonly Card[]>;
-->

```ts
const confirmed = new Map<string, string>(); // the last title that the server accepted, while saves are queued
const queue = new Map<string, Promise<void>>(); // the last queued save of each card

export function rename(id: string, title: string): Promise<void> {
  if (!cards.hasValue()) return Promise.resolve();
  const display = (to: string) => {
    if (cards.hasValue()) cards.set(cards.value().map((c) => (c.id === id ? { ...c, title: to } : c)));
  };
  if (!confirmed.has(id)) confirmed.set(id, cards.value().find((c) => c.id === id)?.title ?? title);
  display(title);

  const run: Promise<void> = (queue.get(id) ?? Promise.resolve()).then(async () => {
    const last = () => queue.get(id) === run;
    try {
      await saveTitle(id, title, AbortSignal.timeout(10_000));
      confirmed.set(id, title);
      if (last()) display(title);
    } catch {
      if (last()) {
        display(confirmed.get(id) ?? title);
        toast('Not saved; your change was undone');
      }
    } finally {
      if (last()) { queue.delete(id); confirmed.delete(id); }
    }
  });
  queue.set(id, run);
  return run;
}
```

Notice these details:

- `set()` runs before the `await`, so the screen changes at once.
- When the last queued save fails, show the last value that the server accepted. Do not show the value from before this save, because an earlier save may still be unconfirmed.
- When an earlier save fails, nothing changes. A newer value is still on its way.
- When the last save succeeds, show its value again. A `reload()` may have replaced it meanwhile.
- Never call `reload()` after an optimistic save. A reload that fails clears the value.
- Give each request a timeout.
- `confirmed` and `queue` are plain module variables. The test helpers do not reset them, so a test must wait for every rename that it starts.
