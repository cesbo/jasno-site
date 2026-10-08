# Testing

jasno tests run on `node:test` with happy-dom. There is no jest or vitest. Warnings of the development build fail a test, so lost focus, unnamed controls and leaks show up as test failures.

## Run the tests

The `npm test` script runs all test files in one process.

```sh
node --conditions=development \
  --import @jasno/core/testing/happy-dom \
  --test --test-isolation=none \
  "src/**/*.test.ts"
```

Each part has a job:

- **`--conditions=development`** loads the development build of jasno. The diagnostics need it. Without it, `@jasno/core/testing` throws `TESTING_REQUIRES_DEV_BUILD` when you import it.
- **`--import @jasno/core/testing/happy-dom`** registers the happy-dom globals. It also adds the focus steps of `<dialog>` that happy-dom lacks.
- **`--test-isolation=none`** keeps all files in one process. It is fast. Module state is shared between files, so jasno resets it after each test.
- **`"src/**/*.test.ts"`** names the test files.

`tsconfig.test.json` adds the Node types for `*.test.ts` files.

## mountTest

`mountTest(t, view)` renders a component into a new container in `document.body`. Pass the `t` of `test('name', (t) => ...)`. It runs one `flush()` and returns `{ root, diagnostics, dispose() }`.

```ts fragment
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { component, flush, h, signal } from '@jasno/core';
import { mountTest } from '@jasno/core/testing';

const Counter = component(function Counter(): Node {
  const count = signal(0);
  return h.button(
    {
      type: 'button',
      onclick: () => count.update((n) => n + 1),
    },
    'Clicks: ', count,
  );
});

test('the counter counts', (t) => {
  const view = mountTest(t, () => Counter());
  const button = view.root.querySelector('button')!;
  button.click();
  flush(); // the DOM updates in the next microtask: flush() runs it now
  assert.equal(button.textContent, 'Clicks: 1');
});
```

When the test ends, `mountTest` unmounts the view. Then it fails the test if any of these happened:

- A warning or an error of jasno that you did not expect.
- An uncaught error in reactive code: `UNCAUGHT_ERROR`. The original error is its `cause`.
- An owner that the test created is still alive: `EFFECT_LEAKED`.
- A code in `expect` did not occur: `EXPECTED_DIAGNOSTIC_MISSING`.

Then it sets every signal that was created outside a component back to its initial value. Plain module variables are not reset. A module-level resource in `createRoot`, and everything it owns, is not reset either. If a test needs such data fresh, stub `fetch` and call `reload()`.

To compare two nodes, write `assert.ok(a === b)`. `assert.equal(a, b)` prints both nodes when it fails, and that can run out of memory.

## Wait for async work

- **`flush()`** runs the pending DOM and effect updates now. Use it after a synchronous change.
- **`await settled()`** waits until flushes, loaders, navigations, `optimistic()` saves and promises that `on*` handlers returned are idle. Use it after an async submit, a lazy view or a loader.
- **`await waitFor(check)`** runs `check` again until it stops throwing. Use it for a state that `settled()` would wait past, such as "Loading" while the test holds the loader.

`settled()` uses the real timers, so `mock.timers` cannot hang it. After 2 seconds it fails with `SETTLE_TIMEOUT`, and the message lists the pending work.

`settled()` sees the promises that handlers return, and every queued `optimistic()` save. Return any other promise from the handler: `onclick: () => save()`. Other work that a handler starts and does not return is invisible to it.

```ts fragment
const Save = component(function Save(): Node {
  const status = signal('');
  return h.div(null,
    h.button(
      {
        type: 'button',
        onclick: async () => {
          await Promise.resolve();
          status.set('Saved');
        },
      },
      'Save',
    ),
    h.p({ role: 'status' }, status),
  );
});

test('saving shows the result', async (t) => {
  const view = mountTest(t, () => Save());
  view.root.querySelector('button')!.click();
  await settled();
  assert.equal(view.root.querySelector('p')?.textContent, 'Saved');
});
```

## Diagnostics fail tests

A warning of the development build fails the test. Fix the code. Examples are `STRICT_READ_UNTRACKED`, `FOCUS_LOST` and `INTERACTIVE_NO_NAME`.

To test a warning on purpose, list its code in `expect`. The code must occur. The types reject the codes that always mean broken code, such as `STRICT_READ_UNTRACKED`.

