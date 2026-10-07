# Navigation menu

Build a menu from an array of entries and one link component. Each link marks the current page with `aria-current`, and CSS styles that attribute.

<!-- ts: declare const router: import('@jasno/core/router').Router<'/' | '/users' | '/users/:id'>; -->

```ts
css`
  .nav-link[aria-current] { font-weight: 600; }
`;

const menu = [
  ['/', 'Home'],
  ['/users', 'Users'],
] as const;

const NavLink = component(function NavLink(p: {
  path: (typeof menu)[number][0];
  label: string;
}): Node {
  return h.a({
    href: router.href(p.path),
    class: 'nav-link',
    'aria-current': () => {
      const here = router.url().pathname;
      if (here === p.path) return 'page';
      return here.startsWith(p.path + '/') ? 'true' : null;
    },
  }, p.label);
});

export const Nav = component(function Nav(): Node {
  return h.nav(
    { 'aria-label': 'Main' },
    menu.map(([path, label]) => NavLink({ path, label })),
  );
});
```

## One component for every link

Write the link once, as a component, and call it for each entry. A shared class string is not enough. Each link also needs its `href` and its `aria-current` rule. The type of `path` comes from the array, so `router.href()` rejects a path that is not a route.

## Mark the current link

`aria-current="page"` marks the link to the page on screen. A screen reader announces it as the current page. `aria-current="true"` marks a section link while a page below it is open. In the example, the Users link stays current on `/users/7`. A `null` value removes the attribute. The Home link is current only on `/`, because no path starts with `//`.

Compare `router.url().pathname` with the route path, not with `router.href()`. In hash mode, `href()` returns `#/users`, but `url().pathname` is still `/users`.

## Style the attribute

Style `[aria-current]`, not an extra `active` class. The attribute holds the state, so the look and the announcement always agree.

With Tailwind, `aria-[current]:font-semibold` matches both values. `aria-[current=page]:` matches the current page only. The built-in `aria-current:` variant matches only `aria-current="true"`, so it misses the current page.
