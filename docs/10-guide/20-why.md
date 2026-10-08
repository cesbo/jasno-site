# Why another framework

jasno makes one claim. A developer or a coding agent who has never seen jasno can build a working application from one API file. Mistakes that other frameworks accept become type errors or diagnostics, and the message contains the fix. This page shows what is different in jasno, and what it costs.

The parts of jasno are familiar. The reactive core is alien-signals, the same algorithm that Vue uses for its reactivity. The tag functions are hyperscript with types. The signal and resource names come from Angular. jasno adds the layer that checks your code. The props come from lib.dom. The types enforce the live-or-snapshot rule. The diagnostics name the fix.

## What is different

- **Zero configuration.** A jasno project has no bundler config and no test config. `jasno dist` bundles with Rolldown, and there is no file to configure. `jasno dev` strips the types and serves each file as the browser runs it. Tests run on `node:test`, without jest or vitest. In most projects this setup is a task of its own. See [CLI](/docs/tools/cli) and [Testing](/docs/api/testing).
- **Validation is almost free.** The browser validates. JavaScript adds only the cross-field rules, through `setCustomValidity`. Other frameworks usually need a form library and a schema library. In jasno this is a habit of the framework, not a mechanism. See [Validation](/docs/api/validation).
- **Granular reactivity.** Each piece of the interface can depend on its own signal, for example `show(() => applicable().has(key))` for one field. Typing into one field updates only that field. A framework that re-renders from one draft object in component state re-renders the whole form on every keystroke. Vue behaves like jasno here.
- **The element is a value, with no refs.** Write `const heading = h.h1(...)`. Then call `heading.focus()` before you delete a row of a list. Focus is easy to forget. The `FOCUS_LOST` diagnostic reminds you. See [Accessibility](/docs/guide/accessibility).
- **Diagnostics see what a screenshot cannot.** A browser test or a screenshot shows the page after a change. It catches a text that never updates, a lost focus or an effect that writes state only when a test asserts that case. jasno sees its reactive graph, so it reports these cases on its own, with a code and a fix. Add an `afterEach` to the Playwright suite. It fails the test on any jasno warning. React and Vue have no built-in equivalent. Accessibility does not depend on a person who remembers it. The tools require it. See [Dev tools](/docs/tools/dev-tools).
- **Optimistic saves are one function.** `optimistic()` shows the new value at once and sends it. The saves of one record run in order. A failed save shows the value that the server accepted. A late save never writes into the page of another record. Other frameworks leave this queue and this rollback to the app or to a query library. See [Optimistic save](/docs/patterns/optimistic-save).
- **A page never outlives its record.** A new path param builds a new view. So the draft, the flags and the subscriptions of one user never appear on the page of the next user. In React Router and Vue Router a page stays when only its params change, unless you give it a key. State that must survive the switch lives in a layout or in `src/state.ts`. See [Views](/docs/api/router#views).
- **A section keeps its frame.** UI that several routes share, such as a page list, is a layout route. The layout stays with its scroll and state, and the router builds only the page again. It is one option in the route table. See [Layouts](/docs/api/router#layouts).

## What it costs

- **The live-or-snapshot tax.** Every prop is a decision: `x` or `() => x()`. The `STRICT_READ_UNTRACKED` rule shapes the code. A helper cannot read the current mode during setup, so a default label must be a separate `Read`. React has no such choice. Solid has the same tax, but the jasno types catch a forgotten call. See [Reactivity](/docs/api/reactivity).
- **Two-way binding is longer than `v-model`.** For a signal, binding is one spread: `h.input({ ...bindValue(q) })`. `bindNumber` and `bindChecked` work the same way. In Vue the binding is a compiler directive. In jasno it is a pair of props. See [Forms and binding](/docs/api/forms).
- **Markup is denser than JSX.** `h.fieldset(null, h.legend(null, 'LNB'), ...)` reads fine over two hundred lines. But `null` as the first argument everywhere gets tiring. So does `show(() => c, () => [a, b])` instead of `{c && <>...</>}`. This is not a problem for an agent. It is a problem for a person who is used to templates.
- **Strict prop types cost letters.** Every interface has props such as `hint?: string | Read<string | undefined> | undefined`. The reason is `exactOptionalPropertyTypes`.
- **An AI agent needs extra context.** jasno is new, so an AI agent does not know it from training. The agent must read `AGENTS.md` and the recipes before it writes code. For React, it needs no extra context.
- **No ecosystem.** There is no set of field components. You write them by hand: about 125 lines for a form. A data grid or a date picker would hurt more. Developer tools are text only, through `window.__JASNO__`.

Weigh these costs against your own habits before you choose jasno.
