# Why another framework

jasno makes one claim: a developer, or a coding agent, who has never seen it builds a working application from one API file, and the mistakes that other frameworks let through become type errors or diagnostics with a fix in the message. This page is what one real task showed, including what it cost.

**The short version.** There is almost no win in the amount of code. The win is what the project does not contain: a bundler, a form library, a test configuration. And that accessibility and focus are checked by the machine, not by a reviewer. The loss is the cognitive tax of telling live values from static ones, and the missing ecosystem.

## The task

A settings form of about fifty fields, built from a written specification in a fresh `npm create @jasno` project. Several device types and modes, each showing its own subset of fields from one applicability table that also drives the JSON being produced. Eight connection modes with their own ranges. Cross-field rules: a value within the allowed band, unique ids, a resource already taken by another entry. Storage in localStorage, no server.

A coding agent wrote all of the code; the author of the framework wrote the specification and reviewed. The agent had no prior knowledge of jasno beyond the files in the project: `AGENTS.md` and `jasno.d.ts` with its block of recipes.

| Check | Result |
|---|---|
| `jasno check --strict`, first run after about 900 lines | 0 errors |
| Unit tests, `node:test` with happy-dom | 19 / 19 in 0.6 s |
| Playwright against the dev server, Chromium, Firefox and WebKit | 15 / 15 |
| Playwright against the production build | 15 / 15 |
| Whole application, gzipped | 24 KB, 14 KB of it the runtime with the router |
| Lines, tests included | 1335 |

The only bug found along the way was in happy-dom, not in jasno: it reads an empty `max=""` attribute as zero.

A caveat before the details: the assessment was made by the agent that did the work, on one task. A human would weigh the items differently. The type guards count for less; the density of the markup and the `() =>` tax count for more.

## Where it won

- **Zero configuration.** No bundler, no test configuration. Tests run on `node:test`, without jest or vitest. In most projects that setup is a work item of its own.
- **Validation is almost free.** The recipe is that the browser validates, and JavaScript adds only the cross-field rules through `setCustomValidity`. The whole validation layer of the fifty-field form is about twenty lines. The habit elsewhere is a form library plus a schema library. That is the culture of the framework rather than its mechanics, but it worked.

```ts
const errors = computed(() => validate(draft(), env)); // { frequency: 'Outside the allowed band' }
const input = h.input({ type: 'number', ...bindNumber(frequency) });
effect(() => input.setCustomValidity(errors()['frequency'] ?? ''));
```

- **Granular reactivity on a large form.** Each field lives in its own `show(() => applicable().has(key))`. Typing into one field touches nothing else. A framework that re-renders from one draft object in component state re-renders the whole form on every keystroke; Vue would be on par here.
- **The element is a value, no refs.** `const heading = h.h1(...)`, then `heading.focus()` before deleting a row of a list. Focus is easy to forget. Here the `FOCUS_LOST` diagnostic reminded about it: the end-to-end test would have failed.
- **Diagnostics as tests.** An `afterEach` in the Playwright suite fails the test on any jasno warning: lost focus, a control without a name, a signal read outside tracking. React and Vue have no built-in equivalent. Accessibility happened not because somebody thought about it, but because the guide required it.
- **One API file instead of documentation.** `AGENTS.md` and `jasno.d.ts` were enough to get everything right the first time, including the unusual places: a form that writes inside `match()`, `untracked()` for an initial value.

## Where it cost

- **The live-or-static tax.** Every prop is a decision: `x` or `() => x()`. The `STRICT_READ_UNTRACKED` rule forced a restructuring of how default labels reach select fields: a helper cannot read the current mode during setup, so the label became a separate `Read`. React has no such dichotomy. Solid has the same tax, but jasno's types at least catch a forgotten call.
- **Two-way binding was more verbose than `v-model`.** Every field was a pair, `value: s` and `oninput: (e) => s.set(e.currentTarget.value)`, and a number field also needed formatting back into a string with empty input handled. Closed after the report: `bindValue`, `bindNumber` and `bindChecked` went into the core in 0.1.4 as a direct result. For a signal it is one spread, `h.input({ ...bindValue(q) })`. The difference from Vue that remains is that it is a pair of props, not a compiler directive.
- **Markup denser than JSX.** `h.fieldset(null, h.legend(null, 'LNB'), ...)` reads fine over two hundred lines, but `null` as the first argument everywhere and `show(() => c, () => [a, b])` instead of `{c && <>...</>}` get tiring. Not a problem for an agent; it will be for a person used to templates.
- **Strict prop types cost letters.** `hint?: string | Read<string | undefined> | undefined` in every interface, because of `exactOptionalPropertyTypes`.
- **Reading before the first line.** Before writing anything, the agent read `AGENTS.md`, the recipes and part of the design to confirm that `select.value` is reapplied when the options change. With React nothing would have needed reading.
- **No ecosystem.** The set of field components, about 125 lines, was written by hand because there is nowhere to take it from. Fine for a form; a data grid or a date picker would hurt. Developer tools are text only, through `window.__JASNO__`.

## What follows

The claim held on this task: about 900 lines passed the type check and the rules on the first attempt, and the finished form passed the same end-to-end suite in three browsers against both the dev server and the production build. The costs are real and are listed above, so that you can weigh them against your own habits before choosing.
