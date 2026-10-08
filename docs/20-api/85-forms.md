# Forms and binding

jasno has no form module. A form is a native `<form>`. Three helpers, `bindValue`, `bindNumber` and `bindChecked`, connect a control to a signal.

## Bind a control

A binding is two props: the value of the control, and the event that writes it back. The helper returns both. Spread them into the control.

`bindValue` is for `input`, `textarea` and `select`. It returns `{ value, oninput }`.

```ts
const query = signal('');
const search = h.input({ ...bindValue(query), 'aria-label': 'Search' });
```

Each helper accepts a writable signal alone, or a read function and a setter. The setter can be any function. Use it when a form keeps one draft object.

```ts
interface Draft { readonly name: string }

const draft = signal<Draft>({ name: '' });
const name = h.input({
  ...bindValue(
    () => draft().name,
    (value) => draft.update((d) => ({ ...d, name: value })),
  ),
  'aria-label': 'Name',
});
```

jasno assigns a live `value` only when it differs from the value of the element. For this reason the caret does not jump while the user types.

### Numbers

`bindNumber` is for `<input type="number">`. The signal or the setter must accept `undefined`.

An empty field, and an entry that is not finished yet, set `undefined`. `undefined` shows as an empty field. While the text of the field still means the current number, jasno keeps the text. Typing `1.50` does not turn into `1.5` under the caret.

```ts
const seats = signal<number | undefined>(1);
const field = h.input({
  type: 'number',
  min: '1',
  required: true,
  'aria-label': 'Seats',
  ...bindNumber(seats),
});
```

### Checkboxes and radio buttons

`bindChecked` is for a checkbox. It returns `{ checked, onchange }`.

```ts
const agree = signal(false);
const box = h.label(null,
  h.input({ type: 'checkbox', ...bindChecked(agree) }),
  ' I agree',
);
```

A radio group has one signal. Each radio sets two props by hand.

```ts
const plan = signal<'free' | 'pro'>('free');

const radio = (value: 'free' | 'pro', label: string) => h.label(null,
  h.input({
    type: 'radio',
    name: 'plan',
    checked: () => plan() === value,
    onchange: () => plan.set(value),
  }),
  ` ${label}`,
);
```

The types reject a spread onto an element that lacks the props. `bindValue` on a `div` is a type error.

### Why there is no form module

jasno has no `form(schema)` module and no `model` prop. Validity, focus and disabled buttons are native browser behavior, and this page shows how to use them. A `model` prop would change its meaning with the `type` of the control. Most setters are not `signal.set`, for example a patch of a draft object, so the prop would still need a getter and a setter.

The number input is the one binding that hand-written code often gets wrong. This is why `bindNumber` exists.

## Submit

Handle a form with `onsubmit`. The browser fires it only when every native constraint passes: `required`, `type="email"`, `pattern`, `min` and `maxLength`. Do not check these again in JavaScript.

Follow these rules in the handler:

- **Call `e.preventDefault()` first,** before any `await`. Without it the browser navigates, and jasno reports `SUBMIT_NOT_PREVENTED`.
- **Return the promise** of the save. Then `settled()` in a test waits for it.
- **Ignore a second press** while a save runs: `if (saving()) return`.

<!-- ts: declare function subscribe(email: string): Promise<void>; -->

```ts
export const Signup = component(function Signup(): Node {
  const email = signal('');
  const saving = signal(false);

  async function submit(): Promise<void> {
    if (saving()) return;
    saving.set(true);
    try {
      await subscribe(email());
    } finally {
      saving.set(false);
    }
  }

  return h.form({ onsubmit: (e) => { e.preventDefault(); return submit(); } },
    h.label(null,
      'Email ',
      h.input({ type: 'email', required: true, ...bindValue(email) }),
    ),
    h.button({ type: 'submit', 'aria-disabled': saving }, 'Subscribe'),
  );
});
```

Do not use `disabled` on the button that has the focus. The focused element becomes disabled, the focus falls to `<body>`, and jasno reports `FOCUS_LOST`. Use `aria-disabled`, and ignore the press in the handler.

Every control needs an accessible name. Wrap it in a `h.label`, or add `aria-label`. A control without a name is reported as `INTERACTIVE_NO_NAME`.

For an error that native constraints cannot express, see the [validation](/docs/api/validation) page.

## Drafts

A short-lived editor seeds its field once. Use `untracked()` to read the starting value. The [reactivity](/docs/api/reactivity) page has an example.

A form that stays while saves happen needs one more rule. Create the form for each record inside `match()`, with the id of the record as the key. Then the draft and the saving flag never cross records. A save echo, which is a new object with the same id, does not reset the draft. A routed view with one record needs no `match()`, because a new `:id` builds a new view.

```ts
interface Card { readonly id: string; readonly title: string }

const CardForm = component(function CardForm(p: { initial: string }): Node {
  const title = signal(p.initial);
  return h.form(null, h.input({ ...bindValue(title), 'aria-label': 'Title' }));
});

export const CardEditor = component(function CardEditor(
  p: { card: Read<Card> },
): Node {
  return match(
    () => p.card().id,
    () => CardForm({ initial: untracked(p.card).title }),
  );
});
```

After a save, clear the draft only if it still holds the text that you sent. The user may have typed more while the save ran.

## Mistakes this catches

| Code | When |
|---|---|
| [`SUBMIT_NOT_PREVENTED`](/docs/diagnostics/SUBMIT_NOT_PREVENTED) | an `onsubmit` handler does not call `preventDefault()` |
| [`FOCUS_LOST`](/docs/diagnostics/FOCUS_LOST) | an update disables or removes the focused element |
| [`INTERACTIVE_NO_NAME`](/docs/diagnostics/INTERACTIVE_NO_NAME) | a control without an accessible name |
