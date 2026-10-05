# Control flow

A function child is always text. To show or hide nodes, to switch between nodes, or to render a list, use `show`, `match` or `each`. To catch errors, use `catchError`.

## show

`show(when, then, otherwise?)` renders `then` while `when()` is truthy. Otherwise it renders `otherwise`, or nothing.

```ts
export const Details = component(function Details(p: { open: Read<boolean>; text: Read<string> }): Node {
  return show(p.open, () => h.p(null, p.text), () => h.p(null, 'Closed'));
});
```

jasno builds a branch when the page starts, and again each time the truthiness of `when()` changes. It never rebuilds a branch at any other time.

`then` receives the latest truthy value of `when()` as a `Read`. TypeScript narrows its type, so there is no `null` check.

<!-- ts: declare const user: Read<{ name: string } | null>; -->

```ts
const greeting = show(user, (u) => h.p(null, () => `Hello, ${u().name}`), () => h.p(null, 'Signed out'));
```

Everything created in a branch lives only as long as the branch. When the condition flips, jasno disposes the branch: its signals, its resources and its `onMount` work. State that must survive a flip lives in a parent.

The callbacks of `show` run untracked. Read signals only inside the functions that you give to jasno, as the [reactivity](/docs/api/reactivity) page explains.

A branch must create its own nodes. If it returns a node that you created outside it, jasno reports `NODE_OUTSIDE_REGION`. To keep an element and its state while it is closed, leave it mounted and toggle it: `h.section({ hidden: () => !open() }, ...)`.

## match

`match(key, render)` renders one branch for each value of `key()`. When the key changes, jasno disposes the current branch and builds the next one.

```ts
const tab = signal<'info' | 'log'>('info');
const panel = match(tab, (key) => (key === 'info' ? h.p(null, 'Info') : h.p(null, 'Log')));
```

A key is a primitive or a component. jasno compares keys with `Object.is`. Do not use an object as a key: a new object from every refetch rebuilds the branch each time.

`render` must return something for every key. Its return type excludes `null`, `undefined` and booleans, so a missing case is a type error and not an empty region.

## each

`each(list, { key, render })` renders a list. `key` returns a stable id for an item. `render` builds one row.

```ts
export interface Todo { readonly id: number; readonly text: string }

export const TodoList = component(function TodoList(p: { todos: Read<readonly Todo[]> }): Node {
  return h.ul(null, each(p.todos, {
    key: (t) => t.id,
    render: (todo, index) => h.li(null, () => `${index() + 1}. ${todo().text}`),
  }));
});
```

`render` runs once for each key. It receives `item` and `index` as `Read`s, and the key as a plain value. Read `item()` inside a function, not in the body of `render`.

A row lives while its key is in the list. If the same key comes with a new object, jasno updates the row in place. If the key leaves the list, jasno disposes the row. A filter or a page change also removes the keys that it hides. State that must survive lives in the item or in a parent.

When the order changes, jasno moves the rows. In browsers that have `Element.moveBefore`, a moved row keeps its focus, its playing media and its open dialogs. In other browsers, jasno moves the row with `insertBefore` and focuses it again.

Choose the key with care:

- Derive the key from the item: `(t) => t.id`. Do not use `Math.random()`, a counter or `Date.now()`. A key that differs between two calls is reported as `UNSTABLE_KEY`.
- Keys must be unique. When two items have the same key, only the first keeps its row. jasno reports `DUPLICATE_KEY`. Remove duplicates by id when you merge lists from several sources.
- The index is a stable key, but then a row belongs to a position, not to an item. After a removal, the rows show different items.

Do not use `.map` in a function child to make a list. The type error names `each()`.

## catchError

`catchError(tryFn, fallback)` shows `tryFn()`. If `tryFn`, or anything under it, throws, jasno disposes that part and renders `fallback(error, reset)` in its place. `reset()` runs `tryFn` again from scratch.

```ts
export const Chart = component(function Chart(): Node {
  return h.div({ class: 'chart' });
});

export const ErrorPanel = component(function ErrorPanel(p: { reset: () => void }): Node {
  return h.div({ role: 'alert' },
    h.p(null, 'The chart failed.'),
    h.button({ onclick: p.reset }, 'Retry'),
  );
});

const safe = catchError(() => Chart(), (_error, reset) => ErrorPanel({ reset }));
```

The boundary catches errors from setup, bindings, effects, `onMount`, cleanups and resources. It does not catch errors from event handlers. They propagate like any DOM listener error.

The fallback must render something. Its return type excludes `null` and `undefined`. An error in the fallback goes to the next boundary up.

Without a boundary, jasno reports the error with `reportError`. In a test, such an error fails the test as `UNCAUGHT_ERROR`. The router outlet is a boundary too.

## Focus

When a swap removes the focused element, the keyboard user loses their place. jasno handles some cases and reports the others.

- **`catchError`.** If the swapped part held the focus, jasno moves focus to the first focusable element of the new content. If there is none, it focuses the first element, with `tabindex="-1"`. Content that is only text cannot take focus. jasno then reports `FOCUS_LOST` and tells you to wrap the text in an element.
- **`each`.** Moving a row keeps the focus, as described above.
- **Everything else.** Removing, disabling or hiding the focused element is reported as `FOCUS_LOST` if nothing moved the focus by the end of the task.

You decide where focus goes, before the change. For example, focus a heading before you delete a row.

```ts
export interface Task { readonly id: number; readonly text: string }

export const Tasks = component(function Tasks(p: { tasks: Read<readonly Task[]>; onRemove: (id: number) => void }): Node {
  const heading = h.h2({ tabIndex: -1 }, 'Tasks');
  return h.section(null, heading, h.ul(null, each(p.tasks, {
    key: (t) => t.id,
    render: (task) => h.li(null,
      h.span(null, () => task().text),
      h.button({
        'aria-label': () => `Remove ${task().text}`,
        onclick: () => { heading.focus(); p.onRemove(task().id); },
      }, 'Remove'),
    ),
  })));
});
```

Each row control has its own name, so a screen reader can tell the rows apart.

## Mistakes this catches

| Code | When |
|---|---|
| [`NODE_OUTSIDE_REGION`](/docs/diagnostics/NODE_OUTSIDE_REGION) | a branch or a row returns a node that was created outside it |
| [`UNSTABLE_KEY`](/docs/diagnostics/UNSTABLE_KEY) | the key function returns different keys for the same item |
| [`DUPLICATE_KEY`](/docs/diagnostics/DUPLICATE_KEY) | two items of a list have the same key |
| [`FOCUS_LOST`](/docs/diagnostics/FOCUS_LOST) | an update removes, disables or hides the focused element |
| [`UNCAUGHT_ERROR`](/docs/diagnostics/UNCAUGHT_ERROR) | an error that no `catchError` caught, in a test |
