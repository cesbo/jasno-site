# Patterns

These are short, complete examples for tasks that no other page covers. Copy an example, then change the names.

## A modal dialog

Use the native `<dialog>`. Open it with `showModal()`. A form with `method: 'dialog'` closes it, and the value of the pressed button becomes the `returnValue`.

```ts
export const DeleteContact = component(function DeleteContact(p: { onDelete: () => Promise<void> }): Node {
  const dialog = h.dialog({
    'aria-labelledby': 'del-title',
    onclose: (e) => { if (e.currentTarget.returnValue === 'yes') return p.onDelete(); },
  },
    h.form({ method: 'dialog' },
      h.h2({ id: 'del-title' }, 'Delete this contact?'),
      h.button({ value: 'no', autofocus: true }, 'Cancel'),
      h.button({ value: 'yes' }, 'Delete'),
    ),
  );
  return h.div(null,
    h.button({ type: 'button', onclick: () => { dialog.returnValue = ''; dialog.showModal(); } }, 'Delete…'),
    dialog,
  );
});
```

Notice these details:

- A dialog needs an accessible name. Here `aria-labelledby` points to the heading.
- `autofocus` works inside a dialog that you open with `showModal()`. The Cancel button gets the focus.
- `close()` returns the focus to the element that opened the dialog.
- Firefox and WebKit keep the last `returnValue` when the user presses Escape. Reset it before each `showModal()`.
- Never use the `open` prop. It makes a non-modal dialog.

If the dialog lives in a branch, it opens and closes itself. Removing an open dialog fires no `close` event, and the focus is lost.

```ts
export const Confirm = component(function Confirm(): Node {
  const d = h.dialog({ 'aria-label': 'Confirm' }, h.form({ method: 'dialog' }, h.button(null, 'OK')));
  onMount(() => { d.showModal(); return () => d.close(); });
  return d;
});
```

## Inline edit

A title shows as a button. A click turns it into a field. Enter saves, Escape cancels, and leaving the field saves.

```ts
export const EditableTitle = component(function EditableTitle(p: {
  title: Read<string>;
  onRename: (title: string) => Promise<void>;
}): Node {
  const editing = signal(false);
  let refocus = false; // set on the Enter and Escape paths only, so tabbing away never pulls the focus back

  return show(editing, () => {
    const commit = (again: boolean): Promise<void> | undefined => {
      refocus = again;
      editing.set(false);
      const title = input.value.trim();
      if (title && title !== p.title()) return p.onRename(title);
      return undefined;
    };
    const input = h.input({
      value: untracked(p.title),
      'aria-label': 'Title',
      onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); refocus = true; editing.set(false); } },
      onblur: () => { if (editing()) void commit(false); }, // Chromium also fires blur when the field is removed
    });
    onMount(() => { input.focus(); input.select(); });
    return h.form({ onsubmit: (e) => { e.preventDefault(); return commit(true); } }, input);
  }, () => {
    const title = h.button({ type: 'button', onclick: () => editing.set(true) }, () => p.title());
    if (refocus) { refocus = false; onMount(() => title.focus()); }
    return title;
  });
});
```

Notice these details:

- Enter saves through a form. Implicit submission ignores IME composition, and it cannot activate the element that gets the focus next.
- The new element gets the focus in `onMount`, inside its own branch. Never focus it right after `set()`.
- `refocus` is a plain variable, not a signal. Only the Enter and Escape paths set it.
- The field starts from `untracked(p.title)`. The editor keeps its own draft from then on.

## Debounce a search

Wait in the loader before the request. A new value of `params` aborts the wait, and an abort never becomes an error.

<!-- ts: declare function search(q: string, signal: AbortSignal): Promise<readonly string[]>; -->

```ts
const delay = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); });
});

export const Results = component(function Results(p: { query: Read<string> }): Node {
  const results = resource({
    params: () => p.query() || undefined, // an empty query is idle
    loader: async ({ params, abortSignal }) => {
      await delay(300, abortSignal);
      return search(params, abortSignal);
    },
  });
  return h.ul(null, each(() => (results.hasValue() ? results.value() : []), {
    key: (r) => r,
    render: (r) => h.li(null, r),
  }));
});
```

## Poll for data

`reload()` aborts a load that is in flight. Schedule the next reload after the last one has finished. When the tab becomes visible again, reload at once.

<!-- ts: declare const metrics: Resource<readonly number[]>; -->

```ts
export const Metrics = component(function Metrics(): Node {
  const visible = signal(!document.hidden);

  onMount(({ abortSignal }) => document.addEventListener('visibilitychange', () => {
    visible.set(!document.hidden);
    if (!document.hidden && !metrics.isLoading()) metrics.reload();
  }, { signal: abortSignal }));

  effect(() => {
    if (!visible() || metrics.isLoading()) return;
    const timer = setTimeout(() => metrics.reload(), 5000);
    return () => clearTimeout(timer);
  });

  return h.p(null, () => (metrics.hasValue() ? metrics.value().join(', ') : 'Loading'));
});
```

The effect reads `isLoading()`. It runs again when a load finishes, and it starts the timer for the next one. The listener is in `onMount`, because its callback sets a signal.

## Save changes at once, and undo a failure

This pattern changes the value on screen before the save finishes. The saves of one record run one after another. This is correct when the server may apply requests in a different order.

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

## A widget from a library

Create the widget in `onMount`, update it in an effect, and destroy it in the cleanup.

<!-- ts: declare function makeChart(el: HTMLElement): { update(data: readonly number[]): void; destroy(): void }; -->

```ts
export const Chart = component(function Chart(p: { data: Read<readonly number[]> }): Node {
  const el = h.div({ class: 'chart' });
  onMount(() => {
    const chart = makeChart(el);
    effect(() => chart.update(p.data()));
    return () => chart.destroy();
  });
  return el;
});
```

The effect belongs to the component, because `onMount` runs with the component as the owner. jasno disposes the effect and calls the cleanup when the component leaves the page.
