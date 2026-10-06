# Accessibility

jasno treats focus and accessible names as a concern of the framework. It restores focus where it moves nodes, and it reports the places where it cannot know the right target. This page ties these rules together.

## What jasno does

- **The router moves focus** after a navigation. It focuses the first visible `[autofocus]` element, or the first `h1`, or `main`. It also announces the new page. See the [router](/docs/api/router) page.
- **`catchError` restores focus.** If the swapped part held the focus, the focus moves to the new content. See [control flow](/docs/api/control-flow).
- **`each` keeps focus when rows move.** Browsers with `moveBefore` keep it by themselves. In other browsers, jasno focuses the row again.
- **Props are a closed set.** A typo such as `'aria-lable'` is a type error.

jasno does not move focus automatically in every `show` or `match` swap. The right target depends on your app, and a wrong target is worse than a reported loss.

## What jasno reports

Each check below runs in the development build, except the last one. A warning fails a test, and the Playwright hook of the [testing](/docs/api/testing) page fails on it too.

| Code | When |
|---|---|
| [`FOCUS_LOST`](/docs/diagnostics/FOCUS_LOST) | an update removed, disabled or hid the focused element, and nothing moved the focus |
| [`VIEW_NO_HEADING`](/docs/diagnostics/VIEW_NO_HEADING) | a routed view gives the router nothing to focus |
| [`KEY_ACTIVATES_NEW_FOCUS`](/docs/diagnostics/KEY_ACTIVATES_NEW_FOCUS) | an Enter handler moves focus to an element that the same key press activates |
| [`INTERACTIVE_NO_NAME`](/docs/diagnostics/INTERACTIVE_NO_NAME) | a button, link, field, dialog, meter or progress element without an accessible name |
| [`FOCUS_STYLE_REMOVED`](/docs/diagnostics/FOCUS_STYLE_REMOVED) | a `css` rule removes the focus outline. `jasno check` reports it. |

jasno does not check colour contrast, the order of headings or the quality of label texts. Test with a keyboard and a screen reader.

## What you do

### Keep the focus when state changes

Decide where the focus goes before the update takes the focused element away.

- Do not use `disabled` on a button that has the focus. Use `aria-disabled`, and ignore the press in the handler.
- Before you delete a row, focus a neighbour row or the heading of the list.
- Focus a node that a state change creates in `onMount`, inside its own branch. Never focus it right after `set()`.
- A button that disappears when you press it needs a stable target first. In the example, a Retry button focuses the status line before it reloads.

<!-- ts: declare const r: Resource<string>; -->

```ts
const status = h.p({ role: 'status', tabIndex: -1 }, () => (r.status() === 'error' ? 'Could not load.' : ''));
const retry = show(
  () => r.status() === 'error',
  () => h.button({ type: 'button', onclick: () => { status.focus(); r.reload(); } }, 'Retry'),
);
```

### Name every control

A control needs text, `aria-label`, `aria-labelledby`, or a wrapping `h.label`. Controls that repeat in a list need names that differ from row to row, such as ``'aria-label': () => `Remove ${todo().text}` ``.

### Announce changes

A live region works only if it exists before its text changes. Create the region first, and change its text later.

```ts
const message = signal('');
const status = h.p({ role: 'status' }, message);
```

A toast list is one region, `'aria-live': 'polite'`, that exists before the first message arrives. A chat or a log is `h.ol({ role: 'log', 'aria-label': 'Messages' }, each(...))`.

### Give every view a heading

Render an `h1` in every routed view, outside `show` and `match`. Its text can be live. The router focuses it after the navigation.

### Handle the keyboard with forms

Use a form for Enter-to-save. If you handle Enter in `onkeydown` and the focus moves, call `e.preventDefault()`. The [elements](/docs/api/elements-and-events) page has the details.

### Use native elements for dialogs

A modal dialog uses `showModal()`, has an accessible name, and returns the focus when it closes. The [patterns](/docs/guide/patterns) page has a complete example.

### Keep the focus visible

If you remove the outline of a control, add a rule that shows the focus in a different way.

```ts
css`
  .link-button { outline: none; }
  .link-button:focus-visible { box-shadow: 0 0 0 2px currentColor; }
`;
```

## Test it

Add the `afterEach` hook to your Playwright tests, so that any jasno warning fails the test. Find elements by role, as a user does: `page.getByRole('button', { name: 'Save' })`. A test that cannot find an element by role often points to a missing name.
