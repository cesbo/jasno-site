# Context

Context gives a value to every component below a point in the tree, without passing props. Use it for a value that many components need, such as a toast function or a theme.

## Create, provide, use

Create the key with `createContext`. Give the value with `provide`. Read it with `useContext` in the setup of a component.

```ts
export const Toast = createContext<(message: string) => void>('Toast');

export const Save = component(function Save(): Node {
  const toast = useContext(Toast);
  return h.button({ type: 'button', onclick: () => toast('Saved') }, 'Save');
});

export const Page = component(function Page(): Node {
  return h.main(null, h.h1(null, 'Page'), Save());
});

export const App = component(function App(): Node {
  return provide(Toast, (message) => console.log(message), () => Page());
});
```

Follow these rules:

- **Name the type.** Write `createContext<T>(name)`. Without a type or a default value, `useContext` is a type error.
- **A default value is optional.** `createContext<string>('Theme', 'light')` gives `'light'` when nothing provides the context. Without a default, `useContext` throws `NO_PROVIDER` when there is no provider.
- **`provide(context, value, fn)` returns the node of `fn`.** Everything that `fn` creates sees the value. This includes branches, rows and effects that are created later.
- **The nearest provider wins.** The lookup walks up the owner tree. It starts at the owner that was current when the consumer was created, not at the place of the node in the DOM. Contexts are compared by identity.

## Read it in setup

`useContext` needs a current owner. Call it in the body of the component, or in `onMount`. Keep the result in a `const`, and use the `const` later.

Event handlers, timers, code after an `await`, computeds and module code have no owner. `useContext` throws `CONTEXT_OUTSIDE_OWNER` there.

## Share changing data

jasno stores the value as it is and never tracks it. To share data that changes, provide a signal, or a function.

```ts
export const Theme = createContext<Read<'light' | 'dark'>>('Theme');

const Badge = component(function Badge(): Node {
  const theme = useContext(Theme);
  return h.span(null, theme);
});

export const Shell = component(function Shell(): Node {
  const theme = signal<'light' | 'dark'>('light');
  return provide(Theme, theme, () => h.div(null,
    Badge(),
    h.button({ type: 'button', onclick: () => theme.set('dark') }, 'Dark'),
  ));
});
```

App-wide state can be a signal in `src/state.ts`. Use context when a subtree needs its own value.

## Pass content as a function

A consumer that you pass as a node is created by the caller, before the provider runs. It cannot see the value, and `useContext` throws `NO_PROVIDER`.

Pass a function instead, and call it inside `provide`. This is the same rule as for [content props](/docs/api/components).

```ts
const Theme = createContext<string>('Theme');

const Label = component(function Label(): Node {
  return h.span(null, useContext(Theme));
});

export const Frame = component(function Frame(p: { panel: () => Child }): Node {
  return provide(Theme, 'dark', () => h.section(null, p.panel()));
});

export const Screen = component(function Screen(): Node {
  return Frame({ panel: () => Label() }); // Label() runs inside the provider
});
```

## Mistakes this catches

| Code | When |
|---|---|
| [`NO_PROVIDER`](/docs/diagnostics/NO_PROVIDER) | `useContext` finds no provider and the context has no default |
| [`CONTEXT_OUTSIDE_OWNER`](/docs/diagnostics/CONTEXT_OUTSIDE_OWNER) | `useContext` is called in a handler, after an `await`, in a computed or in module code |
