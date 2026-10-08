# Router

`@jasno/core/router` maps URLs to views. Each route has a pattern, a lazy view and an optional loader. The router also moves focus, sets the title and announces the new page.

## Set up

Create the router once, in `src/routes.ts`, and export it. Render it with `router.outlet()` inside `App`. Call `outlet()` once.

<!-- ts: declare function getUser(id: string, signal: AbortSignal): Promise<User>; interface User { readonly id: string; readonly name: string } -->

```ts
const HomeView = component(function HomeView(): Node {
  return h.h1(null, 'Home');
});

const UserView = component(function UserView(
  p: ViewProps<'/users/:id', User>,
): Node {
  return h.section(null,
    h.h1(null, () => p.data().name),
    h.p(null, () => `Id: ${p.params().id}`),
  );
});

export const router = createRouter([
  route('/', {
    view: () => Promise.resolve({ default: HomeView }),
    title: 'Home',
  }),
  route('/users/:id', {
    loader: ({ params, abortSignal }) => getUser(params.id, abortSignal),
    view: () => Promise.resolve({ default: UserView }),
    title: (user) => user.name,
  }),
], {
  error: (error, retry) => h.section(null, h.h1(null, 'Something went wrong'),
    h.button({ type: 'button', onclick: retry }, 'Try again')),
  notFound: () => h.h1(null, 'Page not found'),
});

export const App = component(function App(): Node {
  return h.div(null,
    h.header(null,
      h.nav({ 'aria-label': 'Main' }, h.a({ href: router.href('/') }, 'Home')),
    ),
    h.main(null, router.outlet()));
});
```

In a real app, each view is a module with a default export. The route imports it lazily, and `jasno dist` makes one chunk for each view.

```ts fragment
route('/users/:id', { view: () => import('./views/user.ts') })
```

The options `error` and `notFound` are required. Both must return something visible.

## Routes

A pattern starts with `/`. Each segment is static or a param.

| Segment | Matches |
|---|---|
| `users` | the text `users` |
| `:id` | one segment, as the string `id` |
| `:id?` | one optional segment |
| `:path+` | one or more segments, joined with `/` |
| `:path*` | zero or more segments |
| `:tab(profile\|billing)` | one segment that fits the pattern in brackets. Alternatives give a literal union type. |

Matching is case-sensitive. The router decodes each segment before it compares. A trailing slash is optional. The first route that matches wins, so list specific routes before routes with params.

jasno rejects two kinds of mistakes when you create the router:

- A route that can never match, because an earlier route matches all its paths, throws `ROUTE_SHADOWED`.
- A pattern that matches every path is rejected as `INVALID_ROUTE_PATTERN`. Use `notFound` for this.

The router passes the params to the view as decoded strings. `Params<'/users/:id'>` is `{ id: string }`.

## Loaders and titles

A loader runs once for each navigation, together with the import of the view. It receives the `params` and an `abortSignal`. The signal aborts when a newer navigation replaces this one.

The loader is untracked. A signal that it reads is a snapshot.

The view reads the result with `p.data()`. If the view declares a data type, the route must have a loader that resolves that type.

`title` is a string, or a function that gets the data. The title is live, and the view owns it. A route without a title restores the title of `index.html`. The view can also set its own title.

## Views

A view is a component. It receives `ViewProps<Pattern, Data>`: `params` and `data` as functions.

`params` and `data` do not change while the view lives. A new route or new path params build a new view, and the router disposes the old one. So the view can read them in setup. Its drafts, its flags and its `onMount` work start again for each record.

```ts
export const UserPage = component(function UserPage(
  p: ViewProps<'/users/:id'>,
): Node {
  const id = p.params().id;
  onMount(() => console.log(`Opened user ${id}`));
  return h.section(null, h.h1(null, 'User'), h.p(null, `User ${id}`));
});
```

An effect that reads only `params` or `data` never runs again. Use `onMount` for such work.

A change of the search params keeps the view. Work that depends on a search param goes in `match`, so that it starts again for each value.

## Layouts

A layout is UI that several routes share, such as the page list of a section. A route names it as a lazy module, like its view.

```ts fragment
route('/docs', { layout: () => import('./layouts/docs.ts'), view: () => import('./views/docs-index.ts') }),
route('/docs/:page', { layout: () => import('./layouts/docs.ts'), view: () => import('./views/doc.ts') }),
```

The module exports a component that gets `LayoutProps`. Its one prop, `view`, is the place for the page.

<!-- ts: declare function DocsNav(): Node; -->

```ts
export default component(function DocsLayout(p: LayoutProps): Node {
  return h.div({ class: 'docs' }, DocsNav(), p.view);
});
```

When the next route names the same layout, the layout stays. It keeps its DOM, its scroll and its state. The router builds only the view again, inside it. This holds for new params of one route and for other routes.

- Put `p.view` in the layout once, outside `show` and `match`. A layout that leaves it out fails the navigation. In development, so does a layout that places it inside a branch.
- A layout gets no params, because it outlives them. Read the URL with `router.url()`. Mark the current page with `aria-current`, as in the [navigation menu](/docs/patterns/navigation-menu) pattern.
- Focus and the announcement come from the view, never from the layout. So the layout has no `h1`. App already holds `<main>`, so the layout has no `main` either.
- A layout loads its own data with a `resource`.
- Context that the layout provides does not reach the view. Provide it in App, above the outlet.
- `notFound` and the error view render without a layout.

Keep one `router.outlet()`. An outlet in each branch of a `show` loses the focus move, and jasno reports `OUTLET_MOVED`.

