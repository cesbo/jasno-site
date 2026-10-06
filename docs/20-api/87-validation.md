# Validation

The browser validates a form. jasno adds only the rules that native constraints cannot express, through `setCustomValidity`.

## Use native constraints first

Put the rules in the attributes of the control: `required`, `type="email"`, `type="number"`, `pattern`, `min`, `max` and `maxLength`. The browser fires `submit` only when every constraint passes. It shows the message and focuses the first invalid field.

Do not check the same rules again in JavaScript.

To show the state while the user types, read `validity` in the `input` handler.

```ts
const emailOk = signal(false);
const email = h.input({
  type: 'email',
  required: true,
  'aria-label': 'Email',
  oninput: (e) => emailOk.set(e.currentTarget.validity.valid),
});
const mark = show(emailOk, () => 'valid');
```

## Add your own rules

A rule that attributes cannot express is a cross-field rule, or a value from a table. Examples are a number inside a band that depends on another field, and an id that another entry already uses.

Make such an error the custom validity of the control. `setCustomValidity(message)` marks the control invalid when the message is not empty. An empty string clears the error.

1. Compute the error with `computed`.
2. Keep the element in a `const`.
3. Apply the error with an `effect`.

```ts
const seats = signal<number | undefined>(1);
const seatsError = computed(() => {
  const n = seats();
  return n !== undefined && n > 100 ? 'At most 100 seats' : undefined;
});
const seatsInput = h.input({
  type: 'number',
  min: '1',
  required: true,
  'aria-label': 'Seats',
  ...bindNumber(seats),
});
effect(() => seatsInput.setCustomValidity(seatsError() ?? ''));
```

The browser now treats the error like a native one. It blocks the submit, focuses the field and shows the message. You do not need to move the focus yourself.

The effect only syncs the control with the signal. It never sets a signal. The error is a `computed`, so there is no effect that writes state.

### One computed for the whole form

A form with many rules can compute all the errors in one place. Each field then has its own effect.

<!-- ts:
declare const draft: Read<{ frequency?: number | undefined }>;
declare const env: unknown;
declare const frequency: WritableSignal<number | undefined>;
declare function validate(d: { frequency?: number | undefined }, env: unknown): Record<string, string | undefined>;
-->

```ts
// { frequency: 'Outside the allowed band' }
const errors = computed(() => validate(draft(), env));
const input = h.input({
  type: 'number',
  'aria-label': 'Frequency',
  ...bindNumber(frequency),
});
effect(() => input.setCustomValidity(errors()['frequency'] ?? ''));
```

### An optional error prop

A field component can take an optional `error` prop. Create the effect only when the caller gives the prop. An effect that reads no signal never runs again, and `jasno check` reports it as `EFFECT_NO_DEPS`.

```ts
export const Field = component(function Field(p: {
  error?: Read<string | undefined> | undefined;
}): Node {
  const input = h.input({ 'aria-label': 'Name' });
  const error = p.error;
  if (error) effect(() => input.setCustomValidity(error() ?? ''));
  return input;
});
```

## Show the message in the page

The browser shows the message in its own bubble after a submit. To show it in the page as well, read the same `computed` in a function child.

<!-- ts: declare const seatsError: Read<string | undefined>; -->

```ts
const note = h.p({ role: 'alert' }, () => seatsError() ?? '');
```

## Why there is no schema library

Other frameworks usually need a form library and a schema library for this work. In jasno the browser does most of the validation, so the JavaScript part stays small: one `computed` for the errors and one `effect` for each field. This is a habit of the framework, not a mechanism. jasno has no validation module.

Binding, `onsubmit` and drafts are on the [forms](/docs/api/forms) page.

## Mistakes this catches

| Code | When |
|---|---|
| [`EFFECT_NO_DEPS`](/docs/diagnostics/EFFECT_NO_DEPS) | an effect whose first run read no signal, for example a `setCustomValidity` effect without an error |
| [`EFFECT_WRITES_STATE`](/docs/diagnostics/EFFECT_WRITES_STATE) | an effect that sets a signal, for example to store an error. Use a `computed`. |
| [`SUBMIT_NOT_PREVENTED`](/docs/diagnostics/SUBMIT_NOT_PREVENTED) | an `onsubmit` handler does not call `preventDefault()` |
