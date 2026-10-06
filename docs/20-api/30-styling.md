# Styling

jasno has three ways to style an interface: the `class` and `style` props of an element, `css` style sheets, and Tailwind. jasno does not scope styles, and it has no CSS-in-JS runtime.

## class and style props

Use the `class` prop to switch a class when state changes. Use the `style` prop for a value that changes often. The [elements](/docs/api/elements-and-events) page describes both props.

For a dynamic value in a style sheet, set a custom property in `style` and read it with `var()` in the rule.

```ts
css`
  .meter { width: var(--value); height: 4px; background: currentColor; }
`;

export const Meter = component(function Meter(
  p: { value: Read<number> },
): Node {
  return h.div({ class: 'meter', style: { '--value': () => `${p.value()}%` } });
});
```

## css

`` css`...` `` adds a global style sheet. Call it once, at the top level of a module. jasno adds the sheet to `document.adoptedStyleSheets`, so it needs no `<style>` element. A repeated call from the same place returns the same sheet. jasno never removes a sheet.

The text has no `${}` values. An interpolation is a type error. Use a custom property for a dynamic value, as in the example above.

Sheets are global, so jasno does not scope the rules. Put a class on the root element of the component, and start each rule with that class.

```ts
css`
  .card { padding: 8px; .title { font-weight: 600; } }
`;

export const Card = component(function Card(p: { title: Read<string> }): Node {
  return h.section({ class: 'card' }, h.h3({ class: 'title' }, p.title));
});
```

### Focus outline

Do not remove the focus outline. `jasno check` reads the `css` templates. It reports `FOCUS_STYLE_REMOVED` for a rule that sets `outline: none` on an interactive element, unless another rule shows the focus in a different way.

## Style sheet files

Put a CSS file in `assets/` and link it from `index.html`.

```html
<link rel="stylesheet" href="/assets/site.css">
```

`jasno dist` copies the file as it is, with the same name. Put images and fonts in `assets/` too, and refer to them by the root path: `url('/assets/logo.png')`. A file under `src/` is not published, and jasno reports `ASSET_OUTSIDE_ASSETS` for a URL that points to it.

## Tailwind

jasno compiles a style sheet in `assets/` with Tailwind when the sheet imports it. The setup has three steps.

1. Install the Tailwind CLI in your project: `npm install -D @tailwindcss/cli`.
2. Create `assets/app.css` with one line: `@import "tailwindcss";`.
3. Link `/assets/app.css` from `index.html`, as in the example above.

There is no script, no watcher and no configuration option. `jasno dev` compiles the sheet on every request. `jasno dist` writes the compiled, minified sheet under the same name. Tailwind runs from the root of your project, so it scans `src/` and `index.html` for class names. Your project pins the Tailwind version.

Write the class names in full. Tailwind finds a class by reading the source text, so it cannot find a name that you build from parts.

```ts
const invalid = signal(false);
const field = h.input({
  'aria-label': 'Name',
  class: () => (
    invalid() ? 'rounded border p-2 border-red-500' : 'rounded border p-2'
  ),
});
```

A style sheet without the `@import "tailwindcss"` line is copied as it is. If the CLI is missing, or if Tailwind fails on the sheet, jasno reports `TAILWIND_FAILED`. In `jasno dev` the request gets a 500 response, and `jasno dist` writes nothing.

## Mistakes this catches

| Code | When |
|---|---|
| [`FOCUS_STYLE_REMOVED`](/docs/diagnostics/FOCUS_STYLE_REMOVED) | a `css` rule removes the focus outline |
| [`ASSET_OUTSIDE_ASSETS`](/docs/diagnostics/ASSET_OUTSIDE_ASSETS) | a URL points to a file under `src/`, which is not published |
| [`TAILWIND_FAILED`](/docs/diagnostics/TAILWIND_FAILED) | the Tailwind CLI is not installed, or it fails on the sheet |