## Links and navigation

`router.href(pattern, params)` builds a URL. TypeScript requires the params when the pattern has required params. A number is allowed. jasno encodes each segment.

```ts fragment
h.a({ href: router.href('/users/:id', { id: 7 }) }, 'User 7')
```

The router intercepts same-origin links whose path matches a route. It also intercepts back and forward. The browser handles everything else: other origins, downloads, links with a `target`, reloads and clicks with a modifier key. A URL that matches no route at the start renders `notFound`.

`router.navigate(url, { replace })` goes to a URL. It resolves after the view is rendered and the focus has moved. It resolves one of three values:

- `'done'`: a view or `notFound` rendered.
- `'superseded'`: a newer navigation took over.
- `'failed'`: the error view rendered.

`navigate()` never rejects for these outcomes, so `void router.navigate(url)` is safe. Use `{ replace: true }` after a delete or a create, and for edits of search params.

`router.back(fallback)` closes a detail that the user opened. If the previous history entry belongs to the app, the router goes back one entry. Otherwise it does `navigate(fallback, { replace: true })`. A deep link then closes without leaving the app.

`router.isLoading` is true while a navigation loads data or a view.

Never use `history` or `location` yourself. The router does not see a URL that you push by hand. `jasno check` reports `USE_ROUTER`.

## Search params

`router.url` is a signal. Read the search params from it.

<!-- ts: declare const router: import('@jasno/core/router').Router<'/'>; -->

```ts
const q = computed(() => router.url().searchParams.get('q') ?? '');
const search = h.input({
  'aria-label': 'Search',
  value: q,
  oninput: (e) => {
    void router.navigate(
      `?q=${encodeURIComponent(e.currentTarget.value)}`,
      { replace: true },
    );
  },
});
```

A change of the search params or the hash alone does not rebuild the view. It runs no loader, and it does not move focus or scroll. `url` updates before `navigate()` returns, so an input that is bound to it never drops a keystroke.

A detail over a list has two shapes:

- **A modal detail**, such as a card in a dialog, goes in a search param of the list route: `?card=7`. The list stays mounted with its scroll position, its focus and its drafts. No loader runs. Back closes the detail.
- **A detail page** beside the list, with its own loader, title and heading, is a path route: `/cards/7`. Make the list the [layout](#layouts) that both routes share. Then the list stays, and only the detail is built again. Without the layout, a path route builds the list again too.

## Focus and title

After a navigation, the router moves focus. It tries these candidates in order:

1. The first `[autofocus]` element in the view that is visible. An element in a closed dialog does not count.
2. The first `h1` of the view.
3. The closest `main` element.

The router gives the `h1` or the `main` element `tabindex="-1"`. Every view needs an `h1`. A view without a candidate is reported as `VIEW_NO_HEADING`.

The router does not move focus when the outlet renders for the first time. It moves focus after every later navigation.

The router also announces the new page. It uses the title of the route, or else the text of the first `h1`. It calls `document.body.ariaNotify` when the browser has it. Otherwise it writes the text to a hidden `aria-live` element.

A route without `title`, the `notFound` view and the error view restore the title of `index.html`. Navigations that change only the search params do not touch the title.

## Scroll

After a navigation to a new view or new params, the page scrolls to the top. On Back and Forward, the page returns to the position that the entry had. A change of the search params alone keeps the position.

## Errors

If a loader fails, the router renders `error(error, retry)` in the outlet. The same happens when the import of a view or a layout fails. It also happens when the setup, a binding or an effect of the view or its layout throws. `retry()` runs the navigation to the current URL again. The next navigation also rebuilds the view.

A view or layout import can fail after a deploy, when a tab still holds old file names. The router then reports `VIEW_IMPORT_FAILED` and loads the target URL as a full page, once. If it fails again, the router renders the error view.

## Hash mode

Use `hash: true` for a server that serves `index.html` at one path and has no fallback for other paths. The route then lives in the fragment: `/app/#/users/1`.

`url()` still returns the route URL, with the pathname `/users/1`. `navigate()` and the views work the same. Only `href()` changes: it returns `#/users/1`.

In this mode, every fragment belongs to the app. A plain `h.a({ href: '?q=x' })` loads another document, and `#intro` is the route `/intro`. Write `router.href(path) + '?q=x'` instead.

## Mistakes this catches

| Code | When |
|---|---|
| [`ROUTE_SHADOWED`](/docs/diagnostics/ROUTE_SHADOWED) | an earlier route matches all the paths of a later route |
| [`INVALID_ROUTE_PATTERN`](/docs/diagnostics/INVALID_ROUTE_PATTERN) | a pattern that matches every path |
| [`OUTLET_ALREADY_ACTIVE`](/docs/diagnostics/OUTLET_ALREADY_ACTIVE) | `outlet()` is called while another outlet is active |
| [`OUTLET_MOVED`](/docs/diagnostics/OUTLET_MOVED) | an outlet is disposed and another one renders in the same flush |
| [`ROUTER_NOT_STARTED`](/docs/diagnostics/ROUTER_NOT_STARTED) | `navigate()` or `back()` is called before `outlet()` |
| [`VIEW_NO_HEADING`](/docs/diagnostics/VIEW_NO_HEADING) | a view has no `[autofocus]` element and no `h1` |
| [`VIEW_IMPORT_FAILED`](/docs/diagnostics/VIEW_IMPORT_FAILED) | the import of a view or layout module fails, usually after a deploy |
| [`USE_ROUTER`](/docs/diagnostics/USE_ROUTER) | code uses `history` or `location` directly |
