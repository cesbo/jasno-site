# Elements and events

`h.tag(props, ...children)` creates a real DOM element and returns it. Props are typed, and a function value is live. Events are the lowercase DOM names, such as `onclick`.

## Elements

There is one function for each HTML tag: `h.div`, `h.button`, `h.input`. The first argument is the props object, or `null` if the element has no props. The other arguments are children.

```ts
const name = signal('Ada');
const card = h.section({ class: 'card' },
  h.h2(null, 'Profile'),
  h.p(null, 'Name: ', name),
);
```

The result is the real element. Keep it in a `const` when you need it later. jasno has no refs. A component can focus an element because it holds the element.

```ts
const Search = component(function Search(): Node {
  const field = h.input({ type: 'search', 'aria-label': 'Search' });
  onMount(() => field.focus());
  return h.form(null, field);
});
```

There is only one way to write an element. There is no `h('div')`, no JSX and no template string. TypeScript checks the whole call without a build step. A mistyped tag such as `h.buton` gets a "Did you mean" suggestion.

## Props

Props are the DOM properties of the element, plus `aria-*` and `data-*`. The set is closed. It comes from `lib.dom`, so a typo is a type error. `'aria-lable'` does not compile.

A function value is live. Any other value is set once. This is the rule from the [reactivity](/docs/api/reactivity) page.

```ts
const expanded = signal(false);
const toggle = h.button({
  'aria-expanded': expanded,
  'data-id': 7,
  title: () => (expanded() ? 'Close the menu' : undefined),
  onclick: () => expanded.update((v) => !v),
}, 'Menu');
```

A live prop can return `undefined`. The element then goes back to its state at creation. An attribute that the element did not have at creation is removed. For this reason a link never gets `href=""`.

`aria-*` keys are a closed set of 51 names. A boolean value becomes the text `'true'` or `'false'`. `data-*` keys are open.

For an HTML attribute that has a different DOM name, use the DOM name: `htmlFor`, not `for`.

### class and style

`class` is a string, or an object. Each key of the object is a class name. The value is a `Read<boolean>` that switches the class.

`style` is an object. Its keys are camelCase CSS properties and `--custom` properties. Each value is a string or a function. Numbers are a type error: write `'12px'`.

```ts
const busy = signal(false);
const gap = signal('4px');
const box = h.div({
  class: { busy, quiet: () => !busy() },
  style: { marginTop: '4px', '--gap': gap },
}, 'Content');
```

### Elements without children

Void elements (`area`, `br`, `col`, `hr`, `img`, `input`, `source`, `track`, `wbr`) and `textarea` take no children. `h.input(null, 'Remember me')` is a type error. Use `h.label(null, 'Remember me', h.input(...))`, and set the value of a `textarea` through its `value` prop.

## Children

A child can be one of these:

- A string, a number or a bigint becomes a text node.
- `null`, `undefined` and booleans render nothing.
- A node is appended. A `DocumentFragment` appends its own children.
- An array is flattened in order.
- A function is live text.

```ts
const count = signal(0);
const line = h.p(null, 'Clicks: ', count, ' (', () => count() * 2, ' doubled)');
```

A function child is always text. A function that returns a node is a type error, and at run time it throws `NODE_IN_TEXT_BINDING`. To switch between nodes, use `show()` or `match()`. To render a list, use `each()`.

A node lives in one place. If you append a node that already has a parent, jasno moves it and reports `NODE_MOVED`. Create the node where you use it. To use the same markup twice, write a function that returns a new node.

## Events

An event prop starts with `on` and uses the lowercase DOM name: `onclick`, `oninput`, `onsubmit`, `onkeydown`. React names such as `onClick` are reported as `UNKNOWN_PROP`, and the message gives the right name.

An event handler is never live. jasno adds it once with `addEventListener`. The handler runs untracked.

`e.currentTarget` has the type of the element, so no null check is needed.

```ts
const q = signal('');
const field = h.input({
  'aria-label': 'Search',
  oninput: (e) => q.set(e.currentTarget.value),
});
```

After an `await`, the browser sets `currentTarget` to `null`. Copy it to a `const` before the first `await`. `jasno check` reports a later read as `CURRENT_TARGET_AFTER_AWAIT`.

```ts
const copy = h.button({
  'data-text': 'jasno',
  onclick: async (e) => {
    const button = e.currentTarget; // copy it: after the await it is null
    await navigator.clipboard.writeText(button.dataset['text'] ?? '');
    button.textContent = 'Copied';
  },
}, 'Copy');
```

A signal is not a handler. `onclick: count` is a type error, and the message says to write `() => count.set(...)`.

### Forms and the Enter key

Handle a form with `onsubmit`. Call `e.preventDefault()` first. Without it the browser navigates, and jasno reports `SUBMIT_NOT_PREVENTED`.

<!-- ts: declare function save(): void; -->

```ts
const form = h.form({ onsubmit: (e) => { e.preventDefault(); save(); } },
  h.input({ 'aria-label': 'Name' }),
  h.button({ type: 'submit' }, 'Save'),
);
```

A form also handles the Enter key. Suppose you handle Enter in `onkeydown` yourself, and focus moves to a button or a field. Chromium then activates that new element with the same key press. jasno reports this as `KEY_ACTIVATES_NEW_FOCUS`. Call `e.preventDefault()` in that branch, or use a form.

## Accessible names

After each flush, jasno checks the new interactive elements. A button, a link, an input, a select, a textarea, a dialog, a meter or a progress element needs an accessible name. Use text, `aria-label`, `aria-labelledby` or a wrapping `h.label`. An element without a name is reported as `INTERACTIVE_NO_NAME`.

## SVG

`svg.*` works like `h.*`: `svg.tag(attributes | null, ...children)`. The elements are created in the SVG namespace. Attributes are an open record, and a function value is live.

```ts
const icon = svg.svg({ viewBox: '0 0 24 24', 'aria-hidden': 'true' },
  svg.path({ d: 'M4 12h16' }),
);
```

SVG has its own object because some names, such as `a`, `title` and `style`, exist in both HTML and SVG. Use `svg.*` for icons and charts. The production CSP blocks `innerHTML`, so there is no other way to insert SVG markup.

## Styles

`class` and `style` are props of the element. For global style sheets, `css` and Tailwind, see the [styling](/docs/api/styling) page.

## Mistakes this catches

| Code | When |
|---|---|
| [`UNKNOWN_PROP`](/docs/diagnostics/UNKNOWN_PROP) | a prop that the element does not have, such as `onClick`, `className`, `for` or `ref` |
| [`NODE_IN_TEXT_BINDING`](/docs/diagnostics/NODE_IN_TEXT_BINDING) | a function child that returns a node |
| [`NODE_MOVED`](/docs/diagnostics/NODE_MOVED) | a node that already has a parent is appended somewhere else |
| [`CURRENT_TARGET_AFTER_AWAIT`](/docs/diagnostics/CURRENT_TARGET_AFTER_AWAIT) | `e.currentTarget` is read after an `await` |
| [`SUBMIT_NOT_PREVENTED`](/docs/diagnostics/SUBMIT_NOT_PREVENTED) | an `onsubmit` handler does not call `preventDefault()` |
| [`KEY_ACTIVATES_NEW_FOCUS`](/docs/diagnostics/KEY_ACTIVATES_NEW_FOCUS) | an Enter handler moves focus to an element that Enter activates |
| [`INTERACTIVE_NO_NAME`](/docs/diagnostics/INTERACTIVE_NO_NAME) | an interactive element without an accessible name |