```ts fragment
test('duplicate keys are reported', (t) => {
  mountTest(
    t,
    () => h.ul(null,
      each(() => [1, 1], { key: (n) => n, render: (n) => h.li(null, n) }),
    ),
    { expect: ['DUPLICATE_KEY'] },
  );
});
```

## Events, keys, time and routes

- **Click.** `el.click()` fires `click`. For a checkbox or a radio it also fires `input` and `change`.
- **Text.** Call `el.focus()` first, as a user does. Set `el.value`, then run `el.dispatchEvent(new Event('input'))`.
- **Keys.** Dispatch `new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })`, then `await Promise.resolve()`. Without `cancelable`, `preventDefault()` has no effect, and jasno reports a correct handler.
- **Time.** Use `mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'] })` for the code of your app.
- **Network.** Stub `fetch`, or `provide()` a fake service through context.
- **Routes.** Set the start URL with `history.replaceState(null, '', '/users/1')` before `mountTest`. Then `await router.navigate(url)`. Tests are the only code that may touch `history`. happy-dom has no Navigation API, so tests run the History adapter.

```ts fragment
const Filter = component(function Filter(): Node {
  const q = signal('');
  return h.div(null,
    h.input({ ...bindValue(q), 'aria-label': 'Filter' }),
    h.p(null, () => `Query: ${q()}`),
  );
});

test('typing updates the query', (t) => {
  const view = mountTest(t, () => Filter());
  const input = view.root.querySelector('input')!;
  input.focus();
  input.value = 'milk';
  input.dispatchEvent(new Event('input'));
  flush();
  assert.equal(view.root.querySelector('p')?.textContent, 'Query: milk');
});
```

## Tests in a real browser

Playwright tests run in Chromium, Firefox and WebKit. Use them for focus, the keyboard, layout and real accessibility. Install the browsers once: `npx playwright install`.

Run the tests with `npm run e2e`. The `webServer` option of `playwright.config.ts` starts `npm run dev`, or reuses it.

Find elements by role, as a user does: `page.getByRole('button', { name: 'Save' })`. Add an `afterEach` that fails the test on any jasno warning. The development build gives the warnings in `window.__JASNO__`.

```ts fragment
import { expect, test } from '@playwright/test';
import type {} from '@jasno/core'; // types for window.__JASNO__

const errors: string[] = [];
test.beforeEach(({ page }) => {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(String(e)));
});
test.afterEach(async ({ page }) => {
  const warnings = await page.evaluate(
    () => window.__JASNO__?.diagnostics().map((d) => d.message) ?? null,
  );
  expect(warnings, 'window.__JASNO__ exists under jasno dev').not.toBeNull();
  expect([...errors, ...(warnings ?? [])]).toEqual([]);
});
```

With this hook, `FOCUS_LOST`, `KEY_ACTIVATES_NEW_FOCUS` and `VIEW_NO_HEADING` fail the test.

The production build has no `window.__JASNO__`. To test it, run `npm run dist`, then `JASNO_E2E=preview npx playwright test`. In this mode only page errors fail a test. Remove the `not.toBeNull()` check for that mode.

## The order of checks

Run the checks from the fastest to the slowest. A command that exits with a non-zero code has failed. Fix it before you run the next one, because the later checks assume that the earlier ones pass.

1. `npm run check` runs `tsc` for both programs and the jasno rules. It takes a second or two.
2. `npm test` runs the component tests.
3. `npx playwright test` runs the browser tests against `npm run dev`.
4. In CI, `npm run dist` and `JASNO_E2E=preview npx playwright test` test the shipped build.

## Mistakes this catches

| Code | When |
|---|---|
| [`UNCAUGHT_ERROR`](/docs/diagnostics/UNCAUGHT_ERROR) | an error in reactive code that no `catchError` caught |
| [`EFFECT_LEAKED`](/docs/diagnostics/EFFECT_LEAKED) | an owner created by the test is still alive after it ends |
| [`EXPECTED_DIAGNOSTIC_MISSING`](/docs/diagnostics/EXPECTED_DIAGNOSTIC_MISSING) | a code in `expect` did not occur |
| [`SETTLE_TIMEOUT`](/docs/diagnostics/SETTLE_TIMEOUT) | `settled()` timed out with work still pending |
| [`TESTING_REQUIRES_DEV_BUILD`](/docs/diagnostics/TESTING_REQUIRES_DEV_BUILD) | tests run without `--conditions=development` |
